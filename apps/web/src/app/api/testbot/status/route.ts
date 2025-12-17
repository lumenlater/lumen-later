import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

/**
 * GET /api/testbot/status
 *
 * Get the current testnet bot status from MongoDB.
 */
export async function GET() {
  try {
    // Fetch bot state from MongoDB
    const botState = await prisma.botState.findUnique({
      where: { id: 'current' },
    });

    // Fetch recent activity
    const recentActivity = await prisma.botActivity.findMany({
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    if (!botState) {
      // Return default state if no state exists
      return NextResponse.json({
        success: true,
        data: {
          isRunning: false,
          startedAt: null,
          dailyStats: {
            date: new Date().toISOString().split('T')[0],
            txCount: 0,
            successCount: 0,
            failureCount: 0,
            scenarios: {},
          },
          goals: {
            tvl: { current: 0, target: 50000, percentage: 0 },
            merchants: { current: 0, target: 10, percentage: 0 },
            users: { current: 0, target: 20, percentage: 0 },
            dailyTx: { current: 0, target: 50, percentage: 0 },
          },
          recentActivity: [],
        },
      });
    }

    // Transform MongoDB data to API response
    const response = {
      isRunning: botState.isRunning,
      startedAt: botState.startedAt?.toISOString() || null,
      dailyStats: {
        date: botState.dailyStatsDate,
        txCount: botState.dailyTxCount,
        successCount: botState.dailySuccessCount,
        failureCount: botState.dailyFailureCount,
        scenarios: botState.dailyScenarios as Record<string, number>,
      },
      goals: botState.goalProgress as {
        tvl: { current: number; target: number; percentage: number };
        merchants: { current: number; target: number; percentage: number };
        users: { current: number; target: number; percentage: number };
        dailyTx: { current: number; target: number; percentage: number };
      },
      recentActivity: recentActivity.map((a) => ({
        timestamp: a.createdAt.toISOString(),
        scenario: a.scenario,
        success: a.success,
        details: a.details as Record<string, any> | undefined,
        error: a.error || undefined,
      })),
    };

    return NextResponse.json({
      success: true,
      data: response,
    });
  } catch (error) {
    console.error('Error fetching testbot status:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch bot status' },
      { status: 500 }
    );
  }
}
