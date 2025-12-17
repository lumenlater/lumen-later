import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

/**
 * POST /api/testbot/control
 *
 * Control the testnet bot (start, stop, pause, resume).
 *
 * Note: This updates the state in MongoDB. The actual bot
 * running via PM2 will need to poll this state to respond.
 *
 * Request body:
 * {
 *   action: 'start' | 'stop' | 'pause' | 'resume'
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;

    if (!action || !['start', 'stop', 'pause', 'resume'].includes(action)) {
      return NextResponse.json(
        { success: false, error: 'Invalid action. Use start, stop, pause, or resume.' },
        { status: 400 }
      );
    }

    const now = new Date();
    const today = now.toISOString().split('T')[0];

    // Update bot state based on action
    let updateData: any = {};

    switch (action) {
      case 'start':
        updateData = {
          isRunning: true,
          startedAt: now,
        };
        break;
      case 'stop':
        updateData = {
          isRunning: false,
          stoppedAt: now,
        };
        break;
      case 'pause':
        // Pause keeps isRunning true but the bot should check for pause state
        updateData = {
          isRunning: false,
        };
        break;
      case 'resume':
        updateData = {
          isRunning: true,
        };
        break;
    }

    // Upsert bot state
    await prisma.botState.upsert({
      where: { id: 'current' },
      create: {
        id: 'current',
        ...updateData,
        dailyStatsDate: today,
        dailyTxCount: 0,
        dailySuccessCount: 0,
        dailyFailureCount: 0,
        dailyScenarios: {},
        accountPool: {},
        goalProgress: {
          tvl: { current: 0, target: 50000, percentage: 0 },
          merchants: { current: 0, target: 10, percentage: 0 },
          users: { current: 0, target: 20, percentage: 0 },
          dailyTx: { current: 0, target: 50, percentage: 0 },
        },
      },
      update: updateData,
    });

    // Log the control action
    await prisma.botActivity.create({
      data: {
        date: today,
        scenario: `control-${action}`,
        success: true,
        details: { action, timestamp: now.toISOString() },
      },
    });

    return NextResponse.json({
      success: true,
      message: `Bot ${action} command sent`,
      action,
    });
  } catch (error) {
    console.error('Error controlling testbot:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to control bot' },
      { status: 500 }
    );
  }
}
