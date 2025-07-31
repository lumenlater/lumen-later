#!/usr/bin/env node

import { existsSync, copyFileSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

const ENVIRONMENTS = ['local', 'testnet', 'futurenet', 'mainnet'];

function selectEnvironment(env) {
  if (!ENVIRONMENTS.includes(env)) {
    console.error(`❌ Invalid environment: ${env}`);
    console.error(`   Valid environments: ${ENVIRONMENTS.join(', ')}`);
    process.exit(1);
  }

  const envFile = join(rootDir, `.env.${env}`);
  const targetFile = join(rootDir, '.env');

  // Check if environment file exists
  if (!existsSync(envFile)) {
    console.log(`⚠️  Environment file ${envFile} not found.`);
    console.log(`   Creating from template...`);
    
    // Create environment file from template
    createEnvironmentFile(env);
  }

  // Copy environment file to .env
  try {
    copyFileSync(envFile, targetFile);
    console.log(`✅ Environment switched to: ${env}`);
    console.log(`   Active configuration: .env -> .env.${env}`);
    
    // Show current configuration
    showConfiguration(env);
  } catch (error) {
    console.error(`❌ Failed to switch environment: ${error.message}`);
    process.exit(1);
  }
}

function createEnvironmentFile(env) {
  const templateFile = join(rootDir, '.env.example');
  const targetFile = join(rootDir, `.env.${env}`);
  
  // Create a basic template if .env.example doesn't exist
  let content;
  if (existsSync(templateFile)) {
    content = readFileSync(templateFile, 'utf8');
  } else {
    content = `# Stellar Network Configuration
STELLAR_NETWORK=testnet
STELLAR_RPC_URL=https://soroban-testnet.stellar.org
STELLAR_HORIZON_URL=https://horizon-testnet.stellar.org
STELLAR_NETWORK_PASSPHRASE="Test SDF Network ; September 2015"

# Account Configuration
STELLAR_ACCOUNT=deployer
STELLAR_SECRET_KEY=

# Deployment Configuration
DEPLOYMENT_MODE=fresh
CONTRACT_BINDING_MODE=generate

# Contract IDs (for existing deployments)
PUBLIC_USDC_TOKEN_CONTRACT_ID=
PUBLIC_LP_TOKEN_CONTRACT_ID=
PUBLIC_UNIFIED_BNPL_CONTRACT_ID=

# Frontend Configuration
PUBLIC_STELLAR_NETWORK=testnet
`;
  }
  
  // Update network-specific values
  switch (env) {
    case 'local':
      content = content
        .replace(/STELLAR_NETWORK=.*/g, 'STELLAR_NETWORK=standalone')
        .replace(/STELLAR_RPC_URL=.*/g, 'STELLAR_RPC_URL=http://localhost:8000/soroban/rpc')
        .replace(/STELLAR_HORIZON_URL=.*/g, 'STELLAR_HORIZON_URL=http://localhost:8000')
        .replace(/STELLAR_NETWORK_PASSPHRASE=.*/g, 'STELLAR_NETWORK_PASSPHRASE="Standalone Network ; February 2017"')
        .replace(/DEPLOYMENT_MODE=.*/g, 'DEPLOYMENT_MODE=fresh')
        .replace(/PUBLIC_STELLAR_NETWORK=.*/g, 'PUBLIC_STELLAR_NETWORK=standalone');
      break;
      
    case 'testnet':
      content = content
        .replace(/STELLAR_NETWORK=.*/g, 'STELLAR_NETWORK=testnet')
        .replace(/STELLAR_RPC_URL=.*/g, 'STELLAR_RPC_URL=https://soroban-testnet.stellar.org')
        .replace(/STELLAR_HORIZON_URL=.*/g, 'STELLAR_HORIZON_URL=https://horizon-testnet.stellar.org')
        .replace(/STELLAR_NETWORK_PASSPHRASE=.*/g, 'STELLAR_NETWORK_PASSPHRASE="Test SDF Network ; September 2015"')
        .replace(/DEPLOYMENT_MODE=.*/g, 'DEPLOYMENT_MODE=fresh')
        .replace(/PUBLIC_STELLAR_NETWORK=.*/g, 'PUBLIC_STELLAR_NETWORK=testnet');
      break;
      
    case 'futurenet':
      content = content
        .replace(/STELLAR_NETWORK=.*/g, 'STELLAR_NETWORK=futurenet')
        .replace(/STELLAR_RPC_URL=.*/g, 'STELLAR_RPC_URL=https://rpc-futurenet.stellar.org')
        .replace(/STELLAR_HORIZON_URL=.*/g, 'STELLAR_HORIZON_URL=https://horizon-futurenet.stellar.org')
        .replace(/STELLAR_NETWORK_PASSPHRASE=.*/g, 'STELLAR_NETWORK_PASSPHRASE="Test SDF Future Network ; October 2022"')
        .replace(/DEPLOYMENT_MODE=.*/g, 'DEPLOYMENT_MODE=fresh')
        .replace(/PUBLIC_STELLAR_NETWORK=.*/g, 'PUBLIC_STELLAR_NETWORK=futurenet');
      break;
      
    case 'mainnet':
      content = content
        .replace(/STELLAR_NETWORK=.*/g, 'STELLAR_NETWORK=mainnet')
        .replace(/STELLAR_RPC_URL=.*/g, 'STELLAR_RPC_URL=https://soroban-rpc.stellar.org')
        .replace(/STELLAR_HORIZON_URL=.*/g, 'STELLAR_HORIZON_URL=https://horizon.stellar.org')
        .replace(/STELLAR_NETWORK_PASSPHRASE=.*/g, 'STELLAR_NETWORK_PASSPHRASE="Public Global Stellar Network ; September 2015"')
        .replace(/DEPLOYMENT_MODE=.*/g, 'DEPLOYMENT_MODE=existing')
        .replace(/PUBLIC_STELLAR_NETWORK=.*/g, 'PUBLIC_STELLAR_NETWORK=mainnet');
      break;
  }
  
  writeFileSync(targetFile, content);
  console.log(`✅ Created ${targetFile}`);
}

function showConfiguration(env) {
  const envFile = join(rootDir, '.env');
  
  if (!existsSync(envFile)) {
    return;
  }
  
  const content = readFileSync(envFile, 'utf8');
  const lines = content.split('\n');
  
  console.log('\n📋 Current Configuration:');
  console.log('─'.repeat(50));
  
  const importantVars = [
    'STELLAR_NETWORK',
    'STELLAR_RPC_URL',
    'DEPLOYMENT_MODE',
    'CONTRACT_BINDING_MODE'
  ];
  
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const [key] = trimmed.split('=');
      if (importantVars.includes(key)) {
        console.log(`   ${trimmed}`);
      }
    }
  }
  
  console.log('─'.repeat(50));
  console.log('\nNext steps:');
  console.log(`1. Update ${`.env.${env}`} with your account details`);
  console.log('2. Run `npm run network:setup` to setup the network');
  console.log('3. Run `npm run contracts:deploy` or `npm run contracts:connect`');
}

// Main execution
const args = process.argv.slice(2);

if (args.length === 0) {
  console.log('Usage: npm run env:select <environment>');
  console.log(`Available environments: ${ENVIRONMENTS.join(', ')}`);
  process.exit(1);
}

selectEnvironment(args[0]);