import { Connection, PublicKey, Transaction, sendAndConfirmTransaction } from '@solana/web3.js';
import { getAssociatedTokenAddress, createAssociatedTokenAccountInstruction, createTransferInstruction } from '@solana/spl-token';
import { getKeypairFromPrivateKey } from '../utils/wallet';

const connection = new Connection(process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com');

export interface TransferNFTParams {
    mintAddress: string;
    toAddress: string;
    creatorPrivateKey: string | number[];
}

export const transferNFT = async (params: TransferNFTParams): Promise<string> => {
    const { mintAddress, toAddress, creatorPrivateKey } = params;

    try {
        console.log('🚀 Starting NFT transfer process...');
        console.log(`📦 NFT Address: ${mintAddress}`);
        console.log(`📥 To Address: ${toAddress}`);

        // 验证地址格式
        console.log('🔍 Validating addresses...');
        const mintPublicKey = new PublicKey(mintAddress);
        const toPublicKey = new PublicKey(toAddress);
        const creatorKeypair = getKeypairFromPrivateKey(creatorPrivateKey);
        const fromPublicKey = creatorKeypair.publicKey;
        console.log(`📤 From Address: ${fromPublicKey.toBase58()}`);

        // 获取源地址和目标地址的代币账户
        console.log('🔑 Getting token accounts...');
        const fromTokenAccount = await getAssociatedTokenAddress(
            mintPublicKey,
            fromPublicKey
        );
        console.log(`📤 From Token Account: ${fromTokenAccount.toBase58()}`);

        const toTokenAccount = await getAssociatedTokenAddress(
            mintPublicKey,
            toPublicKey
        );
        console.log(`📥 To Token Account: ${toTokenAccount.toBase58()}`);

        // 创建交易
        console.log('📝 Creating transaction...');
        const transaction = new Transaction();

        // 检查目标地址是否有关联代币账户
        console.log('🔍 Checking if destination token account exists...');
        const toTokenAccountInfo = await connection.getAccountInfo(toTokenAccount);
        if (!toTokenAccountInfo) {
            console.log('➕ Creating new token account for destination...');
            transaction.add(
                createAssociatedTokenAccountInstruction(
                    creatorKeypair.publicKey,
                    toTokenAccount,
                    toPublicKey,
                    mintPublicKey
                )
            );
        } else {
            console.log('✅ Destination token account already exists');
        }

        // 添加转移指令
        console.log('📤 Adding transfer instruction...');
        transaction.add(
            createTransferInstruction(
                fromTokenAccount,
                toTokenAccount,
                fromPublicKey,
                1 // NFT数量（总是1）
            )
        );

        // 发送并确认交易
        console.log('🚀 Sending transaction to network...');
        const signature = await sendAndConfirmTransaction(
            connection,
            transaction,
            [creatorKeypair]
        );
        console.log(`✅ Transaction confirmed! Signature: ${signature}`);

        return signature;
    } catch (error) {
        console.error('❌ Error transferring NFT:', error);
        throw error;
    }
}; 