import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { TaskRoomPost, TaskGroup } from '../../lib/types';
import { ArrowLeft, Send, Heart, Trash2, Users } from 'lucide-react';

interface TaskRoomProps {
  groupId: string;
  onBack: () => void;
}

export function TaskRoom({ groupId, onBack }: TaskRoomProps) {
  const { profile } = useAuth();
  const [group, setGroup] = useState<TaskGroup | null>(null);
  const [posts, setPosts] = useState<TaskRoomPost[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isPosting, setIsPosting] = useState(false);
  const [userLikes, setUserLikes] = useState<Set<string>>(new Set());
  const [error, setError] = useState('');

  useEffect(() => {
    fetchGroup();
    fetchPosts();
    fetchUserLikes();

    const channel = supabase
      .channel(`task_room_${groupId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'task_room_posts',
          filter: `group_id=eq.${groupId}`
        },
        () => {
          fetchPosts();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'task_room_likes'
        },
        () => {
          fetchPosts();
          fetchUserLikes();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [groupId]);

  const fetchGroup = async () => {
    const { data } = await supabase
      .from('task_groups')
      .select('*')
      .eq('id', groupId)
      .single();

    if (data) setGroup(data);
  };

  const fetchPosts = async () => {
    const { data } = await supabase
      .from('task_room_posts')
      .select('*')
      .eq('group_id', groupId)
      .order('created_at', { ascending: false });

    if (data) setPosts(data);
  };

  const fetchUserLikes = async () => {
    if (!profile) return;

    const { data } = await supabase
      .from('task_room_likes')
      .select('post_id')
      .eq('user_id', profile.id);

    if (data) {
      setUserLikes(new Set(data.map(like => like.post_id)));
    }
  };

  const handlePostMessage = async () => {
    if (!profile || !newMessage.trim() || isPosting) return;

    setIsPosting(true);
    setError('');

    try {
      const { error: postError } = await supabase
        .from('task_room_posts')
        .insert({
          group_id: groupId,
          user_id: profile.id,
          username: profile.username,
          message: newMessage.trim()
        });

      if (postError) throw postError;

      setNewMessage('');
    } catch (err: any) {
      setError(err.message || 'Failed to post message');
    } finally {
      setIsPosting(false);
    }
  };

  const handleLike = async (postId: string) => {
    if (!profile) return;

    const isLiked = userLikes.has(postId);

    try {
      if (isLiked) {
        const { error: deleteError } = await supabase
          .from('task_room_likes')
          .delete()
          .eq('post_id', postId)
          .eq('user_id', profile.id);

        if (deleteError) throw deleteError;
      } else {
        const { error: insertError } = await supabase
          .from('task_room_likes')
          .insert({
            post_id: postId,
            user_id: profile.id
          });

        if (insertError) throw insertError;
      }
    } catch (err: any) {
      console.error('Error toggling like:', err);
    }
  };

  const handleDeletePost = async (postId: string) => {
    if (!profile) return;

    try {
      const { error: deleteError } = await supabase
        .from('task_room_posts')
        .delete()
        .eq('id', postId)
        .eq('user_id', profile.id);

      if (deleteError) throw deleteError;
    } catch (err: any) {
      console.error('Error deleting post:', err);
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-4xl mx-auto p-6">
        <div className="mb-6">
          <button
            onClick={onBack}
            className="flex items-center space-x-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors mb-4"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Back to Groups</span>
          </button>

          {group && (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
              <div className="flex items-start justify-between">
                <div>
                  <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                    {group.task_name}
                  </h1>
                  {group.description && (
                    <p className="text-gray-600 dark:text-gray-400">{group.description}</p>
                  )}
                </div>
                <div className="flex items-center space-x-2 text-gray-600 dark:text-gray-400">
                  <Users className="w-5 h-5" />
                  <span>{group.current_members}/{group.max_members}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 mb-6">
          <div className="flex space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold">
              {profile?.username.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1">
              <textarea
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Share your progress, motivation, or thoughts..."
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white resize-none"
                rows={3}
                disabled={isPosting}
              />
              {error && (
                <p className="text-red-600 dark:text-red-400 text-sm mt-2">{error}</p>
              )}
              <div className="flex justify-end mt-3">
                <button
                  onClick={handlePostMessage}
                  disabled={!newMessage.trim() || isPosting}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
                >
                  <Send className="w-4 h-4" />
                  <span>{isPosting ? 'Posting...' : 'Post'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          {posts.length === 0 ? (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-12 text-center">
              <p className="text-gray-500 dark:text-gray-400">
                No posts yet. Be the first to share something!
              </p>
            </div>
          ) : (
            posts.map((post) => (
              <div
                key={post.id}
                className={`bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 ${
                  post.user_id === profile?.id ? 'ring-2 ring-blue-500 ring-opacity-50' : ''
                }`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-teal-600 rounded-full flex items-center justify-center text-white font-bold">
                      {post.username.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-white">
                        {post.username}
                        {post.user_id === profile?.id && (
                          <span className="ml-2 text-xs text-blue-600 dark:text-blue-400">(You)</span>
                        )}
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {formatTimestamp(post.created_at)}
                      </p>
                    </div>
                  </div>
                  {post.user_id === profile?.id && (
                    <button
                      onClick={() => handleDeletePost(post.id)}
                      className="text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  )}
                </div>

                <p className="text-gray-700 dark:text-gray-300 mb-4 whitespace-pre-wrap">
                  {post.message}
                </p>

                <div className="flex items-center space-x-4 pt-3 border-t border-gray-200 dark:border-gray-700">
                  <button
                    onClick={() => handleLike(post.id)}
                    className={`flex items-center space-x-2 transition-colors ${
                      userLikes.has(post.id)
                        ? 'text-red-600 dark:text-red-400'
                        : 'text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400'
                    }`}
                  >
                    <Heart className={`w-5 h-5 ${userLikes.has(post.id) ? 'fill-current' : ''}`} />
                    <span className="font-medium">{post.likes_count}</span>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
