import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import type { 
  BusinessInfo, 
  ContactInfo, 
  KYBDocuments, 
  BankingInfo 
} from '@/types/merchant';

// GET /api/merchant/applications
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const applicantAddress = searchParams.get('applicantAddress');
    const contractId = searchParams.get('contractId');
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '10');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Get single application by applicant and contract
    if (applicantAddress && contractId) {
      const application = await prisma.merchantApplication.findUnique({
        where: {
          applicantAddress_contractId: {
            applicantAddress,
            contractId,
          },
        },
      });

      if (!application) {
        return NextResponse.json({ error: 'Application not found' }, { status: 404 });
      }

      return NextResponse.json(application);
    }

    // Get all applications with filters
    const where: any = {};
    if (contractId) where.contractId = contractId;
    if (status) where.status = status;
    if (applicantAddress) where.applicantAddress = applicantAddress;

    const [applications, total] = await Promise.all([
      prisma.merchantApplication.findMany({
        where,
        take: limit,
        skip: offset,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.merchantApplication.count({ where }),
    ]);

    return NextResponse.json({
      applications,
      total,
      limit,
      offset,
    });
  } catch (error) {
    console.error('Error fetching applications:', error);
    return NextResponse.json(
      { error: 'Failed to fetch applications' },
      { status: 500 }
    );
  }
}

// POST /api/merchant/applications
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      applicantAddress,
      contractId,
      businessInfo,
      contactInfo,
      documents,
      bankingInfo,
    } = body;

    // Validate required fields
    if (!applicantAddress || !contractId || !businessInfo || !contactInfo || !documents || !bankingInfo) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Check if application already exists
    const existing = await prisma.merchantApplication.findUnique({
      where: {
        applicantAddress_contractId: {
          applicantAddress,
          contractId,
        },
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: 'Application already exists' },
        { status: 409 }
      );
    }

    // Transform documents to ensure uploadedAt is a proper Date
    const transformDocument = (doc: any) => {
      if (!doc) return doc;
      
      let uploadedAt;
      if (doc.uploadedAt instanceof Date) {
        uploadedAt = doc.uploadedAt;
      } else if (typeof doc.uploadedAt === 'string') {
        const parsed = new Date(doc.uploadedAt);
        // Check if the parsed date is valid and reasonable (not in far future/past)
        const now = new Date();
        const oneYearAgo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
        const oneYearFromNow = new Date(now.getFullYear() + 1, now.getMonth(), now.getDate());
        
        if (!isNaN(parsed.getTime()) && parsed >= oneYearAgo && parsed <= oneYearFromNow) {
          uploadedAt = parsed;
        } else {
          uploadedAt = new Date();
        }
      } else if (typeof doc.uploadedAt === 'number') {
        // Check if it's already in milliseconds or needs conversion from seconds
        const timestamp = doc.uploadedAt > 9999999999 ? doc.uploadedAt : doc.uploadedAt * 1000;
        const parsed = new Date(timestamp);
        
        // Validate the timestamp is reasonable
        const now = new Date();
        const oneYearAgo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
        const oneYearFromNow = new Date(now.getFullYear() + 1, now.getMonth(), now.getDate());
        
        if (!isNaN(parsed.getTime()) && parsed >= oneYearAgo && parsed <= oneYearFromNow) {
          uploadedAt = parsed;
        } else {
          uploadedAt = new Date();
        }
      } else {
        uploadedAt = new Date(); // Default to current date
      }
      
      // Final validation
      if (isNaN(uploadedAt.getTime()) || uploadedAt.getFullYear() > 9999) {
        uploadedAt = new Date(); // Use current date if invalid
      }
      
      return {
        ...doc,
        uploadedAt
      };
    };

    const transformedDocuments = {
      businessRegistration: transformDocument(documents.businessRegistration),
      taxCertificate: transformDocument(documents.taxCertificate),
      bankStatement: transformDocument(documents.bankStatement),
      utilityBill: transformDocument(documents.utilityBill),
      additionalDocs: documents.additionalDocs.map(transformDocument),
    };

    // Create new application with proper Prisma embedded document syntax
    const application = await prisma.merchantApplication.create({
      data: {
        applicantAddress,
        contractId,
        status: 'SUBMITTED',
        businessInfo: {
          set: businessInfo
        },
        contactInfo: {
          set: contactInfo
        },
        documents: {
          set: transformedDocuments
        },
        bankingInfo: {
          set: bankingInfo
        },
      },
    });

    return NextResponse.json({
      mongoId: application.id,
      blockchainId: application.id, // This will be stored on blockchain
      application,
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating application:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to create application', details: errorMessage },
      { status: 500 }
    );
  }
}

// PATCH /api/merchant/applications
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { mongoId, ...updateData } = body;

    if (!mongoId) {
      return NextResponse.json(
        { error: 'Missing mongoId' },
        { status: 400 }
      );
    }

    const application = await prisma.merchantApplication.update({
      where: { id: mongoId },
      data: updateData,
    });

    return NextResponse.json(application);
  } catch (error) {
    console.error('Error updating application:', error);
    return NextResponse.json(
      { error: 'Failed to update application' },
      { status: 500 }
    );
  }
}