import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { StoreItem } from '../../lib/types';
import { ShoppingBag, Zap, Check } from 'lucide-react';

export function Store() {
  const { profile, refreshProfile } = useAuth();
  const [items, setItems] = useState<StoreItem[]>([]);
  const [ownedItemIds, setOwnedItemIds] = useState<Set<string>>(new Set());
  const [selectedCategory, setSelectedCategory] = useState<'hat' | 'shirt' | 'pants' | 'accessory'>('hat');
  const [equippedItems, setEquippedItems] = useState({
    hat: profile?.avatar_hat_id,
    shirt: profile?.avatar_shirt_id,
    pants: profile?.avatar_pants_id,
    accessory: profile?.avatar_accessory_id,
  });

  useEffect(() => {
    fetchStoreItems();
    fetchOwnedItems();
  }, []);

  useEffect(() => {
    if (profile) {
      setEquippedItems({
        hat: profile.avatar_hat_id,
        shirt: profile.avatar_shirt_id,
        pants: profile.avatar_pants_id,
        accessory: profile.avatar_accessory_id,
      });
    }
  }, [profile]);

  const fetchStoreItems = async () => {
    const { data } = await supabase
      .from('store_items')
      .select('*')
      .order('xp_cost', { ascending: true });

    if (data) setItems(data);
  };

  const fetchOwnedItems = async () => {
    if (!profile) return;

    const { data } = await supabase
      .from('user_inventory')
      .select('item_id')
      .eq('user_id', profile.id);

    if (data) {
      setOwnedItemIds(new Set(data.map(i => i.item_id)));
    }
  };

  const purchaseItem = async (item: StoreItem) => {
    if (!profile || profile.xp < item.xp_cost) return;

    const { error: inventoryError } = await supabase
      .from('user_inventory')
      .insert({
        user_id: profile.id,
        item_id: item.id,
      });

    if (!inventoryError) {
      await supabase
        .from('profiles')
        .update({ xp: profile.xp - item.xp_cost })
        .eq('id', profile.id);

      await refreshProfile();
      fetchOwnedItems();
    }
  };

  const equipItem = async (item: StoreItem) => {
    if (!profile) return;

    const updateField = `avatar_${item.category}_id`;
    const isEquipped = equippedItems[item.category] === item.id;

    await supabase
      .from('profiles')
      .update({ [updateField]: isEquipped ? null : item.id })
      .eq('id', profile.id);

    await refreshProfile();
  };

  const categories = [
    { id: 'hat', label: 'Hats', emoji: '🎩' },
    { id: 'shirt', label: 'Shirts', emoji: '👕' },
    { id: 'pants', label: 'Pants', emoji: '👖' },
    { id: 'accessory', label: 'Accessories', emoji: '👓' },
  ];

  const filteredItems = items.filter(item => item.category === selectedCategory);

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Avatar Store</h1>
        <div className="flex items-center space-x-2 bg-gradient-to-r from-yellow-400 to-orange-500 px-6 py-3 rounded-xl">
          <Zap className="w-6 h-6 text-white" />
          <span className="font-bold text-white text-xl">{profile?.xp || 0} XP</span>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setSelectedCategory(cat.id as any)}
            className={`p-4 rounded-xl transition-all ${
              selectedCategory === cat.id
                ? 'bg-blue-600 text-white shadow-lg scale-105'
                : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
            }`}
          >
            <div className="text-3xl mb-2">{cat.emoji}</div>
            <div className="font-semibold">{cat.label}</div>
          </button>
        ))}
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredItems.map((item) => {
            const isOwned = ownedItemIds.has(item.id);
            const isEquipped = equippedItems[item.category] === item.id;
            const canAfford = (profile?.xp || 0) >= item.xp_cost;

            return (
              <div
                key={item.id}
                className={`border-2 rounded-xl p-6 transition-all ${
                  isEquipped
                    ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                    : 'border-gray-200 dark:border-gray-700 hover:shadow-lg'
                }`}
              >
                <div className="aspect-square bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-600 rounded-lg mb-4 flex items-center justify-center">
                  <ShoppingBag className="w-16 h-16 text-gray-400 dark:text-gray-500" />
                </div>

                <h3 className="font-bold text-lg text-gray-900 dark:text-white mb-2">{item.name}</h3>

                <div className="flex items-center space-x-2 mb-4">
                  <Zap className="w-4 h-4 text-orange-500" />
                  <span className="font-semibold text-gray-900 dark:text-white">{item.xp_cost} XP</span>
                </div>

                {!isOwned ? (
                  <button
                    onClick={() => purchaseItem(item)}
                    disabled={!canAfford}
                    className={`w-full py-2 rounded-lg font-medium transition-colors ${
                      canAfford
                        ? 'bg-blue-600 hover:bg-blue-700 text-white'
                        : 'bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                    }`}
                  >
                    {canAfford ? 'Purchase' : 'Not Enough XP'}
                  </button>
                ) : (
                  <button
                    onClick={() => equipItem(item)}
                    className={`w-full py-2 rounded-lg font-medium transition-colors ${
                      isEquipped
                        ? 'bg-green-600 hover:bg-green-700 text-white'
                        : 'bg-gray-600 hover:bg-gray-700 text-white'
                    }`}
                  >
                    {isEquipped ? (
                      <span className="flex items-center justify-center space-x-2">
                        <Check className="w-4 h-4" />
                        <span>Equipped</span>
                      </span>
                    ) : (
                      'Equip'
                    )}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
