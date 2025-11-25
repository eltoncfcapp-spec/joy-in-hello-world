on this page event not averyone must have access on it only pastors and admin 
import { Calendar as CalendarIcon, Clock, MapPin, Plus, ChevronDown, Phone, X, User, Search, Mail, Building, Users as GroupsIcon, CheckCircle, AlertCircle, Upload, FileText } from 'lucide-react';
import { useState, useEffect } from 'react';
import { supabase } from '../integrations/supabase/client';

// Type-safe wrapper for events-related queries
const db = supabase as any;

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

interface Member {
  id: string;
  name: string;
  surname: string;
  email: string | null;
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
  members: Member;
  invited_by_member?: {
    id: string;
    name: string;
    surname: string;
  } | null;
}

interface AttendeeFormData {
  memberId: string;
  firstTime: boolean;
  invitedById: string;
}

interface UserRole {
  id: string;
  user_id: string;
  role: 'admin' | 'pastor' | 'member';
}

const Events = () => {
  const [showEventForm, setShowEventForm] = useState(false);
  const [showAttendeeForm, setShowAttendeeForm] = useState<string | null>(null);
  const [events, setEvents] = useState<Event[]>([]);
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
  const [userRole, setUserRole] = useState<'admin' | 'pastor' | 'member' | null>(null);
  const [uploadingPamphlet, setUploadingPamphlet] = useState<string | null>(null);
  
  // State for toggling lists
  const [showPresentList, setShowPresentList] = useState<{[key: string]: boolean}>({});
  const [showAbsentList, setShowAbsentList] = useState<{[key: string]: boolean}>({});

  const [eventFormData, setEventFormData] = useState({
    name: '',
    topic: '',
    eventDate: '',
    eventTime: '',
    location: '',
    isWholeChurch: true,
    targetCellGroups: [] as string[],
    targetMinistryGroups: [] as string[],
  });

  const [attendeeFormData, setAttendeeFormData] = useState<AttendeeFormData>({
    memberId: '',
    firstTime: false,
    invitedById: '',
  });

  const [selectedMember, setSelectedMember] = useState<Member | null>(null);

  useEffect(() => {
    checkUserRole();
    fetchEvents();
    fetchMembers();
    fetchCellGroups();
    fetchMinistryGroups();
  }, []);

  // Check user role
  const checkUserRole = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError('Please log in to access events');
        return;
      }

      const { data, error } = await db
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .single();

      if (error) {
        console.error('Error fetching user role:', error);
        setUserRole('member');
      } else {
        setUserRole(data.role);
      }
    } catch (error: any) {
      console.error('Error checking user role:', error);
      setUserRole('member');
    }
  };

  // Check if user has access (pastor or admin)
  const hasAccess = () => {
    return userRole === 'admin' || userRole === 'pastor';
  };

  const fetchEvents = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const { data, error } = await db
        .from('events')
        .select('*')
        .order('event_date', { ascending: true });

      if (error) {
        throw error;
      }

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

  const fetchMembers = async () => {
    try {
      setError(null);
      
      const { data, error } = await db
        .from('members')
        .select(`
          id,
          name,
          surname,
          email,
          phone,
          cell_group_id,
          ministry_group_id,
          status,
          cell_groups!fk_cell_group(name),
          ministry_groups(name)
        `)
        .order('name');

      if (error) {
        throw error;
      }

      setMembers(data || []);
    } catch (error: any) {
      console.error('Error fetching members:', error);
      setError(error.message || 'Failed to load members.');
    }
  };

  const fetchCellGroups = async () => {
    try {
      const { data, error } = await db
        .from('cell_groups')
        .select('id, name')
        .order('name');

      if (error) {
        throw error;
      }

      setCellGroups(data || []);
    } catch (error: any) {
      console.error('Error fetching cell groups:', error);
      setError(error.message || 'Failed to load cell groups.');
    }
  };

  const fetchMinistryGroups = async () => {
    try {
      const { data, error } = await db
        .from('ministry_groups')
        .select('id, name')
        .order('name');

      if (error) {
        throw error;
      }

      setMinistryGroups(data || []);
    } catch (error: any) {
      console.error('Error fetching ministry groups:', error);
      setError(error.message || 'Failed to load ministry groups.');
    }
  };

  const fetchEventAttendees = async (eventId: string) => {
    try {
      const { data, error } = await db
        .from('event_attendees')
        .select(`
          *,
          members!event_attendees_members_id_fkey (
            id,
            name,
            surname,
            email,
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
        throw error;
      }

      const attendeesWithDefaults = (data || []).map((attendee: any) => ({
        ...attendee,
        attendance_status: attendee.attendance_status || 'present'
      }));

      setAttendees(prev => {
        const filtered = prev.filter(attendee => attendee.event_id !== eventId);
        return [...filtered, ...attendeesWithDefaults as EventAttendee[]];
      });
    } catch (error: any) {
      console.error('Error fetching attendees:', error);
    }
  };

  // Upload pamphlet function
  const uploadPamphlet = async (eventId: string, file: File) => {
    try {
      setUploadingPamphlet(eventId);
      setError(null);

      const fileExt = file.name.split('.').pop();
      const fileName = `${eventId}/pamphlet.${fileExt}`;
      const filePath = `event-pamphlets/${fileName}`;

      // Upload file to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('event-pamphlets')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true
        });

      if (uploadError) {
        throw uploadError;
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('event-pamphlets')
        .getPublicUrl(filePath);

      // Update event with pamphlet URL
      const { error: updateError } = await db
        .from('events')
        .update({ pamphlet_url: publicUrl })
        .eq('id', eventId);

      if (updateError) {
        throw updateError;
      }

      // Update local state
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
      if (!confirm('Are you sure you want to delete this pamphlet?')) {
        return;
      }

      setError(null);

      // Get event to find file path
      const event = events.find(e => e.id === eventId);
      if (!event?.pamphlet_url) return;

      // Extract file path from URL
      const urlParts = event.pamphlet_url.split('/');
      const fileName = urlParts[urlParts.length - 2];
      const filePath = `event-pamphlets/${fileName}/pamphlet.pdf`;

      // Delete file from storage
      const { error: deleteError } = await supabase.storage
        .from('event-pamphlets')
        .remove([filePath]);

      if (deleteError) {
        throw deleteError;
      }

      // Update event to remove pamphlet URL
      const { error: updateError } = await db
        .from('events')
        .update({ pamphlet_url: null })
        .eq('id', eventId);

      if (updateError) {
        throw updateError;
      }

      // Update local state
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

  const markMembersAsAbsent = async (eventId: string, absentMemberIds: string[]) => {
    try {
      const absentRecords = absentMemberIds.map(memberId => {
        const member = members.find(m => m.id === memberId);
        return {
          event_id: eventId,
          members_id: memberId,
          name: member?.name || 'Unknown',
          surname: member?.surname || 'Member',
          first_time: false,
          attendance_status: 'absent',
          attended_at: null
        };
      });

      const { error } = await supabase
        .from('event_attendees')
        .insert(absentRecords);

      if (error) {
        throw error;
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
      if (!event) {
        throw new Error('Event not found');
      }

      const eventAttendees = getEventAttendees(eventId);
      const attendeeIds = new Set(eventAttendees.map(a => a.members_id));

      let expectedMembers: Member[] = [];

      if (event.is_whole_church) {
        expectedMembers = members.filter(member => 
          member.status !== 'not_attending'
        );
      } else {
        expectedMembers = members.filter(member => {
          const inTargetCellGroup = event.target_groups?.some(groupId => 
            member.cell_group_id === groupId
          );
          
          const inTargetMinistryGroup = event.target_departments?.some(deptId => 
            member.ministry_group_id === deptId
          );

          return (inTargetCellGroup || inTargetMinistryGroup) && member.status !== 'not_attending';
        });
      }

      const absentMemberIds = expectedMembers
        .filter(member => !attendeeIds.has(member.id))
        .map(member => member.id);

      if (absentMemberIds.length > 0) {
        await markMembersAsAbsent(eventId, absentMemberIds);
      }

      const { error } = await db
        .from('events')
        .update({
          is_completed: true,
          completed_at: new Date().toISOString()
        } as any)
        .eq('id', eventId);

      if (error) {
        throw error;
      }

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

      const { error } = await db.from('events').insert([eventData]);

      if (error) {
        throw error;
      }

      setShowEventForm(false);
      setEventFormData({ 
        name: '', 
        topic: '', 
        eventDate: '', 
        eventTime: '', 
        location: '',
        isWholeChurch: true,
        targetCellGroups: [],
        targetMinistryGroups: [],
      });
      setSuccess('Event created successfully!');
      await fetchEvents();
      
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
      
      if (!selectedMember) {
        throw new Error('Selected member not found');
      }

      const attendeeData = {
        event_id: eventId,
        members_id: attendeeFormData.memberId,
        name: selectedMember.name,
        surname: selectedMember.surname,
        first_time: attendeeFormData.firstTime,
        attendance_status: 'present',
        invited_by_id: attendeeFormData.invitedById || null
      };

      const { error } = await db.from('event_attendees').insert([attendeeData]);

      if (error) {
        throw error;
      }

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
    if (!confirm('Are you sure you want to remove this attendee?')) {
      return;
    }

    try {
      setError(null);
      setSuccess(null);
      
      const { error } = await supabase
        .from('event_attendees')
        .delete()
        .eq('id', attendeeId);

      if (error) {
        throw error;
      }

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
  };

  const filteredMembers = members.filter(member => {
    const searchLower = searchTerm.toLowerCase();
    return (
      member.name.toLowerCase().includes(searchLower) ||
      member.surname.toLowerCase().includes(searchLower) ||
      `${member.name} ${member.surname}`.toLowerCase().includes(searchLower) ||
      member.phone?.toLowerCase().includes(searchLower) ||
      member.email?.toLowerCase().includes(searchLower)
    );
  });

  const filteredInviters = members.filter(member => {
    const searchLower = inviterSearchTerm.toLowerCase();
    return (
      member.name.toLowerCase().includes(searchLower) ||
      member.surname.toLowerCase().includes(searchLower) ||
      `${member.name} ${member.surname}`.toLowerCase().includes(searchLower) ||
      member.phone?.toLowerCase().includes(searchLower) ||
      member.email?.toLowerCase().includes(searchLower)
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

  // Show access denied message if user doesn't have permission
  if (userRole && !hasAccess()) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-6 flex items-center justify-center">
        <div className="max-w-md text-center">
          <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-8">
            <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Access Denied</h1>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              You need to be a pastor or administrator to access the events page.
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-500">
              Current role: {userRole}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Show loading while checking authentication
  if (userRole === null) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-6 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Checking permissions...</p>
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
              Events Calendar
            </h1>
            <p className="text-gray-600 dark:text-gray-400">Manage church events and track attendance</p>
            <div className="mt-2">
              <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
                {userRole === 'admin' ? 'Administrator' : 'Pastor'}
              </span>
            </div>
          </div>
          <button 
            onClick={() => setShowEventForm(!showEventForm)}
            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:shadow-lg transition-all duration-200 hover:scale-105 font-medium group"
          >
            <Plus className="h-5 w-5 group-hover:rotate-90 transition-transform duration-200" />
            {showEventForm ? 'Cancel' : 'Create Event'}
          </button>
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

        {/* Event Creation Form */}
        {showEventForm && (
          <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-6 mb-8 shadow-lg hover:shadow-xl transition-all duration-300">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Create New Event</h2>
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
                  onClick={() => setShowEventForm(false)}
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

                      {/* Pamphlet Section */}
                      {event.pamphlet_url && (
                        <div className="mt-4">
                          <a
                            href={event.pamphlet_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 px-4 py-2 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-xl hover:bg-green-200 dark:hover:bg-green-800/30 transition-all duration-200"
                          >
                            <FileText className="h-4 w-4" />
                            View Event Pamphlet
                          </a>
                          {hasAccess() && (
                            <button
                              onClick={() => deletePamphlet(event.id)}
                              className="ml-2 inline-flex items-center gap-2 px-4 py-2 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-xl hover:bg-red-200 dark:hover:bg-red-800/30 transition-all duration-200"
                            >
                              <X className="h-4 w-4" />
                              Remove
                            </button>
                          )}
                        </div>
                      )}

                      {/* Upload Pamphlet Button (Only for pastors/admins) */}
                      {hasAccess() && !event.pamphlet_url && (
                        <div className="mt-4">
                          <label className="inline-flex items-center gap-2 px-4 py-2 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-xl hover:bg-blue-200 dark:hover:bg-blue-800/30 transition-all duration-200 cursor-pointer">
                            <Upload className="h-4 w-4" />
                            Upload Pamphlet
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
                                          {member.phone || member.email}
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
                                          {member.phone || member.email}
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
                                    {selectedMember.email && <span className="flex items-center gap-1"><Mail className="h-3 w-3" />{selectedMember.email}</span>}
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

                  {/* Present Attendees List */}
                  {showPresentList[event.id] && (
                    <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                      <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                        Present Attendees ({presentAttendees.length})
                      </h4>
                      {presentAttendees.length === 0 ? (
                        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                          <User className="h-12 w-12 mx-auto mb-3 opacity-50" />
                          <p>No attendees yet</p>
                          <p className="text-sm">Add attendees using the "Add Attendee" button</p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                          {presentAttendees.map((attendee) => (
                            <div key={attendee.id} className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4 hover:shadow-md transition-all duration-200">
                              <div className="flex items-start gap-3">
                                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-semibold text-sm flex-shrink-0">
                                  {getInitials(attendee.members.name, attendee.members.surname)}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-start justify-between mb-2">
                                    <div>
                                      <h5 className="font-semibold text-gray-900 dark:text-white truncate">
                                        {attendee.members.name} {attendee.members.surname}
                                      </h5>
                                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadge(attendee.members.status).color}`}>
                                          {getStatusBadge(attendee.members.status).text}
                                        </span>
                                        {attendee.first_time && (
                                          <span className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-full text-xs">
                                            First Time
                                          </span>
                                        )}
                                        <span className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-full text-xs">
                                          Present
                                        </span>
                                      </div>
                                    </div>
                                    {!event.is_completed && (
                                      <button
                                        onClick={() => handleRemoveAttendee(attendee.id, event.id)}
                                        className="text-gray-400 hover:text-red-500 transition-colors ml-2 flex-shrink-0"
                                        title="Remove attendee"
                                      >
                                        <X className="h-4 w-4" />
                                      </button>
                                    )}
                                  </div>
                                  
                                  <div className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
                                    {attendee.members.phone && (
                                      <div className="flex items-center gap-2">
                                        <Phone className="h-3 w-3" />
                                        <span>{attendee.members.phone}</span>
                                      </div>
                                    )}
                                    {attendee.members.email && (
                                      <div className="flex items-center gap-2">
                                        <Mail className="h-3 w-3" />
                                        <span className="truncate">{attendee.members.email}</span>
                                      </div>
                                    )}
                                    {attendee.members.cell_groups?.name && (
                                      <div className="text-xs">
                                        Cell Group: {attendee.members.cell_groups.name}
                                      </div>
                                    )}
                                    {attendee.invited_by_member && (
                                      <div className="text-xs text-blue-600 dark:text-blue-400">
                                        Invited by: {attendee.invited_by_member.name} {attendee.invited_by_member.surname}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Absent Members List */}
                  {showAbsentList[event.id] && event.is_completed && (
                    <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                      <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                        Absent Members ({absentAttendees.length})
                        <span className="ml-2 text-sm font-normal text-gray-500 dark:text-gray-400">
                          {event.is_whole_church ? 
                            'All church members not present' : 
                            'Target group members not present'
                          }
                        </span>
                      </h4>
                      {absentAttendees.length === 0 ? (
                        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                          <User className="h-12 w-12 mx-auto mb-3 opacity-50" />
                          <p>No absent members</p>
                          <p className="text-sm">All expected members are present</p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                          {absentAttendees.map((attendee) => (
                            <div key={attendee.id} className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4">
                              <div className="flex items-start gap-3">
                                <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-orange-500 rounded-full flex items-center justify-center text-white font-semibold text-sm flex-shrink-0">
                                  {getInitials(attendee.members.name, attendee.members.surname)}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <h5 className="font-semibold text-gray-900 dark:text-white truncate">
                                    {attendee.members.name} {attendee.members.surname}
                                  </h5>
                                  <div className="flex items-center gap-2 mt-1 mb-2">
                                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadge(attendee.members.status).color}`}>
                                      {getStatusBadge(attendee.members.status).text}
                                    </span>
                                    <span className="px-2 py-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-full text-xs">
                                      Absent
                                    </span>
                                  </div>
                                  
                                  <div className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
                                    {attendee.members.phone && (
                                      <div className="flex items-center gap-2">
                                        <Phone className="h-3 w-3" />
                                        <span>{attendee.members.phone}</span>
                                      </div>
                                    )}
                                    {attendee.members.cell_groups?.name && (
                                      <div className="text-xs">
                                        Cell Group: {attendee.members.cell_groups.name}
                                      </div>
                                    )}
                                    {attendee.members.ministry_groups?.name && (
                                      <div className="text-xs">
                                        Ministry: {attendee.members.ministry_groups.name}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

export default Events;
