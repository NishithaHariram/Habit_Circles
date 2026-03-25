import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { StoreItem } from '../../lib/types';
import { Zap, Check, Crown, Shirt, Package } from 'lucide-react';

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

  const getItemIcon = (category: string) => {
    switch (category) {
      case 'hat':
        return Crown;
      case 'shirt':
        return Shirt;
      case 'pants':
        return Package;
      case 'accessory':
        return Package;
      default:
        return Package;
    }
  };

  const getItemGradient = (category: string, itemName: string) => {
    const rare = itemName.toLowerCase().includes('legendary') || itemName.toLowerCase().includes('epic');

    switch (category) {
      case 'hat':
        return rare
          ? 'from-purple-400 via-pink-400 to-red-400'
          : 'from-yellow-300 via-orange-300 to-red-300';
      case 'shirt':
        return rare
          ? 'from-indigo-400 via-purple-400 to-pink-400'
          : 'from-blue-300 via-cyan-300 to-teal-300';
      case 'pants':
        return rare
          ? 'from-green-400 via-emerald-400 to-teal-400'
          : 'from-slate-300 via-gray-300 to-zinc-300';
      case 'accessory':
        return rare
          ? 'from-amber-400 via-yellow-400 to-orange-400'
          : 'from-pink-300 via-rose-300 to-red-300';
      default:
        return 'from-gray-300 via-slate-300 to-gray-400';
    }
  };

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
            const ItemIcon = getItemIcon(item.category);
            const gradient = getItemGradient(item.category, item.name);
            const isRare = item.name.toLowerCase().includes('legendary') || item.name.toLowerCase().includes('epic');

            return (
              <div
                key={item.id}
                style={{ perspective: '800px' }}
                className="group"
              >
                <div
                  className={`relative border-2 rounded-xl p-6 transition-all duration-300 transform hover:scale-105 hover:-translate-y-2 ${
                    isEquipped
                      ? 'border-green-500 bg-green-50 dark:bg-green-900/20 shadow-lg shadow-green-500/20'
                      : 'border-gray-200 dark:border-gray-700 hover:shadow-2xl hover:shadow-gray-400/30 dark:hover:shadow-gray-900/50'
                  } ${isRare ? 'ring-2 ring-purple-400 ring-opacity-50 animate-pulse' : ''}`}
                >
                  {isOwned && (
                    <div className="absolute top-3 right-3 bg-green-500 text-white text-xs font-bold px-2 py-1 rounded-full shadow-lg z-10">
                      OWNED
                    </div>
                  )}

                  {isRare && (
                    <div className="absolute top-3 left-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xs font-bold px-2 py-1 rounded-full shadow-lg z-10">
                      RARE
                    </div>
                  )}

                  <div
                    className={`relative aspect-square bg-gradient-to-br ${gradient} rounded-lg mb-4 flex items-center justify-center overflow-hidden shadow-inner transition-transform duration-300 group-hover:rotate-y-6`}
                    style={{
                      boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.15), 0 8px 16px rgba(0,0,0,0.2)',
                      transform: 'translateZ(20px)',
                    }}
                  >
                    <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />

                    <div
                      className="relative z-10 transition-transform duration-300 group-hover:scale-110"
                      style={{
                        filter: 'drop-shadow(0px 5px 10px rgba(0,0,0,0.3))',
                      }}
                    >
                      {item.image_url ? (
                        <img
                          src={item.image_url}
                          alt={item.name}
                          className="w-32 h-32 object-contain"
                        />
                      ) : (
                        <ItemIcon className="w-32 h-32 text-white opacity-90" strokeWidth={1.5} />
                      )}
                    </div>

                    <div className="absolute inset-0 bg-gradient-to-tr from-white/20 to-transparent opacity-50" />
                    <div
                      className="absolute top-2 right-2 w-16 h-16 bg-white rounded-full opacity-20 blur-2xl"
                      style={{ filter: 'blur(20px)' }}
                    />
                  </div>

                  <h3 className="font-bold text-lg text-gray-900 dark:text-white mb-2 text-center">
                    {item.name}
                  </h3>

                  <div className="flex items-center justify-center space-x-2 mb-4">
                    <Zap className="w-5 h-5 text-orange-500" />
                    <span className="font-bold text-gray-900 dark:text-white text-lg">{item.xp_cost} XP</span>
                  </div>

                  {!isOwned ? (
                    <button
                      onClick={() => purchaseItem(item)}
                      disabled={!canAfford}
                      className={`w-full py-3 rounded-lg font-bold transition-all duration-200 transform active:scale-95 ${
                        canAfford
                          ? 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-lg hover:shadow-xl'
                          : 'bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                      }`}
                    >
                      {canAfford ? 'Purchase' : 'Not Enough XP'}
                    </button>
                  ) : (
                    <button
                      onClick={() => equipItem(item)}
                      className={`w-full py-3 rounded-lg font-bold transition-all duration-200 transform active:scale-95 ${
                        isEquipped
                          ? 'bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white shadow-lg hover:shadow-xl'
                          : 'bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-700 hover:to-gray-800 text-white shadow-lg hover:shadow-xl'
                      }`}
                    >
                      {isEquipped ? (
                        <span className="flex items-center justify-center space-x-2">
                          <Check className="w-5 h-5" />
                          <span>Equipped</span>
                        </span>
                      ) : (
                        'Equip'
                      )}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
