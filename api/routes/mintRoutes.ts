import express, { Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { mintNft } from '../services/mintService';
import { verifyPayment } from '../services/paymentService';

const router = express.Router();

// Configure Multer for file uploads - Use memory storage for Vercel
const storage = multer.memoryStorage();

const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    console.log('上传文件 originalname:', file.originalname, 'mimetype:', file.mimetype);
    if (file.mimetype.startsWith('video/') || file.mimetype.startsWith('image/')) {
        cb(null, true);
    } else {
        cb(new Error('Only video or image files are allowed'));
    }
};

const upload = multer({ 
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 100 * 1024 * 1024 // 100MB limit
    }
});

router.post('/mint', upload.single('video'), async (req: Request, res: Response) => {
    if (!req.file) {
        res.status(400).send({ message: 'No file uploaded.' });
        return;
    }

    const { name, symbol, description, royaltyBasisPoints, creatorAddress } = req.body;
    const creatorPrivateKey = process.env.CREATOR_PRIVATE_KEY;
    if (!name || !symbol || !description || !royaltyBasisPoints || !creatorAddress) {
        res.status(400).send({ message: 'Missing required fields: name, symbol, description, royaltyBasisPoints, creatorAddress.' });
        return;
    }

    if (!creatorPrivateKey) {
        console.error('CREATOR_PRIVATE_KEY is not set in .env file');
        res.status(500).send({ message: 'Server configuration error: Missing creator private key.' });
        return;
    }

    try {
        console.log('Proceeding with NFT minting...');
        
        const mintAddress = await mintNft({
            videoBuffer: req.file.buffer,
            originalFileName: req.file.originalname,
            mimetype: req.file.mimetype,
            name,
            symbol,
            description,
            royaltyBasisPoints: parseInt(royaltyBasisPoints, 10),
            creatorPrivateKey,
            creatorAddress,
        });

        res.status(200).send({
            message: 'NFT minted successfully!',
            mintAddress: mintAddress,
        });
        
    } catch (error) {
        console.error('Error in /mint route:', error);
        res.status(500).send({ message: 'Failed to mint NFT.', error: (error as Error).message, stack: (error as Error).stack });
    }
});

module.exports = router;