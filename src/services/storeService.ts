import { supabase } from '../lib/supabase';
import { StoreItem } from '../lib/types';

export const storeService = {
  async fetchStoreItems(): Promise<StoreItem[]> {
    console.log('[StoreService] Fetching store items');

    const { data } = await supabase
      .from('store_items')
      .select('*')
      .order('xp_cost', { ascending: true });

    console.log('[StoreService] Fetched store items:', data?.length || 0);
    return data || [];
  },

  async fetchOwnedItems(userId: string): Promise<Set<string>> {
    console.log('[StoreService] Fetching owned items for user:', userId);

    const { data } = await supabase
      .from('user_inventory')
      .select('item_id')
      .eq('user_id', userId);

    const ownedIds = new Set(data?.map(i => i.item_id) || []);
    console.log('[StoreService] Fetched owned items:', ownedIds.size);
    return ownedIds;
  },

  async purchaseItem(userId: string, itemId: string, itemCost: number, currentXP: number): Promise<void> {
    console.log('[StoreService] Purchasing item:', { userId, itemId, itemCost, currentXP });

    if (currentXP < itemCost) {
      throw new Error('Insufficient XP');
    }

    const { data: existingItem } = await supabase
      .from('user_inventory')
      .select('id')
      .eq('user_id', userId)
      .eq('item_id', itemId)
      .maybeSingle();

    if (existingItem) {
      console.log('[StoreService] Item already owned');
      throw new Error('Item already owned');
    }

    const { error: inventoryError } = await supabase
      .from('user_inventory')
      .insert({
        user_id: userId,
        item_id: itemId,
      });

    if (inventoryError) {
      console.error('[StoreService] Error adding item to inventory:', inventoryError);
      throw new Error(inventoryError.message);
    }

    const newXP = currentXP - itemCost;

    const { error: profileError } = await supabase
      .from('profiles')
      .update({
        xp: newXP,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId);

    if (profileError) {
      console.error('[StoreService] Error updating XP:', profileError);
      throw new Error(profileError.message);
    }

    console.log('[StoreService] Item purchased successfully, new XP:', newXP);
  },

  async equipItem(userId: string, category: string, itemId: string | null): Promise<void> {
    console.log('[StoreService] Equipping item:', { userId, category, itemId });

    const updateField = `avatar_${category}_id`;

    const { error } = await supabase
      .from('profiles')
      .update({
        [updateField]: itemId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId);

    if (error) {
      console.error('[StoreService] Error equipping item:', error);
      throw new Error(error.message);
    }

    console.log('[StoreService] Item equipped successfully');
  },
};
