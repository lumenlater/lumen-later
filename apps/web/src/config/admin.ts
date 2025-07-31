// Admin configuration

// Default admin wallets for development
const DEFAULT_ADMIN_WALLETS = [
  'GDQP2KPQGKIHYJGXNUIYOMHARUARCA7DJT5FO2FFOOKY3B2WSQHG4W37',
  'GD2R2EPCZG2J6DRBO2RPWWQLJZ3ZYLVYACR3YTJI525XPTPUFB53PLYX',
];

// Use environment variable if available, otherwise use defaults
export const ADMIN_WALLETS = process.env.NEXT_PUBLIC_ADMIN_WALLETS
  ? process.env.NEXT_PUBLIC_ADMIN_WALLETS.split(',').map(wallet => wallet.trim())
  : DEFAULT_ADMIN_WALLETS;

export function isAdminWallet(publicKey: string | null): boolean {
  if (!publicKey) return false;
  return ADMIN_WALLETS.includes(publicKey);
}

// Helper function to add admin wallet (for runtime updates)
export function addAdminWallet(wallet: string): string[] {
  if (!ADMIN_WALLETS.includes(wallet)) {
    ADMIN_WALLETS.push(wallet);
  }
  return ADMIN_WALLETS;
}

// Helper function to remove admin wallet (for runtime updates)
export function removeAdminWallet(wallet: string): string[] {
  const index = ADMIN_WALLETS.indexOf(wallet);
  if (index > -1) {
    ADMIN_WALLETS.splice(index, 1);
  }
  return ADMIN_WALLETS;
}