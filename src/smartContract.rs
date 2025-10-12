//Deployed smart contract code on playground for back up (If at any time there is a Devnet update)

use anchor_lang::prelude::*;

declare_id!("2wapyHPxoMmEgDT9RXWXrPARHbgAwVskHtu9LDjhMsT5");

#[program]
pub mod advanced_stake_playground {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        let acct = &mut ctx.accounts.stake_account;
        acct.owner = *ctx.accounts.user.key;
        acct.amount = 0;
        acct.reward = 0;
        acct.claimed_reward = 0;
        acct.last_stake_time = Clock::get()?.unix_timestamp;
        acct.total_deposited = 0;
        acct.total_withdrawn = 0;
        acct.total_rewards_earned = 0;

        emit!(InitializeEvent {
            user: acct.owner,
            timestamp: acct.last_stake_time,
        });

        Ok(())
    }

    pub fn stake(ctx: Context<Stake>, amount: u64) -> Result<()> {
        require!(amount > 0, StakingError::InvalidAmount);

        let acct = &mut ctx.accounts.stake_account;
        let now = Clock::get()?.unix_timestamp;

        // pending reward before adding new stake
        let duration = now - acct.last_stake_time;
        if duration > 0 && acct.amount > 0 {
            let pending = calc_pending_reward(acct.amount, duration)?;
            acct.reward += pending;
            acct.total_rewards_earned += pending;
        }

        acct.amount += amount;
        acct.total_deposited += amount;
        acct.last_stake_time = now;

        emit!(StakeEvent {
            user: acct.owner,
            amount,
            timestamp: now,
            total_staked: acct.amount,
        });

        Ok(())
    }

    pub fn unstake(ctx: Context<Unstake>, amount: u64) -> Result<()> {
        let acct = &mut ctx.accounts.stake_account;
        let now = Clock::get()?.unix_timestamp;

        require!(amount > 0, StakingError::InvalidAmount);
        require!(amount <= acct.amount, StakingError::InsufficientStake);

        // add pending rewards
        let duration = now - acct.last_stake_time;
        if duration > 0 && acct.amount > 0 {
            let pending = calc_pending_reward(acct.amount, duration)?;
            acct.reward += pending;
            acct.total_rewards_earned += pending;
        }

        // proportional reward
        let proportional_reward = if acct.amount > 0 {
            acct.reward * amount / acct.amount
        } else {
            0
        };

        acct.amount -= amount;
        acct.reward -= proportional_reward;
        acct.claimed_reward += proportional_reward;
        acct.total_withdrawn += amount;
        acct.last_stake_time = now;

        emit!(UnstakeEvent {
            user: acct.owner,
            amount,
            proportional_reward,
            timestamp: now,
            remaining_stake: acct.amount,
        });

        Ok(())
    }

    pub fn claim_reward(ctx: Context<ClaimReward>) -> Result<u64> {
        let acct = &mut ctx.accounts.stake_account;
        let now = Clock::get()?.unix_timestamp;

        // add latest pending reward
        let duration = now - acct.last_stake_time;
        let mut pending_reward = 0;
        if duration > 0 && acct.amount > 0 {
            pending_reward = calc_pending_reward(acct.amount, duration)?;
            acct.reward += pending_reward;
            acct.total_rewards_earned += pending_reward;
        }

        let to_claim = acct.reward;
        acct.claimed_reward += to_claim;
        acct.reward = 0;
        acct.last_stake_time = now;

        emit!(ClaimEvent {
            user: acct.owner,
            amount: to_claim,
            timestamp: now,
            total_claimed: acct.claimed_reward,
        });

        Ok(to_claim)
    }
}

#[account]
pub struct StakeAccount {
    pub owner: Pubkey,
    pub amount: u64,
    pub reward: u64,
    pub claimed_reward: u64,
    pub last_stake_time: i64,
    pub total_deposited: u64,
    pub total_withdrawn: u64,
    pub total_rewards_earned: u64,
}

// -------------------------
// Contexts (with "stake" seed for PDA)
// -------------------------
#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(
        init,
        payer = user,
        space = 8 + 32 + 8*6 + 8 + 8, 
        seeds = [b"stake", user.key().as_ref()],
        bump
    )]
    pub stake_account: Account<'info, StakeAccount>,

    #[account(mut)]
    pub user: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Stake<'info> {
    #[account(mut, seeds = [b"stake", owner.key().as_ref()], bump, has_one = owner)]
    pub stake_account: Account<'info, StakeAccount>,
    pub owner: Signer<'info>,
}

#[derive(Accounts)]
pub struct Unstake<'info> {
    #[account(mut, seeds = [b"stake", owner.key().as_ref()], bump, has_one = owner)]
    pub stake_account: Account<'info, StakeAccount>,
    pub owner: Signer<'info>,
}

#[derive(Accounts)]
pub struct ClaimReward<'info> {
    #[account(mut, seeds = [b"stake", owner.key().as_ref()], bump, has_one = owner)]
    pub stake_account: Account<'info, StakeAccount>,
    pub owner: Signer<'info>,
}

// -------------------------
// Events
// -------------------------
#[event]
pub struct InitializeEvent {
    pub user: Pubkey,
    pub timestamp: i64,
}

#[event]
pub struct StakeEvent {
    pub user: Pubkey,
    pub amount: u64,
    pub timestamp: i64,
    pub total_staked: u64,
}

#[event]
pub struct UnstakeEvent {
    pub user: Pubkey,
    pub amount: u64,
    pub proportional_reward: u64,
    pub timestamp: i64,
    pub remaining_stake: u64,
}

#[event]
pub struct ClaimEvent {
    pub user: Pubkey,
    pub amount: u64,
    pub timestamp: i64,
    pub total_claimed: u64,
}

// -------------------------
// Helpers & Errors
// -------------------------
fn calc_pending_reward(amount: u64, duration: i64) -> Result<u64> {
    let pending = (amount as u128)
        .checked_mul(duration as u128)
        .ok_or(StakingError::Overflow)?
        .checked_mul(2)
        .ok_or(StakingError::Overflow)? // reward rate (2 per min / 100)
        / 60
        / 100;

    Ok(pending as u64)
}

#[error_code]
pub enum StakingError {
    #[msg("Insufficient staked amount")]
    InsufficientStake,
    #[msg("Invalid amount")]
    InvalidAmount,
    #[msg("Overflow in calculation")]
    Overflow,
}
