import { Calendar as CalendarIcon, Clock, MapPin, Plus, Phone, X, User, Search, Mail, Building, Users as UsersIcon, CheckCircle, AlertCircle, Upload, FileText, Eye, BookOpen, Download, PlayCircle, AlertTriangle, Edit, Trash2, RefreshCw } from 'lucide-react';
import { useState, useEffect, useCallback } from 'react';
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
  login_username: string | null;
  phone: string | null;
  cell_group_id: string | null;
  cell_groups: { name: string } | null;
  ministry_group_id: string | null;
  ministry_groups: { name: string } | null;
  status: 'newcomer' | 'signed_member' | 'not_attending' | null;
  department_members?: Array<{
    departments: {
      id: string;
      name: string;
    } | null;
  }>;
}

interface CellGroup {
  id: string;
  name: string;
}

interface MinistryGroup {
  id: string;
  name: string;
}

interface Department {
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
  attendance_status: 'present' | 'absent' | string | null;
  notes?: string | null;
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
  const [departments, setDepartments] = useState<Department[]>([]);
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

  const [eventFormData, setEventFormData] = useState({
    eventType: '' as 'sunday' | 'other' | '',
    name: '',
    topic: '',
    eventDate: '',
    eventTime: '',
    location: '',
    isWholeChurch: true,
    targetCellGroups: [] as string[],
    targetMinistryGroups: [] as string[],
    targetDepartments: [] as string[],
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
    existingVideoUrl: '',
    existingDocumentUrl: '',
  });

  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [selectedInviter, setSelectedInviter] = useState<Member | null>(null);
  
  const [newcomerFormData, setNewcomerFormData] = useState({
    name: '',
    surname: '',
    phone: '',
    login_username: '',
    invited_by_id: '',
    notes: ''
  });

  const [newcomerInviterSearchTerm, setNewcomerInviterSearchTerm] = useState('');
  const [isNewcomerInviterDropdownOpen, setIsNewcomerInviterDropdownOpen] = useState(false);
  const [selectedNewcomerInviter, setSelectedNewcomerInviter] = useState<Member | null>(null);

  const hasAccess = useCallback(() => {
    return isAdmin?.() || isPastor?.();
  }, [isAdmin, isPastor]);

  // Debug function
  const debugAttendees = (eventId: string) => {
    console.log('🔍 DEBUG ATTENDEES FOR EVENT:', eventId);
    console.log('All attendees in state:', attendees.length);
    const eventAttendees = attendees.filter(a => a.event_id === eventId);
    console.log('Event attendees count:', eventAttendees.length);
    
    if (eventAttendees.length === 0) {
      console.log('No attendees found for this event');
      return;
    }
    
    eventAttendees.forEach((attendee, index) => {
      console.log(`Attendee ${index + 1}:`, {
        id: attendee.id,
        member: `${attendee.members?.name || 'N/A'} ${attendee.members?.surname || 'N/A'}`,
        attendance_status: attendee.attendance_status,
        first_time: attendee.first_time,
        attended_at: attendee.attended_at
      });
    });
    
    const stats = getAttendanceStats(eventId);
    console.log('📊 Calculated stats:', stats);
  };

  // FIXED: Improved fetchEvents with better debugging
  const fetchEvents = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('📥 Fetching events...');
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .order('event_date', { ascending: false });

      if (error) {
        console.error('❌ Error fetching events:', error);
        throw error;
      }

      console.log(`✅ Fetched ${data?.length || 0} events`);
      
      const eventsWithDefaults = (data || []).map((event: any) => ({
        ...event,
        is_whole_church: event.is_whole_church ?? true,
        target_groups: event.target_groups ?? [],
        target_departments: event.target_departments ?? [],
        is_completed: event.is_completed ?? false,
        completed_at: event.completed_at ?? null,
        pamphlet_url: event.pamphlet_url ?? null
      }));

      setEvents(eventsWithDefaults as Event[]);
      
      // Fetch attendees for all events
      console.log('📥 Fetching attendees for all events...');
      const attendeePromises = eventsWithDefaults.map((event: Event) => 
        fetchEventAttendees(event.id)
      );
      await Promise.all(attendeePromises);
      
      console.log('✅ All data loaded successfully');
    } catch (error: any) {
      console.error('❌ Error in fetchEvents:', error);
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
        .order('sermon_date', { ascending: false });

      if (error) throw error;
      setSermons(data || []);
    } catch (error: any) {
      console.error('Error fetching sermons:', error);
    }
  }, []);

  const fetchMembers = useCallback(async () => {
    try {
      setError(null);
      
      console.log('📥 Fetching members...');
      const { data: membersData, error: membersError } = await supabase
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

      if (membersError) throw membersError;

      const { data: departmentMembersData, error: deptError } = await supabase
        .from('department_members')
        .select(`
          member_id,
          departments (
            id,
            name
          )
        `);

      if (deptError) throw deptError;

      const membersWithDepartments = (membersData || []).map(member => ({
        ...member,
        department_members: (departmentMembersData || [])
          .filter(dept => dept.member_id === member.id)
          .map(dept => ({
            departments: dept.departments
          }))
      }));

      setMembers(membersWithDepartments as Member[]);
      console.log(`✅ Fetched ${membersWithDepartments.length} members`);
    } catch (error: any) {
      console.error('Error fetching members:', error);
      setError(error.message || 'Failed to load members.');
    }
  }, []);

  const fetchCellGroups = useCallback(async () => {
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
  }, []);

  const fetchMinistryGroups = useCallback(async () => {
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
  }, []);

  const fetchDepartments = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('departments')
        .select('id, name')
        .order('name');

      if (error) throw error;
      setDepartments(data || []);
    } catch (error: any) {
      console.error('Error fetching departments:', error);
    }
  }, []);

  // FIXED: Critical fix - fetchEventAttendees function
  const fetchEventAttendees = useCallback(async (eventId: string) => {
    try {
      console.log(`📥 Fetching attendees for event: ${eventId}`);
      
      const { data, error } = await supabase
        .from('event_attendees')
        .select(`
          id,
          event_id,
          members_id,
          first_time,
          invited_by_id,
          attended_at,
          attendance_status,
          notes,
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

      if (error) {
        console.error('❌ Error fetching attendees:', error);
        throw error;
      }

      console.log(`✅ Fetched ${data?.length || 0} attendees for event ${eventId}`);
      
      // Debug: Show raw data
      if (data && data.length > 0) {
        console.log('📄 Raw attendee data sample:', {
          id: data[0].id,
          attendance_status: data[0].attendance_status,
          member_name: `${data[0].members?.name || 'N/A'} ${data[0].members?.surname || 'N/A'}`
        });
      }

      // IMPORTANT: Use the actual database values
      const attendeesWithDefaults = (data || []).map((attendee: any) => ({
        ...attendee,
        // Make sure attendance_status is properly typed
        attendance_status: attendee.attendance_status || 'present'
      }));

      setAttendees(prev => {
        // Remove existing attendees for this event
        const filtered = prev.filter(attendee => attendee.event_id !== eventId);
        // Add new attendees
        const updated = [...filtered, ...attendeesWithDefaults];
        console.log(`🔄 Updated attendees state: ${updated.length} total attendees`);
        return updated;
      });
      
      return attendeesWithDefaults;
    } catch (error: any) {
      console.error('❌ Error in fetchEventAttendees:', error);
      return [];
    }
  }, []);

  // Initialize data
  useEffect(() => {
    if (user && !authLoading) {
      const initializeData = async () => {
        try {
          setLoading(true);
          console.log('🚀 Initializing all data...');
          await Promise.all([
            fetchEvents(),
            fetchSermons(),
            fetchMembers(),
            fetchCellGroups(),
            fetchMinistryGroups(),
            fetchDepartments()
          ]);
          console.log('✅ All data initialized successfully');
        } catch (error) {
          console.error('❌ Error initializing data:', error);
        } finally {
          setLoading(false);
        }
      };
      
      initializeData();
    }
  }, [user, authLoading]);

  // FIXED: getAttendanceStats with proper debugging
  const getAttendanceStats = (eventId: string) => {
    const eventAttendees = getEventAttendees(eventId);
    
    console.log(`📊 Calculating stats for event ${eventId}:`);
    console.log(`   Total attendees in array: ${eventAttendees.length}`);
    
    if (eventAttendees.length === 0) {
      console.log('   No attendees found');
      return { present: 0, absent: 0, firstTimers: 0, total: 0 };
    }
    
    // Count by status
    const present = eventAttendees.filter(a => {
      const status = a.attendance_status;
      console.log(`   Checking ${a.members?.name}: status = ${status}, is present? ${status === 'present'}`);
      return status === 'present';
    }).length;
    
    const absent = eventAttendees.filter(a => {
      const status = a.attendance_status;
      console.log(`   Checking ${a.members?.name}: status = ${status}, is absent? ${status === 'absent'}`);
      return status === 'absent';
    }).length;
    
    const firstTimers = eventAttendees.filter(a => 
      a.first_time === true && a.attendance_status === 'present'
    ).length;
    
    const total = present + absent;
    
    console.log(`   Final stats: present=${present}, absent=${absent}, firstTimers=${firstTimers}, total=${total}`);
    
    return { present, absent, firstTimers, total };
  };

  // FIXED: getEventAttendees function
  const getEventAttendees = (eventId: string) => {
    const eventAttendees = attendees.filter(attendee => attendee.event_id === eventId);
    console.log(`🔍 [getEventAttendees] Event ${eventId}: Found ${eventAttendees.length} attendees`);
    return eventAttendees;
  };

  // FIXED: handleAttendeeSubmit - Critical fix
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

      console.log('➕ Adding attendee:', {
        eventId,
        memberId: attendeeFormData.memberId,
        memberName: `${selectedMember.name} ${selectedMember.surname}`
      });

      const attendeeData = {
        event_id: eventId,
        members_id: attendeeFormData.memberId,
        first_time: attendeeFormData.firstTime,
        invited_by_id: attendeeFormData.invitedById || null,
        attendance_status: 'present', // Explicitly set
        attended_at: new Date().toISOString(),
        notes: null
      };

      console.log('📝 Attendee data to insert:', attendeeData);

      // First, insert the attendee
      const { data: insertedData, error: insertError } = await supabase
        .from('event_attendees')
        .insert([attendeeData])
        .select()
        .single();

      if (insertError) {
        console.error('❌ Insert error:', insertError);
        throw insertError;
      }

      console.log('✅ Attendee inserted:', insertedData);

      // Now fetch the complete attendee data with relationships
      const { data: completeData, error: fetchError } = await supabase
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
        .eq('id', insertedData.id)
        .single();

      if (fetchError) {
        console.error('❌ Fetch error after insert:', fetchError);
        throw fetchError;
      }

      console.log('✅ Complete attendee data fetched:', completeData);

      // Update local state IMMEDIATELY
      setAttendees(prev => {
        const newAttendee = {
          ...completeData,
          attendance_status: completeData.attendance_status || 'present'
        } as EventAttendee;
        
        const updated = [...prev, newAttendee];
        console.log(`🔄 Updated attendees state to: ${updated.length} attendees`);
        return updated;
      });

      // Also trigger a fresh fetch from server
      setTimeout(() => {
        fetchEventAttendees(eventId);
      }, 100);

      resetAttendeeForm();
      
      setSuccess(`✅ ${selectedMember.name} added successfully!`);
      setTimeout(() => setSuccess(null), 3000);
      
      // Debug after adding
      setTimeout(() => {
        console.log('🔄 Debugging after attendee addition:');
        debugAttendees(eventId);
      }, 500);
    } catch (error: any) {
      console.error('❌ Error adding attendee:', error);
      setError(error.message || 'Failed to add attendee. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // FIXED: handleRemoveAttendee
  const handleRemoveAttendee = async (attendeeId: string, eventId: string) => {
    if (!confirm('Are you sure you want to remove this attendee?')) return;

    try {
      setError(null);
      setSuccess(null);
      
      console.log('🗑️ Removing attendee:', attendeeId);
      
      const { error } = await supabase
        .from('event_attendees')
        .delete()
        .eq('id', attendeeId);

      if (error) throw error;

      console.log('✅ Attendee removed from database');
      
      // Update local state immediately
      setAttendees(prev => {
        const updated = prev.filter(attendee => attendee.id !== attendeeId);
        console.log(`🔄 Updated attendees state after removal: ${updated.length} attendees`);
        return updated;
      });
      
      // Also fetch fresh data
      setTimeout(() => {
        fetchEventAttendees(eventId);
      }, 100);
      
      setSuccess('Attendee removed successfully!');
      setTimeout(() => setSuccess(null), 3000);
    } catch (error: any) {
      console.error('Error removing attendee:', error);
      setError(error.message || 'Failed to remove attendee.');
    }
  };

  // Keep other functions the same but ensure they use the fixed functions above
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

  // ... (keep all other functions like saveAttendance, handleEventSubmit, etc. the same)

  // Add a force refresh function
  const forceRefreshAll = async () => {
    console.log('🔄 Force refreshing all data...');
    setLoading(true);
    try {
      await Promise.all([
        fetchEvents(),
        fetchMembers(),
        fetchEventAttendees(eventId) // You might need to track current event
      ]);
      setSuccess('Data refreshed successfully!');
      setTimeout(() => setSuccess(null), 3000);
    } catch (error) {
      console.error('Error refreshing data:', error);
      setError('Failed to refresh data');
    } finally {
      setLoading(false);
    }
  };

  // In the return JSX, add a debug button in the header
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header with debug button */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
              Events & Sermons
            </h1>
            <p className="text-gray-600 dark:text-gray-400">Manage church events and sermons</p>
            <div className="mt-2">
              <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
                {isAdmin?.() ? 'Administrator' : isPastor?.() ? 'Pastor' : 'Member'}
              </span>
            </div>
          </div>
          <div className="flex gap-3">
            <button 
              onClick={() => {
                console.log('🔄 Force refreshing all data...');
                fetchEvents();
                setSuccess('Refreshing data...');
              }}
              className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-xl hover:shadow-lg transition-all duration-200"
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              {loading ? 'Refreshing...' : 'Refresh Data'}
            </button>
            <button 
              onClick={() => setShowSermonList(!showSermonList)}
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-orange-600 to-amber-600 text-white rounded-xl hover:shadow-lg transition-all duration-200 hover:scale-105 font-medium group"
            >
              <BookOpen className="h-5 w-5 group-hover:scale-110 transition-transform duration-200" />
              {showSermonList ? 'Hide Sermons' : 'View Sermons'}
            </button>
            <button 
              onClick={() => setShowEventForm(!showEventForm)}
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:shadow-lg transition-all duration-200 hover:scale-105 font-medium group"
            >
              <Plus className="h-5 w-5 group-hover:rotate-90 transition-transform duration-200" />
              {showEventForm ? 'Cancel' : 'Create Event'}
            </button>
          </div>
        </div>

        {/* Success/Error messages */}
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
              const stats = getAttendanceStats(event.id);
              const sermon = getSermonForEvent(event.id);
              
              console.log(`🎯 Rendering event ${event.id}:`, {
                name: event.name,
                stats,
                attendeesCount: getEventAttendees(event.id).length
              });
              
              return (
                <div key={event.id} className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-6 hover:shadow-xl transition-all duration-300">
                  <div className="flex flex-col lg:flex-row justify-between gap-6">
                    <div className="flex-1">
                      {/* Event Header */}
                      <div className="flex items-start gap-4 mb-4">
                        <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center flex-shrink-0 shadow-lg">
                          <CalendarIcon className="h-7 w-7 text-white" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2 flex-wrap">
                            <h3 className="text-2xl font-bold text-gray-900 dark:text-white">{event.name}</h3>
                            <span className={`px-3 py-1 rounded-full text-sm font-medium ${event.is_completed ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300' : 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300'}`}>
                              {event.is_completed ? 'Completed' : 'Active'}
                            </span>
                            <span className={`px-3 py-1 rounded-full text-sm font-medium ${event.is_whole_church ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300' : 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300'}`}>
                              {event.is_whole_church ? 'Whole Church' : 'Target Groups'}
                            </span>
                          </div>
                          {event.topic && (
                            <p className="text-blue-600 dark:text-blue-400 font-medium">{event.topic}</p>
                          )}
                        </div>
                      </div>
                      
                      {/* Event Details */}
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

                      {/* Debug Button (Development only) */}
                      {process.env.NODE_ENV === 'development' && (
                        <div className="mt-4">
                          <button
                            onClick={() => debugAttendees(event.id)}
                            className="px-3 py-1 bg-red-500 text-white text-xs rounded-lg hover:bg-red-600"
                          >
                            Debug Attendees
                          </button>
                          <span className="ml-2 text-xs text-gray-500">
                            ({getEventAttendees(event.id).length} in memory)
                          </span>
                        </div>
                      )}

                      {/* Attendance Summary - THIS IS THE KEY PART */}
                      <div className="mt-6 grid grid-cols-1 sm:grid-cols-4 gap-4">
                        <button
                          onClick={() => setShowAttendeeModal({ type: 'present', eventId: event.id })}
                          className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 border border-green-200 dark:border-green-700 rounded-xl p-4 text-center hover:shadow-lg transition-all duration-200 cursor-pointer"
                        >
                          <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                            {stats.present}
                          </div>
                          <div className="text-sm text-green-700 dark:text-green-300 font-medium">Present</div>
                          <div className="text-xs text-green-600 dark:text-green-400 mt-1">Click to view</div>
                        </button>
                        
                        <button
                          onClick={() => setShowAttendeeModal({ type: 'absent', eventId: event.id })}
                          className="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20 border border-red-200 dark:border-red-700 rounded-xl p-4 text-center hover:shadow-lg transition-all duration-200 cursor-pointer"
                        >
                          <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                            {stats.absent}
                          </div>
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
                          <button
                            onClick={() => setShowNewcomerModal(event.id)}
                            className="flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl hover:shadow-lg transition-all duration-200 font-medium text-sm"
                          >
                            <User className="h-4 w-4" />
                            Add Newcomer
                          </button>
                        </>
                      )}
                      <button
                        onClick={() => setShowSermonModal(event.id)}
                        className="flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-orange-600 to-amber-600 text-white rounded-xl hover:shadow-lg transition-all duration-200 font-medium text-sm"
                      >
                        <BookOpen className="h-4 w-4" />
                        {sermon ? 'Edit Sermon' : 'Add Sermon'}
                      </button>
                      <button
                        onClick={() => setShowAttendeeModal({ type: 'present', eventId: event.id })}
                        className="flex items-center justify-between px-4 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200 font-medium text-sm"
                      >
                        <span>View Present ({stats.present})</span>
                        <Eye className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => setShowAttendeeModal({ type: 'absent', eventId: event.id })}
                        className="flex items-center justify-between px-4 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200 font-medium text-sm"
                      >
                        <span>View Absent ({stats.absent})</span>
                        <Eye className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  {/* Add Attendee Form */}
                  {showAttendeeForm === event.id && (
                    <div className="mt-6 p-6 bg-gray-50 dark:bg-gray-700/50 rounded-xl border border-gray-200 dark:border-gray-600">
                      <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Add Attendee</h4>
                      <form onSubmit={(e) => handleAttendeeSubmit(e, event.id)} className="space-y-4">
                        {/* ... (keep your form JSX the same) */}
                      </form>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Modals */}
      {/* ... (keep your modal components the same) */}
    </div>
  );
};

// Helper functions
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

export default Events;
