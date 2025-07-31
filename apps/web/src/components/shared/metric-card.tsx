import { Card, CardContent } from '@/components/ui/card';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MetricCardProps {
  title: string;
  value: string | number;
  change?: number;
  icon?: React.ElementType;
  prefix?: string;
  suffix?: string;
  trend?: 'up' | 'down' | 'neutral';
  className?: string;
}

export function MetricCard({ 
  title, 
  value, 
  change, 
  icon: Icon, 
  prefix = '', 
  suffix = '',
  trend,
  className 
}: MetricCardProps) {
  // Determine trend based on change if not explicitly provided
  const displayTrend = trend || (change !== undefined ? (change >= 0 ? 'up' : 'down') : 'neutral');
  
  return (
    <Card className={cn("hover:shadow-md transition-shadow", className)}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <p className="text-sm font-medium text-gray-600">{title}</p>
            <p className="text-2xl font-bold text-gray-900">
              {prefix}{value}{suffix}
            </p>
            {change !== undefined && (
              <div className={cn(
                "flex items-center text-sm font-medium",
                displayTrend === 'up' ? 'text-green-600' : 
                displayTrend === 'down' ? 'text-red-600' : 
                'text-gray-600'
              )}>
                {displayTrend === 'up' ? (
                  <TrendingUp className="w-4 h-4 mr-1" />
                ) : displayTrend === 'down' ? (
                  <TrendingDown className="w-4 h-4 mr-1" />
                ) : null}
                <span>{Math.abs(change)}% from last period</span>
              </div>
            )}
          </div>
          {Icon && (
            <div className="p-3 bg-gray-100 rounded-lg">
              <Icon className="w-6 h-6 text-gray-700" />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}