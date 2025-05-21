# Solana NFT 铸造服务

这是一个基于 Solana 区块链的 NFT 铸造服务，支持视频 NFT 的铸造、转移和版税设置。

## 功能特点

- 视频 NFT 铸造
- NFT 转移
- 版税设置（0-100%）
- IPFS 存储支持
- 文件大小限制（最大 100MB）

## 环境要求

- Node.js 14+
- Solana CLI
- 足够的 SOL 代币（建议至少 0.1 SOL）

## 安装步骤

1. 克隆项目并安装依赖：

```bash
git clone [项目地址]
cd NFT-minting
npm install
```

2. 配置环境变量：
   创建 `.env` 文件并添加以下配置：

```
SOLANA_RPC_URL=https://api.devnet.solana.com
SOLANA_PRIVATE_KEY=你的私钥
PINATA_API_KEY=你的Pinata API密钥
PINATA_SECRET_KEY=你的Pinata密钥
```

## API 接口说明

### 1. 铸造 NFT

**请求方式**：POST `/mint-nft`

**参数**：

- `video`: 视频文件（必需）
- `name`: NFT 名称（必需）
- `description`: NFT 描述（可选）
- `sellerFeeBasisPoints`: 版税比例（可选，0-10000，默认 0）

**示例**：

```bash
curl -X POST \
  -F "video=@/path/to/your/video.mp4" \
  -F "name=我的NFT" \
  -F "description=这是一个测试NFT" \
  -F "sellerFeeBasisPoints=500" \
  http://localhost:3000/mint-nft
```

### 2. 转移 NFT

**请求方式**：POST `/transfer-nft`

**参数**：

- `nftAddress`: NFT 地址（必需）
- `toWalletAddress`: 接收方钱包地址（必需）

**示例**：

```bash
curl -X POST \
  -H "Content-Type: application/json" \
  -d '{
    "nftAddress": "NFT地址",
    "toWalletAddress": "接收方钱包地址"
  }' \
  http://localhost:3000/transfer-nft
```

### 3. 更新 NFT 版税

**请求方式**：POST `/update-nft-royalty`

**参数**：

- `nftAddress`: NFT 地址（必需）
- `sellerFeeBasisPoints`: 新版税比例（必需，0-10000）

**示例**：

```bash
curl -X POST \
  -H "Content-Type: application/json" \
  -d '{
    "nftAddress": "NFT地址",
    "sellerFeeBasisPoints": 1000
  }' \
  http://localhost:3000/update-nft-royalty
```

## 版税说明

- 版税比例使用 basis points 表示
- 1 basis point = 0.01%
- 例如：
  - 500 = 5%
  - 1000 = 10%
  - 2500 = 25%
  - 10000 = 100%

## 注意事项

1. 确保钱包中有足够的 SOL 支付交易费用（建议至少 0.1 SOL）
2. 视频文件大小限制为 100MB
3. 版税比例必须在 0-100% 之间
4. 只有 NFT 所有者才能更新版税设置
5. 所有操作都在 Solana devnet 上进行

## 错误处理

服务会返回详细的错误信息，包括：

- 文件大小超限
- 钱包余额不足
- 无效的钱包地址
- 无效的版税比例
- 交易失败原因

## 查看交易

所有交易都可以在 Solana Explorer 上查看：

- Devnet: https://explorer.solana.com/?cluster=devnet
- Mainnet: https://explorer.solana.com/

## 许可证

MIT License
