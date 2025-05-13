import {
  createNft,
  fetchDigitalAsset,
  mplTokenMetadata,
} from "@metaplex-foundation/mpl-token-metadata";

import {
  airdropIfRequired,
  getExplorerLink,
  getKeypairFromFile,
} from "@solana-developers/helpers";

import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import { Connection, LAMPORTS_PER_SOL, clusterApiUrl } from "@solana/web3.js";
import {
  generateSigner,
  keypairIdentity,
  percentAmount,
} from "@metaplex-foundation/umi";

// 从命令行参数获取IPFS URI
const metadataUri = process.argv[2];
if (!metadataUri) {
  console.error("请提供IPFS元数据URI作为参数");
  console.error("用法: npm run mint -- https://your-ipfs-uri/metadata.json [NFT名称]");
  process.exit(1);
}

// 获取可选的NFT名称参数
const nftName = process.argv[3] || "My NFT";

async function mintNft() {
  // 连接到Solana网络（这里使用devnet测试网）
  const connection = new Connection(clusterApiUrl("devnet"));

  // 加载用户钱包（从本地密钥文件）
  const user = await getKeypairFromFile();

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