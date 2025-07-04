import { Connection, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import dotenv from 'dotenv';

dotenv.config();

const RPC_URL = process.env.SOLANA_RPC_URL!;
const connection = new Connection(RPC_URL, 'confirmed');

interface PaymentVerificationParams {
    fromAddress: string;
    toAddress: string;
    expectedAmount: number; // in SOL
    timeWindowMinutes?: number; // default 10 minutes
}

interface PaymentVerificationResult {
    verified: boolean;
    transactionSignature?: string;
    actualAmount?: number;
    timestamp?: number;
}

export const verifyPayment = async (params: PaymentVerificationParams & { createdAt?: number }): Promise<PaymentVerificationResult> => {
    const { fromAddress, toAddress, expectedAmount, timeWindowMinutes = 10, createdAt } = params;
    
    try {
        const fromPublicKey = new PublicKey(fromAddress);
        const toPublicKey = new PublicKey(toAddress);
        
        // Calculate time window
        let earliestTime;
        if (createdAt) {
            earliestTime = createdAt;
        } else {
            earliestTime = Date.now() - timeWindowMinutes * 60 * 1000;
        }
        
        console.log(`Verifying payment from ${fromAddress} to ${toAddress}`);
        console.log(`Expected amount: ${expectedAmount} SOL`);
        console.log(`Time window: ${timeWindowMinutes} minutes`);
        
        // Get recent transactions for the destination address
        const signatures = await connection.getSignaturesForAddress(
            toPublicKey,
            {
                limit: 50, // Check last 50 transactions
            }
        );
        
        console.log(`Found ${signatures.length} recent transactions for destination address`);
        
        // Check each transaction
        for (const signatureInfo of signatures) {
            const { signature, blockTime } = signatureInfo;
            
            // Skip if transaction is too old
            if (blockTime && blockTime * 1000 < earliestTime) {
                console.log(`Transaction ${signature} is too old, skipping`);
                continue;
            }
            
            try {
                // Get transaction details
                const transaction = await connection.getTransaction(signature, {
                    commitment: 'confirmed',
                    maxSupportedTransactionVersion: 0
                });
                
                if (!transaction || !transaction.meta) {
                    console.log(`Transaction ${signature} not found or no meta`);
                    continue;
                }
                
                // Check if transaction was successful
                if (transaction.meta.err) {
                    console.log(`Transaction ${signature} failed:`, transaction.meta.err);
                    continue;
                }
                
                // Get account keys
                const accountKeys = transaction.transaction.message.getAccountKeys().staticAccountKeys;
                
                if (!accountKeys) {
                    console.log(`Transaction ${signature} has no account keys`);
                    continue;
                }
                
                // Find indices of from and to addresses
                let fromIndex = -1;
                let toIndex = -1;
                
                for (let i = 0; i < accountKeys.length; i++) {
                    const accountKey = accountKeys[i];
                    if (accountKey.equals(fromPublicKey)) {
                        fromIndex = i;
                    }
                    if (accountKey.equals(toPublicKey)) {
                        toIndex = i;
                    }
                }
                
                // Skip if either address is not involved in this transaction
                if (fromIndex === -1 || toIndex === -1) {
                    console.log(`Transaction ${signature} doesn't involve both addresses`);
                    continue;
                }
                
                // Check balance changes
                const preBalances = transaction.meta.preBalances;
                const postBalances = transaction.meta.postBalances;
                
                if (!preBalances || !postBalances) {
                    console.log(`Transaction ${signature} missing balance information`);
                    continue;
                }
                
                // Calculate the amount transferred
                const fromPreBalance = preBalances[fromIndex];
                const fromPostBalance = postBalances[fromIndex];
                const toPreBalance = preBalances[toIndex];
                const toPostBalance = postBalances[toIndex];
                
                // Amount sent from the sender (should be negative)
                const fromBalanceChange = fromPostBalance - fromPreBalance;
                // Amount received by the recipient (should be positive)
                const toBalanceChange = toPostBalance - toPreBalance;
                
                console.log(`Transaction ${signature}:`);
                console.log(`  From balance change: ${fromBalanceChange / LAMPORTS_PER_SOL} SOL`);
                console.log(`  To balance change: ${toBalanceChange / LAMPORTS_PER_SOL} SOL`);
                
                // Check if this is a valid transfer from sender to recipient
                if (fromBalanceChange < 0 && toBalanceChange > 0) {
                    const transferredAmount = toBalanceChange / LAMPORTS_PER_SOL;
                    
                    console.log(`  Transferred amount: ${transferredAmount} SOL`);
                    
                    // Check if the amount meets or exceeds the expected amount
                    if (transferredAmount >= expectedAmount) {
                        console.log(`✅ Payment verified! Transaction: ${signature}`);
                        return {
                            verified: true,
                            transactionSignature: signature,
                            actualAmount: transferredAmount,
                            timestamp: blockTime || 0
                        };
                    } else {
                        console.log(`❌ Amount too small: ${transferredAmount} < ${expectedAmount}`);
                    }
                }
            } catch (error) {
                console.error(`Error processing transaction ${signature}:`, error);
                continue;
            }
        }
        
        console.log('❌ No valid payment found');
        return { verified: false };
        
    } catch (error) {
        console.error('Error verifying payment:', error);
        throw error;
    }
};

// Generate a payment QR code data
export const generatePaymentQR = (params: {
    recipientAddress: string;
    amount: number;
    label?: string;
    message?: string;
}): string => {
    const { recipientAddress, amount, label = 'Payment', message = 'Solana Payment' } = params;
    
    // Create Solana Pay URL
    const solanaPayUrl = `solana:${recipientAddress}?amount=${amount}&label=${encodeURIComponent(label)}&message=${encodeURIComponent(message)}`;
    
    return solanaPayUrl;
};

// Get backend wallet address from environment
export const getBackendWalletAddress = (): string => {
    const backendWalletAddress = process.env.BACKEND_WALLET_ADDRESS;
    if (!backendWalletAddress) {
        throw new Error('BACKEND_WALLET_ADDRESS not configured in environment variables');
    }
    return backendWalletAddress;
};