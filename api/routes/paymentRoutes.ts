import express, { Request, Response } from 'express';
import { verifyPayment, generatePaymentQR, getBackendWalletAddress } from '../services/paymentService';

const router = express.Router();

// Verify payment endpoint
router.post('/verify-payment', async (req: Request, res: Response) => {
    try {
        const { fromAddress, toAddress, expectedAmount, timeWindowMinutes } = req.body;
        
        if (!fromAddress || !toAddress || !expectedAmount) {
            res.status(400).json({
                error: 'Missing required fields: fromAddress, toAddress, expectedAmount'
            });
            return;
        }
        
        console.log('Payment verification request:', {
            fromAddress,
            toAddress,
            expectedAmount,
            timeWindowMinutes
        });
        
        const result = await verifyPayment({
            fromAddress,
            toAddress,
            expectedAmount: parseFloat(expectedAmount),
            timeWindowMinutes: timeWindowMinutes || 10
        });
        
        res.json(result);
    } catch (error) {
        console.error('Error in payment verification:', error);
        res.status(500).json({
            error: 'Payment verification failed',
            message: (error as Error).message
        });
    }
});

// Get payment QR code data
router.post('/generate-payment-qr', async (req: Request, res: Response) => {
    try {
        const { amount, label, message } = req.body;
        
        if (!amount) {
            res.status(400).json({
                error: 'Missing required field: amount'
            });
            return;
        }
        
        const backendWalletAddress = getBackendWalletAddress();
        
        const qrData = generatePaymentQR({
            recipientAddress: backendWalletAddress,
            amount: parseFloat(amount),
            label: label || 'NFT Mint Fee',
            message: message || 'Payment for NFT minting service'
        });
        
        res.json({
            qrData,
            recipientAddress: backendWalletAddress,
            amount: parseFloat(amount)
        });
    } catch (error) {
        console.error('Error generating payment QR:', error);
        res.status(500).json({
            error: 'Failed to generate payment QR',
            message: (error as Error).message
        });
    }
});

// Get backend wallet address
router.get('/backend-wallet', async (req: Request, res: Response) => {
    try {
        const backendWalletAddress = getBackendWalletAddress();
        res.json({ address: backendWalletAddress });
    } catch (error) {
        console.error('Error getting backend wallet address:', error);
        res.status(500).json({
            error: 'Failed to get backend wallet address',
            message: (error as Error).message
        });
    }
});

export default router;