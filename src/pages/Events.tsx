import { Calendar as CalendarIcon, Clock, MapPin, Plus, Phone, X, User, Search, Mail, Building, Users as UsersIcon, CheckCircle, AlertCircle, Upload, FileText, Eye, BookOpen, Download, PlayCircle, AlertTriangle, Edit, Trash2 } from 'lucide-react';
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
  cell_groups: { name: string } | null;
  ministry_groups: { name: string } | null;
  status: 'newcomer' | 'signed_member' | 'not_attending' | null;
  department_ids?: string[];
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

interface SyncLog {
  id: string;
  event_id: string;
  sync_data: any;
  synced_at: string;
  synced_by: string;
  synced_by_name: string;
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
  const [showBulkAttendanceModal, setShowBulkAttendanceModal] = useState<string | null>(null);
  const [showNewcomerModal, setShowNewcomerModal] = useState<string | null>(null);
  const [showSyncModal, setShowSyncModal] = useState<string | null>(null);
  
  const attendanceNotesRef = useRef<Record<string, string>>({});
  const [bulkAttendance, setBulkAttendance] = useState<Record<string, 'present' | 'absent'>>({});
  const [savingProgress, setSavingProgress] = useState({ current: 0, total: 0, isSaving: false });
  const [syncHistory, setSyncHistory] = useState<SyncLog[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

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
  const [_attendanceNotes, setAttendanceNotes] = useState<Record<string, string>>({});

  const [newcomerFormData, setNewcomerFormData] = useState({
    name: '',
    surname: '',
    phone: '',
    residence: '',
    notes: ''
  });

  const hasAccess = useCallback(() => {
    return isAdmin?.() || isPastor?.();
  }, [isAdmin, isPastor]);

  // Helper function to fix date timezone issue
  const fixTimezoneIssue = (dateString: string) => {
    if (!dateString) return dateString;
    
    const datePattern = /^\d{4}-\d{2}-\d{2}$/;
    if (datePattern.test(dateString)) {
      const date = new Date(dateString);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      
      return `${year}-${month}-${day}`;
    }
    
    return dateString;
  };

  // Helper function to format date for display
  const formatDateForDisplay = (dateString: string) => {
    if (!dateString) return '';
    
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    
    return `${year}-${month}-${day}`;
  };

  // Helper function to initialize bulk attendance with all target members as ABSENT by default
  const initializeBulkAttendance = async (eventId: string) => {
    const event = events.find(e => e.id === eventId);
    if (!event) return {};

    const initialAttendance: Record<string, 'present' | 'absent'> = {};

    for (const member of members) {
      if (member.status === 'not_attending') continue;
      
      const shouldAttend = await isMemberInTargetGroups(member, event);
      if (shouldAttend) {
        initialAttendance[member.id] = 'absent';
      }
    }

    const existingAttendees = getEventAttendees(eventId);
    existingAttendees.forEach(attendee => {
      initialAttendance[attendee.members_id] = attendee.attendance_status as 'present' | 'absent';
    });

    return initialAttendance;
  };

  // ==================== BATCH ATTENDANCE FUNCTIONS ====================

  const saveAttendanceBatch = async (eventId: string, attendanceRecords: any[]) => {
    try {
      const { data, error } = await supabase
        .from('event_attendees')
        .upsert(attendanceRecords, {
          onConflict: 'event_id,members_id',
          ignoreDuplicates: false
        });

      if (error) throw error;
      return { success: true, count: attendanceRecords.length };
    } catch (error) {
      console.error('Error saving attendance batch:', error);
      return { success: false, error };
    }
  };

  const saveAttendanceWithChunking = async (eventId: string) => {
    setSavingProgress({ current: 0, total: Object.keys(bulkAttendance).length, isSaving: true });
    setError(null);
    setSuccess(null);

    const chunkSize = 50;
    const memberIds = Object.keys(bulkAttendance);
    const results = [];
    let successCount = 0;
    let failCount = 0;

    try {
      for (let i = 0; i < memberIds.length; i += chunkSize) {
        const chunk = memberIds.slice(i, i + chunkSize);
        const attendanceRecords = [];

        for (const memberId of chunk) {
          const status = bulkAttendance[memberId];
          const notes = attendanceNotesRef.current[memberId] || '';
          
          attendanceRecords.push({
            event_id: eventId,
            members_id: memberId,
            first_time: false,
            invited_by_id: null,
            attendance_status: status,
            attended_at: status === 'present' ? new Date().toISOString() : null,
            notes: notes || null,
          });
        }

        const result = await saveAttendanceBatch(eventId, attendanceRecords);
        results.push(result);
        
        if (result.success) {
          successCount += attendanceRecords.length;
        } else {
          failCount += attendanceRecords.length;
        }

        // Update progress
        setSavingProgress(prev => ({
          ...prev,
          current: Math.min(i + chunkSize, memberIds.length)
        }));

        // Small delay to prevent overwhelming the server
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // Refresh attendees after saving
      await fetchEventAttendees(eventId);

      setSavingProgress({ current: 0, total: 0, isSaving: false });

      if (failCount === 0) {
        setSuccess(`Successfully saved attendance for ${successCount} members!`);
        closeBulkAttendanceModal();
      } else {
        setError(`Saved ${successCount} members, failed to save ${failCount} members.`);
      }

      setTimeout(() => {
        setSuccess(null);
        setError(null);
      }, 5000);

    } catch (error: any) {
      console.error('Error in chunked attendance saving:', error);
      setError(error.message || 'Failed to save bulk attendance.');
      setSavingProgress({ current: 0, total: 0, isSaving: false });
    }
  };

  // ==================== END BATCH FUNCTIONS ====================

  const fetchEvents = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .order('event_date', { ascending: false });

      if (error) throw error;

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
      
      const attendeePromises = eventsWithDefaults.map((event: Event) => 
        fetchEventAttendees(event.id)
      );
      await Promise.all(attendeePromises);
      
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
      
      const { data: membersData, error: membersError } = await supabase
        .from('members')
        .select(`
          id,
          name,
          surname,
          residence,
          phone,
          cell_group_id,
          ministry_group_id,
          status,
          cell_groups (
            name
          ),
          ministry_groups (
            name
          )
        `)
        .order('name');

      if (membersError) throw membersError;

      const { data: deptMembersData, error: deptError } = await supabase
        .from('department_members')
        .select(`
          member_id,
          departments (
            id,
            name
          )
        `);

      if (deptError && deptError.code !== 'PGRST116') {
        console.warn('Error fetching department members:', deptError);
      }

      const memberDeptMap = new Map<string, string[]>();
      if (deptMembersData) {
        deptMembersData.forEach((item: any) => {
          if (item.departments && item.member_id) {
            if (!memberDeptMap.has(item.member_id)) {
              memberDeptMap.set(item.member_id, []);
            }
            memberDeptMap.get(item.member_id)?.push(item.departments.id);
          }
        });
      }

      const membersWithDepartments = (membersData || []).map((member: any) => ({
        ...member,
        department_ids: memberDeptMap.get(member.id) || [],
        cell_groups: member.cell_groups?.[0] || null,
        ministry_groups: member.ministry_groups?.[0] || null
      }));

      setMembers(membersWithDepartments);
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

  const fetchEventAttendees = useCallback(async (eventId: string) => {
    try {
      const { data: attendeesData, error: attendeesError } = await supabase
        .from('event_attendees')
        .select('*')
        .eq('event_id', eventId)
        .order('attended_at', { ascending: false });

      if (attendeesError) throw attendeesError;

      if (!attendeesData || attendeesData.length === 0) {
        const attendeesWithDefaults: EventAttendee[] = [];
        setAttendees(prev => {
          const filtered = prev.filter(attendee => attendee.event_id !== eventId);
          return [...filtered, ...attendeesWithDefaults];
        });
        return [];
      }

      const attendeesWithMembers = await Promise.all(
        attendeesData.map(async (attendee: any) => {
          const { data: memberData, error: memberError } = await supabase
            .from('members')
            .select(`
              id,
              name,
              surname,
              residence,
              phone,
              status,
              cell_group_id,
              ministry_group_id,
              cell_groups (
                name
              ),
              ministry_groups (
                name
              )
            `)
            .eq('id', attendee.members_id)
            .single();

          if (memberError) {
            console.error('Error fetching member:', memberError);
            return null;
          }

          let invited_by_member = null;
          if (attendee.invited_by_id) {
            const { data: inviterData } = await supabase
              .from('members')
              .select('id, name, surname')
              .eq('id', attendee.invited_by_id)
              .single();
            
            invited_by_member = inviterData;
          }

          return {
            ...attendee,
            attendance_status: attendee.attendance_status || 'present',
            members: {
              ...memberData,
              cell_groups: memberData.cell_groups?.[0] || null,
              ministry_groups: memberData.ministry_groups?.[0] || null
            },
            invited_by_member
          };
        })
      );

      const validAttendees = attendeesWithMembers.filter(
        (attendee): attendee is EventAttendee => attendee !== null
      );

      setAttendees(prev => {
        const filtered = prev.filter(attendee => attendee.event_id !== eventId);
        return [...filtered, ...validAttendees];
      });
      
      return validAttendees;
    } catch (error: any) {
      console.error('Error fetching attendees:', error);
      return [];
    }
  }, []);

  const fetchSyncHistory = useCallback(async (eventId: string) => {
    try {
      setLoadingHistory(true);
      const { data, error } = await supabase
        .from('event_sync_logs')
        .select('*')
        .eq('event_id', eventId)
        .order('synced_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      setSyncHistory(data || []);
    } catch (error: any) {
      console.error('Error fetching sync history:', error);
    } finally {
      setLoadingHistory(false);
    }
  }, []);

  useEffect(() => {
    if (user && !authLoading) {
      const initializeData = async () => {
        try {
          setLoading(true);
          await Promise.all([
            fetchEvents(),
            fetchSermons(),
            fetchMembers(),
            fetchCellGroups(),
            fetchMinistryGroups(),
            fetchDepartments()
          ]);
        } catch (error) {
          console.error('Error initializing data:', error);
        } finally {
          setLoading(false);
        }
      };
      
      initializeData();
    }
  }, [
    user, 
    authLoading, 
    fetchEvents, 
    fetchSermons, 
    fetchMembers, 
    fetchCellGroups, 
    fetchMinistryGroups, 
    fetchDepartments
  ]);

  useEffect(() => {
    if (showSyncModal) {
      fetchSyncHistory(showSyncModal);
    }
  }, [showSyncModal, fetchSyncHistory]);

  const isMemberInDepartment = async (memberId: string, departmentId: string): Promise<boolean> => {
    try {
      const { data, error } = await supabase
        .from('department_members')
        .select('id')
        .eq('member_id', memberId)
        .eq('department_id', departmentId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return false;
        }
        throw error;
      }

      return !!data;
    } catch (error) {
      console.error('Error checking department membership:', error);
      return false;
    }
  };

  const isMemberInTargetGroups = async (member: Member, event: Event): Promise<boolean> => {
    if (event.is_whole_church) return true;

    if (event.target_groups && event.target_groups.length > 0) {
      if (member.cell_group_id && event.target_groups.includes(member.cell_group_id)) {
        return true;
      }
    }

    if (event.target_departments && event.target_departments.length > 0) {
      if (member.ministry_group_id && event.target_departments.includes(member.ministry_group_id)) {
        return true;
      }

      if (member.department_ids && member.department_ids.length > 0) {
        for (const deptId of event.target_departments) {
          if (member.department_ids.includes(deptId)) {
            return true;
          }
        }
      }
    }

    return false;
  };

  const saveAttendance = async (eventId: string, memberId: string, status: 'present' | 'absent', notes?: string) => {
    try {
      setLoading(true);
      setError(null);

      const { data: existingRecord } = await supabase
        .from('event_attendees')
        .select('id')
        .eq('event_id', eventId)
        .eq('members_id', memberId)
        .single();

      const attendanceData: any = {
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
      return true;
    } catch (error: any) {
      console.error('Error saving attendance:', error);
      setError(error.message || 'Failed to save attendance.');
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Old function - replaced with chunking version
  // const saveBulkAttendance = async (eventId: string) => {
  //   // This is now replaced by saveAttendanceWithChunking
  // };

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

  // FIXED: Now properly stores sync data to the database
  const syncEventToCloud = async (eventId: string) => {
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const event = events.find(e => e.id === eventId);
      if (!event) throw new Error('Event not found');

      const eventAttendees = getEventAttendees(eventId);
      const stats = getAttendanceStats(eventId);

      // Create comprehensive sync data
      const syncData = {
        event_id: event.id,
        event_name: event.name,
        event_date: event.event_date,
        event_time: event.event_time,
        location: event.location,
        topic: event.topic,
        is_completed: event.is_completed,
        is_whole_church: event.is_whole_church,
        target_groups: event.target_groups,
        target_departments: event.target_departments,
        total_attendees: eventAttendees.length,
        present_count: stats.present,
        absent_count: stats.absent,
        first_timers_count: stats.firstTimers,
        attendees: eventAttendees.map(attendee => ({
          member_id: attendee.members_id,
          member_name: `${attendee.members.name} ${attendee.members.surname}`,
          status: attendee.attendance_status,
          first_time: attendee.first_time,
          invited_by: attendee.invited_by_member ? 
            `${attendee.invited_by_member.name} ${attendee.invited_by_member.surname}` : null,
          attended_at: attendee.attended_at,
          notes: attendee.notes
        })),
        synced_at: new Date().toISOString(),
        synced_by: user?.id,
        synced_by_name: profile?.name ? `${profile.name} ${profile.surname}` : 'Unknown'
      };

      // FIRST: Store sync data in the event_sync_logs table
      const { error: syncError } = await supabase
        .from('event_sync_logs')
        .insert([{
          event_id: eventId,
          sync_data: syncData,
          synced_by: user?.id,
          synced_by_name: profile?.name ? `${profile.name} ${profile.surname}` : 'Unknown'
        }]);

      if (syncError) throw syncError;

      // SECOND: Also update the event's updated_at timestamp
      const { error: updateError } = await supabase
        .from('events')
        .update({ 
          updated_at: new Date().toISOString(),
        })
        .eq('id', eventId);

      if (updateError) throw updateError;

      // Refresh sync history to show the new sync
      await fetchSyncHistory(eventId);

      setSuccess(`Event "${event.name}" successfully synced to cloud! All data has been saved.`);
      setTimeout(() => setSuccess(null), 3000);
      
    } catch (error: any) {
      console.error('Error syncing event to cloud:', error);
      setError(error.message || 'Failed to sync event to cloud. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const exportEventData = (eventId: string) => {
    const event = events.find(e => e.id === eventId);
    if (!event) return;

    const eventAttendees = getEventAttendees(eventId);
    
    const csvRows = [];
    
    csvRows.push(['Event Information']);
    csvRows.push(['Name', event.name]);
    csvRows.push(['Date', event.event_date]);
    csvRows.push(['Time', event.event_time]);
    csvRows.push(['Location', event.location || '']);
    csvRows.push(['Topic', event.topic || '']);
    csvRows.push(['']);
    
    csvRows.push(['Attendees List']);
    csvRows.push(['Name', 'Surname', 'Residence', 'Phone', 'Status', 'First Time', 'Attended At', 'Invited By', 'Notes']);
    
    eventAttendees.forEach(attendee => {
      csvRows.push([
        attendee.members.name,
        attendee.members.surname,
        attendee.members.residence || '',
        attendee.members.phone || '',
        attendee.attendance_status,
        attendee.first_time ? 'Yes' : 'No',
        attendee.attended_at ? new Date(attendee.attended_at).toLocaleString() : '',
        attendee.invited_by_member ? `${attendee.invited_by_member.name} ${attendee.invited_by_member.surname}` : '',
        attendee.notes || ''
      ]);
    });
    
    const csvContent = csvRows.map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `event_${event.name.replace(/\s+/g, '_')}_${event.event_date}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    
    setSuccess(`Event data exported successfully!`);
    setTimeout(() => setSuccess(null), 3000);
  };

  const uploadPamphlet = async (eventId: string, file: File) => {
    try {
      setUploadingPamphlet(eventId);
      setError(null);

      const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
      
      if (!allowedTypes.includes(file.type)) {
        throw new Error('Invalid file type. Please upload PDF, image, or document files.');
      }

      const maxSize = 5 * 1024 * 1024;
      if (file.size > maxSize) {
        throw new Error('File size too large. Please upload files smaller than 5MB.');
      }

      const fileExt = file.name.split('.').pop();
      const fileName = `pamphlet-${eventId}-${Date.now()}.${fileExt}`;
      const filePath = `event-pamphlets/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('event-pamphlets')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true
        });

      if (uploadError) {
        throw new Error(`Upload failed: ${uploadError.message}`);
      }

      const { data: { publicUrl } } = supabase.storage
        .from('event-pamphlets')
        .getPublicUrl(filePath);

      const { error: updateError } = await supabase
        .from('events')
        .update({ 
          pamphlet_url: publicUrl,
          updated_at: new Date().toISOString()
        })
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

  const deletePamphlet = async (eventId: string) => {
    try {
      if (!confirm('Are you sure you want to delete this pamphlet?')) return;

      setError(null);
      const event = events.find(e => e.id === eventId);
      if (!event?.pamphlet_url) return;

      const urlParts = event.pamphlet_url.split('/');
      const fileName = urlParts[urlParts.length - 1];
      const filePath = `event-pamphlets/${fileName}`;

      const { error: deleteError } = await supabase.storage
        .from('event-pamphlets')
        .remove([filePath]);

      if (deleteError) {
        console.warn('File deletion failed, but continuing with database update');
      }

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

  const viewPamphlet = (pamphletUrl: string) => {
    setViewingPamphlet(pamphletUrl);
  };

  const closePamphletModal = () => {
    setViewingPamphlet(null);
  };

  const uploadSermonFile = async (file: File, type: 'video' | 'document'): Promise<string> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
    const filePath = `${type}s/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('sermon-files')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage
      .from('sermon-files')
      .getPublicUrl(filePath);

    return publicUrl;
  };

  const deleteSermonFile = async (fileUrl: string, type: 'video' | 'document') => {
    try {
      if (!fileUrl) return;
      
      const urlParts = fileUrl.split('/');
      const fileName = urlParts[urlParts.length - 1];
      const filePath = `${type}s/${fileName}`;

      const { error: deleteError } = await supabase.storage
        .from('sermon-files')
        .remove([filePath]);

      if (deleteError) {
        console.warn('File deletion failed, but continuing with database deletion');
      }
    } catch (error: any) {
      console.error('Error deleting file:', error);
    }
  };

  const handleSermonSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!hasAccess()) {
      setError('You do not have permission to manage sermons');
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

    setSermonLoading('saving');
    setError(null);
    setSuccess(null);

    try {
      let videoUrl = sermonFormData.existingVideoUrl;
      let documentUrl = sermonFormData.existingDocumentUrl;

      if (sermonFormData.videoFile) {
        setUploadingSermonFile({ type: 'video' });
        try {
          videoUrl = await uploadSermonFile(sermonFormData.videoFile, 'video');
        } catch (error: any) {
          throw new Error(`Failed to upload video: ${error.message}`);
        }
      }
      if (sermonFormData.documentFile) {
        setUploadingSermonFile({ type: 'document' });
        try {
          documentUrl = await uploadSermonFile(sermonFormData.documentFile, 'document');
        } catch (error: any) {
          throw new Error(`Failed to upload document: ${error.message}`);
        }
      }

      const sermonData = {
        title: sermonFormData.title.trim(),
        summary: sermonFormData.summary.trim(),
        pastor_name: sermonFormData.pastorName.trim(),
        sermon_date: fixTimezoneIssue(sermonFormData.sermonDate),
        event_id: sermonFormData.eventId || null,
        video_url: videoUrl,
        document_url: documentUrl,
        updated_at: new Date().toISOString()
      };

      let error;
      if (editingSermon) {
        const { error: updateError } = await supabase
          .from('sermons')
          .update(sermonData)
          .eq('id', editingSermon.id);
        error = updateError;
      } else {
        const { error: insertError } = await supabase
          .from('sermons')
          .insert([{ ...sermonData, created_at: new Date().toISOString() }]);
        error = insertError;
      }

      if (error) throw error;

      setShowSermonModal(null);
      setEditingSermon(null);
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
      setSuccess(editingSermon ? 'Sermon updated successfully!' : 'Sermon added successfully!');
      
      setTimeout(() => setSuccess(null), 3000);
    } catch (error: any) {
      console.error('Error saving sermon:', error);
      setError(error.message || `Failed to ${editingSermon ? 'update' : 'save'} sermon. Please try again.`);
    } finally {
      setSermonLoading(null);
      setUploadingSermonFile(null);
    }
  };

  const handleDeleteSermon = async (sermonId: string) => {
    if (!confirm('Are you sure you want to delete this sermon? This action cannot be undone.')) return;

    try {
      setError(null);
      setSermonLoading(sermonId);

      const sermonToDelete = sermons.find(s => s.id === sermonId);
      if (!sermonToDelete) throw new Error('Sermon not found');

      if (sermonToDelete.video_url) {
        await deleteSermonFile(sermonToDelete.video_url, 'video');
      }
      if (sermonToDelete.document_url) {
        await deleteSermonFile(sermonToDelete.document_url, 'document');
      }

      const { error } = await supabase
        .from('sermons')
        .delete()
        .eq('id', sermonId);

      if (error) throw error;

      setSermons(prev => prev.filter(sermon => sermon.id !== sermonId));
      setSuccess('Sermon deleted successfully!');
      setTimeout(() => setSuccess(null), 3000);
    } catch (error: any) {
      console.error('Error deleting sermon:', error);
      setError(error.message || 'Failed to delete sermon.');
      await fetchSermons();
    } finally {
      setSermonLoading(null);
    }
  };

  const openSermonModal = (eventId?: string, sermonToEdit?: Sermon) => {
    if (sermonToEdit) {
      setEditingSermon(sermonToEdit);
      setSermonFormData({
        title: sermonToEdit.title,
        summary: sermonToEdit.summary,
        pastorName: sermonToEdit.pastor_name,
        sermonDate: formatDateForDisplay(sermonToEdit.sermon_date),
        eventId: sermonToEdit.event_id || '',
        videoFile: null,
        documentFile: null,
        existingVideoUrl: sermonToEdit.video_url || '',
        existingDocumentUrl: sermonToEdit.document_url || '',
      });
    } else {
      const event = eventId ? events.find(e => e.id === eventId) : null;
      setEditingSermon(null);
      setSermonFormData({
        title: event?.name || '',
        summary: '',
        pastorName: '',
        sermonDate: event?.event_date ? formatDateForDisplay(event.event_date) : new Date().toISOString().split('T')[0],
        eventId: eventId || '',
        videoFile: null,
        documentFile: null,
        existingVideoUrl: '',
        existingDocumentUrl: '',
      });
    }
    
    setShowSermonModal(eventId || sermonToEdit?.id || 'new');
  };

  const closeSermonModal = () => {
    setShowSermonModal(null);
    setEditingSermon(null);
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
    setError(null);
  };

  const removeSermonFile = async (sermonId: string, fileType: 'video' | 'document') => {
    if (!confirm(`Are you sure you want to remove the ${fileType} file?`)) return;

    try {
      setSermonLoading(`remove-${fileType}-${sermonId}`);
      setError(null);

      const sermon = sermons.find(s => s.id === sermonId);
      if (!sermon) throw new Error('Sermon not found');

      const fileUrl = fileType === 'video' ? sermon.video_url : sermon.document_url;
      if (!fileUrl) return;

      await deleteSermonFile(fileUrl, fileType);

      const updateData = fileType === 'video' 
        ? { video_url: null } 
        : { document_url: null };

      const { error } = await supabase
        .from('sermons')
        .update(updateData)
        .eq('id', sermonId);

      if (error) throw error;

      await fetchSermons();
      setSuccess(`${fileType === 'video' ? 'Video' : 'Document'} removed successfully!`);
      setTimeout(() => setSuccess(null), 3000);
    } catch (error: any) {
      console.error(`Error removing ${fileType}:`, error);
      setError(error.message || `Failed to remove ${fileType}.`);
    } finally {
      setSermonLoading(null);
    }
  };

  const markMembersAsAbsent = async (eventId: string, absentMemberIds: string[]) => {
    try {
      const absentRecords = absentMemberIds.map(memberId => ({
        event_id: eventId,
        members_id: memberId,
        first_time: false,
        invited_by_id: null,
        attendance_status: 'absent' as const,
        attended_at: null
      }));

      for (const record of absentRecords) {
        const { data: existing } = await supabase
          .from('event_attendees')
          .select('id')
          .eq('event_id', eventId)
          .eq('members_id', record.members_id)
          .single();

        if (existing) {
          await supabase
            .from('event_attendees')
            .update(record)
            .eq('id', existing.id);
        } else {
          await supabase
            .from('event_attendees')
            .insert([record]);
        }
      }
      
      await fetchEventAttendees(eventId);
    } catch (error: any) {
      console.error('Error marking members as absent:', error);
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

      const absentMemberIds: string[] = [];

      for (const member of members) {
        if (member.status === 'not_attending') continue;
        if (attendeeIds.has(member.id)) continue;

        const shouldAttend = await isMemberInTargetGroups(member, event);
        if (shouldAttend) {
          absentMemberIds.push(member.id);
        }
      }

      if (absentMemberIds.length > 0) {
        await markMembersAsAbsent(eventId, absentMemberIds);
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
      const fixedEventDate = fixTimezoneIssue(eventFormData.eventDate);
      
      const eventData = {
        name: eventFormData.name.trim(),
        topic: eventFormData.topic.trim() || null,
        event_date: fixedEventDate,
        event_time: eventFormData.eventTime,
        location: eventFormData.location.trim() || null,
        is_whole_church: eventFormData.isWholeChurch,
        is_completed: false,
        completed_at: null,
        pamphlet_url: null,
        target_groups: !eventFormData.isWholeChurch && eventFormData.targetCellGroups.length > 0 ? eventFormData.targetCellGroups : null,
        target_departments: !eventFormData.isWholeChurch && [...eventFormData.targetMinistryGroups, ...eventFormData.targetDepartments].length > 0 
          ? [...eventFormData.targetMinistryGroups, ...eventFormData.targetDepartments] 
          : null,
      };

      const { error } = await supabase.from('events').insert([eventData]);

      if (error) throw error;

      setShowEventForm(false);
      setEventFormData({ 
        eventType: '',
        name: '', 
        topic: '', 
        eventDate: '', 
        eventTime: '', 
        location: '',
        isWholeChurch: true,
        targetCellGroups: [],
        targetMinistryGroups: [],
        targetDepartments: [],
      });
      
      await fetchEvents();
      setSuccess('Event created successfully!');
      
      setTimeout(() => setSuccess(null), 3000);
    } catch (error: any) {
      console.error('Error creating event:', error);
      setError(error.message || 'Failed to create event. Please try again.');
    } finally {
      setLoading(false);
    }
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
        first_time: attendeeFormData.firstTime,
        invited_by_id: attendeeFormData.invitedById || null,
        attendance_status: 'present' as const,
        attended_at: new Date().toISOString()
      };

      const { data: newAttendee, error: attendeeError } = await supabase
        .from('event_attendees')
        .insert([attendeeData])
        .select()
        .single();

      if (attendeeError) {
        console.error('Supabase error details:', attendeeError);
        throw attendeeError;
      }

      const { data: attendeeWithDetails } = await supabase
        .from('event_attendees')
        .select(`
          *,
          members (
            id,
            name,
            surname,
            residence,
            phone,
            status,
            cell_group_id,
            ministry_group_id
          )
        `)
        .eq('id', newAttendee.id)
        .single();

      if (attendeeWithDetails) {
        let invited_by_member = null;
        if (attendeeWithDetails.invited_by_id) {
          const { data: inviterData } = await supabase
            .from('members')
            .select('id, name, surname')
            .eq('id', attendeeWithDetails.invited_by_id)
            .single();
          
          invited_by_member = inviterData;
        }

        const attendeeToAdd: EventAttendee = {
          ...attendeeWithDetails,
          members: {
            ...attendeeWithDetails.members,
            cell_groups: null,
            ministry_groups: null,
            department_ids: []
          },
          invited_by_member
        };

        setAttendees(prev => [...prev, attendeeToAdd]);
      }

      await fetchEventAttendees(eventId);

      resetAttendeeForm();
      
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

      setAttendees(prev => prev.filter(attendee => attendee.id !== attendeeId));
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

  const openAttendeeModal = (type: 'present' | 'absent', eventId: string) => {
    setShowAttendeeModal({ type, eventId });
  };

  const closeAttendeeModal = () => {
    setShowAttendeeModal(null);
  };

  const openBulkAttendanceModal = async (eventId: string) => {
    setShowBulkAttendanceModal(eventId);
    setLoading(true);
    
    try {
      const initialAttendance = await initializeBulkAttendance(eventId);
      setBulkAttendance(initialAttendance);
    } catch (error: any) {
      console.error('Error initializing bulk attendance:', error);
      setError('Failed to load attendance data.');
    } finally {
      setLoading(false);
    }
  };

  const closeBulkAttendanceModal = () => {
    setShowBulkAttendanceModal(null);
    setBulkAttendance({});
    setAttendanceNotes({});
    attendanceNotesRef.current = {};
    setSavingProgress({ current: 0, total: 0, isSaving: false });
  };

  const handleBulkAttendanceChange = (memberId: string, status: 'present' | 'absent') => {
    setBulkAttendance(prev => ({ ...prev, [memberId]: status }));
  };

  const openNewcomerModal = (eventId: string) => {
    setShowNewcomerModal(eventId);
  };

  const closeNewcomerModal = () => {
    setShowNewcomerModal(null);
    setNewcomerFormData({
      name: '',
      surname: '',
      phone: '',
      residence: '',
      notes: ''
    });
  };

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
      let existingMember = null;
      if (newcomerFormData.phone.trim()) {
        const { data: phoneMatch } = await supabase
          .from('members')
          .select('*')
          .eq('phone', newcomerFormData.phone.trim())
          .single();
        existingMember = phoneMatch;
      }

      let memberId;
      
      if (existingMember) {
        memberId = existingMember.id;
      } else {
        const memberPayload = {
          name: newcomerFormData.name.trim(),
          surname: newcomerFormData.surname.trim(),
          residence: newcomerFormData.residence.trim(),
          phone: newcomerFormData.phone.trim() || null,
          status: 'newcomer' as const,
          first_time_visit_date: new Date().toISOString(),
          is_permanent_member: false,
          is_leader: false,
          admin_role: 'member',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          status_date: new Date().toISOString()
        };

        const { data: memberData, error: memberError } = await supabase
          .from('members')
          .insert([memberPayload])
          .select()
          .single();

        if (memberError) {
          if (memberError.code === '23505' && memberError.message.includes('phone')) {
            setError('A member with this phone number already exists');
            return;
          }
          throw memberError;
        }
        memberId = memberData.id;
      }

      const attendeeData = {
        event_id: eventId,
        members_id: memberId,
        first_time: true,
        invited_by_id: null,
        attendance_status: 'present' as const,
        attended_at: new Date().toISOString()
      };

      const { error: attendeeError } = await supabase
        .from('event_attendees')
        .insert([attendeeData]);

      if (attendeeError) throw attendeeError;

      await fetchEventAttendees(eventId);
      await fetchMembers();
      closeNewcomerModal();
      setSuccess('Newcomer added successfully!');
      setTimeout(() => setSuccess(null), 3000);
    } catch (error: any) {
      console.error('Error adding newcomer:', error);
      setError(error.message || 'Failed to add newcomer.');
    } finally {
      setLoading(false);
    }
  };

  const filteredMembers = members.filter(member => {
    const searchLower = searchTerm.toLowerCase();
    return (
      member.name.toLowerCase().includes(searchLower) ||
      member.surname.toLowerCase().includes(searchLower) ||
      `${member.name} ${member.surname}`.toLowerCase().includes(searchLower) ||
      member.residence.toLowerCase().includes(searchLower) ||
      member.phone?.toLowerCase().includes(searchLower)
    );
  });

  const filteredInviters = members.filter(member => {
    const searchLower = inviterSearchTerm.toLowerCase();
    return (
      member.name.toLowerCase().includes(searchLower) ||
      member.surname.toLowerCase().includes(searchLower) ||
      `${member.name} ${member.surname}`.toLowerCase().includes(searchLower) ||
      member.residence.toLowerCase().includes(searchLower) ||
      member.phone?.toLowerCase().includes(searchLower)
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
    if (!dateString) return 'Invalid date';
    
    const date = new Date(dateString + 'T00:00:00');
    
    if (isNaN(date.getTime())) {
      return 'Invalid date';
    }
    
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      timeZone: 'UTC'
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
        icon: UsersIcon
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

  const SyncModal = () => {
    if (!showSyncModal) return null;

    const event = events.find(e => e.id === showSyncModal);
    if (!event) return null;

    const stats = getAttendanceStats(event.id);
    const eventAttendees = getEventAttendees(event.id);

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
            <div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                <Upload className="inline-block h-5 w-5 mr-2 text-blue-500" />
                Sync to Cloud - {event.name}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Backup event data to cloud storage
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
              <h4 className="font-semibold text-blue-800 dark:text-blue-300 mb-2">What will be synced:</h4>
              <ul className="space-y-2 text-sm text-blue-700 dark:text-blue-400">
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4" />
                  Event details (name, date, time, location, topic)
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4" />
                  Attendance statistics ({stats.present} present, {stats.absent} absent)
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4" />
                  Attendee list ({eventAttendees.length} members with details)
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4" />
                  Event scope and target groups information
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4" />
                  Sync timestamp and user information
                </li>
              </ul>
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
                <div className="text-2xl font-bold text-gray-900 dark:text-white">{eventAttendees.length}</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Total Registered</div>
              </div>
              <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                <div className="text-2xl font-bold text-gray-900 dark:text-white">{stats.firstTimers}</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">First Timers</div>
              </div>
            </div>

            {/* Sync History */}
            <div className="mb-6">
              <h4 className="font-semibold text-gray-900 dark:text-white mb-3">Sync History</h4>
              {loadingHistory ? (
                <div className="text-center py-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
                </div>
              ) : syncHistory.length === 0 ? (
                <div className="text-center py-4 text-gray-500 dark:text-gray-400">
                  No sync history yet. Sync this event to create the first record.
                </div>
              ) : (
                <div className="space-y-3 max-h-60 overflow-y-auto">
                  {syncHistory.map((sync) => (
                    <div key={sync.id} className="p-3 border border-gray-200 dark:border-gray-600 rounded-lg">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="font-medium text-gray-900 dark:text-white">
                            {new Date(sync.synced_at).toLocaleString()}
                          </div>
                          <div className="text-sm text-gray-600 dark:text-gray-400">
                            By: {sync.synced_by_name}
                          </div>
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-500">
                          {sync.sync_data?.attendees?.length || 0} attendees
                        </div>
                      </div>
                      {sync.sync_data?.present_count && (
                        <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                          {sync.sync_data.present_count} present, {sync.sync_data.absent_count} absent
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => exportEventData(event.id)}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 border border-green-300 dark:border-green-700 text-green-700 dark:text-green-300 rounded-xl hover:bg-green-50 dark:hover:bg-green-900/20 transition-all duration-200 font-medium"
                >
                  <Download className="h-4 w-4" />
                  Export as CSV
                </button>
                <button
                  onClick={() => syncEventToCloud(event.id)}
                  disabled={loading}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:shadow-lg transition-all duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Upload className="h-4 w-4" />
                  {loading ? 'Syncing...' : 'Sync to Cloud'}
                </button>
              </div>
              
              <p className="text-xs text-gray-500 dark:text-gray-500 text-center">
                Last updated: {event.updated_at ? new Date(event.updated_at).toLocaleString() : 'Never'}
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

  const BulkAttendanceModal = () => {
    if (!showBulkAttendanceModal) return null;

    const event = events.find(e => e.id === showBulkAttendanceModal);
    if (!event) return null;

    const [targetMembers, setTargetMembers] = useState<Member[]>([]);
    const [loadingTargetMembers, setLoadingTargetMembers] = useState(true);
    
    useEffect(() => {
      const loadTargetMembers = async () => {
        setLoadingTargetMembers(true);
        try {
          const membersList: Member[] = [];
          for (const member of members) {
            if (member.status === 'not_attending') continue;
            const shouldAttend = await isMemberInTargetGroups(member, event);
            if (shouldAttend) {
              membersList.push(member);
            }
          }
          setTargetMembers(membersList);
        } catch (error) {
          console.error('Error loading target members:', error);
        } finally {
          setLoadingTargetMembers(false);
        }
      };
      
      loadTargetMembers();
    }, [event, members]);

    const stats = {
      present: Object.values(bulkAttendance).filter(status => status === 'present').length,
      absent: Object.values(bulkAttendance).filter(status => status === 'absent').length,
      total: targetMembers.length
    };

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden">
          <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
            <div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                Bulk Attendance - {event.name}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Manage attendance for all target members - {targetMembers.length} members found
              </p>
              <div className="mt-2 text-sm text-blue-600 dark:text-blue-400">
                <span className="font-medium">Note:</span> All members are marked as ABSENT by default. Click "Present" for members who attended.
              </div>
            </div>
            <button
              onClick={closeBulkAttendanceModal}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors duration-200"
            >
              <X className="h-5 w-5 text-gray-500 dark:text-gray-400" />
            </button>
          </div>
          
          <div className="p-6 max-h-[70vh] overflow-y-auto">
            {/* Progress Bar */}
            {savingProgress.isSaving && (
              <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-xl">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-blue-700 dark:text-blue-300">
                    Saving attendance...
                  </span>
                  <span className="text-sm text-blue-600 dark:text-blue-400">
                    {savingProgress.current} of {savingProgress.total}
                  </span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
                  <div 
                    className="bg-blue-600 h-2.5 rounded-full transition-all duration-300" 
                    style={{ width: `${(savingProgress.current / savingProgress.total) * 100}%` }}
                  ></div>
                </div>
                <p className="text-xs text-blue-600 dark:text-blue-400 mt-2">
                  Processing in batches of 50 members for optimal performance...
                </p>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-xl p-4 text-center">
                <div className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.present}</div>
                <div className="text-sm text-green-700 dark:text-green-300 font-medium">Present</div>
              </div>
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-xl p-4 text-center">
                <div className="text-2xl font-bold text-red-600 dark:text-red-400">{stats.absent}</div>
                <div className="text-sm text-red-700 dark:text-red-300 font-medium">Absent</div>
              </div>
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-xl p-4 text-center">
                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{stats.total}</div>
                <div className="text-sm text-blue-700 dark:text-blue-300 font-medium">Total Expected</div>
              </div>
            </div>

            <div className="flex gap-2 mb-6 flex-wrap">
              <button
                onClick={() => {
                  const newAttendance = { ...bulkAttendance };
                  targetMembers.forEach(member => {
                    newAttendance[member.id] = 'present';
                  });
                  setBulkAttendance(newAttendance);
                }}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
              >
                Mark All Present
              </button>
              <button
                onClick={() => {
                  const newAttendance = { ...bulkAttendance };
                  targetMembers.forEach(member => {
                    newAttendance[member.id] = 'absent';
                  });
                  setBulkAttendance(newAttendance);
                }}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm"
              >
                Mark All Absent
              </button>
              <button
                onClick={() => {
                  setBulkAttendance({});
                }}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm"
              >
                Clear All
              </button>
            </div>

            <div className="space-y-3">
              {loadingTargetMembers ? (
                <div className="flex justify-center items-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  <span className="ml-3 text-gray-600 dark:text-gray-400">Loading target members...</span>
                </div>
              ) : targetMembers.length === 0 ? (
                <div className="text-center py-8">
                  <UsersIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500 dark:text-gray-400">No target members found for this event.</p>
                </div>
              ) : (
                targetMembers.map((member) => (
                  <div key={member.id} className="p-4 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700">
                    <div className="flex flex-col gap-3">
                      <div className="flex items-center justify-between flex-wrap gap-3">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white text-sm font-medium flex-shrink-0">
                            {getInitials(member.name, member.surname)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-gray-900 dark:text-white truncate">
                              {member.name} {member.surname}
                            </div>
                            <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
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
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <button
                            onClick={() => handleBulkAttendanceChange(member.id, 'present')}
                            className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors text-sm ${
                              bulkAttendance[member.id] === 'present'
                                ? 'bg-green-600 text-white shadow-lg'
                                : 'bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-600 dark:text-gray-300'
                            }`}
                          >
                            <CheckCircle className="h-4 w-4" />
                            <span className="hidden sm:inline">Present</span>
                          </button>
                          <button
                            onClick={() => handleBulkAttendanceChange(member.id, 'absent')}
                            className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors text-sm ${
                              bulkAttendance[member.id] === 'absent'
                                ? 'bg-red-600 text-white shadow-lg'
                                : 'bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-600 dark:text-gray-300'
                            }`}
                          >
                            <X className="h-4 w-4" />
                            <span className="hidden sm:inline">Absent</span>
                          </button>
                        </div>
                      </div>
                      
                      {bulkAttendance[member.id] === 'absent' && (
                        <div className="mt-2 pl-0 sm:pl-13">
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Reason for absence (optional)
                          </label>
                          <textarea
                            defaultValue={attendanceNotesRef.current[member.id] || ''}
                            onChange={(e) => {
                              attendanceNotesRef.current[member.id] = e.target.value;
                            }}
                            placeholder="Enter reason for absence..."
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none"
                            rows={2}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="sticky bottom-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <div className="text-sm text-gray-600 dark:text-gray-400">
                {stats.present} present, {stats.absent} absent of {targetMembers.length} members
              </div>
              <div className="flex gap-3 w-full sm:w-auto">
                <button
                  onClick={closeBulkAttendanceModal}
                  disabled={savingProgress.isSaving}
                  className="flex-1 sm:flex-none px-4 sm:px-6 py-2.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200 font-medium disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={() => saveAttendanceWithChunking(showBulkAttendanceModal)}
                  disabled={savingProgress.isSaving || Object.keys(bulkAttendance).length === 0}
                  className="flex-1 sm:flex-none px-4 sm:px-6 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-xl transition-all duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg hover:shadow-xl"
                >
                  {savingProgress.isSaving ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>Saving ({savingProgress.current}/{savingProgress.total})...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4" />
                      <span className="hidden sm:inline">Save Attendance</span>
                      <span className="sm:hidden">Save ({Object.keys(bulkAttendance).length})</span>
                    </>
                  )}
                </button>
              </div>
            </div>
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
        <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white">
              Add Newcomer - {event.name}
            </h3>
            <button
              onClick={closeNewcomerModal}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors duration-200"
            >
              <X className="h-5 w-5 text-gray-500 dark:text-gray-400" />
            </button>
          </div>

          <form onSubmit={(e) => handleNewcomerSubmit(e, showNewcomerModal)} className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  First Name *
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    value={newcomerFormData.name}
                    onChange={(e) => setNewcomerFormData({ ...newcomerFormData, name: e.target.value })}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                    placeholder="Enter first name"
                    required
                  />
                </div>
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
                  placeholder="Enter last name"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Residence *
                </label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    value={newcomerFormData.residence}
                    onChange={(e) => setNewcomerFormData({ ...newcomerFormData, residence: e.target.value })}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                    placeholder="Enter residence"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Phone Number
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="tel"
                    value={newcomerFormData.phone}
                    onChange={(e) => setNewcomerFormData({ ...newcomerFormData, phone: e.target.value })}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                    placeholder="Enter phone number"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Additional Notes
              </label>
              <textarea
                value={newcomerFormData.notes}
                onChange={(e) => setNewcomerFormData({ ...newcomerFormData, notes: e.target.value })}
                rows={3}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                placeholder="Any additional notes about the newcomer..."
              />
            </div>

            <div className="flex gap-3 pt-4">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl transition-colors disabled:opacity-50 font-medium"
              >
                <User className="h-4 w-4" />
                {loading ? 'Adding Newcomer...' : 'Add Newcomer'}
              </button>
              <button
                type="button"
                onClick={closeNewcomerModal}
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
                {type === 'present' ? 'Present' : 'Absent'} Attendees - {event?.name}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Total: {attendees.length} {type === 'present' ? 'present' : 'absent'}
              </p>
            </div>
            <button
              onClick={closeAttendeeModal}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors duration-200"
            >
              <X className="h-5 w-5 text-gray-500 dark:text-gray-400" />
            </button>
          </div>
          <div className="p-6 max-h-[70vh] overflow-y-auto">
            {attendees.length === 0 ? (
              <div className="text-center py-12">
                <UsersIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h4 className="text-lg font-semibold text-gray-600 dark:text-gray-400 mb-2">
                  No {type === 'present' ? 'Present' : 'Absent'} Attendees
                </h4>
                <p className="text-gray-500 dark:text-gray-500">
                  {type === 'present' 
                    ? 'No members have been marked as present for this event.' 
                    : 'No members have been marked as absent for this event.'}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {attendees.map((attendee) => (
                  <div key={attendee.id} className={`flex items-center justify-between p-4 ${
                    type === 'present' 
                      ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700' 
                      : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700'
                  } rounded-xl`}>
                    <div className="flex items-center gap-3">
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white text-sm font-medium ${
                        type === 'present'
                          ? 'bg-gradient-to-br from-green-500 to-emerald-500'
                          : 'bg-gradient-to-br from-red-500 to-orange-500'
                      }`}>
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
                          {type === 'present' && attendee.first_time && (
                            <span className="inline-block px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full text-xs">
                              First Time
                            </span>
                          )}
                          {type === 'present' && attendee.invited_by_member && (
                            <div className="text-xs text-gray-500">
                              Invited by: {attendee.invited_by_member.name} {attendee.invited_by_member.surname}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    {type === 'present' && hasAccess() && (
                      <button
                        onClick={() => handleRemoveAttendee(attendee.id, eventId)}
                        className="p-2 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition-colors duration-150"
                        title="Remove Attendee"
                      >
                        <X className="h-4 w-4 text-red-500" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="flex justify-end p-6 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={closeAttendeeModal}
              className="px-6 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200 font-medium"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  };

  const SermonModal = () => {
    if (!showSermonModal) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white">
              {editingSermon ? 'Edit Sermon' : showSermonModal === 'new' ? 'Add New Sermon' : 'Add Sermon to Event'}
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

              <div className="space-y-4">
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
                  
                  {sermonFormData.existingVideoUrl && (
                    <div className="mb-3 p-3 bg-purple-50 border border-purple-200 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <PlayCircle className="h-4 w-4 text-purple-600" />
                          <span className="text-sm text-purple-700">Video file already uploaded</span>
                        </div>
                        <a
                          href={sermonFormData.existingVideoUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-purple-600 hover:text-purple-700 text-sm"
                        >
                          View
                        </a>
                      </div>
                    </div>
                  )}

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

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Sermon Notes (PDF/DOC)
                  </label>
                  
                  {sermonFormData.existingDocumentUrl && (
                    <div className="mb-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-green-600" />
                          <span className="text-sm text-green-700">Document file already uploaded</span>
                        </div>
                        <a
                          href={sermonFormData.existingDocumentUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-green-600 hover:text-green-700 text-sm"
                        >
                          View
                        </a>
                      </div>
                    </div>
                  )}

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
                disabled={sermonLoading === 'saving'}
                className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-orange-600 to-amber-600 text-white rounded-xl hover:shadow-lg transition-all duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <BookOpen className="h-4 w-4" />
                {sermonLoading === 'saving' ? 'Saving...' : (editingSermon ? 'Update Sermon' : 'Save Sermon')}
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
    );
  };

  const PamphletModal = () => {
    if (!viewingPamphlet) return null;

    return (
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
    );
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
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-6">
      <div className="max-w-7xl mx-auto">
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
                      <div className="flex gap-1">
                        <button
                          onClick={() => openSermonModal(undefined, sermon)}
                          className="p-1 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-lg transition-colors duration-150"
                          title="Edit Sermon"
                          disabled={sermonLoading === sermon.id}
                        >
                          <Edit className="h-4 w-4 text-blue-500" />
                        </button>
                        <button
                          onClick={() => handleDeleteSermon(sermon.id)}
                          className="p-1 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition-colors duration-150"
                          title="Delete Sermon"
                          disabled={sermonLoading === sermon.id}
                        >
                          {sermonLoading === sermon.id ? (
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-500" />
                          ) : (
                            <Trash2 className="h-4 w-4 text-red-500" />
                          )}
                        </button>
                      </div>
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
                        <div className="flex items-center gap-1">
                          <a
                            href={sermon.video_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 px-3 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-lg text-sm hover:bg-purple-200 dark:hover:bg-purple-800/30 transition-all duration-200"
                          >
                            <PlayCircle className="h-3 w-3" />
                            Video
                          </a>
                          {hasAccess() && (
                            <button
                              onClick={() => removeSermonFile(sermon.id, 'video')}
                              className="p-1 hover:bg-red-100 dark:hover:bg-red-900/30 rounded transition-colors duration-150"
                              title="Remove Video"
                              disabled={sermonLoading === `remove-video-${sermon.id}`}
                            >
                              {sermonLoading === `remove-video-${sermon.id}` ? (
                                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-red-500" />
                              ) : (
                                <X className="h-3 w-3 text-red-500" />
                              )}
                            </button>
                          )}
                        </div>
                      )}
                      {sermon.document_url && (
                        <div className="flex items-center gap-1">
                          <a
                            href={sermon.document_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-lg text-sm hover:bg-green-200 dark:hover:bg-green-800/30 transition-all duration-200"
                          >
                            <Download className="h-3 w-3" />
                            Notes
                          </a>
                          {hasAccess() && (
                            <button
                              onClick={() => removeSermonFile(sermon.id, 'document')}
                              className="p-1 hover:bg-red-100 dark:hover:bg-red-900/30 rounded transition-colors duration-150"
                              title="Remove Document"
                              disabled={sermonLoading === `remove-document-${sermon.id}`}
                            >
                              {sermonLoading === `remove-document-${sermon.id}` ? (
                                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-red-500" />
                              ) : (
                                <X className="h-3 w-3 text-red-500" />
                              )}
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {showEventForm && (
          <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-6 mb-8 shadow-lg hover:shadow-xl transition-all duration-300">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Create New Event</h2>
            <form onSubmit={handleEventSubmit} className="space-y-6">
              {!eventFormData.eventType && (
                <div className="space-y-4">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Select Event Type *</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <button
                      type="button"
                      onClick={() => setEventFormData({ ...eventFormData, eventType: 'sunday', name: 'Sunday' })}
                      className="flex items-center justify-center gap-3 p-6 border-2 border-gray-300 dark:border-gray-600 rounded-xl hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all duration-200"
                    >
                      <CalendarIcon className="h-8 w-8 text-blue-600" />
                      <div className="text-left">
                        <div className="font-semibold text-gray-900 dark:text-white text-lg">Sunday Service</div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">Regular Sunday worship service</div>
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => setEventFormData({ ...eventFormData, eventType: 'other', name: '' })}
                      className="flex items-center justify-center gap-3 p-6 border-2 border-gray-300 dark:border-gray-600 rounded-xl hover:border-purple-500 hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-all duration-200"
                    >
                      <Plus className="h-8 w-8 text-purple-600" />
                      <div className="text-left">
                        <div className="font-semibold text-gray-900 dark:text-white text-lg">Other Event</div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">Custom event with your own name</div>
                      </div>
                    </button>
                  </div>
                </div>
              )}

              {eventFormData.eventType && (
                <>
                  <div className="flex items-center gap-2 mb-4">
                    <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full text-sm font-medium">
                      {eventFormData.eventType === 'sunday' ? 'Sunday Service' : 'Other Event'}
                    </span>
                    <button
                      type="button"
                      onClick={() => setEventFormData({ ...eventFormData, eventType: '', name: '' })}
                      className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 text-sm underline"
                    >
                      Change type
                    </button>
                  </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {eventFormData.eventType === 'sunday' ? (
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Event Name</label>
                    <div className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-gray-100 dark:bg-gray-600 text-gray-900 dark:text-white">
                      Sunday
                    </div>
                  </div>
                ) : (
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
                  </div>
                )}
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
                    onChange={(e) => setEventFormData({ ...eventFormData, eventDate: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                    required
                  />
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

                <div className="md:col-span-2 space-y-4">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Event Scope</label>
                  <div className="flex flex-col sm:flex-row gap-4">
                    <label className="flex items-center gap-3 p-4 border border-gray-300 dark:border-gray-600 rounded-xl cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200 flex-1">
                      <input
                        type="radio"
                        name="eventScope"
                        checked={eventFormData.isWholeChurch}
                        onChange={() => setEventFormData({ ...eventFormData, isWholeChurch: true, targetCellGroups: [], targetMinistryGroups: [], targetDepartments: [] })}
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
                      <UsersIcon className="h-5 w-5 text-orange-600" />
                      <div>
                        <div className="font-medium text-gray-900 dark:text-white">Target Groups Only</div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">Specific cell groups, ministry groups, or departments</div>
                      </div>
                    </label>
                  </div>
                </div>

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
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Target Departments</label>
                      <div className="space-y-2 max-h-40 overflow-y-auto">
                        {departments.map((dept) => (
                          <label key={dept.id} className="flex items-center gap-3 p-3 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200">
                            <input
                              type="checkbox"
                              checked={eventFormData.targetDepartments.includes(dept.id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setEventFormData({
                                    ...eventFormData,
                                    targetDepartments: [...eventFormData.targetDepartments, dept.id]
                                  });
                                } else {
                                  setEventFormData({
                                    ...eventFormData,
                                    targetDepartments: eventFormData.targetDepartments.filter(id => id !== dept.id)
                                  });
                                }
                              }}
                              className="text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                            />
                            <span className="text-gray-700 dark:text-gray-300">{dept.name}</span>
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
                  onClick={() => setShowEventForm(false)}
                  className="px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200 font-medium"
                >
                  Cancel
                </button>
              </div>
                </>
              )}
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
              const scopeBadge = getEventScopeBadge(event);
              const statusBadge = getEventStatusBadge(event);
              const ScopeIcon = scopeBadge.icon;
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

                      <div className="mt-6 grid grid-cols-1 sm:grid-cols-4 gap-4">
                        <button
                          onClick={() => openAttendeeModal('present', event.id)}
                          className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 border border-green-200 dark:border-green-700 rounded-xl p-4 text-center hover:shadow-lg transition-all duration-200 cursor-pointer"
                        >
                          <div className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.present}</div>
                          <div className="text-sm text-green-700 dark:text-green-300 font-medium">Present</div>
                          <div className="text-xs text-green-600 dark:text-green-400 mt-1">Click to view</div>
                        </button>
                        <button
                          onClick={() => openAttendeeModal('absent', event.id)}
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
                            onClick={() => openBulkAttendanceModal(event.id)}
                            className="flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-orange-600 to-amber-600 text-white rounded-xl hover:shadow-lg transition-all duration-200 font-medium text-sm"
                          >
                            <UsersIcon className="h-4 w-4" />
                            Bulk Attendance
                          </button>
                          <button
                            onClick={() => openNewcomerModal(event.id)}
                            className="flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl hover:shadow-lg transition-all duration-200 font-medium text-sm"
                          >
                            <User className="h-4 w-4" />
                            Add Newcomer
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
                        onClick={() => setShowSyncModal(event.id)}
                        className="flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-indigo-600 to-blue-600 text-white rounded-xl hover:shadow-lg transition-all duration-200 font-medium text-sm"
                      >
                        <Upload className="h-4 w-4" />
                        Sync to Cloud
                      </button>
                      <button
                        onClick={() => openAttendeeModal('present', event.id)}
                        className="flex items-center justify-between px-4 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200 font-medium text-sm"
                      >
                        <span>View Present ({stats.present})</span>
                        <Eye className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => openAttendeeModal('absent', event.id)}
                        className="flex items-center justify-between px-4 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200 font-medium text-sm"
                      >
                        <span>View Absent ({stats.absent})</span>
                        <Eye className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  {showAttendeeForm === event.id && (
                    <div className="mt-6 p-6 bg-gray-50 dark:bg-gray-700/50 rounded-xl border border-gray-200 dark:border-gray-600">
                      <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Add Attendee</h4>
                      <form onSubmit={(e) => handleAttendeeSubmit(e, event.id)} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                                          {member.residence} {member.phone && `• ${member.phone}`}
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
                                          {member.residence} {member.phone && `• ${member.phone}`}
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
                            First time attending an event
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
                                    {selectedMember.residence && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{selectedMember.residence}</span>}
                                    {selectedMember.phone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{selectedMember.phone}</span>}
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

                        {selectedInviter && (
                          <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-xl">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center text-white text-sm font-medium">
                                  {getInitials(selectedInviter.name, selectedInviter.surname)}
                                </div>
                                <div>
                                  <div className="font-medium text-gray-900 dark:text-white">
                                    {selectedInviter.name} {selectedInviter.surname}
                                  </div>
                                  <div className="text-sm text-gray-600 dark:text-gray-400">
                                    Invited by this member
                                  </div>
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedInviter(null);
                                  setAttendeeFormData({ ...attendeeFormData, invitedById: '' });
                                  setInviterSearchTerm('');
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

      <SermonModal />
      <PamphletModal />
      <BulkAttendanceModal />
      <NewcomerModal />
      <AttendeeModal />
      <SyncModal />
    </div>
  );
};

export default Events;
