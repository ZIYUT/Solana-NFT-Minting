# NFT Minting Backend Service

这是一个用于将视频文件铸造为Solana NFT的后端服务。该服务支持将视频文件上传到IPFS，并使用IPFS的URL在Solana区块链上铸造NFT。

## 功能特点

- 支持视频文件上传到IPFS
- 自动生成NFT元数据
- 在Solana devnet上铸造NFT
- 支持自定义NFT名称和描述
- 文件大小限制：100MB

## 环境变量配置

在项目根目录创建 `.env` 文件，并配置以下环境变量：

```env
# Pinata API配置（用于IPFS上传）
PINATA_API_KEY=your_pinata_api_key
PINATA_SECRET_KEY=your_pinata_secret_key

# Solana配置（用于NFT铸造）
SOLANA_PRIVATE_KEY=your_solana_private_key

# 服务器配置
PORT=3001
```

### 获取必要的API密钥

1. **Pinata API密钥**：

   - 访问 [Pinata](https://app.pinata.cloud/) 注册账号
   - 在开发者设置中创建API密钥
   - 复制API Key和Secret Key到环境变量中

2. **Solana私钥**：
   - 使用Solana CLI创建新钱包：`solana-keygen new`
   - 或使用现有的Solana钱包私钥
   - 确保钱包中有足够的SOL（在devnet上）

## 安装和运行

1. 安装依赖：

```bash
npm install
```

2. 启动服务：

```bash
# 开发模式
npm run dev

# 生产模式
npm start
```

## API使用示例

### 铸造NFT

```javascript
// 前端代码示例
const formData = new FormData();
formData.append("video", videoFile);
formData.append("name", "My Video NFT");
formData.append("description", "This is my video NFT");

const response = await fetch("http://localhost:3001/api/mint-nft", {
  method: "POST",
  body: formData,
});

const result = await response.json();
```

### API响应格式

成功响应：

```json
{
  "success": true,
  "data": {
    "ipfs": {
      "videoUrl": "https://gateway.pinata.cloud/ipfs/...",
      "metadataUrl": "https://gateway.pinata.cloud/ipfs/...",
      "videoHash": "...",
      "metadataHash": "..."
    },
    "nft": {
      "mintAddress": "...",
      "explorerUrl": "https://explorer.solana.com/address/..."
    }
  }
}
```

错误响应：

```json
{
  "success": false,
  "error": "错误信息"
}
```

## 注意事项

1. 确保上传的视频文件大小不超过100MB
2. 确保Solana钱包中有足够的SOL支付gas费
3. 服务默认使用Solana devnet网络
4. 上传到IPFS的文件会永久保存，请确保内容符合相关规定

## 健康检查

可以通过访问 `/health` 端点检查服务状态：

```bash
curl http://localhost:3001/health
```

预期响应：

```json
{
  "status": "ok"
}
```
