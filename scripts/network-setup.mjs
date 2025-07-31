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

function setupLocalNetwork() {
  console.log('🌐 Setting up local Stellar network...');
  
  // Check if Docker is installed
  try {
    execSync('docker --version', { stdio: 'ignore' });
  } catch {
    console.error('❌ Docker not found. Please install Docker to run local network.');
    process.exit(1);
  }
  
  // Check if local network is already running
  try {
    execSync('docker ps | grep stellar-local', { stdio: 'ignore' });
    console.log('⚠️  Local network is already running');
    return;
  } catch {
    // Network not running, start it
  }
  
  // Start local Stellar network
  console.log('Starting local Stellar network with Docker...');
  exe('docker run --rm -d -p 8000:8000 --name stellar-local stellar/quickstart:soroban-dev --standalone --enable-soroban-rpc');
  
  console.log('⏳ Waiting for local network to be ready...');
  // Wait for network to be ready
  let attempts = 0;
  while (attempts < 30) {
    try {
      execSync('curl -s http://localhost:8000/soroban/rpc', { stdio: 'ignore' });
      console.log('✅ Local network is ready!');
      break;
    } catch {
      attempts++;
      if (attempts >= 30) {
        console.error('❌ Local network failed to start');
        process.exit(1);
      }
      process.stdout.write('.');
      execSync('sleep 1');
    }
  }
}

function setupAccount() {
  const network = process.env.STELLAR_NETWORK || 'testnet';
  const accountName = process.env.STELLAR_ACCOUNT || 'deployer';
  
  console.log(`\n🔑 Setting up Stellar account for ${network}...`);
  
  // Create .stellar directory
  const stellarDir = join(rootDir, '.stellar');
  if (!existsSync(stellarDir)) {
    mkdirSync(stellarDir, { recursive: true });
  }
  
  // Check if account already exists
  try {
    execSync(`stellar keys address ${accountName}`, { stdio: 'ignore' });
    console.log(`✅ Account '${accountName}' already exists`);
    
    const address = execSync(`stellar keys address ${accountName}`, { encoding: 'utf8' }).trim();
    console.log(`   Address: ${address}`);
  } catch {
    // Generate new account
    console.log(`Creating new account '${accountName}'...`);
    exe(`stellar keys generate ${accountName}`);
    
    const address = execSync(`stellar keys address ${accountName}`, { encoding: 'utf8' }).trim();
    console.log(`✅ Account created: ${address}`);
  }
  
  // Fund account if not mainnet
  if (network !== 'mainnet') {
    fundAccount(accountName, network);
  } else {
    console.log('⚠️  Mainnet account must be funded manually');
    console.log('   Please ensure your account has sufficient XLM before proceeding');
  }
}

export function fundAccount(accountName, network) {
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

export function checkBalance(accountName, network) {
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

// Only run main if this script is run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  async function main() {
    console.log('🚀 Soroban BNPL Network Setup');
    console.log('─'.repeat(50));
    console.log(`Network: ${process.env.STELLAR_NETWORK || 'testnet'}`);
    console.log(`RPC URL: ${process.env.STELLAR_RPC_URL}`);
    console.log('─'.repeat(50));
    
    // Check prerequisites
    if (!checkStellarCLI()) {
      process.exit(1);
    }
    
    // Setup based on network
    const network = process.env.STELLAR_NETWORK || 'testnet';
    
    if (network === 'local' || network === 'standalone') {
      setupLocalNetwork();
    }
    
    // Setup account
    setupAccount();
    
    // Check balance
    const accountName = process.env.STELLAR_ACCOUNT || 'deployer';
    checkBalance(accountName, network);
    
    console.log('\n✅ Network setup complete!');
    console.log('\nNext steps:');
    
    if (process.env.DEPLOYMENT_MODE === 'fresh') {
      console.log('1. Run `npm run contracts:deploy` to deploy contracts');
    } else {
      console.log('1. Update .env with existing contract IDs');
      console.log('2. Run `npm run contracts:connect` to connect to existing contracts');
    }
  }

  main().catch(error => {
    console.error('❌ Network setup failed:', error.message);
    process.exit(1);
  });
}