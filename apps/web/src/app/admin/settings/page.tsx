'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Shield, Percent, Clock, AlertCircle, Save } from 'lucide-react';
import { ADMIN_WALLETS } from '@/config/admin';

export default function SystemSettings() {
  const [settings, setSettings] = useState({
    interestRate: '0',
    lateFeeRate: '10',
    collateralRatio: '150',
    liquidationBonus: '5',
    minLoanAmount: '100',
    maxLoanAmount: '10000',
    gracePeriodDays: '7',
  });

  const [adminWallets, setAdminWallets] = useState([...ADMIN_WALLETS]);

  const [newAdminWallet, setNewAdminWallet] = useState('');

  const handleSettingChange = (key: string, value: string) => {
    setSettings({ ...settings, [key]: value });
  };

  const handleSaveSettings = async () => {
    // TODO: Call smart contracts to update settings
    console.log('Saving settings:', settings);
  };

  const handleAddAdmin = () => {
    if (newAdminWallet && !adminWallets.includes(newAdminWallet)) {
      setAdminWallets([...adminWallets, newAdminWallet]);
      setNewAdminWallet('');
      // TODO: Call smart contract to add admin
    }
  };

  const handleRemoveAdmin = (wallet: string) => {
    setAdminWallets(adminWallets.filter(w => w !== wallet));
    // TODO: Call smart contract to remove admin
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">System Settings</h1>
        <p className="text-gray-600 mt-1">Configure protocol parameters and admin access</p>
      </div>

      {/* Interest and Fee Settings */}
      <Card className="p-6 mb-8">
        <div className="flex items-center mb-4">
          <Percent className="w-5 h-5 text-gray-600 mr-2" />
          <h2 className="text-xl font-semibold text-gray-900">Interest & Fee Configuration</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Base Interest Rate (%)
            </label>
            <Input
              type="number"
              min="0"
              max="100"
              step="0.1"
              value={settings.interestRate}
              onChange={(e) => handleSettingChange('interestRate', e.target.value)}
            />
            <p className="text-sm text-gray-600 mt-1">
              Applied to on-time payments (currently 0% for Lumen Later)
            </p>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Late Fee Rate (% APR)
            </label>
            <Input
              type="number"
              min="0"
              max="100"
              step="0.1"
              value={settings.lateFeeRate}
              onChange={(e) => handleSettingChange('lateFeeRate', e.target.value)}
            />
            <p className="text-sm text-gray-600 mt-1">
              Annual rate applied to overdue amounts
            </p>
          </div>
        </div>
      </Card>

      {/* Risk Parameters */}
      <Card className="p-6 mb-8">
        <div className="flex items-center mb-4">
          <Shield className="w-5 h-5 text-gray-600 mr-2" />
          <h2 className="text-xl font-semibold text-gray-900">Risk Parameters</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Collateral Ratio (%)
            </label>
            <Input
              type="number"
              min="100"
              max="300"
              step="5"
              value={settings.collateralRatio}
              onChange={(e) => handleSettingChange('collateralRatio', e.target.value)}
            />
            <p className="text-sm text-gray-600 mt-1">
              Required collateral as percentage of loan
            </p>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Liquidation Bonus (%)
            </label>
            <Input
              type="number"
              min="0"
              max="20"
              step="0.5"
              value={settings.liquidationBonus}
              onChange={(e) => handleSettingChange('liquidationBonus', e.target.value)}
            />
            <p className="text-sm text-gray-600 mt-1">
              Bonus for liquidators
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Grace Period (days)
            </label>
            <Input
              type="number"
              min="0"
              max="30"
              value={settings.gracePeriodDays}
              onChange={(e) => handleSettingChange('gracePeriodDays', e.target.value)}
            />
            <p className="text-sm text-gray-600 mt-1">
              Days before late fees apply
            </p>
          </div>
        </div>
      </Card>

      {/* Loan Limits */}
      <Card className="p-6 mb-8">
        <div className="flex items-center mb-4">
          <Clock className="w-5 h-5 text-gray-600 mr-2" />
          <h2 className="text-xl font-semibold text-gray-900">Loan Limits</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Minimum Loan Amount (USDC)
            </label>
            <Input
              type="number"
              min="0"
              value={settings.minLoanAmount}
              onChange={(e) => handleSettingChange('minLoanAmount', e.target.value)}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Maximum Loan Amount (USDC)
            </label>
            <Input
              type="number"
              min="0"
              value={settings.maxLoanAmount}
              onChange={(e) => handleSettingChange('maxLoanAmount', e.target.value)}
            />
          </div>
        </div>
      </Card>

      {/* Admin Management */}
      <Card className="p-6 mb-8">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <Shield className="w-5 h-5 text-gray-600 mr-2" />
            <h2 className="text-xl font-semibold text-gray-900">Admin Management</h2>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.location.href = '/admin/settings/admins'}
          >
            Manage Admins
          </Button>
        </div>
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
          <div className="flex items-center">
            <AlertCircle className="w-4 h-4 text-yellow-600 mr-2" />
            <p className="text-sm text-yellow-800">
              Be careful when modifying admin access. You could lock yourself out.
            </p>
          </div>
        </div>
        
        <div className="space-y-4">
          {adminWallets.map((wallet, index) => (
            <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span className="font-mono text-sm">{wallet}</span>
              <Button
                size="sm"
                variant="outline"
                className="text-red-600 hover:text-red-700"
                onClick={() => handleRemoveAdmin(wallet)}
                disabled={adminWallets.length === 1}
              >
                Remove
              </Button>
            </div>
          ))}
        </div>
        
        <div className="flex space-x-2 mt-4">
          <Input
            type="text"
            placeholder="Stellar address (G...)"
            value={newAdminWallet}
            onChange={(e) => setNewAdminWallet(e.target.value)}
          />
          <Button onClick={handleAddAdmin}>
            Add Admin
          </Button>
        </div>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button
          onClick={handleSaveSettings}
          size="lg"
          className="flex items-center space-x-2"
        >
          <Save className="w-4 h-4" />
          <span>Save All Settings</span>
        </Button>
      </div>
    </div>
  );
}