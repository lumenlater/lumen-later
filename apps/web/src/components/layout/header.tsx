'use client';

import { useWallet } from '@/hooks/web3/use-wallet';
import { Button } from '@/components/ui/button';
import { Wallet, AlertCircle, Shield, Store, Droplets, User, LayoutDashboard } from 'lucide-react';
import Link from 'next/link';
import { isAdminWallet } from '@/config/admin';
import { useBnplMerchant } from '@/hooks/web3/use-bnpl-merchant';
import { LogoWithText } from '@/components/ui/logo';

export function Header() {
  const { isConnected, publicKey, walletName, connect, disconnect, isLoading, error } = useWallet();
  const { isApprovedMerchant } = useBnplMerchant(publicKey || '');

  const truncateAddress = (address: string) => {
    return `${address.slice(0, 4)}...${address.slice(-4)}`;
  };

  const isAdmin = isAdminWallet(publicKey);

  return (
    <header className="bg-white shadow-sm">
      <div className="container mx-auto px-4 py-4 flex justify-between items-center">
        <Link href="/">
          <LogoWithText />
        </Link>

        <div className="flex items-center space-x-4">
          {error && (
            <div className="flex items-center space-x-2 text-red-600 text-sm">
              <AlertCircle className="w-4 h-4" />
              <span>{error}</span>
            </div>
          )}
          <Link
            href="/faucet"
            className="flex items-center space-x-1 text-sm text-primary-600 hover:text-primary-700"
          >
            <Droplets className="w-4 h-4" />
            <span>Faucet</span>
          </Link>
          {isConnected && publicKey ? (
            <>
              <Link
                href="/user"
                className="flex items-center space-x-1 text-sm text-primary-600 hover:text-primary-700"
              >
                <User className="w-4 h-4" />
                <span>My Loans</span>
              </Link>
              {isApprovedMerchant && (
                <Link
                  href="/merchant"
                  className="flex items-center space-x-1 text-sm text-primary-600 hover:text-primary-700"
                >
                  <Store className="w-4 h-4" />
                  <span>Merchant</span>
                </Link>
              )}
              <Link
                href="/lending"
                className="flex items-center space-x-1 text-sm text-primary-600 hover:text-primary-700"
              >
                <LayoutDashboard className="w-4 h-4" />
                <span>Lending</span>
              </Link>
              {isAdmin && (
                <Link
                  href="/admin"
                  className="flex items-center space-x-1 text-sm text-primary-600 hover:text-primary-700"
                >
                  <Shield className="w-4 h-4" />
                  <span>Admin</span>
                </Link>
              )}
              <div className="flex items-center space-x-2">
                {walletName && (
                  <span className="text-xs text-gray-500">{walletName}</span>
                )}
                <span className="text-sm text-gray-600">
                  {truncateAddress(publicKey)}
                </span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={disconnect}
                disabled={isLoading}
              >
                Disconnect
              </Button>
            </>
          ) : (
            <Button
              onClick={connect}
              disabled={isLoading}
              className="flex items-center space-x-2"
            >
              <Wallet className="w-4 h-4" />
              <span>{isLoading ? 'Connecting...' : 'Connect Wallet'}</span>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}