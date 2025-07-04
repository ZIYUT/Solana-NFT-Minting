import { Connection, PublicKey, clusterApiUrl, LAMPORTS_PER_SOL } from '@solana/web3.js';
import QRCode from 'qrcode';
import { mintNft, MintNftParams } from './mintService';
import fs from 'fs';

// 扩展接口以适应交易服务的需求
interface TransactionNftData {
  name: string;
  symbol: string;
  description: string;
  videoPath?: string; // 可选，用于本地开发
  videoBuffer?: Buffer; // 可选，用于 Vercel serverless
  creatorAddress: string;
  royalty?: number; // 新增
  ipfsUrl?: string; // 新增
}

interface TransactionData {
  id: string;
  nftData: TransactionNftData;
  creatorAddress: string;
  amount: number;
  status: 'pending' | 'paid' | 'minting' | 'completed' | 'expired' | 'failed';
  createdAt: Date;
  expiresAt: Date;
  paymentTxSignature?: string;
  mintAddress?: string;
  qrCodeData?: string;
}

// 内存存储交易数据（生产环境应使用数据库）
const transactions = new Map<string, TransactionData>();

// Solana 连接
const connection = new Connection(
  process.env.SOLANA_RPC_URL || clusterApiUrl('devnet'),
  'confirmed'
);

// 后端钱包地址
const BACKEND_WALLET_ADDRESS = process.env.BACKEND_WALLET_ADDRESS;
const MINT_FEE_SOL = parseFloat(process.env.MINT_FEE_SOL || '0.05');
const TRANSACTION_TIMEOUT_MINUTES = parseInt(process.env.TRANSACTION_TIMEOUT_MINUTES || '10');

/**
 * 创建新的交易
 */
export async function createTransaction(
  nftData: Omit<TransactionNftData, 'videoBuffer' | 'videoPath'>, // Omit video fields
  creatorAddress: string
): Promise<{
  transactionId: string;
  qrCodeDataUrl: string;
  backendWalletAddress: string;
  amount: number;
  expiresAt: Date;
}> {
  if (!BACKEND_WALLET_ADDRESS) {
    throw new Error('Backend wallet address not configured');
  }

  // 生成唯一交易ID
  const transactionId = generateTransactionId();
  
  // 设置过期时间
  const expiresAt = new Date(Date.now() + TRANSACTION_TIMEOUT_MINUTES * 60 * 1000);
  
  // 生成 Solana Pay URL
  const solanaPayUrl = `solana:${BACKEND_WALLET_ADDRESS}?amount=${MINT_FEE_SOL}&label=NFT%20Mint%20Fee&message=Payment%20for%20NFT%20minting%20-%20${transactionId}&reference=${transactionId}`;
  
  // 生成二维码
  const qrCodeDataUrl = await QRCode.toDataURL(solanaPayUrl, {
    width: 300,
    margin: 2,
    color: {
      dark: '#000000',
      light: '#FFFFFF'
    }
  });
  
  // 存储交易数据
  const transaction: TransactionData = {
    id: transactionId,
    nftData: { ...nftData }, // videoBuffer and videoPath are not included
    creatorAddress,
    amount: MINT_FEE_SOL,
    status: 'pending',
    createdAt: new Date(),
    expiresAt,
    qrCodeData: qrCodeDataUrl
  };
  
  transactions.set(transactionId, transaction);
  
  // 设置自动过期
  setTimeout(() => {
    expireTransaction(transactionId);
  }, TRANSACTION_TIMEOUT_MINUTES * 60 * 1000);
  
  return {
    transactionId,
    qrCodeDataUrl,
    backendWalletAddress: BACKEND_WALLET_ADDRESS,
    amount: MINT_FEE_SOL,
    expiresAt
  };
}

/**
 * 检查交易状态并处理支付验证
 */
export async function checkTransactionStatus(transactionId: string): Promise<{
  status: string;
  mintAddress?: string;
  explorerUrl?: string;
  message?: string;
}> {
  const transaction = transactions.get(transactionId);
  
  if (!transaction) {
    return { status: 'not_found', message: 'Transaction not found' };
  }
  
  // 检查是否过期
  if (new Date() > transaction.expiresAt) {
    transaction.status = 'expired';
    return { status: 'expired', message: 'Transaction expired' };
  }
  
  // 如果状态是pending，检查支付
  if (transaction.status === 'pending') {
    // 使用paymentService中的verifyPayment函数
    const { verifyPayment: verifyPaymentService } = await import('../services/paymentService');
    const paymentVerified = await verifyPaymentService({
      fromAddress: transaction.creatorAddress,
      toAddress: BACKEND_WALLET_ADDRESS!,
      expectedAmount: transaction.amount,
      createdAt: transaction.createdAt.getTime()
    });
    
    if (paymentVerified.verified) {
      transaction.status = 'paid';
      transaction.paymentTxSignature = paymentVerified.transactionSignature;
      
      // 不在这里开始铸造，等待视频上传完成后再开始
      // startMinting(transaction);
      
      return { status: 'paid', message: 'Payment verified, waiting for video upload' };
    }
  }
  
  // 返回当前状态
  const result: any = { status: transaction.status };
  
  if (transaction.mintAddress) {
    result.mintAddress = transaction.mintAddress;
    result.explorerUrl = `https://explorer.solana.com/address/${transaction.mintAddress}?cluster=${process.env.SOLANA_NETWORK || 'devnet'}`;
  }
  
  return result;
}

/**
 * 获取交易二维码
 */
/**
 * 获取交易详情
 */
/**
 * 更新交易，附加上传的视频信息
 */
export async function updateTransactionWithVideo(
  transactionId: string,
  ipfsUrl: string,
  videoBuffer: Buffer,
  videoPath: string
): Promise<TransactionData | null> {
  const transaction = transactions.get(transactionId);

  if (!transaction || transaction.status !== 'paid') {
    // 只能更新已支付但还未处理视频的交易
    return null;
  }

  // 更新交易数据
  transaction.nftData.ipfsUrl = ipfsUrl;
  transaction.nftData.videoBuffer = videoBuffer;
  transaction.nftData.videoPath = videoPath;
  
  // 视频上传完成后，开始铸造NFT
  startMinting(transaction);

  transactions.set(transactionId, transaction);

  return transaction;
}

export function getTransactionDetails(transactionId: string): TransactionData | undefined {
  return transactions.get(transactionId);
}

/**
 * 获取交易二维码
 */
export function getTransactionQRCode(transactionId: string): string | null {
  const transaction = transactions.get(transactionId);
  return transaction?.qrCodeData || null;
}



/**
 * 开始铸造NFT
 */
export async function startMinting(transaction: TransactionData) {
  if (!transaction || !transaction.nftData.videoBuffer) {
    console.error('Minting failed: Transaction data or video buffer is missing.');
    if (transaction) {
      transaction.status = 'failed';
    }
    return;
  }

  try {
    transaction.status = 'minting';
    
    // 从交易数据中获取所有需要的信息
    const { nftData, creatorAddress } = transaction;
    const creatorPrivateKey = process.env.CREATOR_PRIVATE_KEY;

    if (!creatorPrivateKey) {
      throw new Error('Creator private key is not configured on the server.');
    }
    
    // Type guard to ensure videoBuffer is not undefined
    if (!nftData.videoBuffer) {
        throw new Error('Video buffer is missing in transaction data.');
    }

    console.log('Starting NFT minting process for transaction:', transaction.id);

    // 新增：读取 royalty 字段，默认5%
    const royalty = typeof nftData.royalty === 'number' ? nftData.royalty : 5;

    const mintAddress = await mintNft({
      videoBuffer: nftData.videoBuffer,
      originalFileName: nftData.name, // 使用NFT名称作为文件名
      name: nftData.name,
      symbol: nftData.symbol,
      description: nftData.description,
      royaltyBasisPoints: royalty * 100, // 50 -> 5000
      creatorPrivateKey,
      creatorAddress,
    });
    
    transaction.status = 'completed';
    transaction.mintAddress = mintAddress;
    
    console.log(`Successfully minted NFT ${mintAddress} for transaction ${transaction.id}`);

  } catch (error) {
    console.error(`Failed to mint NFT for transaction ${transaction.id}:`, error);
    transaction.status = 'failed';
  }
}

/**
 * 使交易过期
 */
function expireTransaction(transactionId: string) {
  const transaction = transactions.get(transactionId);
  if (transaction && transaction.status === 'pending') {
    transaction.status = 'expired';
    console.log(`Transaction ${transactionId} expired`);
  }
}

/**
 * 生成唯一交易ID
 */
function generateTransactionId(): string {
  return `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * 获取后端钱包地址
 */
export function getBackendWalletAddress(): string {
  if (!BACKEND_WALLET_ADDRESS) {
    throw new Error('Backend wallet address not configured');
  }
  return BACKEND_WALLET_ADDRESS;
}

/**
 * 清理过期交易（定期清理）
 */
export function cleanupExpiredTransactions() {
  const now = new Date();
  for (const [id, transaction] of transactions.entries()) {
    if (now > transaction.expiresAt && 
        (transaction.status === 'pending' || transaction.status === 'expired')) {
      transactions.delete(id);
      console.log(`Cleaned up expired transaction ${id}`);
    }
  }
}

// 每小时清理一次过期交易
setInterval(cleanupExpiredTransactions, 60 * 60 * 1000);