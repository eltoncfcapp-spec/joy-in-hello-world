import { Search, Plus, Phone, User, X, MapPin, Edit2, Save, Trash2, Calendar, Droplets, Eye, EyeOff, RefreshCw, Download, Filter, Shield, Users, Key, ChevronDown, ChevronUp, MessageSquare, Lock, CheckCircle, Circle, BookOpen, Award, Clipboard, BookText } from 'lucide-react';
import { useState, useEffect } from 'react';
import { supabase } from '../integrations/supabase/client';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

interface Member {
  id: string;
  name: string;
  surname: string;
  residence: string | null;
  phone: string | null;
  cell_group_id: string | null;
  gender: 'male' | 'female' | null;
  is_permanent_member: boolean | null;
  permanent_member_date: string | null;
  baptism: string | null;
  cell_group_name?: string | null;
  status: string | null;
  status_date: string | null;
  not_attending_reason: string | null;
  created_at: string | null;
  invited_by: string | null;
  is_hidden: boolean | null;
}

interface CellGroup {
  id: string;
  name: string;
}

interface MinistryGroup {
  id: string;
  name: string;
}

interface MemberNote {
  id: string;
  member_id: string;
  author_id: string;
  note_type: string;
  note_content: string;
  is_confidential: boolean;
  created_at: string;
  author?: {
    name: string;
    surname: string;
  };
}

interface FoundationalTopic {
  id: string;
  topic_name: string;
  topic_description: string | null;
  level: number;
  topic_order: number;
  is_active: boolean;
  created_at: string;
  duration_minutes?: number | null;
}

interface TrainingProgress {
  id: string;
  member_id: string;
  topic_id: string;
  completed_by: string | null;
  completed_date: string;
  notes: string | null;
  created_at: string;
  topic?: FoundationalTopic;
  completed_by_member?: {
    name: string;
    surname: string;
  };
}

const NOT_ATTENDING_STATUSES = ['inactive', 'stopped attending', 'not attending', 'left'];
const ATTENDING_STATUSES = ['newcomer', 'member', 'signed member', 'permanent', 'active'];
const VALID_STATUSES = [...ATTENDING_STATUSES, ...NOT_ATTENDING_STATUSES];

const logAudit = async (
  tableName: string,
  recordId: string,
  action: 'INSERT' | 'UPDATE' | 'DELETE',
  oldData?: any,
  newData?: any
) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    await supabase.from('audit_logs').insert({
      table_name: tableName,
      record_id: recordId,
      action: action,
      old_data: oldData,
      new_data: newData,
      user_id: user?.id || null
    });
  } catch (error) {
    console.error('Error logging audit:', error);
  }
};

// MemberNotes Component
const MemberNotes: React.FC<{
  memberId: string;
  currentUserId: string;
  canViewConfidential: boolean;
  canEditNotes: boolean;
  editingMode?: boolean;
  onNoteAdded?: () => void;
}> = ({
  memberId,
  currentUserId,
  canViewConfidential,
  canEditNotes,
  editingMode = false,
  onNoteAdded
}) => {
  const [notes, setNotes] = useState<MemberNote[]>([]);
  const [loading, setLoading] = useState(false);
  const [showNoteForm, setShowNoteForm] = useState(editingMode);
  const [editingNote, setEditingNote] = useState<string | null>(null);
  
  const [noteForm, setNoteForm] = useState({
    note_type: 'general',
    note_content: '',
    is_confidential: false
  });

  const [editNoteForm, setEditNoteForm] = useState({
    note_type: 'general',
    note_content: '',
    is_confidential: false
  });

  const fetchNotes = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('member_notes')
        .select(`
          *,
          author:author_id(name, surname)
        `)
        .eq('member_id', memberId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      const filteredNotes = canViewConfidential 
        ? data 
        : data?.filter(note => !note.is_confidential);
      
      setNotes(filteredNotes || []);
    } catch (error) {
      console.error('Error fetching notes:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotes();
  }, [memberId, canViewConfidential]);

  const handleSubmitNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteForm.note_content.trim()) return;
    
    try {
      const newNote = {
        member_id: memberId,
        author_id: currentUserId,
        note_type: noteForm.note_type,
        note_content: noteForm.note_content.trim(),
        is_confidential: noteForm.is_confidential,
        created_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('member_notes')
        .insert([newNote])
        .select();

      if (error) throw error;

      setNoteForm({
        note_type: 'general',
        note_content: '',
        is_confidential: false
      });
      setShowNoteForm(editingMode);
      fetchNotes();
      if (onNoteAdded) onNoteAdded();
    } catch (error) {
      console.error('Error adding note:', error);
      alert('Failed to save note. Please try again.');
    }
  };

  const handleUpdateNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingNote || !editNoteForm.note_content.trim()) return;
    
    try {
      const { data, error } = await supabase
        .from('member_notes')
        .update({
          note_type: editNoteForm.note_type,
          note_content: editNoteForm.note_content.trim(),
          is_confidential: editNoteForm.is_confidential,
          updated_at: new Date().toISOString()
        })
        .eq('id', editingNote)
        .select();

      if (error) throw error;

      setEditingNote(null);
      fetchNotes();
    } catch (error) {
      console.error('Error updating note:', error);
      alert('Failed to update note. Please try again.');
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    if (!confirm('Are you sure you want to delete this note?')) return;
    
    try {
      const { error } = await supabase
        .from('member_notes')
        .delete()
        .eq('id', noteId);

      if (error) throw error;

      fetchNotes();
    } catch (error) {
      console.error('Error deleting note:', error);
      alert('Failed to delete note. Please try again.');
    }
  };

  const startEditingNote = (note: MemberNote) => {
    setEditingNote(note.id);
    setEditNoteForm({
      note_type: note.note_type,
      note_content: note.note_content,
      is_confidential: note.is_confidential
    });
  };

  const cancelEditing = () => {
    setEditingNote(null);
  };

  const getNoteTypeColor = (type: string) => {
    switch (type) {
      case 'pastoral': return 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300';
      case 'counseling': return 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300';
      case 'discipleship': return 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300';
      case 'prayer': return 'bg-pink-100 dark:bg-pink-900/30 text-pink-700 dark:text-pink-300';
      default: return 'bg-gray-100 dark:bg-gray-900/30 text-gray-700 dark:text-gray-300';
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          Member Notes
        </h3>
        {canEditNotes && !editingMode && (
          <button
            onClick={() => setShowNoteForm(!showNoteForm)}
            className="flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors duration-200"
          >
            <Plus className="h-4 w-4" />
            {showNoteForm ? 'Cancel' : 'Add Note'}
          </button>
        )}
      </div>

      {(showNoteForm || editingMode) && canEditNotes && (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
          <form onSubmit={handleSubmitNote} className="space-y-4">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Note Type
              </label>
              <select
                value={noteForm.note_type}
                onChange={(e) => setNoteForm({...noteForm, note_type: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="general">General</option>
                <option value="pastoral">Pastoral</option>
                <option value="counseling">Counseling</option>
                <option value="discipleship">Discipleship</option>
                <option value="prayer">Prayer Request</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Note Content *
              </label>
              <textarea
                value={noteForm.note_content}
                onChange={(e) => setNoteForm({...noteForm, note_content: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[120px]"
                placeholder="Enter your note here..."
                required
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="confidential"
                checked={noteForm.is_confidential}
                onChange={(e) => setNoteForm({...noteForm, is_confidential: e.target.checked})}
                className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
              />
              <label htmlFor="confidential" className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                <Lock className="h-4 w-4" />
                Confidential (only visible to pastors, deacons, and admins)
              </label>
            </div>

            <div className="flex gap-3">
              <button
                type="submit"
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors duration-200"
              >
                <Save className="h-4 w-4" />
                Save Note
              </button>
              {!editingMode && (
                <button
                  type="button"
                  onClick={() => setShowNoteForm(false)}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200"
                >
                  Cancel
                </button>
              )}
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">Loading notes...</p>
        </div>
      ) : notes.length === 0 && !editingMode ? (
        <div className="text-center py-8 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
          <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-600 dark:text-gray-400">No notes yet.</p>
          {canEditNotes && !editingMode && (
            <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">
              Add the first note using the "Add Note" button.
            </p>
          )}
        </div>
      ) : notes.length > 0 && (
        <div className="space-y-4">
          {notes.map((note) => (
            <div key={note.id} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
              {editingNote === note.id ? (
                <form onSubmit={handleUpdateNote} className="space-y-4">
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Note Type
                    </label>
                    <select
                      value={editNoteForm.note_type}
                      onChange={(e) => setEditNoteForm({...editNoteForm, note_type: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="general">General</option>
                      <option value="pastoral">Pastoral</option>
                      <option value="counseling">Counseling</option>
                      <option value="discipleship">Discipleship</option>
                      <option value="prayer">Prayer Request</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Note Content *
                    </label>
                    <textarea
                      value={editNoteForm.note_content}
                      onChange={(e) => setEditNoteForm({...editNoteForm, note_content: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[120px]"
                      required
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="edit-confidential"
                      checked={editNoteForm.is_confidential}
                      onChange={(e) => setEditNoteForm({...editNoteForm, is_confidential: e.target.checked})}
                      className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                    />
                    <label htmlFor="edit-confidential" className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                      <Lock className="h-4 w-4" />
                      Confidential
                    </label>
                  </div>

                  <div className="flex gap-3">
                    <button
                      type="submit"
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors duration-200"
                    >
                      <Save className="h-4 w-4" />
                      Update Note
                    </button>
                    <button
                      type="button"
                      onClick={cancelEditing}
                      className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              ) : (
                <>
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getNoteTypeColor(note.note_type)}`}>
                        {note.note_type.charAt(0).toUpperCase() + note.note_type.slice(1)}
                      </span>
                      {note.is_confidential && (
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 flex items-center gap-1">
                          <Lock className="h-3 w-3" />
                          Confidential
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {new Date(note.created_at).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </div>
                  </div>

                  <div className="mb-3">
                    <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                      {note.note_content}
                    </p>
                  </div>

                  <div className="flex justify-between items-center">
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      By: {note.author?.name} {note.author?.surname}
                    </div>
                    
                    {canEditNotes && !editingMode && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => startEditingNote(note)}
                          className="p-1 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 transition-colors duration-200"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteNote(note.id)}
                          className="p-1 text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 transition-colors duration-200"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// FoundationalTraining Component
const FoundationalTraining: React.FC<{
  memberId: string;
  currentUserId: string;
  canEditTraining: boolean;
  editingMode?: boolean;
  onTrainingUpdated?: () => void;
}> = ({
  memberId,
  currentUserId,
  canEditTraining,
  editingMode = false,
  onTrainingUpdated
}) => {
  const [topics, setTopics] = useState<FoundationalTopic[]>([]);
  const [trainingProgress, setTrainingProgress] = useState<TrainingProgress[]>([]);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState({
    level1: 0,
    level2: 0,
    level3: 0,
    total: 0
  });
  const [expandedLevel, setExpandedLevel] = useState<number | null>(null);

  const fetchTrainingData = async () => {
    try {
      setLoading(true);
      
      // Fetch all active topics with correct column names
      const { data: topicsData, error: topicsError } = await supabase
        .from('foundational_topics')
        .select('*')
        .eq('is_active', true)
        .order('level')
        .order('topic_order');

      if (topicsError) throw topicsError;
      setTopics(topicsData || []);

      // Fetch member's training progress with topic details
      const { data: progressData, error: progressError } = await supabase
        .from('member_training_progress')
        .select(`
          *,
          topic:topic_id(*),
          completed_by_member:completed_by(name, surname)
        `)
        .eq('member_id', memberId);

      if (progressError) throw progressError;
      setTrainingProgress(progressData || []);

      // Calculate progress
      const level1Topics = topicsData?.filter(t => t.level === 1) || [];
      const level2Topics = topicsData?.filter(t => t.level === 2) || [];
      const level3Topics = topicsData?.filter(t => t.level === 3) || [];
      const totalTopics = topicsData?.length || 0;

      const completedLevel1 = progressData?.filter(p => 
        level1Topics.find(t => t.id === p.topic_id)
      ).length || 0;
      const completedLevel2 = progressData?.filter(p => 
        level2Topics.find(t => t.id === p.topic_id)
      ).length || 0;
      const completedLevel3 = progressData?.filter(p => 
        level3Topics.find(t => t.id === p.topic_id)
      ).length || 0;

      setProgress({
        level1: level1Topics.length > 0 ? Math.round((completedLevel1 / level1Topics.length) * 100) : 0,
        level2: level2Topics.length > 0 ? Math.round((completedLevel2 / level2Topics.length) * 100) : 0,
        level3: level3Topics.length > 0 ? Math.round((completedLevel3 / level3Topics.length) * 100) : 0,
        total: totalTopics > 0 ? Math.round((progressData?.length || 0) / totalTopics * 100) : 0
      });

    } catch (error) {
      console.error('Error fetching training data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrainingData();
  }, [memberId]);

  const handleTopicToggle = async (topicId: string, isCompleted: boolean) => {
    if (!canEditTraining) return;

    try {
      if (isCompleted) {
        // Remove completion
        const { error } = await supabase
          .from('member_training_progress')
          .delete()
          .eq('member_id', memberId)
          .eq('topic_id', topicId);

        if (error) throw error;
      } else {
        // Add completion
        const completionData = {
          member_id: memberId,
          topic_id: topicId,
          completed_by: currentUserId,
          completed_date: new Date().toISOString(),
          notes: `Completed foundational training topic`
        };

        const { error } = await supabase
          .from('member_training_progress')
          .insert([completionData]);

        if (error) throw error;
      }

      fetchTrainingData();
      if (onTrainingUpdated) onTrainingUpdated();
    } catch (error) {
      console.error('Error updating topic completion:', error);
      alert('Failed to update training progress. Please try again.');
    }
  };

  const getLevelTopics = (level: number) => {
    return topics.filter(topic => topic.level === level);
  };

  const getLevelTitle = (level: number) => {
    switch (level) {
      case 1: return 'Level 1: Foundations';
      case 2: return 'Level 2: Growth';
      case 3: return 'Level 3: Leadership';
      default: return `Level ${level}`;
    }
  };

  const getLevelColor = (level: number) => {
    switch (level) {
      case 1: return 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300';
      case 2: return 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300';
      case 3: return 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300';
      default: return 'bg-gray-100 dark:bg-gray-900/30 text-gray-700 dark:text-gray-300';
    }
  };

  const getProgressColor = (percentage: number) => {
    if (percentage >= 80) return 'bg-green-500';
    if (percentage >= 50) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const isTopicCompleted = (topicId: string) => {
    return trainingProgress.some(progress => progress.topic_id === topicId);
  };

  const getCompletionDetails = (topicId: string) => {
    const progress = trainingProgress.find(p => p.topic_id === topicId);
    if (!progress) return null;
    
    return {
      completedBy: progress.completed_by_member 
        ? `${progress.completed_by_member.name} ${progress.completed_by_member.surname}`
        : 'Unknown',
      completedDate: new Date(progress.completed_date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      }),
      notes: progress.notes
    };
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <BookOpen className="h-5 w-5" />
          Foundational Training
        </h3>
        <div className="text-sm text-gray-600 dark:text-gray-400">
          {canEditTraining ? 'Click to toggle completion' : 'View only'}
        </div>
      </div>

      {/* Progress Overview */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200 dark:border-blue-700/50 rounded-xl p-4">
        <div className="flex items-center justify-between mb-4">
          <h4 className="font-semibold text-gray-900 dark:text-white">Training Progress</h4>
          <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">{progress.total}%</span>
        </div>
        
        <div className="space-y-4">
          {[1, 2, 3].map(level => (
            <div key={level} className="space-y-2">
              <div className="flex justify-between items-center">
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${getLevelColor(level)}`}>
                  {getLevelTitle(level)}
                </span>
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {progress[`level${level}` as keyof typeof progress]}%
                </span>
              </div>
              <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div 
                  className={`h-full ${getProgressColor(progress[`level${level}` as keyof typeof progress])} transition-all duration-500`}
                  style={{ width: `${progress[`level${level}` as keyof typeof progress]}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">Loading training topics...</p>
        </div>
      ) : topics.length === 0 ? (
        <div className="text-center py-8 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
          <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-600 dark:text-gray-400">No training topics configured.</p>
          <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">
            Contact an administrator to set up foundational training topics.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {[1, 2, 3].map(level => {
            const levelTopics = getLevelTopics(level);
            if (levelTopics.length === 0) return null;

            const completedCount = levelTopics.filter(t => isTopicCompleted(t.id)).length;
            
            return (
              <div key={level} className="space-y-3">
                <button
                  onClick={() => setExpandedLevel(expandedLevel === level ? null : level)}
                  className="w-full flex items-center justify-between p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200"
                >
                  <div className="flex items-center gap-3">
                    <h4 className="text-md font-semibold text-gray-900 dark:text-white">
                      {getLevelTitle(level)}
                    </h4>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getLevelColor(level)}`}>
                      {completedCount}/{levelTopics.length} completed
                    </span>
                  </div>
                  <ChevronDown className={`h-5 w-5 text-gray-400 transition-transform duration-200 ${expandedLevel === level ? 'rotate-180' : ''}`} />
                </button>
                
                {expandedLevel === level && (
                  <div className="space-y-2 pl-4">
                    {levelTopics.map(topic => {
                      const isCompleted = isTopicCompleted(topic.id);
                      const completionDetails = getCompletionDetails(topic.id);
                      
                      return (
                        <div 
                          key={topic.id}
                          className={`bg-white dark:bg-gray-800 border rounded-lg p-3 hover:shadow-sm transition-all duration-200 ${
                            isCompleted 
                              ? 'border-green-200 dark:border-green-700/50' 
                              : 'border-gray-200 dark:border-gray-700'
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <button
                              onClick={() => handleTopicToggle(topic.id, isCompleted)}
                              disabled={!canEditTraining}
                              className={`flex-shrink-0 mt-1 ${canEditTraining ? 'cursor-pointer hover:scale-110 transition-transform duration-200' : 'cursor-default'}`}
                            >
                              {isCompleted ? (
                                <CheckCircle className="h-5 w-5 text-green-500" />
                              ) : (
                                <Circle className="h-5 w-5 text-gray-400" />
                              )}
                            </button>
                            
                            <div className="flex-1">
                              <div className="flex justify-between items-start">
                                <h5 className={`font-medium ${isCompleted ? 'text-green-700 dark:text-green-300' : 'text-gray-900 dark:text-white'}`}>
                                  {topic.topic_name}
                                </h5>
                                {isCompleted && (
                                  <Award className="h-4 w-4 text-yellow-500 flex-shrink-0" />
                                )}
                              </div>
                              {topic.topic_description && (
                                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                  {topic.topic_description}
                                </p>
                              )}
                              {topic.duration_minutes && (
                                <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                                  Duration: {topic.duration_minutes} minutes
                                </p>
                              )}
                              {completionDetails && (
                                <div className="mt-2 pt-2 border-t border-gray-100 dark:border-gray-700">
                                  <p className="text-xs text-gray-500 dark:text-gray-400">
                                    Completed by: {completionDetails.completedBy} on {completionDetails.completedDate}
                                  </p>
                                  {completionDetails.notes && (
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                      Notes: {completionDetails.notes}
                                    </p>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

// Main Members Component
const Members = () => {
  const { profile, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  
  const [showForm, setShowForm] = useState(false);
  const [members, setMembers] = useState<Member[]>([]);
  const [hiddenMembers, setHiddenMembers] = useState<Member[]>([]);
  const [cellGroups, setCellGroups] = useState<CellGroup[]>([]);
  const [ministryGroups, setMinistryGroups] = useState<MinistryGroup[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [editingMember, setEditingMember] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [availableStatuses] = useState<string[]>(VALID_STATUSES);
  const [showHiddenMembers, setShowHiddenMembers] = useState(false);
  const [exporting, setExporting] = useState(false);
  
  const [expandedMember, setExpandedMember] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'profile' | 'notes' | 'training'>('profile');
  
  const [selectedMinistryGroup, setSelectedMinistryGroup] = useState('');
  const [editSelectedMinistryGroup, setEditSelectedMinistryGroup] = useState('');
  
  const [selectedCellGroup, setSelectedCellGroup] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [selectedGender, setSelectedGender] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    surname: '',
    residence: '',
    phone: '',
    invited_by: '',
    cell_group_id: '',
    gender: '' as 'male' | 'female' | '',
    baptism: '',
  });
  
  const [editFormData, setEditFormData] = useState<{
    name: string;
    surname: string;
    residence: string;
    phone: string;
    invited_by: string;
    cell_group_id: string;
    gender: 'male' | 'female' | '';
    baptism: string;
    status: string;
    status_date: string;
    not_attending_reason: string;
    is_hidden: boolean;
  }>({
    name: '',
    surname: '',
    residence: '',
    phone: '',
    invited_by: '',
    cell_group_id: '',
    gender: '',
    baptism: '',
    status: 'newcomer',
    status_date: '',
    not_attending_reason: '',
    is_hidden: false,
  });

  // State for edit mode tabs
  const [editActiveTab, setEditActiveTab] = useState<'profile' | 'notes' | 'training'>('profile');

  const isAdmin = () => profile?.admin_role === 'admin' || profile?.admin_role === 'administrator';
  const isPastor = () => profile?.admin_role === 'pastor';
  const isDeacon = () => profile?.admin_role === 'deacon';
  const isGroupLeader = () => profile?.admin_role === 'group_leader';
  const isMember = () => profile?.admin_role === 'member' || !profile?.admin_role;

  const canViewAllMembers = () => isAdmin() || isPastor() || isDeacon();
  const canViewHiddenMembers = () => isAdmin() || isPastor() || isDeacon();
  const canEditMember = (memberCellGroupId?: string | null) => {
    if (isAdmin() || isPastor()) return true;
    if (isDeacon()) return profile?.can_edit_members || false;
    if (isGroupLeader()) return memberCellGroupId === profile?.cell_group_id;
    return false;
  };
  const canDeleteMember = () => isAdmin() || isPastor();
  const canCreateMember = () => {
    if (isAdmin() || isPastor()) return true;
    if (isDeacon() || isGroupLeader()) return profile?.can_add_members || false;
    return false;
  };
  const canExportMembers = () => isAdmin() || isPastor();

  const canViewConfidentialNotes = () => {
    return isAdmin() || isPastor() || isDeacon();
  };

  const canAddNotes = () => {
    return isAdmin() || isPastor() || isDeacon() || isGroupLeader();
  };

  const canManageTraining = () => {
    return isAdmin() || isPastor() || isDeacon() || isGroupLeader();
  };

  const getVisibleMembers = () => {
    if (canViewAllMembers()) return null;
    if (isGroupLeader()) return profile?.cell_group_id || null;
    if (isMember() && profile?.id) return profile.id;
    return null;
  };

  const isNotAttendingStatus = (status: string | null): boolean => {
    if (!status) return false;
    const statusLower = status.toLowerCase();
    return NOT_ATTENDING_STATUSES.some(notAttendingStatus => 
      statusLower.includes(notAttendingStatus.toLowerCase())
    );
  };

  useEffect(() => {
    if (profile) {
      fetchMembers();
      fetchCellGroups();
      fetchMinistryGroups();
    }
  }, [profile]);

  const fetchMembers = async () => {
    if (!profile) return;

    try {
      setLoading(true);
      setError(null);
      
      const visibleFilter = getVisibleMembers();
      
      if (visibleFilter || canViewAllMembers()) {
        let activeQuery = supabase
          .from('members')
          .select(`
            *,
            cell_groups!fk_cell_group(name)
          `);

        if (visibleFilter) {
          if (isMember()) {
            activeQuery = activeQuery.eq('id', visibleFilter);
          } else if (isGroupLeader()) {
            activeQuery = activeQuery.eq('cell_group_id', visibleFilter);
          }
        }

        const { data: activeMembersData, error: activeMembersError } = await activeQuery
          .eq('is_hidden', false)
          .order('created_at', { ascending: false });

        if (activeMembersError) {
          throw activeMembersError;
        }

        const activeMembersArray = Array.isArray(activeMembersData) ? activeMembersData : (activeMembersData ? [activeMembersData] : []);
        const activeMembersWithCellGroupName = activeMembersArray.map(member => ({
          ...member,
          cell_group_name: member.cell_groups?.name || null
        }));

        setMembers(activeMembersWithCellGroupName);
      } else {
        setMembers([]);
      }

      if (canViewHiddenMembers() && (visibleFilter || canViewAllMembers())) {
        let hiddenQuery = supabase
          .from('members')
          .select(`
            *,
            cell_groups!fk_cell_group(name)
          `);

        if (visibleFilter) {
          if (isMember()) {
            hiddenQuery = hiddenQuery.eq('id', visibleFilter);
          } else if (isGroupLeader()) {
            hiddenQuery = hiddenQuery.eq('cell_group_id', visibleFilter);
          }
        }

        const { data: hiddenMembersData, error: hiddenMembersError } = await hiddenQuery
          .eq('is_hidden', true)
          .order('created_at', { ascending: false });

        if (hiddenMembersError) {
          console.error('Error fetching hidden members:', hiddenMembersError);
          setHiddenMembers([]);
        } else {
          const hiddenMembersArray = Array.isArray(hiddenMembersData) ? hiddenMembersData : (hiddenMembersData ? [hiddenMembersData] : []);
          const hiddenMembersWithCellGroupName = hiddenMembersArray.map(member => ({
            ...member,
            cell_group_name: member.cell_groups?.name || null
          }));

          setHiddenMembers(hiddenMembersWithCellGroupName);
        }
      } else {
        setHiddenMembers([]);
      }
    } catch (error: any) {
      console.error('Error fetching members:', error);
      setError(error.message || 'Failed to load members.');
    } finally {
      setLoading(false);
    }
  };

  const fetchCellGroups = async () => {
    try {
      const { data, error } = await supabase
        .from('cell_groups')
        .select('id, name')
        .order('name');

      if (error) throw error;
      setCellGroups(data || []);
    } catch (error: any) {
      console.error('Error fetching cell groups:', error);
    }
  };

  const fetchMinistryGroups = async () => {
    try {
      const { data, error } = await supabase
        .from('ministry_groups')
        .select('id, name')
        .order('name');

      if (error) throw error;
      setMinistryGroups(data || []);
    } catch (error: any) {
      console.error('Error fetching ministry groups:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!canCreateMember()) {
      setError('You do not have permission to add members.');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);
    
    if (!formData.name.trim() || !formData.surname.trim() || !formData.residence.trim() || !formData.gender) {
      setError('Name, surname, residence, and gender are required fields.');
      setLoading(false);
      return;
    }

    try {
      const newMemberData: {
        name: string;
        surname: string;
        residence: string;
        phone: string | null;
        cell_group_id: string | null;
        gender: 'male' | 'female' | null;
        invited_by: string | null;
        baptism: string | null;
        status: 'newcomer';
        status_date: string;
        is_permanent_member: boolean;
        is_hidden: boolean;
        not_attending_reason: null;
      } = {
        name: formData.name.trim(),
        surname: formData.surname.trim(),
        residence: formData.residence.trim(),
        phone: formData.phone.trim() || null,
        cell_group_id: formData.cell_group_id || null,
        gender: (formData.gender === 'male' || formData.gender === 'female') ? formData.gender : null,
        invited_by: formData.invited_by.trim() || null,
        baptism: formData.baptism || null,
        status: 'newcomer',
        status_date: new Date().toISOString(),
        is_permanent_member: false,
        is_hidden: false,
        not_attending_reason: null,
      };

      const { data: newMember, error: memberError } = await supabase
        .from('members')
        .insert([newMemberData])
        .select()
        .single();

      if (memberError) {
        throw memberError;
      }

      await logAudit('members', newMember.id, 'INSERT', null, newMemberData);

      if (selectedMinistryGroup && newMember) {
        const ministryData = {
          member_id: newMember.id,
          ministry_group_id: selectedMinistryGroup,
          role: 'member'
        };

        const { error: ministryError } = await supabase
          .from('ministry_group_members')
          .insert([ministryData]);

        if (ministryError) {
          console.error('Error adding to ministry group:', ministryError);
          await logAudit('ministry_group_members', newMember.id, 'INSERT', null, {
            ...ministryData,
            error: ministryError.message
          });
        } else {
          await logAudit('ministry_group_members', newMember.id, 'INSERT', null, ministryData);
        }
      }

      setShowForm(false);
      resetForm();
      setSuccess('Member added successfully as a newcomer!');
      fetchMembers();
      
      setTimeout(() => setSuccess(null), 3000);
    } catch (error: any) {
      console.error('Error adding member:', error);
      setError(error.message || 'Failed to add member. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleEditMember = async (member: Member) => {
    if (!canEditMember(member.cell_group_id)) {
      setError('You do not have permission to edit this member.');
      return;
    }

    setEditingMember(member.id);
    setEditFormData({
      name: member.name,
      surname: member.surname,
      residence: member.residence || '',
      phone: member.phone || '',
      invited_by: member.invited_by || '',
      cell_group_id: member.cell_group_id || '',
      gender: member.gender || '',
      baptism: member.baptism || '',
      status: member.status || 'newcomer',
      status_date: member.status_date ? new Date(member.status_date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      not_attending_reason: member.not_attending_reason || '',
      is_hidden: member.is_hidden || false,
    });
    setEditActiveTab('profile');
    
    if (member.id) {
      try {
        const { data: ministryData, error } = await supabase
          .from('ministry_group_members')
          .select('ministry_group_id')
          .eq('member_id', member.id)
          .maybeSingle();
        
        if (error && error.code !== 'PGRST116') {
          console.error('Error fetching ministry group:', error);
        }
        
        setEditSelectedMinistryGroup(ministryData?.ministry_group_id || '');
      } catch (error) {
        console.error('Error fetching ministry group:', error);
        setEditSelectedMinistryGroup('');
      }
    }
  };

  const handleSaveMember = async (memberId: string) => {
    if (!canEditMember()) {
      setError('You do not have permission to edit members.');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);
    
    try {
      if (!editFormData.name.trim() || !editFormData.surname.trim() || !editFormData.residence.trim() || !editFormData.gender) {
        setError('Name, surname, residence, and gender are required fields.');
        setLoading(false);
        return;
      }

      const status = editFormData.status.toLowerCase();
      if (!VALID_STATUSES.some(validStatus => status.includes(validStatus.toLowerCase()))) {
        setError(`Invalid status. Please use one of: ${VALID_STATUSES.join(', ')}`);
        setLoading(false);
        return;
      }

      const isNotAttending = isNotAttendingStatus(editFormData.status);
      const shouldBeHidden = isNotAttending;
      
      const not_attending_reason = isNotAttending 
        ? (editFormData.not_attending_reason || 'Member stopped attending')
        : null;

      const updateData: any = {
        name: editFormData.name.trim(),
        surname: editFormData.surname.trim(),
        residence: editFormData.residence.trim(),
        phone: editFormData.phone.trim() || null,
        cell_group_id: editFormData.cell_group_id || null,
        gender: editFormData.gender || null,
        invited_by: editFormData.invited_by.trim() || null,
        baptism: editFormData.baptism || null,
        status: editFormData.status,
        status_date: editFormData.status_date ? new Date(editFormData.status_date).toISOString() : new Date().toISOString(),
        is_permanent_member: editFormData.status.toLowerCase().includes('permanent'),
        not_attending_reason,
        is_hidden: shouldBeHidden,
      };

      if (editFormData.status.toLowerCase().includes('permanent')) {
        updateData.permanent_member_date = new Date().toISOString();
      }

      const { data: oldMemberData } = await supabase
        .from('members')
        .select('*')
        .eq('id', memberId)
        .single();

      const { error: memberError } = await supabase
        .from('members')
        .update(updateData)
        .eq('id', memberId);

      if (memberError) {
        throw memberError;
      }

      await logAudit('members', memberId, 'UPDATE', oldMemberData, updateData);

      const { data: oldMinistryData } = await supabase
        .from('ministry_group_members')
        .select('*')
        .eq('member_id', memberId);

      if (oldMinistryData && oldMinistryData.length > 0) {
        await supabase
          .from('ministry_group_members')
          .delete()
          .eq('member_id', memberId);

        await logAudit('ministry_group_members', memberId, 'DELETE', oldMinistryData, null);
      }
      
      if (editSelectedMinistryGroup) {
        const newMinistryData = {
          member_id: memberId,
          ministry_group_id: editSelectedMinistryGroup,
          role: 'member'
        };

        await supabase
          .from('ministry_group_members')
          .insert([newMinistryData]);

        await logAudit('ministry_group_members', memberId, 'INSERT', null, newMinistryData);
      }

      setEditingMember(null);
      setEditSelectedMinistryGroup('');
      
      let message = 'Member details updated successfully!';
      if (isNotAttending) {
        message += ' Member has been automatically hidden due to not attending status.';
      }
      
      setSuccess(message);
      fetchMembers();
      
      setTimeout(() => setSuccess(null), 3000);
    } catch (error: any) {
      console.error('Error updating member:', error);
      setError(error.message || 'Failed to update member details. Please check if the status value is valid.');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelEdit = () => {
    setEditingMember(null);
    setEditFormData({
      name: '',
      surname: '',
      residence: '',
      phone: '',
      invited_by: '',
      cell_group_id: '',
      gender: '',
      baptism: '',
      status: 'newcomer',
      status_date: '',
      not_attending_reason: '',
      is_hidden: false,
    });
    setEditSelectedMinistryGroup('');
    setEditActiveTab('profile');
  };

  const handleRestoreMember = async (memberId: string) => {
    if (!canEditMember()) {
      setError('You do not have permission to restore members.');
      return;
    }

    if (!confirm('Restore this member? They will appear in the main members list again as a newcomer.')) {
      return;
    }

    try {
      setError(null);
      setSuccess(null);
      
      const { data: oldMemberData } = await supabase
        .from('members')
        .select('*')
        .eq('id', memberId)
        .single();

      const updateData: {
        is_hidden: boolean;
        status: 'newcomer';
        status_date: string;
        not_attending_reason: null;
      } = {
        is_hidden: false,
        status: 'newcomer',
        status_date: new Date().toISOString(),
        not_attending_reason: null
      };

      const { error: restoreError } = await supabase
        .from('members')
        .update(updateData)
        .eq('id', memberId);

      if (restoreError) {
        throw restoreError;
      }

      await logAudit('members', memberId, 'UPDATE', oldMemberData, updateData);
      
      setSuccess('Member restored successfully as a newcomer!');
      fetchMembers();
      setTimeout(() => setSuccess(null), 3000);
    } catch (error: any) {
      console.error('Error restoring member:', error);
      setError(error.message || 'Failed to restore member.');
    }
  };

  const handlePermanentDeleteMember = async (memberId: string, memberName: string) => {
    if (!canDeleteMember()) {
      setError('You do not have permission to delete members.');
      return;
    }

    if (!confirm(`⚠️ WARNING: This will permanently delete ${memberName}. This action cannot be undone. Are you absolutely sure?`)) {
      return;
    }

    try {
      setError(null);
      setSuccess(null);
      
      const { data: memberData } = await supabase
        .from('members')
        .select('*')
        .eq('id', memberId)
        .single();

      const { data: ministryData } = await supabase
        .from('ministry_group_members')
        .select('*')
        .eq('member_id', memberId);

      await supabase
        .from('ministry_group_members')
        .delete()
        .eq('member_id', memberId);

      if (ministryData && ministryData.length > 0) {
        for (const ministry of ministryData) {
          await logAudit('ministry_group_members', ministry.id, 'DELETE', ministry, null);
        }
      }
      
      const { error: deleteError } = await supabase
        .from('members')
        .delete()
        .eq('id', memberId);

      if (deleteError) {
        throw deleteError;
      }

      await logAudit('members', memberId, 'DELETE', memberData, null);
      
      setSuccess('Member permanently deleted.');
      fetchMembers();
      setTimeout(() => setSuccess(null), 3000);
    } catch (error: any) {
      console.error('Error deleting member:', error);
      setError(error.message || 'Cannot delete member. They may have records in other tables.');
    }
  };

  const handleExportMembers = async () => {
    if (!canExportMembers()) {
      setError('You do not have permission to export members.');
      return;
    }

    setExporting(true);
    try {
      const exportData = members.map(member => ({
        Name: member.name,
        Surname: member.surname,
        Phone: member.phone,
        Residence: member.residence,
        Gender: member.gender,
        Status: member.status,
        'Cell Group': member.cell_group_name,
        'Baptism Date': member.baptism,
        'Invited By': member.invited_by,
        'Member Since': member.created_at,
        'Permanent Member': member.is_permanent_member ? 'Yes' : 'No',
        'Permanent Since': member.permanent_member_date,
      }));

      const csvContent = [
        Object.keys(exportData[0] || {}).join(','),
        ...exportData.map(row => Object.values(row).map(val => 
          `"${val ? val.toString().replace(/"/g, '""') : ''}"`
        ).join(','))
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `members_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      setSuccess('Members exported successfully!');
      setTimeout(() => setSuccess(null), 3000);
    } catch (error) {
      console.error('Error exporting members:', error);
      setError('Failed to export members.');
    } finally {
      setExporting(false);
    }
  };

  const filteredMembers = members.filter((member) => {
    const matchesSearch = 
      member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.surname.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.residence?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.phone?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.cell_group_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.baptism?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCellGroup = !selectedCellGroup || member.cell_group_id === selectedCellGroup;
    const matchesStatus = !selectedStatus || member.status === selectedStatus;
    const matchesGender = !selectedGender || member.gender === selectedGender;

    return matchesSearch && matchesCellGroup && matchesStatus && matchesGender;
  });

  const filteredHiddenMembers = hiddenMembers.filter((member) => {
    const matchesSearch = 
      member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.surname.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.residence?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.phone?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.cell_group_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.baptism?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCellGroup = !selectedCellGroup || member.cell_group_id === selectedCellGroup;
    const matchesStatus = !selectedStatus || member.status === selectedStatus;
    const matchesGender = !selectedGender || member.gender === selectedGender;

    return matchesSearch && matchesCellGroup && matchesStatus && matchesGender;
  });

  const getInitials = (name: string, surname: string) => {
    return `${name.charAt(0)}${surname.charAt(0)}`.toUpperCase();
  };

  const resetForm = () => {
    setFormData({ 
      name: '', 
      surname: '', 
      residence: '', 
      phone: '', 
      invited_by: '', 
      cell_group_id: '',
      gender: '',
      baptism: '',
    });
    setSelectedMinistryGroup('');
    setShowForm(false);
    setError(null);
  };

  const getStatusBadge = (status: string | null) => {
    if (!status) return { color: 'bg-gray-100 dark:bg-gray-900/30 text-gray-700 dark:text-gray-300', text: 'No Status' };
    
    const statusLower = status.toLowerCase();
    
    if (isNotAttendingStatus(status)) {
      return { color: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300', text: status };
    } else if (statusLower.includes('newcomer')) {
      return { color: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300', text: status };
    } else if (statusLower.includes('member') && !statusLower.includes('signed') && !statusLower.includes('permanent')) {
      return { color: 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300', text: status };
    } else if (statusLower.includes('signed')) {
      return { color: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300', text: status };
    } else if (statusLower.includes('permanent')) {
      return { color: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300', text: status };
    } else if (statusLower.includes('active')) {
      return { color: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300', text: status };
    } else {
      return { color: 'bg-gray-100 dark:bg-gray-900/30 text-gray-700 dark:text-gray-300', text: status };
    }
  };

  const getStatusCounts = () => {
    const counts: Record<string, number> = {};
    
    members.forEach(member => {
      const status = member.status || 'No Status';
      counts[status] = (counts[status] || 0) + 1;
    });
    
    return {
      total: members.length,
      ...counts,
      baptized: members.filter(m => m.baptism && m.baptism.trim() !== '').length,
      hidden: hiddenMembers.length,
    };
  };

  const statusCounts = getStatusCounts();

  const renderRoleBadge = () => {
    if (!profile) return null;
    
    if (isAdmin()) {
      return (
        <span className="px-3 py-1 rounded-full text-sm font-medium bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 flex items-center gap-1">
          <Shield className="h-3 w-3" />
          Admin
        </span>
      );
    } else if (isPastor()) {
      return (
        <span className="px-3 py-1 rounded-full text-sm font-medium bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 flex items-center gap-1">
          <User className="h-3 w-3" />
          Pastor
        </span>
      );
    } else if (isDeacon()) {
      return (
        <span className="px-3 py-1 rounded-full text-sm font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 flex items-center gap-1">
          <Users className="h-3 w-3" />
          Deacon
        </span>
      );
    } else if (isGroupLeader()) {
      return (
        <span className="px-3 py-1 rounded-full text-sm font-medium bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 flex items-center gap-1">
          <Key className="h-3 w-3" />
          Group Leader
        </span>
      );
    } else {
      return (
        <span className="px-3 py-1 rounded-full text-sm font-medium bg-gray-100 dark:bg-gray-900/30 text-gray-700 dark:text-gray-300 flex items-center gap-1">
          <User className="h-3 w-3" />
          Member
        </span>
      );
    }
  };

  const renderEditTabs = (member: Member) => (
    <div className="mt-6 border-t border-gray-200 dark:border-gray-600 pt-6">
      <div className="flex border-b border-gray-200 dark:border-gray-600 mb-6">
        <button
          className={`px-4 py-2 font-medium transition-colors duration-200 flex items-center gap-2 ${
            editActiveTab === 'profile' 
              ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400' 
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-300'
          }`}
          onClick={() => setEditActiveTab('profile')}
        >
          <User className="h-4 w-4" />
          Profile
        </button>
        {canAddNotes() && (
          <button
            className={`px-4 py-2 font-medium transition-colors duration-200 flex items-center gap-2 ${
              editActiveTab === 'notes' 
                ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400' 
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-300'
            }`}
            onClick={() => setEditActiveTab('notes')}
          >
            <Clipboard className="h-4 w-4" />
            Notes
          </button>
        )}
        {canManageTraining() && (
          <button
            className={`px-4 py-2 font-medium transition-colors duration-200 flex items-center gap-2 ${
              editActiveTab === 'training' 
                ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400' 
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-300'
            }`}
            onClick={() => setEditActiveTab('training')}
          >
            <BookText className="h-4 w-4" />
            Training
          </button>
        )}
      </div>
      
      {editActiveTab === 'profile' && (
        <div className="space-y-6">
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center gap-3">
                <Phone className="h-4 w-4 text-gray-400 flex-shrink-0" />
                <input
                  type="tel"
                  value={editFormData.phone}
                  onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })}
                  className="flex-1 bg-transparent border-b border-gray-300 dark:border-gray-600 focus:outline-none focus:border-blue-500 px-1 text-gray-600 dark:text-gray-400"
                  placeholder="Phone number"
                />
              </div>
              <div className="flex items-center gap-3">
                <MapPin className="h-4 w-4 text-gray-400 flex-shrink-0" />
                <input
                  type="text"
                  value={editFormData.residence}
                  onChange={(e) => setEditFormData({ ...editFormData, residence: e.target.value })}
                  className="flex-1 bg-transparent border-b border-gray-300 dark:border-gray-600 focus:outline-none focus:border-blue-500 px-1 text-gray-600 dark:text-gray-400"
                  placeholder="Residence"
                  required
                />
              </div>
              <div className="flex items-center gap-3">
                <Droplets className="h-4 w-4 text-gray-400 flex-shrink-0" />
                <input
                  type="date"
                  value={editFormData.baptism}
                  onChange={(e) => setEditFormData({ ...editFormData, baptism: e.target.value })}
                  className="flex-1 bg-transparent border-b border-gray-300 dark:border-gray-600 focus:outline-none focus:border-blue-500 px-1 text-gray-600 dark:text-gray-400"
                />
              </div>
              <div className="flex items-center gap-3">
                <MapPin className="h-4 w-4 text-gray-400 flex-shrink-0" />
                <select
                  value={editFormData.cell_group_id}
                  onChange={(e) => setEditFormData({ ...editFormData, cell_group_id: e.target.value })}
                  className="flex-1 bg-transparent border-b border-gray-300 dark:border-gray-600 focus:outline-none focus:border-blue-500 px-1 text-gray-600 dark:text-gray-400"
                >
                  <option value="">Select cell group</option>
                  {cellGroups.map((group) => (
                    <option key={group.id} value={group.id}>
                      {group.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-3">
                <User className="h-4 w-4 text-gray-400 flex-shrink-0" />
                <select
                  value={editFormData.gender}
                  onChange={(e) => setEditFormData({ ...editFormData, gender: e.target.value as 'male' | 'female' | '' })}
                  className="flex-1 bg-transparent border-b border-gray-300 dark:border-gray-600 focus:outline-none focus:border-blue-500 px-1 text-gray-600 dark:text-gray-400"
                  required
                >
                  <option value="">Select gender *</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                </select>
              </div>
              <div className="flex items-center gap-3">
                <User className="h-4 w-4 text-gray-400 flex-shrink-0" />
                <input
                  type="text"
                  value={editFormData.invited_by}
                  onChange={(e) => setEditFormData({ ...editFormData, invited_by: e.target.value })}
                  className="flex-1 bg-transparent border-b border-gray-300 dark:border-gray-600 focus:outline-none focus:border-blue-500 px-1 text-gray-600 dark:text-gray-400"
                  placeholder="Invited by"
                />
              </div>
              <div className="flex items-center gap-3">
                <User className="h-4 w-4 text-gray-400 flex-shrink-0" />
                <select
                  value={editSelectedMinistryGroup}
                  onChange={(e) => setEditSelectedMinistryGroup(e.target.value)}
                  className="flex-1 bg-transparent border-b border-gray-300 dark:border-gray-600 focus:outline-none focus:border-blue-500 px-1 text-gray-600 dark:text-gray-400"
                >
                  <option value="">Select ministry group</option>
                  {ministryGroups.map((group) => (
                    <option key={group.id} value={group.id}>
                      {group.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="border-t border-gray-200 dark:border-gray-600 pt-4">
            <h4 className="font-semibold text-gray-900 dark:text-white mb-3">Status</h4>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-600 dark:text-gray-400 min-w-20">Status:</span>
                <select
                  value={editFormData.status}
                  onChange={(e) => setEditFormData({ ...editFormData, status: e.target.value })}
                  className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {availableStatuses.map(status => (
                    <option key={status} value={status}>{status}</option>
                  ))}
                </select>
                {isNotAttendingStatus(editFormData.status) && (
                  <span className="text-xs text-red-600 dark:text-red-400">
                    (Will auto-hide)
                  </span>
                )}
              </div>
              
              {isNotAttendingStatus(editFormData.status) && (
                <div className="flex items-center gap-3">
                  <span className="text-sm text-gray-600 dark:text-gray-400 min-w-20">Reason:</span>
                  <input
                    type="text"
                    value={editFormData.not_attending_reason}
                    onChange={(e) => setEditFormData({ ...editFormData, not_attending_reason: e.target.value })}
                    className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Reason for not attending"
                  />
                </div>
              )}
              
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                <Calendar className="h-4 w-4 text-gray-400 flex-shrink-0" />
                <span className="text-sm text-gray-600 dark:text-gray-400 sm:min-w-32">Status Date:</span>
                <input
                  type="date"
                  value={editFormData.status_date}
                  onChange={(e) => setEditFormData({ ...editFormData, status_date: e.target.value })}
                  className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {editActiveTab === 'notes' && canAddNotes() && (
        <MemberNotes
          memberId={member.id}
          currentUserId={profile?.id || ''}
          canViewConfidential={canViewConfidentialNotes()}
          canEditNotes={canEditMember(member.cell_group_id)}
          editingMode={true}
          onNoteAdded={() => {
            setSuccess('Note added successfully!');
            setTimeout(() => setSuccess(null), 3000);
          }}
        />
      )}

      {editActiveTab === 'training' && canManageTraining() && (
        <FoundationalTraining
          memberId={member.id}
          currentUserId={profile?.id || ''}
          canEditTraining={canEditMember(member.cell_group_id)}
          editingMode={true}
          onTrainingUpdated={() => {
            setSuccess('Training progress updated!');
            setTimeout(() => setSuccess(null), 3000);
          }}
        />
      )}

      <div className="flex flex-col sm:flex-row gap-3 pt-6 border-t border-gray-200 dark:border-gray-600">
        <button
          onClick={() => handleSaveMember(member.id)}
          disabled={loading}
          className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium disabled:opacity-50 transition-all duration-200"
        >
          <Save className="h-4 w-4" />
          {loading ? 'Saving...' : 'Save Changes'}
        </button>
        <button
          onClick={handleCancelEdit}
          className="flex-1 px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200 text-center"
        >
          Cancel
        </button>
      </div>
    </div>
  );

  const renderMemberCard = (member: Member, isHidden: boolean = false) => (
    <div 
      key={member.id} 
      className={`bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl border rounded-2xl p-4 md:p-6 hover:shadow-xl transition-all duration-300 group ${
        isHidden 
          ? 'border-red-200/50 dark:border-red-700/50 hover:border-red-300/50 dark:hover:border-red-600/50' 
          : 'border-gray-200/50 dark:border-gray-700/50 hover:border-gray-300/50 dark:hover:border-gray-600/50'
      }`}
    >
      {editingMember === member.id ? (
        <div className="space-y-6">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 md:w-14 md:h-14 rounded-xl bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold text-lg shadow-lg">
                {getInitials(editFormData.name, editFormData.surname)}
              </div>
              <div>
                <div className="flex flex-col sm:flex-row gap-3 mb-2">
                  <input
                    type="text"
                    value={editFormData.name}
                    onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                    className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white bg-transparent border-b border-gray-300 dark:border-gray-600 focus:outline-none focus:border-blue-500 px-1"
                    placeholder="First Name"
                  />
                  <input
                    type="text"
                    value={editFormData.surname}
                    onChange={(e) => setEditFormData({ ...editFormData, surname: e.target.value })}
                    className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white bg-transparent border-b border-gray-300 dark:border-gray-600 focus:outline-none focus:border-blue-500 px-1"
                    placeholder="Last Name"
                  />
                </div>
                <select
                  value={editFormData.status}
                  onChange={(e) => setEditFormData({ ...editFormData, status: e.target.value })}
                  className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusBadge(editFormData.status).color} border-none focus:ring-2 focus:ring-blue-500`}
                >
                  {availableStatuses.map(status => (
                    <option key={status} value={status}>{status}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {renderEditTabs(member)}
        </div>
      ) : (
        <>
          <div className="flex flex-col lg:flex-row justify-between gap-6">
            <div className="flex-1">
              <div className="flex items-start gap-4 mb-4">
                <div className={`w-12 h-12 md:w-14 md:h-14 rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-lg ${
                  isHidden 
                    ? 'bg-gradient-to-br from-red-500 to-orange-500' 
                    : 'bg-gradient-to-br from-blue-500 to-purple-500'
                }`}>
                  {getInitials(member.name, member.surname)}
                </div>
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-2 md:gap-3 mb-2">
                    <h3 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">
                      {member.name} {member.surname}
                    </h3>
                    <span className={`px-2 md:px-3 py-1 rounded-full text-sm font-medium ${getStatusBadge(member.status).color}`}>
                      {getStatusBadge(member.status).text}
                    </span>
                    {isHidden && (
                      <span className="px-2 md:px-3 py-1 rounded-full text-sm font-medium bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 flex items-center gap-1">
                        <EyeOff className="h-3 w-3" />
                        Hidden
                      </span>
                    )}
                    {member.is_permanent_member && (
                      <span className="px-2 md:px-3 py-1 rounded-full text-sm font-medium bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 flex items-center gap-1">
                        Permanent
                      </span>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-gray-600 dark:text-gray-400">
                    {member.phone && (
                      <div className="flex items-center gap-3">
                        <Phone className="h-4 w-4 flex-shrink-0" />
                        <span className="font-medium">{member.phone}</span>
                      </div>
                    )}
                    {member.residence && (
                      <div className="flex items-center gap-3">
                        <MapPin className="h-4 w-4 flex-shrink-0" />
                        <span className="font-medium break-all">{member.residence}</span>
                      </div>
                    )}
                    {member.baptism && (
                      <div className="flex items-start gap-3">
                        <Droplets className="h-4 w-4 flex-shrink-0 mt-1" />
                        <span className="font-medium text-blue-600 dark:text-blue-400 break-all">
                          Baptized: {new Date(member.baptism).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric'
                          })}
                        </span>
                      </div>
                    )}
                    <div className="flex items-center gap-3">
                      <MapPin className="h-4 w-4 flex-shrink-0" />
                      <span className="font-medium">{member.cell_group_name || 'No Cell Group'}</span>
                    </div>
                    {member.gender && (
                      <div className="flex items-center gap-3 text-sm">
                        <User className="h-4 w-4 flex-shrink-0" />
                        <span>Gender: {member.gender}</span>
                      </div>
                    )}
                    {member.invited_by && (
                      <div className="flex items-center gap-3 text-sm">
                        <User className="h-4 w-4 flex-shrink-0" />
                        <span>Invited by: {member.invited_by}</span>
                      </div>
                    )}
                    {member.permanent_member_date && (
                      <div className="text-sm text-purple-600 dark:text-purple-400">
                        Permanent since: {new Date(member.permanent_member_date).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric'
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex flex-col justify-between items-stretch lg:items-end gap-4">
              <div className="flex flex-col sm:flex-row lg:flex-col gap-3">
                {canEditMember(member.cell_group_id) && (
                  <button
                    onClick={() => handleEditMember(member)}
                    className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl hover:shadow-lg transition-all duration-200 font-medium group"
                  >
                    <Edit2 className="h-4 w-4 group-hover:scale-110 transition-transform duration-200" />
                    <span className="hidden sm:inline">Edit</span>
                  </button>
                )}
                
                {!isHidden && (canAddNotes() || canManageTraining()) && (
                  <button
                    onClick={() => {
                      if (expandedMember === member.id) {
                        setExpandedMember(null);
                        setActiveTab('profile');
                      } else {
                        setExpandedMember(member.id);
                        setActiveTab('profile');
                      }
                    }}
                    className="flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-700 hover:to-gray-800 text-white rounded-xl hover:shadow-lg transition-all duration-200 font-medium group"
                  >
                    {expandedMember === member.id ? (
                      <>
                        <ChevronUp className="h-4 w-4 group-hover:scale-110 transition-transform duration-200" />
                        <span className="hidden sm:inline">Show Less</span>
                      </>
                    ) : (
                      <>
                        <ChevronDown className="h-4 w-4 group-hover:scale-110 transition-transform duration-200" />
                        <span className="hidden sm:inline">Show More</span>
                      </>
                    )}
                  </button>
                )}

                {isHidden ? (
                  <>
                    {canEditMember(null) && (
                      <button
                        onClick={() => handleRestoreMember(member.id)}
                        className="flex items-center justify-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-xl hover:shadow-lg transition-all duration-200 font-medium group"
                      >
                        <RefreshCw className="h-4 w-4 group-hover:rotate-180 transition-transform duration-200" />
                        <span className="hidden sm:inline">Restore</span>
                      </button>
                    )}
                    {canDeleteMember() && (
                      <button
                        onClick={() => handlePermanentDeleteMember(member.id, `${member.name} ${member.surname}`)}
                        className="flex items-center justify-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl hover:shadow-lg transition-all duration-200 font-medium group"
                      >
                        <Trash2 className="h-4 w-4 group-hover:scale-110 transition-transform duration-200" />
                        <span className="hidden sm:inline">Delete</span>
                      </button>
                    )}
                  </>
                ) : canDeleteMember() && (
                  <button
                    onClick={() => handlePermanentDeleteMember(member.id, `${member.name} ${member.surname}`)}
                    className="flex items-center justify-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl hover:shadow-lg transition-all duration-200 font-medium group"
                  >
                    <Trash2 className="h-4 w-4 group-hover:scale-110 transition-transform duration-200" />
                    <span className="hidden sm:inline">Delete</span>
                  </button>
                )}
              </div>
              <div className="space-y-2">
                {member.status_date && (
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    {member.status ? `${member.status} since: ` : 'Member since: '}
                    {new Date(member.status_date).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric'
                    })}
                  </div>
                )}
                {member.not_attending_reason && (
                  <div className="text-sm text-red-600 dark:text-red-400 max-w-xs break-words">
                    Reason: {member.not_attending_reason}
                  </div>
                )}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400 overflow-hidden">
                ID: {member.id.slice(0, 8)}...
              </div>
            </div>
          </div>

          {!isHidden && expandedMember === member.id && (
            <div className="mt-6 border-t border-gray-200 dark:border-gray-700 pt-6">
              <div className="flex border-b border-gray-200 dark:border-gray-700">
                <button
                  className={`px-4 py-2 font-medium transition-colors duration-200 ${
                    activeTab === 'profile' 
                      ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400' 
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-300'
                  }`}
                  onClick={() => setActiveTab('profile')}
                >
                  Profile Details
                </button>
                {canAddNotes() && (
                  <button
                    className={`px-4 py-2 font-medium transition-colors duration-200 ${
                      activeTab === 'notes' 
                        ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400' 
                        : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-300'
                    }`}
                    onClick={() => setActiveTab('notes')}
                  >
                    Notes
                  </button>
                )}
                {canManageTraining() && (
                  <button
                    className={`px-4 py-2 font-medium transition-colors duration-200 ${
                      activeTab === 'training' 
                        ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400' 
                        : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-300'
                    }`}
                    onClick={() => setActiveTab('training')}
                  >
                    Foundational Training
                  </button>
                )}
              </div>
              
              <div className="mt-6">
                {activeTab === 'profile' && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-gray-600 dark:text-gray-400">
                      {member.created_at && (
                        <div className="flex items-center gap-3">
                          <Calendar className="h-4 w-4 text-gray-400" />
                          <span>Joined: {new Date(member.created_at).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric'
                          })}</span>
                        </div>
                      )}
                      {member.status && (
                        <div className="flex items-center gap-3">
                          <span>Current Status: <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadge(member.status).color}`}>
                            {getStatusBadge(member.status).text}
                          </span></span>
                        </div>
                      )}
                    </div>
                    {member.not_attending_reason && (
                      <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700/50 rounded-lg">
                        <div className="text-sm text-red-700 dark:text-red-300">
                          <strong>Not Attending Reason:</strong> {member.not_attending_reason}
                        </div>
                      </div>
                    )}
                  </div>
                )}
                
                {activeTab === 'notes' && canAddNotes() && (
                  <MemberNotes
                    memberId={member.id}
                    currentUserId={profile?.id || ''}
                    canViewConfidential={canViewConfidentialNotes()}
                    canEditNotes={canEditMember(member.cell_group_id)}
                  />
                )}
                
                {activeTab === 'training' && canManageTraining() && (
                  <FoundationalTraining
                    memberId={member.id}
                    currentUserId={profile?.id || ''}
                    canEditTraining={canEditMember(member.cell_group_id)}
                  />
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Redirecting to login...</p>
        </div>
      </div>
    );
  }

  if (isMember() && !isAdmin() && !isPastor() && !isDeacon() && !isGroupLeader()) {
    const memberProfile = members.find(m => m.id === profile.id);
    
    if (!memberProfile) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-4 md:p-6">
          <div className="max-w-7xl mx-auto">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                    My Profile
                  </h1>
                  {renderRoleBadge()}
                </div>
                <p className="text-gray-600 dark:text-gray-400">
                  View your member profile information
                </p>
              </div>
            </div>

            <div className="text-center py-12 bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl border border-gray-200/50 dark:border-gray-700/50 rounded-2xl">
              <User className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-600 dark:text-gray-400 mb-2">
                Profile Not Found
              </h3>
              <p className="text-gray-500 dark:text-gray-500">
                Your member profile could not be loaded. Please contact an administrator.
              </p>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-4 md:p-6 animate-fadeIn">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  My Profile
                </h1>
                {renderRoleBadge()}
              </div>
              <p className="text-gray-600 dark:text-gray-400">
                View your member profile information
              </p>
            </div>
          </div>

          <div className="grid gap-4 md:gap-6">
            {renderMemberCard(memberProfile, false)}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-4 md:p-6 animate-fadeIn">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Members Directory
              </h1>
              {renderRoleBadge()}
            </div>
            <p className="text-gray-600 dark:text-gray-400">
              {isGroupLeader() ? 'View and manage members in your cell group' :
               isDeacon() ? 'View all members' :
               'Manage and view all church members'}
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
            {canViewHiddenMembers() && (
              <button
                onClick={() => {
                  setShowHiddenMembers(!showHiddenMembers);
                  fetchMembers();
                }}
                className="flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-amber-600 to-orange-600 text-white rounded-xl hover:shadow-lg transition-all duration-200 hover:scale-105 font-medium group"
              >
                {showHiddenMembers ? (
                  <>
                    <Eye className="h-5 w-5 group-hover:scale-110 transition-transform duration-200" />
                    Show Active Members
                  </>
                ) : (
                  <>
                    <EyeOff className="h-5 w-5 group-hover:scale-110 transition-transform duration-200" />
                    Show Hidden Members ({hiddenMembers.length})
                  </>
                )}
              </button>
            )}
            {canCreateMember() && (
              <button
                onClick={() => setShowForm(!showForm)}
                className="flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:shadow-lg transition-all duration-200 hover:scale-105 font-medium group"
              >
                <Plus className="h-5 w-5 group-hover:rotate-90 transition-transform duration-200" />
                {showForm ? 'Cancel' : 'Add Member'}
              </button>
            )}
            {canExportMembers() && (
              <button
                onClick={handleExportMembers}
                disabled={exporting}
                className="flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl hover:shadow-lg transition-all duration-200 hover:scale-105 font-medium group disabled:opacity-50"
              >
                <Download className="h-5 w-5 group-hover:scale-110 transition-transform duration-200" />
                {exporting ? 'Exporting...' : 'Export CSV'}
              </button>
            )}
          </div>
        </div>

        {success && (
          <div className="mb-6 p-4 bg-green-100 dark:bg-green-900/30 border border-green-300 dark:border-green-700 rounded-xl text-green-700 dark:text-green-300">
            {success}
          </div>
        )}

        {error && (
          <div className="mb-6 p-4 bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700 rounded-xl text-red-700 dark:text-red-300">
            {error}
          </div>
        )}

        {showForm && (
          <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-4 md:p-6 mb-8 shadow-lg hover:shadow-xl transition-all duration-300">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Add New Member</h2>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    First Name *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                    placeholder="Enter first name"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Last Name *
                  </label>
                  <input
                    type="text"
                    value={formData.surname}
                    onChange={(e) => setFormData({ ...formData, surname: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                    placeholder="Enter last name"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Phone
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                    placeholder="Enter phone number"
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Residence *
                  </label>
                  <input
                    type="text"
                    value={formData.residence}
                    onChange={(e) => setFormData({ ...formData, residence: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                    placeholder="Enter residence address"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Invited By
                  </label>
                  <input
                    type="text"
                    value={formData.invited_by}
                    onChange={(e) => setFormData({ ...formData, invited_by: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                    placeholder="Who invited this member?"
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Baptism Date
                  </label>
                  <input
                    type="date"
                    value={formData.baptism}
                    onChange={(e) => setFormData({ ...formData, baptism: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Gender *
                  </label>
                  <select
                    value={formData.gender}
                    onChange={(e) => setFormData({ ...formData, gender: e.target.value as 'male' | 'female' | '' })}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                    required
                  >
                    <option value="">Select gender</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Cell Group
                  </label>
                  <select
                    value={formData.cell_group_id}
                    onChange={(e) => setFormData({ ...formData, cell_group_id: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                  >
                    <option value="">Select cell group</option>
                    {cellGroups.map((group) => (
                      <option key={group.id} value={group.id}>
                        {group.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2 md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Ministry Group
                  </label>
                  <select
                    value={selectedMinistryGroup}
                    onChange={(e) => setSelectedMinistryGroup(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                  >
                    <option value="">Select ministry group (optional)</option>
                    {ministryGroups.map((group) => (
                      <option key={group.id} value={group.id}>
                        {group.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-8 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:shadow-lg transition-all duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Plus className="h-4 w-4" />
                  {loading ? 'Adding Member...' : 'Add Member'}
                </button>
                <button
                  type="button"
                  onClick={resetForm}
                  className="flex-1 sm:flex-none px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200 font-medium text-center"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-4 mb-6 shadow-sm">
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder={`Search ${showHiddenMembers ? 'hidden' : 'active'} members...`}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-10 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            
            {!isMember() && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                    <Filter className="h-4 w-4" />
                    Cell Group
                  </label>
                  <select
                    value={selectedCellGroup}
                    onChange={(e) => setSelectedCellGroup(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">All Groups</option>
                    {cellGroups.map((group) => (
                      <option key={group.id} value={group.id}>
                        {group.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                    <Filter className="h-4 w-4" />
                    Status
                  </label>
                  <select
                    value={selectedStatus}
                    onChange={(e) => setSelectedStatus(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">All Statuses</option>
                    {VALID_STATUSES.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                    <Filter className="h-4 w-4" />
                    Gender
                  </label>
                  <select
                    value={selectedGender}
                    onChange={(e) => setSelectedGender(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">All Genders</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                  </select>
                </div>
              </div>
            )}
          </div>
        </div>

        {loading && members.length === 0 && !showHiddenMembers && (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600 dark:text-gray-400">Loading members...</p>
          </div>
        )}

        {loading && hiddenMembers.length === 0 && showHiddenMembers && (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600 dark:text-gray-400">Loading hidden members...</p>
          </div>
        )}

        {showHiddenMembers ? (
          <div className="space-y-6">
            <div className="bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-900/20 dark:to-orange-900/20 border border-red-200 dark:border-red-700/50 rounded-2xl p-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <EyeOff className="h-6 w-6 text-red-500" />
                    Hidden Members
                  </h2>
                  <p className="text-gray-600 dark:text-gray-400 mt-1">
                    Members with "not attending" status are automatically hidden.
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-3xl font-bold text-red-600 dark:text-red-400">{hiddenMembers.length}</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Hidden Members</div>
                </div>
              </div>
              
              {!loading && filteredHiddenMembers.length === 0 ? (
                <div className="text-center py-12">
                  <EyeOff className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-600 dark:text-gray-400 mb-2">
                    {searchQuery ? 'No Hidden Members Found' : 'No Hidden Members'}
                  </h3>
                  <p className="text-gray-500 dark:text-gray-500">
                    {searchQuery ? 'Try adjusting your search terms' : 'All members are currently attending'}
                  </p>
                </div>
              ) : (
                <div className="grid gap-4 md:gap-6">
                  {filteredHiddenMembers.map((member) => renderMemberCard(member, true))}
                </div>
              )}
            </div>
          </div>
        ) : (
          <>
            <div className="grid gap-4 md:gap-6">
              {!loading && filteredMembers.length === 0 ? (
                <div className="text-center py-12 bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl border border-gray-200/50 dark:border-gray-700/50 rounded-2xl">
                  <User className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-600 dark:text-gray-400 mb-2">
                    {searchQuery ? 'No Members Found' : 'No Members Yet'}
                  </h3>
                  <p className="text-gray-500 dark:text-gray-500">
                    {searchQuery ? 'Try adjusting your search terms' : 'Add your first member to get started'}
                  </p>
                </div>
              ) : (
                filteredMembers.map((member) => renderMemberCard(member, false))
              )}
            </div>

            {(isAdmin() || isPastor() || isDeacon()) && (
              <div className="mt-8 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-4 md:gap-6">
                <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-4 md:p-6 text-center">
                  <div className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-2">{statusCounts.total}</div>
                  <div className="text-sm md:text-base text-gray-600 dark:text-gray-400 font-medium">Total Active</div>
                </div>
                <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-4 md:p-6 text-center">
                  <div className="text-2xl md:text-3xl font-bold text-red-600 dark:text-red-400 mb-2">{statusCounts.hidden}</div>
                  <div className="text-sm md:text-base text-gray-600 dark:text-gray-400 font-medium">Hidden</div>
                </div>
                {Object.entries(statusCounts)
                  .filter(([key]) => key !== 'total' && key !== 'baptized' && key !== 'hidden')
                  .slice(0, 4)
                  .map(([status, count]) => (
                    <div key={status} className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-4 md:p-6 text-center">
                      <div className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-2">{count}</div>
                      <div className="text-sm md:text-base text-gray-600 dark:text-gray-400 font-medium truncate" title={status}>
                        {status === 'baptized' ? 'Baptized' : status}
                      </div>
                    </div>
                  ))}
                <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-4 md:p-6 text-center">
                  <div className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-2">{statusCounts.baptized}</div>
                  <div className="text-sm md:text-base text-gray-600 dark:text-gray-400 font-medium">Baptized</div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default Members;
