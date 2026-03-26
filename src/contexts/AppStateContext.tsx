import { createContext, useContext, useState, ReactNode, useCallback } from 'react';
import { TaskGroup, GroupMember, TaskCompletion, StoreItem } from '../lib/types';

interface AppState {
  myGroups: (TaskGroup & { member?: GroupMember; completion?: TaskCompletion })[];
  publicGroups: TaskGroup[];
  myGroupIds: Set<string>;
  storeItems: StoreItem[];
  ownedItemIds: Set<string>;
  taskHistory: (TaskCompletion & { task_group: TaskGroup })[];
}

interface AppStateContextType {
  state: AppState;
  updateMyGroups: (groups: (TaskGroup & { member?: GroupMember; completion?: TaskCompletion })[]) => void;
  updatePublicGroups: (groups: TaskGroup[]) => void;
  updateMyGroupIds: (ids: Set<string>) => void;
  addGroupId: (id: string) => void;
  updateStoreItems: (items: StoreItem[]) => void;
  updateOwnedItemIds: (ids: Set<string>) => void;
  updateTaskHistory: (history: (TaskCompletion & { task_group: TaskGroup })[]) => void;
  refreshKey: number;
  triggerRefresh: () => void;
}

const AppStateContext = createContext<AppStateContextType | undefined>(undefined);

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [refreshKey, setRefreshKey] = useState(0);
  const [state, setState] = useState<AppState>({
    myGroups: [],
    publicGroups: [],
    myGroupIds: new Set(),
    storeItems: [],
    ownedItemIds: new Set(),
    taskHistory: [],
  });

  const updateMyGroups = useCallback((groups: (TaskGroup & { member?: GroupMember; completion?: TaskCompletion })[]) => {
    console.log('[AppState] Updating myGroups:', groups.length);
    setState(prev => ({ ...prev, myGroups: groups }));
  }, []);

  const updatePublicGroups = useCallback((groups: TaskGroup[]) => {
    console.log('[AppState] Updating publicGroups:', groups.length);
    setState(prev => ({ ...prev, publicGroups: groups }));
  }, []);

  const updateMyGroupIds = useCallback((ids: Set<string>) => {
    console.log('[AppState] Updating myGroupIds:', ids.size);
    setState(prev => ({ ...prev, myGroupIds: ids }));
  }, []);

  const addGroupId = useCallback((id: string) => {
    console.log('[AppState] Adding group ID:', id);
    setState(prev => ({ ...prev, myGroupIds: new Set([...prev.myGroupIds, id]) }));
  }, []);

  const updateStoreItems = useCallback((items: StoreItem[]) => {
    console.log('[AppState] Updating storeItems:', items.length);
    setState(prev => ({ ...prev, storeItems: items }));
  }, []);

  const updateOwnedItemIds = useCallback((ids: Set<string>) => {
    console.log('[AppState] Updating ownedItemIds:', ids.size);
    setState(prev => ({ ...prev, ownedItemIds: ids }));
  }, []);

  const updateTaskHistory = useCallback((history: (TaskCompletion & { task_group: TaskGroup })[]) => {
    console.log('[AppState] Updating taskHistory:', history.length);
    setState(prev => ({ ...prev, taskHistory: history }));
  }, []);

  const triggerRefresh = useCallback(() => {
    console.log('[AppState] Triggering global refresh');
    setRefreshKey(prev => prev + 1);
  }, []);

  return (
    <AppStateContext.Provider
      value={{
        state,
        updateMyGroups,
        updatePublicGroups,
        updateMyGroupIds,
        addGroupId,
        updateStoreItems,
        updateOwnedItemIds,
        updateTaskHistory,
        refreshKey,
        triggerRefresh,
      }}
    >
      {children}
    </AppStateContext.Provider>
  );
}

export function useAppState() {
  const context = useContext(AppStateContext);
  if (context === undefined) {
    throw new Error('useAppState must be used within an AppStateProvider');
  }
  return context;
}
