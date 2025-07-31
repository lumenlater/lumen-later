#!/usr/bin/env node

import 'dotenv/config';
import { execSync } from 'child_process';
import { existsSync, mkdirSync, writeFileSync, readFileSync, rmSync } from 'fs';
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

function loadContractIds() {
  const network = process.env.STELLAR_NETWORK;
  const contractIdsFile = join(rootDir, '.stellar', 'contract-ids', network, 'all-contracts.json');
  
  if (!existsSync(contractIdsFile)) {
    throw new Error('Contract IDs not found. Please run contracts:deploy or contracts:connect first.');
  }
  
  return JSON.parse(readFileSync(contractIdsFile, 'utf8'));
}

function generateBinding(name, contractId) {
  console.log(`\n📦 Generating TypeScript binding for ${name}...`);
  
  const packageName = `${name}-client`;
  const packageDir = join(rootDir, 'packages', packageName);
  
  // Clean existing directory if it exists
  if (existsSync(packageDir)) {
    console.log(`  Cleaning existing ${packageName} directory...`);
    rmSync(packageDir, { recursive: true, force: true });
  }
  
  // Create package directory
  mkdirSync(packageDir, { recursive: true });
  
  // Generate bindings using stellar CLI
  const network = process.env.STELLAR_NETWORK;
  
  try {
    exe(`stellar contract bindings typescript \
      --network ${network} \
      --contract-id ${contractId} \
      --output-dir ${packageDir} \
      --overwrite`);
    
    console.log(`✅ ${name} bindings generated`);
  } catch (error) {
    console.error(`❌ Failed to generate bindings for ${name}`);
    throw error;
  }
  
  // Update package.json with workspace configuration
  updatePackageJson(packageDir, name);
  
  // Build the package
  console.log(`  Building ${packageName}...`);
  exe(`cd ${packageDir} && pnpm install && pnpm run build`);
  
  return packageDir;
}

function updatePackageJson(packageDir, contractName) {
  const packageJsonPath = join(packageDir, 'package.json');
  
  if (!existsSync(packageJsonPath)) {
    console.log('  Creating package.json...');
    const packageJson = {
      name: `@lumenlater/${contractName}-client`,
      version: '1.0.0',
      private: true,
      main: './dist/index.js',
      types: './dist/index.d.ts',
      scripts: {
        build: 'tsc',
        clean: 'rm -rf dist node_modules'
      },
      devDependencies: {
        '@types/node': '^20.0.0',
        'typescript': '^5.0.0'
      },
      dependencies: {
        '@stellar/stellar-sdk': '14.0.0-rc.3'
      }
    };
    
    writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
  } else {
    // Update existing package.json
    const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));
    packageJson.name = `@lumenlater/${contractName}-client`;
    packageJson.private = true;
    
    writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
  }
}

function updateRootPackageJson(generatedPackages) { 
  console.log('\n📝 Updating root package.json workspaces...');
  
  const packageJsonPath = join(rootDir, 'package.json');
  const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));
  
  // Ensure workspaces includes all generated packages
  if (!packageJson.workspaces) {
    packageJson.workspaces = [];
  }
  
  // Add packages/* if not already there
  if (!packageJson.workspaces.includes('packages/*')) {
    packageJson.workspaces.push('packages/*');
  }
  
  writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
  console.log('✅ Root package.json updated');
}

function createContractIdsExport() {
  console.log('\n📚 Creating contract IDs export...');
  
  const contractIdsPath = join(rootDir, 'packages', 'contract-ids.ts');
  
  const contracts = loadContractIds();
  let content = '// Auto-generated contract IDs\n\n';
  
  content += 'export const CONTRACT_IDS = {\n';
  for (const [name, id] of Object.entries(contracts)) {
    const constName = name.toUpperCase().replace(/-/g, '_');
    content += `  ${constName}: '${id}',\n`;
  }
  content += '} as const;\n';
  
  writeFileSync(contractIdsPath, content);
  
  console.log('✅ Contract IDs export created');
}

async function main() {
  console.log('🔧 Generating TypeScript Bindings for Soroban BNPL Contracts');
  console.log('─'.repeat(50));
  console.log(`Network: ${process.env.STELLAR_NETWORK}`);
  console.log(`Binding Mode: ${process.env.CONTRACT_BINDING_MODE}`);
  console.log('─'.repeat(50));
  
  // Load contract IDs
  const contracts = loadContractIds();
  
  console.log('\nContracts to generate bindings for:');
  for (const [name, id] of Object.entries(contracts)) {
    console.log(`  ${name}: ${id}`);
  }
  
  // Generate bindings for each contract
  const generatedPackages = [];
  for (const [name, id] of Object.entries(contracts)) {
    try {
      const packageDir = generateBinding(name, id);
      generatedPackages.push(packageDir);
    } catch (error) {
      console.error(`Failed to generate binding for ${name}:`, error.message);
      // Continue with other contracts
    }
  }
  
  // Update root package.json
  updateRootPackageJson(generatedPackages);
  
  // Create contract IDs export
  createContractIdsExport();
  
  // Install dependencies
  console.log('\n📦 Installing dependencies...');
  exe('pnpm install');
  
  console.log('\n✅ TypeScript bindings generated successfully!');
  console.log('\nGenerated packages:');
  generatedPackages.forEach(pkg => {
    console.log(`  - ${pkg}`);
  });
  
  console.log('\nNext steps:');
  console.log('1. Update your frontend package.json to include the client packages');
  console.log('2. Run `pnpm install` in your frontend to link the packages');
  console.log('\nTo use the bindings in your code:');
}

main().catch(error => {
  console.error('❌ Binding generation failed:', error.message);
  process.exit(1);
});