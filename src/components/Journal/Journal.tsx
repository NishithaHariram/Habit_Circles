import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { JournalEntry } from '../../lib/types';
import { BookOpen, Plus, Calendar, Smile, Meh, Frown } from 'lucide-react';

export function Journal() {
  const { profile } = useAuth();
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [content, setContent] = useState('');
  const [mood, setMood] = useState<1 | 2 | 3 | 4 | 5>(3);

  useEffect(() => {
    fetchEntries();
  }, [profile]);

  const fetchEntries = async () => {
    if (!profile) return;

    const { data } = await supabase
      .from('journal_entries')
      .select('*')
      .eq('user_id', profile.id)
      .order('entry_date', { ascending: false });

    if (data) setEntries(data);
  };

  const createEntry = async () => {
    if (!profile || !content.trim()) return;

    const { error } = await supabase.from('journal_entries').insert({
      user_id: profile.id,
      content: content,
      mood: mood,
      entry_date: new Date().toISOString().split('T')[0],
    });

    if (!error) {
      setContent('');
      setMood(3);
      setShowForm(false);
      fetchEntries();
    }
  };

  const getMoodEmoji = (moodValue: number) => {
    const moods = ['😢', '😕', '😐', '😊', '😄'];
    return moods[moodValue - 1];
  };

  const getMoodColor = (moodValue: number) => {
    const colors = [
      'from-red-500 to-red-600',
      'from-orange-500 to-orange-600',
      'from-yellow-500 to-yellow-600',
      'from-green-500 to-green-600',
      'from-blue-500 to-blue-600',
    ];
    return colors[moodValue - 1];
  };

  const getMoodLabel = (moodValue: number) => {
    const labels = ['Very Bad', 'Bad', 'Okay', 'Good', 'Excellent'];
    return labels[moodValue - 1];
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div className="flex items-center space-x-3">
          <BookOpen className="w-8 h-8 text-blue-600 dark:text-blue-400" />
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Journal</h1>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg flex items-center space-x-2 transition-colors font-medium"
        >
          <Plus className="w-5 h-5" />
          <span>New Entry</span>
        </button>
      </div>

      {showForm && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 mb-8">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">New Journal Entry</h2>

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              How are you feeling today?
            </label>
            <div className="flex justify-between items-center space-x-2">
              {[1, 2, 3, 4, 5].map((value) => (
                <button
                  key={value}
                  onClick={() => setMood(value as any)}
                  className={`flex-1 p-4 rounded-lg border-2 transition-all ${
                    mood === value
                      ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20 scale-110'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                  }`}
                >
                  <div className="text-4xl mb-2">{getMoodEmoji(value)}</div>
                  <div className="text-xs text-gray-600 dark:text-gray-400 font-medium">
                    {getMoodLabel(value)}
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Write your thoughts
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={6}
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white resize-none"
              placeholder="Reflect on your day, your progress, your feelings..."
            />
          </div>

          <div className="flex space-x-3">
            <button
              onClick={() => {
                setShowForm(false);
                setContent('');
                setMood(3);
              }}
              className="flex-1 px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors font-medium"
            >
              Cancel
            </button>
            <button
              onClick={createEntry}
              disabled={!content.trim()}
              className="flex-1 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Save Entry
            </button>
          </div>
        </div>
      )}

      <div className="space-y-6">
        {entries.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-12 text-center">
            <BookOpen className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-400">No journal entries yet. Start reflecting on your journey!</p>
          </div>
        ) : (
          entries.map((entry) => (
            <div
              key={entry.id}
              className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden"
            >
              <div className={`bg-gradient-to-r ${getMoodColor(entry.mood)} p-4`}>
                <div className="flex items-center justify-between text-white">
                  <div className="flex items-center space-x-3">
                    <span className="text-3xl">{getMoodEmoji(entry.mood)}</span>
                    <div>
                      <p className="font-semibold">{getMoodLabel(entry.mood)}</p>
                      <p className="text-sm opacity-90">Mood Rating: {entry.mood}/5</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Calendar className="w-5 h-5" />
                    <span className="text-sm">
                      {new Date(entry.entry_date).toLocaleDateString('en-US', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </span>
                  </div>
                </div>
              </div>
              <div className="p-6">
                <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">
                  {entry.content}
                </p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
