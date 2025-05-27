const { Connection, Keypair, PublicKey } = require('@solana/web3.js');
const { Metaplex, keypairIdentity } = require('@metaplex-foundation/js');
const bs58 = require('bs58');
require('dotenv').config();

// 连接到 Solana 网络
const connection = new Connection(process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com', 'confirmed');

// 初始化钱包
const wallet = Keypair.fromSecretKey(
  bs58.decode(process.env.SOLANA_PRIVATE_KEY)
);

// 初始化 Metaplex
const metaplex = Metaplex.make(connection)
  .use(keypairIdentity(wallet));

async function mintNFT(metadataUri, name, description = '', sellerFeeBasisPoints = 0) {
  try {
    console.log('开始铸造NFT...');
    console.log('钱包地址:', wallet.publicKey.toString());
    console.log('元数据URI:', metadataUri);
    console.log('NFT名称:', name);
    console.log('NFT描述:', description || '无描述');
    console.log('版税比例:', sellerFeeBasisPoints / 100, '%');

    // 获取钱包余额
    const balance = await connection.getBalance(wallet.publicKey);
    console.log('钱包余额:', balance / 1e9, 'SOL');

    if (balance < 0.1 * 1e9) { // 如果余额小于 0.1 SOL
      throw new Error('钱包余额不足，请确保至少有 0.1 SOL');
    }

    // 验证版税比例
    if (sellerFeeBasisPoints < 0 || sellerFeeBasisPoints > 10000) {
      throw new Error('版税比例必须在 0-100% 之间');
    }

    // 创建 NFT
    console.log('创建NFT...');
    const { nft } = await metaplex.nfts().create({
      uri: metadataUri,
      name: name,
      description: description,
      sellerFeeBasisPoints: sellerFeeBasisPoints,
    });

    console.log('NFT创建成功!');
    console.log('NFT地址:', nft.address.toString());
    console.log('NFT元数据地址:', nft.metadataAddress.toString());

    return {
      success: true,
      nftAddress: nft.address.toString(),
      metadataAddress: nft.metadataAddress.toString(),
      sellerFeeBasisPoints: sellerFeeBasisPoints
    };
  } catch (error) {
    console.error('铸造NFT时出错:', error);
    if (error.message.includes('insufficient funds')) {
      throw new Error('钱包余额不足，请确保有足够的 SOL 支付交易费用');
    }
    throw error;
  }
}

async function transferNFT(nftAddress, toWalletAddress) {
  try {
    console.log('开始转移NFT...');
    console.log('NFT地址:', nftAddress);
    console.log('目标钱包地址:', toWalletAddress);

    // 验证目标钱包地址
    try {
      new PublicKey(toWalletAddress);
    } catch (error) {
      throw new Error('无效的目标钱包地址');
    }

    // 获取钱包余额
    const balance = await connection.getBalance(wallet.publicKey);
    console.log('钱包余额:', balance / 1e9, 'SOL');

    if (balance < 0.1 * 1e9) {
      throw new Error('钱包余额不足，请确保至少有 0.1 SOL 支付交易费用');
    }

    // 转移 NFT
    console.log('执行转移操作...');
    const { response } = await metaplex.nfts().transfer({
      nftOrSft: {
        address: new PublicKey(nftAddress),
        tokenStandard: 0
      },
      toOwner: new PublicKey(toWalletAddress)
    });

    console.log('NFT转移成功!');
    console.log('交易签名:', response.signature);

    return {
      success: true,
      signature: response.signature,
      from: wallet.publicKey.toString(),
      to: toWalletAddress
    };
  } catch (error) {
    console.error('转移NFT时出错:', error);
    if (error.message.includes('insufficient funds')) {
      throw new Error('钱包余额不足，请确保有足够的 SOL 支付交易费用');
    }
    throw error;
  }
}

async function updateNFTRoyalty(nftAddress, sellerFeeBasisPoints) {
  try {
    console.log('开始更新NFT版税...');
    console.log('NFT地址:', nftAddress);
    console.log('新版税比例:', sellerFeeBasisPoints / 100, '%');

    // 验证版税比例
    if (sellerFeeBasisPoints < 0 || sellerFeeBasisPoints > 10000) {
      throw new Error('版税比例必须在 0-100% 之间');
    }

    // 获取钱包余额
    const balance = await connection.getBalance(wallet.publicKey);
    console.log('钱包余额:', balance / 1e9, 'SOL');

    if (balance < 0.1 * 1e9) {
      throw new Error('钱包余额不足，请确保至少有 0.1 SOL');
    }

    // 获取 NFT 信息
    const nft = await metaplex.nfts().findByMint({ mintAddress: new PublicKey(nftAddress) });
    console.log('获取到NFT信息:', nft.name);

    // 更新 NFT 版税
    const { response } = await metaplex.nfts().update({
      nftOrSft: nft,
      name: nft.name,
      symbol: nft.symbol,
      uri: nft.uri,
      sellerFeeBasisPoints: sellerFeeBasisPoints,
      creators: nft.creators,
      isMutable: true
    });

    console.log('NFT版税更新成功!');
    console.log('交易签名:', response.signature);

    return {
      success: true,
      signature: response.signature,
      nftAddress: nftAddress,
      sellerFeeBasisPoints: sellerFeeBasisPoints
    };
  } catch (error) {
    console.error('更新NFT版税时出错:', error);
    if (error.message.includes('insufficient funds')) {
      throw new Error('钱包余额不足，请确保有足够的 SOL 支付交易费用');
    }
    throw error;
  }
}

module.exports = {
  mintNFT,
  transferNFT,
  updateNFTRoyalty
}; 