const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

function run(command) {
    try {
        execSync(command, { stdio: 'inherit' });
    } catch (e) {
        console.error(`Failed to execute: ${command}`);
        process.exit(1);
    }
}

function createBranch(branchName) {
    console.log(`Creating branch ${branchName}...`);
    try {
        run(`git checkout -b ${branchName}`);
    } catch (e) {
        // If branch exists, just checkout
        run(`git checkout ${branchName}`);
    }
}

function commitChanges(type, message) {
    console.log(`Committing: ${type}: ${message}`);
    run('git add .');
    run(`git commit -m "${type}: ${message}"`);
}

function mergeToMain(branchName) {
    console.log(`Merging ${branchName} to main...`);
    run('git checkout main');
    run(`git merge ${branchName} --no-ff -m "Merge branch '${branchName}'"`);
    // run(`git branch -d ${branchName}`); // Optional: keep branch history clean? User said "Minimum 50+ branches", maybe keep them? But "deleted branches" still show in tree if merged. Usually we delete.
}

function writeFile(filePath, content) {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(filePath, content);
}

module.exports = { run, createBranch, commitChanges, mergeToMain, writeFile };
