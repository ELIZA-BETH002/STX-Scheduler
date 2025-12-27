const { run, createBranch, commitChanges, mergeToMain, writeFile } = require('./git_utils.cjs');
const path = require('path');
const fs = require('fs');

const FRONTEND_DIR = path.join(__dirname, '../frontend');

// Helper to run command in frontend dir
function runFrontend(command) {
  console.log(`Running in frontend: ${command}`);
  const originalCwd = process.cwd();
  try {
    process.chdir(FRONTEND_DIR);
    run(command);
  } finally {
    process.chdir(originalCwd);
  }
}

async function main() {
  // Phase 1: Dependencies with micro-commits
  const dependencies = [
    '@stacks/connect',
    '@stacks/transactions',
    '@stacks/network',
    '@stacks/common',
    '@hirosystems/chainhooks-client',
    '@stacks/auth' // Often needed with connect
  ];

  const branchName = 'chore/setup-dependencies';
  createBranch(branchName);

  // Initial npm install
  console.log('Installing base dependencies...');
  runFrontend('npm install');
  commitChanges('build', 'install base project dependencies');

  for (const dep of dependencies) {
    console.log(`Installing ${dep}...`);
    runFrontend(`npm install ${dep}`);
    commitChanges('build', `add dependency ${dep}`);
  }

  mergeToMain(branchName);

  // Phase 2: Project Structure Setup
  const structureBranch = 'refactor/project-structure';
  createBranch(structureBranch);

  const dirs = [
    'src/components',
    'src/components/wallet',
    'src/components/scheduler',
    'src/hooks',
    'src/utils',
    'src/contracts',
    'src/store'
  ];

  for (const dir of dirs) {
    const fullPath = path.join(FRONTEND_DIR, dir);
    if (!fs.existsSync(fullPath)) {
      fs.mkdirSync(fullPath, { recursive: true });
      // Create a gitkeep to ensure folder is committed if empty
      writeFile(path.join(fullPath, '.gitkeep'), '');
      commitChanges('chore', `create directory structure for ${dir}`);
    }
  }
  mergeToMain(structureBranch);

  // Phase 3: Wallet Connect Implementation (Mock setup for now, will expand)
  const walletBranch = 'feat/wallet-connect-setup';
  createBranch(walletBranch);

  // Create WalletContext
  const walletContextPath = path.join(FRONTEND_DIR, 'src/components/wallet/WalletProvider.tsx');
  const walletContextCode = `import React, { createContext, useContext, useState } from 'react';
import { UserSession, AppConfig } from '@stacks/auth';

const appConfig = new AppConfig(['store_write', 'publish_data']);
export const userSession = new UserSession({ appConfig });

interface WalletContextType {
  userSession: UserSession;
  userData: any;
  authenticate: () => void;
  signOut: () => void;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export const WalletProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [userData, setUserData] = useState<any>(null);

  const authenticate = () => {
    // Implementation to come
  };

  const signOut = () => {
    userSession.signUserOut();
    setUserData(null);
  };

  return (
    <WalletContext.Provider value={{ userSession, userData, authenticate, signOut }}>
      {children}
    </WalletContext.Provider>
  );
};
`;
  // We break this file creation into micro commits
  writeFile(walletContextPath, '// Initial file creation\n');
  commitChanges('feat', 'create WalletProvider file');

  writeFile(walletContextPath, walletContextCode);
  commitChanges('feat', 'implement WalletProvider basic logic');

  mergeToMain(walletBranch);
}

main().catch(console.error);
