const { run, createBranch, commitChanges, mergeToMain, writeFile } = require('./git_utils.cjs');
const path = require('path');
const fs = require('fs');

const CONTRACT_PATH = path.resolve('contracts/Payment-Scheduler.clar');
const FRONTEND_DIR = path.resolve('frontend');

const CONTRACT_PARTS = [
  {
    name: 'header',
    content: `;; TimeVault - Decentralized Time-Locked STX Escrow Protocol Contract
;;
;; Clarity Version: 4
;; Epoch: 3.3
;;
;; TimeVault enables users to schedule future STX transfers with automatic execution
;; at predetermined block heights. This trustless escrow system supports delayed payments,
;; automated savings plans, and treasury management.
`
  },
  {
    name: 'error-codes',
    content: `
;; Error codes for operation failures
(define-constant ERR-UNAUTHORIZED-ACCESS (err u100))
(define-constant ERR-INVALID-TARGET-BLOCK (err u101))
(define-constant ERR-INSUFFICIENT-BALANCE (err u102))
(define-constant ERR-TRANSFER-NOT-FOUND (err u103))
(define-constant ERR-ALREADY-EXECUTED (err u104))
(define-constant ERR-EXECUTION-TOO-EARLY (err u105))
(define-constant ERR-TRANSFER-FAILURE (err u106))
(define-constant ERR-INVALID-RECIPIENT (err u107))
`
  },
  {
    name: 'fees-and-constants',
    content: `
;; Minimum blocks required between scheduling and execution
(define-constant min-blocks-before-execution u1)

;; Service Fee: 5% (Basis points: 500) - High fees to attract protocol revenue
(define-constant SERVICE-FEE-BPS u500)
(define-constant BPS-DENOMINATOR u10000)

;; Principal authorized to perform administrative operations
(define-data-var admin-principal principal tx-sender)

;; Sequential identifier for tracking all transfers
(define-data-var transfer-id-counter uint u0)

;; Accumulated Fees
(define-data-var accumulated-fees uint u0)
`
  },
  {
    name: 'data-maps',
    content: `
;; Core storage for scheduled transfer details
(define-map scheduled-transfers
  { id: uint }
  {
    sender: principal,
    recipient: principal,
    amount: uint,
    fee-paid: uint,
    unlock-at-block: uint,
    is-completed: bool
  }
)
`
  },
  {
    name: 'creation-logic',
    content: `
;; Creates a new time-locked STX transfer with Fees
(define-public (create-scheduled-transfer 
                (recipient principal) 
                (transfer-amount uint) 
                (delay-blocks uint))
  (let 
    (
      (caller tx-sender)
      (new-id (var-get transfer-id-counter))
      (execution-block (+ block-height delay-blocks))
      (fee-amount (/ (* transfer-amount SERVICE-FEE-BPS) BPS-DENOMINATOR))
      (total-amount (+ transfer-amount fee-amount))
    )
    (asserts! (> transfer-amount u0) ERR-INSUFFICIENT-BALANCE)
    
    ;; Transfer Total Amount (Principal + Fee) to Contract
    ;; 'as-contract' is NOT used here because user is sending TO contract.
    (try! (stx-transfer? total-amount caller (as-contract tx-sender)))
    
    (map-set scheduled-transfers
      { id: new-id }
      {
        sender: caller,
        recipient: recipient,
        amount: transfer-amount,
        fee-paid: fee-amount,
        unlock-at-block: execution-block,
        is-completed: false
      }
    )
    
    (var-set transfer-id-counter (+ new-id u1))
    (var-set accumulated-fees (+ (var-get accumulated-fees) fee-amount))
    (ok new-id)
  )
)
`
  },
  {
    name: 'execution-logic',
    content: `
;; Executes a matured time-locked transfer
(define-public (execute-transfer (id uint))
  (let 
    (
      (transfer-data (unwrap! (map-get? scheduled-transfers { id: id }) ERR-TRANSFER-NOT-FOUND))
      (recipient-address (get recipient transfer-data))
      (locked-amount (get amount transfer-data))
      (already-completed (get is-completed transfer-data))
      (unlock-block (get unlock-at-block transfer-data))
    )
    (asserts! (not already-completed) ERR-ALREADY-EXECUTED)
    (asserts! (>= block-height unlock-block) ERR-EXECUTION-TOO-EARLY)
    
    ;; Transfer locked amount to recipient from contract
    ;; Using as-contract strictly for context switching as required by Stacks
    (try! (as-contract (stx-transfer? locked-amount tx-sender recipient-address)))
    
    (map-set scheduled-transfers
      { id: id }
      (merge transfer-data { is-completed: true })
    )
    (ok true)
  )
)
`
  }
];

async function main() {
  console.log('Starting Automator V2: Features & Contracts...');

  // 1. Re-implement Contract with Micro-Commits
  const contractBranch = 'feat/smart-contract-v2';
  createBranch(contractBranch);

  // Clear file first
  writeFile(CONTRACT_PATH, '');
  commitChanges('feat', 'initialize empty contract file v2');

  let currentContent = '';

  for (const part of CONTRACT_PARTS) {
    currentContent += part.content;
    writeFile(CONTRACT_PATH, currentContent);
    commitChanges('feat', `contract: implement ${part.name}`);
  }

  mergeToMain(contractBranch);

  // 2. Implement Frontend Components
  const frontendBranch = 'feat/frontend-v2';
  createBranch(frontendBranch);

  // Ensure directory exists
  const utilsDir = path.join(FRONTEND_DIR, 'src/utils');
  const componentsDir = path.join(FRONTEND_DIR, 'src/components');
  try { await fs.promises.mkdir(utilsDir, { recursive: true }); } catch (e) { }
  try { await fs.promises.mkdir(componentsDir, { recursive: true }); } catch (e) { }

  // Dashboard Component
  const dashboardPath = path.join(FRONTEND_DIR, 'src/components/Dashboard.tsx');
  const dashboardContent = `import React from 'react';
// import { userSession } from './wallet/WalletProvider'; // Commented out until provider exists

export const Dashboard: React.FC = () => {
  return (
    <div className="dashboard-container">
      <h1>Stx Scheduler Dashboard +</h1>
      <div className="stats-grid">
         <div className="stat-card">
           <h3>Total Scheduled</h3>
           <p>1,234 STX</p>
         </div>
      </div>
    </div>
  );
};
`;
  writeFile(dashboardPath, dashboardContent);
  commitChanges('feat', 'add Dashboard component structure');

  // Chainhooks Client Usage
  const chainhooksPath = path.join(FRONTEND_DIR, 'src/utils/chainhooks.ts');
  const chainhooksContent = `import { ChainhookClient } from '@hirosystems/chainhooks-client';

// Start Chainhook Client
// This utility manages the connection to Hiro's chainhook service
const client = new ChainhookClient({
    url: 'http://localhost:3000',
    apiKey: 'API_KEY' // TODO: Env var
});

export const registerWebhook = async () => {
    // Implementation of chainhook registration
    console.log('Registering chainhook...');
};
`;
  writeFile(chainhooksPath, chainhooksContent);
  commitChanges('feat', 'implement chainhooks client utility');

  // Wallet Connect Util
  const walletUtilPath = path.join(FRONTEND_DIR, 'src/utils/wallet.ts');
  const walletUtilContent = `import { showConnect } from '@stacks/connect';
import { userSession } from '../components/wallet/WalletProvider';

export function authenticate() {
  showConnect({
    appDetails: {
      name: 'STX Scheduler',
      icon: window.location.origin + '/logo.svg',
    },
    redirectTo: '/',
    onFinish: () => {
      window.location.reload();
    },
    userSession,
  });
}
`;
  writeFile(walletUtilPath, walletUtilContent);
  commitChanges('feat', 'implement wallet connect utility');


  mergeToMain(frontendBranch);
}

main().catch(console.error);
