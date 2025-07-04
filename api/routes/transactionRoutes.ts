import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import {
  createTransaction,
  checkTransactionStatus,
  getTransactionQRCode,
  getBackendWalletAddress,
  getTransactionDetails,
  updateTransactionWithVideo,
  startMinting
} from '../services/transactionService';

const router = express.Router();

// 配置 multer 用于文件上传 - 使用内存存储适配 Vercel
const storage = multer.memoryStorage();

const fileFilter = (req: express.Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  console.log('File filter called with:', {
    originalname: file.originalname,
    mimetype: file.mimetype,
    fieldname: file.fieldname,
    size: file.size
  });

  // Check if it's a video or image file
  if (file.mimetype.startsWith('video/') || file.mimetype.startsWith('image/')) {
    console.log('File accepted:', file.mimetype);
    cb(null, true);
  } else {
    // Log the rejected file details for debugging
    console.log('File rejected:', {
      originalname: file.originalname,
      mimetype: file.mimetype,
      reason: 'Not a video or image file'
    });
    
    // Provide more detailed error message
    const errorMessage = `File type '${file.mimetype}' is not allowed. Only video or image files are supported. Original filename: ${file.originalname}`;
    cb(new Error(errorMessage));
  }
};

router.post('/create-payment-order', async (req, res) => {
    try {
        const { fromAddress, name, symbol, description, royalty } = req.body;
        if (!fromAddress || !name || !symbol || !description) {
            res.status(400).json({ error: 'Missing required fields' });
            return;
        }

        const nftData = {
            name,
            symbol,
            description,
            creatorAddress: fromAddress,
            royalty: royalty || 0
        };

        const result = await createTransaction(nftData, fromAddress);

        res.json({
            orderId: result.transactionId,
            backendWalletAddress: result.backendWalletAddress,
            amount: result.amount,
            expiresAt: result.expiresAt,
            qrCodeDataUrl: result.qrCodeDataUrl
        });

    } catch (error) {
        console.error('Error creating payment order:', error);
        res.status(500).json({ error: 'Failed to create payment order', message: (error as Error).message });
    }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 100 * 1024 * 1024 // 100MB
  },
  fileFilter: fileFilter
});

router.post('/create', upload.single('video'), async (req, res) => {
  try {
    const { transactionId, ipfsUrl } = req.body;
    const videoFile = req.file;

    if (!transactionId || !ipfsUrl || !videoFile) {
      res.status(400).json({ error: 'Missing transactionId, ipfsUrl, or video file' });
      return;
    }

    const transaction = await updateTransactionWithVideo(transactionId, ipfsUrl, videoFile.buffer, videoFile.originalname);

    if (!transaction) {
        res.status(404).json({ error: 'Transaction not found or already processed' });
        return;
    }

    startMinting(transaction.id).catch(console.error);

    res.json({ success: true, message: 'Video received, minting process started.' });

  } catch (error) {
    console.error('Error updating transaction with video:', error);
    res.status(500).json({ error: 'Failed to update transaction', message: (error as Error).message });
  }
});

// Error handling middleware for multer errors
router.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (error instanceof multer.MulterError) {
    console.error('Multer error:', error);
    res.status(400).json({
      error: 'File upload error',
      message: error.message,
      code: error.code
    });
  } else if (error) {
    console.error('General error:', error);
    res.status(500).json({
      error: 'Server error',
      message: error.message || 'An unexpected error occurred'
    });
  } else {
    next();
  }
});

/**
 * GET /api/transactions/:transactionId/status
 * 检查交易状态
 */
/**
 * GET /api/transactions/:transactionId
 * 获取交易详情
 */
router.get('/:transactionId', (req, res) => {
    const { transactionId } = req.params;
    const transaction = getTransactionDetails(transactionId);
    if (transaction) {
        res.json(transaction);
    } else {
        res.status(404).json({ error: 'Transaction not found' });
    }
});

/**
 * GET /api/transactions/:transactionId/status
 * 检查交易状态
 */
router.get('/:transactionId/status', async (req, res) => {
  try {
    const { transactionId } = req.params;
    
    if (!transactionId) {
      res.status(400).json({
        error: 'Transaction ID is required'
      });
      return;
    }

    const result = await checkTransactionStatus(transactionId);
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error checking transaction status:', error);
    res.status(500).json({
      error: 'Failed to check transaction status',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/transactions/:transactionId/qrcode
 * 获取交易二维码图片
 */
router.get('/:transactionId/qrcode', (req, res) => {
  try {
    const { transactionId } = req.params;
    
    if (!transactionId) {
      res.status(400).json({
        error: 'Transaction ID is required'
      });
      return;
    }

    const qrCodeData = getTransactionQRCode(transactionId);
    
    if (!qrCodeData) {
      res.status(404).json({
        error: 'QR code not found for this transaction'
      });
      return;
    }

    // 将 data URL 转换为 buffer
    const base64Data = qrCodeData.replace(/^data:image\/png;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');
    
    res.set({
      'Content-Type': 'image/png',
      'Content-Length': buffer.length
    });
    
    res.send(buffer);
  } catch (error) {
    console.error('Error getting QR code:', error);
    res.status(500).json({
      error: 'Failed to get QR code',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/transactions/:transactionId/phantom-deeplink
 * 创建Phantom深度链接
 */
router.post('/:transactionId/phantom-deeplink', async (req, res) => {
  try {
    const { transactionId } = req.params;
    const { amount, recipientAddress } = req.body;
    
    if (!transactionId || !amount || !recipientAddress) {
      res.status(400).json({
        error: 'Missing required fields: transactionId, amount, recipientAddress'
      });
      return;
    }

    // 创建Solana Pay URL作为深度链接
    const solanaPayUrl = `solana:${recipientAddress}?amount=${amount}&label=NFT%20Mint%20Fee&message=Payment%20for%20NFT%20minting%20-%20${transactionId}`;
    
    // 创建Phantom深度链接
    const phantomDeeplink = `https://phantom.app/ul/browse/${encodeURIComponent(solanaPayUrl)}?ref=https://challenz.app`;
    
    res.json({
      success: true,
      data: {
        phantomDeeplink,
        solanaPayUrl
      }
    });
  } catch (error) {
    console.error('Error creating phantom deeplink:', error);
    res.status(500).json({
      error: 'Failed to create phantom deeplink',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/transactions/backend-wallet
 * 获取后端钱包地址
 */
router.get('/backend-wallet', (req, res) => {
  try {
    const walletAddress = getBackendWalletAddress();
    
    res.json({
      success: true,
      data: {
        walletAddress
      }
    });
  } catch (error) {
    console.error('Error getting backend wallet address:', error);
    res.status(500).json({
      error: 'Failed to get backend wallet address',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;