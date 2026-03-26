import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useAppState } from '../../contexts/AppStateContext';
import { taskService } from '../../services/taskService';
import { supabase } from '../../lib/supabase';
import { TaskGroup } from '../../lib/types';
import { Plus, Lock, Globe, Users as UsersIcon, Calendar, Clock, MessageCircle } from 'lucide-react';
import { CreateGroupModal } from './CreateGroupModal';
import { GroupDetailModal } from './GroupDetailModal';
import { TaskRoom } from '../TaskRoom/TaskRoom';

export function Groups() {
  const { profile, triggerRefresh } = useAuth();
  const { state, updatePublicGroups, updateMyGroupIds, addGroupId, triggerRefresh: triggerAppRefresh } = useAppState();
  const [tab, setTab] = useState<'public' | 'private'>('public');
  const [privateCode, setPrivateCode] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<TaskGroup | null>(null);
  const [activeRoomId, setActiveRoomId] = useState<string | null>(null);
  const [joiningGroupId, setJoiningGroupId] = useState<string | null>(null);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    fetchData();
  }, [profile]);

  const fetchData = async () => {
    console.log('[Groups] Fetching data');

    try {
      const publicGroups = await taskService.fetchPublicGroups();
      updatePublicGroups(publicGroups);

      if (profile) {
        const myGroupIds = await taskService.fetchMyGroupIds(profile.id);
        updateMyGroupIds(myGroupIds);
      }
    } catch (err) {
      console.error('[Groups] Error fetching data:', err);
    }
  };

  const joinGroup = async (groupId: string) => {
    console.log('[Groups] Joining group:', groupId);

    if (!profile) {
      console.error('[Groups] No profile found');
      return;
    }

    if (joiningGroupId) {
      console.log('[Groups] Already joining a group, preventing duplicate click');
      return;
    }

    if (state.myGroupIds.has(groupId)) {
      console.log('[Groups] User is already a member, skipping join');
      setError('You are already a member of this group');
      setTimeout(() => setError(''), 3000);
      return;
    }

    const group = state.publicGroups.find(g => g.id === groupId);
    if (!group) {
      console.error('[Groups] Group not found:', groupId);
      return;
    }

    if (group.current_members >= group.max_members) {
      setError('This group is full');
      setTimeout(() => setError(''), 3000);
      return;
    }

    setJoiningGroupId(groupId);
    setError('');

    try {
      await taskService.joinGroup(groupId, profile.id);

      addGroupId(groupId);

      updatePublicGroups(
        state.publicGroups.map(g =>
          g.id === groupId ? { ...g, current_members: g.current_members + 1 } : g
        )
      );

      triggerRefresh();
      triggerAppRefresh();

      console.log('[Groups] Successfully joined group');
    } catch (err: any) {
      console.error('[Groups] Error joining group:', err);

      if (err.message?.includes('duplicate') || err.message?.includes('unique constraint')) {
        console.log('[Groups] Duplicate error caught - user already in group, updating UI');
        addGroupId(groupId);
      } else {
        setError(err.message || 'Failed to join group');
        setTimeout(() => setError(''), 3000);
      }
    } finally {
      setJoiningGroupId(null);
    }
  };

  const joinPrivateGroup = async () => {
    console.log('[Groups] Joining private group with code:', privateCode);

    if (!profile || !privateCode) {
      console.error('[Groups] No profile or private code');
      return;
    }

    if (joiningGroupId) {
      console.log('[Groups] Already joining a group, preventing duplicate click');
      return;
    }

    setJoiningGroupId('private');
    setError('');

    try {
      const { data: group, error: fetchError } = await supabase
        .from('task_groups')
        .select('*')
        .eq('invite_code', privateCode.toUpperCase())
        .maybeSingle();

      if (fetchError) throw fetchError;

      if (!group) {
        setError('Invalid invite code');
        setTimeout(() => setError(''), 3000);
        return;
      }

      if (state.myGroupIds.has(group.id)) {
        console.log('[Groups] User is already a member, skipping join');
        setError('You are already a member of this group');
        setPrivateCode('');
        setTimeout(() => setError(''), 3000);
        return;
      }

      if (group.current_members >= group.max_members) {
        setError('This group is full');
        setTimeout(() => setError(''), 3000);
        return;
      }

      await taskService.joinGroup(group.id, profile.id);

      addGroupId(group.id);
      setPrivateCode('');
      setError('');
      triggerRefresh();
      triggerAppRefresh();

      alert('Successfully joined the group!');
      console.log('[Groups] Successfully joined private group');
    } catch (err: any) {
      console.error('[Groups] Error joining private group:', err);

      if (err.message?.includes('duplicate') || err.message?.includes('unique constraint')) {
        console.log('[Groups] Duplicate error caught - user already in group, updating UI');
        addGroupId(group.id);
        setPrivateCode('');
        alert('Successfully joined the group!');
      } else {
        setError(err.message || 'Failed to join group');
        setTimeout(() => setError(''), 3000);
      }
    } finally {
      setJoiningGroupId(null);
    }
  };

  const handleCreateGroup = async (
    taskName: string,
    description: string,
    durationMinutes: number,
    isPublic: boolean,
    maxMembers: number,
    repeatDays: boolean[]
  ) => {
    console.log('[Groups] Creating group:', { taskName, isPublic, maxMembers });

    if (!profile) {
      console.error('[Groups] No profile found');
      return;
    }

    try {
      const newGroup = await taskService.createGroup(
        profile.id,
        taskName,
        description,
        durationMinutes,
        isPublic,
        maxMembers,
        repeatDays
      );

      addGroupId(newGroup.id);

      if (isPublic) {
        updatePublicGroups([newGroup, ...state.publicGroups]);
      }

      triggerRefresh();
      triggerAppRefresh();

      console.log('[Groups] Successfully created group');
    } catch (err) {
      console.error('[Groups] Error creating group:', err);
      throw err;
    }
  };

  if (activeRoomId) {
    return <TaskRoom groupId={activeRoomId} onBack={() => setActiveRoomId(null)} />;
  }

  return (
    <div className="max-w-6xl mx-auto">
      {error && (
        <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}

      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Task Groups</h1>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center space-x-2 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-colors"
        >
          <Plus className="w-5 h-5" />
          <span>Create Group</span>
        </button>
      </div>

      <div className="flex space-x-4 mb-6">
        <button
          onClick={() => setTab('public')}
          className={`flex items-center space-x-2 px-6 py-3 rounded-lg font-medium transition-colors ${
            tab === 'public'
              ? 'bg-blue-500 text-white'
              : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
          }`}
        >
          <Globe className="w-5 h-5" />
          <span>Public Groups</span>
        </button>
        <button
          onClick={() => setTab('private')}
          className={`flex items-center space-x-2 px-6 py-3 rounded-lg font-medium transition-colors ${
            tab === 'private'
              ? 'bg-blue-500 text-white'
              : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
          }`}
        >
          <Lock className="w-5 h-5" />
          <span>Private Groups</span>
        </button>
      </div>

      {tab === 'public' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {state.publicGroups.map((group) => {
            const isMember = state.myGroupIds.has(group.id);
            const isJoining = joiningGroupId === group.id;
            const isFull = group.current_members >= group.max_members;

            return (
              <div
                key={group.id}
                className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                      {group.task_name}
                    </h3>
                    {group.description && (
                      <p className="text-gray-600 dark:text-gray-400 text-sm mb-3">
                        {group.description}
                      </p>
                    )}
                  </div>
                </div>

                <div className="space-y-2 mb-4">
                  <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
                    <Clock className="w-4 h-4" />
                    <span>{group.duration_minutes} minutes</span>
                  </div>
                  <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
                    <UsersIcon className="w-4 h-4" />
                    <span>
                      {group.current_members} / {group.max_members} members
                    </span>
                  </div>
                  <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
                    <Calendar className="w-4 h-4" />
                    <span>Streak: {group.group_streak} days</span>
                  </div>
                </div>

                <div className="flex space-x-2">
                  {isMember ? (
                    <>
                      <button
                        onClick={() => setSelectedGroup(group)}
                        className="flex-1 bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg transition-colors"
                      >
                        View Details
                      </button>
                      <button
                        onClick={() => setActiveRoomId(group.id)}
                        className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-colors"
                        title="Task Room"
                      >
                        <MessageCircle className="w-5 h-5" />
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => joinGroup(group.id)}
                      disabled={isFull || isJoining}
                      className={`flex-1 px-4 py-2 rounded-lg transition-colors ${
                        isFull
                          ? 'bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                          : isJoining
                          ? 'bg-blue-400 text-white cursor-wait'
                          : 'bg-blue-500 hover:bg-blue-600 text-white'
                      }`}
                    >
                      {isFull ? 'Full' : isJoining ? 'Joining...' : 'Join Group'}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-8">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            Join Private Group
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Enter the invite code to join a private group
          </p>
          <div className="flex space-x-4">
            <input
              type="text"
              value={privateCode}
              onChange={(e) => setPrivateCode(e.target.value.toUpperCase())}
              placeholder="INVITE CODE"
              className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
            />
            <button
              onClick={joinPrivateGroup}
              disabled={!privateCode || joiningGroupId === 'private'}
              className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-lg transition-colors disabled:bg-gray-300 dark:disabled:bg-gray-700 disabled:cursor-not-allowed"
            >
              {joiningGroupId === 'private' ? 'Joining...' : 'Join'}
            </button>
          </div>
        </div>
      )}

      {showCreateModal && (
        <CreateGroupModal
          onClose={() => setShowCreateModal(false)}
          onCreate={handleCreateGroup}
        />
      )}

      {selectedGroup && (
        <GroupDetailModal
          group={selectedGroup}
          onClose={() => setSelectedGroup(null)}
        />
      )}
    </div>
  );
}
