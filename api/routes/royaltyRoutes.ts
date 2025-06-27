import express, { Request, Response } from 'express';
import { updateNFTRoyalty } from '../services/royaltyService';

const router = express.Router();

router.post('/update-royalty', async (req: Request, res: Response) => {
    const { mintAddress, royaltyBasisPoints } = req.body;
    const creatorPrivateKey = process.env.CREATOR_PRIVATE_KEY;

    if (!mintAddress || !royaltyBasisPoints) {
        res.status(400).send({ 
            message: 'Missing required fields: mintAddress, royaltyBasisPoints.' 
        });
        return;
    }

    if (!creatorPrivateKey) {
        console.error('CREATOR_PRIVATE_KEY is not set in .env file');
        res.status(500).send({ 
            message: 'Server configuration error: Missing creator private key.' 
        });
        return;
    }

    try {
        const signature = await updateNFTRoyalty({
            mintAddress,
            royaltyBasisPoints: parseInt(royaltyBasisPoints, 10),
            creatorPrivateKey,
        });
        
        res.status(200).send({ 
            message: 'NFT royalty updated successfully!',
            transactionSignature: signature,
            newRoyaltyBasisPoints: royaltyBasisPoints
        });
    } catch (error: any) {
        console.error('Error updating NFT royalty:', error);
        res.status(500).send({ 
            message: 'Failed to update NFT royalty.',
            error: error.message 
        });
    }
});

export default router; 