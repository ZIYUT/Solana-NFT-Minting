const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
require('dotenv').config();

// 检查环境变量
console.log('环境变量检查:');
console.log('PINATA_API_KEY:', process.env.PINATA_API_KEY ? '已设置' : '未设置');
console.log('PINATA_SECRET_KEY:', process.env.PINATA_SECRET_KEY ? '已设置' : '未设置');
console.log('SOLANA_PRIVATE_KEY:', process.env.SOLANA_PRIVATE_KEY ? '已设置' : '未设置');

const { uploadToIPFS, mintNFT } = require('./services/nftService');

const app = express();
// 尝试使用环境变量中的端口，如果失败则尝试其他端口
let port = parseInt(process.env.PORT) || 3001;
const maxPort = 3010; // 最大尝试端口号

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

// 根路径处理
app.get('/', (req, res) => {
  res.json({
    service: 'NFT Minting Backend Service',
    version: '1.0.0',
    endpoints: {
      mint: {
        path: '/api/mint-nft',
        method: 'POST',
        description: '上传视频并铸造NFT'
      },
      health: {
        path: '/health',
        method: 'GET',
        description: '服务健康检查'
      }
    },
    documentation: '请参考 README.md 获取详细使用说明'
  });
});

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

// 启动服务器，如果端口被占用则尝试其他端口
const startServer = (port) => {
  app.listen(port)
    .on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        console.log(`端口 ${port} 已被占用，尝试下一个端口...`);
        if (port < maxPort) {
          startServer(port + 1);
        } else {
          console.error(`无法找到可用端口，已尝试端口 ${port}`);
          process.exit(1);
        }
      } else {
        console.error('服务器启动失败:', err);
        process.exit(1);
      }
    })
    .on('listening', () => {
      console.log(`服务器运行在 http://localhost:${port}`);
    });
};

startServer(port); 