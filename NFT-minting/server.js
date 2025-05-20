const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const { uploadToIPFS, mintNFT } = require('./services/nftService');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3001;

// 中间件配置
app.use(cors());
app.use(express.json());

// 配置文件上传
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 100 * 1024 * 1024 // 限制100MB
  }
});

// 创建上传目录
const fs = require('fs');
if (!fs.existsSync('uploads')) {
  fs.mkdirSync('uploads');
}

// API路由
app.post('/api/mint-nft', upload.single('video'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: '请上传视频文件' });
    }

    const { name, description } = req.body;
    
    // 上传到IPFS
    const ipfsResult = await uploadToIPFS(req.file.path, {
      name: name || 'My NFT',
      description: description || '这是一个视频NFT'
    });

    // 铸造NFT
    const mintResult = await mintNFT(ipfsResult.metadataUrl, name);

    // 清理上传的文件
    fs.unlinkSync(req.file.path);

    res.json({
      success: true,
      data: {
        ipfs: ipfsResult,
        nft: mintResult
      }
    });
  } catch (error) {
    console.error('Mint NFT失败:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 健康检查端点
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.listen(port, () => {
  console.log(`服务器运行在 http://localhost:${port}`);
}); 