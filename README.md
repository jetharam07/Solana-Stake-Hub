# React + Vite

#!/bin/bash

# 1️⃣ Check Node.js & npm versions
echo "Checking Node.js and npm versions..."
node -v
npm -v

# 2️⃣ Clone the repository
echo "Cloning Solana-Stake-Hub..."
git clone https://github.com/jetharam07/Solana-Stake-Hub.git
cd Solana-Stake-Hub || { echo "Failed to enter directory"; exit 1; }

# 3️⃣ Install dependencies
echo "Installing npm dependencies..."
npm install

# 4️⃣ Start the development server
echo "Starting the app..."
npm run dev
