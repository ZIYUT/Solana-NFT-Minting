const pinataSDK = require('@pinata/sdk');
const fs = require('fs');

const pinata = new pinataSDK(
  process.env.PINATA_API_KEY,
  process.env.PINATA_SECRET_KEY
);

async function uploadToIPFS(filePath) {
  try {
    const stream = fs.createReadStream(filePath);
    const options = {
      pinataMetadata: {
        name: "NFT Video",
        keyvalues: {
          type: "video"
        }
      }
    };
    const result = await pinata.pinFileToIPFS(stream, options);
    return result.IpfsHash;
  } catch (error) {
    console.error('上传到IPFS时出错:', error);
    throw error;
  }
}

module.exports = {
  uploadToIPFS
}; 