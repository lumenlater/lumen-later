/**
 * Merchant Application API client
 */

import { config } from '../config/index.js';
import { logger } from '../utils/logger.js';
import type { MerchantApplicationData } from '@lumenlater/shared';

export interface CreateApplicationResponse {
  mongoId: string;
  blockchainId: string;
  application: any;
}

export interface ApplicationStatus {
  id: string;
  status: string;
  applicantAddress: string;
}

export const merchantApi = {
  /**
   * Create a new merchant application
   */
  async createApplication(
    applicantAddress: string,
    data: MerchantApplicationData
  ): Promise<CreateApplicationResponse> {
    const url = `${config.api.baseUrl}/merchant/applications`;

    logger.info(`Creating merchant application for ${applicantAddress.slice(0, 8)}...`);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        applicantAddress,
        contractId: config.contracts.bnplCoreId,
        ...data,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to create application: ${error}`);
    }

    const result = (await response.json()) as CreateApplicationResponse;
    logger.success(`Application created: ${result.mongoId}`);

    return result;
  },

  /**
   * Get application by address
   */
  async getApplication(applicantAddress: string): Promise<ApplicationStatus | null> {
    const url = `${config.api.baseUrl}/merchant/applications?applicantAddress=${applicantAddress}&contractId=${config.contracts.bnplCoreId}`;

    const response = await fetch(url);

    if (!response.ok) {
      if (response.status === 404) return null;
      throw new Error(`Failed to fetch application: ${response.statusText}`);
    }

    return response.json() as Promise<ApplicationStatus>;
  },

  /**
   * List all applications
   */
  async listApplications(options?: {
    status?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ applications: ApplicationStatus[]; total: number }> {
    const params = new URLSearchParams({
      contractId: config.contracts.bnplCoreId,
      ...(options?.status && { status: options.status }),
      ...(options?.limit && { limit: String(options.limit) }),
      ...(options?.offset && { offset: String(options.offset) }),
    });

    const url = `${config.api.baseUrl}/merchant/applications?${params}`;
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Failed to list applications: ${response.statusText}`);
    }

    return response.json() as Promise<{ applications: ApplicationStatus[]; total: number }>;
  },

  /**
   * Update application status (admin action)
   */
  async updateApplicationStatus(
    mongoId: string,
    status: 'APPROVED' | 'REJECTED',
    reviewNotes?: string
  ): Promise<void> {
    const url = `${config.api.baseUrl}/merchant/applications`;

    logger.info(`Updating application ${mongoId} to ${status}`);

    const response = await fetch(url, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        mongoId,
        status,
        reviewedAt: new Date().toISOString(),
        // rejectionReason is used for notes (only applicable for REJECTED status)
        ...(status === 'REJECTED' && reviewNotes ? { rejectionReason: reviewNotes } : {}),
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to update application: ${error}`);
    }

    logger.success(`Application ${mongoId} updated to ${status}`);
  },
};
