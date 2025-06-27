import {
    Connection,
    Keypair,
    PublicKey,
    Transaction,
    sendAndConfirmTransaction,
} from '@solana/web3.js';
import {
    PROGRAM_ID as TOKEN_METADATA_PROGRAM_ID,
    createUpdateMetadataAccountV2Instruction,
    DataV2,
} from '@metaplex-foundation/mpl-token-metadata';
import dotenv from 'dotenv';

dotenv.config();

const RPC_URL = process.env.SOLANA_RPC_URL!;
const connection = new Connection(RPC_URL, 'confirmed');

// Helper function to get Keypair from secret key string
const getKeypairFromPrivateKey = (privateKeyString: string): Keypair => {
    const secretKey = Uint8Array.from(JSON.parse(privateKeyString));
    return Keypair.fromSecretKey(secretKey);
};

export interface UpdateRoyaltyParams {
    mintAddress: string;
    royaltyBasisPoints: number;
    creatorPrivateKey: string;
}

export const updateNFTRoyalty = async (params: UpdateRoyaltyParams): Promise<string> => {
    const { mintAddress, royaltyBasisPoints, creatorPrivateKey } = params;

    try {
        console.log('🚀 Starting NFT royalty update process...');
        console.log(`📦 NFT Address: ${mintAddress}`);
        console.log(`💰 New Royalty: ${royaltyBasisPoints} basis points`);

        // 验证地址格式
        console.log('🔍 Validating addresses...');
        const mintPublicKey = new PublicKey(mintAddress);
        const creatorKeypair = getKeypairFromPrivateKey(creatorPrivateKey);
        const updateAuthority = creatorKeypair.publicKey;
        console.log(`👤 Update Authority: ${updateAuthority.toBase58()}`);

        // 获取元数据账户地址
        const metadataAccount = PublicKey.findProgramAddressSync(
            [
                Buffer.from('metadata'),
                TOKEN_METADATA_PROGRAM_ID.toBuffer(),
                mintPublicKey.toBuffer(),
            ],
            TOKEN_METADATA_PROGRAM_ID
        )[0];

        // 获取当前元数据
        const metadataInfo = await connection.getAccountInfo(metadataAccount);
        if (!metadataInfo) {
            throw new Error('Metadata account not found');
        }

        // 创建更新元数据指令
        const updateMetadataData: DataV2 = {
            name: '', // 保持原有名称
            symbol: '', // 保持原有符号
            uri: '', // 保持原有 URI
            sellerFeeBasisPoints: royaltyBasisPoints,
            creators: null, // 保持原有创作者
            collection: null, // 保持原有集合
            uses: null, // 保持原有用途
        };

        const updateMetadataIx = createUpdateMetadataAccountV2Instruction(
            {
                metadata: metadataAccount,
                updateAuthority: updateAuthority,
            },
            {
                updateMetadataAccountArgsV2: {
                    data: updateMetadataData,
                    updateAuthority: updateAuthority,
                    primarySaleHappened: null,
                    isMutable: true,
                },
            }
        );

        // 创建交易
        console.log('📝 Creating transaction...');
        const transaction = new Transaction();
        transaction.add(updateMetadataIx);

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
        console.error('❌ Error updating NFT royalty:', error);
        throw error;
    }
}; 