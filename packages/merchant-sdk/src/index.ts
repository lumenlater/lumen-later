import {
  Client as BnplClient,
  networks,
  Bill,
} from "@lumenlater/bnpl-core-client";
import { Keypair, TransactionBuilder, SorobanRpc } from "@stellar/stellar-sdk";

const STROOPS_MULTIPLIER = 10_000_000;

export interface LumenLaterConfig {
  /** Merchant's Stellar secret key for signing transactions */
  secretKey: string;
  /** RPC server URL (defaults to testnet) */
  rpcUrl?: string;
  /** Network passphrase (defaults to testnet) */
  networkPassphrase?: string;
  /** Contract ID (defaults to testnet) */
  contractId?: string;
  /** LumenLater API base URL */
  apiBaseUrl?: string;
  /** LumenLater API key */
  apiKey: string;
}

export interface CreateBillParams {
  /** User's Stellar public key (the buyer) */
  userAddress: string;
  /** Amount in USDC (e.g., 100.00) */
  amount: number;
  /** Merchant's order reference ID */
  orderId: string;
}

export interface CreateCheckoutSessionParams {
  /** On-chain bill ID (returned from createBill) */
  billId: string;
  /** Amount in USDC (must match bill amount) */
  amount: number;
  /** Merchant's order reference ID */
  orderId?: string;
  /** Description shown to user */
  description?: string;
  /** URL to redirect after successful payment */
  successUrl: string;
  /** URL to redirect if user cancels */
  cancelUrl: string;
  /** URL for webhook notifications */
  webhookUrl?: string;
  /** Arbitrary metadata */
  metadata?: Record<string, unknown>;
}

export interface CheckoutSession {
  id: string;
  url: string;
  billId: string;
  status: "PENDING" | "COMPLETED" | "EXPIRED" | "CANCELLED";
  expiresAt: string;
}

export interface CreateBillResult {
  billId: string;
  txHash: string;
}

/**
 * LumenLater Merchant SDK
 *
 * Use this SDK from your server to:
 * 1. Create bills on-chain (requires merchant signature)
 * 2. Create checkout sessions for redirect-based payment flow
 *
 * @example
 * ```typescript
 * import { LumenLater } from "@lumenlater/merchant-sdk";
 *
 * const ll = new LumenLater({
 *   secretKey: "S...", // Your Stellar secret key
 *   apiKey: "ll_live_...", // Your LumenLater API key
 * });
 *
 * // Step 1: Create a bill on-chain
 * const { billId, txHash } = await ll.createBill({
 *   userAddress: "G...", // Customer's Stellar address
 *   amount: 100.00, // USDC amount
 *   orderId: "order-123",
 * });
 *
 * // Step 2: Create a checkout session
 * const session = await ll.createCheckoutSession({
 *   billId,
 *   amount: 100.00,
 *   orderId: "order-123",
 *   successUrl: "https://your-site.com/success",
 *   cancelUrl: "https://your-site.com/cancel",
 * });
 *
 * // Redirect user to session.url
 * ```
 */
export class LumenLater {
  private keypair: Keypair;
  private client: BnplClient;
  private rpcUrl: string;
  private networkPassphrase: string;
  private apiBaseUrl: string;
  private apiKey: string;

  constructor(config: LumenLaterConfig) {
    this.keypair = Keypair.fromSecret(config.secretKey);
    this.rpcUrl = config.rpcUrl || "https://soroban-testnet.stellar.org";
    this.networkPassphrase =
      config.networkPassphrase || networks.testnet.networkPassphrase;
    this.apiBaseUrl =
      config.apiBaseUrl || "https://app.lumenlater.com/api/v1";
    this.apiKey = config.apiKey;

    const rpc = new SorobanRpc.Server(this.rpcUrl);

    this.client = new BnplClient({
      contractId: config.contractId || networks.testnet.contractId,
      networkPassphrase: this.networkPassphrase,
      rpcUrl: this.rpcUrl,
      publicKey: this.keypair.publicKey(),
      signTransaction: async (xdr) => {
        const tx = TransactionBuilder.fromXDR(xdr, this.networkPassphrase);
        tx.sign(this.keypair);
        return tx.toXDR();
      },
    });
  }

  /**
   * Get merchant's public key
   */
  get publicKey(): string {
    return this.keypair.publicKey();
  }

  /**
   * Create a bill on-chain
   *
   * This creates a pending bill that the user can pay using BNPL.
   * The merchant's signature authorizes the bill creation.
   *
   * @param params - Bill creation parameters
   * @returns Bill ID and transaction hash
   */
  async createBill(params: CreateBillParams): Promise<CreateBillResult> {
    const amountStroops = BigInt(
      Math.round(params.amount * STROOPS_MULTIPLIER)
    );

    const tx = await this.client.create_bill({
      merchant: this.keypair.publicKey(),
      user: params.userAddress,
      amount: amountStroops,
      order_id: params.orderId,
    });

    const result = await tx.signAndSend();

    if (result.result === undefined) {
      throw new Error("Transaction failed: no result returned");
    }

    return {
      billId: result.result.toString(),
      txHash: result.sendTransactionResponse?.hash || "",
    };
  }

  /**
   * Get a bill by ID
   */
  async getBill(billId: string): Promise<Bill> {
    const tx = await this.client.get_bill({
      bill_id: BigInt(billId),
    });
    return tx.result;
  }

  /**
   * Create a checkout session
   *
   * After creating a bill on-chain, create a checkout session
   * to get a payment URL you can redirect users to.
   *
   * @param params - Checkout session parameters
   * @returns Checkout session with payment URL
   */
  async createCheckoutSession(
    params: CreateCheckoutSessionParams
  ): Promise<CheckoutSession> {
    const response = await fetch(
      `${this.apiBaseUrl}/checkout/sessions`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          billId: params.billId,
          amount: params.amount,
          orderId: params.orderId,
          description: params.description,
          successUrl: params.successUrl,
          cancelUrl: params.cancelUrl,
          webhookUrl: params.webhookUrl,
          metadata: params.metadata,
        }),
      }
    );

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(
        `Failed to create checkout session: ${error.message || response.statusText}`
      );
    }

    return response.json();
  }
}

export default LumenLater;
