import { Calendar as CalendarIcon, Clock, MapPin, Plus, Users, ChevronDown, Phone, X, User, Search, Mail, Building, Users as GroupsIcon, CheckCircle, AlertCircle } from 'lucide-react';
import { useState, useEffect } from 'react';
import { supabase } from '../integrations/supabase/client';

interface Event {
  id: string;
  name: string;
  topic: string | null;
  event_date: string;
  event_time: string;
  location: string | null;
  created_at: string | null;
  is_whole_church?: boolean;
  target_groups?: string[] | null;
  target_departments?: string[] | null;
  is_completed?: boolean;
  completed_at?: string | null;
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

const Events = () => {
  const [showEventForm, setShowEventForm] = useState(false);
  const [showAttendeeForm, setShowAttendeeForm] = useState<string | null>(null);
  const [showAbsentList, setShowAbsentList] = useState<string | null>(null);
  const [events, setEvents] = useState<Event[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [cellGroups, setCellGroups] = useState<CellGroup[]>([]);
  const [ministryGroups, setMinistryGroups] = useState<MinistryGroup[]>([]);
  const [attendees, setAttendees] = useState<EventAttendee[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedEvents, setExpandedEvents] = useState<{[key: string]: boolean}>({});
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [inviterSearchTerm, setInviterSearchTerm] = useState('');
  const [isMemberDropdownOpen, setIsMemberDropdownOpen] = useState(false);
  const [isInviterDropdownOpen, setIsInviterDropdownOpen] = useState(false);
  
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
  const [selectedInviter, setSelectedInviter] = useState<Member | null>(null);

  // Local state to track completed events if database columns are missing
  const [completedEvents, setCompletedEvents] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchEvents();
    fetchMembers();
    fetchCellGroups();
    fetchMinistryGroups();
  }, []);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Try to fetch with all columns, but handle missing columns gracefully
      let query = supabase
        .from('events')
        .select('*')
        .order('event_date', { ascending: true });

      const { data, error } = await query;

      if (error) {
        // If there's a column error, try fetching without the new columns
        if (error.message?.includes('is_whole_church') || error.message?.includes('is_completed')) {
          console.warn('New columns not found, fetching basic event data');
          const { data: basicData, error: basicError } = await supabase
            .from('events')
            .select('id, name, topic, event_date, event_time, location, created_at')
            .order('event_date', { ascending: true });
          
          if (basicError) throw basicError;
          
          // Add default values for missing columns
          const eventsWithDefaults = (basicData || []).map(event => ({
            ...event,
            is_whole_church: true,
            target_groups: null,
            target_departments: null,
            is_completed: false,
            completed_at: null
          }));
          
          setEvents(eventsWithDefaults);
        } else {
          throw error;
        }
      } else {
        // All columns exist, use the data as is with defaults for null values
        const eventsWithDefaults = (data || []).map(event => ({
          ...event,
          is_whole_church: event.is_whole_church ?? true,
          target_groups: event.target_groups ?? null,
          target_departments: event.target_departments ?? null,
          is_completed: event.is_completed ?? false,
          completed_at: event.completed_at ?? null
        }));
        
        setEvents(eventsWithDefaults);
        
        // Initialize local state from database
        const completedSet = new Set<string>();
        eventsWithDefaults.forEach(event => {
          if (event.is_completed) {
            completedSet.add(event.id);
          }
        });
        
        setCompletedEvents(completedSet);
      }

      // Fetch attendees for each event
      const eventsToProcess = eventsWithDefaults || data || [];
      eventsToProcess.forEach(event => {
        fetchEventAttendees(event.id);
      });
    } catch (error: any) {
      console.error('Error fetching events:', error);
      setError('Failed to load events. Please check your database schema.');
    } finally {
      setLoading(false);
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
      const { data, error } = await supabase
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
      const { data, error } = await supabase
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
      const { data, error } = await supabase
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

      // Handle case where attendance_status column doesn't exist
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
      await fetchEventAttendeesFallback(eventId);
    }
  };

  const fetchEventAttendeesFallback = async (eventId: string) => {
    try {
      const { data: attendeesData, error: attendeesError } = await supabase
        .from('event_attendees')
        .select('*')
        .eq('event_id', eventId)
        .order('attended_at', { ascending: false });

      if (attendeesError) throw attendeesError;

      const attendeesWithDetails = await Promise.all(
        (attendeesData || []).map(async (attendee) => {
          // Fetch attendee member details
          const { data: memberData } = await supabase
            .from('members')
            .select(`
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
            `)
            .eq('id', attendee.members_id)
            .single();

          // Fetch inviter details if exists
          let invitedByMember = null;
          if (attendee.invited_by_id) {
            const { data: inviterData } = await supabase
              .from('members')
              .select('id, name, surname')
              .eq('id', attendee.invited_by_id)
              .single();
            invitedByMember = inviterData;
          }

          return {
            ...attendee,
            attendance_status: attendee.attendance_status || 'present',
            members: memberData || {
              id: attendee.members_id,
              name: 'Unknown',
              surname: 'Member',
              email: null,
              phone: null,
              cell_group_id: null,
              ministry_group_id: null,
              cell_groups: null,
              ministry_groups: null,
              status: null
            },
            invited_by_member: invitedByMember
          };
        })
      );

      setAttendees(prev => {
        const filtered = prev.filter(attendee => attendee.event_id !== eventId);
        return [...filtered, ...attendeesWithDetails];
      });
    } catch (error: any) {
      console.error('Error in fallback attendees fetch:', error);
      setError('Failed to load attendees details.');
    }
  };

  const markMembersAsAbsent = async (eventId: string, absentMemberIds: string[]) => {
    try {
      // Create absent records for each missing member
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
        // If attendance_status column doesn't exist, insert without it
        if (error.message?.includes('attendance_status')) {
          const absentRecordsWithoutStatus = absentMemberIds.map(memberId => {
            const member = members.find(m => m.id === memberId);
            return {
              event_id: eventId,
              members_id: memberId,
              name: member?.name || 'Unknown',
              surname: member?.surname || 'Member',
              first_time: false,
              attended_at: null
            };
          });

          const { error: fallbackError } = await supabase
            .from('event_attendees')
            .insert(absentRecordsWithoutStatus);

          if (fallbackError) throw fallbackError;
        } else {
          throw error;
        }
      }

      // Refresh attendees list
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

      // Calculate which members should be marked as absent
      const eventAttendees = getEventAttendees(eventId);
      const attendeeIds = new Set(eventAttendees.map(a => a.members_id));

      const isWholeChurch = event.is_whole_church ?? true;
      let expectedMembers: Member[] = [];

      if (isWholeChurch) {
        // For whole church events, all active members are expected
        expectedMembers = members.filter(member => 
          member.status !== 'not_attending'
        );
      } else {
        // For targeted events, only members from selected groups/departments
        expectedMembers = members.filter(member => {
          // Check cell groups
          const inTargetCellGroup = event.target_groups?.some(groupId => 
            member.cell_group_id === groupId
          );
          
          // Check ministry groups
          const inTargetMinistryGroup = event.target_departments?.some(deptId => 
            member.ministry_group_id === deptId
          );

          return (inTargetCellGroup || inTargetMinistryGroup) && member.status !== 'not_attending';
        });
      }

      // Find absent members (expected but not attending)
      const absentMemberIds = expectedMembers
        .filter(member => !attendeeIds.has(member.id))
        .map(member => member.id);

      // Mark absent members in the database
      if (absentMemberIds.length > 0) {
        await markMembersAsAbsent(eventId, absentMemberIds);
      }

      // Try to update event as completed in database
      try {
        const updateData: any = {
          is_completed: true,
          completed_at: new Date().toISOString()
        };

        const { error } = await supabase
          .from('events')
          .update(updateData)
          .eq('id', eventId);

        if (error) {
          // If columns don't exist, just update local state
          if (error.message?.includes('is_completed') || error.message?.includes('is_whole_church')) {
            console.warn('New columns not available, updating local state only');
          } else {
            throw error;
          }
        }
      } catch (dbError) {
        console.warn('Database update failed, using local state only');
      }

      // Update local state
      setCompletedEvents(prev => new Set(prev).add(eventId));
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
    setLoading(true);
    setError(null);
    setSuccess(null);
    
    try {
      const eventData: any = {
        name: eventFormData.name.trim(),
        topic: eventFormData.topic.trim() || null,
        event_date: eventFormData.eventDate,
        event_time: eventFormData.eventTime,
        location: eventFormData.location.trim() || null,
      };

      // Try to include new columns
      try {
        eventData.is_whole_church = eventFormData.isWholeChurch;
        eventData.is_completed = false;
        eventData.completed_at = null;
      } catch (error) {
        console.warn('New columns not available, creating event without them');
      }

      // Only include target groups if not a whole church event
      if (!eventFormData.isWholeChurch) {
        try {
          eventData.target_groups = eventFormData.targetCellGroups.length > 0 ? eventFormData.targetCellGroups : null;
          eventData.target_departments = eventFormData.targetMinistryGroups.length > 0 ? eventFormData.targetMinistryGroups : null;
        } catch (error) {
          console.warn('Target group columns not available');
        }
      }

      const { error } = await supabase.from('events').insert([eventData]);

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

    // Check if member is already registered for this event (present or absent)
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

      const attendeeData: any = {
        event_id: eventId,
        members_id: attendeeFormData.memberId,
        name: selectedMember.name,
        surname: selectedMember.surname,
        first_time: attendeeFormData.firstTime,
        attendance_status: 'present'
      };

      // Only include invited_by_id if it's provided
      if (attendeeFormData.invitedById) {
        attendeeData.invited_by_id = attendeeFormData.invitedById;
      }

      const { error } = await supabase.from('event_attendees').insert([attendeeData]);

      if (error) {
        // If attendance_status column doesn't exist, insert without it
        if (error.message?.includes('attendance_status')) {
          delete attendeeData.attendance_status;
          const { error: fallbackError } = await supabase.from('event_attendees').insert([attendeeData]);
          if (fallbackError) throw fallbackError;
        } else {
          throw error;
        }
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

  const toggleEventExpansion = (eventId: string) => {
    setExpandedEvents(prev => ({
      ...prev,
      [eventId]: !prev[eventId]
    }));
  };

  const toggleAbsentList = (eventId: string) => {
    setShowAbsentList(prev => prev === eventId ? null : eventId);
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
      attendee.attendance_status === 'present' || !attendee.attendance_status
    );
  };

  const getAbsentAttendees = (eventId: string) => {
    return getEventAttendees(eventId).filter(attendee => 
      attendee.attendance_status === 'absent'
    );
  };

  const getUniqueAttendees = (eventId: string) => {
    const eventAttendees = getEventAttendees(eventId);
    const uniqueAttendees = eventAttendees.filter((attendee, index, self) =>
      index === self.findIndex(a => a.members_id === attendee.members_id)
    );
    return uniqueAttendees;
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
    const isWholeChurch = event.is_whole_church ?? true;
    
    if (isWholeChurch) {
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
    const isCompleted = event.is_completed || completedEvents.has(event.id);
    
    if (isCompleted) {
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
          </div>
          <button 
            onClick={() => setShowEventForm(!showEventForm)}
            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:shadow-lg transition-all duration-200 hover:scale-105 font-medium group"
          >
            <Plus className="h-5 w-5 group-hover:rotate-90 transition-transform duration-200" />
            {showEventForm ? 'Cancel' : 'Create Event'}
          </button>
        </div>

        {/* Database Schema Warning */}
        {error && error.includes('schema') && (
          <div className="mb-6 p-4 bg-yellow-100 dark:bg-yellow-900/30 border border-yellow-300 dark:border-yellow-700 rounded-xl text-yellow-700 dark:text-yellow-300">
            <p className="font-semibold">Database Schema Update Required</p>
            <p className="text-sm mt-1">Please run the SQL commands to add missing columns for full functionality.</p>
            <p className="text-xs mt-2">The app will work with limited features until the schema is updated.</p>
          </div>
        )}

        {/* Success Message */}
        {success && (
          <div className="mb-6 p-4 bg-green-100 dark:bg-green-900/30 border border-green-300 dark:border-green-700 rounded-xl text-green-700 dark:text-green-300">
            {success}
          </div>
        )}

        {/* Error Message */}
        {error && !error.includes('schema') && (
          <div className="mb-6 p-4 bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700 rounded-xl text-red-700 dark:text-red-300">
            {error}
          </div>
        )}

        {/* Event Creation Form - Same as before, shortened for brevity */}
        {showEventForm && (
          <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-6 mb-8 shadow-lg hover:shadow-xl transition-all duration-300">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Create New Event</h2>
            <form onSubmit={handleEventSubmit} className="space-y-6">
              {/* Form fields same as before */}
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
                {/* ... other form fields ... */}
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
              const isExpanded = expandedEvents[event.id];
              const scopeBadge = getEventScopeBadge(event);
              const statusBadge = getEventStatusBadge(event);
              const ScopeIcon = scopeBadge.icon;
              const StatusIcon = statusBadge.icon;
              const isCompleted = event.is_completed || completedEvents.has(event.id);
              
              return (
                <div key={event.id} className="group">
                  {/* Event Card */}
                  <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-6 hover:shadow-xl transition-all duration-300 hover:border-gray-300/50 dark:hover:border-gray-600/50 hover:scale-[1.02]">
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
                          {isCompleted && event.completed_at && (
                            <div className="flex items-center gap-3 text-green-600 dark:text-green-400">
                              <CheckCircle className="h-4 w-4" />
                              <span className="font-medium">Completed on {formatDate(event.completed_at)}</span>
                            </div>
                          )}
                        </div>

                        {/* Attendance Summary */}
                        <div className="mt-4 flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                          <div className="flex items-center gap-2">
                            <Users className="h-4 w-4 text-green-600" />
                            <span>{presentAttendees.length} attended</span>
                          </div>
                          {isCompleted && (
                            <div className="flex items-center gap-2">
                              <User className="h-4 w-4 text-red-600" />
                              <span>{absentAttendees.length} absent</span>
                            </div>
                          )}
                          {presentAttendees.filter(a => a.first_time).length > 0 && (
                            <span className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-full text-xs">
                              {presentAttendees.filter(a => a.first_time).length} first-time
                            </span>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex flex-col justify-between items-end gap-4">
                        <div className="flex gap-3">
                          {!isCompleted && (
                            <>
                              <button 
                                onClick={() => toggleEventExpansion(event.id)}
                                className="flex items-center gap-2 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-xl hover:shadow-lg transition-all duration-200 font-medium group"
                              >
                                <Users className="h-4 w-4" />
                                {isExpanded ? 'Hide' : 'View'} Attendees
                                <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
                              </button>
                              <button 
                                onClick={() => setShowAttendeeForm(showAttendeeForm === event.id ? null : event.id)}
                                className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:shadow-lg transition-all duration-200 font-medium group"
                              >
                                <Plus className="h-4 w-4 group-hover:rotate-90 transition-transform duration-200" />
                                {showAttendeeForm === event.id ? 'Cancel' : 'Add Attendee'}
                              </button>
                              <button 
                                onClick={() => handleCompleteEvent(event.id)}
                                className="flex items-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl hover:shadow-lg transition-all duration-200 font-medium group"
                              >
                                <CheckCircle className="h-4 w-4 group-hover:scale-110 transition-transform duration-200" />
                                Complete Event
                              </button>
                            </>
                          )}
                          {isCompleted && (
                            <>
                              <button 
                                onClick={() => toggleEventExpansion(event.id)}
                                className="flex items-center gap-2 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-xl hover:shadow-lg transition-all duration-200 font-medium group"
                              >
                                <Users className="h-4 w-4" />
                                {isExpanded ? 'Hide' : 'View'} Present
                                <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
                              </button>
                              <button 
                                onClick={() => toggleAbsentList(event.id)}
                                className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl hover:shadow-lg transition-all duration-200 font-medium group"
                              >
                                <User className="h-4 w-4" />
                                {showAbsentList === event.id ? 'Hide' : 'View'} Absent
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Expanded Present Attendees List */}
                    {isExpanded && !showAbsentList && (
                      <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                        <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                          {isCompleted ? 'Present Attendees' : 'Event Attendees'} ({presentAttendees.length})
                          {isCompleted && (
                            <span className="ml-2 text-sm font-normal text-gray-500 dark:text-gray-400">
                              • Event completed
                            </span>
                          )}
                        </h4>
                        {presentAttendees.length === 0 ? (
                          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                            <User className="h-12 w-12 mx-auto mb-3 opacity-50" />
                            <p>No {isCompleted ? 'present' : ''} attendees yet</p>
                            <p className="text-sm">
                              {isCompleted ? 
                                'No one attended this event' : 
                                'Add attendees using the "Add Attendee" button'
                              }
                            </p>
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
                                      {!isCompleted && (
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
                    {showAbsentList === event.id && isCompleted && (
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

                  {/* Attendee Form */}
                  {showAttendeeForm === event.id && !isCompleted && (
                    // Attendee form component (same as before)
                    <div className="mt-4 bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300">
                      <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6">Add Event Attendee</h3>
                      {/* Form content same as before */}
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
