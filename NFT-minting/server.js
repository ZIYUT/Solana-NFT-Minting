const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const { uploadToIPFS, mintNFT, transferNFT } = require('./services/nftService');
const { storeNFTData, getNFTById, deleteNFTById, updateRoyaltyById } = require('./services/supabaseService');
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

    const { title, description, royalty_percentage, author_id, video_id } = req.body;
    if (!title || !description || !royalty_percentage || !author_id || !video_id) {
      return res.status(400).json({ error: '缺少必要参数' });
    }

    // 上传到IPFS
    const ipfsResult = await uploadToIPFS(req.file.path, {
      name: title,
      description: description
    });

    // 铸造NFT
    const mintResult = await mintNFT(ipfsResult.metadataUrl, title);

    // 组装要存储到Supabase的数据
    const nftData = {
      title,
      description,
      royalty_percentage: Number(royalty_percentage),
      author_id,
      owner_id: author_id, // mint时owner和author一致
      metadata_url: ipfsResult.metadataUrl,
      video_id
    };

    const storedNFT = await storeNFTData(nftData);

    // 清理上传的文件
    fs.unlinkSync(req.file.path);

    res.json({
      success: true,
      data: {
        ipfs: ipfsResult,
        nft: mintResult,
        database: storedNFT
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

// NFT转账API
app.post('/api/transfer-nft', async (req, res) => {
  try {
    const { id, to_wallet_address } = req.body;
    if (!id || !to_wallet_address) {
      return res.status(400).json({ error: '缺少必要参数' });
    }

    // 查询NFT信息
    const nft = await getNFTById(id);
    if (!nft || !nft.metadata_url) {
      return res.status(404).json({ error: '未找到对应NFT' });
    }
    if (!nft.nft_address && !nft.mint_address) {
      return res.status(400).json({ error: 'NFT没有链上地址' });
    }
    const mintAddress = nft.nft_address || nft.mint_address;

    // 执行链上转账
    const transferResult = await transferNFT(mintAddress, to_wallet_address);

    // 删除数据库记录
    await deleteNFTById(id);

    res.json({
      success: true,
      signature: transferResult.signature
    });
  } catch (error) {
    console.error('Transfer NFT失败:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 修改NFT版税API
app.post('/api/update-royalty', async (req, res) => {
  try {
    const { id, royalty_percentage } = req.body;
    if (!id || royalty_percentage === undefined) {
      return res.status(400).json({ error: '缺少必要参数' });
    }
    const updated = await updateRoyaltyById(id, Number(royalty_percentage));
    res.json({
      success: true,
      data: updated
    });
  } catch (error) {
    console.error('修改NFT版税失败:', error);
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