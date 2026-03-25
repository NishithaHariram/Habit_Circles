import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { TaskGroup, SocialPost, Profile } from '../../lib/types';
import { X, Users, Clock, Calendar, TrendingUp, Heart, MessageCircle, Send } from 'lucide-react';

interface GroupDetailModalProps {
  group: TaskGroup;
  onClose: () => void;
  isMember: boolean;
  onJoin: () => void;
}

export function GroupDetailModal({ group, onClose, isMember, onJoin }: GroupDetailModalProps) {
  const { profile } = useAuth();
  const [posts, setPosts] = useState<(SocialPost & { author: Profile; isLiked: boolean })[]>([]);
  const [newPost, setNewPost] = useState('');

  useEffect(() => {
    if (isMember) {
      fetchPosts();
    }
  }, [isMember]);

  const fetchPosts = async () => {
    const { data } = await supabase
      .from('social_posts')
      .select('*, profiles!social_posts_author_id_fkey(*)')
      .eq('group_id', group.id)
      .order('created_at', { ascending: false });

    if (data && profile) {
      const { data: likes } = await supabase
        .from('post_likes')
        .select('post_id')
        .eq('user_id', profile.id);

      const likedPostIds = new Set(likes?.map(l => l.post_id) || []);

      const postsWithAuthors = data.map((post: any) => ({
        ...post,
        author: post.profiles,
        isLiked: likedPostIds.has(post.id),
      }));

      setPosts(postsWithAuthors);
    }
  };

  const createPost = async () => {
    if (!profile || !newPost.trim()) return;

    await supabase.from('social_posts').insert({
      group_id: group.id,
      author_id: profile.id,
      content: newPost,
      post_type: 'comment',
    });

    setNewPost('');
    fetchPosts();
  };

  const toggleLike = async (postId: string, isLiked: boolean) => {
    if (!profile) return;

    if (isLiked) {
      await supabase
        .from('post_likes')
        .delete()
        .eq('post_id', postId)
        .eq('user_id', profile.id);

      await supabase.rpc('decrement', {
        table_name: 'social_posts',
        row_id: postId,
        column_name: 'likes_count'
      });
    } else {
      await supabase.from('post_likes').insert({
        post_id: postId,
        user_id: profile.id,
      });

      const { data: post } = await supabase
        .from('social_posts')
        .select('likes_count')
        .eq('id', postId)
        .single();

      if (post) {
        await supabase
          .from('social_posts')
          .update({ likes_count: post.likes_count + 1 })
          .eq('id', postId);
      }
    }

    fetchPosts();
  };

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex justify-between items-center">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{group.task_name}</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {group.description && (
            <p className="text-gray-600 dark:text-gray-400">{group.description}</p>
          )}

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
              <div className="flex items-center space-x-2 text-blue-600 dark:text-blue-400 mb-2">
                <Clock className="w-5 h-5" />
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Duration</p>
              <p className="text-lg font-bold text-gray-900 dark:text-white">{group.duration_minutes} min</p>
            </div>

            <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
              <div className="flex items-center space-x-2 text-green-600 dark:text-green-400 mb-2">
                <Users className="w-5 h-5" />
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Members</p>
              <p className="text-lg font-bold text-gray-900 dark:text-white">{group.current_members}/{group.max_members}</p>
            </div>

            <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg">
              <div className="flex items-center space-x-2 text-purple-600 dark:text-purple-400 mb-2">
                <TrendingUp className="w-5 h-5" />
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Streak</p>
              <p className="text-lg font-bold text-gray-900 dark:text-white">{group.group_streak} days</p>
            </div>

            <div className="bg-orange-50 dark:bg-orange-900/20 p-4 rounded-lg">
              <div className="flex items-center space-x-2 text-orange-600 dark:text-orange-400 mb-2">
                <Calendar className="w-5 h-5" />
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">XP Reward</p>
              <p className="text-lg font-bold text-gray-900 dark:text-white">{Math.floor(group.duration_minutes / 5)} XP</p>
            </div>
          </div>

          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Repeat Days</h3>
            <div className="flex flex-wrap gap-2">
              {group.repeat_days.map((active, index) => (
                <span
                  key={index}
                  className={`px-3 py-1 rounded ${
                    active
                      ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                      : 'bg-gray-100 text-gray-400 dark:bg-gray-700 dark:text-gray-500'
                  }`}
                >
                  {dayNames[index]}
                </span>
              ))}
            </div>
          </div>

          {!isMember && (
            <button
              onClick={onJoin}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg transition-colors font-medium"
            >
              Join This Group
            </button>
          )}

          {isMember && (
            <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
              <h3 className="font-bold text-xl text-gray-900 dark:text-white mb-4 flex items-center space-x-2">
                <MessageCircle className="w-6 h-6" />
                <span>Group Feed</span>
              </h3>

              <div className="flex space-x-2 mb-6">
                <input
                  type="text"
                  value={newPost}
                  onChange={(e) => setNewPost(e.target.value)}
                  placeholder="Share your progress or encourage others..."
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  onKeyPress={(e) => e.key === 'Enter' && createPost()}
                />
                <button
                  onClick={createPost}
                  className="bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-lg transition-colors"
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                {posts.map((post) => (
                  <div key={post.id} className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="font-semibold text-gray-900 dark:text-white">{post.author.username}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {new Date(post.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <p className="text-gray-700 dark:text-gray-300 mb-3">{post.content}</p>
                    <button
                      onClick={() => toggleLike(post.id, post.isLiked)}
                      className="flex items-center space-x-2 text-gray-600 dark:text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-colors"
                    >
                      <Heart className={`w-5 h-5 ${post.isLiked ? 'fill-red-500 text-red-500' : ''}`} />
                      <span className="text-sm">{post.likes_count}</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
