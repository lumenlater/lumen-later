import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { Config } from '@/constants/config';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatAmount(amount: string | number | bigint): string {
  const value = typeof amount === 'bigint' ? Number(amount) / (10 ** Config.USDC_DECIMALS) : Number(amount);
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: Config.USDC_DECIMALS,
  }).format(value);
}

export function formatPercentage(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'percent',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value / 100);
}