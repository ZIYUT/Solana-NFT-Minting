import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import {
  createTransaction,
  checkTransactionStatus,
  getTransactionQRCode,
  getBackendWalletAddress
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

const upload = multer({
  storage,
  limits: {
    fileSize: 100 * 1024 * 1024 // 100MB
  },
  fileFilter: fileFilter
});

/**
 * POST /api/transactions/create
 * 创建新的NFT铸造交易
 */
router.post('/create', upload.single('file'), async (req: express.Request, res: express.Response) => {
  try {
    console.log('Transaction creation request received');
    console.log('Request body:', req.body);
    console.log('Request file:', req.file ? {
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size,
      fieldname: req.file.fieldname
    } : 'No file');

    const { name, symbol, description, creatorAddress, royalty } = req.body;
    const videoFile = req.file;

    // 验证必需字段
    if (!name || !symbol || !description || !creatorAddress) {
      console.log('Missing required fields:', { name, symbol, description, creatorAddress });
      res.status(400).json({
        error: 'Missing required fields: name, symbol, description, creatorAddress'
      });
      return;
    }

    if (!videoFile) {
      console.log('No file provided in request');
      res.status(400).json({
        error: 'File is required'
      });
      return;
    }

    console.log('All validations passed, creating NFT data...');

    // 构建NFT数据 - 使用内存中的文件数据
    const nftData = {
      name,
      symbol,
      description,
      videoBuffer: videoFile.buffer, // 使用内存中的 buffer
      creatorAddress,
      royalty: royalty ? parseInt(royalty, 10) : 0, // 默认0%
    };

    console.log('NFT data prepared, calling createTransaction...');

    // 创建交易
    const result = await createTransaction(nftData, creatorAddress);

    console.log('Transaction created successfully:', result);

    res.json({
      success: true,
      data: {
        transactionId: result.transactionId,
        qrCodeDataUrl: result.qrCodeDataUrl,
        backendWalletAddress: result.backendWalletAddress,
        amount: result.amount,
        expiresAt: result.expiresAt
      }
    });
  } catch (error) {
    console.error('Error creating transaction:', error);
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      name: error instanceof Error ? error.name : undefined
    });
    
    res.status(500).json({
      error: 'Failed to create transaction',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
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