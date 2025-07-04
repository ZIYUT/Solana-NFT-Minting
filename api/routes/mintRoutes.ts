import express, { Request, Response } from 'express';
import { mintNft } from '../services/mintService';
import { updateTransactionStatus } from '../utils/transactionDb';

const router = express.Router();

// POST /api/mint - Mint NFT using IPFS URL and NFT metadata
router.post('/mint', async (req: any, res: any) => {
  const { name, symbol, description, royaltyBasisPoints, creatorAddress, ipfsUrl, transactionId } = req.body;
  if (!name || !symbol || !description || royaltyBasisPoints === undefined || royaltyBasisPoints === null || !creatorAddress || !ipfsUrl || !transactionId) {
    return res.status(400).json({ message: 'Missing required fields.' });
  }
  try {
    const mintAddress = await mintNft({
      name,
      symbol,
      description,
      royaltyBasisPoints: parseInt(royaltyBasisPoints, 10),
      creatorPrivateKey: process.env.CREATOR_PRIVATE_KEY!,
      creatorAddress,
      ipfsUrl,
    });
    res.status(200).json({ message: 'NFT minted successfully!', mintAddress });
  } catch (error) {
    res.status(500).json({ message: 'Failed to mint NFT.', error: (error as Error).message });
  }
});

module.exports = router;