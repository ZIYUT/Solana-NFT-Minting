# NFT Minting Backend Service

这是一个用于将视频文件铸造为Solana NFT的后端服务。该服务支持将视频文件上传到IPFS，并使用IPFS的URL在Solana区块链上铸造NFT。同时，服务会将NFT数据存储在Supabase数据库中。

## 功能特点

- 支持视频文件上传到IPFS
- 自动生成NFT元数据
- 在Solana devnet上铸造NFT
- 支持自定义NFT名称和描述
- 文件大小限制：100MB
- 自动将NFT数据存储到Supabase数据库

## 环境变量配置

在项目根目录创建 `.env` 文件，并配置以下环境变量：

```env
# Pinata API配置（用于IPFS上传）
PINATA_API_KEY=your_pinata_api_key
PINATA_SECRET_KEY=your_pinata_secret_key

# Solana配置（用于NFT铸造）
SOLANA_PRIVATE_KEY=your_solana_private_key

# Supabase配置（用于数据存储）
SUPABASE_URL=your_supabase_project_url
SUPABASE_ANON_KEY=your_supabase_anon_key

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

3. **Supabase配置**：
   - 访问 [Supabase](https://supabase.com/) 创建新项目
   - 在项目设置中找到项目URL和anon key
   - 创建名为 `nfts` 的数据表，包含以下字段：
     - mint_address (text, primary key)
     - name (text)
     - description (text)
     - video_url (text)
     - metadata_url (text)
     - video_hash (text)
     - metadata_hash (text)
     - explorer_url (text)
     - created_at (timestamp with time zone)

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
    },
    "database": {
      "mint_address": "...",
      "name": "...",
      "description": "...",
      "video_url": "...",
      "metadata_url": "...",
      "video_hash": "...",
      "metadata_hash": "...",
      "explorer_url": "...",
      "created_at": "..."
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

## 前端请求参数示例

假设你用的是 `fetch` 或 `axios`，前端代码如下：

```javascript
const formData = new FormData();
formData.append("video", videoFile); // 这是用户上传的视频文件
formData.append("title", "我的NFT标题");
formData.append("description", "这是NFT的描述");
formData.append("royalty_percentage", 5); // 版税百分比，数字类型
formData.append("author_id", "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"); // 用户uuid
formData.append("video_id", "yyyyyyyy-yyyy-yyyy-yyyy-yyyyyyyyyyyy");   // 视频uuid

const response = await fetch("http://localhost:3001/api/mint-nft", {
  method: "POST",
  body: formData,
});

const result = await response.json();
console.log(result);
```

## API文档说明

### 请求地址

```
POST /api/mint-nft
```

### 请求类型

- multipart/form-data

### 请求参数

| 参数名             | 类型    | 是否必填 | 说明                |
|--------------------|---------|----------|---------------------|
| video              | file    | 是       | 视频文件            |
| title              | string  | 是       | NFT标题             |
| description        | string  | 是       | NFT描述             |
| royalty_percentage | number  | 是       | 版税百分比（如5）   |
| author_id          | string  | 是       | 作者uuid            |
| video_id           | string  | 是       | 视频uuid            |

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

## NFT转账API

### 前端请求示例

```javascript
const response = await fetch("http://localhost:3001/api/transfer-nft", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    id: "NFT数据库主键uuid",
    to_wallet_address: "目标Solana钱包地址"
  })
});
const result = await response.json();
console.log(result);
```

### API文档

#### 请求地址
```
POST /api/transfer-nft
```

#### 请求参数

| 参数名             | 类型    | 是否必填 | 说明                |
|--------------------|---------|----------|---------------------|
| id                 | string  | 是       | NFT数据库主键uuid   |
| to_wallet_address  | string  | 是       | 目标Solana钱包地址  |

#### 成功响应

```json
{
  "success": true,
  "signature": "solana链上转账交易签名"
}
```

#### 失败响应

```json
{
  "success": false,
  "error": "错误信息"
}
```

## 修改NFT版税API

### 前端请求示例

```javascript
const response = await fetch("http://localhost:3001/api/update-royalty", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    id: "NFT数据库主键uuid",
    royalty_percentage: 10 // 新的版税百分比
  })
});
const result = await response.json();
console.log(result);
```

### API文档

#### 请求地址
```
POST /api/update-royalty
```

#### 请求参数

| 参数名             | 类型    | 是否必填 | 说明                |
|--------------------|---------|----------|---------------------|
| id                 | string  | 是       | NFT数据库主键uuid   |
| royalty_percentage | number  | 是       | 新的版税百分比      |

#### 成功响应

```json
{
  "success": true,
  "data": {
    // 修改后的NFT数据库记录
  }
}
```

#### 失败响应

```json
{
  "success": false,
  "error": "错误信息"
}
```
