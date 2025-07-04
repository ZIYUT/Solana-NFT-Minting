import { supabase } from './supabase';

export async function createTransaction(orderId: string, userAddress: string, amount: number) {
  const { data, error } = await supabase
    .from('transactions')
    .insert([{ order_id: orderId, user_address: userAddress, amount, status: 'pending' }]);
  if (error) throw error;
  return data ? data[0] : null;
}

export async function updateTransactionStatus(orderId: string, status: string, mintAddress?: string) {
  const { data, error } = await supabase
    .from('transactions')
    .update({ status, mint_address: mintAddress, updated_at: new Date().toISOString() })
    .eq('order_id', orderId);
  if (error) throw error;
  return data ? data[0] : null;
}

export async function getTransactionStatus(orderId: string) {
  const { data, error } = await supabase
    .from('transactions')
    .select('status, mint_address')
    .eq('order_id', orderId)
    .single();
  if (error) throw error;
  return data;
} 