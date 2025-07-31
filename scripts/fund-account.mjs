#!/usr/bin/env node

import 'dotenv/config';
import { execSync } from 'child_process';
import { existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

function exe(command, options = {}) {
  console.log(`> ${command}`);
  try {
    return execSync(command, { stdio: 'inherit', ...options });
  } catch (error) {
    console.error(`❌ Failed to execute: ${command}`);
    throw error;
  }
}

function checkStellarCLI() {
  try {
    execSync('stellar --version', { stdio: 'ignore' });
    return true;
  } catch {
    console.error('❌ Stellar CLI not found. Please install it first:');
    console.error('   curl --proto \'=https\' --tlsv1.2 -sSf https://sh.stellar.org | sh');
    console.error('   or');
    console.error('   cargo install stellar-cli --locked');
    return false;
  }
}

function createAccount(accountName) {
  console.log(`\n🔑 Creating account '${accountName}'...`);
  
  // Create .stellar directory
  const stellarDir = join(rootDir, '.stellar');
  if (!existsSync(stellarDir)) {
    mkdirSync(stellarDir, { recursive: true });
  }
  
  // Check if account already exists
  try {
    const existingAddress = execSync(`stellar keys address ${accountName}`, { 
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'ignore']
    }).trim();
    
    console.log(`⚠️  Account '${accountName}' already exists`);
    console.log(`   Address: ${existingAddress}`);
    
    const overwrite = process.argv.includes('--force');
    if (!overwrite) {
      console.log('\n   Use --force to overwrite existing account');
      return existingAddress;
    }
    
    console.log('   Overwriting existing account...');
  } catch {
    // Account doesn't exist, which is fine
  }
  
  // Generate new account
  exe(`stellar keys generate ${accountName} --overwrite`);
  
  const address = execSync(`stellar keys address ${accountName}`, { encoding: 'utf8' }).trim();
  console.log(`✅ Account created: ${address}`);
  
  // Show the secret key if requested
  if (process.argv.includes('--show-secret')) {
    const secret = execSync(`stellar keys show ${accountName}`, { encoding: 'utf8' }).trim();
    console.log(`   Secret: ${secret}`);
    console.log('\n⚠️  Keep this secret key safe and never share it!');
  }
  
  return address;
}

function fundAccount(accountName, network) {
  console.log(`\n💰 Funding account on ${network}...`);
  
  try {
    if (network === 'local' || network === 'standalone') {
      // For local network, use friendbot
      const address = execSync(`stellar keys address ${accountName}`, { encoding: 'utf8' }).trim();
      exe(`curl -s "http://localhost:8000/friendbot?addr=${address}"`);
    } else {
      // For testnet/futurenet, use stellar CLI funding
      exe(`stellar keys fund ${accountName} --network ${network}`);
    }
    console.log('✅ Account funded successfully');
  } catch (error) {
    console.error('⚠️  Failed to fund account. You may need to fund it manually.');
  }
}

function checkBalance(accountName, network) {
  try {
    const address = execSync(`stellar keys address ${accountName}`, { encoding: 'utf8' }).trim();
    console.log(`\n💳 Checking balance for ${address}...`);
    
    // Use stellar CLI to check balance
    const assetId = execSync(`stellar contract id asset --asset native`, { encoding: 'utf8' }).trim();
    console.log(`   Native Asset ID: ${assetId}`);
    const balance = execSync(`stellar contract invoke --id ${assetId} --source-account ${accountName} -- balance --id ${address}`, { encoding: 'utf8' }).trim();
    console.log(`   Balance: ${balance}`);
    
    
  } catch (error) {
    console.error('⚠️  Could not check balance. Account might not be funded yet.');
  }
}

function showUsage() {
  console.log('Usage: npm run network:fund [account-name] [options]');
  console.log();
  console.log('Options:');
  console.log('  --network <network>  Network to use (local, testnet, futurenet, mainnet)');
  console.log('  --create            Create a new account');
  console.log('  --fund              Fund the account (default)');
  console.log('  --balance           Check account balance');
  console.log('  --show-secret       Show the secret key (use with caution!)');
  console.log('  --force             Overwrite existing account');
  console.log();
  console.log('Examples:');
  console.log('  npm run network:fund                    # Fund default deployer account');
  console.log('  npm run network:fund alice --create     # Create new account "alice"');
  console.log('  npm run network:fund alice --fund       # Fund existing account "alice"');
  console.log('  npm run network:fund --balance          # Check balance of deployer');
}

async function main() {
  console.log('💰 Stellar Account Management');
  console.log('─'.repeat(50));
  
  // Check prerequisites
  if (!checkStellarCLI()) {
    process.exit(1);
  }
  
  // Parse arguments
  const args = process.argv.slice(2);
  const accountName = args.find(arg => !arg.startsWith('--')) || process.env.STELLAR_ACCOUNT || 'deployer';
  const network = process.env.STELLAR_NETWORK || 'testnet';
  
  console.log(`Network: ${network}`);
  console.log(`Account: ${accountName}`);
  console.log('─'.repeat(50));
  
  // Check what operation to perform
  if (args.includes('--help') || args.includes('-h')) {
    showUsage();
    return;
  }
  
  if (args.includes('--create')) {
    createAccount(accountName);
  }
  
  if (args.includes('--fund') || (!args.includes('--create') && !args.includes('--balance'))) {
    // Check if account exists
    try {
      execSync(`stellar keys address ${accountName}`, { stdio: 'ignore' });
    } catch {
      console.log(`Account '${accountName}' not found. Creating it first...`);
      createAccount(accountName);
    }
    
    fundAccount(accountName, network);
  }
  
  if (args.includes('--balance')) {
    checkBalance(accountName, network);
  }
}

main().catch(error => {
  console.error('❌ Account management failed:', error.message);
  process.exit(1);
});