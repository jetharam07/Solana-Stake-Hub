# Solana Staking DApp

## Overview

Solana Staking DApp is a portfolio project built to explore how staking systems work on the Solana blockchain. The project focuses on core concepts such as Program Derived Addresses (PDAs), on-chain state management, reward calculations, wallet integration, and frontend-to-blockchain communication.

Users can create a staking account, stake tokens, earn rewards over time, claim rewards independently, and unstake their tokens whenever they choose. All staking information is stored on-chain and can be accessed directly from the application dashboard.

The project was developed primarily as a learning exercise to gain hands-on experience with Rust, Anchor, and Solana DApp development.

App Link: https://solana-stake-hub.vercel.app/

## Features

* Connect using Phantom Wallet
* Create a staking account using a PDA
* Stake tokens into the program
* Unstake tokens at any time
* Claim accumulated rewards
* Fetch and display on-chain staking data
* View transaction history
* Open transactions directly in Solana Explorer

The dashboard displays detailed account information including:

* Staked Amount
* Claimed Rewards
* Unclaimed Rewards
* Total Rewards Earned
* Total Deposited
* Total Withdrawn
* Last Activity Timestamp

## How It Works

1. The user connects a Phantom wallet.
2. A staking account is initialized using a Program Derived Address (PDA).
3. The user enters an amount and stakes tokens.
4. Rewards are calculated based on staking duration and staked balance.
5. Users can claim rewards without unstaking their position.
6. Users can partially or fully unstake whenever they want.
7. Every on-chain interaction is recorded and can be viewed through Solana Explorer.

## Technology Stack

### Blockchain Tech

* Solana
* Rust
* Anchor Framework
* Solana Playground
* Solana Web3.js
* Phantom Wallet

### Frontend Tech

* React
* Vite
* Jsx
* JavaScript
* CSS



## 🚀 Quick Start: Solana-Stake-Hub (Vite + React)

```bash
# 1️⃣ Check Node.js & npm versions
node -v
npm -v

# 2️⃣ Clone the repository
git clone https://github.com/jetharam07/Solana-Stake-Hub.git
cd Solana-Stake-Hub

# 3️⃣ Install dependencies
npm install

# 4️⃣ Start the development server
npm run dev
