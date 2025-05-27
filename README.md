# Blockchain Voting System 🗳️

A decentralized voting application built on the Ethereum blockchain. This system allows for the creation of elections, registration of candidates and voters, secure casting of votes, and real-time viewing of results.

---

## 🌟 Features

* **Election Management**: Create and manage election periods, including start and end times.
* **Candidate Management**: Add and list candidates for elections.
* **Voter Registration**: Securely register eligible voters for specific elections.
* **Token-Based Voting**: Utilizes ERC1155 tokens to ensure each registered voter gets one vote per election.
* **Secure Voting**: Voters cast their votes, and the system burns their voting token to prevent double voting.
* **Real-time Results**: View the total votes for each candidate in an election(Only deployer).
* **Ownable Contracts**: Contract functionalities like creating elections or registering voters are restricted to the contract owner.

---

## 🛠️ Tech Stack

* **Smart Contracts**:
    * Solidity
    * OpenZeppelin Contracts (ERC1155, Ownable)
    * Hardhat (Development, Testing, Deployment)
* **Frontend**:
    * Vite
    * Ethers.js (for interacting with smart contracts)

---

## 🚀 Getting Started

### Prerequisites

* Node.js and npm (or yarn) installed.
* MetaMask browser extension.
* Hardhat local network in MetaMask.

### Installation & Setup

1.  **Clone the repository:**
    ```bash
    git clone [https://github.com/Joseph-eiei/blockchain-voting-system.git](https://github.com/Joseph-eiei/blockchain-voting-system.git)
    cd blockchain-voting-system
    ```

2.  **Set up the Smart Contracts:**
    ```bash
    cd contracts
    npm install
    ```

3.  **Set up the Frontend:**
    ```bash
    cd ../frontend
    npm install
    ```

---

## 📜 Deploying Smart Contracts

1.  **Compile the contracts:**
    Navigate to the `contracts/` directory:
    ```bash
    cd ../contracts
    npx hardhat compile
    ```

2.  **Run a local Hardhat node (for local testing):**
    ```bash
    npx hardhat node
    ```
    This will typically provide you with several test accounts and their private keys.

3.  **Deploy to a hardhat local network:**
    ```bash
    npx hardhat run scripts/deploy.js --network localhost
    ```
    * After deploying each contract, note down its address.

4.  **Configure Environment Variables for Frontend:**
    * Navigate to the `frontend/` directory.
    * Create a `.env` file.
    * Add the deployed smart contract addresses to this file. For example:
    ```env
    VITE_VR_ADDRESS=YOUR_VOTERREGISTRY_CONTRACT_ADDRESS
    VITE_EM_ADDRESS=YOUR_ELECTIONMANAGER_CONTRACT_ADDRESS
    VITE_CM_ADDRESS=YOUR_CANDIDATEMANAGER_CONTRACT_ADDRESS
    VITE_BQ_ADDRESS=YOUR_BALLOT_CONTRACT_ADDRESS
    VITE_RS_ADDRESS=YOUR_RESULTS_CONTRACT_ADDRESS
    ```
    
---

## 🖥️ Running the Application

1.  **Start the Frontend Development Server:**
    Navigate to the `frontend/` directory:
    ```bash
    cd ../frontend
    npm run dev
    ```

2.  Open your browser and go to `http://localhost:5173` (or the port specified by your frontend framework).

3.  Connect your MetaMask wallet to the network you deployed the contracts on.

4.  Interact with the application to:
    * (As Owner) Create elections.
    * (As Owner) Add candidates.
    * (As Owner) Register voters for an election (Use comma seperate format e.g. 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266,0x70997970C51812dc3A010C7d01b50e0d17dc79C8).
    * (As a registered Voter) Cast your vote during an active election.
    * (As Owner) View each election results.

---

## 📄 License

This project uses the SPDX-License-Identifier: MIT
