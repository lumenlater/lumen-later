#!/usr/bin/env node

import 'dotenv/config';
import { execSync } from 'child_process';
import { existsSync, mkdirSync, writeFileSync, readFileSync } from 'fs';
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

function buildContracts() {
  console.log('\n🏗️  Building smart contracts...');
  
  const contractsDir = join(rootDir, 'contracts');
  if (!existsSync(contractsDir)) {
    console.error('❌ Contracts directory not found');
    process.exit(1);
  }
  
  // Build all contracts
  exe(`cd ${contractsDir} && stellar contract build`);
  console.log('✅ Contracts built successfully');
}

function deployContract(name, wasmName) {
  const wasmPath = join(rootDir, 'contracts', 'target', 'wasm32v1-none', 'release', `${wasmName}.wasm`);
  
  if (!existsSync(wasmPath)) {
    throw new Error(`WASM file not found: ${wasmPath}`);
  }
  
  console.log(`\n📦 Deploying ${name}...`);
  
  const account = process.env.STELLAR_ACCOUNT || 'deployer';
  const network = process.env.STELLAR_NETWORK || 'testnet';
  
  const output = execSync(
    `stellar contract deploy --wasm ${wasmPath} --source ${account} --network ${network}`,
    { encoding: 'utf8' }
  );
  
  const contractId = output.trim();
  console.log(`✅ ${name} deployed: ${contractId}`);
  
  return contractId;
}

function deployAllContracts() {
  console.log('\n🚀 Deploying all contracts...');
  
  const deployedContracts = {};
  
  // Deploy contracts in order (USDC and LP token first, then treasury/insurance, then UnifiedBNPL)
  const contracts = [
    { name: 'usdc-token', wasmName: 'usdc_token' },
    { name: 'lp-token', wasmName: 'lp_token' },
    { name: 'bnpl-core', wasmName: 'bnpl_core' }
  ];
  
  for (const { name, wasmName } of contracts) {
    // Check if we should use existing contract ID from env
    const envKey = `PUBLIC_${name.toUpperCase().replace('-', '_')}_CONTRACT_ID`;
    const existingId = process.env[envKey];
    
    if (existingId && name === 'usdc-token') {
      console.log(`\n📦 Using existing ${name}: ${existingId}`);
      deployedContracts[name] = existingId;
    } else {
      deployedContracts[name] = deployContract(name, wasmName);
    }
  }
  
  return deployedContracts;
}

function saveContractIds(deployedContracts) {
  const network = process.env.STELLAR_NETWORK || 'testnet';
  const contractIdsDir = join(rootDir, '.stellar', 'contract-ids', network);
  
  mkdirSync(contractIdsDir, { recursive: true });
  
  // Save individual contract files
  for (const [name, id] of Object.entries(deployedContracts)) {
    const data = {
      network: network,
      contractId: id,
      deployedAt: new Date().toISOString(),
    };
    
    writeFileSync(
      join(contractIdsDir, `${name}.json`),
      JSON.stringify(data, null, 2)
    );
  }
  
  // Save all contracts in one file
  writeFileSync(
    join(contractIdsDir, 'all-contracts.json'),
    JSON.stringify(deployedContracts, null, 2)
  );
  
  console.log(`\n💾 Contract IDs saved to .stellar/contract-ids/${network}/`);
}

function initializeContracts(deployedContracts) {
  console.log('\n⚙️  Initializing contracts...');
  
  const account = process.env.STELLAR_ACCOUNT || 'deployer';
  const network = process.env.STELLAR_NETWORK || 'testnet';
  const adminAddress = execSync(`stellar keys address ${account}`, { encoding: 'utf8' }).trim();
  
  const treasuryAddress = process.env.TREASURY_ADDRESS || 'GC4OZ2QK5KQ5GUMATE3JMFAXOC53VYESG4FLR4OWGAIXXLBH5XNIMJAS';
  const insuranceFundAddress = process.env.INSURANCE_FUND_ADDRESS || 'GAMVH5LJE2XITJPVAUQHYKVZSHSHZFJFFHYPFF3XMNDGY247RXVM3BSM';

  // Initialize USDC Token
  if (deployedContracts['usdc-token'] && !process.env.PUBLIC_USDC_TOKEN_CONTRACT_ID) {
    console.log('\n📋 Initializing USDC Token...');
    exe(`stellar contract invoke \
      --id ${deployedContracts['usdc-token']} \
      --source ${account} \
      --network ${network} \
      -- \
      initialize \
      --admin ${adminAddress} \
      --name '"USD Coin"' \
      --symbol '"USDC"' \
      --decimals 7 \
      --mint_limit 10000000000000`);
  }
  
  // Initialize LP Token
  console.log('\n📋 Initializing LP Token...');
  exe(`stellar contract invoke \
    --id ${deployedContracts['lp-token']} \
    --source ${account} \
    --network ${network} \
    -- \
    initialize \
    --admin ${adminAddress} \
    --underlying_asset ${deployedContracts['usdc-token']} \
    --metadata '{"decimal":7,"name":"BNPL LP Token","symbol":"BNPLP"}'`);
  
  // Initialize bnpl-core first (Treasury and Insurance need BNPL contract address)
  console.log('\n📋 Initializing bnpl-core Contract...');
  exe(`stellar contract invoke \
    --id ${deployedContracts['bnpl-core']} \
    --source ${account} \
    --network ${network} \
    -- \
    initialize \
    --liquidity_pool ${deployedContracts['lp-token']} \
    --usdc_token ${deployedContracts['usdc-token']} \
    --admin ${adminAddress} \
    --treasury ${treasuryAddress} \
    --insurance_fund ${insuranceFundAddress}`);
    
  // Set BNPL contract in LP Token for collateral checking
  console.log('\n🔗 Setting BNPL contract in LP Token...');
  exe(`stellar contract invoke \
    --id ${deployedContracts['lp-token']} \
    --source ${account} \
    --network ${network} \
    -- \
    set_bnpl_core \
    --bnpl_core ${deployedContracts['bnpl-core']}`);
  
  console.log('\n✅ All contracts initialized and connected');
}

async function main() {
  console.log('🚀 Soroban BNPL Contract Deployment');
  console.log('─'.repeat(50));
  console.log(`Network: ${process.env.STELLAR_NETWORK || 'testnet'}`);
  console.log(`Account: ${process.env.STELLAR_ACCOUNT || 'deployer'}`);
  console.log(`Mode: ${process.env.DEPLOYMENT_MODE || 'fresh'}`);
  console.log('─'.repeat(50));
  
  if (process.env.DEPLOYMENT_MODE !== 'fresh') {
    console.error('❌ Deployment mode is not set to "fresh"');
    console.error('   To deploy new contracts, set DEPLOYMENT_MODE=fresh in your .env file');
    console.error('   To connect to existing contracts, run `npm run contracts:connect`');
    process.exit(1);
  }
  
  // Build contracts
  buildContracts();
  
  // Deploy all contracts
  const deployedContracts = deployAllContracts();
  
  // Save contract IDs
  saveContractIds(deployedContracts);
  
  // Initialize contracts
  initializeContracts(deployedContracts);
  
  console.log('\n✅ Contract deployment complete!');
  console.log('\nDeployed contracts:');
  for (const [name, id] of Object.entries(deployedContracts)) {
    console.log(`  ${name}: ${id}`);
  }
  
  // Show admin configuration
  const account = process.env.STELLAR_ACCOUNT || 'deployer';
  const adminAddress = execSync(`stellar keys address ${account}`, { encoding: 'utf8' }).trim();
  console.log('\nAdmin configuration:');
  console.log(`  Primary admin: ${adminAddress}`);
  
  if (process.env.ADMIN_WALLETS) {
    const additionalAdmins = process.env.ADMIN_WALLETS.split(',').map(wallet => wallet.trim()).filter(wallet => wallet && wallet !== adminAddress);
    if (additionalAdmins.length > 0) {
      console.log('  Additional admins:');
      additionalAdmins.forEach(admin => {
        console.log(`    - ${admin}`);
      });
    }
  }
  
  console.log('\nNext steps:');
  console.log('1. Run `pnpm run bindings:generate` to generate TypeScript bindings');
  console.log('2. Run `pnpm run dev` to start the development server');
}

main().catch(error => {
  console.error('❌ Contract deployment failed:', error.message);
  process.exit(1);
});