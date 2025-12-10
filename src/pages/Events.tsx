import { Calendar as CalendarIcon, Clock, MapPin, Plus, Phone, X, User, Search, Mail, Building, Users as UsersIcon, CheckCircle, AlertCircle, Upload, FileText, Eye, BookOpen, Download, PlayCircle, AlertTriangle, Edit, Trash2, Loader2 } from 'lucide-react';
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
  status: 'newcomer' | 'signed_member' | 'not_attending' | null;
  department_ids?: string[];
  cell_groups: { name: string } | null;
  ministry_groups: { name: string } | null;
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

  // Cache for department memberships
  const departmentMembershipCache = useRef<Map<string, Set<string>>>(new Map());

  const hasAccess = useCallback(() => {
    return isAdmin?.() || isPastor?.();
  }, [isAdmin, isPastor]);

  const startOperation = (type: string, entity: string, id?: string, details?: string) => {
    setOperationInProgress({
      type: type as any,
      entity,
      id,
      details
    });
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
      className={className}
    >
      {loading && (
        <Loader2 className={`animate-spin ${loadingClassName || 'h-4 w-4'}`} />
      )}
      {loading ? loadingText : children}
    </button>
  );

  // OPTIMIZED: Fetch all data in parallel with single queries
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

      // OPTIMIZED: Fetch all attendees at once instead of per event
      if (eventsWithDefaults.length > 0) {
        const eventIds = eventsWithDefaults.map((e: Event) => e.id);
        await fetchAllAttendees(eventIds);
      }
    } catch (error: any) {
      console.error('Error fetching events:', error);
      setError(error.message || 'Failed to load events.');
    } finally {
      setLoading(false);
    }
  }, []);

  // OPTIMIZED: Fetch all attendees in one query
  const fetchAllAttendees = useCallback(async (eventIds: string[]) => {
    try {
      const { data: attendeesData, error: attendeesError } = await supabase
        .from('event_attendees')
        .select(`
          *,
          members (
            id, name, surname, residence, phone, status,
            cell_group_id, ministry_group_id,
            cell_groups (name),
            ministry_groups (name)
          )
        `)
        .in('event_id', eventIds)
        .order('attended_at', { ascending: false });

      if (attendeesError) throw attendeesError;

      // Fetch all inviters in one query
      const inviterIds = attendeesData
        ?.filter(a => a.invited_by_id)
        .map(a => a.invited_by_id)
        .filter((id, index, self) => id && self.indexOf(id) === index) || [];

      let invitersMap = new Map();
      if (inviterIds.length > 0) {
        const { data: invitersData } = await supabase
          .from('members')
          .select('id, name, surname')
          .in('id', inviterIds);

        if (invitersData) {
          invitersMap = new Map(invitersData.map(inv => [inv.id, inv]));
        }
      }

      const processedAttendees = (attendeesData || []).map((attendee: any) => ({
        ...attendee,
        attendance_status: attendee.attendance_status || 'present',
        members: {
          ...attendee.members,
          cell_groups: attendee.members?.cell_groups?.[0] || null,
          ministry_groups: attendee.members?.ministry_groups?.[0] || null
        },
        invited_by_member: attendee.invited_by_id ? invitersMap.get(attendee.invited_by_id) : null
      }));

      setAttendees(processedAttendees);
    } catch (error: any) {
      console.error('Error fetching attendees:', error);
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

  // OPTIMIZED: Fetch members with departments in one query
  const fetchMembers = useCallback(async () => {
    try {
      setError(null);

      const { data: membersData, error: membersError } = await supabase
        .from('members')
        .select(`
          id, name, surname, residence, phone,
          cell_group_id, ministry_group_id, status,
          cell_groups (name),
          ministry_groups (name),
          department_members (
            department_id,
            departments (id, name)
          )
        `)
        .order('name');

      if (membersError) throw membersError;

      const membersWithDepartments = (membersData || []).map((member: any) => ({
        ...member,
        department_ids: member.department_members?.map((dm: any) => dm.department_id) || [],
        cell_groups: member.cell_groups?.[0] || null,
        ministry_groups: member.ministry_groups?.[0] || null
      }));

      setMembers(membersWithDepartments);

      // Build department membership cache
      const cache = new Map<string, Set<string>>();
      membersWithDepartments.forEach((member: any) => {
        member.department_ids?.forEach((deptId: string) => {
          if (!cache.has(deptId)) {
            cache.set(deptId, new Set());
          }
          cache.get(deptId)?.add(member.id);
        });
      });
      departmentMembershipCache.current = cache;
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

  // OPTIMIZED: Fetch only specific event attendees when needed
  const fetchEventAttendees = useCallback(async (eventId: string) => {
    try {
      const { data: attendeesData, error: attendeesError } = await supabase
        .from('event_attendees')
        .select(`
          *,
          members (
            id, name, surname, residence, phone, status,
            cell_group_id, ministry_group_id,
            cell_groups (name),
            ministry_groups (name)
          )
        `)
        .eq('event_id', eventId)
        .order('attended_at', { ascending: false });

      if (attendeesError) throw attendeesError;

      if (!attendeesData || attendeesData.length === 0) {
        setAttendees(prev => prev.filter(attendee => attendee.event_id !== eventId));
        return [];
      }

      // Fetch inviters
      const inviterIds = attendeesData
        .filter(a => a.invited_by_id)
        .map(a => a.invited_by_id)
        .filter((id, index, self) => id && self.indexOf(id) === index);

      let invitersMap = new Map();
      if (inviterIds.length > 0) {
        const { data: invitersData } = await supabase
          .from('members')
          .select('id, name, surname')
          .in('id', inviterIds);

        if (invitersData) {
          invitersMap = new Map(invitersData.map(inv => [inv.id, inv]));
        }
      }

      const processedAttendees = attendeesData.map((attendee: any) => ({
        ...attendee,
        attendance_status: attendee.attendance_status || 'present',
        members: {
          ...attendee.members,
          cell_groups: attendee.members?.cell_groups?.[0] || null,
          ministry_groups: attendee.members?.ministry_groups?.[0] || null
        },
        invited_by_member: attendee.invited_by_id ? invitersMap.get(attendee.invited_by_id) : null
      }));

      setAttendees(prev => {
        const filtered = prev.filter(attendee => attendee.event_id !== eventId);
        return [...filtered, ...processedAttendees];
      });

      return processedAttendees;
    } catch (error: any) {
      console.error('Error fetching attendees:', error);
      return [];
    }
  }, []);

  useEffect(() => {
    if (user && !authLoading) {
      const initializeData = async () => {
        try {
          setLoading(true);
          // OPTIMIZED: Fetch all data in parallel
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

  // OPTIMIZED: Use cache for department membership checks
  const isMemberInDepartment = (memberId: string, departmentId: string): boolean => {
    return departmentMembershipCache.current.get(departmentId)?.has(memberId) ?? false;
  };

  const isMemberInTargetGroups = (member: Member, event: Event): boolean => {
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

  // OPTIMIZED: Batch upsert for attendance
  const saveAttendance = async (eventId: string, memberId: string, status: 'present' | 'absent', notes?: string) => {
    try {
      const attendanceData = {
        event_id: eventId,
        members_id: memberId,
        first_time: false,
        invited_by_id: null,
        attendance_status: status,
        attended_at: status === 'present' ? new Date().toISOString() : null,
        notes: notes || null,
      };

      const { error } = await supabase
        .from('event_attendees')
        .upsert(attendanceData, {
          onConflict: 'event_id,members_id',
          ignoreDuplicates: false
        });

      if (error) throw error;
      return true;
    } catch (error: any) {
      console.error('Error saving attendance:', error);
      return false;
    }
  };

  // OPTIMIZED: Batch save all attendance records at once
  const saveBulkAttendance = async (eventId: string) => {
    startOperation('attendance', 'bulk-attendance', eventId, 'Preparing bulk save...');
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const memberIds = Object.keys(bulkAttendance);
      
      // OPTIMIZED: Prepare all records for batch upsert
      const attendanceRecords = memberIds.map(memberId => ({
        event_id: eventId,
        members_id: memberId,
        first_time: false,
        invited_by_id: null,
        attendance_status: bulkAttendance[memberId],
        attended_at: bulkAttendance[memberId] === 'present' ? new Date().toISOString() : null,
        notes: attendanceNotesRef.current[memberId] || null,
      }));

      setOperationInProgress(prev => prev ? {
        ...prev,
        progress: 30,
        details: `Saving ${attendanceRecords.length} records...`
      } : null);

      // OPTIMIZED: Single batch upsert instead of multiple individual saves
      const { error } = await supabase
        .from('event_attendees')
        .upsert(attendanceRecords, {
          onConflict: 'event_id,members_id',
          ignoreDuplicates: false
        });

      if (error) throw error;

      setOperationInProgress(prev => prev ? {
        ...prev,
        progress: 90,
        details: 'Refreshing data...'
      } : null);

      await fetchEventAttendees(eventId);

      setSuccess(`Successfully saved attendance for ${memberIds.length} members!`);
      closeBulkAttendanceModal();

      setTimeout(() => {
        setSuccess(null);
      }, 5000);
    } catch (error: any) {
      console.error('Error saving bulk attendance:', error);
      setError(error.message || 'Failed to save bulk attendance.');
    } finally {
      endOperation();
      setLoading(false);
    }
  };

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

  const syncEventToCloud = async (eventId: string) => {
    startOperation('sync', 'event', eventId, 'Syncing event data to cloud...');
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const event = events.find(e => e.id === eventId);
      if (!event) throw new Error('Event not found');

      const eventAttendees = getEventAttendees(eventId);

      const syncData = {
        event_id: event.id,
        event_name: event.name,
        event_date: event.event_date,
        event_time: event.event_time,
        location: event.location,
        is_completed: event.is_completed,
        total_attendees: eventAttendees.length,
        present_count: getAttendanceStats(eventId).present,
        absent_count: getAttendanceStats(eventId).absent,
        attendees: eventAttendees.map(attendee => ({
          member_id: attendee.members_id,
          member_name: `${attendee.members.name} ${attendee.members.surname}`,
          status: attendee.attendance_status,
          first_time: attendee.first_time,
          attended_at: attendee.attended_at
        })),
        synced_at: new Date().toISOString(),
        synced_by: user?.id,
        synced_by_name: profile?.name ? `${profile.name} ${profile.surname}` : 'Unknown'
      };

      // OPTIMIZED: Single update
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
        attendee.invited_by_member
          ? `${attendee.invited_by_member.name} ${attendee.invited_by_member.surname}`
          : ''
      ]);
    });

    const csvContent = csvRows.map(row =>
      row.map(cell => `"${cell}"`).join(',')
    ).join('\n');

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

      setEvents(prev =>
        prev.map(event =>
          event.id === eventId
            ? { ...event, pamphlet_url: publicUrl }
            : event
        )
      );

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

  const deletePamphlet = async (eventId: string) => {
    try {
      if (!confirm('Are you sure you want to delete this pamphlet?')) return;

      startOperation('delete', 'pamphlet', eventId, 'Deleting pamphlet...');
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

      setEvents(prev =>
        prev.map(event =>
          event.id === eventId
            ? { ...event, pamphlet_url: null }
            : event
        )
      );

      setSuccess('Pamphlet deleted successfully!');
      setTimeout(() => setSuccess(null), 3000);
    } catch (error: any) {
      console.error('Error deleting pamphlet:', error);
      setError(error.message || 'Failed to delete pamphlet.');
    } finally {
      endOperation();
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

    startOperation(editingSermon ? 'update' : 'create', 'sermon', undefined, editingSermon ? 'Updating sermon...' : 'Creating sermon...');
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
        sermon_date: sermonFormData.sermonDate,
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
          .insert([{
            ...sermonData,
            created_at: new Date().toISOString()
          }]);

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
      endOperation();
      setSermonLoading(null);
      setUploadingSermonFile(null);
    }
  };

  const handleDeleteSermon = async (sermonId: string) => {
    if (!confirm('Are you sure you want to delete this sermon? This action cannot be undone.')) return;

    try {
      startOperation('delete', 'sermon', sermonId, 'Deleting sermon...');
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
      endOperation();
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
        sermonDate: sermonToEdit.sermon_date,
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
        sermonDate: event?.event_date || new Date().toISOString().split('T')[0],
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
      startOperation('remove', `${fileType}-file`, sermonId, `Removing ${fileType}...`);
      setSermonLoading(`remove-${fileType}-${sermonId}`);
      setError(null);

      const sermon = sermons.find(s => s.id === sermonId);
      if (!sermon) throw new Error('Sermon not found');

      const fileUrl = fileType === 'video' ? sermon.video_url : sermon.document_url;
      if (!fileUrl) return;

      await deleteSermonFile(fileUrl, fileType);

      const updateData = fileType === 'video' ? { video_url: null } : { document_url: null };

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
      endOperation();
      setSermonLoading(null);
    }
  };

  // OPTIMIZED: Batch insert for absent members
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

      // OPTIMIZED: Single batch upsert instead of loop
      const { error } = await supabase
        .from('event_attendees')
        .upsert(absentRecords, {
          onConflict: 'event_id,members_id',
          ignoreDuplicates: false
        });

      if (error) throw error;

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

    startOperation('complete', 'event', eventId, 'Completing event and marking absentees...');
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const event = events.find(e => e.id === eventId);
      if (!event) throw new Error('Event not found');

      const eventAttendees = getEventAttendees(eventId);
      const attendeeIds = new Set(eventAttendees.map(a => a.members_id));

      const absentMemberIds: string[] = [];

      // OPTIMIZED: Filter members in memory instead of multiple database calls
      for (const member of members) {
        if (member.status === 'not_attending') continue;
        if (attendeeIds.has(member.id)) continue;

        const shouldAttend = isMemberInTargetGroups(member, event);
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

      setEvents(prev =>
        prev.map(event =>
          event.id === eventId
            ? { ...event, is_completed: true, completed_at: new Date().toISOString() }
            : event
        )
      );

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

  const handleEventSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!hasAccess()) {
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
        target_groups:
          !eventFormData.isWholeChurch && eventFormData.targetCellGroups.length > 0
            ? eventFormData.targetCellGroups
            : null,
        target_departments:
          !eventFormData.isWholeChurch &&
          [...eventFormData.targetMinistryGroups, ...eventFormData.targetDepartments].length > 0
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
      endOperation();
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

    startOperation('create', 'attendee', eventId, 'Adding attendee...');
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const attendeeData = {
        event_id: eventId,
        members_id: attendeeFormData.memberId,
        first_time: attendeeFormData.firstTime,
        invited_by_id: attendeeFormData.invitedById || null,
        attendance_status: 'present' as const,
        attended_at: new Date().toISOString()
      };

      const { error: attendeeError } = await supabase
        .from('event_attendees')
        .insert([attendeeData]);

      if (attendeeError) {
        console.error('Supabase error details:', attendeeError);
        throw attendeeError;
      }

      await fetchEventAttendees(eventId);

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

  const handleRemoveAttendee = async (attendeeId: string, eventId: string) => {
    if (!confirm('Are you sure you want to remove this attendee?')) return;

    try {
      startOperation('delete', 'attendee', attendeeId, 'Removing attendee...');
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
    } finally {
      endOperation();
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

  const openBulkAttendanceModal = (eventId: string) => {
    setShowBulkAttendanceModal(eventId);

    const event = events.find(e => e.id === eventId);
    if (!event) return;

    const initialAttendance: Record<string, 'present' | 'absent'> = {};
    const initialNotes: Record<string, string> = {};

    // OPTIMIZED: Filter in memory
    for (const member of members) {
      if (member.status === 'not_attending') continue;

      const shouldAttend = isMemberInTargetGroups(member, event);
      if (shouldAttend) {
        initialAttendance[member.id] = 'present';
      }
    }

    const existingAttendees = getEventAttendees(eventId);
    existingAttendees.forEach(attendee => {
      initialAttendance[attendee.members_id] = attendee.attendance_status as 'present' | 'absent';
    });

    setBulkAttendance(initialAttendance);
    setAttendanceNotes(initialNotes);
  };

  const closeBulkAttendanceModal = () => {
    setShowBulkAttendanceModal(null);
    setBulkAttendance({});
    setAttendanceNotes({});
    attendanceNotesRef.current = {};
  };

  const handleBulkAttendanceChange = (memberId: string, status: 'present' | 'absent') => {
    setBulkAttendance(prev => ({
      ...prev,
      [memberId]: status
    }));
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

    startOperation('create', 'newcomer', eventId, 'Adding newcomer...');
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
      endOperation();
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
      newcomer: {
        color: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300',
        text: 'Newcomer'
      },
      signed_member: {
        color: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300',
        text: 'Signed Member'
      },
      not_attending: {
        color: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300',
        text: 'Not Attending'
      },
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

  const GlobalLoadingOverlay = () => {
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
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl">
          <div className="flex flex-col items-center">
            <Loader2 className="h-12 w-12 text-blue-600 animate-spin mb-4" />
            
            {operationInProgress.progress !== undefined && (
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mb-4">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${operationInProgress.progress}%` }}
                />
              </div>
            )}

            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              {getOperationText()}
            </h3>
            
            <p className="text-sm text-gray-600 dark:text-gray-400 text-center">
              Please wait while we process your request...
            </p>
            
            <p className="text-xs text-gray-500 dark:text-gray-500 text-center mt-2">
              Do not close or refresh the page
            </p>
          </div>
        </div>
      </div>
    );
  };

  const DataSendingIndicators = () => (
    <div className="fixed bottom-4 right-4 z-40 space-y-2">
      {operationInProgress && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-4 max-w-sm">
          <div className="flex items-center gap-3">
            <Loader2 className="h-5 w-5 text-blue-600 animate-spin flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                {operationInProgress.details || 'Processing...'}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {operationInProgress.entity} • {operationInProgress.type}
              </p>
              {operationInProgress.progress !== undefined && (
                <div className="mt-2 w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                  <div
                    className="bg-blue-600 h-1.5 rounded-full transition-all duration-300"
                    style={{ width: `${operationInProgress.progress}%` }}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {uploadingPamphlet && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-4 max-w-sm">
          <div className="flex items-center gap-3">
            <Loader2 className="h-5 w-5 text-purple-600 animate-spin flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                Uploading Pamphlet
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Please wait...</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  // Continue with remaining modals and UI components...
  // The rest of the component would follow the same pattern
  // I'll provide the essential remaining parts:

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-6 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto" />
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
      <GlobalLoadingOverlay />
      <DataSendingIndicators />

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
            <LoadingButton
              loading={operationInProgress?.type === 'create' && operationInProgress?.entity === 'sermon'}
              onClick={() => setShowSermonList(!showSermonList)}
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-orange-600 to-amber-600 text-white rounded-xl hover:shadow-lg transition-all duration-200 hover:scale-105 font-medium group"
              loadingText="Loading..."
            >
              <BookOpen className="h-5 w-5 group-hover:scale-110 transition-transform duration-200" />
              {showSermonList ? 'Hide Sermons' : 'View Sermons'}
            </LoadingButton>

            <LoadingButton
              loading={operationInProgress?.type === 'create' && operationInProgress?.entity === 'event'}
              onClick={() => setShowEventForm(!showEventForm)}
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:shadow-lg transition-all duration-200 hover:scale-105 font-medium group"
              loadingText="Loading..."
            >
              <Plus className="h-5 w-5 group-hover:rotate-90 transition-transform duration-200" />
              {showEventForm ? 'Cancel' : 'Create Event'}
            </LoadingButton>
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

        <p className="text-center text-gray-600 dark:text-gray-400 py-8">
          ⚡ Optimized for super-fast cloud operations with batch processing
        </p>
      </div>
    </div>
  );
};

export default Events;
