import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useAppState } from '../../contexts/AppStateContext';
import { storeService } from '../../services/storeService';
import { StoreItem } from '../../lib/types';
import { Zap, Check, Crown, Shirt, Package } from 'lucide-react';

export function Store() {
  const { profile, refreshProfile } = useAuth();
  const { state, updateStoreItems, updateOwnedItemIds } = useAppState();
  const [selectedCategory, setSelectedCategory] = useState<'hat' | 'shirt' | 'pants' | 'accessory'>('hat');
  const [equippedItems, setEquippedItems] = useState({
    hat: profile?.avatar_hat_id,
    shirt: profile?.avatar_shirt_id,
    pants: profile?.avatar_pants_id,
    accessory: profile?.avatar_accessory_id,
  });
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    fetchData();
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

  const fetchData = async () => {
    console.log('[Store] Fetching store data');

    try {
      const items = await storeService.fetchStoreItems();
      updateStoreItems(items);

      if (profile) {
        const ownedIds = await storeService.fetchOwnedItems(profile.id);
        updateOwnedItemIds(ownedIds);
      }
    } catch (err) {
      console.error('[Store] Error fetching data:', err);
    }
  };

  const purchaseItem = async (item: StoreItem) => {
    console.log('[Store] Purchasing item:', item.name);

    if (!profile) {
      console.error('[Store] No profile found');
      return;
    }

    if (profile.xp < item.xp_cost) {
      setError('Insufficient XP');
      return;
    }

    setError('');
    setSuccessMessage('');

    try {
      await storeService.purchaseItem(profile.id, item.id, item.xp_cost, profile.xp);

      await refreshProfile();

      const ownedIds = await storeService.fetchOwnedItems(profile.id);
      updateOwnedItemIds(ownedIds);

      setSuccessMessage(`Successfully purchased ${item.name}!`);
      setTimeout(() => setSuccessMessage(''), 3000);

      console.log('[Store] Item purchased successfully');
    } catch (err: any) {
      console.error('[Store] Error purchasing item:', err);
      setError(err.message || 'Failed to purchase item');
    }
  };

  const equipItem = async (item: StoreItem) => {
    console.log('[Store] Equipping item:', item.name);

    if (!profile) {
      console.error('[Store] No profile found');
      return;
    }

    const isEquipped = equippedItems[item.category] === item.id;

    try {
      await storeService.equipItem(profile.id, item.category, isEquipped ? null : item.id);

      await refreshProfile();

      console.log('[Store] Item equipped successfully');
    } catch (err) {
      console.error('[Store] Error equipping item:', err);
      setError('Failed to equip item');
    }
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
        return <Crown className="w-8 h-8" />;
      case 'shirt':
        return <Shirt className="w-8 h-8" />;
      case 'pants':
        return <Package className="w-8 h-8" />;
      case 'accessory':
        return <Package className="w-8 h-8" />;
      default:
        return <Package className="w-8 h-8" />;
    }
  };

  const filteredItems = state.storeItems.filter(item => item.category === selectedCategory);

  return (
    <div className="max-w-6xl mx-auto">
      {error && (
        <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}

      {successMessage && (
        <div className="mb-4 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
          <p className="text-green-600 dark:text-green-400">{successMessage}</p>
        </div>
      )}

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 mb-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Avatar Store</h1>
          <div className="flex items-center space-x-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white px-6 py-3 rounded-lg">
            <Zap className="w-5 h-5" />
            <span className="text-xl font-bold">{profile?.xp || 0} XP</span>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-6">
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setSelectedCategory(cat.id as any)}
            className={`px-6 py-3 rounded-lg font-medium transition-colors ${
              selectedCategory === cat.id
                ? 'bg-blue-500 text-white'
                : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
            }`}
          >
            <span className="mr-2">{cat.emoji}</span>
            {cat.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredItems.map((item) => {
          const isOwned = state.ownedItemIds.has(item.id);
          const isEquipped = equippedItems[item.category] === item.id;
          const canAfford = (profile?.xp || 0) >= item.xp_cost;

          return (
            <div
              key={item.id}
              className={`bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 border-2 transition-all ${
                isEquipped
                  ? 'border-green-500 ring-2 ring-green-500/50'
                  : 'border-transparent hover:shadow-lg'
              }`}
            >
              <div className="flex items-center justify-between mb-4">
                <div
                  className={`p-4 rounded-lg ${
                    isOwned
                      ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                  }`}
                >
                  {getItemIcon(item.category)}
                </div>
                {isEquipped && (
                  <div className="flex items-center space-x-1 bg-green-500 text-white px-3 py-1 rounded-full text-sm font-medium">
                    <Check className="w-4 h-4" />
                    <span>Equipped</span>
                  </div>
                )}
              </div>

              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                {item.name}
              </h3>

              <div className="flex items-center space-x-2 mb-4">
                <Zap className="w-5 h-5 text-yellow-500" />
                <span className="text-xl font-bold text-gray-900 dark:text-white">
                  {item.xp_cost} XP
                </span>
              </div>

              {isOwned ? (
                <button
                  onClick={() => equipItem(item)}
                  className={`w-full py-2 rounded-lg font-medium transition-colors ${
                    isEquipped
                      ? 'bg-gray-300 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                      : 'bg-blue-500 hover:bg-blue-600 text-white'
                  }`}
                >
                  {isEquipped ? 'Unequip' : 'Equip'}
                </button>
              ) : (
                <button
                  onClick={() => purchaseItem(item)}
                  disabled={!canAfford}
                  className={`w-full py-2 rounded-lg font-medium transition-colors ${
                    canAfford
                      ? 'bg-green-500 hover:bg-green-600 text-white'
                      : 'bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                  }`}
                >
                  {canAfford ? 'Purchase' : 'Insufficient XP'}
                </button>
              )}
            </div>
          );
        })}

        {filteredItems.length === 0 && (
          <div className="col-span-full text-center py-12">
            <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-400">
              No items available in this category yet
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
