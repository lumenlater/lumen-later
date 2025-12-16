'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useWallet } from '@/hooks/web3/use-wallet';
import { LayoutDashboard, Droplets, FileText, Store, Settings, Activity } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { isAdminWallet } from '@/config/admin';

interface NavItemProps {
  href: string;
  icon: React.ElementType;
  label: string;
}

function NavItem({ href, icon: Icon, label }: NavItemProps) {
  const pathname = usePathname();
  const isActive = pathname === href;

  return (
    <Link
      href={href}
      className={`flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors ${
        isActive
          ? 'bg-primary-100 text-primary-700'
          : 'text-gray-600 hover:bg-gray-100'
      }`}
    >
      <Icon className="w-5 h-5" />
      <span className="font-medium">{label}</span>
    </Link>
  );
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { publicKey, isConnected } = useWallet();
  const router = useRouter();

  const isAdmin = isAdminWallet(publicKey);

  useEffect(() => {
    if (!isConnected) {
      router.push('/');
      return;
    }

    if (publicKey && !isAdmin) {
      router.push('/');
    }
  }, [isConnected, publicKey, isAdmin, router]);

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
          <p className="text-gray-600">You don't have permission to access this page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-white shadow-md">
        <div className="p-6">
          <h2 className="text-xl font-bold text-gray-900">Admin Panel</h2>
          <p className="text-sm text-gray-600 mt-1">Lumen Later</p>
        </div>
        
        <nav className="px-4 pb-6 space-y-1">
          <NavItem href="/admin" icon={LayoutDashboard} label="Dashboard" />
          <NavItem href="/admin/liquidity" icon={Droplets} label="Liquidity" />
          <NavItem href="/admin/loans" icon={FileText} label="Loans" />
          <NavItem href="/admin/merchants" icon={Store} label="Merchants" />
          <NavItem href="/admin/activity" icon={Activity} label="Activity" />
          <NavItem href="/admin/settings" icon={Settings} label="Settings" />
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1">
        <div className="p-8">
          {children}
        </div>
      </main>
    </div>
  );
}