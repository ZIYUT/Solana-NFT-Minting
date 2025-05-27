const { createClient } = require('@supabase/supabase-js');

// 从环境变量获取Supabase配置
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

// 验证必要的环境变量
if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error('缺少必要的环境变量：SUPABASE_URL, SUPABASE_ANON_KEY');
}

// 创建Supabase客户端
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// 存储NFT数据到Supabase
async function storeNFTData(nftData) {
  try {
    const { data, error } = await supabase
      .from('nfts')
      .insert([
        {
          title: nftData.title,
          description: nftData.description,
          royalty_percentage: nftData.royalty_percentage,
          author_id: nftData.author_id,
          owner_id: nftData.owner_id,
          metadata_url: nftData.metadata_url,
          video_id: nftData.video_id
        }
      ])
      .select();

    if (error) throw error;
    return data[0];
  } catch (error) {
    console.error('存储NFT数据到Supabase失败:', error);
    throw error;
  }
}

// 通过id查询NFT数据
async function getNFTById(id) {
  try {
    const { data, error } = await supabase
      .from('nfts')
      .select('*')
      .eq('id', id)
      .single();
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('查询NFT数据失败:', error);
    throw error;
  }
}

// 通过id删除NFT数据
async function deleteNFTById(id) {
  try {
    const { error } = await supabase
      .from('nfts')
      .delete()
      .eq('id', id);
    if (error) throw error;
    return true;
  } catch (error) {
    console.error('删除NFT数据失败:', error);
    throw error;
  }
}

// 通过id修改NFT的版税
async function updateRoyaltyById(id, royalty_percentage) {
  try {
    const { data, error } = await supabase
      .from('nfts')
      .update({ royalty_percentage })
      .eq('id', id)
      .select();
    if (error) throw error;
    return data[0];
  } catch (error) {
    console.error('修改NFT版税失败:', error);
    throw error;
  }
}

module.exports = {
  storeNFTData,
  getNFTById,
  deleteNFTById,
  updateRoyaltyById
}; 