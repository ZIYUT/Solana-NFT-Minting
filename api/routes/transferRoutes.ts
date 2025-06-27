import express, { Request, Response } from 'express';
import { transferNFT } from '../services/transferService';

const router = express.Router();

/**
 * POST /api/transfer
 * Transfer NFT to specified address
 */
router.post('/', async (req: Request, res: Response) => {
    console.log('📥 Received NFT transfer request');
    try {
        const { mintAddress, toAddress } = req.body;
        console.log('📋 Request details:', { mintAddress, toAddress });

        // Validate required fields
        if (!mintAddress || !toAddress) {
            console.log('❌ Missing required fields');
            res.status(400).json({
                error: 'Missing required fields: mintAddress, toAddress'
            });
            return;
        }

        // Get creator private key
        console.log('🔑 Getting creator private key...');
        const creatorPrivateKeyStr = process.env.CREATOR_PRIVATE_KEY;
        if (!creatorPrivateKeyStr) {
            console.error('❌ CREATOR_PRIVATE_KEY is not set in .env file');
            res.status(500).json({
                error: 'Server configuration error: Missing creator private key.'
            });
            return;
        }

        // Parse private key array
        console.log('🔐 Parsing private key...');
        let creatorPrivateKey: number[];
        try {
            creatorPrivateKey = JSON.parse(creatorPrivateKeyStr);
            console.log('✅ Private key parsed successfully');
        } catch (error) {
            console.error('❌ Error parsing CREATOR_PRIVATE_KEY:', error);
            res.status(500).json({
                error: 'Server configuration error: Invalid creator private key format.'
            });
            return;
        }

        // Execute NFT transfer
        console.log('🚀 Initiating NFT transfer...');
        const signature = await transferNFT({
            mintAddress,
            toAddress,
            creatorPrivateKey
        });

        console.log('✅ NFT transfer completed successfully');
        res.json({
            success: true,
            data: {
                signature,
                message: 'NFT transferred successfully'
            }
        });
    } catch (error) {
        console.error('❌ Error in transfer route:', error);
        res.status(500).json({
            error: 'Failed to transfer NFT',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

export default router; 