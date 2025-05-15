const axios = require('axios');
const fs = require('fs');
const FormData = require('form-data');
const path = require('path');
require('dotenv').config(); // 加载 .env 文件中的环境变量

// 从环境变量获取 Pinata API 凭据
const PINATA_API_KEY = process.env.PINATA_API_KEY;
const PINATA_SECRET_KEY = process.env.PINATA_SECRET_KEY;

// 验证 API 密钥是否存在
if (!PINATA_API_KEY || !PINATA_SECRET_KEY) {
  console.error('错误: Pinata API 密钥未设置。请在 .env 文件中提供 PINATA_API_KEY 和 PINATA_SECRET_KEY');
  process.exit(1);
}

// 用于上传文件到 IPFS 的函数
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

// 上传NFT元数据JSON到IPFS
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

async function main() {
  // 检查命令行参数
  if (process.argv.length < 3) {
    console.error('请提供图像文件路径');
    console.error('用法: node upload-to-ipfs.js <图像文件路径> [名称] [描述]');
    process.exit(1);
  }

  const imagePath = process.argv[2];
  const name = process.argv[3] || 'My NFT';
  const description = process.argv[4] || '这是我的Solana NFT';

  // 1. 先上传图像到IPFS
  console.log('上传图像到IPFS...');
  const imageHash = await uploadFileToIPFS(imagePath);
  const imageUrl = `https://gateway.pinata.cloud/ipfs/${imageHash}`;
  console.log(`图像上传成功: ${imageUrl}`);

  // 2. 创建NFT元数据
  const metadata = {
    name: name,
    description: description,
    image: imageUrl,
    attributes: [
      {
        trait_type: 'Creator',
        value: 'Solana NFT Minter'
      },
      {
        trait_type: 'Created',
        value: new Date().toISOString()
      }
    ]
  };

  // 3. 上传元数据到IPFS
  console.log('上传元数据到IPFS...');
  const metadataHash = await uploadMetadataToIPFS(metadata);
  const metadataUrl = `https://gateway.pinata.cloud/ipfs/${metadataHash}`;
  console.log(`元数据上传成功: ${metadataUrl}`);
  
  console.log('\n=== 准备铸造NFT ===');
  console.log(`使用以下命令铸造NFT:`);
  console.log(`npm run mint -- ${metadataUrl} "${name}"`);
}

main().catch(error => {
  console.error('操作失败:', error);
});