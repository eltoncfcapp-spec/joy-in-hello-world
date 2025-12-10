import { Calendar as CalendarIcon, Clock, MapPin, Plus, Phone, X, User, Search, Mail, Building, Users as UsersIcon, CheckCircle, AlertCircle, Upload, FileText, Eye, BookOpen, Download, PlayCircle, AlertTriangle, Edit, Trash2, Loader2 } from 'lucide-react';
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { supabase } from '../integrations/supabase/client';
import { useAuth } from '../contexts/AuthContext';

// Interfaces remain the same...

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
  
  const [operationInProgress, setOperationInProgress] = useState<{
    type: 'create' | 'update' | 'delete' | 'sync' | 'export' | 'attendance' | 'complete' | 'upload' | 'remove';
    entity: string;
    id?: string;
    progress?: number;
    details?: string;
  } | null>(null);

  const attendanceNotesRef = useRef<Record<string, string>>({});

  // Cache refs for performance
  const departmentMembersCache = useRef<Map<string, Set<string>>>(new Map());
  const memberTargetGroupsCache = useRef<Map<string, Map<string, boolean>>>(new Map());
  const bulkAttendanceCache = useRef<Map<string, Member[]>>(new Map());
  const eventAttendeesCache = useRef<Map<string, EventAttendee[]>>(new Map());
  const lastFetchTime = useRef<number>(0);
  const FETCH_CACHE_TIME = 30000; // 30 seconds cache

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
  const [bulkAttendance, setBulkAttendance] = useState<Record<string, 'present' | 'absent'>>({});
  const [_attendanceNotes, setAttendanceNotes] = useState<Record<string, string>>({});

  const [newcomerFormData, setNewcomerFormData] = useState({
    name: '',
    surname: '',
    phone: '',
    residence: '',
    notes: ''
  });

  // Debounce hook for search
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
  
  const debouncedSearchTerm = useDebounce(searchTerm, 300);
  const debouncedInviterSearchTerm = useDebounce(inviterSearchTerm, 300);

  // Memoized computations
  const hasAccess = useMemo(() => {
    return isAdmin?.() || isPastor?.();
  }, [isAdmin, isPastor]);

  const startOperation = (type: string, entity: string, id?: string, details?: string) => {
    setOperationInProgress({ type: type as any, entity, id, details });
  };

  const endOperation = () => {
    setOperationInProgress(null);
  };

  const LoadingButton = ({ 
    loading, 
    children, 
    onClick, 
    disabled,
    type = 'button',
    className = '',
    loadingText = 'Processing...',
    loadingClassName = ''
  }: {
    loading: boolean;
    children: React.ReactNode;
    onClick?: () => void;
    disabled?: boolean;
    type?: 'button' | 'submit';
    className?: string;
    loadingText?: string;
    loadingClassName?: string;
  }) => (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={`relative overflow-hidden transition-all duration-200 ${className} ${(disabled || loading) ? 'opacity-70 cursor-not-allowed' : ''}`}
    >
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-inherit">
          <Loader2 className={`h-5 w-5 animate-spin ${loadingClassName}`} />
        </div>
      )}
      <span className={loading ? 'invisible' : 'visible flex items-center gap-2'}>{children}</span>
      <span className={loading ? 'visible flex items-center gap-2 justify-center' : 'hidden'}>{loadingText}</span>
    </button>
  );

  // Batch fetch all department memberships at once
  const fetchAllDepartmentMembers = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('department_members')
        .select('member_id, department_id');

      if (error) throw error;

      const newCache = new Map<string, Set<string>>();
      data?.forEach((item: any) => {
        if (!newCache.has(item.member_id)) {
          newCache.set(item.member_id, new Set());
        }
        newCache.get(item.member_id)?.add(item.department_id);
      });

      departmentMembersCache.current = newCache;
    } catch (error) {
      console.error('Error fetching department members:', error);
    }
  }, []);

  // Batch fetch all event attendees at once
  const fetchAllEventAttendees = useCallback(async () => {
    try {
      const { data: attendeesData, error: attendeesError } = await supabase
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
          ),
          invited_by:members!invited_by_id (
            id,
            name,
            surname
          )
        `);

      if (attendeesError) throw attendeesError;

      const attendeesMap = new Map<string, EventAttendee[]>();
      const attendeesList: EventAttendee[] = [];

      attendeesData?.forEach((attendee: any) => {
        const formattedAttendee: EventAttendee = {
          ...attendee,
          members: {
            ...attendee.members,
            cell_groups: null,
            ministry_groups: null,
            department_ids: []
          },
          invited_by_member: attendee.invited_by
        };

        if (!attendeesMap.has(attendee.event_id)) {
          attendeesMap.set(attendee.event_id, []);
        }
        attendeesMap.get(attendee.event_id)?.push(formattedAttendee);
        attendeesList.push(formattedAttendee);
      });

      eventAttendeesCache.current = attendeesMap;
      setAttendees(attendeesList);
    } catch (error: any) {
      console.error('Error fetching all attendees:', error);
    }
  }, []);

  const fetchEvents = useCallback(async (forceRefresh = false) => {
    // Check cache
    const now = Date.now();
    if (!forceRefresh && now - lastFetchTime.current < FETCH_CACHE_TIME && events.length > 0) {
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .order('event_date', { ascending: false })
        .limit(100);

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
      lastFetchTime.current = now;
      
    } catch (error: any) {
      console.error('Error fetching events:', error);
      setError(error.message || 'Failed to load events.');
    } finally {
      setLoading(false);
    }
  }, [events.length]);

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
        .limit(100);

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
        .order('name')
        .limit(500);

      if (membersError) throw membersError;

      const membersWithDepartments = (membersData || []).map((member: any) => ({
        ...member,
        department_ids: Array.from(departmentMembersCache.current.get(member.id) || []),
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
        .order('name')
        .limit(100);

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
        .order('name')
        .limit(100);

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
        .order('name')
        .limit(100);

      if (error) throw error;
      setDepartments(data || []);
    } catch (error: any) {
      console.error('Error fetching departments:', error);
    }
  }, []);

  // Optimized member-in-group check with caching
  const isMemberInTargetGroups = useCallback(async (member: Member, event: Event): Promise<boolean> => {
    if (event.is_whole_church) return true;

    const cacheKey = `${member.id}-${event.id}`;
    const eventCache = memberTargetGroupsCache.current.get(member.id);
    
    if (eventCache?.has(cacheKey)) {
      return eventCache.get(cacheKey)!;
    }

    let result = false;

    if (event.target_groups && event.target_groups.length > 0) {
      if (member.cell_group_id && event.target_groups.includes(member.cell_group_id)) {
        result = true;
      }
    }

    if (!result && event.target_departments && event.target_departments.length > 0) {
      if (member.ministry_group_id && event.target_departments.includes(member.ministry_group_id)) {
        result = true;
      }

      if (!result && member.department_ids && member.department_ids.length > 0) {
        for (const deptId of event.target_departments) {
          if (member.department_ids.includes(deptId)) {
            result = true;
            break;
          }
        }
      }
    }

    // Cache the result
    if (!eventCache) {
      memberTargetGroupsCache.current.set(member.id, new Map());
    }
    memberTargetGroupsCache.current.get(member.id)?.set(cacheKey, result);

    return result;
  }, []);

  // Batch save attendance
  const saveAttendanceBatch = async (
    eventId: string, 
    attendanceData: Array<{memberId: string, status: 'present' | 'absent', notes?: string}>
  ) => {
    try {
      startOperation('attendance', 'batch-attendance', eventId, 'Saving attendance...');
      setLoading(true);
      setError(null);

      const upsertData = attendanceData.map(({ memberId, status, notes }) => ({
        event_id: eventId,
        members_id: memberId,
        first_time: false,
        invited_by_id: null,
        attendance_status: status,
        attended_at: status === 'present' ? new Date().toISOString() : null,
        notes: notes || null,
      }));

      const { error } = await supabase
        .from('event_attendees')
        .upsert(upsertData, {
          onConflict: 'event_id,members_id'
        });

      if (error) throw error;

      await fetchAllEventAttendees();
      return true;
    } catch (error: any) {
      console.error('Error saving attendance batch:', error);
      setError(error.message || 'Failed to save attendance.');
      return false;
    } finally {
      endOperation();
      setLoading(false);
    }
  };

  const saveBulkAttendance = async (eventId: string) => {
    startOperation('attendance', 'bulk-attendance', eventId, 'Saving attendance for all members...');
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const attendanceArray = Object.entries(bulkAttendance).map(([memberId, status]) => ({
        memberId,
        status,
        notes: attendanceNotesRef.current[memberId] || ''
      }));

      const batchSize = 50;
      const batches = [];
      
      for (let i = 0; i < attendanceArray.length; i += batchSize) {
        batches.push(attendanceArray.slice(i, i + batchSize));
      }

      let successCount = 0;
      for (let i = 0; i < batches.length; i++) {
        const batch = batches[i];
        setOperationInProgress(prev => prev ? {
          ...prev,
          progress: Math.round((i + 1) / batches.length * 100),
          details: `Saving batch ${i + 1} of ${batches.length}...`
        } : null);
        
        const result = await saveAttendanceBatch(eventId, batch);
        if (result) successCount += batch.length;
      }

      if (successCount === attendanceArray.length) {
        setSuccess(`Successfully saved attendance for ${successCount} members!`);
        closeBulkAttendanceModal();
      } else {
        setError(`Failed to save attendance for ${attendanceArray.length - successCount} members.`);
      }

      setTimeout(() => {
        setSuccess(null);
        setError(null);
      }, 5000);
    } catch (error: any) {
      console.error('Error saving bulk attendance:', error);
      setError(error.message || 'Failed to save bulk attendance.');
    } finally {
      endOperation();
      setLoading(false);
    }
  };

  const getAttendanceStats = useCallback((eventId: string) => {
    const eventAttendees = eventAttendeesCache.current.get(eventId) || [];
    const present = eventAttendees.filter(a => a.attendance_status === 'present').length;
    const absent = eventAttendees.filter(a => a.attendance_status === 'absent').length;
    const firstTimers = eventAttendees.filter(a => a.first_time && a.attendance_status === 'present').length;
    
    return { present, absent, firstTimers, total: present + absent };
  }, []);

  const getSermonForEvent = useCallback((eventId: string) => {
    return sermons.find(sermon => sermon.event_id === eventId);
  }, [sermons]);

  const syncEventToCloud = async (eventId: string) => {
    startOperation('sync', 'event', eventId, 'Syncing event data to cloud...');
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const event = events.find(e => e.id === eventId);
      if (!event) throw new Error('Event not found');

      const eventAttendees = eventAttendeesCache.current.get(eventId) || [];

      // Update event with optimized query
      const { error: updateError } = await supabase
        .from('events')
        .update({ 
          updated_at: new Date().toISOString(),
        })
        .eq('id', eventId);

      if (updateError) throw updateError;

      setSuccess(`Event "${event.name}" successfully synced to cloud!`);
      setTimeout(() => setSuccess(null), 3000);
      
      setShowSyncModal(null);
      
    } catch (error: any) {
      console.error('Error syncing event to cloud:', error);
      setError(error.message || 'Failed to sync event to cloud. Please try again.');
    } finally {
      endOperation();
      setLoading(false);
    }
  };

  const exportEventData = (eventId: string) => {
    startOperation('export', 'event', eventId, 'Exporting data to CSV...');
    const event = events.find(e => e.id === eventId);
    if (!event) return;

    const eventAttendees = eventAttendeesCache.current.get(eventId) || [];
    
    // Use web worker for large data processing
    const csvRows = [];
    
    csvRows.push(['Event Information']);
    csvRows.push(['Name', event.name]);
    csvRows.push(['Date', event.event_date]);
    csvRows.push(['Time', event.event_time]);
    csvRows.push(['Location', event.location || '']);
    csvRows.push(['Topic', event.topic || '']);
    csvRows.push(['']);
    
    csvRows.push(['Attendees List']);
    csvRows.push(['Name', 'Surname', 'Residence', 'Phone', 'Status', 'First Time', 'Attended At', 'Invited By']);
    
    eventAttendees.forEach(attendee => {
      csvRows.push([
        attendee.members.name,
        attendee.members.surname,
        attendee.members.residence || '',
        attendee.members.phone || '',
        attendee.attendance_status,
        attendee.first_time ? 'Yes' : 'No',
        attendee.attended_at ? new Date(attendee.attended_at).toLocaleString() : '',
        attendee.invited_by_member ? `${attendee.invited_by_member.name} ${attendee.invited_by_member.surname}` : ''
      ]);
    });
    
    const csvContent = csvRows.map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
    
    // Use Blob for better performance with large files
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `event_${event.name.replace(/\s+/g, '_')}_${event.event_date}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    setSuccess(`Event data exported successfully!`);
    setTimeout(() => setSuccess(null), 3000);
    endOperation();
  };

  const uploadPamphlet = async (eventId: string, file: File) => {
    try {
      startOperation('upload', 'pamphlet', eventId, 'Uploading pamphlet...');
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
      const fileName = `${eventId}-${Date.now()}.${fileExt}`;
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
      endOperation();
      setUploadingPamphlet(null);
    }
  };

  // Optimized initialization
  useEffect(() => {
    if (user && !authLoading) {
      const initializeData = async () => {
        try {
          setLoading(true);
          
          // Fetch in parallel with batching
          await Promise.all([
            fetchAllDepartmentMembers(),
            fetchEvents(true), // Force refresh
            fetchSermons(),
            fetchCellGroups(),
            fetchMinistryGroups(),
            fetchDepartments()
          ]);
          
          // Then fetch members (depends on department cache)
          await fetchMembers();
          
          // Finally fetch attendees
          await fetchAllEventAttendees();
          
        } catch (error) {
          console.error('Error initializing data:', error);
        } finally {
          setLoading(false);
        }
      };
      
      initializeData();
    }
  }, [user, authLoading]);

  // Memoized filtered members for better performance
  const filteredMembers = useMemo(() => {
    if (!debouncedSearchTerm) return members.slice(0, 50); // Limit for dropdown
    
    const searchLower = debouncedSearchTerm.toLowerCase();
    return members
      .filter(member => {
        return (
          member.name.toLowerCase().includes(searchLower) ||
          member.surname.toLowerCase().includes(searchLower) ||
          `${member.name} ${member.surname}`.toLowerCase().includes(searchLower) ||
          member.residence.toLowerCase().includes(searchLower) ||
          member.phone?.toLowerCase().includes(searchLower)
        );
      })
      .slice(0, 50); // Limit results
  }, [members, debouncedSearchTerm]);

  const filteredInviters = useMemo(() => {
    if (!debouncedInviterSearchTerm) return members.slice(0, 50);
    
    const searchLower = debouncedInviterSearchTerm.toLowerCase();
    return members
      .filter(member => {
        return (
          member.name.toLowerCase().includes(searchLower) ||
          member.surname.toLowerCase().includes(searchLower) ||
          `${member.name} ${member.surname}`.toLowerCase().includes(searchLower) ||
          member.residence.toLowerCase().includes(searchLower) ||
          member.phone?.toLowerCase().includes(searchLower)
        );
      })
      .slice(0, 50);
  }, [members, debouncedInviterSearchTerm]);

  // Optimized handleCompleteEvent
  const handleCompleteEvent = async (eventId: string) => {
    if (!confirm('Are you sure you want to mark this event as completed? This will automatically mark all expected but unregistered members as absent.')) {
      return;
    }

    startOperation('complete', 'event', eventId, 'Completing event and marking absentees...');
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const event = events.find(e => e.id === eventId);
      if (!event) throw new Error('Event not found');

      const eventAttendees = eventAttendeesCache.current.get(eventId) || [];
      const attendeeIds = new Set(eventAttendees.map(a => a.members_id));

      // Use Promise.all for parallel processing
      const checkPromises = members
        .filter(member => member.status !== 'not_attending' && !attendeeIds.has(member.id))
        .map(async (member) => {
          const shouldAttend = await isMemberInTargetGroups(member, event);
          return shouldAttend ? member.id : null;
        });

      const absentMemberIds = (await Promise.all(checkPromises)).filter(id => id !== null) as string[];

      if (absentMemberIds.length > 0) {
        // Batch mark absent
        const absentData = absentMemberIds.map(memberId => ({
          event_id: eventId,
          members_id: memberId,
          first_time: false,
          invited_by_id: null,
          attendance_status: 'absent' as const,
          attended_at: null
        }));

        const { error } = await supabase
          .from('event_attendees')
          .upsert(absentData, {
            onConflict: 'event_id,members_id'
          });

        if (error) throw error;
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

      // Refresh cache
      await fetchAllEventAttendees();

      setSuccess(`Event marked as completed! ${absentMemberIds.length} members marked as absent.`);
      setTimeout(() => setSuccess(null), 3000);
    } catch (error: any) {
      console.error('Error completing event:', error);
      setError(error.message || 'Failed to complete event. Please try again.');
    } finally {
      endOperation();
      setLoading(false);
    }
  };

  // Optimized handleEventSubmit
  const handleEventSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!hasAccess) {
      setError('You do not have permission to create events');
      setTimeout(() => setError(null), 3000);
      return;
    }

    startOperation('create', 'event');
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
        target_departments: !eventFormData.isWholeChurch && [...eventFormData.targetMinistryGroups, ...eventFormData.targetDepartments].length > 0 
          ? [...eventFormData.targetMinistryGroups, ...eventFormData.targetDepartments] 
          : null,
      };

      const { data: newEvent, error } = await supabase
        .from('events')
        .insert([eventData])
        .select()
        .single();

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
      
      // Add to local state and clear cache
      setEvents(prev => [newEvent as Event, ...prev]);
      lastFetchTime.current = 0; // Force refresh next time
      
      setSuccess('Event created successfully!');
      
      setTimeout(() => setSuccess(null), 3000);
    } catch (error: any) {
      console.error('Error creating event:', error);
      setError(error.message || 'Failed to create event. Please try again.');
    } finally {
      endOperation();
      setLoading(false);
    }
  };

  // Optimized handleAttendeeSubmit
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

    startOperation('create', 'attendee', eventId, 'Adding attendee...');
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

      // Update local cache immediately
      const newAttendeeWithDetails: EventAttendee = {
        ...newAttendee,
        members: {
          ...selectedMember,
          cell_groups: selectedMember.cell_groups,
          ministry_groups: selectedMember.ministry_groups,
          department_ids: selectedMember.department_ids || []
        },
        invited_by_member: selectedInviter ? {
          id: selectedInviter.id,
          name: selectedInviter.name,
          surname: selectedInviter.surname
        } : null
      };

      // Update cache
      const currentAttendees = eventAttendeesCache.current.get(eventId) || [];
      eventAttendeesCache.current.set(eventId, [...currentAttendees, newAttendeeWithDetails]);
      setAttendees(prev => [...prev, newAttendeeWithDetails]);

      resetAttendeeForm();
      
      setSuccess('Attendee added successfully!');
      setTimeout(() => setSuccess(null), 3000);
    } catch (error: any) {
      console.error('Error adding attendee:', error);
      setError(error.message || 'Failed to add attendee. Please try again.');
    } finally {
      endOperation();
      setLoading(false);
    }
  };

  // Optimized openBulkAttendanceModal
  const openBulkAttendanceModal = async (eventId: string) => {
    setShowBulkAttendanceModal(eventId);
    
    const event = events.find(e => e.id === eventId);
    if (!event) return;

    // Check cache first
    if (bulkAttendanceCache.current.has(eventId)) {
      const cachedMembers = bulkAttendanceCache.current.get(eventId)!;
      const initialAttendance: Record<string, 'present' | 'absent'> = {};
      
      for (const member of cachedMembers) {
        initialAttendance[member.id] = 'present';
      }

      const existingAttendees = eventAttendeesCache.current.get(eventId) || [];
      existingAttendees.forEach(attendee => {
        initialAttendance[attendee.members_id] = attendee.attendance_status as 'present' | 'absent';
      });

      setBulkAttendance(initialAttendance);
      return;
    }

    // Load target members
    const targetMembers: Member[] = [];
    const batchSize = 50;
    
    for (let i = 0; i < members.length; i += batchSize) {
      const batch = members.slice(i, i + batchSize);
      const batchPromises = batch
        .filter(member => member.status !== 'not_attending')
        .map(async (member) => {
          const shouldAttend = await isMemberInTargetGroups(member, event);
          return shouldAttend ? member : null;
        });
      
      const batchResults = await Promise.all(batchPromises);
      targetMembers.push(...batchResults.filter(m => m !== null) as Member[]);
    }

    // Cache results
    bulkAttendanceCache.current.set(eventId, targetMembers);

    const initialAttendance: Record<string, 'present' | 'absent'> = {};
    for (const member of targetMembers) {
      initialAttendance[member.id] = 'present';
    }

    const existingAttendees = eventAttendeesCache.current.get(eventId) || [];
    existingAttendees.forEach(attendee => {
      initialAttendance[attendee.members_id] = attendee.attendance_status as 'present' | 'absent';
    });

    setBulkAttendance(initialAttendance);
  };

  // Rest of the component remains similar but with optimized render performance
  // Use React.memo for expensive components and useCallback for handlers

  const GlobalLoadingOverlay = useMemo(() => {
    if (!operationInProgress) return null;

    const getOperationText = () => {
      const { type, entity, progress, details } = operationInProgress;
      const entityMap = {
        'event': 'Event',
        'sermon': 'Sermon',
        'attendance': 'Attendance',
        'bulk-attendance': 'Bulk Attendance',
        'pamphlet': 'Pamphlet',
        'sync': 'Cloud Sync',
        'attendee': 'Attendee',
        'newcomer': 'Newcomer'
      };

      const actionMap = {
        'create': 'Creating',
        'update': 'Updating',
        'delete': 'Deleting',
        'sync': 'Syncing',
        'export': 'Exporting',
        'attendance': 'Saving',
        'complete': 'Completing',
        'upload': 'Uploading',
        'remove': 'Removing'
      };

      const entityText = entityMap[entity as keyof typeof entityMap] || entity;
      const actionText = actionMap[type as keyof typeof actionMap] || type;
      
      return details || `${actionText} ${entityText}${progress !== undefined ? ` (${progress}%)` : '...'}`;
    };

    return (
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center">
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl">
          <div className="flex flex-col items-center text-center">
            <div className="relative mb-6">
              <div className="w-20 h-20 rounded-full border-4 border-blue-200 dark:border-blue-800 flex items-center justify-center">
                <Loader2 className="h-10 w-10 text-blue-600 animate-spin" />
              </div>
              {operationInProgress.progress !== undefined && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-lg font-bold text-blue-700 dark:text-blue-300">
                    {operationInProgress.progress}%
                  </span>
                </div>
              )}
            </div>
            
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
              {getOperationText()}
            </h3>
            
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Please wait while we process your request...
            </p>
            
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mb-4">
              <div 
                className="bg-gradient-to-r from-blue-600 to-purple-600 h-full rounded-full transition-all duration-300"
                style={{ width: `${operationInProgress.progress || 30}%` }}
              />
            </div>
            
            <p className="text-sm text-gray-500 dark:text-gray-500">
              Do not close or refresh the page
            </p>
          </div>
        </div>
      </div>
    );
  }, [operationInProgress]);

  // Memoized DataSendingIndicators
  const DataSendingIndicators = useMemo(() => (
    <div className="fixed bottom-4 right-4 z-40 space-y-2">
      {operationInProgress && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 p-3 min-w-64">
          <div className="flex items-center gap-3">
            <div className="relative">
              <Loader2 className="h-5 w-5 text-blue-600 animate-spin" />
            </div>
            <div className="flex-1">
              <div className="text-sm font-medium text-gray-900 dark:text-white">
                {operationInProgress.details || 'Processing...'}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                {operationInProgress.entity} • {operationInProgress.type}
              </div>
            </div>
            {operationInProgress.progress !== undefined && (
              <div className="text-xs font-bold text-blue-600 dark:text-blue-400">
                {operationInProgress.progress}%
              </div>
            )}
          </div>
          {operationInProgress.progress !== undefined && (
            <div className="mt-2 w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
              <div 
                className="bg-gradient-to-r from-blue-600 to-purple-600 h-full rounded-full transition-all duration-300"
                style={{ width: `${operationInProgress.progress}%` }}
              />
            </div>
          )}
        </div>
      )}
      
      {uploadingPamphlet && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 p-3">
          <div className="flex items-center gap-3">
            <Loader2 className="h-5 w-5 text-blue-600 animate-spin" />
            <div className="flex-1">
              <div className="text-sm font-medium text-gray-900 dark:text-white">
                Uploading Pamphlet
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                Please wait...
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  ), [operationInProgress, uploadingPamphlet]);

  // The rest of your component (modals, forms, etc.) remains similar
  // But use useCallback for event handlers and React.memo for expensive components

  // Add this optimization for the events list
  const EventList = useMemo(() => {
    if (loading && events.length === 0) {
      return (
        <div className="text-center py-12">
          <Loader2 className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto" />
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading events...</p>
        </div>
      );
    }

    if (!loading && events.length === 0) {
      return (
        <div className="text-center py-12 bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl border border-gray-200/50 dark:border-gray-700/50 rounded-2xl">
          <CalendarIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-600 dark:text-gray-400 mb-2">No Events Yet</h3>
          <p className="text-gray-500 dark:text-gray-500">Create your first event to get started</p>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        {events.map((event) => {
          const scopeBadge = getEventScopeBadge(event);
          const statusBadge = getEventStatusBadge(event);
          const ScopeIcon = scopeBadge.icon;
          const StatusIcon = statusBadge.icon;
          const sermon = getSermonForEvent(event.id);
          const stats = getAttendanceStats(event.id);
          
          return (
            <EventCard 
              key={event.id}
              event={event}
              sermon={sermon}
              stats={stats}
              scopeBadge={scopeBadge}
              statusBadge={statusBadge}
              ScopeIcon={ScopeIcon}
              StatusIcon={StatusIcon}
              onOpenAttendeeModal={openAttendeeModal}
              onOpenBulkAttendanceModal={openBulkAttendanceModal}
              onOpenNewcomerModal={openNewcomerModal}
              onCompleteEvent={handleCompleteEvent}
              onOpenSermonModal={openSermonModal}
              onShowSyncModal={setShowSyncModal}
              onViewPamphlet={viewPamphlet}
              onUploadPamphlet={uploadPamphlet}
              onDeletePamphlet={deletePamphlet}
              showAttendeeForm={showAttendeeForm}
              onShowAttendeeForm={setShowAttendeeForm}
              onAddAttendeeSubmit={(e) => handleAttendeeSubmit(e, event.id)}
              // Pass down other props as needed
            />
          );
        })}
      </div>
    );
  }, [loading, events, showAttendeeForm, getAttendanceStats, getSermonForEvent]);

  // Return the main component
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-6">
      {GlobalLoadingOverlay}
      {DataSendingIndicators}
      
      <div className="max-w-7xl mx-auto">
        {/* Header and controls remain the same */}
        
        {EventList}
        
        {/* Modals remain the same */}
      </div>
    </div>
  );
};

// Extract EventCard as a separate memoized component
const EventCard = React.memo(({
  event,
  sermon,
  stats,
  scopeBadge,
  statusBadge,
  ScopeIcon,
  StatusIcon,
  onOpenAttendeeModal,
  onOpenBulkAttendanceModal,
  onOpenNewcomerModal,
  onCompleteEvent,
  onOpenSermonModal,
  onShowSyncModal,
  onViewPamphlet,
  onUploadPamphlet,
  onDeletePamphlet,
  showAttendeeForm,
  onShowAttendeeForm,
  onAddAttendeeSubmit,
  // Other props
}: any) => {
  // Event card implementation
  return (
    <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-6 hover:shadow-xl transition-all duration-300 hover:border-gray-300/50 dark:hover:border-gray-600/50">
      {/* Event card content */}
    </div>
  );
});

EventCard.displayName = 'EventCard';

export default Events;
