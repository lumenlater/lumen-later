#!/usr/bin/env node

import 'dotenv/config';
import { execSync } from 'child_process';
import { readFileSync } from 'fs';
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

function getContractId() {
  const network = process.env.STELLAR_NETWORK || 'testnet';
  const contractIdPath = join(rootDir, '.stellar', 'contract-ids', network, 'unified-bnpl.json');
  
  try {
    const data = JSON.parse(readFileSync(contractIdPath, 'utf8'));
    return data.contractId;
  } catch (error) {
    console.error('❌ Failed to read contract ID. Have you deployed the contracts?');
    process.exit(1);
  }
}

async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log('Usage:');
    console.log('  manage-admins.mjs list                    - List all admins');
    console.log('  manage-admins.mjs add <address>          - Add a new admin');
    console.log('  manage-admins.mjs remove <address>       - Remove an admin');
    console.log('  manage-admins.mjs check <address>        - Check if address is admin');
    process.exit(0);
  }

  const command = args[0];
  const contractId = getContractId();
  const account = process.env.STELLAR_ACCOUNT || 'deployer';
  const network = process.env.STELLAR_NETWORK || 'testnet';
  const adminAddress = execSync(`stellar keys address ${account}`, { encoding: 'utf8' }).trim();

  console.log(`\n🔧 Managing admins for UnifiedBNPL contract`);
  console.log(`Contract: ${contractId}`);
  console.log(`Network: ${network}`);
  console.log(`Current admin: ${adminAddress}\n`);

  switch (command) {
    case 'list':
      console.log('📋 Getting admin list...');
      const output = execSync(
        `stellar contract invoke \
          --id ${contractId} \
          --network ${network} \
          -- \
          get_admins`,
        { encoding: 'utf8' }
      );
      
      // Parse the output to display admins nicely
      try {
        const admins = JSON.parse(output.trim());
        console.log('\nCurrent admins:');
        admins.forEach((admin, index) => {
          console.log(`  ${index + 1}. ${admin}`);
        });
      } catch {
        console.log('Output:', output);
      }
      break;

    case 'add':
      if (args.length < 2) {
        console.error('❌ Please provide the address to add');
        process.exit(1);
      }
      
      const newAdmin = args[1];
      console.log(`➕ Adding admin: ${newAdmin}`);
      
      exe(`stellar contract invoke \
        --id ${contractId} \
        --source ${account} \
        --network ${network} \
        -- \
        add_admin \
        --current_admin ${adminAddress} \
        --new_admin ${newAdmin}`);
      
      console.log('✅ Admin added successfully');
      break;

    case 'remove':
      if (args.length < 2) {
        console.error('❌ Please provide the address to remove');
        process.exit(1);
      }
      
      const adminToRemove = args[1];
      console.log(`➖ Removing admin: ${adminToRemove}`);
      
      exe(`stellar contract invoke \
        --id ${contractId} \
        --source ${account} \
        --network ${network} \
        -- \
        remove_admin \
        --current_admin ${adminAddress} \
        --admin_to_remove ${adminToRemove}`);
      
      console.log('✅ Admin removed successfully');
      break;

    case 'check':
      if (args.length < 2) {
        console.error('❌ Please provide the address to check');
        process.exit(1);
      }
      
      const addressToCheck = args[1];
      console.log(`🔍 Checking admin status for: ${addressToCheck}`);
      
      const result = execSync(
        `stellar contract invoke \
          --id ${contractId} \
          --network ${network} \
          -- \
          is_admin \
          --address ${addressToCheck}`,
        { encoding: 'utf8' }
      ).trim();
      
      console.log(`\nIs admin: ${result}`);
      break;

    default:
      console.error(`❌ Unknown command: ${command}`);
      process.exit(1);
  }
}

main().catch(error => {
  console.error('❌ Admin management failed:', error.message);
  process.exit(1);
});