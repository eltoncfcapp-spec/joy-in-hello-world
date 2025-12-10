import { Calendar as CalendarIcon, Clock, MapPin, Plus, Phone, X, User, Search, Mail, Building, Users as UsersIcon, CheckCircle, AlertCircle, Upload, FileText, Eye, BookOpen, Download, PlayCircle, AlertTriangle, Edit, Trash2 } from 'lucide-react';
import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { supabase } from '../integrations/supabase/client';
import { useAuth } from '../contexts/AuthContext';

// Types remain the same...
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

// Other interfaces remain the same...

// Simple cache implementation
const supabaseCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Debounce hook
const useDebounce = (value: string, delay: number) => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
};

// Cached Supabase query wrapper
const cachedQuery = async (key: string, queryFn: () => Promise<any>) => {
  const cached = supabaseCache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }

  const data = await queryFn();
  supabaseCache.set(key, { data, timestamp: Date.now() });
  return data;
};

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
  const debouncedSearchTerm = useDebounce(searchTerm, 300);
  const debouncedInviterSearchTerm = useDebounce(inviterSearchTerm, 300);
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

  // Form states remain the same...

  const hasAccess = useCallback(() => {
    return isAdmin?.() || isPastor?.();
  }, [isAdmin, isPastor]);

  // Helper functions remain the same...

  // Optimized batch sync function
  const syncEventToCloud = async (eventId: string) => {
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const event = events.find(e => e.id === eventId);
      if (!event) throw new Error('Event not found');

      // Get all attendees for this event with optimized query
      const eventAttendees = getEventAttendees(eventId);
      
      if (eventAttendees.length === 0) {
        setError('No attendance data to sync. Please add attendees first.');
        setTimeout(() => setError(null), 3000);
        return;
      }

      // Prepare attendance data for syncing
      const attendanceRecords = eventAttendees.map(attendee => ({
        event_id: eventId,
        members_id: attendee.members_id,
        first_time: attendee.first_time || false,
        invited_by_id: attendee.invited_by_id || null,
        attendance_status: attendee.attendance_status || 'absent',
        attended_at: attendee.attended_at || null,
        notes: attendee.notes || null,
        updated_at: new Date().toISOString()
      }));

      // 1. Use a single batch operation instead of multiple smaller ones
      const { error: batchError } = await supabase.rpc('bulk_upsert_event_attendees', {
        attendance_records: attendanceRecords
      });

      if (batchError) {
        console.error('Batch sync error:', batchError);
        throw new Error(`Failed to sync attendance data`);
      }

      // 2. Update event timestamp in cloud to mark as synced
      const { error: updateError } = await supabase
        .from('events')
        .update({ 
          updated_at: new Date().toISOString()
        })
        .eq('id', eventId);

      if (updateError) throw updateError;

      // 3. Update local state
      setEvents(prev => prev.map(ev => 
        ev.id === eventId 
          ? { ...ev, updated_at: new Date().toISOString() }
          : ev
      ));

      // 4. Invalidate cache for this event
      supabaseCache.delete(`event_attendees_${eventId}`);
      
      setSuccess(`Successfully synced ${eventAttendees.length} attendance records for "${event.name}" to cloud!`);
      setTimeout(() => setSuccess(null), 5000);
      
      // Close modal after a delay to show success message
      setTimeout(() => setShowSyncModal(null), 2000);
      
    } catch (error: any) {
      console.error('Error syncing event to cloud:', error);
      setError(`Failed to sync: ${error.message || 'Please try again.'}`);
      setTimeout(() => setError(null), 5000);
    } finally {
      setLoading(false);
    }
  };

  // Optimized data fetching with caching
  const fetchEvents = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Use cached query with specific fields to reduce data transfer
      const data = await cachedQuery('events', () => 
        supabase
          .from('events')
          .select('id, name, topic, event_date, event_time, location, is_whole_church, is_completed, completed_at, pamphlet_url, updated_at, target_groups, target_departments, created_at')
          .order('event_date', { ascending: false })
          .limit(50) // Limit to 50 most recent events
      );

      if (data.error) throw data.error;

      const eventsWithDefaults = (data.data || []).map((event: any) => ({
        ...event,
        is_whole_church: event.is_whole_church ?? true,
        target_groups: event.target_groups ?? [],
        target_departments: event.target_departments ?? [],
        is_completed: event.is_completed ?? false,
        completed_at: event.completed_at ?? null,
        pamphlet_url: event.pamphlet_url ?? null,
        created_at: event.created_at ?? null,
        updated_at: event.updated_at ?? null
      }));

      setEvents(eventsWithDefaults as Event[]);
      
      // Only load attendees for first few events initially (performance optimization)
      if (eventsWithDefaults.length > 0) {
        const eventsToLoad = eventsWithDefaults.slice(0, 3);
        const attendeePromises = eventsToLoad.map((event: Event) => 
          fetchEventAttendees(event.id)
        );
        await Promise.all(attendeePromises);
      }
      
    } catch (error: any) {
      console.error('Error fetching events:', error);
      setError(error.message || 'Failed to load events.');
    } finally {
      setLoading(false);
    }
  }, []);

  // Optimized fetchEventAttendees with caching
  const fetchEventAttendees = useCallback(async (eventId: string) => {
    try {
      // Check cache first
      const cacheKey = `event_attendees_${eventId}`;
      const cached = supabaseCache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        setAttendees(prev => {
          const filtered = prev.filter(attendee => attendee.event_id !== eventId);
          return [...filtered, ...cached.data];
        });
        return cached.data;
      }

      // Use a more efficient query with specific fields
      const { data: attendeesData, error: attendeesError } = await supabase
        .from('event_attendees')
        .select('id, event_id, members_id, first_time, invited_by_id, attendance_status, attended_at, notes')
        .eq('event_id', eventId)
        .order('attended_at', { ascending: false })
        .limit(500); // Limit to 500 attendees per event

      if (attendeesError) throw attendeesError;

      if (!attendeesData || attendeesData.length === 0) {
        const attendeesWithDefaults: EventAttendee[] = [];
        supabaseCache.set(cacheKey, { data: attendeesWithDefaults, timestamp: Date.now() });
        setAttendees(prev => {
          const filtered = prev.filter(attendee => attendee.event_id !== eventId);
          return [...filtered, ...attendeesWithDefaults];
        });
        return [];
      }

      // Fetch all members in a single batch query
      const memberIds = attendeesData.map(a => a.members_id);
      const uniqueMemberIds = [...new Set(memberIds)];
      
      const { data: membersData, error: membersError } = await supabase
        .from('members')
        .select('id, name, surname, residence, phone, status, cell_group_id, ministry_group_id')
        .in('id', uniqueMemberIds);

      if (membersError) throw membersError;

      // Create Maps for O(1) lookups
      const membersMap = new Map();
      membersData?.forEach(member => {
        membersMap.set(member.id, member);
      });

      // Process invitees if any
      const inviterIds = attendeesData
        .map(a => a.invited_by_id)
        .filter(id => id) as string[];
      
      const invitersMap = new Map();
      if (inviterIds.length > 0) {
        const { data: invitersData } = await supabase
          .from('members')
          .select('id, name, surname')
          .in('id', inviterIds);
        
        invitersData?.forEach(inviter => {
          invitersMap.set(inviter.id, inviter);
        });
      }

      const attendeesWithMembers = attendeesData.map((attendee: any) => {
        const member = membersMap.get(attendee.members_id);
        const invited_by_member = attendee.invited_by_id ? 
          invitersMap.get(attendee.invited_by_id) : null;

        if (!member) return null;

        return {
          ...attendee,
          attendance_status: attendee.attendance_status || 'present',
          members: {
            ...member,
            cell_groups: null,
            ministry_groups: null,
            department_ids: []
          },
          invited_by_member
        };
      });

      const validAttendees = attendeesWithMembers.filter(
        (attendee): attendee is EventAttendee => attendee !== null
      );

      // Cache the result
      supabaseCache.set(cacheKey, { data: validAttendees, timestamp: Date.now() });

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

  // Optimized fetchMembers with caching
  const fetchMembers = useCallback(async () => {
    try {
      setError(null);
      
      // Check cache first
      const cached = supabaseCache.get('members');
      if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        setMembers(cached.data);
        return;
      }
      
      const { data: membersData, error: membersError } = await supabase
        .from('members')
        .select('id, name, surname, residence, phone, cell_group_id, ministry_group_id, status')
        .order('name')
        .limit(500); // Limit to 500 members for performance

      if (membersError) throw membersError;

      const { data: deptMembersData, error: deptError } = await supabase
        .from('department_members')
        .select('member_id, departments (id, name)')
        .limit(1000);

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
        cell_groups: null,
        ministry_groups: null
      }));

      // Cache the result
      supabaseCache.set('members', { data: membersWithDepartments, timestamp: Date.now() });
      setMembers(membersWithDepartments);
    } catch (error: any) {
      console.error('Error fetching members:', error);
      setError(error.message || 'Failed to load members.');
    }
  }, []);

  // Optimized fetchCellGroups with caching
  const fetchCellGroups = useCallback(async () => {
    try {
      // Check cache first
      const cached = supabaseCache.get('cellGroups');
      if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        setCellGroups(cached.data);
        return;
      }
      
      const { data, error } = await supabase
        .from('cell_groups')
        .select('id, name')
        .order('name')
        .limit(100);

      if (error) throw error;
      
      // Cache the result
      supabaseCache.set('cellGroups', { data: data || [], timestamp: Date.now() });
      setCellGroups(data || []);
    } catch (error: any) {
      console.error('Error fetching cell groups:', error);
    }
  }, []);

  // Optimized fetchMinistryGroups with caching
  const fetchMinistryGroups = useCallback(async () => {
    try {
      // Check cache first
      const cached = supabaseCache.get('ministryGroups');
      if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        setMinistryGroups(cached.data);
        return;
      }
      
      const { data, error } = await supabase
        .from('ministry_groups')
        .select('id, name')
        .order('name')
        .limit(100);

      if (error) throw error;
      
      // Cache the result
      supabaseCache.set('ministryGroups', { data: data || [], timestamp: Date.now() });
      setMinistryGroups(data || []);
    } catch (error: any) {
      console.error('Error fetching ministry groups:', error);
    }
  }, []);

  // Optimized fetchDepartments with caching
  const fetchDepartments = useCallback(async () => {
    try {
      // Check cache first
      const cached = supabaseCache.get('departments');
      if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        setDepartments(cached.data);
        return;
      }
      
      const { data, error } = await supabase
        .from('departments')
        .select('id, name')
        .order('name')
        .limit(100);

      if (error) throw error;
      
      // Cache the result
      supabaseCache.set('departments', { data: data || [], timestamp: Date.now() });
      setDepartments(data || []);
    } catch (error: any) {
      console.error('Error fetching departments:', error);
    }
  }, []);

  // Optimized fetchSermons with caching
  const fetchSermons = useCallback(async () => {
    try {
      // Check cache first
      const cached = supabaseCache.get('sermons');
      if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        setSermons(cached.data);
        return;
      }
      
      const { data, error } = await supabase
        .from('sermons')
        .select('id, title, summary, pastor_name, sermon_date, event_id, video_url, document_url, created_at, updated_at, events (name, topic)')
        .order('sermon_date', { ascending: false })
        .limit(50); // Limit to 50 most recent sermons

      if (error) throw error;
      
      // Cache the result
      supabaseCache.set('sermons', { data: data || [], timestamp: Date.now() });
      setSermons(data || []);
    } catch (error: any) {
      console.error('Error fetching sermons:', error);
    }
  }, []);

  // Optimized saveAttendanceWithChunking
  const saveAttendanceWithChunking = async (eventId: string) => {
    setSavingProgress({ current: 0, total: Object.keys(bulkAttendance).length, isSaving: true });
    setError(null);
    setSuccess(null);

    const chunkSize = 200; // Increased chunk size for better performance
    const memberIds = Object.keys(bulkAttendance);
    let successCount = 0;
    let failCount = 0;

    try {
      // Prepare all records first for better performance
      const allRecords = [];
      for (const memberId of memberIds) {
        const status = bulkAttendance[memberId];
        const notes = attendanceNotesRef.current[memberId] || '';
        
        allRecords.push({
          event_id: eventId,
          members_id: memberId,
          first_time: false,
          invited_by_id: null,
          attendance_status: status,
          attended_at: status === 'present' ? new Date().toISOString() : null,
          notes: notes || null,
          updated_at: new Date().toISOString()
        });
      }

      // Use a single RPC call for bulk insert instead of multiple chunks
      const { data, error } = await supabase.rpc('bulk_upsert_event_attendees', {
        attendance_records: allRecords
      });

      if (error) throw error;

      successCount = allRecords.length;

      // Update event timestamp
      await supabase
        .from('events')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', eventId);

      // Invalidate cache for this event
      supabaseCache.delete(`event_attendees_${eventId}`);
      
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

  // Memoized filtered members to prevent unnecessary re-renders
  const filteredMembers = useMemo(() => {
    if (!debouncedSearchTerm) return members;
    
    const searchLower = debouncedSearchTerm.toLowerCase();
    return members.filter(member => (
      member.name.toLowerCase().includes(searchLower) ||
      member.surname.toLowerCase().includes(searchLower) ||
      `${member.name} ${member.surname}`.toLowerCase().includes(searchLower) ||
      member.residence.toLowerCase().includes(searchLower) ||
      member.phone?.toLowerCase().includes(searchLower)
    ));
  }, [members, debouncedSearchTerm]);

  // Memoized filtered inviters to prevent unnecessary re-renders
  const filteredInviters = useMemo(() => {
    if (!debouncedInviterSearchTerm) return members;
    
    const searchLower = debouncedInviterSearchTerm.toLowerCase();
    return members.filter(member => (
      member.name.toLowerCase().includes(searchLower) ||
      member.surname.toLowerCase().includes(searchLower) ||
      `${member.name} ${member.surname}`.toLowerCase().includes(searchLower) ||
      member.residence.toLowerCase().includes(searchLower) ||
      member.phone?.toLowerCase().includes(searchLower)
    ));
  }, [members, debouncedInviterSearchTerm]);

  // Invalidate all caches when data changes
  const invalidateCaches = () => {
    supabaseCache.clear();
  };

  // Initialize data with optimized loading
  useEffect(() => {
    if (user && !authLoading) {
      const initializeData = async () => {
        try {
          setLoading(true);
          // Load all data in parallel for better performance
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

  // Rest of the component remains the same...

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Component JSX remains the same... */}
      </div>
    </div>
  );
};

export default Events;
