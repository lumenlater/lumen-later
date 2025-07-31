import { PrismaClient, MerchantApplication, ApplicationStatus, Prisma } from '@prisma/client';
import type { 
  BusinessInfo, 
  ContactInfo, 
  KYBDocuments, 
  BankingInfo 
} from '@/types/merchant';

export class MerchantApplicationService {
  private prisma: PrismaClient;
  
  constructor(prisma?: PrismaClient) {
    this.prisma = prisma || new PrismaClient();
  }

  /**
   * Create a new merchant application in MongoDB
   * Returns the MongoDB ObjectID to be stored on blockchain
   */
  async createApplication(
    applicantAddress: string,
    contractId: string,
    businessInfo: BusinessInfo,
    contactInfo: ContactInfo,
    documents: KYBDocuments,
    bankingInfo: BankingInfo
  ): Promise<{ mongoId: string; blockchainId: string }> {
    const application = await this.prisma.merchantApplication.create({
      data: {
        applicantAddress,
        contractId,
        status: ApplicationStatus.SUBMITTED,
        businessInfo: businessInfo as any,
        contactInfo: contactInfo as any,
        documents: documents as any,
        bankingInfo: bankingInfo as any,
      },
    });

    // The MongoDB _id is what we'll store on blockchain
    return {
      mongoId: application.id,
      blockchainId: application.id, // This will be stored on blockchain
    };
  }

  /**
   * Update blockchain reference after successful blockchain commit
   */
  async updateBlockchainReference(
    mongoId: string,
    txHash: string
  ): Promise<void> {
    await this.prisma.merchantApplication.update({
      where: { id: mongoId },
      data: {
        blockchainId: mongoId, // Store the MongoDB ID as blockchain reference
        blockchainTxHash: txHash,
        isBlockchainCommitted: true,
        lastBlockchainAttempt: new Date(),
      },
    });
  }

  /**
   * Get application by applicant address and contract ID
   */
  async getApplicationByApplicant(
    applicantAddress: string,
    contractId: string
  ): Promise<MerchantApplication | null> {
    return this.prisma.merchantApplication.findUnique({
      where: {
        applicantAddress_contractId: {
          applicantAddress,
          contractId,
        },
      },
    });
  }

  /**
   * Get application by MongoDB ID (for blockchain lookups)
   */
  async getApplicationById(mongoId: string): Promise<MerchantApplication | null> {
    return this.prisma.merchantApplication.findUnique({
      where: { id: mongoId },
    });
  }

  /**
   * Get all applications for a specific contract
   */
  async getApplicationsByContract(
    contractId: string,
    filters?: {
      status?: ApplicationStatus;
      search?: string;
      limit?: number;
      offset?: number;
    }
  ): Promise<{ applications: MerchantApplication[]; total: number }> {
    const where: Prisma.MerchantApplicationWhereInput = {
      contractId,
      ...(filters?.status && { status: filters.status }),
      ...(filters?.search && {
        OR: [
          { businessInfo: { path: '$.legalName', string_contains: filters.search } },
          { businessInfo: { path: '$.tradingName', string_contains: filters.search } },
          { contactInfo: { path: '$.primaryContact.email', string_contains: filters.search } },
        ],
      }),
    };

    const [applications, total] = await Promise.all([
      this.prisma.merchantApplication.findMany({
        where,
        take: filters?.limit,
        skip: filters?.offset,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.merchantApplication.count({ where }),
    ]);

    return { applications, total };
  }

  /**
   * Update application status (for admin review)
   */
  async updateApplicationStatus(
    mongoId: string,
    status: ApplicationStatus,
    reviewedBy: string,
    rejectionReason?: string,
    riskScore?: number
  ): Promise<MerchantApplication> {
    return this.prisma.merchantApplication.update({
      where: { id: mongoId },
      data: {
        status,
        reviewedAt: new Date(),
        reviewedBy,
        rejectionReason,
        riskScore,
      },
    });
  }

  /**
   * Track blockchain reference separately
   */
  async createBlockchainReference(
    mongoId: string,
    contractId: string,
    txHash: string,
    referenceType: string = 'merchant_application'
  ): Promise<void> {
    await this.prisma.blockchainReference.create({
      data: {
        mongoId,
        contractId,
        referenceType,
        txHash,
      },
    });
  }

  /**
   * Check if application exists on blockchain
   */
  async hasBlockchainReference(
    mongoId: string,
    contractId: string
  ): Promise<boolean> {
    const reference = await this.prisma.blockchainReference.findUnique({
      where: {
        mongoId_contractId: {
          mongoId,
          contractId,
        },
      },
    });
    
    return !!reference;
  }

  /**
   * Retry blockchain commit for failed applications
   */
  async getFailedBlockchainCommits(
    contractId: string,
    maxAttempts: number = 3
  ): Promise<MerchantApplication[]> {
    return this.prisma.merchantApplication.findMany({
      where: {
        contractId,
        isBlockchainCommitted: false,
        blockchainCommitAttempts: { lt: maxAttempts },
      },
      orderBy: { lastBlockchainAttempt: 'asc' },
    });
  }

  /**
   * Update blockchain commit attempt
   */
  async incrementBlockchainAttempt(mongoId: string): Promise<void> {
    await this.prisma.merchantApplication.update({
      where: { id: mongoId },
      data: {
        blockchainCommitAttempts: { increment: 1 },
        lastBlockchainAttempt: new Date(),
      },
    });
  }
}

// Singleton instance
let merchantApplicationService: MerchantApplicationService;

export function getMerchantApplicationService(): MerchantApplicationService {
  if (!merchantApplicationService) {
    merchantApplicationService = new MerchantApplicationService();
  }
  return merchantApplicationService;
}