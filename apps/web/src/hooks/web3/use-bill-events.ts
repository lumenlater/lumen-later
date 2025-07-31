/**
 * Hook for fetching bill events directly from Soroban RPC
 */

import { useQuery } from '@tanstack/react-query';
import { Config } from '@/constants/config';
import CONTRACT_IDS from '@/config/contracts';
import { parseScVal, parseScValMap } from '@/lib/scval-parser';
import { Address } from '@stellar/stellar-sdk';

interface EventFilter {
  type: 'contract';
  contractIds: string[];
  topics?: string[][];
}

interface SorobanEvent {
  id: string;
  type: string;
  ledger: number;
  ledgerClosedAt: string;
  contractId: string;
  topic: string[];
  value: string; // base64 encoded XDR
  txHash: string;
  operationIndex: number;
  transactionIndex: number;
  inSuccessfulContractCall: boolean;
}

interface GetEventsResponse {
  jsonrpc: string;
  id: number;
  result: {
    events: SorobanEvent[];
    latestLedger: number;
    oldestLedger: number;
    latestLedgerCloseTime: string;
    oldestLedgerCloseTime: string;
    cursor: string;
  };
}

interface BillEvent {
  bill_id: number;
  merchant: string;
  user: string;
  amount: number;
  order_id: string;
  created_at: Date;
  ledger: number;
  txHash: string;
}

// Pre-encoded 'bill_new' as ScVal symbol in base64
const BILL_NEW_TOPIC = 'AAAADwAAAAhiaWxsX25ldw==';

export function useBillEvents() {
  // Get the latest ledger sequence
  const getLatestLedger = async (): Promise<number> => {
    try {
      const response = await fetch(Config.STELLAR_RPC_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: Date.now(),
          method: 'getLatestLedger',
        }),
      });
      
      const data = await response.json();
      return data.result?.sequence || 0;
    } catch (error) {
      console.error('Error getting latest ledger:', error);
      return 0;
    }
  };

  // Fetch events directly from Soroban RPC
  const fetchEvents = async (
    startLedger: number,
    filters: EventFilter[]
  ): Promise<BillEvent[]> => {
    try {
      const response = await fetch(Config.STELLAR_RPC_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: Date.now(),
          method: 'getEvents',
          params: {
            startLedger,
            filters,
            xdrFormat: 'base64',
          },
        }),
      });

      const data = await response.json() as GetEventsResponse;

      if (!data.result?.events) {
        return [];
      }

      const billEvents: BillEvent[] = [];

      for (const event of data.result.events) {
        try {
          // Parse the base64 encoded XDR value
          const parsedValue = parseScVal(event.value);
          
          // Handle both direct object and map array formats
          let eventData: any;
          if (Array.isArray(parsedValue)) {
            // It's a map array format
            eventData = parseScValMap(parsedValue);
          } else {
            // It's already an object
            eventData = parsedValue;
          }

          // Extract topic information
          const [eventTypeXdr, merchantXdr, billIdXdr] = event.topic;
          
          // Parse the event type from the first topic
          const eventType = parseScVal(eventTypeXdr);

          // Only process bill_new events
          if (eventType !== 'bill_new') {
            continue;
          }

          // Parse merchant address from second topic (if not wildcard)
          let merchantAddress = eventData.merchant;
          if (merchantXdr && merchantXdr !== '*') {
            try {
              merchantAddress = parseScVal(merchantXdr);
            } catch {
              // Use merchant from event data
            }
          }

          // Parse bill ID from third topic (if not wildcard)
          let billId = eventData.bill_id;
          if (billIdXdr && billIdXdr !== '*') {
            try {
              billId = parseScVal(billIdXdr);
            } catch {
              // Use bill_id from event data
            }
          }

          // Create BillEvent from parsed data
          const billEvent: BillEvent = {
            bill_id: Number(billId),
            user: eventData.user,
            merchant: merchantAddress,
            amount: Number(eventData.amount) / (10 ** Config.USDC_DECIMALS),
            order_id: eventData.order_id,
            created_at: new Date(Number(eventData.created_at) * 1000),
            ledger: event.ledger,
            txHash: event.txHash,
          };
          
          billEvents.push(billEvent);
        } catch (error) {
          console.error('Error parsing event:', error);
          continue;
        }
      }

      return billEvents;
    } catch (error) {
      console.error('Error fetching events:', error);
      return [];
    }
  };

  // Get bills by user from events
  const useBillEventsByUser = (userAddress?: string | null) => {
    return useQuery({
      queryKey: ['billEvents', 'user', userAddress],
      queryFn: async () => {
        if (!userAddress) {
          throw new Error('User address required');
        }

        try {
          const latestLedger = await getLatestLedger();
          // Look back ~14 hours (10000 ledgers, ~5 seconds per ledger)
          const startLedger = Math.max(1, latestLedger - 10000);
          
          const events = await fetchEvents(startLedger, [{
            type: 'contract',
            contractIds: [CONTRACT_IDS.BNPL_CORE],
            topics: [
              [
                BILL_NEW_TOPIC,
                '*', // any merchant
                '*', // any bill_id
              ],
            ],
          }]);

          // Filter events by user
          const userBills = events.filter(event => event.user === userAddress);
          
          return userBills.reverse(); // Most recent first
        } catch (error) {
          console.error('Error fetching user bill events:', error);
          return [];
        }
      },
      enabled: !!userAddress,
      retry: 2,
    });
  };

  // Get bills by merchant from events
  const useBillEventsByMerchant = (merchantAddress?: string | null) => {
    return useQuery({
      queryKey: ['billEvents', 'merchant', merchantAddress],
      queryFn: async () => {
        if (!merchantAddress) {
          throw new Error('Merchant address required');
        }

        try {
          const latestLedger = await getLatestLedger();
          // Look back ~14 hours (10000 ledgers, ~5 seconds per ledger)
          const startLedger = Math.max(1, latestLedger - 10000);
          
          const events = await fetchEvents(startLedger, [{
            type: 'contract',
            contractIds: [CONTRACT_IDS.BNPL_CORE],
            topics: [
              [
                BILL_NEW_TOPIC,
                merchantAddress ? Address.fromString(merchantAddress).toScVal().toXDR('base64') : '*',
                '*', // any bill_id
              ],
            ],
          }]);
          
          return events.reverse(); // Most recent first
        } catch (error) {
          console.error('Error fetching merchant bill events:', error);
          return [];
        }
      },
      enabled: !!merchantAddress,
      retry: 2,
    });
  };

  // Get all bill events
  const useAllBillEvents = () => {
    return useQuery({
      queryKey: ['billEvents', 'all'],
      queryFn: async () => {
        try {
          const latestLedger = await getLatestLedger();
          // Look back ~14 hours (10000 ledgers, ~5 seconds per ledger)
          const startLedger = Math.max(1, latestLedger - 10000);
          
          const events = await fetchEvents(startLedger, [{
            type: 'contract',
            contractIds: [CONTRACT_IDS.BNPL_CORE],
            topics: [
              [
                BILL_NEW_TOPIC,
                '*', // any merchant
                '*', // any bill_id
              ],
            ],
          }]);
          
          return events.reverse(); // Most recent first
        } catch (error) {
          console.error('Error fetching all bill events:', error);
          return [];
        }
      },
      retry: 2,
    });
  };

  return {
    useBillEventsByUser,
    useBillEventsByMerchant,
    useAllBillEvents,
  };
}