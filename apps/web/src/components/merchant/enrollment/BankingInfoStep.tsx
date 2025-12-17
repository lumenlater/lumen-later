'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { BankingInfo } from '@/types/merchant';
import { ArrowLeft, ArrowRight, Shield, Info } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { generateBankingInfo } from '@lumenlater/shared';

interface BankingInfoStepProps {
  initialData?: BankingInfo;
  onNext: (data: BankingInfo) => void;
  onBack: () => void;
}

export function BankingInfoStep({ initialData, onNext, onBack }: BankingInfoStepProps) {
  const [bankingInfo, setBankingInfo] = useState<BankingInfo>(
    initialData || {
      accountName: '',
      accountNumber: '',
      routingNumber: '',
      bankName: '',
      swiftCode: '',
    }
  );

  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateRoutingNumber = (routing: string): boolean => {
    // US routing number validation (9 digits)
    return /^\d{9}$/.test(routing);
  };

  const validateAccountNumber = (account: string): boolean => {
    // Basic account number validation (5-17 digits)
    return /^\d{5,17}$/.test(account);
  };

  const validateSwiftCode = (swift: string): boolean => {
    // SWIFT code validation (8 or 11 characters)
    return /^[A-Z]{6}[A-Z0-9]{2}([A-Z0-9]{3})?$/.test(swift);
  };

  const handleSubmit = () => {
    const newErrors: Record<string, string> = {};

    // Validate required fields
    if (!bankingInfo.accountName.trim()) {
      newErrors.accountName = 'Account name is required';
    }

    if (!bankingInfo.accountNumber) {
      newErrors.accountNumber = 'Account number is required';
    } else if (!validateAccountNumber(bankingInfo.accountNumber)) {
      newErrors.accountNumber = 'Invalid account number format';
    }

    if (!bankingInfo.routingNumber) {
      newErrors.routingNumber = 'Routing number is required';
    } else if (!validateRoutingNumber(bankingInfo.routingNumber)) {
      newErrors.routingNumber = 'Routing number must be 9 digits';
    }

    if (!bankingInfo.bankName.trim()) {
      newErrors.bankName = 'Bank name is required';
    }

    // Validate optional SWIFT code if provided
    if (bankingInfo.swiftCode && !validateSwiftCode(bankingInfo.swiftCode)) {
      newErrors.swiftCode = 'Invalid SWIFT code format';
    }

    setErrors(newErrors);

    if (Object.keys(newErrors).length === 0) {
      onNext(bankingInfo);
    }
  };

  const updateField = (field: keyof BankingInfo, value: string) => {
    setBankingInfo(prev => ({
      ...prev,
      [field]: value,
    }));
    // Clear error when user starts typing
    setErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[field];
      return newErrors;
    });
  };

  const formatAccountNumber = (value: string): string => {
    // Remove non-digits and limit length
    return value.replace(/\D/g, '').slice(0, 17);
  };

  const formatRoutingNumber = (value: string): string => {
    // Remove non-digits and limit to 9 digits
    return value.replace(/\D/g, '').slice(0, 9);
  };

  const formatSwiftCode = (value: string): string => {
    // Convert to uppercase and remove invalid characters
    return value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 11);
  };

  const handleAutofill = () => {
    const testData = generateBankingInfo();
    setBankingInfo(testData as BankingInfo);
    setErrors({});
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle>Banking Information</CardTitle>
            <CardDescription>
              Provide your banking details for receiving payments. All information is encrypted and secure.
            </CardDescription>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleAutofill}
            className="flex items-center gap-2"
          >
            <span>🎲</span> Autofill Test Data
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Security Notice */}
          <Alert>
            <Shield className="h-4 w-4" />
            <AlertDescription>
              Your banking information is encrypted and stored securely. We use bank-level security to protect your data.
            </AlertDescription>
          </Alert>

          {/* Account Name */}
          <div>
            <Label htmlFor="accountName">Account Name</Label>
            <Input
              id="accountName"
              value={bankingInfo.accountName}
              onChange={(e) => updateField('accountName', e.target.value)}
              placeholder="Business Name on Bank Account"
              className={errors.accountName ? 'border-red-500' : ''}
            />
            {errors.accountName && (
              <p className="text-sm text-red-500 mt-1">{errors.accountName}</p>
            )}
            <p className="text-sm text-gray-500 mt-1">
              This should match the name on your bank account
            </p>
          </div>

          {/* Bank Name */}
          <div>
            <Label htmlFor="bankName">Bank Name</Label>
            <Input
              id="bankName"
              value={bankingInfo.bankName}
              onChange={(e) => updateField('bankName', e.target.value)}
              placeholder="e.g., Chase Bank, Bank of America"
              className={errors.bankName ? 'border-red-500' : ''}
            />
            {errors.bankName && (
              <p className="text-sm text-red-500 mt-1">{errors.bankName}</p>
            )}
          </div>

          {/* Account and Routing Numbers */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="accountNumber">Account Number</Label>
              <Input
                id="accountNumber"
                type="text"
                value={bankingInfo.accountNumber}
                onChange={(e) => updateField('accountNumber', formatAccountNumber(e.target.value))}
                placeholder="Account Number"
                className={errors.accountNumber ? 'border-red-500' : ''}
                autoComplete="off"
              />
              {errors.accountNumber && (
                <p className="text-sm text-red-500 mt-1">{errors.accountNumber}</p>
              )}
            </div>

            <div>
              <Label htmlFor="routingNumber">Routing Number</Label>
              <Input
                id="routingNumber"
                type="text"
                value={bankingInfo.routingNumber}
                onChange={(e) => updateField('routingNumber', formatRoutingNumber(e.target.value))}
                placeholder="9 digits"
                className={errors.routingNumber ? 'border-red-500' : ''}
                autoComplete="off"
              />
              {errors.routingNumber && (
                <p className="text-sm text-red-500 mt-1">{errors.routingNumber}</p>
              )}
            </div>
          </div>

          {/* Routing Number Help */}
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              Your routing number is a 9-digit code that identifies your bank. It's usually found at the bottom left of your checks.
            </AlertDescription>
          </Alert>

          {/* SWIFT Code (Optional) */}
          <div>
            <Label htmlFor="swiftCode">
              SWIFT/BIC Code (Optional)
              <span className="text-sm text-gray-500 ml-2">For international transfers</span>
            </Label>
            <Input
              id="swiftCode"
              value={bankingInfo.swiftCode || ''}
              onChange={(e) => updateField('swiftCode', formatSwiftCode(e.target.value))}
              placeholder="e.g., CHASUS33"
              className={errors.swiftCode ? 'border-red-500' : ''}
            />
            {errors.swiftCode && (
              <p className="text-sm text-red-500 mt-1">{errors.swiftCode}</p>
            )}
            <p className="text-sm text-gray-500 mt-1">
              8 or 11 characters. Only needed for international wire transfers.
            </p>
          </div>

          {/* Navigation */}
          <div className="flex justify-between pt-6">
            <Button variant="outline" onClick={onBack}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <Button onClick={handleSubmit}>
              Next
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}