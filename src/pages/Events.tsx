import { Calendar as CalendarIcon, Clock, MapPin, Plus, Phone, X, User, Search, Mail, Building, Users as UsersIcon, CheckCircle, AlertCircle, Upload, FileText, Eye, BookOpen, Download, PlayCircle, AlertTriangle, Edit, Trash2, Trash, Star, Save, Share2, Printer } from 'lucide-react';
import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../integrations/supabase/client';
import { useAuth } from '../contexts/AuthContext';

interface Event {
  id: string;
  name: string;
  topic: string | null;
  event_date: string;
  event_time: string;
  location: string | null;
  created_at: string | null;
  updated_at: string | null;
  is_whole_church: boolean;
  target_groups: string[] | null;
  target_departments: string[] | null;
  is_completed: boolean;
  completed_at: string | null;
  pamphlet_url: string | null;
  last_synced_at: string | null;
}

interface Sermon {
  id: string;
  title: string;
  summary: string;
  pastor_name: string;
  sermon_date: string;
  event_id: string | null;
  video_url: string | null;
  document_url: string | null;
  created_at: string;
  updated_at: string;
  events?: {
    name: string;
    topic: string | null;
  } | null;
}

interface Member {
  id: string;
  name: string;
  surname: string;
  residence: string;
  phone: string | null;
  cell_group_id: string | null;
  ministry_group_id: string | null;
  status: 'newcomer' | 'signed_member' | 'not_attending' | null;
  login_username?: string | null;
}

interface EventAttendee {
  id: string;
  event_id: string;
  members_id: string;
  first_time: boolean | null;
  invited_by_id: string | null;
  attended_at: string | null;
  attendance_status: 'present' | 'absent' | string | null;
  notes: string | null;
  members: Member;
  invited_by_member?: {
    id: string;
    name: string;
    surname: string;
  } | null;
}

const Events = () => {
  const { user, profile, loading: authLoading } = useAuth();
  const [showEventForm, setShowEventForm] = useState(false);
  const [showAttendeeForm, setShowAttendeeForm] = useState<string | null>(null);
  const [showSermonModal, setShowSermonModal] = useState<string | null>(null);
  const [showSermonList, setShowSermonList] = useState(false);
  const [events, setEvents] = useState<Event[]>([]);
  const [sermons, setSermons] = useState<Sermon[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [attendees, setAttendees] = useState<EventAttendee[]>([]);
  const [loading, setLoading] = useState(false);
  const [sermonLoading, setSermonLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [inviterSearchTerm, setInviterSearchTerm] = useState('');
  const [isMemberDropdownOpen, setIsMemberDropdownOpen] = useState(false);
  const [isInviterDropdownOpen, setIsInviterDropdownOpen] = useState(false);
  const [uploadingPamphlet, setUploadingPamphlet] = useState<string | null>(null);
  const [viewingPamphlet, setViewingPamphlet] = useState<string | null>(null);
  const [uploadingSermonFile, setUploadingSermonFile] = useState<{type: string, eventId?: string} | null>(null);
  const [editingSermon, setEditingSermon] = useState<Sermon | null>(null);
  const [showAttendeeModal, setShowAttendeeModal] = useState<{type: 'present' | 'absent', eventId: string} | null>(null);
  const [showNewcomerModal, setShowNewcomerModal] = useState<string | null>(null);
  const [showSyncModal, setShowSyncModal] = useState<string | null>(null);
  const [showEventDetails, setShowEventDetails] = useState<string | null>(null);

  const memberDropdownRef = useRef<HTMLDivElement>(null);
  const inviterDropdownRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [eventFormData, setEventFormData] = useState({
    name: '',
    topic: '',
    eventDate: '',
    eventTime: '',
    location: '',
    isWholeChurch: true,
  });

  const [attendeeFormData, setAttendeeFormData] = useState({
    memberId: '',
    firstTime: false,
    invitedById: '',
    notes: '',
  });

  const [sermonFormData, setSermonFormData] = useState({
    title: '',
    summary: '',
    pastorName: '',
    sermonDate: '',
    eventId: '',
    videoFile: null as File | null,
    documentFile: null as File | null,
    existingVideoUrl: '',
    existingDocumentUrl: '',
  });

  const [newcomerFormData, setNewcomerFormData] = useState({
    name: '',
    surname: '',
    phone: '',
    login_username: '',
    notes: ''
  });

  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [selectedInviter, setSelectedInviter] = useState<Member | null>(null);

  // ==================== EFFECTS ====================
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (memberDropdownRef.current && !memberDropdownRef.current.contains(event.target as Node)) {
        setIsMemberDropdownOpen(false);
      }
      if (inviterDropdownRef.current && !inviterDropdownRef.current.contains(event.target as Node)) {
        setIsInviterDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  useEffect(() => {
    if (user && !authLoading) {
      fetchEvents();
      fetchSermons();
      fetchMembers();
    }
  }, [user, authLoading]);

  // ==================== DATA FETCHING ====================
  const fetchEvents = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .order('event_date', { ascending: false })
        .limit(30);

      if (error) throw error;
      setEvents(data || []);
      
    } catch (error: any) {
      console.error('Error fetching events:', error);
      setError(error.message || 'Failed to load events.');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchSermons = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('sermons')
        .select(`
          *,
          events (
            name,
            topic
          )
        `)
        .order('sermon_date', { ascending: false })
        .limit(30);

      if (error) throw error;
      setSermons(data || []);
    } catch (error: any) {
      console.error('Error fetching sermons:', error);
    }
  }, []);

  const fetchMembers = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('members')
        .select('*')
        .order('name')
        .limit(200);

      if (error) throw error;
      setMembers(data || []);
    } catch (error: any) {
      console.error('Error fetching members:', error);
      setError(error.message || 'Failed to load members.');
    }
  }, []);

  const fetchEventAttendees = useCallback(async (eventId: string) => {
    try {
      const { data, error } = await supabase
        .from('event_attendees')
        .select(`
          *,
          members!event_attendees_members_id_fkey (*),
          invited_by_member:members!event_attendees_invited_by_id_fkey (
            id,
            name,
            surname
          )
        `)
        .eq('event_id', eventId)
        .order('attended_at', { ascending: false })
        .limit(100);

      if (error) throw error;

      const attendeesWithDefaults = (data || []).map((attendee: any) => ({
        ...attendee,
        attendance_status: attendee.attendance_status || 'present'
      }));

      setAttendees(prev => {
        const filtered = prev.filter(attendee => attendee.event_id !== eventId);
        return [...filtered, ...attendeesWithDefaults];
      });
      
      return attendeesWithDefaults;
    } catch (error: any) {
      console.error('Error fetching attendees:', error);
      return [];
    }
  }, []);

  // ==================== HELPER FUNCTIONS ====================
  const getAttendanceStats = (eventId: string) => {
    const eventAttendees = getEventAttendees(eventId);
    const present = eventAttendees.filter(a => a.attendance_status === 'present').length;
    const absent = eventAttendees.filter(a => a.attendance_status === 'absent').length;
    const firstTimers = eventAttendees.filter(a => a.first_time && a.attendance_status === 'present').length;
    
    return { present, absent, firstTimers, total: present + absent };
  };

  const getSermonForEvent = (eventId: string) => {
    return sermons.find(sermon => sermon.event_id === eventId);
  };

  const getEventAttendees = (eventId: string) => {
    return attendees.filter(attendee => attendee.event_id === eventId);
  };

  const getPresentAttendees = (eventId: string) => {
    return getEventAttendees(eventId).filter(attendee => 
      attendee.attendance_status === 'present'
    );
  };

  const getAbsentAttendees = (eventId: string) => {
    return getEventAttendees(eventId).filter(attendee => 
      attendee.attendance_status === 'absent'
    );
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Invalid date';
    
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatTime = (timeString: string) => {
    if (!timeString) return '';
    const [hours, minutes] = timeString.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const formattedHour = hour % 12 || 12;
    return `${formattedHour}:${minutes} ${ampm}`;
  };

  const getInitials = (name: string, surname: string) => {
    return `${name.charAt(0)}${surname.charAt(0)}`.toUpperCase();
  };

  const getStatusBadge = (status: string | null) => {
    const badges = {
      newcomer: { color: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300', text: 'Newcomer' },
      signed_member: { color: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300', text: 'Signed Member' },
      not_attending: { color: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300', text: 'Not Attending' },
    };
    return badges[(status as keyof typeof badges) || 'newcomer'] || badges.newcomer;
  };

  const getEventStatusBadge = (event: Event) => {
    if (event.is_completed) {
      return {
        color: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300',
        text: 'Completed',
        icon: CheckCircle
      };
    } else {
      return {
        color: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300',
        text: 'Active',
        icon: AlertCircle
      };
    }
  };

  // ==================== EVENT MANAGEMENT ====================
  const handleEventSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      setError('You must be logged in to create events');
      setTimeout(() => setError(null), 3000);
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);
    
    try {
      const eventData = {
        name: eventFormData.name.trim(),
        topic: eventFormData.topic.trim() || null,
        event_date: eventFormData.eventDate,
        event_time: eventFormData.eventTime,
        location: eventFormData.location.trim() || null,
        is_whole_church: eventFormData.isWholeChurch,
        is_completed: false,
      };

      const { error } = await supabase.from('events').insert([eventData]);

      if (error) throw error;

      setShowEventForm(false);
      setEventFormData({ 
        name: '', 
        topic: '', 
        eventDate: '', 
        eventTime: '', 
        location: '',
        isWholeChurch: true
      });
      
      await fetchEvents();
      setSuccess('✅ Event created successfully!');
      
      setTimeout(() => setSuccess(null), 3000);
    } catch (error: any) {
      console.error('Error creating event:', error);
      setError(error.message || 'Failed to create event. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteEvent = async (eventId: string) => {
    if (!confirm('Are you sure you want to mark this event as completed?')) return;

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const { error } = await supabase
        .from('events')
        .update({
          is_completed: true,
          completed_at: new Date().toISOString()
        })
        .eq('id', eventId);

      if (error) throw error;

      setEvents(prev => prev.map(event => 
        event.id === eventId 
          ? { ...event, is_completed: true, completed_at: new Date().toISOString() }
          : event
      ));

      setSuccess('✅ Event marked as completed!');
      setTimeout(() => setSuccess(null), 3000);
    } catch (error: any) {
      console.error('Error completing event:', error);
      setError(error.message || 'Failed to complete event. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteEvent = async (eventId: string) => {
    if (!confirm('Are you sure you want to delete this event? This action cannot be undone.')) return;

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      // First delete related attendees
      const { error: attendeesError } = await supabase
        .from('event_attendees')
        .delete()
        .eq('event_id', eventId);

      if (attendeesError) throw attendeesError;

      // Then delete the event
      const { error: eventError } = await supabase
        .from('events')
        .delete()
        .eq('id', eventId);

      if (eventError) throw eventError;

      setEvents(prev => prev.filter(event => event.id !== eventId));
      setSuccess('✅ Event deleted successfully!');
      setTimeout(() => setSuccess(null), 3000);
    } catch (error: any) {
      console.error('Error deleting event:', error);
      setError(error.message || 'Failed to delete event. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // ==================== ATTENDEE MANAGEMENT ====================
  const handleAttendeeSubmit = async (e: React.FormEvent, eventId: string) => {
    e.preventDefault();
    
    if (!attendeeFormData.memberId) {
      setError('Please select a member');
      setTimeout(() => setError(null), 3000);
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const attendeeData = {
        event_id: eventId,
        members_id: attendeeFormData.memberId,
        first_time: attendeeFormData.firstTime,
        invited_by_id: attendeeFormData.invitedById || null,
        attendance_status: 'present',
        attended_at: new Date().toISOString(),
        notes: attendeeFormData.notes || null
      };

      const { error } = await supabase
        .from('event_attendees')
        .insert([attendeeData]);

      if (error) throw error;

      await fetchEventAttendees(eventId);
      resetAttendeeForm();
      
      setSuccess('✅ Attendee added successfully!');
      setTimeout(() => setSuccess(null), 3000);
    } catch (error: any) {
      console.error('Error adding attendee:', error);
      setError(error.message || 'Failed to add attendee. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveAttendee = async (attendeeId: string, eventId: string) => {
    if (!confirm('Are you sure you want to remove this attendee?')) return;

    try {
      const { error } = await supabase
        .from('event_attendees')
        .delete()
        .eq('id', attendeeId);

      if (error) throw error;

      setAttendees(prev => prev.filter(attendee => attendee.id !== attendeeId));
      await fetchEventAttendees(eventId);
      
      setSuccess('✅ Attendee removed successfully!');
      setTimeout(() => setSuccess(null), 3000);
    } catch (error: any) {
      console.error('Error removing attendee:', error);
      setError(error.message || 'Failed to remove attendee.');
    }
  };

  const saveAttendance = async (eventId: string, memberId: string, status: 'present' | 'absent', notes?: string) => {
    try {
      setLoading(true);
      setError(null);

      const member = members.find(m => m.id === memberId);
      if (!member) throw new Error('Member not found');

      const { data: existingRecord } = await supabase
        .from('event_attendees')
        .select('id')
        .eq('event_id', eventId)
        .eq('members_id', memberId)
        .maybeSingle();

      const attendanceData = {
        event_id: eventId,
        members_id: memberId,
        first_time: false,
        invited_by_id: null,
        attendance_status: status,
        attended_at: status === 'present' ? new Date().toISOString() : null,
        notes: notes || null,
      };

      let error;
      if (existingRecord) {
        const { error: updateError } = await supabase
          .from('event_attendees')
          .update(attendanceData)
          .eq('id', existingRecord.id);
        error = updateError;
      } else {
        const { error: insertError } = await supabase
          .from('event_attendees')
          .insert([attendanceData]);
        error = insertError;
      }

      if (error) throw error;

      await fetchEventAttendees(eventId);
      setSuccess(`✅ Attendance saved for ${member.name} ${member.surname}`);
      setTimeout(() => setSuccess(null), 3000);
      return true;
    } catch (error: any) {
      console.error('Error saving attendance:', error);
      setError(error.message || 'Failed to save attendance.');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const resetAttendeeForm = () => {
    setShowAttendeeForm(null);
    setAttendeeFormData({
      memberId: '',
      firstTime: false,
      invitedById: '',
      notes: '',
    });
    setSelectedMember(null);
    setSelectedInviter(null);
    setSearchTerm('');
    setInviterSearchTerm('');
    setIsMemberDropdownOpen(false);
    setIsInviterDropdownOpen(false);
  };

  const handleMemberSelect = (member: Member) => {
    setAttendeeFormData({
      ...attendeeFormData,
      memberId: member.id,
    });
    setSelectedMember(member);
    setSearchTerm(`${member.name} ${member.surname}`);
    setIsMemberDropdownOpen(false);
  };

  const handleInviterSelect = (member: Member) => {
    setAttendeeFormData({
      ...attendeeFormData,
      invitedById: member.id,
    });
    setSelectedInviter(member);
    setInviterSearchTerm(`${member.name} ${member.surname}`);
    setIsInviterDropdownOpen(false);
  };

  // ==================== NEWCOMER MANAGEMENT ====================
  const handleNewcomerSubmit = async (e: React.FormEvent, eventId: string) => {
    e.preventDefault();

    if (!newcomerFormData.name.trim() || !newcomerFormData.surname.trim()) {
      setError('Name and surname are required');
      setTimeout(() => setError(null), 3000);
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const memberPayload = {
        name: newcomerFormData.name.trim(),
        surname: newcomerFormData.surname.trim(),
        residence: '',
        phone: newcomerFormData.phone.trim() || null,
        login_username: newcomerFormData.login_username.trim() || null,
        status: 'newcomer',
      };

      const { data: newMember, error: memberError } = await supabase
        .from('members')
        .insert([memberPayload])
        .select('id')
        .single();

      if (memberError) throw memberError;

      const attendeeData = {
        event_id: eventId,
        members_id: newMember.id,
        first_time: true,
        invited_by_id: null,
        attendance_status: 'present',
        attended_at: new Date().toISOString(),
        notes: newcomerFormData.notes || null
      };

      const { error: attendeeError } = await supabase
        .from('event_attendees')
        .insert([attendeeData]);

      if (attendeeError) throw attendeeError;

      await fetchEventAttendees(eventId);
      await fetchMembers();
      
      setShowNewcomerModal(null);
      setNewcomerFormData({
        name: '',
        surname: '',
        phone: '',
        login_username: '',
        notes: ''
      });
      
      setSuccess('✅ Newcomer added successfully!');
      setTimeout(() => setSuccess(null), 3000);
    } catch (error: any) {
      console.error('Error adding newcomer:', error);
      setError(error.message || 'Failed to add newcomer.');
    } finally {
      setLoading(false);
    }
  };

  // ==================== SERMON MANAGEMENT ====================
  const handleSermonSubmit = async (e: React.FormEvent, eventId: string) => {
    e.preventDefault();
    
    if (!sermonFormData.title.trim() || !sermonFormData.pastorName.trim()) {
      setError('Title and pastor name are required');
      setTimeout(() => setError(null), 3000);
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const sermonData: any = {
        title: sermonFormData.title.trim(),
        summary: sermonFormData.summary.trim(),
        pastor_name: sermonFormData.pastorName.trim(),
        sermon_date: sermonFormData.sermonDate || new Date().toISOString().split('T')[0],
        event_id: eventId,
      };

      const { error } = await supabase.from('sermons').insert([sermonData]);

      if (error) throw error;

      setSermonFormData({
        title: '',
        summary: '',
        pastorName: '',
        sermonDate: '',
        eventId: '',
        videoFile: null,
        documentFile: null,
        existingVideoUrl: '',
        existingDocumentUrl: '',
      });
      
      await fetchSermons();
      setSuccess('✅ Sermon added successfully!');
      setTimeout(() => setSuccess(null), 3000);
      
      setShowSermonModal(null);
    } catch (error: any) {
      console.error('Error adding sermon:', error);
      setError(error.message || 'Failed to add sermon. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSermon = async (sermonId: string) => {
    if (!confirm('Are you sure you want to delete this sermon?')) return;

    try {
      setSermonLoading(sermonId);
      
      const { error } = await supabase
        .from('sermons')
        .delete()
        .eq('id', sermonId);

      if (error) throw error;

      setSermons(prev => prev.filter(sermon => sermon.id !== sermonId));
      setSuccess('✅ Sermon deleted successfully!');
      setTimeout(() => setSuccess(null), 3000);
    } catch (error: any) {
      console.error('Error deleting sermon:', error);
      setError(error.message || 'Failed to delete sermon.');
    } finally {
      setSermonLoading(null);
    }
  };

  // ==================== PAMPHLET UPLOAD ====================
  const handlePamphletUpload = async (event: React.ChangeEvent<HTMLInputElement>, eventId: string) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.includes('pdf')) {
      setError('Please upload a PDF file');
      setTimeout(() => setError(null), 3000);
      return;
    }

    setUploadingPamphlet(eventId);
    setError(null);
    setSuccess(null);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${eventId}-${Date.now()}.${fileExt}`;
      const filePath = `pamphlets/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('events')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('events')
        .getPublicUrl(filePath);

      const { error: updateError } = await supabase
        .from('events')
        .update({ pamphlet_url: publicUrl })
        .eq('id', eventId);

      if (updateError) throw updateError;

      setEvents(prev => prev.map(event => 
        event.id === eventId 
          ? { ...event, pamphlet_url: publicUrl }
          : event
      ));

      setSuccess('✅ Pamphlet uploaded successfully!');
      setTimeout(() => setSuccess(null), 3000);
    } catch (error: any) {
      console.error('Error uploading pamphlet:', error);
      setError(error.message || 'Failed to upload pamphlet.');
    } finally {
      setUploadingPamphlet(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // ==================== SYNC FUNCTION ====================
  const syncEventToCloud = async (eventId: string) => {
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const event = events.find(e => e.id === eventId);
      if (!event) throw new Error('Event not found');

      const { error: updateError } = await supabase
        .from('events')
        .update({ 
          last_synced_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', eventId);

      if (updateError) throw updateError;

      setEvents(prev => prev.map(e => 
        e.id === eventId 
          ? { 
              ...e, 
              last_synced_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            } 
          : e
      ));

      setSuccess(`✅ Event "${event.name}" synced to cloud!`);
      setTimeout(() => setSuccess(null), 3000);
      
      setShowSyncModal(null);
      
    } catch (error: any) {
      console.error('Error syncing event:', error);
      setError(error.message || 'Failed to sync event. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // ==================== MEMBER SEARCH ====================
  const filteredMembers = members.filter(member => {
    if (!searchTerm.trim()) return true;
    
    const searchLower = searchTerm.toLowerCase();
    const fullName = `${member.name} ${member.surname}`.toLowerCase();
    const residence = member.residence?.toLowerCase() || '';
    const phone = member.phone?.toLowerCase() || '';
    const email = member.login_username?.toLowerCase() || '';
    
    return (
      member.name.toLowerCase().includes(searchLower) ||
      member.surname.toLowerCase().includes(searchLower) ||
      fullName.includes(searchLower) ||
      residence.includes(searchLower) ||
      phone.includes(searchLower) ||
      email.includes(searchLower)
    );
  });

  const filteredInviters = members.filter(member => {
    if (!inviterSearchTerm.trim()) return true;
    
    const searchLower = inviterSearchTerm.toLowerCase();
    const fullName = `${member.name} ${member.surname}`.toLowerCase();
    const residence = member.residence?.toLowerCase() || '';
    const phone = member.phone?.toLowerCase() || '';
    const email = member.login_username?.toLowerCase() || '';
    
    return (
      member.name.toLowerCase().includes(searchLower) ||
      member.surname.toLowerCase().includes(searchLower) ||
      fullName.includes(searchLower) ||
      residence.includes(searchLower) ||
      phone.includes(searchLower) ||
      email.includes(searchLower)
    );
  });

  // ==================== MODAL COMPONENTS ====================
  const SyncModal = () => {
    if (!showSyncModal) return null;

    const event = events.find(e => e.id === showSyncModal);
    if (!event) return null;

    const stats = getAttendanceStats(event.id);

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
            <div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                <Upload className="inline-block h-5 w-5 mr-2 text-blue-500" />
                Sync to Cloud
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                {event.name} - {formatDate(event.event_date)}
              </p>
            </div>
            <button
              onClick={() => setShowSyncModal(null)}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors duration-200"
            >
              <X className="h-5 w-5 text-gray-500 dark:text-gray-400" />
            </button>
          </div>

          <div className="p-6">
            <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-xl">
              <h4 className="font-semibold text-blue-800 dark:text-blue-300 mb-2">Sync Information</h4>
              <p className="text-sm text-blue-700 dark:text-blue-400">
                This will mark the event as synced in the cloud. Your data is automatically saved as you work.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                <div className="text-2xl font-bold text-gray-900 dark:text-white">{stats.present}</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Present</div>
              </div>
              <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                <div className="text-2xl font-bold text-gray-900 dark:text-white">{stats.absent}</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Absent</div>
              </div>
              <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                <div className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Total</div>
              </div>
              <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                <div className="text-2xl font-bold text-gray-900 dark:text-white">{stats.firstTimers}</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">First Timers</div>
              </div>
            </div>

            <div className="space-y-4">
              <button
                onClick={() => syncEventToCloud(event.id)}
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:shadow-lg transition-all duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Upload className="h-4 w-4" />
                {loading ? 'Syncing...' : 'Sync to Cloud'}
              </button>
              
              <p className="text-xs text-gray-500 dark:text-gray-500 text-center">
                Last synced: {event.last_synced_at ? new Date(event.last_synced_at).toLocaleString() : 'Never'}
              </p>
            </div>
          </div>

          <div className="flex justify-end p-6 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={() => setShowSyncModal(null)}
              className="px-6 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200 font-medium"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  };

  const NewcomerModal = () => {
    if (!showNewcomerModal) return null;

    const event = events.find(e => e.id === showNewcomerModal);
    if (!event) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white">
              Add Newcomer
            </h3>
            <button
              onClick={() => setShowNewcomerModal(null)}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors duration-200"
            >
              <X className="h-5 w-5 text-gray-500 dark:text-gray-400" />
            </button>
          </div>

          <form onSubmit={(e) => handleNewcomerSubmit(e, showNewcomerModal)} className="p-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  First Name *
                </label>
                <input
                  type="text"
                  value={newcomerFormData.name}
                  onChange={(e) => setNewcomerFormData({ ...newcomerFormData, name: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                  placeholder="First name"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Last Name *
                </label>
                <input
                  type="text"
                  value={newcomerFormData.surname}
                  onChange={(e) => setNewcomerFormData({ ...newcomerFormData, surname: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                  placeholder="Last name"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Phone Number
              </label>
              <input
                type="tel"
                value={newcomerFormData.phone}
                onChange={(e) => setNewcomerFormData({ ...newcomerFormData, phone: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                placeholder="Phone number"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Email Address
              </label>
              <input
                type="email"
                value={newcomerFormData.login_username}
                onChange={(e) => setNewcomerFormData({ ...newcomerFormData, login_username: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                placeholder="Email address"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Notes
              </label>
              <textarea
                value={newcomerFormData.notes}
                onChange={(e) => setNewcomerFormData({ ...newcomerFormData, notes: e.target.value })}
                rows={2}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                placeholder="Any notes about the newcomer..."
              />
            </div>

            <div className="flex gap-3 pt-4">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl transition-colors disabled:opacity-50 font-medium"
              >
                {loading ? 'Adding...' : 'Add Newcomer'}
              </button>
              <button
                type="button"
                onClick={() => setShowNewcomerModal(null)}
                className="px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200 font-medium"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  const SermonModal = () => {
    if (!showSermonModal) return null;

    const event = events.find(e => e.id === showSermonModal);
    if (!event) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
            <div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                <BookOpen className="inline-block h-5 w-5 mr-2 text-blue-500" />
                Add Sermon for {event.name}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                {formatDate(event.event_date)} at {formatTime(event.event_time)}
              </p>
            </div>
            <button
              onClick={() => setShowSermonModal(null)}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors duration-200"
            >
              <X className="h-5 w-5 text-gray-500 dark:text-gray-400" />
            </button>
          </div>

          <form onSubmit={(e) => handleSermonSubmit(e, showSermonModal)} className="p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Sermon Title *
              </label>
              <input
                type="text"
                value={sermonFormData.title}
                onChange={(e) => setSermonFormData({ ...sermonFormData, title: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                placeholder="Enter sermon title"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Summary
              </label>
              <textarea
                value={sermonFormData.summary}
                onChange={(e) => setSermonFormData({ ...sermonFormData, summary: e.target.value })}
                rows={3}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                placeholder="Brief summary of the sermon..."
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Pastor Name *
                </label>
                <input
                  type="text"
                  value={sermonFormData.pastorName}
                  onChange={(e) => setSermonFormData({ ...sermonFormData, pastorName: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                  placeholder="Pastor's name"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Sermon Date
                </label>
                <input
                  type="date"
                  value={sermonFormData.sermonDate}
                  onChange={(e) => setSermonFormData({ ...sermonFormData, sermonDate: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                />
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:shadow-lg transition-all duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Adding...' : 'Add Sermon'}
              </button>
              <button
                type="button"
                onClick={() => setShowSermonModal(null)}
                className="px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200 font-medium"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  const AttendeeModal = () => {
    if (!showAttendeeModal) return null;

    const { type, eventId } = showAttendeeModal;
    const attendees = type === 'present' ? getPresentAttendees(eventId) : getAbsentAttendees(eventId);
    const event = events.find(e => e.id === eventId);

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
          <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
            <div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                {type === 'present' ? 'Present' : 'Absent'} Attendees
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                {event?.name} - Total: {attendees.length}
              </p>
            </div>
            <button
              onClick={() => setShowAttendeeModal(null)}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors duration-200"
            >
              <X className="h-5 w-5 text-gray-500 dark:text-gray-400" />
            </button>
          </div>
          <div className="p-6 max-h-[70vh] overflow-y-auto">
            {attendees.length === 0 ? (
              <div className="text-center py-12">
                <UsersIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500 dark:text-gray-500">
                  No {type === 'present' ? 'present' : 'absent'} attendees for this event.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {attendees.map((attendee) => (
                  <div key={attendee.id} className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-600 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-150">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white text-sm font-medium">
                        {getInitials(attendee.members.name, attendee.members.surname)}
                      </div>
                      <div>
                        <div className="font-medium text-gray-900 dark:text-white">
                          {attendee.members.name} {attendee.members.surname}
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                          {attendee.members.residence && (
                            <div className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {attendee.members.residence}
                            </div>
                          )}
                          {attendee.members.phone && (
                            <div className="flex items-center gap-1">
                              <Phone className="h-3 w-3" />
                              {attendee.members.phone}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    {type === 'present' && (
                      <button
                        onClick={() => handleRemoveAttendee(attendee.id, eventId)}
                        className="p-2 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition-colors duration-150"
                        title="Remove Attendee"
                      >
                        <Trash className="h-4 w-4 text-red-500" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="flex justify-end p-6 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={() => setShowAttendeeModal(null)}
              className="px-6 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200 font-medium"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  };

  // ==================== RENDER ====================
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-6 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-6 flex items-center justify-center">
        <div className="max-w-md text-center">
          <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-8">
            <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Authentication Required</h1>
            <p className="text-gray-600 dark:text-gray-400 mb-4">Please log in to access the events page.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
              Events Management
            </h1>
            <p className="text-gray-600 dark:text-gray-400">Manage church events and attendance</p>
          </div>
          <div className="flex gap-3">
            <button 
              onClick={() => setShowEventForm(!showEventForm)}
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:shadow-lg transition-all duration-200 hover:scale-105 font-medium group"
            >
              <Plus className="h-5 w-5 group-hover:rotate-90 transition-transform duration-200" />
              {showEventForm ? 'Cancel' : 'Create Event'}
            </button>
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

        {showEventForm && (
          <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-6 mb-8 shadow-lg hover:shadow-xl transition-all duration-300">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Create New Event</h2>
            <form onSubmit={handleEventSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Event Name *
                  </label>
                  <input
                    type="text"
                    value={eventFormData.name}
                    onChange={(e) => setEventFormData({ ...eventFormData, name: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                    placeholder="Enter event name"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Topic
                  </label>
                  <input
                    type="text"
                    value={eventFormData.topic}
                    onChange={(e) => setEventFormData({ ...eventFormData, topic: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                    placeholder="Event topic or theme"
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Date *
                  </label>
                  <input
                    type="date"
                    value={eventFormData.eventDate}
                    onChange={(e) => setEventFormData({ ...eventFormData, eventDate: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Time *
                  </label>
                  <input
                    type="time"
                    value={eventFormData.eventTime}
                    onChange={(e) => setEventFormData({ ...eventFormData, eventTime: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                    required
                  />
                </div>
                <div className="md:col-span-2 space-y-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Location
                  </label>
                  <input
                    type="text"
                    value={eventFormData.location}
                    onChange={(e) => setEventFormData({ ...eventFormData, location: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                    placeholder="Event location"
                  />
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:shadow-lg transition-all duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Creating...' : 'Create Event'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowEventForm(false)}
                  className="px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200 font-medium"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {loading && events.length === 0 && (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600 dark:text-gray-400">Loading events...</p>
          </div>
        )}

        <div className="space-y-6">
          {!loading && events.length === 0 ? (
            <div className="text-center py-12 bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl border border-gray-200/50 dark:border-gray-700/50 rounded-2xl">
              <CalendarIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-600 dark:text-gray-400 mb-2">No Events Yet</h3>
              <p className="text-gray-500 dark:text-gray-500">Create your first event to get started</p>
            </div>
          ) : (
            events.map((event) => {
              const statusBadge = getEventStatusBadge(event);
              const StatusIcon = statusBadge.icon;
              const sermon = getSermonForEvent(event.id);
              const stats = getAttendanceStats(event.id);
              
              return (
                <div key={event.id} className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-6 hover:shadow-xl transition-all duration-300 hover:border-gray-300/50 dark:hover:border-gray-600/50">
                  <div className="flex flex-col lg:flex-row justify-between gap-6">
                    <div className="flex-1">
                      <div className="flex items-start gap-4 mb-4">
                        <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center flex-shrink-0 shadow-lg">
                          <CalendarIcon className="h-7 w-7 text-white" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2 flex-wrap">
                            <h3 className="text-2xl font-bold text-gray-900 dark:text-white">{event.name}</h3>
                            <span className={`px-3 py-1 rounded-full text-sm font-medium flex items-center gap-2 ${statusBadge.color}`}>
                              <StatusIcon className="h-3 w-3" />
                              {statusBadge.text}
                            </span>
                            {event.last_synced_at && (
                              <span className="px-3 py-1 rounded-full text-sm font-medium flex items-center gap-2 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300">
                                <Upload className="h-3 w-3" />
                                Synced
                              </span>
                            )}
                          </div>
                          {event.topic && (
                            <p className="text-blue-600 dark:text-blue-400 font-medium">{event.topic}</p>
                          )}
                        </div>
                      </div>
                      
                      <div className="space-y-3 text-gray-600 dark:text-gray-400 ml-18">
                        <div className="flex items-center gap-3">
                          <CalendarIcon className="h-4 w-4" />
                          <span className="font-medium">{formatDate(event.event_date)}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <Clock className="h-4 w-4" />
                          <span className="font-medium">{formatTime(event.event_time)}</span>
                        </div>
                        {event.location && (
                          <div className="flex items-center gap-3">
                            <MapPin className="h-4 w-4" />
                            <span className="font-medium">{event.location}</span>
                          </div>
                        )}
                      </div>

                      <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-4">
                        <button
                          onClick={() => setShowAttendeeModal({ type: 'present', eventId: event.id })}
                          className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 border border-green-200 dark:border-green-700 rounded-xl p-4 text-center hover:shadow-lg transition-all duration-200 cursor-pointer"
                        >
                          <div className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.present}</div>
                          <div className="text-sm text-green-700 dark:text-green-300 font-medium">Present</div>
                          <div className="text-xs text-green-600 dark:text-green-400 mt-1">Click to view</div>
                        </button>
                        <button
                          onClick={() => setShowAttendeeModal({ type: 'absent', eventId: event.id })}
                          className="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20 border border-red-200 dark:border-red-700 rounded-xl p-4 text-center hover:shadow-lg transition-all duration-200 cursor-pointer"
                        >
                          <div className="text-2xl font-bold text-red-600 dark:text-red-400">{stats.absent}</div>
                          <div className="text-sm text-red-700 dark:text-red-300 font-medium">Absent</div>
                          <div className="text-xs text-red-600 dark:text-red-400 mt-1">Click to view</div>
                        </button>
                        <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 border border-blue-200 dark:border-blue-700 rounded-xl p-4 text-center">
                          <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                            {stats.firstTimers}
                          </div>
                          <div className="text-sm text-blue-700 dark:text-blue-300 font-medium">First Timers</div>
                        </div>
                        <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 border border-purple-200 dark:border-purple-700 rounded-xl p-4 text-center">
                          <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                            {stats.total}
                          </div>
                          <div className="text-sm text-purple-700 dark:text-purple-300 font-medium">Total Registered</div>
                        </div>
                      </div>

                      {sermon && (
                        <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-xl">
                          <div className="flex items-center justify-between">
                            <div>
                              <h4 className="font-medium text-blue-800 dark:text-blue-300 mb-1">Sermon Recorded</h4>
                              <p className="text-blue-700 dark:text-blue-400 text-sm">{sermon.title}</p>
                              <p className="text-blue-600 dark:text-blue-400 text-xs">By {sermon.pastor_name}</p>
                            </div>
                            <button
                              onClick={() => handleDeleteSermon(sermon.id)}
                              disabled={sermonLoading === sermon.id}
                              className="p-2 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition-colors duration-150"
                            >
                              <Trash className="h-4 w-4 text-red-500" />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col gap-3 lg:w-48">
                      {!event.is_completed && (
                        <>
                          <button
                            onClick={() => setShowAttendeeForm(showAttendeeForm === event.id ? null : event.id)}
                            className="flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:shadow-lg transition-all duration-200 font-medium text-sm"
                          >
                            <Plus className="h-4 w-4" />
                            Add Attendee
                          </button>
                          <button
                            onClick={() => setShowNewcomerModal(event.id)}
                            className="flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl hover:shadow-lg transition-all duration-200 font-medium text-sm"
                          >
                            <User className="h-4 w-4" />
                            Add Newcomer
                          </button>
                          <button
                            onClick={() => setShowSermonModal(event.id)}
                            className="flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl hover:shadow-lg transition-all duration-200 font-medium text-sm"
                          >
                            <BookOpen className="h-4 w-4" />
                            Add Sermon
                          </button>
                          <button
                            onClick={() => handleCompleteEvent(event.id)}
                            className="flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl hover:shadow-lg transition-all duration-200 font-medium text-sm"
                          >
                            <CheckCircle className="h-4 w-4" />
                            Complete Event
                          </button>
                        </>
                      )}
                      <button
                        onClick={() => setShowSyncModal(event.id)}
                        className="flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-indigo-600 to-blue-600 text-white rounded-xl hover:shadow-lg transition-all duration-200 font-medium text-sm"
                      >
                        <Upload className="h-4 w-4" />
                        Sync to Cloud
                      </button>
                      <input
                        type="file"
                        ref={fileInputRef}
                        accept=".pdf"
                        onChange={(e) => handlePamphletUpload(e, event.id)}
                        className="hidden"
                      />
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploadingPamphlet === event.id}
                        className="flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-orange-600 to-amber-600 text-white rounded-xl hover:shadow-lg transition-all duration-200 font-medium text-sm disabled:opacity-50"
                      >
                        <Upload className="h-4 w-4" />
                        {uploadingPamphlet === event.id ? 'Uploading...' : 'Upload Pamphlet'}
                      </button>
                      {event.pamphlet_url && (
                        <a
                          href={event.pamphlet_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-amber-600 to-yellow-600 text-white rounded-xl hover:shadow-lg transition-all duration-200 font-medium text-sm"
                        >
                          <FileText className="h-4 w-4" />
                          View Pamphlet
                        </a>
                      )}
                      <button
                        onClick={() => handleDeleteEvent(event.id)}
                        className="flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-red-600 to-pink-600 text-white rounded-xl hover:shadow-lg transition-all duration-200 font-medium text-sm"
                      >
                        <Trash2 className="h-4 w-4" />
                        Delete Event
                      </button>
                    </div>
                  </div>

                  {showAttendeeForm === event.id && (
                    <div className="mt-6 p-6 bg-gray-50 dark:bg-gray-700/50 rounded-xl border border-gray-200 dark:border-gray-600">
                      <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Add Attendee</h4>
                      <form onSubmit={(e) => handleAttendeeSubmit(e, event.id)} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2" ref={memberDropdownRef}>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Member *</label>
                            <div className="relative">
                              <input
                                type="text"
                                value={searchTerm}
                                onChange={(e) => {
                                  setSearchTerm(e.target.value);
                                  setIsMemberDropdownOpen(true);
                                }}
                                onFocus={() => setIsMemberDropdownOpen(true)}
                                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                                placeholder="Search members..."
                              />
                              <Search className="absolute right-3 top-3.5 h-4 w-4 text-gray-400" />
                              
                              {isMemberDropdownOpen && filteredMembers.length > 0 && (
                                <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl shadow-lg max-h-60 overflow-y-auto">
                                  {filteredMembers.map((member) => (
                                    <div
                                      key={member.id}
                                      onClick={() => handleMemberSelect(member)}
                                      className="flex items-center gap-3 p-3 hover:bg-gray-100 dark:hover:bg-gray-600 cursor-pointer transition-colors duration-150"
                                    >
                                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white text-xs font-medium">
                                        {getInitials(member.name, member.surname)}
                                      </div>
                                      <div className="flex-1">
                                        <div className="font-medium text-gray-900 dark:text-white">
                                          {member.name} {member.surname}
                                        </div>
                                        <div className="text-sm text-gray-500 dark:text-gray-400 space-y-1">
                                          {member.residence && (
                                            <div className="flex items-center gap-1">
                                              <MapPin className="h-3 w-3 flex-shrink-0" />
                                              <span className="truncate">{member.residence}</span>
                                            </div>
                                          )}
                                          {member.phone && (
                                            <div className="flex items-center gap-1">
                                              <Phone className="h-3 w-3 flex-shrink-0" />
                                              <span className="truncate">{member.phone}</span>
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                      <span className={`px-2 py-1 rounded-full text-xs ${getStatusBadge(member.status).color}`}>
                                        {getStatusBadge(member.status).text}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="space-y-2" ref={inviterDropdownRef}>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Invited By (Optional)</label>
                            <div className="relative">
                              <input
                                type="text"
                                value={inviterSearchTerm}
                                onChange={(e) => {
                                  setInviterSearchTerm(e.target.value);
                                  setIsInviterDropdownOpen(true);
                                }}
                                onFocus={() => setIsInviterDropdownOpen(true)}
                                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                                placeholder="Search inviter..."
                              />
                              <Search className="absolute right-3 top-3.5 h-4 w-4 text-gray-400" />
                              
                              {isInviterDropdownOpen && filteredInviters.length > 0 && (
                                <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl shadow-lg max-h-60 overflow-y-auto">
                                  {filteredInviters.map((member) => (
                                    <div
                                      key={member.id}
                                      onClick={() => handleInviterSelect(member)}
                                      className="flex items-center gap-3 p-3 hover:bg-gray-100 dark:hover:bg-gray-600 cursor-pointer transition-colors duration-150"
                                    >
                                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white text-xs font-medium">
                                        {getInitials(member.name, member.surname)}
                                      </div>
                                      <div className="flex-1">
                                        <div className="font-medium text-gray-900 dark:text-white">
                                          {member.name} {member.surname}
                                        </div>
                                        <div className="text-sm text-gray-500 dark:text-gray-400">
                                          {member.phone || 'No phone'}
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            id="firstTime"
                            checked={attendeeFormData.firstTime}
                            onChange={(e) => setAttendeeFormData({ ...attendeeFormData, firstTime: e.target.checked })}
                            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                          />
                          <label htmlFor="firstTime" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            First time attending
                          </label>
                        </div>

                        {selectedMember && (
                          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-xl">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white text-sm font-medium">
                                  {getInitials(selectedMember.name, selectedMember.surname)}
                                </div>
                                <div>
                                  <div className="font-medium text-gray-900 dark:text-white">
                                    {selectedMember.name} {selectedMember.surname}
                                  </div>
                                  <div className="text-sm text-gray-600 dark:text-gray-400">
                                    {selectedMember.residence || 'No address'}
                                  </div>
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedMember(null);
                                  setAttendeeFormData({ ...attendeeFormData, memberId: '' });
                                  setSearchTerm('');
                                }}
                                className="p-1 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition-colors duration-150"
                              >
                                <X className="h-4 w-4 text-red-500" />
                              </button>
                            </div>
                          </div>
                        )}

                        <div className="flex gap-3">
                          <button
                            type="submit"
                            disabled={loading || !attendeeFormData.memberId}
                            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:shadow-lg transition-all duration-200 font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <Plus className="h-4 w-4" />
                            {loading ? 'Adding...' : 'Add Attendee'}
                          </button>
                          <button
                            type="button"
                            onClick={resetAttendeeForm}
                            className="px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200 font-medium text-sm"
                          >
                            Cancel
                          </button>
                        </div>
                      </form>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      <SyncModal />
      <NewcomerModal />
      <SermonModal />
      <AttendeeModal />
    </div>
  );
};

export default Events;
