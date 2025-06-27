import { Keypair } from '@solana/web3.js';
import bs58 from 'bs58';

/**
 * 从私钥获取Keypair
 * @param privateKey 私钥（可以是base58字符串或数字数组）
 * @returns Solana Keypair
 */
export const getKeypairFromPrivateKey = (privateKey: string | number[]): Keypair => {
    try {
        // 如果私钥是字符串，尝试解析为base58
        if (typeof privateKey === 'string') {
            const decodedKey = bs58.decode(privateKey);
            return Keypair.fromSecretKey(decodedKey);
        }
        
        // 如果私钥是数组，直接使用
        if (Array.isArray(privateKey)) {
            return Keypair.fromSecretKey(new Uint8Array(privateKey));
        }

        throw new Error('Invalid private key format');
    } catch (error) {
        console.error('Error creating keypair from private key:', error);
        throw new Error('Invalid private key format');
    }
}; 