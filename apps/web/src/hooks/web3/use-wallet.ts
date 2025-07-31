import { create } from 'zustand';
import { Config } from '@/constants/config';
import { ErrorMessages } from '@/constants/errors';
import { 
  getWalletKit, 
  getWalletNetwork, 
  getNetworkPassphrase,
  isValidStellarPublicKey 
} from '@/lib/stellar-wallets-kit';
import { ISupportedWallet } from '@creit.tech/stellar-wallets-kit';

interface WalletState {
  isConnected: boolean;
  publicKey: string | null;
  network: string | null;
  walletId: string | null;
  walletName: string | null;
  connect: () => Promise<void>;
  disconnect: () => void;
  signTransaction: (xdr: string) => Promise<{signedTxXdr: string, signerAddress: string}>;
  isLoading: boolean;
  error: string | null;
  checkConnection: () => Promise<void>;
}

export const useWallet = create<WalletState>((set, get) => ({
  isConnected: false,
  publicKey: null,
  network: null,
  walletId: null,
  walletName: null,
  isLoading: false,
  error: null,

  connect: async () => {
    // Prevent multiple simultaneous connection attempts
    if (get().isLoading) {
      return;
    }
    
    set({ isLoading: true, error: null });
    
    try {
      const kit = getWalletKit();
      
      // Open modal for wallet selection
      await kit.openModal({
        onWalletSelected: async (option: ISupportedWallet) => {
          try {
            // Set the selected wallet
            kit.setWallet(option.id);
            
            // Get the public address
            const { address } = await kit.getAddress();
            
            // Validate the public key
            if (!address || !isValidStellarPublicKey(address)) {
              throw new Error('Invalid public key received');
            }
            
            const network = getWalletNetwork();
            
            set({ 
              isConnected: true,
              publicKey: address,
              network: network.toString(),
              walletId: option.id,
              walletName: option.name,
              isLoading: false,
              error: null 
            });
            
            // Store connection in session storage for reconnection
            if (typeof window !== 'undefined' && address) {
              sessionStorage.setItem('walletConnected', 'true');
              sessionStorage.setItem('walletId', option.id);
            }
            
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : ErrorMessages.WALLET_CONNECTION_FAILED;
            
            set({
              error: errorMessage,
              isLoading: false,
              isConnected: false,
              publicKey: null,
              network: null,
              walletId: null,
              walletName: null
            });
            
            // Clear session storage on error
            if (typeof window !== 'undefined') {
              sessionStorage.removeItem('walletConnected');
              sessionStorage.removeItem('walletId');
            }
          }
        },
        onClosed: () => {
          // If modal closed without selection, reset loading state
          if (!get().isConnected) {
            set({ isLoading: false });
          }
        }
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : ErrorMessages.WALLET_CONNECTION_FAILED;
      
      set({
        error: errorMessage,
        isLoading: false,
        isConnected: false,
        publicKey: null,
        network: null,
        walletId: null,
        walletName: null
      });
      
      // Clear session storage on error
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem('walletConnected');
        sessionStorage.removeItem('walletId');
      }
    }
  },

  disconnect: () => {
    set({
      isConnected: false,
      publicKey: null,
      network: null,
      walletId: null,
      walletName: null,
      error: null,
      isLoading: false
    });
    
    // Clear session storage
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('walletConnected');
      sessionStorage.removeItem('walletId');
    }
  },
  
  signTransaction: async (xdr: string): Promise<{signedTxXdr: string, signerAddress: string}> => {
    const state = get();
    
    if (!state.isConnected || !state.publicKey) {
      throw new Error(ErrorMessages.WALLET_NOT_CONNECTED);
    }
    
    if (!xdr) {
      throw new Error('Transaction XDR is required');
    }
    
    try {
      const kit = getWalletKit();
      const network = getWalletNetwork();
      
      // Sign the transaction
      const { signedTxXdr } = await kit.signTransaction(xdr, {
        address: state.publicKey,
        networkPassphrase: getNetworkPassphrase(network),
      });
      
      if (!signedTxXdr) {
        throw new Error('Failed to receive signed transaction');
      }
      
      return {signedTxXdr, signerAddress: state.publicKey};
    } catch (error) {
      if (Config.IS_DEVELOPMENT) {
        console.error('Transaction signing error:', error);
      }
      
      if (error instanceof Error) {
        if (error.message.includes('User declined') || error.message.includes('cancelled')) {
          throw new Error(ErrorMessages.TRANSACTION_REJECTED);
        }
      }
      
      throw new Error(ErrorMessages.TRANSACTION_FAILED);
    }
  },
  
  checkConnection: async () => {
    try {
      // Check if we have a stored wallet ID
      if (typeof window !== 'undefined') {
        const shouldReconnect = sessionStorage.getItem('walletConnected') === 'true';
        const storedWalletId = sessionStorage.getItem('walletId');
        
        if (shouldReconnect && storedWalletId && !get().isConnected) {
          // Try to reconnect with the stored wallet
          const kit = getWalletKit();
          kit.setWallet(storedWalletId);
          
          try {
            const { address } = await kit.getAddress();
            
            if (address && isValidStellarPublicKey(address)) {
              const network = getWalletNetwork();
              
              set({
                isConnected: true,
                publicKey: address,
                network: network.toString(),
                walletId: storedWalletId,
                walletName: null, // We don't have the name stored
                error: null
              });
              
            }
          } catch (error) {
            // If auto-reconnect fails, clear session storage
            sessionStorage.removeItem('walletConnected');
            sessionStorage.removeItem('walletId');
            
            if (Config.IS_DEVELOPMENT) {
              console.error('Auto-reconnect failed:', error);
            }
          }
        }
      }
    } catch (error) {
      if (Config.IS_DEVELOPMENT) {
        console.error('Connection check failed:', error);
      }
    }
  },
}));

// Auto-check connection on load
if (typeof window !== 'undefined') {
  setTimeout(() => {
    const state = useWallet.getState();
    state.checkConnection();
  }, 100);
}