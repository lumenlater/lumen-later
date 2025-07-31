'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Header } from '@/components/layout/header';
import { Droplets, Wallet, AlertCircle, Check, ExternalLink, RefreshCw, Info } from 'lucide-react';
import { useWallet } from '@/hooks/web3/use-wallet';
import { useUsdcToken } from '@/hooks/web3/use-usdc-token';
import { Config } from '@/constants/config';
import { ErrorMessages } from '@/constants/errors';
import CONTRACT_IDS from '@/config/contracts';
import Link from 'next/link';
import { StrKey } from '@stellar/stellar-sdk';

interface RecentMint {
  address: string;
  amount: string;
  time: string;
  txHash: string;
}

// Helper function to parse blockchain events and convert Ed25519 to Stellar address
// Currently unused but kept for future implementation of recent mints display
// function parseBlockchainEvents(events: any[]): RecentMint[] {
//   return events?.map(event => {
//     try {
//       // Extract Ed25519 public key from the event data
//       const addressBuffer = event.topic[1]._value._value._value;
//       const publicKeyBytes = new Uint8Array(addressBuffer);
//       
//       // Convert to Stellar address using StrKey
//       const stellarAddress = StrKey.encodeEd25519PublicKey(publicKeyBytes as any);
//       const shortAddress = `${stellarAddress.substring(0, 8)}...${stellarAddress.substring(stellarAddress.length - 8)}`;
//       
//       // Extract amount (value is in base units, divide by 10^7 for USDC with 7 decimals)
//       const amount = (Number(event.value._value._attributes.lo._value) / (10 ** Config.USDC_DECIMALS)).toFixed(2);
//       
//       // Parse timestamp
//       const eventTime = new Date(event.ledgerClosedAt);
//       const now = new Date();
//       const diffMs = now.getTime() - eventTime.getTime();
//       const diffMins = Math.floor(diffMs / 60000);
//       
//       let time: string;
//       if (diffMins < 1) {
//         time = 'Just now';
//       } else if (diffMins < 60) {
//         time = `${diffMins} minute${diffMins === 1 ? '' : 's'} ago`;
//       } else {
//         const diffHours = Math.floor(diffMins / 60);
//         time = `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
//       }
//       
//       return {
//         address: shortAddress,
//         amount,
//         time,
//         txHash: event.txHash
//       };
//     } catch (error) {
//       console.error('Error parsing event:', error);
//       return null;
//     }
//   }).filter(Boolean).slice(0, 5) as RecentMint[]; // Show only the latest 5 mints
// }

export default function FaucetPage() {
  const { publicKey, isConnected } = useWallet();
  const { 
    balance, 
    isLoading: contractLoading,
    error: contractError,
    refreshBalance,
    getMintLimit,
    getDailyMinted,
    mint,
    txStatus,
    lastTxHash
  } = useUsdcToken();
  
  // State for mint limit and daily minted
  const [mintLimit, setMintLimit] = useState<bigint>(0n);
  const [dailyMinted, setDailyMinted] = useState<bigint>(0n);
  const [contractAddress] = useState(CONTRACT_IDS.USDC_TOKEN || 'Not configured');
  const contractTokenInfo = { name: 'USDC', symbol: 'USDC', decimals: 7 };
  
  // Mint tokens function using the real blockchain mint
  const mintTokens = async (amount: string) => {
    if (!mint) {
      throw new Error('Mint function not available');
    }
    await mint(amount);
  };
  // Recent mints functionality to be implemented later
  // const recentMints: any[] = [];
  
  const [amount, setAmount] = useState<string>(Config.DEFAULT_MINT_AMOUNT);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [shouldResetAmount, setShouldResetAmount] = useState(true);
  const [lastMintAmount, setLastMintAmount] = useState('');
  // const [recentMintsAltered, setRecentMintsAltered] = useState<any[]>([]);
  
  // Memoize calculated values
  const tokenInfo = useMemo(() => ({
    name: contractTokenInfo?.name || 'Testnet USDC',
    symbol: contractTokenInfo?.symbol || 'USDC',
    decimals: contractTokenInfo?.decimals || Config.USDC_DECIMALS,
    contractId: contractAddress,
    balance: balance,
  }), [contractTokenInfo, balance, contractAddress]);
  
  // Calculate remaining mint amount
  const remainingMintAmount = useMemo(() => {
    const limit = Number(mintLimit) / (10 ** Config.USDC_DECIMALS);
    const minted = Number(dailyMinted) / (10 ** Config.USDC_DECIMALS);
    return Math.max(0, limit - minted);
  }, [mintLimit, dailyMinted]);

  // Fetch mint limit and daily minted on mount and when connected
  useEffect(() => {
    const fetchMintData = async () => {
      if (isConnected && getMintLimit && getDailyMinted) {
        try {
          const [limit, minted] = await Promise.all([
            getMintLimit(),
            getDailyMinted()
          ]);
          setMintLimit(limit);
          setDailyMinted(minted);
        } catch (error) {
          console.error('Error fetching mint data:', error);
        }
      }
    };
    
    fetchMintData();
  }, [isConnected, getMintLimit, getDailyMinted]);

  useEffect(() => {
    if (contractError) {
      setErrorMessage(contractError);
    }
  }, [contractError]);


  // useEffect(() => {
  //   console.log('Recent mints:', recentMints);
  //   setRecentMintsAltered(parseBlockchainEvents(recentMints || []));
  //   console.log('Recent mints altered:', recentMintsAltered);
  // }, [recentMints]);
  
  const handleAmountChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value === '' || /^\d*\.?\d*$/.test(value)) {
      setAmount(value);
    }
  }, []);

  const validateAmount = useCallback(() => {
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setErrorMessage('Please enter a valid amount');
      return false;
    }
    
    // Check if amount exceeds remaining daily limit
    if (numAmount > remainingMintAmount) {
      setErrorMessage(`Amount exceeds your remaining daily limit of ${remainingMintAmount.toFixed(2)} USDC`);
      return false;
    }
    
    return true;
  }, [amount, remainingMintAmount]);

  const handleMint = useCallback(async () => {
    if (!isConnected || !publicKey || loading || txStatus === 'pending') {
      return;
    }

    if (!validateAmount()) {
      return;
    }

    setLoading(true);
    setErrorMessage('');

    try {
      // Save the amount for success message
      setLastMintAmount(amount);
      
      // Call the contract mint function
      await mintTokens(amount);
      
      // Reset amount only if user wants it
      if (shouldResetAmount) {
        setAmount(Config.DEFAULT_MINT_AMOUNT);
      }
      
    } catch (error) {
      if (Config.IS_DEVELOPMENT) {
        console.error('Mint error:', error);
      }
      setErrorMessage(error instanceof Error ? error.message : ErrorMessages.TRANSACTION_FAILED);
    } finally {
      setLoading(false);
    }
  }, [isConnected, publicKey, amount, mintTokens, validateAmount, loading, txStatus, shouldResetAmount]);

  const handleRefresh = useCallback(async () => {
    if (!loading && !contractLoading && isConnected) {
      await refreshBalance();
      // Also refresh mint data
      if (getMintLimit && getDailyMinted) {
        try {
          const [limit, minted] = await Promise.all([
            getMintLimit(),
            getDailyMinted()
          ]);
          setMintLimit(limit);
          setDailyMinted(minted);
        } catch (error) {
          console.error('Error refreshing mint data:', error);
        }
      }
    }
  }, [loading, contractLoading, refreshBalance, isConnected, getMintLimit, getDailyMinted]);

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-100 rounded-full mb-4">
              <Droplets className="w-8 h-8 text-primary-600" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">USDC Testnet Faucet</h1>
            <p className="text-gray-600">
              Get free testnet USDC tokens to test the Lumen Later protocol
            </p>
          </div>

          {/* Daily Limit Info Card */}
          {isConnected && (
            <Card className="p-6 mb-6 bg-blue-50 border-blue-200">
              <div className="flex items-start space-x-3">
                <Info className="w-5 h-5 text-blue-600 mt-0.5" />
                <div className="flex-1">
                  <h3 className="font-semibold text-blue-900 mb-2">Daily Mint Limits</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <p className="text-sm text-blue-700">Daily Limit</p>
                      <p className="text-2xl font-bold text-blue-900">
                        {(Number(mintLimit) / (10 ** Config.USDC_DECIMALS)).toFixed(0)} USDC
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-blue-700">Already Minted Today</p>
                      <p className="text-2xl font-bold text-blue-900">
                        {(Number(dailyMinted) / (10 ** Config.USDC_DECIMALS)).toFixed(2)} USDC
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-blue-700">Remaining</p>
                      <p className="text-2xl font-bold text-blue-900">
                        {remainingMintAmount.toFixed(2)} USDC
                      </p>
                    </div>
                  </div>
                  <div className="mt-3">
                    <div className="w-full bg-blue-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full transition-all"
                        style={{
                          width: `${Math.min(100, (Number(dailyMinted) / Number(mintLimit)) * 100)}%`
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          )}

          {/* Token Info Card */}
          <Card className="p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Token Information</h2>
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                disabled={loading || contractLoading}
              >
                <RefreshCw className={`w-4 h-4 mr-1 ${contractLoading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500 mb-1">Token Name</p>
                <p className="font-medium">{tokenInfo.name}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500 mb-1">Symbol</p>
                <p className="font-medium">{tokenInfo.symbol}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500 mb-1">Decimals</p>
                <p className="font-medium">{tokenInfo.decimals}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500 mb-1">Contract Address</p>
                <p className="font-mono text-sm break-all">{tokenInfo.contractId}</p>
              </div>
            </div>
          </Card>

          {/* Mint Card */}
          <Card className="p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">Mint USDC Tokens</h2>

            {/* Wallet Status */}
            {isConnected && publicKey && (
              <div className="bg-gray-50 p-4 rounded-lg mb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Wallet className="w-5 h-5 text-gray-600 mr-2" />
                    <div>
                      <p className="text-sm text-gray-600">Connected Wallet</p>
                      <p className="font-mono text-sm">{publicKey.slice(0, 8)}...{publicKey.slice(-8)}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-600">Balance</p>
                    <p className="font-semibold">{tokenInfo.balance} USDC</p>
                  </div>
                </div>
              </div>
            )}

            {/* Mint Form */}
            <div className="space-y-4">
              <div>
                <label htmlFor="amount" className="block text-sm font-medium text-gray-700 mb-1">
                  Amount to Mint
                </label>
                <div className="relative">
                  <Input
                    id="amount"
                    type="text"
                    value={amount}
                    onChange={handleAmountChange}
                    placeholder="100"
                    className="pr-16"
                    disabled={!isConnected || loading || txStatus === 'pending'}
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">
                    USDC
                  </span>
                </div>
                {isConnected && remainingMintAmount > 0 && (
                  <p className="text-xs text-gray-500 mt-1">
                    Maximum: {remainingMintAmount.toFixed(2)} USDC
                  </p>
                )}
              </div>

              {/* Quick Amount Buttons */}
              <div className="flex gap-2">
                {Config.QUICK_MINT_AMOUNTS.filter(amt => parseFloat(amt) <= remainingMintAmount).map((quickAmount) => (
                  <Button
                    key={quickAmount}
                    variant="outline"
                    size="sm"
                    onClick={() => setAmount(quickAmount)}
                    disabled={!isConnected || loading || txStatus === 'pending'}
                  >
                    {quickAmount} USDC
                  </Button>
                ))}
              </div>

              {/* Reset Amount Option */}
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="resetAmount"
                  checked={shouldResetAmount}
                  onChange={(e) => setShouldResetAmount(e.target.checked)}
                  className="w-4 h-4 text-primary-600 bg-gray-100 border-gray-300 rounded focus:ring-primary-500"
                />
                <label htmlFor="resetAmount" className="text-sm text-gray-700">
                  Reset amount to default after minting
                </label>
              </div>

              {/* Error/Success Messages */}
              {errorMessage && (
                <div className="flex items-start space-x-2 p-3 bg-red-50 text-red-800 rounded-lg">
                  <AlertCircle className="w-5 h-5 mt-0.5" />
                  <div className="flex-1 text-sm">{errorMessage}</div>
                </div>
              )}

              {txStatus === 'success' && lastTxHash && (
                <div className="flex items-start space-x-2 p-3 bg-green-50 text-green-800 rounded-lg">
                  <Check className="w-5 h-5 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-medium">Transaction Successful!</p>
                    <p className="text-sm mt-1">
                      Minted {lastMintAmount} USDC successfully. Your balance will update shortly.
                    </p>
                    <Link 
                      href={`https://stellar.expert/explorer/testnet/tx/${lastTxHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center text-sm text-green-600 hover:text-green-700 mt-2"
                    >
                      View on Explorer
                      <ExternalLink className="w-3 h-3 ml-1" />
                    </Link>
                  </div>
                </div>
              )}

              {/* No remaining limit message */}
              {isConnected && remainingMintAmount <= 0 && (
                <div className="flex items-start space-x-2 p-3 bg-yellow-50 text-yellow-800 rounded-lg">
                  <AlertCircle className="w-5 h-5 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-medium">Daily Limit Reached</p>
                    <p className="text-sm mt-1">
                      You have reached your daily mint limit. Please come back tomorrow.
                    </p>
                  </div>
                </div>
              )}

              {/* Mint Button */}
              <Button
                onClick={handleMint}
                disabled={!isConnected || loading || contractLoading || txStatus === 'pending' || remainingMintAmount <= 0}
                className="w-full"
                size="lg"
              >
                {loading || txStatus === 'pending' ? (
                  <>
                    <span className="animate-spin mr-2">⏳</span>
                    {txStatus === 'pending' ? 'Confirming Transaction...' : 'Processing...'}
                  </>
                ) : !isConnected ? (
                  'Connect Wallet to Mint'
                ) : remainingMintAmount <= 0 ? (
                  'Daily Limit Reached'
                ) : (
                  `Mint ${amount || '0'} USDC`
                )}
              </Button>

              {!isConnected && (
                <p className="text-sm text-gray-600 text-center">
                  Please connect your wallet to mint USDC tokens
                </p>
              )}
            </div>
          </Card>

          {/* Recent Mints - To be implemented */}
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Recent Mints</h2>
            <div className="text-center py-8 text-gray-500">
              <Droplets className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Recent mints will appear here</p>
              <p className="text-sm mt-1">Feature coming soon</p>
            </div>
          </Card>
        </div>
      </main>
    </div>
  );
}