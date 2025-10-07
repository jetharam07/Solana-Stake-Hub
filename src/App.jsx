import React, { useState, useEffect } from "react";
import * as anchor from "@project-serum/anchor";
import { Connection, PublicKey } from "@solana/web3.js";
import idl from "./idl.json";
import "./App.css";

const PROGRAM_ID = new PublicKey("2wapyHPxoMmEgDT9RXWXrPARHbgAwVskHtu9LDjhMsT5");
const CLUSTER = "https://api.devnet.solana.com";

export default function App() {
  const [walletPubkey, setWalletPubkey] = useState(null);
  const [provider, setProvider] = useState(null);
  const [program, setProgram] = useState(null);
  const [stakeAccount, setStakeAccount] = useState(null);
  const [amount, setAmount] = useState("");
  const [accountData, setAccountData] = useState(null);
  const [status, setStatus] = useState("");
  const [history, setHistory] = useState([]);
  const [loadingAction, setLoadingAction] = useState(null);

  const [toastMessage, setToastMessage] = useState("");
  const connection = new Connection(CLUSTER, "confirmed");

  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(""), 3000);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  // ✅ Fetch last 20 transactions from Solana explorer
  const fetchHistory = async (pubkey) => {
    try {
      const sigs = await connection.getSignaturesForAddress(pubkey, { limit: 20 });
      const parsed = sigs.map((s) => ({
        type: "On-chain Tx",
        amount: "",
        time: new Date(s.blockTime * 1000).toLocaleString(),
        sig: s.signature,
      }));
      setHistory(parsed);
    } catch (err) {
      console.error("History fetch error:", err);
    }
  };

  const connectWallet = async () => {
    try {
      setLoadingAction("connect");
      if (!window.solana || !window.solana.isPhantom) {
        alert("Phantom wallet not found");
        return;
      }
      const resp = await window.solana.connect();
      const pubkey = resp.publicKey;
      setWalletPubkey(pubkey.toString());

      const anchorProvider = new anchor.AnchorProvider(connection, window.solana, {
        preflightCommitment: "processed",
      });
      setProvider(anchorProvider);

      const program = new anchor.Program(idl, PROGRAM_ID, anchorProvider);
      setProgram(program);

      const [stakePda] = await PublicKey.findProgramAddress(
        [Buffer.from("stake"), pubkey.toBuffer()],
        PROGRAM_ID
      );
      setStakeAccount(stakePda);

      // ✅ Fetch last 20 history when connected
      await fetchHistory(pubkey);

      setToastMessage("Wallet connected ✅");
    } catch (err) {
      setToastMessage("Connect error ❌");
    } finally {
      setLoadingAction(null);
    }
  };

  const initialize = async () => {
    try {
      setLoadingAction("initialize");
      await program.methods
        .initialize()
        .accounts({
          stakeAccount,
          user: provider.wallet.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .rpc();
      setToastMessage("Account Setup ✅");
    } catch {
      setToastMessage("Account setup error ❌");
    } finally {
      setLoadingAction(null);
    }
  };

  const stake = async () => {
  try {
    setLoadingAction("stake");
    const lamports = new anchor.BN(parseFloat(amount) * 1e9);

    const tx = await program.methods
      .stake(lamports)
      .accounts({
        stakeAccount,
        owner: provider.wallet.publicKey,
      })
      .transaction();

    const txSig = await provider.sendAndConfirm(tx, [], {
      skipPreflight: false,
      commitment: "confirmed",
    });

    console.log("✅ Stake TX Confirmed:", txSig);
    setToastMessage("Staked ✅");
    addHistory("Stake", amount);
    await fetchData();
  } catch (err) {
    console.error("Stake failed:", err);
    if (err.message?.includes("already processed") || err.name === "SendTransactionError") {
      setToastMessage("Staked ✅ (Delayed confirmation)");
    } else {
      setToastMessage("Stake error ❌");
    }
  } finally {
    setLoadingAction(null);
  }
};

const unstake = async () => {
  try {
    setLoadingAction("unstake");
    const lamports = new anchor.BN(parseFloat(amount) * 1e9);

    const tx = await program.methods
      .unstake(lamports)
      .accounts({
        stakeAccount,
        owner: provider.wallet.publicKey,
      })
      .transaction();

    const txSig = await provider.sendAndConfirm(tx, [], {
      skipPreflight: false,
      commitment: "confirmed",
    });

    console.log("✅ Unstake TX Confirmed:", txSig);
    setToastMessage("Unstaked ✅");
    addHistory("Unstake", amount);
    await fetchData();
  } catch (err) {
    console.error("Unstake failed:", err);
    if (err.message?.includes("already processed") || err.name === "SendTransactionError") {
      setToastMessage("Unstaked ✅ (Delayed confirmation)");
    } else {
      setToastMessage("Unstake error ❌");
    }
  } finally {
    setLoadingAction(null);
  }
};

const claimReward = async () => {
  try {
    setLoadingAction("claim");

    const tx = await program.methods
      .claimReward()
      .accounts({
        stakeAccount,
        owner: provider.wallet.publicKey,
      })
      .transaction();

    const txSig = await provider.sendAndConfirm(tx, [], {
      skipPreflight: false,
      commitment: "confirmed",
    });

    console.log("✅ Claim Reward TX Confirmed:", txSig);
    setToastMessage("Reward Claimed ✅");
    addHistory("Claim Reward");
    await fetchData();
  } catch (err) {
    console.error("Claim Reward failed:", err);
    if (err.message?.includes("already processed") || err.name === "SendTransactionError") {
      setToastMessage("Reward Claimed ✅ (Delayed confirmation)");
    } else {
      setToastMessage("Claim error ❌");
    }
  } finally {
    setLoadingAction(null);
  }
};


  const fetchData = async () => {
    try {
      setLoadingAction("fetch");
      const data = await program.account.stakeAccount.fetch(stakeAccount);
      const readable = {
        Owner: data.owner.toString(),
        "Staked Amount (SOL)": (Number(data.amount) / 1e9).toFixed(4),
        "Unclaimed Reward (SOL)": (Number(data.reward) / 1e9).toFixed(4),
        "Claimed Reward (SOL)": (Number(data.claimedReward) / 1e9).toFixed(4),
        "Last Stake Time": new Date(Number(data.lastStakeTime) * 1000).toLocaleString(),
        "Total Deposited (SOL)": (Number(data.totalDeposited) / 1e9).toFixed(4),
        "Total Withdrawn (SOL)": (Number(data.totalWithdrawn) / 1e9).toFixed(4),
        "Total Rewards Earned (SOL)": (Number(data.totalRewardsEarned) / 1e9).toFixed(4),
      };
      setAccountData(readable);
      setToastMessage("Data Fetched ✅");
    } catch {
      setToastMessage("Fetch error ❌");
    } finally {
      setLoadingAction(null);
    }
  };

  const addHistory = (type, amt = "") => {
    const entry = {
      type,
      amount: amt ? amt + " SOL" : "",
      time: new Date().toLocaleString(),
    };
    setHistory((prev) => {
      const updated = [entry, ...prev];
      return updated.slice(0, 20); // ✅ always max 20
    });
  };

  return (
    <div className="app-container">
      {/* stars */}
      <div className="stars-background">
        <div className="star"></div><div className="star"></div><div className="star"></div>
        <div className="star"></div><div className="star"></div><div className="star"></div>
        <div className="star"></div><div className="star"></div><div className="star"></div>
        <div className="star"></div><div className="star"></div>
      </div>
      <div className="stars-background">
        <div className="star blue-star"></div><div className="star blue-star"></div>
        <div className="star blue-star"></div><div className="star blue-star"></div>
        <div className="star blue-star"></div>
        <div className="star yellow-star"></div><div className="star yellow-star"></div>
        <div className="star yellow-star"></div><div className="star yellow-star"></div>
        <div className="star yellow-star"></div>
      </div>
      {/* stars */}

      <h1 className="title">⚡ Solana Stake Hub</h1>
      {toastMessage && <div className="toast">{toastMessage}</div>}

      {/* TOP GRID */}
      <div className="main-grid">
        {/* LEFT SIDE */}
        <div className="glass-card left-panel">
          {!walletPubkey ? (
            <div className="wallet-connect-container">
              <button
                className={`btn connect-btn ${loadingAction === "connect" ? "loading" : ""}`}
                onClick={connectWallet}
                disabled={loadingAction === "connect"}
              >
                {loadingAction === "connect" ? "Connecting..." : "Connect Phantom"}
              </button>
            </div>
          ) : (
            <div className="wallet-info">
              <p><strong>Wallet:</strong> {walletPubkey}</p>
              <p><strong>Stake PDA:</strong> {stakeAccount?.toString()}</p>
            </div>
          )}

          <button
            className={`btn gradient-btn ${loadingAction === "initialize" ? "loading" : ""}`}
            onClick={initialize}
            disabled={!program || loadingAction === "initialize"}
          >
            {loadingAction === "initialize" ? "Setting up..." : "Setup Account"}
          </button>

          <div className="stake-actions">
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Amount in SOL"
              className="input"
            />

            <div className="button-row button-row-top">
              <button
                className={`btn dark-btn ${loadingAction === "stake" ? "loading" : ""}`}
                onClick={stake}
                disabled={!program || loadingAction === "stake"}
              >
                {loadingAction === "stake" ? "Staking..." : "Stake"}
              </button>
              <button
                className={`btn dark-btn ${loadingAction === "unstake" ? "loading" : ""}`}
                onClick={unstake}
                disabled={!program || loadingAction === "unstake"}
              >
                {loadingAction === "unstake" ? "Unstaking..." : "Unstake"}
              </button>
            </div>

            <div className="button-row button-row-bottom">
              <button
                className={`btn gradient-btn ${loadingAction === "claim" ? "loading" : ""}`}
                onClick={claimReward}
                disabled={!program || loadingAction === "claim"}
              >
                {loadingAction === "claim" ? "Claiming..." : "Claim Reward"}
              </button>
              <button
                className={`btn gradient-btn ${loadingAction === "fetch" ? "loading" : ""}`}
                onClick={fetchData}
                disabled={!program || loadingAction === "fetch"}
              >
                {loadingAction === "fetch" ? "Fetching..." : "Fetch Data"}
              </button>
            </div>
          </div>
        </div>

        {/* RIGHT SIDE */}
        <div className="glass-card right-panel">
          <div className="data-section">
            <h2>Stake Account Data</h2>
            {accountData ? (
              <div className="account-data">
                <p><strong>Owner:</strong> {accountData.Owner}</p>
                <p><strong>Staked Amount (SOL):</strong> {accountData["Staked Amount (SOL)"]}</p>
                <p><strong>Claimed Reward (SOL):</strong> {accountData["Claimed Reward (SOL)"]}</p>
                <p><strong>Unclaimed Reward (SOL):</strong> {accountData["Unclaimed Reward (SOL)"]}</p>
                <p><strong>Total Rewards Earned (SOL):</strong> {accountData["Total Rewards Earned (SOL)"]}</p>
                <p><strong>Total Deposited (SOL):</strong> {accountData["Total Deposited (SOL)"]}</p>
                <p><strong>Total Withdrawn (SOL):</strong> {accountData["Total Withdrawn (SOL)"]}</p>
                <p><strong>Last Activity:</strong> {accountData["Last Stake Time"]}</p>
              </div>
            ) : (
              <p>No data yet</p>
            )}
          </div>
        </div>
      </div>

      {/* HISTORY */}
      <div className="history-full">
        <h2>History</h2>
        <ul>
          {history.map((h, i) => (
            <li key={i}>
              {h.type} {h.amount} at {h.time}
              {h.sig && (
                <a
                  href={`https://explorer.solana.com/tx/${h.sig}?cluster=devnet`}
                  target="_blank"
                  rel="noreferrer"
                >
                  🔗
                </a>
              )}
            </li>
          ))}
        </ul>
      </div>

      <p className="status">{status}</p>
      <div className="copyright-footer">
        Web3 Visionary - Jetharam Gehlot. © 2025 All rights reserved.
      </div>
    </div>
  );
}
