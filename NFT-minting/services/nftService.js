const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const {
  createNft,
  fetchDigitalAsset,
  mplTokenMetadata,
} = require("@metaplex-foundation/mpl-token-metadata");
const {
  createUmi,
} = require("@metaplex-foundation/umi-bundle-defaults");
const { Connection, LAMPORTS_PER_SOL, clusterApiUrl, Keypair } = require("@solana/web3.js");
const {
  generateSigner,
  keypairIdentity,
  percentAmount,
} = require("@metaplex-foundation/umi");
const bs58 = require('bs58');

// 从环境变量获取配置
const PINATA_API_KEY = process.env.PINATA_API_KEY;
const PINATA_SECRET_KEY = process.env.PINATA_SECRET_KEY;
const SOLANA_PRIVATE_KEY = process.env.SOLANA_PRIVATE_KEY;

// 验证必要的环境变量
if (!PINATA_API_KEY || !PINATA_SECRET_KEY || !SOLANA_PRIVATE_KEY) {
  throw new Error('缺少必要的环境变量：PINATA_API_KEY, PINATA_SECRET_KEY, SOLANA_PRIVATE_KEY');
}

// 上传文件到IPFS
async function uploadFileToIPFS(filePath) {
  const data = new FormData();
  data.append('file', fs.createReadStream(filePath));

  try {
    const res = await axios.post('https://api.pinata.cloud/pinning/pinFileToIPFS', data, {
      maxContentLength: 'Infinity',
      headers: {
        'Content-Type': `multipart/form-data; boundary=${data._boundary}`,
        'pinata_api_key': PINATA_API_KEY,
        'pinata_secret_api_key': PINATA_SECRET_KEY,
      },
    });
    return res.data.IpfsHash;
  } catch (error) {
    console.error('上传文件到IPFS失败:', error);
    throw error;
  }
}

// 上传元数据到IPFS
async function uploadMetadataToIPFS(metadata) {
  try {
    const res = await axios.post('https://api.pinata.cloud/pinning/pinJSONToIPFS', metadata, {
      headers: {
        'pinata_api_key': PINATA_API_KEY,
        'pinata_secret_api_key': PINATA_SECRET_KEY,
      },
    });
    return res.data.IpfsHash;
  } catch (error) {
    console.error('上传元数据到IPFS失败:', error);
    throw error;
  }
}

// 获取Solana钱包
async function getKeypair() {
  try {
    const secretKey = Uint8Array.from(JSON.parse(SOLANA_PRIVATE_KEY));
    return Keypair.fromSecretKey(secretKey);
  } catch (error) {
    console.error('加载钱包失败:', error);
    throw error;
  }
}

// 上传到IPFS的主函数
async function uploadToIPFS(filePath, metadata) {
  // 1. 上传视频文件到IPFS
  console.log('上传视频到IPFS...');
  const videoHash = await uploadFileToIPFS(filePath);
  const videoUrl = `https://gateway.pinata.cloud/ipfs/${videoHash}`;
  console.log(`视频上传成功: ${videoUrl}`);

  // 2. 创建并上传元数据
  const nftMetadata = {
    name: metadata.name,
    description: metadata.description,
    image: videoUrl,
    attributes: [
      {
        trait_type: 'Creator',
        value: 'Video NFT Minter'
      },
      {
        trait_type: 'Created',
        value: new Date().toISOString()
      }
    ]
  };

  console.log('上传元数据到IPFS...');
  const metadataHash = await uploadMetadataToIPFS(nftMetadata);
  const metadataUrl = `https://gateway.pinata.cloud/ipfs/${metadataHash}`;
  console.log(`元数据上传成功: ${metadataUrl}`);

  return {
    videoUrl,
    metadataUrl,
    videoHash,
    metadataHash
  };
}

// 铸造NFT的主函数
async function mintNFT(metadataUri, name) {
  // 连接到Solana网络（使用devnet测试网）
  const connection = new Connection(clusterApiUrl("devnet"));
  
  // 加载钱包
  const user = await getKeypair();
  
  // 设置Umi实例
  const umi = createUmi(connection.rpcEndpoint);
  umi.use(mplTokenMetadata());

  const umiUser = umi.eddsa.createKeypairFromSecretKey(user.secretKey);
  umi.use(keypairIdentity(umiUser));

  console.log("开始铸造NFT...");
  console.log(`使用元数据URI: ${metadataUri}`);

  // 生成NFT的铸币密钥
  const mint = generateSigner(umi);

  // 准备创建NFT的交易
  const transaction = await createNft(umi, {
    mint,
    name: name || "Video NFT",
    uri: metadataUri,
    sellerFeeBasisPoints: percentAmount(0), // 0% 版税
  });

  // 发送交易并等待确认
  await transaction.sendAndConfirm(umi);

  // 获取创建的NFT详情
  const createdNft = await fetchDigitalAsset(umi, mint.publicKey);

  return {
    mintAddress: createdNft.mint.publicKey,
    explorerUrl: `https://explorer.solana.com/address/${createdNft.mint.publicKey}?cluster=devnet`
  };
}

module.exports = {
  uploadToIPFS,
  mintNFT
}; 