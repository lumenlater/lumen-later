'use client';

import { Header } from '@/components/layout/header';
import { useWallet } from '@/hooks/web3/use-wallet';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CreditCard, Store, Wallet } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { LogoWithText } from '@/components/ui/logo';
import { motion } from 'motion/react';

export default function Home() {
  const { isConnected } = useWallet();
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-blue-50/20">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <motion.div 
            className="flex justify-center mb-8"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          >
            <LogoWithText size="large" />
          </motion.div>
          <motion.p 
            className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2, ease: "easeOut" }}
          >
            A decentralized Buy Now Pay Later protocol built on Stellar blockchain, 
            enabling flexible payments for users and instant settlements for merchants.
          </motion.p>
        </div>

        {/* How It Works Section */}
        <div className="max-w-6xl mx-auto mb-16">
          <motion.h2 
            className="text-3xl font-bold text-center mb-12 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            How It Works
          </motion.h2>
          
          <motion.div 
            className="grid md:grid-cols-3 gap-8"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.3 }}
            variants={{
              hidden: { opacity: 0 },
              visible: {
                opacity: 1,
                transition: {
                  staggerChildren: 0.15
                }
              }
            }}
          >
            <motion.div
              variants={{
                hidden: { opacity: 0, y: 20 },
                visible: { opacity: 1, y: 0 }
              }}
              whileHover={{ y: -5 }}
              transition={{ duration: 0.3 }}
            >
              <Card className="border-2 border-blue-100 hover:border-blue-300 transition-all duration-300 h-full">
              <CardHeader>
                <div className="w-12 h-12 bg-gradient-to-br from-blue-100 to-blue-200 rounded-full flex items-center justify-center mb-4">
                  <span className="text-2xl font-bold text-blue-600">1</span>
                </div>
                <CardTitle className="text-blue-600">Shop & Choose Lumen Later</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  Shop at participating merchants and choose Lumen Later as your payment method. 
                  Pay using your available credit limit backed by LP token collateral.
                </p>
              </CardContent>
            </Card>
            </motion.div>

            <motion.div
              variants={{
                hidden: { opacity: 0, y: 20 },
                visible: { opacity: 1, y: 0 }
              }}
              whileHover={{ y: -5 }}
              transition={{ duration: 0.3 }}
            >
              <Card className="border-2 border-purple-100 hover:border-purple-300 transition-all duration-300 h-full">
              <CardHeader>
                <div className="w-12 h-12 bg-gradient-to-br from-purple-100 to-purple-200 rounded-full flex items-center justify-center mb-4">
                  <span className="text-2xl font-bold text-purple-600">2</span>
                </div>
                <CardTitle className="text-purple-600">Merchant Gets Paid</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  Merchants receive instant payment from the liquidity pool. 
                  No waiting for settlement, no chargebacks, just instant USDC.
                </p>
              </CardContent>
            </Card>
            </motion.div>

            <motion.div
              variants={{
                hidden: { opacity: 0, y: 20 },
                visible: { opacity: 1, y: 0 }
              }}
              whileHover={{ y: -5 }}
              transition={{ duration: 0.3 }}
            >
              <Card className="border-2 border-indigo-100 hover:border-indigo-300 transition-all duration-300 h-full">
              <CardHeader>
                <div className="w-12 h-12 bg-gradient-to-br from-indigo-100 to-indigo-200 rounded-full flex items-center justify-center mb-4">
                  <span className="text-2xl font-bold text-indigo-600">3</span>
                </div>
                <CardTitle className="text-indigo-600">Repay Over Time</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  Users repay their loans over time with flexible terms. 
                  LP providers earn yield from interest payments.
                </p>
              </CardContent>
            </Card>
            </motion.div>
          </motion.div>
        </div>

        {/* Features Section */}
        <div className="max-w-6xl mx-auto mb-16">
          <motion.h2 
            className="text-3xl font-bold text-center mb-12 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            Why Lumen Later?
          </motion.h2>
          
          <motion.div 
            className="grid md:grid-cols-2 gap-8"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.3 }}
            variants={{
              hidden: { opacity: 0 },
              visible: {
                opacity: 1,
                transition: {
                  staggerChildren: 0.1
                }
              }
            }}
          >
            <motion.div 
              className="space-y-4"
              variants={{
                hidden: { opacity: 0, x: -20 },
                visible: { opacity: 1, x: 0 }
              }}
            >
              <h3 className="text-xl font-semibold flex items-center gap-2">
                <span className="text-2xl">🔒</span> Fully Decentralized
              </h3>
              <p className="text-gray-600 ml-8">
                No centralized authority. Smart contracts handle everything from credit assessment 
                to payment distribution automatically.
              </p>
            </motion.div>

            <motion.div 
              className="space-y-4"
              variants={{
                hidden: { opacity: 0, x: -20 },
                visible: { opacity: 1, x: 0 }
              }}
            >
              <h3 className="text-xl font-semibold flex items-center gap-2">
                <span className="text-2xl">⚡</span> Instant Settlement
              </h3>
              <p className="text-gray-600 ml-8">
                Merchants receive payments instantly from the liquidity pool. 
                No waiting days or weeks for bank settlements.
              </p>
            </motion.div>

            <motion.div 
              className="space-y-4"
              variants={{
                hidden: { opacity: 0, x: -20 },
                visible: { opacity: 1, x: 0 }
              }}
            >
              <h3 className="text-xl font-semibold flex items-center gap-2">
                <span className="text-2xl">💎</span> Collateral-Based Credit
              </h3>
              <p className="text-gray-600 ml-8">
                Users lock LP tokens as collateral to access credit. 
                The more you provide to the protocol, the more you can borrow.
              </p>
            </motion.div>

            <motion.div 
              className="space-y-4"
              variants={{
                hidden: { opacity: 0, x: -20 },
                visible: { opacity: 1, x: 0 }
              }}
            >
              <h3 className="text-xl font-semibold flex items-center gap-2">
                <span className="text-2xl">📈</span> Earn Yield
              </h3>
              <p className="text-gray-600 ml-8">
                Liquidity providers earn yield from loan interest. 
                A sustainable model that benefits all participants.
              </p>
            </motion.div>
          </motion.div>
        </div>

        {!isConnected ? (
          <motion.div 
            className="max-w-lg mx-auto mb-16"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          >
            <Card className="shadow-lg border-2 border-blue-100 bg-gradient-to-br from-white to-blue-50/30">
              <CardHeader>
                <div className="w-16 h-16 bg-gradient-to-br from-blue-100 to-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Wallet className="h-8 w-8 text-blue-600" />
                </div>
                <CardTitle className="text-center text-2xl">Get Started</CardTitle>
                <CardDescription className="text-center text-base">
                  Connect your Stellar wallet to explore the protocol
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600 text-center mb-6">
                  You'll need a Stellar wallet like Freighter to interact with the protocol. 
                  Don't have one? <a href="https://www.freighter.app/" target="_blank" rel="noopener noreferrer" className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent hover:from-blue-700 hover:to-purple-700">Get Freighter</a>
                </p>
              </CardContent>
            </Card>
          </motion.div>
        ) : null}

        {/* Participant Roles Section - Always Visible */}
        <div className="max-w-6xl mx-auto mb-16">
          <motion.h2 
            className="text-3xl font-bold text-center mb-4 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            Choose Your Role
          </motion.h2>
          <motion.p 
            className="text-center text-gray-600 mb-12 max-w-2xl mx-auto"
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            The Lumen Later protocol supports three types of participants. 
            {!isConnected && " Connect your wallet to get started."}
          </motion.p>
          
          <motion.div 
            className="grid md:grid-cols-3 gap-8"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.3 }}
            variants={{
              hidden: { opacity: 0 },
              visible: {
                opacity: 1,
                transition: {
                  staggerChildren: 0.15
                }
              }
            }}
          >
            {/* User Role */}
            <motion.div
              variants={{
                hidden: { opacity: 0, y: 20 },
                visible: { opacity: 1, y: 0 }
              }}
              whileHover={{ y: -8, transition: { duration: 0.3 } }}
            >
              <Card className="hover:shadow-xl transition-all duration-300 border-2 border-blue-100 hover:border-blue-300 bg-gradient-to-br from-white to-blue-50/30 h-full">
              <CardHeader>
                <div className="w-12 h-12 bg-gradient-to-br from-blue-100 to-blue-200 rounded-full flex items-center justify-center mb-4">
                  <CreditCard className="h-6 w-6 text-blue-600" />
                </div>
                <CardTitle className="text-xl">Users</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-gray-600">
                  Access flexible payment options for your purchases
                </p>
                <ul className="text-sm text-gray-600 space-y-2">
                  <li>✓ Buy now, pay later with USDC</li>
                  <li>✓ Use LP tokens as collateral</li>
                  <li>✓ Flexible repayment terms</li>
                  <li>✓ No hidden fees</li>
                </ul>
                {isConnected && (
                  <Button 
                    className="w-full mt-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white border-0" 
                    onClick={() => router.push('/user')}
                  >
                    Go to Dashboard
                  </Button>
                )}
              </CardContent>
              </Card>
            </motion.div>

            {/* Merchant Role */}
            <motion.div
              variants={{
                hidden: { opacity: 0, y: 20 },
                visible: { opacity: 1, y: 0 }
              }}
              whileHover={{ y: -8, transition: { duration: 0.3 } }}
            >
              <Card className="hover:shadow-xl transition-all duration-300 border-2 border-purple-100 hover:border-purple-300 bg-gradient-to-br from-white to-purple-50/30 h-full">
              <CardHeader>
                <div className="w-12 h-12 bg-gradient-to-br from-purple-100 to-purple-200 rounded-full flex items-center justify-center mb-4">
                  <Store className="h-6 w-6 text-purple-600" />
                </div>
                <CardTitle className="text-xl">Merchants</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-gray-600">
                  Offer Lumen Later to customers and get paid instantly
                </p>
                <ul className="text-sm text-gray-600 space-y-2">
                  <li>✓ Instant USDC settlement</li>
                  <li>✓ No chargeback risk</li>
                  <li>✓ Increase sales conversion</li>
                  <li>✓ Simple integration</li>
                </ul>
                {isConnected && (
                  <Button 
                    className="w-full mt-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white border-0" 
                    onClick={() => router.push('/merchant')}
                  >
                    Merchant Portal
                  </Button>
                )}
              </CardContent>
              </Card>
            </motion.div>

            {/* LP Role */}
            <motion.div
              variants={{
                hidden: { opacity: 0, y: 20 },
                visible: { opacity: 1, y: 0 }
              }}
              whileHover={{ y: -8, transition: { duration: 0.3 } }}
            >
              <Card className="hover:shadow-xl transition-all duration-300 border-2 border-indigo-100 hover:border-indigo-300 bg-gradient-to-br from-white to-indigo-50/30 h-full">
              <CardHeader>
                <div className="w-12 h-12 bg-gradient-to-br from-indigo-100 to-indigo-200 rounded-full flex items-center justify-center mb-4">
                  <Wallet className="h-6 w-6 text-indigo-600" />
                </div>
                <CardTitle className="text-xl">Liquidity Providers</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-gray-600">
                  Earn yield by providing USDC to the protocol
                </p>
                <ul className="text-sm text-gray-600 space-y-2">
                  <li>✓ Earn interest from loans</li>
                  <li>✓ LP tokens as collateral</li>
                  <li>✓ Transparent yields</li>
                  <li>✓ Withdraw anytime</li>
                </ul>
                {isConnected && (
                  <Button 
                    className="w-full mt-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white border-0" 
                    onClick={() => router.push('/lending')}
                  >
                    Start Earning
                  </Button>
                )}
              </CardContent>
              </Card>
            </motion.div>
          </motion.div>
        </div>

        {/* CTA Section */}
        <motion.div 
          className="text-center mb-16"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <motion.div 
            className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-2xl p-12 max-w-4xl mx-auto border border-blue-100"
            initial={{ y: 20 }}
            whileInView={{ y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            <h2 className="text-2xl font-bold mb-4 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">Ready to Get Started?</h2>
            <p className="text-gray-600 mb-8 max-w-2xl mx-auto">
              Join the future of decentralized finance on Stellar. 
              Whether you're a user, merchant, or liquidity provider, there's a place for you.
            </p>
            {!isConnected ? (
              <p className="text-lg font-medium bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Connect your wallet above to begin 👆
              </p>
            ) : (
              <div className="space-y-4">
                <p className="text-lg font-medium text-gray-700">
                  🎉 Wallet Connected! Choose your role above to get started.
                </p>
                <Button 
                  variant="link" 
                  onClick={() => router.push('/faucet')}
                  className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent hover:from-blue-700 hover:to-purple-700 transition-all"
                >
                  Need test tokens? Get USDC from Faucet →
                </Button>
              </div>
            )}
          </motion.div>
        </motion.div>
      </main>
    </div>
  );
}