import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { TaskGroup } from '../../lib/types';
import { Plus, Lock, Globe, Users as UsersIcon, Calendar, Clock, MessageCircle } from 'lucide-react';
import { CreateGroupModal } from './CreateGroupModal';
import { GroupDetailModal } from './GroupDetailModal';
import { TaskRoom } from '../TaskRoom/TaskRoom';

export function Groups() {
  const { profile, triggerRefresh } = useAuth();
  const [tab, setTab] = useState<'public' | 'private'>('public');
  const [publicGroups, setPublicGroups] = useState<TaskGroup[]>([]);
  const [privateCode, setPrivateCode] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<TaskGroup | null>(null);
  const [myGroupIds, setMyGroupIds] = useState<Set<string>>(new Set());
  const [activeRoomId, setActiveRoomId] = useState<string | null>(null);
  const [joiningGroupId, setJoiningGroupId] = useState<string | null>(null);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    fetchPublicGroups();
    if (profile) {
      fetchMyGroups();
    }
  }, [profile]);

  const fetchPublicGroups = async () => {
    const { data } = await supabase
      .from('task_groups')
      .select('*')
      .eq('is_public', true)
      .order('created_at', { ascending: false });

    if (data) setPublicGroups(data);
  };

  const fetchMyGroups = async () => {
    if (!profile) return;

    const { data } = await supabase
      .from('group_members')
      .select('group_id')
      .eq('user_id', profile.id);

    if (data) {
      setMyGroupIds(new Set(data.map(m => m.group_id)));
    }
  };

  const joinGroup = async (groupId: string) => {
    console.log('Join Group clicked for group:', groupId);

    if (!profile) {
      console.error('No profile found');
      return;
    }

    if (joiningGroupId) {
      console.log('Already joining a group, preventing duplicate action');
      return;
    }

    if (myGroupIds.has(groupId)) {
      console.log('User is already a member of this group');
      setError('You are already a member of this group');
      return;
    }

    const group = publicGroups.find(g => g.id === groupId);
    if (!group) {
      console.error('Group not found:', groupId);
      return;
    }

    if (group.current_members >= group.max_members) {
      setError('This group is full');
      return;
    }

    setJoiningGroupId(groupId);
    setError('');
    console.log('Starting join process...');

    try {
      console.log('Checking if membership already exists...');
      const { data: existingMember } = await supabase
        .from('group_members')
        .select('id')
        .eq('group_id', groupId)
        .eq('user_id', profile.id)
        .maybeSingle();

      if (existingMember) {
        console.log('User is already a member, updating local state only');
        setMyGroupIds(prev => new Set([...prev, groupId]));
        setError('');
        triggerRefresh();
        return;
      }

      console.log('Inserting group member record...');
      const { error: memberError } = await supabase.from('group_members').insert({
        group_id: groupId,
        user_id: profile.id,
        role: 'member',
      });

      if (memberError) {
        if (memberError.code === '23505') {
          console.log('Duplicate entry detected, user already joined');
          setMyGroupIds(prev => new Set([...prev, groupId]));
          setError('');
          triggerRefresh();
          return;
        }
        console.error('Error joining group:', memberError);
        throw memberError;
      }

      console.log('Successfully added to group_members, updating member count...');
      const { error: updateError } = await supabase
        .from('task_groups')
        .update({ current_members: group.current_members + 1 })
        .eq('id', groupId);

      if (updateError) {
        console.error('Error updating member count:', updateError);
      }

      console.log('Updating local state immediately...');
      setMyGroupIds(prev => new Set([...prev, groupId]));

      setPublicGroups(prev => prev.map(g =>
        g.id === groupId
          ? { ...g, current_members: g.current_members + 1 }
          : g
      ));

      triggerRefresh();
      console.log('Join process completed successfully, dashboard refresh triggered');
    } catch (err: any) {
      console.error('Join group error:', err);
      setError(err.message || 'Failed to join group. Please try again.');
    } finally {
      setJoiningGroupId(null);
    }
  };

  const joinPrivateGroup = async () => {
    console.log('Join Private Group clicked');

    if (!profile || !privateCode) {
      console.error('No profile or private code');
      return;
    }

    if (joiningGroupId) {
      console.log('Already joining a group, preventing duplicate action');
      return;
    }

    setJoiningGroupId('private');
    setError('');
    console.log('Searching for group with invite code:', privateCode);

    try {
      const { data: group, error: fetchError } = await supabase
        .from('task_groups')
        .select('*')
        .eq('invite_code', privateCode.toUpperCase())
        .maybeSingle();

      if (fetchError) throw fetchError;

      if (!group) {
        setError('Invalid invite code');
        return;
      }

      if (myGroupIds.has(group.id)) {
        console.log('User is already a member of this group');
        setError('You are already a member of this group');
        setPrivateCode('');
        return;
      }

      if (group.current_members >= group.max_members) {
        setError('This group is full');
        return;
      }

      console.log('Checking if membership already exists...');
      const { data: existingMember } = await supabase
        .from('group_members')
        .select('id')
        .eq('group_id', group.id)
        .eq('user_id', profile.id)
        .maybeSingle();

      if (existingMember) {
        console.log('User is already a member, updating local state only');
        setMyGroupIds(prev => new Set([...prev, group.id]));
        setPrivateCode('');
        triggerRefresh();
        alert('You are already a member of this group!');
        return;
      }

      console.log('Inserting group member record...');
      const { error: memberError } = await supabase.from('group_members').insert({
        group_id: group.id,
        user_id: profile.id,
        role: 'member',
      });

      if (memberError) {
        if (memberError.code === '23505') {
          console.log('Duplicate entry detected, user already joined');
          setMyGroupIds(prev => new Set([...prev, group.id]));
          setPrivateCode('');
          triggerRefresh();
          alert('You are already a member of this group!');
          return;
        }
        throw memberError;
      }

      console.log('Updating member count...');
      const { error: updateError } = await supabase
        .from('task_groups')
        .update({ current_members: group.current_members + 1 })
        .eq('id', group.id);

      if (updateError) {
        console.error('Error updating member count:', updateError);
      }

      console.log('Updating local state...');
      setMyGroupIds(prev => new Set([...prev, group.id]));
      setPrivateCode('');
      setError('');
      triggerRefresh();
      alert('Successfully joined the group!');
      console.log('Private group join completed successfully, dashboard refresh triggered');
    } catch (err: any) {
      console.error('Join private group error:', err);
      setError(err.message || 'Failed to join group. Please try again.');
    } finally {
      setJoiningGroupId(null);
    }
  };

  const getDayName = (index: number) => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return days[index];
  };

  if (activeRoomId) {
    return <TaskRoom groupId={activeRoomId} onBack={() => setActiveRoomId(null)} />;
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Task Groups</h1>
        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg flex items-center space-x-2 transition-colors font-medium"
        >
          <Plus className="w-5 h-5" />
          <span>Create Group</span>
        </button>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg mb-6">
          {error}
        </div>
      )}

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden">
        <div className="flex border-b border-gray-200 dark:border-gray-700">
          <button
            onClick={() => setTab('public')}
            className={`flex-1 px-6 py-4 font-medium transition-colors ${
              tab === 'public'
                ? 'bg-blue-600 text-white'
                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
            }`}
          >
            <div className="flex items-center justify-center space-x-2">
              <Globe className="w-5 h-5" />
              <span>Public Platform</span>
            </div>
          </button>
          <button
            onClick={() => setTab('private')}
            className={`flex-1 px-6 py-4 font-medium transition-colors ${
              tab === 'private'
                ? 'bg-blue-600 text-white'
                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
            }`}
          >
            <div className="flex items-center justify-center space-x-2">
              <Lock className="w-5 h-5" />
              <span>Private Platform</span>
            </div>
          </button>
        </div>

        <div className="p-6">
          {tab === 'public' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {publicGroups.map((group) => {
                const isMember = myGroupIds.has(group.id);
                return (
                  <div
                    key={group.id}
                    className="border border-gray-200 dark:border-gray-700 rounded-lg p-6 hover:shadow-lg transition-shadow cursor-pointer"
                    onClick={() => setSelectedGroup(group)}
                  >
                    <h3 className="font-bold text-xl text-gray-900 dark:text-white mb-2">{group.task_name}</h3>
                    {group.description && (
                      <p className="text-gray-600 dark:text-gray-400 text-sm mb-4 line-clamp-2">{group.description}</p>
                    )}

                    <div className="space-y-2 mb-4">
                      <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
                        <Clock className="w-4 h-4" />
                        <span>{group.duration_minutes} min/day</span>
                      </div>
                      <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
                        <UsersIcon className="w-4 h-4" />
                        <span>{group.current_members}/{group.max_members} members</span>
                      </div>
                      <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
                        <Calendar className="w-4 h-4" />
                        <span>Streak: {group.group_streak} days</span>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-1 mb-4">
                      {group.repeat_days.map((active, index) => (
                        <span
                          key={index}
                          className={`px-2 py-1 rounded text-xs ${
                            active
                              ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                              : 'bg-gray-100 text-gray-400 dark:bg-gray-700 dark:text-gray-500'
                          }`}
                        >
                          {getDayName(index)}
                        </span>
                      ))}
                    </div>

                    {!isMember && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          joinGroup(group.id);
                        }}
                        disabled={joiningGroupId === group.id}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {joiningGroupId === group.id ? 'Joining...' : 'Join Group'}
                      </button>
                    )}
                    {isMember && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveRoomId(group.id);
                        }}
                        className="w-full bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-700 hover:to-teal-700 text-white py-2 rounded-lg transition-all font-medium flex items-center justify-center space-x-2"
                      >
                        <MessageCircle className="w-4 h-4" />
                        <span>Open Room</span>
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="max-w-md mx-auto">
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-8 text-center">
                <Lock className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Join Private Group</h3>
                <p className="text-gray-600 dark:text-gray-400 mb-6">Enter a 6-digit invite code to join a private group</p>

                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={privateCode}
                    onChange={(e) => setPrivateCode(e.target.value.toUpperCase())}
                    placeholder="ABC123"
                    maxLength={6}
                    disabled={joiningGroupId === 'private'}
                    className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-800 dark:text-white text-center text-lg font-mono disabled:opacity-50"
                  />
                  <button
                    onClick={joinPrivateGroup}
                    disabled={joiningGroupId === 'private' || !privateCode}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {joiningGroupId === 'private' ? 'Joining...' : 'Join'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {showCreateModal && (
        <CreateGroupModal
          onClose={() => setShowCreateModal(false)}
          onCreated={() => {
            setShowCreateModal(false);
            fetchPublicGroups();
            fetchMyGroups();
          }}
        />
      )}

      {selectedGroup && (
        <GroupDetailModal
          group={selectedGroup}
          onClose={() => setSelectedGroup(null)}
          isMember={myGroupIds.has(selectedGroup.id)}
          onJoin={async () => {
            await joinGroup(selectedGroup.id);
            setSelectedGroup(null);
          }}
        />
      )}
    </div>
  );
}
