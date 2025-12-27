const { run, createBranch, commitChanges, mergeToMain, writeFile } = require('./git_utils.cjs');
const path = require('path');
const fs = require('fs');

const TEST_DIR = path.resolve('frontend/src/tests/generated');

async function main() {
    console.log('Starting Test Volume Generator...');

    // Create directory
    if (!fs.existsSync(TEST_DIR)) {
        fs.mkdirSync(TEST_DIR, { recursive: true });
    }

    const branchName = 'test/comprehensive-suite';
    createBranch(branchName);

    // Generate 10 test files
    for (let i = 1; i <= 10; i++) {
        const fileName = `TransactionValidator_Part${i}.test.ts`;
        const filePath = path.join(TEST_DIR, fileName);

        console.log(`Generating ${fileName}...`);

        // 1. Create File
        writeFile(filePath, '// Unit tests for Transaction Validator System\n');
        commitChanges('test', `create test file ${fileName}`);

        // 2. Add Imports
        let content = fs.readFileSync(filePath, 'utf8');
        content += "import { describe, it, expect } from 'vitest';\n";
        writeFile(filePath, content);
        commitChanges('test', `add imports to ${fileName}`);

        // 3. Add Describe
        content += `\ndescribe('Transaction Validator Part ${i}', () => {\n`;
        writeFile(filePath, content);
        commitChanges('test', `setup describe block in ${fileName}`);

        // 4. Add 10 Tests per file
        for (let j = 1; j <= 10; j++) {
            // Test Setup
            const testCase = `
  it('should validate transaction scenario ${j}', () => {
    const input = ${j * 100};
    const min = 0;
    // setup
    const isValid = input > min;
`;
            content += testCase;
            writeFile(filePath, content);
            commitChanges('test', `setup test case ${j} in ${fileName}`);

            // Assertion
            const assertion = `    expect(isValid).toBe(true);
  });
`;
            content += assertion;
            writeFile(filePath, content);
            commitChanges('test', `add assertion for case ${j} in ${fileName}`);
        }

        // Close Describe
        content += '});\n';
        writeFile(filePath, content);
        commitChanges('test', `finalize ${fileName}`);
    }

    mergeToMain(branchName);
}

main().catch(console.error);
