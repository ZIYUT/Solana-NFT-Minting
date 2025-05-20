import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config()

// Supabase configuration
const supabaseUrl = process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_KEY

// Validate configuration
if (!supabaseUrl || !supabaseKey) {
  console.error('Supabase 配置未设置. 请在 .env 文件中提供 SUPABASE_URL 和 SUPABASE_SERVICE_KEY')
  process.exit(1)
}

// Create Supabase client
export const supabase = createClient(supabaseUrl, supabaseKey)

// Define your NFT data type based on your Supabase table structure
export interface NFTData {
  id: number
  name: string
  description: string
  image_path: string
  attributes?: Array<{trait_type: string, value: string}>
  // Add other fields as needed
}

// Function to fetch NFT data by ID
export async function getNFTDataById(nftId: number): Promise<NFTData | null> {
  const { data, error } = await supabase
    .from('nfts') // Replace with your actual table name
    .select('*')
    .eq('id', nftId)
    .single()
  
  if (error) {
    console.error('从 Supabase 获取 NFT 数据失败:', error)
    return null
  }
  
  return data as NFTData
}

// Function to fetch all NFT data
export async function getAllNFTData(): Promise<NFTData[]> {
  const { data, error } = await supabase
    .from('nfts') // Replace with your actual table name
    .select('*')
  
  if (error) {
    console.error('从 Supabase 获取 NFT 数据失败:', error)
    return []
  }
  
  return data as NFTData[]
}