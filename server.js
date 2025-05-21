require('dotenv').config();
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const { mintNFT, transferNFT, updateNFTRoyalty } = require('./services/nftService');
const { uploadToIPFS } = require('./services/ipfsService');
const path = require('path');

const app = express();
const upload = multer({
  dest: 'uploads/',
  limits: {
    fileSize: 100 * 1024 * 1024, // 限制文件大小为 100MB
  }
});

app.use(cors());
app.use(express.json());

// 测试路由
app.get('/', (req, res) => {
  res.send('NFT铸造服务正在运行');
});

// 上传视频并铸造NFT
app.post('/mint-nft', upload.single('video'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: '请上传视频文件' });
    }

    // 检查文件大小
    if (req.file.size > 100 * 1024 * 1024) {
      return res.status(400).json({ 
        error: '文件大小超过限制（最大 100MB）' 
      });
    }

    // 获取 NFT 名称、描述和版税比例
    const { name, description, sellerFeeBasisPoints } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: '请提供 NFT 名称' });
    }

    // 处理版税比例
    let royaltyPoints = 0;
    if (sellerFeeBasisPoints !== undefined) {
      royaltyPoints = parseInt(sellerFeeBasisPoints);
      if (isNaN(royaltyPoints) || royaltyPoints < 0 || royaltyPoints > 10000) {
        return res.status(400).json({ 
          error: '版税比例必须在 0-100% 之间' 
        });
      }
    }

    console.log('收到视频文件:', req.file.originalname);
    console.log('文件大小:', (req.file.size / (1024 * 1024)).toFixed(2), 'MB');
    console.log('NFT名称:', name);
    console.log('NFT描述:', description || '无描述');
    console.log('版税比例:', royaltyPoints / 100, '%');

    // 上传到IPFS
    console.log('开始上传到IPFS...');
    const ipfsHash = await uploadToIPFS(req.file.path);
    console.log('IPFS上传成功，Hash:', ipfsHash);

    // 创建元数据
    const metadataUri = `https://gateway.pinata.cloud/ipfs/${ipfsHash}`;
    console.log('元数据URI:', metadataUri);

    // 铸造NFT
    console.log('开始铸造NFT...');
    const result = await mintNFT(metadataUri, name, description, royaltyPoints);
    console.log('NFT铸造成功:', result);

    res.json({
      success: true,
      ipfsHash,
      nftAddress: result.nftAddress,
      metadataAddress: result.metadataAddress,
      name,
      description,
      sellerFeeBasisPoints: royaltyPoints
    });
  } catch (error) {
    console.error('处理请求时出错:', error);
    res.status(500).json({ 
      error: error.message,
      details: error.stack
    });
  }
});

// 添加转移 NFT 的端点
app.post('/transfer-nft', async (req, res) => {
  try {
    const { nftAddress, toWalletAddress } = req.body;

    if (!nftAddress || !toWalletAddress) {
      return res.status(400).json({ 
        error: '请提供 NFT 地址和目标钱包地址' 
      });
    }

    const result = await transferNFT(nftAddress, toWalletAddress);
    res.json(result);
  } catch (error) {
    console.error('转移NFT时出错:', error);
    res.status(500).json({ 
      error: error.message,
      details: error.stack
    });
  }
});

// 添加更新 NFT 版税的端点
app.post('/update-nft-royalty', async (req, res) => {
  try {
    const { nftAddress, sellerFeeBasisPoints } = req.body;

    if (!nftAddress || sellerFeeBasisPoints === undefined) {
      return res.status(400).json({ 
        error: '请提供 NFT 地址和版税比例' 
      });
    }

    const result = await updateNFTRoyalty(nftAddress, sellerFeeBasisPoints);
    res.json(result);
  } catch (error) {
    console.error('更新NFT版税时出错:', error);
    res.status(500).json({ 
      error: error.message,
      details: error.stack
    });
  }
});

// 动态端口分配
const startServer = (port) => {
  app.listen(port, () => {
    console.log(`服务器运行在端口 ${port}`);
  }).on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.log(`端口 ${port} 已被占用，尝试端口 ${port + 1}`);
      startServer(port + 1);
    } else {
      console.error('服务器启动错误:', err);
    }
  });
};

startServer(3000); 