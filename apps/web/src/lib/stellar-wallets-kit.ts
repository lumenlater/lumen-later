import { 
  StellarWalletsKit, 
  WalletNetwork, 
  allowAllModules,
  FREIGHTER_ID,
  ISupportedWallet
} from '@creit.tech/stellar-wallets-kit';
import { Config } from '@/constants/config';

// Map network configuration to WalletNetwork enum
export function getWalletNetwork(): WalletNetwork {
  const network = Config.STELLAR_NETWORK.toLowerCase();
  switch (network) {
    case 'mainnet':
    case 'public':
      return WalletNetwork.PUBLIC;
    case 'testnet':
      return WalletNetwork.TESTNET;
    case 'futurenet':
      return WalletNetwork.FUTURENET;
    default:
      return WalletNetwork.TESTNET;
  }
}

// Create a singleton instance of the wallet kit
let kitInstance: StellarWalletsKit | null = null;

export function getWalletKit(): StellarWalletsKit {
  if (!kitInstance) {
    kitInstance = new StellarWalletsKit({
      network: getWalletNetwork(),
      selectedWalletId: FREIGHTER_ID, // Default to Freighter
      modules: allowAllModules(), // Allow all supported wallets
    });
  }
  return kitInstance;
}

// Helper to get network passphrase from WalletNetwork
export function getNetworkPassphrase(network: WalletNetwork): string {
  switch (network) {
    case WalletNetwork.PUBLIC:
      return 'Public Global Stellar Network ; September 2015';
    case WalletNetwork.TESTNET:
      return 'Test SDF Network ; September 2015';
    case WalletNetwork.FUTURENET:
      return 'Test SDF Future Network ; October 2022';
    default:
      return Config.NETWORK_PASSPHRASE;
  }
}

// Helper to validate Stellar public key
export function isValidStellarPublicKey(publicKey: string): boolean {
  return typeof publicKey === 'string' && 
         publicKey.startsWith('G') && 
         publicKey.length === 56 &&
         /^[A-Z0-9]+$/.test(publicKey);
}