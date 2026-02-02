import React, { useState, useEffect } from 'react';
import { supabase } from '../integrations/supabase/client';
import { MessageSquare, Lock, User, Calendar, Edit2, Trash2, Save, X } from 'lucide-react';

interface MemberNotesProps {
  memberId: string;
  currentUserId: string;
  canViewConfidential: boolean;
  canEditNotes: boolean;
}

interface MemberNote {
  id: string;
  member_id: string;
  author_id: string;
  note_type: string;
  note_content: string;
  is_confidential: boolean | null;
  created_at: string | null;
  updated_at: string | null;
  author?: {
    name: string;
    surname: string;
  } | null;
}

const MemberNotes: React.FC<MemberNotesProps> = ({
  memberId,
  currentUserId,
  canViewConfidential,
  canEditNotes
}) => {
  const [notes, setNotes] = useState<MemberNote[]>([]);
  const [loading, setLoading] = useState(false);
  const [showNoteForm, setShowNoteForm] = useState(false);
  const [editingNote, setEditingNote] = useState<string | null>(null);
  
  const [noteForm, setNoteForm] = useState({
    note_type: 'general',
    note_content: '',
    is_confidential: false
  });

  // Fetch notes for the member
  const fetchNotes = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('member_notes')
        .select(`
          *
        `)
        .eq('member_id', memberId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Fetch author information separately if needed
      const notesWithAuthors = await Promise.all(
        (data || []).map(async (note) => {
          const { data: authorData } = await supabase
            .from('members')
            .select('name, surname')
            .eq('id', note.author_id)
            .single();
          
          return {
            ...note,
            author: authorData || null
          };
        })
      );
      
      const filteredNotes = canViewConfidential 
        ? notesWithAuthors 
        : notesWithAuthors.filter(note => !note.is_confidential);
      
      setNotes(filteredNotes || []);
    } catch (error) {
      console.error('Error fetching notes:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotes();
  }, [memberId]);

  const handleSubmitNote = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const newNote = {
        member_id: memberId,
        author_id: currentUserId,
        ...noteForm
      };

      const { error } = await supabase
        .from('member_notes')
        .insert([newNote]);

      if (error) throw error;

      setNoteForm({
        note_type: 'general',
        note_content: '',
        is_confidential: false
      });
      setShowNoteForm(false);
      fetchNotes();
    } catch (error) {
      console.error('Error adding note:', error);
    }
  };

  const handleUpdateNote = async (noteId: string) => {
    try {
      const { error } = await supabase
        .from('member_notes')
        .update({
          note_content: noteForm.note_content,
          note_type: noteForm.note_type,
          is_confidential: noteForm.is_confidential,
          updated_at: new Date().toISOString()
        })
        .eq('id', noteId);

      if (error) throw error;
      
      setEditingNote(null);
      setNoteForm({
        note_type: 'general',
        note_content: '',
        is_confidential: false
      });
      fetchNotes();
    } catch (error) {
      console.error('Error updating note:', error);
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
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getNoteTypeColor = (type: string) => {
    switch (type) {
      case 'pastoral': return 'bg-purple-100 text-purple-700';
      case 'prayer': return 'bg-blue-100 text-blue-700';
      case 'followup': return 'bg-orange-100 text-orange-700';
      case 'counseling': return 'bg-green-100 text-green-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-blue-600" />
          <h3 className="font-semibold text-gray-900 dark:text-white">Member Notes</h3>
        </div>
        {canEditNotes && (
          <button
            onClick={() => setShowNoteForm(!showNoteForm)}
            className="px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
          >
            {showNoteForm ? 'Cancel' : 'Add Note'}
          </button>
        )}
      </div>

      {showNoteForm && (
        <form onSubmit={handleSubmitNote} className="mb-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Note Type
              </label>
              <select
                value={noteForm.note_type}
                onChange={(e) => setNoteForm({ ...noteForm, note_type: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              >
                <option value="general">General</option>
                <option value="pastoral">Pastoral</option>
                <option value="prayer">Prayer Request</option>
                <option value="followup">Follow-up</option>
                <option value="counseling">Counseling</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Note Content
              </label>
              <textarea
                value={noteForm.note_content}
                onChange={(e) => setNoteForm({ ...noteForm, note_content: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white resize-none"
                placeholder="Enter note content..."
                required
              />
            </div>
            {canViewConfidential && (
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={noteForm.is_confidential}
                  onChange={(e) => setNoteForm({ ...noteForm, is_confidential: e.target.checked })}
                  className="rounded border-gray-300"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  Mark as confidential
                </span>
              </label>
            )}
            <button
              type="submit"
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Save Note
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="text-center py-4">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
        </div>
      ) : notes.length === 0 ? (
        <div className="text-center py-6 text-gray-500 dark:text-gray-400">
          <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p>No notes yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {notes.map((note) => (
            <div key={note.id} className="p-3 border border-gray-200 dark:border-gray-600 rounded-lg">
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${getNoteTypeColor(note.note_type)}`}>
                    {note.note_type}
                  </span>
                  {note.is_confidential && (
                    <Lock className="h-3 w-3 text-red-500" />
                  )}
                </div>
                {canEditNotes && (
                  <div className="flex gap-1">
                    <button
                      onClick={() => {
                        setEditingNote(note.id);
                        setNoteForm({
                          note_type: note.note_type,
                          note_content: note.note_content,
                          is_confidential: note.is_confidential ?? false
                        });
                      }}
                      className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                    >
                      <Edit2 className="h-3 w-3 text-blue-500" />
                    </button>
                    <button
                      onClick={() => handleDeleteNote(note.id)}
                      className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                    >
                      <Trash2 className="h-3 w-3 text-red-500" />
                    </button>
                  </div>
                )}
              </div>
              
              {editingNote === note.id ? (
                <div className="space-y-2">
                  <textarea
                    value={noteForm.note_content}
                    onChange={(e) => setNoteForm({ ...noteForm, note_content: e.target.value })}
                    className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-sm"
                    rows={2}
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleUpdateNote(note.id)}
                      className="px-2 py-1 bg-green-600 text-white rounded text-xs flex items-center gap-1"
                    >
                      <Save className="h-3 w-3" /> Save
                    </button>
                    <button
                      onClick={() => setEditingNote(null)}
                      className="px-2 py-1 bg-gray-500 text-white rounded text-xs flex items-center gap-1"
                    >
                      <X className="h-3 w-3" /> Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                  {note.note_content}
                </p>
              )}
              
              <div className="mt-2 flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                <span className="flex items-center gap-1">
                  <User className="h-3 w-3" />
                  {note.author?.name} {note.author?.surname}
                </span>
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {note.created_at ? formatDate(note.created_at) : 'Unknown'}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MemberNotes;