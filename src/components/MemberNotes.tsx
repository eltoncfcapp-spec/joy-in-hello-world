import React, { useState, useEffect } from 'react';
import { supabase } from '../integrations/supabase/client';
import { MessageSquare, Lock, User, Calendar, Edit2, Trash2, Save, X } from 'lucide-react';

interface MemberNotesProps {
  memberId: string;
  currentUserId: string;
  canViewConfidential: boolean;
  canEditNotes: boolean;
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

  // ... rest of component implementation
};
