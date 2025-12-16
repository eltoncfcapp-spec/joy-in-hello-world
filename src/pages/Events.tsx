import { Calendar as CalendarIcon, Clock, MapPin, Plus, ChevronDown, Phone, X, User, Search, login_username, Building, Users as GroupsIcon, CheckCircle, AlertCircle, Upload, FileText, Eye, BookOpen, Download, PlayCircle, AlertTriangle, Edit, Save, Trash2, Filter } from 'lucide-react';
import { useState, useEffect } from 'react';
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
  is_whole_church: boolean;
  target_groups: string[] | null;
  target_departments: string[] | null;
  is_completed: boolean;
  completed_at: string | null;
  pamphlet_url: string | null;
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
  };
}

interface Member {
  id: string;
  name: string;
  surname: string;
  login_username: string | null;
  phone: string | null;
  cell_group_id: string | null;
  cell_groups: { name: string } | null;
  ministry_group_id: string | null;
  ministry_groups: { name: string } | null;
  status: 'newcomer' | 'signed_member' | 'not_attending' | null;
}

interface CellGroup {
  id: string;
  name: string;
}

interface MinistryGroup {
  id: string;
  name: string;
}

interface EventAttendee {
  id: string;
  event_id: string;
  members_id: string;
  first_time: boolean | null;
  invited_by_id: string | null;
  attended_at: string | null;
  attendance_status: 'present' | 'absent';
  notes: string | null;
  members: Member;
  invited_by_member?: {
    id: string;
    name: string;
    surname: string;
  } | null;
}

const Events = () => {
  const { user, profile, isAdmin, isPastor, loading: authLoading } = useAuth();
  const [showEventForm, setShowEventForm] = useState(false);
  const [showAttendeeForm, setShowAttendeeForm] = useState<string | null>(null);
  const [showSermonModal, setShowSermonModal] = useState<string | null>(null);
  const [showSermonList, setShowSermonList] = useState(false);
  const [events, setEvents] = useState<Event[]>([]);
  const [sermons, setSermons] = useState<Sermon[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [cellGroups, setCellGroups] = useState<CellGroup[]>([]);
  const [ministryGroups, setMinistryGroups] = useState<MinistryGroup[]>([]);
  const [attendees, setAttendees] = useState<EventAttendee[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [inviterSearchTerm, setInviterSearchTerm] = useState('');
  const [isMemberDropdownOpen, setIsMemberDropdownOpen] = useState(false);
  const [isInviterDropdownOpen, setIsInviterDropdownOpen] = useState(false);
  const [uploadingPamphlet, setUploadingPamphlet] = useState<string | null>(null);
  const [viewingPamphlet, setViewingPamphlet] = useState<string | null>(null);
  const [uploadingSermonFile, setUploadingSermonFile] = useState<{type: string, eventId?: string} | null>(null);
  
  const [showPresentList, setShowPresentList] = useState<{[key: string]: boolean}>({});
  const [showAbsentList, setShowAbsentList] = useState<{[key: string]: boolean}>({});
  
  // New states for managing absent members
  const [showAbsentManagement, setShowAbsentManagement] = useState<{[key: string]: boolean}>({});
  const [absentSearchTerm, setAbsentSearchTerm] = useState<{[key: string]: string}>({});
  const [editingNotes, setEditingNotes] = useState<{[key: string]: boolean}>({});
  const [notesText, setNotesText] = useState<{[key: string]: string}>({});
  const [selectedAbsentMembers, setSelectedAbsentMembers] = useState<{[key: string]: string[]}>({});

  // New state for Sunday preset
  const [showSundayPreset, setShowSundayPreset] = useState(false);

  // Fix date for South Africa timezone
  const getSouthAfricaDate = (dateString?: string) => {
    const date = dateString ? new Date(dateString) : new Date();
    // Convert to South Africa time (UTC+2)
    const saOffset = 2 * 60; // South Africa is UTC+2
    const localOffset = date.getTimezoneOffset();
    const diff = saOffset + localOffset;
    const saDate = new Date(date.getTime() + diff * 60000);
    return saDate.toISOString().split('T')[0];
  };

  const [eventFormData, setEventFormData] = useState({
    name: '',
    topic: '',
    eventDate: getSouthAfricaDate(), // Initialize with South Africa date
    eventTime: '',
    location: '',
    isWholeChurch: true,
    targetCellGroups: [] as string[],
    targetMinistryGroups: [] as string[],
    autoMarkAbsent: true,
  });

  const [attendeeFormData, setAttendeeFormData] = useState({
    memberId: '',
    firstTime: false,
    invitedById: '',
  });

  const [sermonFormData, setSermonFormData] = useState({
    title: '',
    summary: '',
    pastorName: '',
    sermonDate: '',
    eventId: '',
    videoFile: null as File | null,
    documentFile: null as File | null,
  });

  const [selectedMember, setSelectedMember] = useState<Member | null>(null);

  const hasAccess = () => {
    return isAdmin() || isPastor();
  };

  useEffect(() => {
    if (user && !authLoading) {
      fetchEvents();
      fetchSermons();
      fetchMembers();
      fetchCellGroups();
      fetchMinistryGroups();
    }
  }, [user, authLoading]);

  // Function to get next Sunday date
  const getNextSunday = () => {
    const today = new Date();
    const dayOfWeek = today.getDay(); // 0 = Sunday, 1 = Monday, etc.
    const daysUntilNextSunday = dayOfWeek === 0 ? 7 : 7 - dayOfWeek;
    const nextSunday = new Date(today);
    nextSunday.setDate(today.getDate() + daysUntilNextSunday);
    return getSouthAfricaDate(nextSunday.toISOString());
  };

  // Function to get next specific day of the week
  const getNextDayOfWeek = (dayName: string) => {
    const days: { [key: string]: number } = {
      sunday: 0,
      monday: 1,
      tuesday: 2,
      wednesday: 3,
      thursday: 4,
      friday: 5,
      saturday: 6
    };
    
    const today = new Date();
    const targetDay = days[dayName.toLowerCase()];
    const currentDay = today.getDay();
    
    let daysToAdd = targetDay - currentDay;
    if (daysToAdd <= 0) {
      daysToAdd += 7;
    }
    
    const nextDay = new Date(today);
    nextDay.setDate(today.getDate() + daysToAdd);
    return getSouthAfricaDate(nextDay.toISOString());
  };

  // Function to set Sunday preset
  const setSundayPreset = () => {
    const nextSunday = getNextSunday();
    setEventFormData({
      ...eventFormData,
      name: 'Sunday Service',
      eventDate: nextSunday,
      eventTime: '09:00',
      location: 'Main Sanctuary',
      isWholeChurch: true,
      topic: 'Weekly Sunday Worship Service',
      autoMarkAbsent: true
    });
    setShowSundayPreset(true);
  };

  const fetchEvents = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .order('event_date', { ascending: true });

      if (error) throw error;

      const eventsWithDefaults = (data || []).map((event: any) => ({
        ...event,
        is_whole_church: event.is_whole_church ?? true,
        target_groups: event.target_groups ?? null,
        target_departments: event.target_departments ?? null,
        is_completed: event.is_completed ?? false,
        completed_at: event.completed_at ?? null,
        pamphlet_url: event.pamphlet_url ?? null
      }));

      setEvents(eventsWithDefaults);
      
      eventsWithDefaults.forEach((event: any) => {
        fetchEventAttendees(event.id);
      });
    } catch (error: any) {
      console.error('Error fetching events:', error);
      setError(error.message || 'Failed to load events.');
    } finally {
      setLoading(false);
    }
  };

  const fetchSermons = async () => {
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
        .order('sermon_date', { ascending: false });

      if (error) throw error;
      setSermons(data || []);
    } catch (error: any) {
      console.error('Error fetching sermons:', error);
    }
  };

  const fetchMembers = async () => {
    try {
      setError(null);
      
      const { data, error } = await supabase
        .from('members')
        .select(`
          id,
          name,
          surname,
          login_username,
          phone,
          cell_group_id,
          ministry_group_id,
          status,
          cell_groups!fk_cell_group(name),
          ministry_groups(name)
        `)
        .order('name');

      if (error) throw error;
      setMembers(data || []);
    } catch (error: any) {
      console.error('Error fetching members:', error);
      setError(error.message || 'Failed to load members.');
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
      setError(error.message || 'Failed to load cell groups.');
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
      setError(error.message || 'Failed to load ministry groups.');
    }
  };

  const fetchEventAttendees = async (eventId: string) => {
    try {
      const { data, error } = await supabase
        .from('event_attendees')
        .select(`
          *,
          members!event_attendees_members_id_fkey (
            id,
            name,
            surname,
            login_username,
            phone,
            status,
            cell_group_id,
            ministry_group_id,
            cell_groups!fk_cell_group(name),
            ministry_groups(name)
          ),
          invited_by_member:members!event_attendees_invited_by_id_fkey (
            id,
            name,
            surname
          )
        `)
        .eq('event_id', eventId)
        .order('attended_at', { ascending: false });

      if (error) throw error;

      const attendeesWithDefaults = (data || []).map((attendee: any) => ({
        ...attendee,
        attendance_status: attendee.attendance_status || 'present',
        notes: attendee.notes || null
      }));

      setAttendees(prev => {
        const filtered = prev.filter(attendee => attendee.event_id !== eventId);
        return [...filtered, ...attendeesWithDefaults];
      });
    } catch (error: any) {
      console.error('Error fetching attendees:', error);
    }
  };

  const getSermonForEvent = (eventId: string) => {
    return sermons.find(sermon => sermon.event_id === eventId);
  };

  const uploadSermonFile = async (file: File, type: 'video' | 'document'): Promise<string> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
    const filePath = `${type}/${fileName}`;

    console.log(`Uploading ${type} file:`, file.name, 'to path:', filePath);

    const { error: uploadError } = await supabase.storage
      .from('sermon-files')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      throw uploadError;
    }

    const { data: { publicUrl } } = supabase.storage
      .from('sermon-files')
      .getPublicUrl(filePath);

    console.log('Public URL:', publicUrl);
    return publicUrl;
  };

  const handleSermonSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!hasAccess()) {
      setError('You do not have permission to add sermons');
      setTimeout(() => setError(null), 3000);
      return;
    }

    if (!sermonFormData.pastorName.trim()) {
      setError('Please enter the pastor name');
      setTimeout(() => setError(null), 3000);
      return;
    }

    if (!sermonFormData.title.trim()) {
      setError('Please enter a sermon title');
      setTimeout(() => setError(null), 3000);
      return;
    }

    if (!sermonFormData.summary.trim()) {
      setError('Please enter a sermon summary');
      setTimeout(() => setError(null), 3000);
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      let videoUrl = null;
      let documentUrl = null;

      // Upload files if provided
      if (sermonFormData.videoFile) {
        setUploadingSermonFile({ type: 'video' });
        videoUrl = await uploadSermonFile(sermonFormData.videoFile, 'video');
      }
      if (sermonFormData.documentFile) {
        setUploadingSermonFile({ type: 'document' });
        documentUrl = await uploadSermonFile(sermonFormData.documentFile, 'document');
      }

      const sermonData = {
        title: sermonFormData.title.trim(),
        summary: sermonFormData.summary.trim(),
        pastor_name: sermonFormData.pastorName.trim(),
        sermon_date: sermonFormData.sermonDate,
        event_id: sermonFormData.eventId || null,
        video_url: videoUrl,
        document_url: documentUrl,
        updated_at: new Date().toISOString()
      };

      console.log('Saving sermon data:', sermonData);

      const { error } = await supabase
        .from('sermons')
        .insert([{ ...sermonData, created_at: new Date().toISOString() }]);

      if (error) {
        console.error('Database error:', error);
        throw error;
      }

      setShowSermonModal(null);
      setSermonFormData({ 
        title: '', 
        summary: '', 
        pastorName: '', 
        sermonDate: '', 
        eventId: '',
        videoFile: null,
        documentFile: null,
      });
      await fetchSermons();
      setSuccess('Sermon added successfully!');
      
      setTimeout(() => setSuccess(null), 3000);
    } catch (error: any) {
      console.error('Error saving sermon:', error);
      setError(error.message || 'Failed to save sermon. Please try again.');
    } finally {
      setLoading(false);
      setUploadingSermonFile(null);
    }
  };

  const handleDeleteSermon = async (sermonId: string) => {
    if (!confirm('Are you sure you want to delete this sermon?')) return;

    try {
      setError(null);
      
      const { error } = await supabase
        .from('sermons')
        .delete()
        .eq('id', sermonId);

      if (error) throw error;

      await fetchSermons();
      setSuccess('Sermon deleted successfully!');
      
      setTimeout(() => setSuccess(null), 3000);
    } catch (error: any) {
      console.error('Error deleting sermon:', error);
      setError(error.message || 'Failed to delete sermon.');
    }
  };

  const openSermonModal = (eventId?: string) => {
    const event = eventId ? events.find(e => e.id === eventId) : null;
    
    setSermonFormData({
      title: event?.name || '',
      summary: '',
      pastorName: '',
      sermonDate: event?.event_date || getSouthAfricaDate(),
      eventId: eventId || '',
      videoFile: null,
      documentFile: null,
    });
    
    setShowSermonModal(eventId || 'new');
  };

  const closeSermonModal = () => {
    setShowSermonModal(null);
    setSermonFormData({ 
      title: '', 
      summary: '', 
      pastorName: '', 
      sermonDate: '', 
      eventId: '',
      videoFile: null,
      documentFile: null,
    });
  };

  // Upload pamphlet function
  const uploadPamphlet = async (eventId: string, file: File) => {
    try {
      setUploadingPamphlet(eventId);
      setError(null);

      const fileExt = file.name.split('.').pop();
      const fileName = `${eventId}/pamphlet.${fileExt}`;
      const filePath = `event-pamphlets/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('event-pamphlets')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('event-pamphlets')
        .getPublicUrl(filePath);

      const { error: updateError } = await supabase
        .from('events')
        .update({ pamphlet_url: publicUrl })
        .eq('id', eventId);

      if (updateError) throw updateError;

      setEvents(prev => prev.map(event => 
        event.id === eventId ? { ...event, pamphlet_url: publicUrl } : event
      ));

      setSuccess('Pamphlet uploaded successfully!');
      setTimeout(() => setSuccess(null), 3000);
    } catch (error: any) {
      console.error('Error uploading pamphlet:', error);
      setError(error.message || 'Failed to upload pamphlet.');
    } finally {
      setUploadingPamphlet(null);
    }
  };

  // Delete pamphlet function
  const deletePamphlet = async (eventId: string) => {
    try {
      if (!confirm('Are you sure you want to delete this pamphlet?')) return;

      setError(null);
      const event = events.find(e => e.id === eventId);
      if (!event?.pamphlet_url) return;

      // Extract file path from URL
      const urlParts = event.pamphlet_url.split('/');
      const fileName = urlParts[urlParts.length - 2];
      const fileExt = urlParts[urlParts.length - 1].split('.').pop();
      const filePath = `event-pamphlets/${fileName}/pamphlet.${fileExt}`;

      const { error: deleteError } = await supabase.storage
        .from('event-pamphlets')
        .remove([filePath]);

      if (deleteError) throw deleteError;

      const { error: updateError } = await supabase
        .from('events')
        .update({ pamphlet_url: null })
        .eq('id', eventId);

      if (updateError) throw updateError;

      setEvents(prev => prev.map(event => 
        event.id === eventId ? { ...event, pamphlet_url: null } : event
      ));

      setSuccess('Pamphlet deleted successfully!');
      setTimeout(() => setSuccess(null), 3000);
    } catch (error: any) {
      console.error('Error deleting pamphlet:', error);
      setError(error.message || 'Failed to delete pamphlet.');
    }
  };

  // View pamphlet in modal
  const viewPamphlet = (pamphletUrl: string) => {
    setViewingPamphlet(pamphletUrl);
  };

  // Close pamphlet modal
  const closePamphletModal = () => {
    setViewingPamphlet(null);
  };

  // Mark members as absent with optional notes
  const markMembersAsAbsent = async (eventId: string, absentMembers: {memberId: string, notes?: string}[]) => {
    try {
      const absentRecords = absentMembers.map(({memberId, notes}) => {
        const member = members.find(m => m.id === memberId);
        return {
          event_id: eventId,
          members_id: memberId,
          name: member?.name || 'Unknown',
          surname: member?.surname || 'Member',
          first_time: false,
          attendance_status: 'absent',
          attended_at: null,
          notes: notes || null
        };
      });

      const { error } = await supabase
        .from('event_attendees')
        .insert(absentRecords);

      if (error) throw error;
      await fetchEventAttendees(eventId);
      return true;
    } catch (error: any) {
      console.error('Error marking members as absent:', error);
      throw error;
    }
  };

  // Get expected members for an event
  const getExpectedMembers = (event: Event) => {
    if (event.is_whole_church) {
      return members.filter(member => 
        member.status !== 'not_attending'
      );
    } else {
      return members.filter(member => {
        const inTargetCellGroup = event.target_groups?.some(groupId => 
          member.cell_group_id === groupId
        );
        const inTargetMinistryGroup = event.target_departments?.some(deptId => 
          member.ministry_group_id === deptId
        );
        return (inTargetCellGroup || inTargetMinistryGroup) && member.status !== 'not_attending';
      });
    }
  };

  // Automatically mark all expected members as absent when event is created
  const autoMarkAllAbsent = async (eventId: string, eventData: any) => {
    try {
      const event = events.find(e => e.id === eventId) || eventData;
      if (!event) return;

      const expectedMembers = getExpectedMembers(event);
      const eventAttendees = getEventAttendees(eventId);
      const attendeeIds = new Set(eventAttendees.map(a => a.members_id));

      const absentMembers = expectedMembers
        .filter(member => !attendeeIds.has(member.id))
        .map(member => ({ memberId: member.id, notes: 'Automatically marked as absent on event creation' }));

      if (absentMembers.length > 0) {
        await markMembersAsAbsent(eventId, absentMembers);
        return absentMembers.length;
      }
      return 0;
    } catch (error: any) {
      console.error('Error auto-marking absent:', error);
      throw error;
    }
  };

  const handleCompleteEvent = async (eventId: string) => {
    if (!confirm('Are you sure you want to mark this event as completed? This will automatically mark all expected but unregistered members as absent.')) {
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const event = events.find(e => e.id === eventId);
      if (!event) throw new Error('Event not found');

      const eventAttendees = getEventAttendees(eventId);
      const attendeeIds = new Set(eventAttendees.map(a => a.members_id));

      const expectedMembers = getExpectedMembers(event);

      const absentMemberIds = expectedMembers
        .filter(member => !attendeeIds.has(member.id))
        .map(member => member.id);

      if (absentMemberIds.length > 0) {
        const absentMembers = absentMemberIds.map(memberId => ({ 
          memberId, 
          notes: 'Auto-marked as absent on event completion' 
        }));
        await markMembersAsAbsent(eventId, absentMembers);
      }

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

      setSuccess(`Event marked as completed! ${absentMemberIds.length} members marked as absent.`);
      setTimeout(() => setSuccess(null), 3000);
    } catch (error: any) {
      console.error('Error completing event:', error);
      setError(error.message || 'Failed to complete event. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleEventSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!hasAccess()) {
      setError('You do not have permission to create events');
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
        completed_at: null,
        pamphlet_url: null,
        target_groups: !eventFormData.isWholeChurch && eventFormData.targetCellGroups.length > 0 ? eventFormData.targetCellGroups : null,
        target_departments: !eventFormData.isWholeChurch && eventFormData.targetMinistryGroups.length > 0 ? eventFormData.targetMinistryGroups : null,
      };

      const { data, error } = await supabase
        .from('events')
        .insert([eventData])
        .select();

      if (error) throw error;

      const newEvent = data[0];
      
      // Auto-mark all expected members as absent if checkbox is checked
      if (eventFormData.autoMarkAbsent) {
        const absentCount = await autoMarkAllAbsent(newEvent.id, newEvent);
        setSuccess(`Event created successfully! ${absentCount} members automatically marked as absent.`);
      } else {
        setSuccess('Event created successfully!');
      }

      setShowEventForm(false);
      setEventFormData({ 
        name: '', 
        topic: '', 
        eventDate: getSouthAfricaDate(), 
        eventTime: '', 
        location: '',
        isWholeChurch: true,
        targetCellGroups: [],
        targetMinistryGroups: [],
        autoMarkAbsent: true,
      });
      setShowSundayPreset(false);
      
      await fetchEvents();
      
      setTimeout(() => setSuccess(null), 3000);
    } catch (error: any) {
      console.error('Error creating event:', error);
      setError(error.message || 'Failed to create event. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // NEW: Function to toggle absent management panel
  const toggleAbsentManagement = (eventId: string) => {
    setShowAbsentManagement(prev => ({
      ...prev,
      [eventId]: !prev[eventId]
    }));
    setShowPresentList(prev => ({ ...prev, [eventId]: false }));
    setShowAbsentList(prev => ({ ...prev, [eventId]: false }));
  };

  // NEW: Function to handle absent search
  const handleAbsentSearch = (eventId: string, value: string) => {
    setAbsentSearchTerm(prev => ({
      ...prev,
      [eventId]: value
    }));
  };

  // NEW: Get filtered members for absent search
  const getFilteredAbsentMembers = (eventId: string) => {
    const event = events.find(e => e.id === eventId);
    if (!event) return [];

    const searchTerm = absentSearchTerm[eventId] || '';
    const searchLower = searchTerm.toLowerCase();

    // Get expected members for this event
    let expectedMembers = getExpectedMembers(event);
    
    // Filter out already registered attendees
    const eventAttendees = getEventAttendees(eventId);
    const attendeeIds = new Set(eventAttendees.map(a => a.members_id));
    
    // Filter members that are expected but not yet registered
    const unregisteredMembers = expectedMembers.filter(member => 
      !attendeeIds.has(member.id)
    );

    // Apply search filter
    return unregisteredMembers.filter(member => {
      return (
        member.name.toLowerCase().includes(searchLower) ||
        member.surname.toLowerCase().includes(searchLower) ||
        `${member.name} ${member.surname}`.toLowerCase().includes(searchLower) ||
        member.phone?.toLowerCase().includes(searchLower) ||
        member.login_username?.toLowerCase().includes(searchLower)
      );
    });
  };

  // NEW: Toggle selection of absent member
  const toggleAbsentMemberSelection = (eventId: string, memberId: string) => {
    setSelectedAbsentMembers(prev => {
      const currentSelected = prev[eventId] || [];
      if (currentSelected.includes(memberId)) {
        return {
          ...prev,
          [eventId]: currentSelected.filter(id => id !== memberId)
        };
      } else {
        return {
          ...prev,
          [eventId]: [...currentSelected, memberId]
        };
      }
    });
  };

  // NEW: Mark selected members as absent with custom notes
  const markSelectedAsAbsent = async (eventId: string) => {
    const selected = selectedAbsentMembers[eventId] || [];
    if (selected.length === 0) {
      setError('Please select at least one member');
      setTimeout(() => setError(null), 3000);
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      const absentMembers = selected.map(memberId => ({
        memberId,
        notes: notesText[`${eventId}-${memberId}`] || 'Manually marked as absent'
      }));

      await markMembersAsAbsent(eventId, absentMembers);
      
      // Clear selections and notes
      setSelectedAbsentMembers(prev => ({ ...prev, [eventId]: [] }));
      Object.keys(notesText).forEach(key => {
        if (key.startsWith(`${eventId}-`)) {
          delete notesText[key];
        }
      });
      setNotesText({...notesText});
      
      setSuccess(`${absentMembers.length} members marked as absent successfully!`);
      setTimeout(() => setSuccess(null), 3000);
      
      // Refresh attendees
      await fetchEventAttendees(eventId);
    } catch (error: any) {
      console.error('Error marking selected as absent:', error);
      setError(error.message || 'Failed to mark members as absent.');
    } finally {
      setLoading(false);
    }
  };

  // NEW: Update absent notes
  const updateAbsentNotes = async (attendeeId: string, eventId: string, notes: string) => {
    try {
      const { error } = await supabase
        .from('event_attendees')
        .update({ notes })
        .eq('id', attendeeId);

      if (error) throw error;

      // Update local state
      setAttendees(prev => prev.map(attendee => 
        attendee.id === attendeeId ? { ...attendee, notes } : attendee
      ));

      setSuccess('Notes updated successfully!');
      setTimeout(() => setSuccess(null), 3000);
    } catch (error: any) {
      console.error('Error updating notes:', error);
      setError(error.message || 'Failed to update notes.');
    }
  };

  // NEW: Function to edit notes
  const startEditNotes = (attendeeId: string, currentNotes: string) => {
    setEditingNotes(prev => ({ ...prev, [attendeeId]: true }));
    setNotesText(prev => ({ ...prev, [attendeeId]: currentNotes || '' }));
  };

  // NEW: Function to save edited notes
  const saveEditNotes = async (attendeeId: string, eventId: string) => {
    const notes = notesText[attendeeId] || '';
    await updateAbsentNotes(attendeeId, eventId, notes);
    setEditingNotes(prev => ({ ...prev, [attendeeId]: false }));
  };

  // NEW: Function to cancel editing notes
  const cancelEditNotes = (attendeeId: string) => {
    setEditingNotes(prev => ({ ...prev, [attendeeId]: false }));
  };

  const handleAttendeeSubmit = async (e: React.FormEvent, eventId: string) => {
    e.preventDefault();
    
    if (!attendeeFormData.memberId) {
      setError('Please select a member');
      setTimeout(() => setError(null), 3000);
      return;
    }

    const alreadyRegistered = attendees.some(
      a => a.event_id === eventId && a.members_id === attendeeFormData.memberId
    );

    if (alreadyRegistered) {
      setError('This member is already registered for this event');
      setTimeout(() => setError(null), 3000);
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const selectedMember = members.find(m => m.id === attendeeFormData.memberId);
      if (!selectedMember) throw new Error('Selected member not found');

      const attendeeData = {
        event_id: eventId,
        members_id: attendeeFormData.memberId,
        name: selectedMember.name,
        surname: selectedMember.surname,
        first_time: attendeeFormData.firstTime,
        attendance_status: 'present',
        invited_by_id: attendeeFormData.invitedById || null
      };

      const { error } = await supabase.from('event_attendees').insert([attendeeData]);

      if (error) throw error;

      resetAttendeeForm();
      await fetchEventAttendees(eventId);
      setSuccess('Attendee added successfully!');
      
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
      setError(null);
      setSuccess(null);
      
      const { error } = await supabase
        .from('event_attendees')
        .delete()
        .eq('id', attendeeId);

      if (error) throw error;

      await fetchEventAttendees(eventId);
      setSuccess('Attendee removed successfully!');
      
      setTimeout(() => setSuccess(null), 3000);
    } catch (error: any) {
      console.error('Error removing attendee:', error);
      setError(error.message || 'Failed to remove attendee.');
    }
  };

  const resetAttendeeForm = () => {
    setShowAttendeeForm(null);
    setAttendeeFormData({
      memberId: '',
      firstTime: false,
      invitedById: '',
    });
    setSelectedMember(null);
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
    setInviterSearchTerm(`${member.name} ${member.surname}`);
    setIsInviterDropdownOpen(false);
  };

  const togglePresentList = (eventId: string) => {
    setShowPresentList(prev => ({
      ...prev,
      [eventId]: !prev[eventId]
    }));
    setShowAbsentList(prev => ({
      ...prev,
      [eventId]: false
    }));
    setShowAbsentManagement(prev => ({ ...prev, [eventId]: false }));
  };

  const toggleAbsentList = (eventId: string) => {
    setShowAbsentList(prev => ({
      ...prev,
      [eventId]: !prev[eventId]
    }));
    setShowPresentList(prev => ({
      ...prev,
      [eventId]: false
    }));
    setShowAbsentManagement(prev => ({ ...prev, [eventId]: false }));
  };

  const filteredMembers = members.filter(member => {
    const searchLower = searchTerm.toLowerCase();
    return (
      member.name.toLowerCase().includes(searchLower) ||
      member.surname.toLowerCase().includes(searchLower) ||
      `${member.name} ${member.surname}`.toLowerCase().includes(searchLower) ||
      member.phone?.toLowerCase().includes(searchLower) ||
      member.login_username?.toLowerCase().includes(searchLower)
    );
  });

  const filteredInviters = members.filter(member => {
    const searchLower = inviterSearchTerm.toLowerCase();
    return (
      member.name.toLowerCase().includes(searchLower) ||
      member.surname.toLowerCase().includes(searchLower) ||
      `${member.name} ${member.surname}`.toLowerCase().includes(searchLower) ||
      member.phone?.toLowerCase().includes(searchLower) ||
      member.login_username?.toLowerCase().includes(searchLower)
    );
  });

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
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatTime = (timeString: string) => {
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

  const getEventScopeBadge = (event: Event) => {
    if (event.is_whole_church) {
      return {
        color: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300',
        text: 'Whole Church',
        icon: Building
      };
    } else {
      return {
        color: 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300',
        text: 'Target Groups',
        icon: GroupsIcon
      };
    }
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

  // Function to close Sunday preset and use custom name
  const useCustomName = () => {
    setShowSundayPreset(false);
    setEventFormData({
      ...eventFormData,
      name: ''
    });
  };

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

  if (!hasAccess()) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-6 flex items-center justify-center">
        <div className="max-w-md text-center">
          <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-8">
            <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Access Denied</h1>
            <p className="text-gray-600 dark:text-gray-400 mb-4">You need to be a pastor or administrator to access the events page.</p>
            <p className="text-sm text-gray-500 dark:text-gray-500">
              Current role: {profile?.admin_role === 'admin' ? 'Admin' : profile?.pastor_role ? 'Pastor' : 'Member'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-6 animate-fadeIn">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
              Events & Sermons
            </h1>
            <p className="text-gray-600 dark:text-gray-400">Manage church events and sermons</p>
            <div className="mt-2">
              <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
                {isAdmin() ? 'Administrator' : isPastor() ? 'Pastor' : 'Member'}
              </span>
            </div>
          </div>
          <div className="flex gap-3">
            <button 
              onClick={() => setShowSermonList(!showSermonList)}
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-orange-600 to-amber-600 text-white rounded-xl hover:shadow-lg transition-all duration-200 hover:scale-105 font-medium group"
            >
              <BookOpen className="h-5 w-5 group-hover:scale-110 transition-transform duration-200" />
              {showSermonList ? 'Hide Sermons' : 'View Sermons'}
            </button>
            <button 
              onClick={() => {
                setShowEventForm(!showEventForm);
                if (!showEventForm) {
                  setEventFormData({
                    name: '',
                    topic: '',
                    eventDate: getSouthAfricaDate(),
                    eventTime: '',
                    location: '',
                    isWholeChurch: true,
                    targetCellGroups: [],
                    targetMinistryGroups: [],
                    autoMarkAbsent: true,
                  });
                  setShowSundayPreset(false);
                }
              }}
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:shadow-lg transition-all duration-200 hover:scale-105 font-medium group"
            >
              <Plus className="h-5 w-5 group-hover:rotate-90 transition-transform duration-200" />
              {showEventForm ? 'Cancel' : 'Create Event'}
            </button>
          </div>
        </div>

        {/* Success Message */}
        {success && (
          <div className="mb-6 p-4 bg-green-100 dark:bg-green-900/30 border border-green-300 dark:border-green-700 rounded-xl text-green-700 dark:text-green-300">
            {success}
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700 rounded-xl text-red-700 dark:text-red-300">
            {error}
          </div>
        )}

        {/* Sermons List */}
        {showSermonList && (
          <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-6 mb-8 shadow-lg hover:shadow-xl transition-all duration-300">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Sermons</h2>
              <button
                onClick={() => openSermonModal()}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-orange-600 to-amber-600 text-white rounded-xl hover:shadow-lg transition-all duration-200 font-medium"
              >
                <Plus className="h-4 w-4" />
                Add Sermon
              </button>
            </div>

            {sermons.length === 0 ? (
              <div className="text-center py-12">
                <BookOpen className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-600 dark:text-gray-400 mb-2">No Sermons Yet</h3>
                <p className="text-gray-500 dark:text-gray-500">Add your first sermon to get started</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {sermons.map((sermon) => (
                  <div key={sermon.id} className="bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl p-6 hover:shadow-lg transition-all duration-300">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="font-bold text-gray-900 dark:text-white text-lg mb-1">
                          {sermon.title}
                        </h3>
                        <p className="text-blue-600 dark:text-blue-400 text-sm">
                          {sermon.events?.name || 'Standalone Sermon'}
                        </p>
                      </div>
                      <button
                        onClick={() => handleDeleteSermon(sermon.id)}
                        className="p-1 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition-colors duration-150"
                      >
                        <X className="h-4 w-4 text-red-500" />
                      </button>
                    </div>

                    <div className="space-y-2 mb-4">
                      <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                        <User className="h-3 w-3" />
                        <span>By {sermon.pastor_name}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                        <CalendarIcon className="h-3 w-3" />
                        <span>{formatDate(sermon.sermon_date)}</span>
                      </div>
                    </div>

                    <p className="text-gray-600 dark:text-gray-400 text-sm mb-4 line-clamp-3">
                      {sermon.summary}
                    </p>

                    <div className="flex flex-wrap gap-2">
                      {sermon.video_url && (
                        <a
                          href={sermon.video_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 px-3 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-lg text-sm hover:bg-purple-200 dark:hover:bg-purple-800/30 transition-all duration-200"
                        >
                          <PlayCircle className="h-3 w-3" />
                          Video
                        </a>
                      )}
                      {sermon.document_url && (
                        <a
                          href={sermon.document_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-lg text-sm hover:bg-green-200 dark:hover:bg-green-800/30 transition-all duration-200"
                        >
                          <Download className="h-3 w-3" />
                          Notes
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Sunday Preset Banner */}
        {showEventForm && showSundayPreset && (
          <div className="mb-6 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 border border-blue-200 dark:border-blue-700 rounded-2xl p-6 shadow-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
                  <CalendarIcon className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white">Sunday Service Preset</h3>
                  <p className="text-gray-600 dark:text-gray-400">
                    Using preset for Sunday Service on {formatDate(eventFormData.eventDate)} at {formatTime(eventFormData.eventTime)}
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    // Keep the preset but change name
                    setEventFormData({
                      ...eventFormData,
                      name: eventFormData.name || 'Sunday Service'
                    });
                  }}
                  className="px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:shadow-lg transition-all duration-200 font-medium"
                >
                  Continue with Sunday
                </button>
                <button
                  onClick={useCustomName}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200 font-medium"
                >
                  Use Custom Name
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Event Creation Form */}
        {showEventForm && (
          <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-6 mb-8 shadow-lg hover:shadow-xl transition-all duration-300">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Create New Event</h2>
              {!showSundayPreset && (
                <button
                  type="button"
                  onClick={setSundayPreset}
                  className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-orange-600 to-amber-600 text-white rounded-xl hover:shadow-lg transition-all duration-200 font-medium"
                >
                  <CalendarIcon className="h-4 w-4" />
                  Use Sunday Service Preset
                </button>
              )}
            </div>
            <form onSubmit={handleEventSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Event Name *</label>
                  <input
                    type="text"
                    value={eventFormData.name}
                    onChange={(e) => setEventFormData({ ...eventFormData, name: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                    placeholder="Enter event name"
                    required
                  />
                  {!showSundayPreset && (
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Click "Use Sunday Service Preset" to auto-fill Sunday details
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Topic</label>
                  <input
                    type="text"
                    value={eventFormData.topic}
                    onChange={(e) => setEventFormData({ ...eventFormData, topic: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                    placeholder="Event topic or theme"
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Date *</label>
                  <input
                    type="date"
                    value={eventFormData.eventDate}
                    onChange={(e) => {
                      // Ensure date is captured correctly for South Africa timezone
                      const dateValue = e.target.value;
                      setEventFormData({ ...eventFormData, eventDate: dateValue });
                    }}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                    required
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Date displayed in South Africa timezone (UTC+2)
                  </p>
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Time *</label>
                  <input
                    type="time"
                    value={eventFormData.eventTime}
                    onChange={(e) => setEventFormData({ ...eventFormData, eventTime: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                    required
                  />
                </div>
                <div className="md:col-span-2 space-y-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Location</label>
                  <input
                    type="text"
                    value={eventFormData.location}
                    onChange={(e) => setEventFormData({ ...eventFormData, location: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                    placeholder="Event location"
                  />
                </div>

                {/* Auto Mark Absent Checkbox */}
                <div className="md:col-span-2 space-y-2">
                  <div className="flex items-center gap-3 p-4 border border-gray-300 dark:border-gray-600 rounded-xl">
                    <input
                      type="checkbox"
                      id="autoMarkAbsent"
                      checked={eventFormData.autoMarkAbsent}
                      onChange={(e) => setEventFormData({ ...eventFormData, autoMarkAbsent: e.target.checked })}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                    />
                    <div>
                      <label htmlFor="autoMarkAbsent" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Automatically mark all expected members as absent
                      </label>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        When checked, all expected members (based on event scope) will be automatically marked as absent upon event creation.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Event Scope */}
                <div className="md:col-span-2 space-y-4">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Event Scope</label>
                  <div className="flex flex-col sm:flex-row gap-4">
                    <label className="flex items-center gap-3 p-4 border border-gray-300 dark:border-gray-600 rounded-xl cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200 flex-1">
                      <input
                        type="radio"
                        name="eventScope"
                        checked={eventFormData.isWholeChurch}
                        onChange={() => setEventFormData({ ...eventFormData, isWholeChurch: true, targetCellGroups: [], targetMinistryGroups: [] })}
                        className="text-blue-600 border-gray-300 focus:ring-2 focus:ring-blue-500"
                      />
                      <Building className="h-5 w-5 text-purple-600" />
                      <div>
                        <div className="font-medium text-gray-900 dark:text-white">Whole Church Event</div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">All church members are expected to attend</div>
                      </div>
                    </label>
                    <label className="flex items-center gap-3 p-4 border border-gray-300 dark:border-gray-600 rounded-xl cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200 flex-1">
                      <input
                        type="radio"
                        name="eventScope"
                        checked={!eventFormData.isWholeChurch}
                        onChange={() => setEventFormData({ ...eventFormData, isWholeChurch: false })}
                        className="text-blue-600 border-gray-300 focus:ring-2 focus:ring-blue-500"
                      />
                      <GroupsIcon className="h-5 w-5 text-orange-600" />
                      <div>
                        <div className="font-medium text-gray-900 dark:text-white">Target Groups Only</div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">Specific cell groups or ministry departments</div>
                      </div>
                    </label>
                  </div>
                </div>

                {/* Target Groups Selection */}
                {!eventFormData.isWholeChurch && (
                  <>
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Target Cell Groups</label>
                      <div className="space-y-2 max-h-40 overflow-y-auto">
                        {cellGroups.map((group) => (
                          <label key={group.id} className="flex items-center gap-3 p-3 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200">
                            <input
                              type="checkbox"
                              checked={eventFormData.targetCellGroups.includes(group.id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setEventFormData({
                                    ...eventFormData,
                                    targetCellGroups: [...eventFormData.targetCellGroups, group.id]
                                  });
                                } else {
                                  setEventFormData({
                                    ...eventFormData,
                                    targetCellGroups: eventFormData.targetCellGroups.filter(id => id !== group.id)
                                  });
                                }
                              }}
                              className="text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                            />
                            <span className="text-gray-700 dark:text-gray-300">{group.name}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Target Ministry Groups</label>
                      <div className="space-y-2 max-h-40 overflow-y-auto">
                        {ministryGroups.map((group) => (
                          <label key={group.id} className="flex items-center gap-3 p-3 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200">
                            <input
                              type="checkbox"
                              checked={eventFormData.targetMinistryGroups.includes(group.id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setEventFormData({
                                    ...eventFormData,
                                    targetMinistryGroups: [...eventFormData.targetMinistryGroups, group.id]
                                  });
                                } else {
                                  setEventFormData({
                                    ...eventFormData,
                                    targetMinistryGroups: eventFormData.targetMinistryGroups.filter(id => id !== group.id)
                                  });
                                }
                              }}
                              className="text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                            />
                            <span className="text-gray-700 dark:text-gray-300">{group.name}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </>
                )}
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
                  onClick={() => {
                    setShowEventForm(false);
                    setShowSundayPreset(false);
                  }}
                  className="px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200 font-medium"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Loading State */}
        {loading && events.length === 0 && (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600 dark:text-gray-400">Loading events...</p>
          </div>
        )}

        {/* Events List */}
        <div className="space-y-6">
          {!loading && events.length === 0 ? (
            <div className="text-center py-12 bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl border border-gray-200/50 dark:border-gray-700/50 rounded-2xl">
              <CalendarIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-600 dark:text-gray-400 mb-2">No Events Yet</h3>
              <p className="text-gray-500 dark:text-gray-500">Create your first event to get started</p>
            </div>
          ) : (
            events.map((event) => {
              const presentAttendees = getPresentAttendees(event.id);
              const absentAttendees = getAbsentAttendees(event.id);
              const scopeBadge = getEventScopeBadge(event);
              const statusBadge = getEventStatusBadge(event);
              const ScopeIcon = scopeBadge.icon;
              const StatusIcon = statusBadge.icon;
              const sermon = getSermonForEvent(event.id);
              const filteredAbsentMembers = getFilteredAbsentMembers(event.id);
              const selectedForEvent = selectedAbsentMembers[event.id] || [];
              
              return (
                <div key={event.id} className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-6 hover:shadow-xl transition-all duration-300 hover:border-gray-300/50 dark:hover:border-gray-600/50 hover:scale-[1.02]">
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
                            <span className={`px-3 py-1 rounded-full text-sm font-medium flex items-center gap-2 ${scopeBadge.color}`}>
                              <ScopeIcon className="h-3 w-3" />
                              {scopeBadge.text}
                            </span>
                            {sermon && (
                              <span className="px-3 py-1 rounded-full text-sm font-medium flex items-center gap-2 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
                                <BookOpen className="h-3 w-3" />
                                Has Sermon
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

                      {/* Sermon Preview */}
                      {sermon && (
                        <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-xl">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <BookOpen className="h-5 w-5 text-blue-600" />
                              <div>
                                <div className="font-medium text-gray-900 dark:text-white">
                                  {sermon.title} by {sermon.pastor_name}
                                </div>
                                <div className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                                  {sermon.summary}
                                </div>
                              </div>
                            </div>
                            <div className="flex gap-2">
                              {sermon.video_url && (
                                <a
                                  href={sermon.video_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-1 px-2 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-lg text-xs hover:bg-purple-200 dark:hover:bg-purple-800/30 transition-all duration-200"
                                >
                                  <PlayCircle className="h-3 w-3" />
                                  Video
                                </a>
                              )}
                              {sermon.document_url && (
                                <a
                                  href={sermon.document_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-1 px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-lg text-xs hover:bg-green-200 dark:hover:bg-green-800/30 transition-all duration-200"
                                >
                                  <Download className="h-3 w-3" />
                                  Notes
                                </a>
                              )}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Pamphlet Display Section */}
                      {event.pamphlet_url && (
                        <div className="mt-4">
                          <div className="flex items-center gap-3 flex-wrap">
                            <div className="flex items-center gap-2">
                              <FileText className="h-5 w-5 text-green-600" />
                              <span className="font-medium text-gray-700 dark:text-gray-300">Event Pamphlet:</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => viewPamphlet(event.pamphlet_url!)}
                                className="inline-flex items-center gap-2 px-4 py-2 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-xl hover:bg-green-200 dark:hover:bg-green-800/30 transition-all duration-200"
                              >
                                <Eye className="h-4 w-4" />
                                View Pamphlet
                              </button>
                              <a
                                href={event.pamphlet_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-xl hover:bg-blue-200 dark:hover:bg-blue-800/30 transition-all duration-200"
                              >
                                <FileText className="h-4 w-4" />
                                Download
                              </a>
                              {hasAccess() && (
                                <button
                                  onClick={() => deletePamphlet(event.id)}
                                  className="inline-flex items-center gap-2 px-4 py-2 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-xl hover:bg-red-200 dark:hover:bg-red-800/30 transition-all duration-200"
                                >
                                  <X className="h-4 w-4" />
                                  Remove
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Upload Pamphlet Button */}
                      {hasAccess() && !event.pamphlet_url && (
                        <div className="mt-4">
                          <label className="inline-flex items-center gap-2 px-4 py-2 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-xl hover:bg-blue-200 dark:hover:bg-blue-800/30 transition-all duration-200 cursor-pointer">
                            <Upload className="h-4 w-4" />
                            {uploadingPamphlet === event.id ? 'Uploading...' : 'Upload Pamphlet'}
                            <input
                              type="file"
                              accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  uploadPamphlet(event.id, file);
                                }
                              }}
                              className="hidden"
                              disabled={uploadingPamphlet === event.id}
                            />
                          </label>
                        </div>
                      )}

                      {/* Attendance Summary */}
                      <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 border border-green-200 dark:border-green-700 rounded-xl p-4 text-center">
                          <div className="text-2xl font-bold text-green-600 dark:text-green-400">{presentAttendees.length}</div>
                          <div className="text-sm text-green-700 dark:text-green-300 font-medium">Present</div>
                        </div>
                        <div className="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20 border border-red-200 dark:border-red-700 rounded-xl p-4 text-center">
                          <div className="text-2xl font-bold text-red-600 dark:text-red-400">{absentAttendees.length}</div>
                          <div className="text-sm text-red-700 dark:text-red-300 font-medium">Absent</div>
                        </div>
                        <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 border border-blue-200 dark:border-blue-700 rounded-xl p-4 text-center">
                          <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                            {presentAttendees.filter(a => a.first_time).length}
                          </div>
                          <div className="text-sm text-blue-700 dark:text-blue-300 font-medium">First Timers</div>
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons */}
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
                          {hasAccess() && (
                            <button
                              onClick={() => handleCompleteEvent(event.id)}
                              className="flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl hover:shadow-lg transition-all duration-200 font-medium text-sm"
                            >
                              <CheckCircle className="h-4 w-4" />
                              Complete Event
                            </button>
                          )}
                        </>
                      )}
                      <button
                        onClick={() => openSermonModal(event.id)}
                        className="flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-orange-600 to-amber-600 text-white rounded-xl hover:shadow-lg transition-all duration-200 font-medium text-sm"
                      >
                        <BookOpen className="h-4 w-4" />
                        {sermon ? 'Edit Sermon' : 'Add Sermon'}
                      </button>
                      <button
                        onClick={() => togglePresentList(event.id)}
                        className="flex items-center justify-between px-4 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200 font-medium text-sm"
                      >
                        <span>{showPresentList[event.id] ? 'Hide' : 'View'} Present ({presentAttendees.length})</span>
                        <ChevronDown className={`h-4 w-4 transition-transform ${showPresentList[event.id] ? 'rotate-180' : ''}`} />
                      </button>
                      <button
                        onClick={() => toggleAbsentList(event.id)}
                        className="flex items-center justify-between px-4 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200 font-medium text-sm"
                      >
                        <span>{showAbsentList[event.id] ? 'Hide' : 'View'} Absent ({absentAttendees.length})</span>
                        <ChevronDown className={`h-4 w-4 transition-transform ${showAbsentList[event.id] ? 'rotate-180' : ''}`} />
                      </button>
                      {/* NEW: Manage Absent Button */}
                      {!event.is_completed && hasAccess() && (
                        <button
                          onClick={() => toggleAbsentManagement(event.id)}
                          className="flex items-center justify-between px-4 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200 font-medium text-sm"
                        >
                          <span>{showAbsentManagement[event.id] ? 'Close' : 'Manage'} Absent</span>
                          <Filter className={`h-4 w-4 transition-transform ${showAbsentManagement[event.id] ? 'rotate-180' : ''}`} />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Add Attendee Form */}
                  {showAttendeeForm === event.id && (
                    <div className="mt-6 p-6 bg-gray-50 dark:bg-gray-700/50 rounded-xl border border-gray-200 dark:border-gray-600">
                      <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Add Attendee</h4>
                      <form onSubmit={(e) => handleAttendeeSubmit(e, event.id)} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {/* Member Search */}
                          <div className="space-y-2">
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
                                        <div className="text-sm text-gray-500 dark:text-gray-400">
                                          {member.phone || member.login_username}
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

                          {/* Inviter Search */}
                          <div className="space-y-2">
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
                                          {member.phone || member.login_username}
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* First Time Checkbox */}
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            id="firstTime"
                            checked={attendeeFormData.firstTime}
                            onChange={(e) => setAttendeeFormData({ ...attendeeFormData, firstTime: e.target.checked })}
                            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                          />
                          <label htmlFor="firstTime" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            First time attending an event
                          </label>
                        </div>

                        {/* Selected Member Preview */}
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
                                    {selectedMember.phone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{selectedMember.phone}</span>}
                                    {selectedMember.login_username && <span className="flex items-center gap-1"><login_username className="h-3 w-3" />{selectedMember.login_username}</span>}
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

                        {/* Form Actions */}
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

                  {/* NEW: Manage Absent Section */}
                  {showAbsentManagement[event.id] && (
                    <div className="mt-6 p-6 bg-gray-50 dark:bg-gray-700/50 rounded-xl border border-gray-200 dark:border-gray-600">
                      <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                        <Filter className="h-5 w-5" />
                        Manage Absent Members
                        <span className="text-sm font-normal text-gray-500 dark:text-gray-400">
                          ({filteredAbsentMembers.length} unregistered members)
                        </span>
                      </h4>
                      
                      {/* Search Bar */}
                      <div className="mb-4">
                        <div className="relative">
                          <input
                            type="text"
                            value={absentSearchTerm[event.id] || ''}
                            onChange={(e) => handleAbsentSearch(event.id, e.target.value)}
                            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                            placeholder="Search members to mark as absent..."
                          />
                          <Search className="absolute right-3 top-3.5 h-4 w-4 text-gray-400" />
                        </div>
                      </div>

                      {/* Members List */}
                      {filteredAbsentMembers.length > 0 ? (
                        <div className="space-y-3 max-h-80 overflow-y-auto mb-4">
                          {filteredAbsentMembers.map((member) => (
                            <div key={member.id} className="flex items-center justify-between p-3 bg-white dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
                              <div className="flex items-center gap-3">
                                <input
                                  type="checkbox"
                                  checked={selectedForEvent.includes(member.id)}
                                  onChange={() => toggleAbsentMemberSelection(event.id, member.id)}
                                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                                />
                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white text-xs font-medium">
                                  {getInitials(member.name, member.surname)}
                                </div>
                                <div>
                                  <div className="font-medium text-gray-900 dark:text-white">
                                    {member.name} {member.surname}
                                  </div>
                                  <div className="text-sm text-gray-500 dark:text-gray-400">
                                    {member.phone && (
                                      <span className="flex items-center gap-1">
                                        <Phone className="h-3 w-3" />
                                        {member.phone}
                                      </span>
                                    )}
                                    {member.cell_groups?.name && (
                                      <span className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-2 py-1 rounded-full">
                                        {member.cell_groups.name}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                              <div className="w-48">
                                <input
                                  type="text"
                                  value={notesText[`${event.id}-${member.id}`] || ''}
                                  onChange={(e) => setNotesText(prev => ({ 
                                    ...prev, 
                                    [`${event.id}-${member.id}`]: e.target.value 
                                  }))}
                                  className="w-full px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                  placeholder="Absent reason (optional)"
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-8">
                          <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                          <p className="text-gray-600 dark:text-gray-400">
                            {absentSearchTerm[event.id] 
                              ? 'No members found matching your search'
                              : 'All expected members are already registered or marked as absent'}
                          </p>
                        </div>
                      )}

                      {/* Action Buttons */}
                      <div className="flex justify-between items-center">
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          {selectedForEvent.length} member{selectedForEvent.length !== 1 ? 's' : ''} selected
                        </div>
                        <div className="flex gap-3">
                          <button
                            onClick={() => {
                              setSelectedAbsentMembers(prev => ({ ...prev, [event.id]: [] }));
                              setAbsentSearchTerm(prev => ({ ...prev, [event.id]: '' }));
                            }}
                            className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200"
                          >
                            Clear All
                          </button>
                          <button
                            onClick={() => markSelectedAsAbsent(event.id)}
                            disabled={loading || selectedForEvent.length === 0}
                            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-red-600 to-orange-600 text-white rounded-xl hover:shadow-lg transition-all duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <AlertCircle className="h-4 w-4" />
                            {loading ? 'Marking...' : `Mark ${selectedForEvent.length} as Absent`}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Present List */}
                  {showPresentList[event.id] && presentAttendees.length > 0 && (
                    <div className="mt-6 p-6 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-xl">
                      <h4 className="text-lg font-semibold text-green-700 dark:text-green-300 mb-4 flex items-center gap-2">
                        <CheckCircle className="h-5 w-5" />
                        Present Attendees ({presentAttendees.length})
                      </h4>
                      <div className="space-y-3">
                        {presentAttendees.map((attendee) => (
                          <div key={attendee.id} className="flex items-center justify-between p-3 bg-white dark:bg-gray-700 rounded-lg border border-green-100 dark:border-green-800">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center text-white text-xs font-medium">
                                {getInitials(attendee.members.name, attendee.members.surname)}
                              </div>
                              <div>
                                <div className="font-medium text-gray-900 dark:text-white">
                                  {attendee.members.name} {attendee.members.surname}
                                </div>
                                <div className="text-sm text-gray-500 dark:text-gray-400">
                                  {attendee.members.phone && (
                                    <span className="flex items-center gap-1">
                                      <Phone className="h-3 w-3" />
                                      {attendee.members.phone}
                                    </span>
                                  )}
                                  {attendee.first_time && (
                                    <span className="inline-block px-2 py-1 text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full mt-1">
                                      First Time
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {attendee.invited_by_member && (
                                <div className="text-sm text-gray-500 dark:text-gray-400">
                                  Invited by: {attendee.invited_by_member.name} {attendee.invited_by_member.surname}
                                </div>
                              )}
                              {hasAccess() && (
                                <button
                                  onClick={() => handleRemoveAttendee(attendee.id, event.id)}
                                  className="p-1 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition-colors duration-150"
                                >
                                  <X className="h-4 w-4 text-red-500" />
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Absent List with Notes Editing */}
                  {showAbsentList[event.id] && absentAttendees.length > 0 && (
                    <div className="mt-6 p-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-xl">
                      <h4 className="text-lg font-semibold text-red-700 dark:text-red-300 mb-4 flex items-center gap-2">
                        <AlertCircle className="h-5 w-5" />
                        Absent Attendees ({absentAttendees.length})
                      </h4>
                      <div className="space-y-3">
                        {absentAttendees.map((attendee) => (
                          <div key={attendee.id} className="flex items-center justify-between p-3 bg-white dark:bg-gray-700 rounded-lg border border-red-100 dark:border-red-800">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center text-white text-xs font-medium">
                                {getInitials(attendee.members.name, attendee.members.surname)}
                              </div>
                              <div>
                                <div className="font-medium text-gray-900 dark:text-white">
                                  {attendee.members.name} {attendee.members.surname}
                                </div>
                                <div className="text-sm text-gray-500 dark:text-gray-400">
                                  {attendee.members.phone && (
                                    <span className="flex items-center gap-1">
                                      <Phone className="h-3 w-3" />
                                      {attendee.members.phone}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {editingNotes[attendee.id] ? (
                                <div className="flex items-center gap-2">
                                  <input
                                    type="text"
                                    value={notesText[attendee.id] || ''}
                                    onChange={(e) => setNotesText(prev => ({ ...prev, [attendee.id]: e.target.value }))}
                                    className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                    placeholder="Absent reason"
                                  />
                                  <button
                                    onClick={() => saveEditNotes(attendee.id, event.id)}
                                    className="p-1 hover:bg-green-100 dark:hover:bg-green-900/30 rounded-lg transition-colors duration-150"
                                  >
                                    <Save className="h-4 w-4 text-green-500" />
                                  </button>
                                  <button
                                    onClick={() => cancelEditNotes(attendee.id)}
                                    className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors duration-150"
                                  >
                                    <X className="h-4 w-4 text-gray-500" />
                                  </button>
                                </div>
                              ) : (
                                <div className="flex items-center gap-2">
                                  <span className="text-sm text-gray-500 dark:text-gray-400 max-w-xs truncate">
                                    {attendee.notes || 'No reason provided'}
                                  </span>
                                  <button
                                    onClick={() => startEditNotes(attendee.id, attendee.notes || '')}
                                    className="p-1 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-lg transition-colors duration-150"
                                  >
                                    <Edit className="h-4 w-4 text-blue-500" />
                                  </button>
                                </div>
                              )}
                              {hasAccess() && (
                                <button
                                  onClick={() => handleRemoveAttendee(attendee.id, event.id)}
                                  className="p-1 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition-colors duration-150"
                                >
                                  <Trash2 className="h-4 w-4 text-red-500" />
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Empty States */}
                  {showPresentList[event.id] && presentAttendees.length === 0 && (
                    <div className="mt-6 p-6 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl text-center">
                      <CheckCircle className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                      <p className="text-gray-600 dark:text-gray-400">No attendees marked as present yet.</p>
                    </div>
                  )}

                  {showAbsentList[event.id] && absentAttendees.length === 0 && (
                    <div className="mt-6 p-6 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl text-center">
                      <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                      <p className="text-gray-600 dark:text-gray-400">No attendees marked as absent.</p>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Sermon Modal */}
      {showSermonModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                {showSermonModal === 'new' ? 'Add New Sermon' : 'Add Sermon to Event'}
              </h3>
              <button
                onClick={closeSermonModal}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors duration-200"
              >
                <X className="h-5 w-5 text-gray-500 dark:text-gray-400" />
              </button>
            </div>
            <form onSubmit={handleSermonSubmit} className="p-6 space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
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

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Sermon Summary *
                  </label>
                  <textarea
                    value={sermonFormData.summary}
                    onChange={(e) => setSermonFormData({ ...sermonFormData, summary: e.target.value })}
                    rows={4}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 resize-none"
                    placeholder="Enter the sermon summary, key points, scriptures, and main message..."
                    required
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Pastor Name *
                    </label>
                    <input
                      type="text"
                      value={sermonFormData.pastorName}
                      onChange={(e) => setSermonFormData({ ...sermonFormData, pastorName: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                      placeholder="Enter pastor's name"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Sermon Date *
                    </label>
                    <input
                      type="date"
                      value={sermonFormData.sermonDate}
                      onChange={(e) => setSermonFormData({ ...sermonFormData, sermonDate: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                      required
                    />
                  </div>
                </div>

                {/* File Uploads with Warnings */}
                <div className="space-y-4">
                  {/* Video Upload with Warning */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Video File
                      </label>
                      <div className="flex items-center gap-1 px-2 py-1 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 rounded-lg text-xs">
                        <AlertTriangle className="h-3 w-3" />
                        <span>Development - Large Storage</span>
                      </div>
                    </div>
                    <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl cursor-pointer hover:border-purple-500 dark:hover:border-purple-400 transition-all duration-200">
                      <div className="flex flex-col items-center justify-center pt-3 pb-4">
                        <PlayCircle className="h-6 w-6 text-gray-400 mb-1" />
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {sermonFormData.videoFile ? sermonFormData.videoFile.name : 'Upload Video'}
                        </p>
                        {uploadingSermonFile?.type === 'video' && (
                          <p className="text-xs text-blue-500 mt-1">Uploading...</p>
                        )}
                      </div>
                      <input
                        type="file"
                        accept="video/*"
                        onChange={(e) => setSermonFormData({ ...sermonFormData, videoFile: e.target.files?.[0] || null })}
                        className="hidden"
                      />
                    </label>
                  </div>

                  {/* Document Upload */}
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Sermon Notes (PDF/DOC)
                    </label>
                    <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl cursor-pointer hover:border-green-500 dark:hover:border-green-400 transition-all duration-200">
                      <div className="flex flex-col items-center justify-center pt-3 pb-4">
                        <FileText className="h-6 w-6 text-gray-400 mb-1" />
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {sermonFormData.documentFile ? sermonFormData.documentFile.name : 'Upload Notes'}
                        </p>
                        {uploadingSermonFile?.type === 'document' && (
                          <p className="text-xs text-blue-500 mt-1">Uploading...</p>
                        )}
                      </div>
                      <input
                        type="file"
                        accept=".pdf,.doc,.docx,.txt"
                        onChange={(e) => setSermonFormData({ ...sermonFormData, documentFile: e.target.files?.[0] || null })}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-orange-600 to-amber-600 text-white rounded-xl hover:shadow-lg transition-all duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <BookOpen className="h-4 w-4" />
                  {loading ? 'Saving...' : 'Save Sermon'}
                </button>
                <button
                  type="button"
                  onClick={closeSermonModal}
                  className="px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200 font-medium"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Pamphlet Modal */}
      {viewingPamphlet && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">Event Pamphlet</h3>
              <button
                onClick={closePamphletModal}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors duration-200"
              >
                <X className="h-5 w-5 text-gray-500 dark:text-gray-400" />
              </button>
            </div>
            <div className="p-6 max-h-[70vh] overflow-auto">
              <iframe
                src={viewingPamphlet}
                className="w-full h-96 rounded-lg border border-gray-200 dark:border-gray-700"
                title="Event Pamphlet"
              />
              <div className="mt-4 flex justify-between items-center">
                <a
                  href={viewingPamphlet}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all duration-200"
                >
                  <FileText className="h-4 w-4" />
                  Open in New Tab
                </a>
                <button
                  onClick={closePamphletModal}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Events;
