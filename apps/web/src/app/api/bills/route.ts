import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/bills - Get bills for a user or merchant
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const merchantAddress = searchParams.get('merchantAddress');
    const userAddress = searchParams.get('userAddress');
    const contractId = searchParams.get('contractId');
    const billId = searchParams.get('id');

    // Get single bill by ID
    if (billId) {
      const bill = await prisma.bill.findUnique({
        where: { id: billId },
      });

      if (!bill) {
        return NextResponse.json(
          { error: 'Bill not found' },
          { status: 404 }
        );
      }

      return NextResponse.json(bill);
    }

    // Get bills by merchant or user (optionally filtered by contractId)
    const where = {
      ...(merchantAddress && { merchantAddress }),
      ...(userAddress && { userAddress }),
      ...(contractId && { contractId }),
    };

    const bills = await prisma.bill.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(bills);
  } catch (error) {
    console.error('Error fetching bills:', error);
    return NextResponse.json(
      { error: 'Failed to fetch bills' },
      { status: 500 }
    );
  }
}

// POST /api/bills - Create a new bill
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { contractId, merchantAddress, userAddress, amount, description, merchantName } = body;

    // Validate required fields
    if (!contractId || !merchantAddress || !userAddress || !amount || !description || !merchantName) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Create bill in database
    const bill = await prisma.bill.create({
      data: {
        contractId,
        merchantAddress,
        userAddress,
        amount,
        description,
        merchantName,
      },
    });

    return NextResponse.json(bill);
  } catch (error) {
    console.error('Error creating bill:', error);
    return NextResponse.json(
      { error: 'Failed to create bill' },
      { status: 500 }
    );
  }
}

// PATCH /api/bills - Update a bill (mainly for onChainBillId)
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, onChainBillId } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Bill ID is required' },
        { status: 400 }
      );
    }

    const bill = await prisma.bill.update({
      where: { id },
      data: { onChainBillId },
    });

    return NextResponse.json(bill);
  } catch (error) {
    console.error('Error updating bill:', error);
    return NextResponse.json(
      { error: 'Failed to update bill' },
      { status: 500 }
    );
  }
}