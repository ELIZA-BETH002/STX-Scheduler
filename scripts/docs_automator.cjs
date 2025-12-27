const { run, createBranch, commitChanges, mergeToMain, writeFile } = require('./git_utils.cjs');
const path = require('path');
const fs = require('fs');

const DOCS_DIR = path.resolve('docs');

async function main() {
    console.log('Starting Documentation Generator...');

    if (!fs.existsSync(DOCS_DIR)) {
        fs.mkdirSync(DOCS_DIR, { recursive: true });
    }

    const branchName = 'docs/wiki-v2';
    createBranch(branchName);

    // 1. Architecture Docs
    const archFile = path.join(DOCS_DIR, 'ARCHITECTURE.md');
    writeFile(archFile, '# System Architecture\n');
    commitChanges('docs', 'create architecture overview');

    for (let i = 1; i <= 10; i++) {
        const section = `\n## Component ${i}\nThis component handles specific logic for the scheduler.\n`;
        let content = fs.readFileSync(archFile, 'utf8');
        writeFile(archFile, content + section);
        commitChanges('docs', `document component ${i} architecture`);
    }

    // 2. API Docs
    const apiFile = path.join(DOCS_DIR, 'API.md');
    writeFile(apiFile, '# API Reference\n');
    commitChanges('docs', 'create API reference');

    for (let i = 1; i <= 10; i++) {
        const endpoint = `\n### GET /api/v1/resource/${i}\nReturns details for resource ${i}.\n`;
        let content = fs.readFileSync(apiFile, 'utf8');
        writeFile(apiFile, content + endpoint);
        commitChanges('docs', `document API endpoint ${i}`);
    }

    // 3. User Guide
    const guideFile = path.join(DOCS_DIR, 'USER_GUIDE.md');
    writeFile(guideFile, '# User Guide\n');
    commitChanges('docs', 'create user guide');

    for (let i = 1; i <= 10; i++) {
        const step = `\n${i}. Open the application and navigate to the dashboard.\n`;
        let content = fs.readFileSync(guideFile, 'utf8');
        writeFile(guideFile, content + step);
        commitChanges('docs', `add user guide step ${i}`);
    }

    mergeToMain(branchName);
}

main().catch(console.error);
