'use client';

import { Card } from '@/components/ui/card';
import {
  FileText,
  CreditCard,
  CheckCircle,
  Users,
  ArrowDownCircle,
  ArrowUpCircle,
  ExternalLink,
} from 'lucide-react';
import type { RecentActivity } from '@/hooks/api/use-admin-dashboard';

interface RecentActivityListProps {
  activities: RecentActivity[];
  isLoading?: boolean;
  showViewAll?: boolean;
  onViewAll?: () => void;
}

const activityIcons: Record<RecentActivity['type'], React.ElementType> = {
  bill_created: FileText,
  bill_paid: CreditCard,
  bill_repaid: CheckCircle,
  merchant_enrolled: Users,
  deposit: ArrowDownCircle,
  withdraw: ArrowUpCircle,
};

const activityColors: Record<RecentActivity['type'], string> = {
  bill_created: 'text-blue-600',
  bill_paid: 'text-yellow-600',
  bill_repaid: 'text-green-600',
  merchant_enrolled: 'text-purple-600',
  deposit: 'text-green-600',
  withdraw: 'text-orange-600',
};

/**
 * Format relative time from timestamp
 */
function formatRelativeTime(timestamp: string): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} min ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

/**
 * RecentActivityList Component
 *
 * Displays a list of recent protocol activities.
 * Reusable across admin pages.
 */
export function RecentActivityList({
  activities,
  isLoading = false,
  showViewAll = false,
  onViewAll,
}: RecentActivityListProps) {
  if (isLoading) {
    return (
      <Card className="p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Recent Activity</h2>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center justify-between py-3 border-b last:border-0">
              <div className="flex-1">
                <div className="h-4 w-32 bg-gray-200 rounded animate-pulse" />
                <div className="h-3 w-48 bg-gray-200 rounded animate-pulse mt-2" />
              </div>
              <div className="h-3 w-20 bg-gray-200 rounded animate-pulse" />
            </div>
          ))}
        </div>
      </Card>
    );
  }

  if (activities.length === 0) {
    return (
      <Card className="p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Recent Activity</h2>
        <p className="text-gray-500 text-center py-8">No recent activity</p>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-gray-900">Recent Activity</h2>
        {showViewAll && onViewAll && (
          <button
            onClick={onViewAll}
            className="text-sm text-primary-600 hover:text-primary-700 font-medium"
          >
            View all →
          </button>
        )}
      </div>

      <div className="space-y-1">
        {activities.map((activity, index) => {
          const Icon = activityIcons[activity.type];
          const colorClass = activityColors[activity.type];

          return (
            <div
              key={activity.id}
              className={`flex items-center justify-between py-3 ${
                index < activities.length - 1 ? 'border-b' : ''
              }`}
            >
              <div className="flex items-start gap-3">
                <div className={`p-1.5 rounded-full bg-gray-100 ${colorClass}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">{activity.title}</p>
                  <p className="text-sm text-gray-600">{activity.description}</p>
                </div>
              </div>

              <div className="flex items-center gap-2 text-sm text-gray-500">
                <span>{formatRelativeTime(activity.timestamp)}</span>
                {activity.txHash && (
                  <a
                    href={`https://stellar.expert/explorer/testnet/tx/${activity.txHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-gray-400 hover:text-gray-600"
                    title="View transaction"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
