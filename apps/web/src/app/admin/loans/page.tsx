'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertCircle, Search, Filter, ChevronDown, Eye, Zap } from 'lucide-react';
import { Input } from '@/components/ui/input';

interface Loan {
  id: string;
  borrower: string;
  amount: string;
  collateral: string;
  status: 'active' | 'overdue' | 'liquidatable';
  dueDate: string;
  installmentsPaid: number;
  totalInstallments: number;
}

const mockLoans: Loan[] = [
  {
    id: '1',
    borrower: 'GXXX...XXXX',
    amount: '1,000',
    collateral: '1,500',
    status: 'active',
    dueDate: '2024-02-15',
    installmentsPaid: 1,
    totalInstallments: 3,
  },
  {
    id: '2',
    borrower: 'GYYY...YYYY',
    amount: '2,500',
    collateral: '3,750',
    status: 'overdue',
    dueDate: '2024-01-20',
    installmentsPaid: 0,
    totalInstallments: 6,
  },
  {
    id: '3',
    borrower: 'GZZZ...ZZZZ',
    amount: '5,000',
    collateral: '7,500',
    status: 'liquidatable',
    dueDate: '2023-12-15',
    installmentsPaid: 0,
    totalInstallments: 12,
  },
];

function StatusBadge({ status }: { status: Loan['status'] }) {
  const styles = {
    active: 'bg-green-100 text-green-700',
    overdue: 'bg-yellow-100 text-yellow-700',
    liquidatable: 'bg-red-100 text-red-700',
  };

  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status]}`}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

export default function LoansManagement() {
  const [loans, setLoans] = useState<Loan[]>(mockLoans);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | Loan['status']>('all');

  const filteredLoans = loans.filter(loan => {
    const matchesSearch = loan.borrower.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         loan.id.includes(searchTerm);
    const matchesFilter = filterStatus === 'all' || loan.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  const handleLiquidate = async (loanId: string) => {
    // TODO: Call smart contract to liquidate loan
    console.log('Liquidating loan:', loanId);
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Loan Management</h1>
        <p className="text-gray-600 mt-1">Monitor and manage active loans</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card className="p-6">
          <p className="text-sm text-gray-600">Total Active Loans</p>
          <p className="text-2xl font-bold text-gray-900">42</p>
        </Card>
        <Card className="p-6">
          <p className="text-sm text-gray-600">Total Value Locked</p>
          <p className="text-2xl font-bold text-gray-900">$817,111</p>
        </Card>
        <Card className="p-6">
          <p className="text-sm text-gray-600">Overdue Loans</p>
          <p className="text-2xl font-bold text-yellow-600">5</p>
        </Card>
        <Card className="p-6">
          <p className="text-sm text-gray-600">Default Rate</p>
          <p className="text-2xl font-bold text-red-600">2.1%</p>
        </Card>
      </div>

      {/* Alerts */}
      <Card className="p-4 mb-8 border-yellow-200 bg-yellow-50">
        <div className="flex items-center">
          <AlertCircle className="w-5 h-5 text-yellow-600 mr-3" />
          <div>
            <p className="font-medium text-yellow-800">Action Required</p>
            <p className="text-sm text-yellow-700">
              3 loans are eligible for liquidation. Review and take action to protect the protocol.
            </p>
          </div>
        </div>
      </Card>

      {/* Loans Table */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900">Active Loans</h2>
          <div className="flex items-center space-x-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                type="text"
                placeholder="Search loans..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 w-64"
              />
            </div>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as any)}
              className="px-4 py-2 border border-gray-200 rounded-lg text-sm"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="overdue">Overdue</option>
              <option value="liquidatable">Liquidatable</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Loan ID</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Borrower</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Amount</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Collateral</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Progress</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Status</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Due Date</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredLoans.map((loan) => (
                <tr key={loan.id} className="border-b hover:bg-gray-50">
                  <td className="py-3 px-4 text-sm">#{loan.id}</td>
                  <td className="py-3 px-4 text-sm font-mono">{loan.borrower}</td>
                  <td className="py-3 px-4 text-sm">${loan.amount} USDC</td>
                  <td className="py-3 px-4 text-sm">${loan.collateral} LP</td>
                  <td className="py-3 px-4 text-sm">
                    <div className="flex items-center">
                      <div className="w-24 bg-gray-200 rounded-full h-2 mr-2">
                        <div
                          className="bg-primary-600 h-2 rounded-full"
                          style={{
                            width: `${(loan.installmentsPaid / loan.totalInstallments) * 100}%`,
                          }}
                        />
                      </div>
                      <span className="text-xs text-gray-600">
                        {loan.installmentsPaid}/{loan.totalInstallments}
                      </span>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <StatusBadge status={loan.status} />
                  </td>
                  <td className="py-3 px-4 text-sm">{loan.dueDate}</td>
                  <td className="py-3 px-4">
                    <div className="flex items-center space-x-2">
                      <Button size="sm" variant="outline" className="p-1">
                        <Eye className="w-4 h-4" />
                      </Button>
                      {loan.status === 'liquidatable' && (
                        <Button
                          size="sm"
                          variant="destructive"
                          className="p-1"
                          onClick={() => handleLiquidate(loan.id)}
                        >
                          <Zap className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}