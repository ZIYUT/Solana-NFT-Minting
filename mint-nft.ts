import {
  createNft,
  fetchDigitalAsset,
  mplTokenMetadata,
} from "@metaplex-foundation/mpl-token-metadata";

import {
  airdropIfRequired,
  getExplorerLink,
} from "@solana-developers/helpers";

import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import { Connection, LAMPORTS_PER_SOL, clusterApiUrl, Keypair } from "@solana/web3.js";
import {
  generateSigner,
  keypairIdentity,
  percentAmount,
} from "@metaplex-foundation/umi";
import * as fs from 'fs';
import * as path from 'path';

// 从命令行参数获取IPFS URI
const metadataUri = process.argv[2];
if (!metadataUri) {
  console.error("请提供IPFS元数据URI作为参数");
  console.error("用法: npm run mint -- https://your-ipfs-uri/metadata.json [NFT名称]");
  process.exit(1);
}

// 获取可选的NFT名称参数
const nftName = process.argv[3] || "My NFT";

// 自定义函数获取或创建钱包
async function getOrCreateKeypair() {
  // 首先尝试从环境变量获取私钥
  if (process.env.SOLANA_PRIVATE_KEY) {
    try {
      console.log('使用环境变量中的 Solana 钱包');
      // 将 base58 或 JSON 数组字符串转换为 Uint8Array
      let secretKey;
      
      // 检测是否为 JSON 数组字符串
      if (process.env.SOLANA_PRIVATE_KEY.startsWith('[') && process.env.SOLANA_PRIVATE_KEY.endsWith(']')) {
        secretKey = Uint8Array.from(JSON.parse(process.env.SOLANA_PRIVATE_KEY));
      } else {
        // 假设是 base58 编码的私钥
        const bs58 = require('bs58');
        secretKey = Uint8Array.from(bs58.decode(process.env.SOLANA_PRIVATE_KEY));
      }
      
      const keypair = Keypair.fromSecretKey(secretKey);
      console.log(`已加载环境变量中的钱包，公钥: ${keypair.publicKey.toBase58()}`);
      return keypair;
    } catch (error) {
      console.error('从环境变量加载钱包失败，将尝试其他方法', error);
    }
  }
  
  // 其次尝试从文件加载
  const defaultPath = path.join(process.env.HOME || process.env.USERPROFILE || '', '.config', 'solana', 'id.json');
  
  try {
    // 尝试读取现有密钥文件
    if (fs.existsSync(defaultPath)) {
      console.log(`使用现有密钥文件: ${defaultPath}`);
      const keyfileContent = fs.readFileSync(defaultPath, { encoding: 'utf-8' });
      const secretKey = Uint8Array.from(JSON.parse(keyfileContent));
      return Keypair.fromSecretKey(secretKey);
    } else {
      // 创建临时钱包
      console.log('未找到密钥文件，创建临时钱包...');
      const keypair = Keypair.generate();
      
      // 可选：保存密钥到文件
      try {
        fs.mkdirSync(path.dirname(defaultPath), { recursive: true });
        fs.writeFileSync(defaultPath, JSON.stringify(Array.from(keypair.secretKey)), { encoding: 'utf-8' });
        console.log(`已保存密钥文件到: ${defaultPath}`);
      } catch (err) {
        console.log('无法保存密钥文件，将使用临时钱包');
      }
      
      return keypair;
    }
  } catch (error) {
    console.log('读取密钥文件出错，创建临时钱包');
    return Keypair.generate();
  }
}

async function mintNft() {
  // 连接到Solana网络（这里使用devnet测试网）
  const connection = new Connection(clusterApiUrl("devnet"));

  // 加载用户钱包（自定义逻辑）
  const user = await getOrCreateKeypair();

  // 确保账户有足够的SOL
  await airdropIfRequired(
    connection,
    user.publicKey,
    1 * LAMPORTS_PER_SOL,
    0.5 * LAMPORTS_PER_SOL
  );

  console.log("已加载用户:", user.publicKey.toBase58());

  // 设置Umi实例
  const umi = createUmi(connection.rpcEndpoint);
  umi.use(mplTokenMetadata());

  const umiUser = umi.eddsa.createKeypairFromSecretKey(user.secretKey);
  umi.use(keypairIdentity(umiUser));

  console.log("已为用户设置Umi实例");
  console.log(`开始铸造NFT...`);
  console.log(`使用元数据URI: ${metadataUri}`);

  // 生成NFT的铸币密钥
  const mint = generateSigner(umi);

  // 准备创建NFT的交易
  const transaction = await createNft(umi, {
    mint,
    name: nftName,
    uri: metadataUri,
    sellerFeeBasisPoints: percentAmount(0), // 0% 版税
  });

  // 发送交易并等待确认
  await transaction.sendAndConfirm(umi);

  // 获取创建的NFT详情
  const createdNft = await fetchDigitalAsset(umi, mint.publicKey);

  console.log(
    `🎉 NFT铸造成功! 地址: ${createdNft.mint.publicKey}`
  );
  
  console.log(
    `🔗 在区块链浏览器中查看: ${getExplorerLink(
      "address",
      createdNft.mint.publicKey,
      "devnet"
    )}`
  );
}

// 执行铸造函数
mintNft().catch(error => {
  console.error("铸造NFT失败:", error);
});