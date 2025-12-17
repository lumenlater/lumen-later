'use client';

import { Card } from '@/components/ui/card';
import { TrendingUp, TrendingDown, Loader2 } from 'lucide-react';

export interface MetricCardProps {
  title: string;
  value: string;
  change?: number;
  icon: React.ElementType;
  prefix?: string;
  suffix?: string;
  isLoading?: boolean;
  description?: string;
}

/**
 * MetricCard Component
 *
 * Displays a single metric with optional trend indicator.
 * Reusable across admin dashboard pages.
 */
export function MetricCard({
  title,
  value,
  change,
  icon: Icon,
  prefix = '',
  suffix = '',
  isLoading = false,
  description,
}: MetricCardProps) {
  return (
    <Card className="p-6">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm text-gray-600">{title}</p>

          {isLoading ? (
            <div className="flex items-center mt-2">
              <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
            </div>
          ) : (
            <>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {prefix}{value}{suffix}
              </p>

              {description && (
                <p className="text-xs text-gray-500 mt-1">{description}</p>
              )}

              {change !== undefined && (
                <div
                  className={`flex items-center mt-2 text-sm ${
                    change >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}
                >
                  {change >= 0 ? (
                    <TrendingUp className="w-4 h-4 mr-1" />
                  ) : (
                    <TrendingDown className="w-4 h-4 mr-1" />
                  )}
                  <span>{Math.abs(change)}%</span>
                </div>
              )}
            </>
          )}
        </div>

        <div className="p-3 bg-primary-100 rounded-lg ml-4">
          <Icon className="w-6 h-6 text-primary-600" />
        </div>
      </div>
    </Card>
  );
}

/**
 * MetricCardSkeleton Component
 *
 * Loading skeleton for MetricCard.
 */
export function MetricCardSkeleton() {
  return (
    <Card className="p-6">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <div className="h-4 w-24 bg-gray-200 rounded animate-pulse" />
          <div className="h-8 w-32 bg-gray-200 rounded animate-pulse mt-2" />
          <div className="h-4 w-16 bg-gray-200 rounded animate-pulse mt-2" />
        </div>
        <div className="w-12 h-12 bg-gray-200 rounded-lg animate-pulse" />
      </div>
    </Card>
  );
}
