import { Plus, Users, MapPin, FileText, UserPlus, Calendar, BarChart3, Settings, Eye, Calendar as CalendarIcon, Clock, CheckCircle, AlertCircle, Building, ChevronDown, Search, Phone, Mail, X } from 'lucide-react';
import { useState, useEffect } from 'react';
import { supabase } from '../integrations/supabase/client';
import { useAuth } from '../contexts/AuthContext';

interface CellGroup {
  id: string;
  name: string;
  location: string | null;
  meeting_day: string | null;
  leader_id: string | null;
  leader: { name: string; surname: string } | null;
  member_count?: number;
}

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
}

interface Member {
  id: string;
  name: string;
  surname: string;
  email: string | null;
  phone: string | null;
  cell_group_id: string | null;
  status: 'newcomer' | 'signed_member' | 'not_attending' | null;
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
}

const Groups = () => {
  const { profile } = useAuth();
  const [showForm, setShowForm] = useState(false);
  const [cellGroups, setCellGroups] = useState<CellGroup[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [attendees, setAttendees] = useState<EventAttendee[]>([]);
  const [formData, setFormData] = useState({
    groupName: '',
    leaderId: '',
    location: '',
    meetingDay: '',
  });
  const [loading, setLoading] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<CellGroup | null>(null);
  const [activeAction, setActiveAction] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [eventFormData, setEventFormData] = useState({
    name: '',
    topic: '',
    eventDate: '',
    eventTime: '',
    location: '',
    isWholeChurch: true,
    targetCellGroups: [] as string[],
  });

  // Check if user has permission to create cell groups
  const canCreateCellGroups = profile?.isAdmin || profile?.role === 'admin' || 
                            profile?.permissions?.includes('manage_groups');

  // Check if user can manage specific group (admin or group leader of that group)
  const canManageGroup = (groupId: string) => {
    return profile?.isAdmin || 
           profile?.role === 'admin' || 
           profile?.userCellGroup?.id === groupId;
  };

  useEffect(() => {
    fetchCellGroups();
    fetchMembers();
    fetchEvents();
  }, []);

  const fetchCellGroups = async () => {
    setLoading(true);
    try {
      const { data: groupsData, error: groupsError } = await supabase
        .from('cell_groups')
        .select(`
          *,
          leader:members!cell_groups_leader_id_fkey(
            name, 
            surname
          )
        `)
        .order('name');

      if (groupsError) {
        console.error('Error fetching cell groups:', groupsError);
        return;
      }

      // Fetch member counts for each group
      const groupsWithCounts = await Promise.all(
        (groupsData || []).map(async (group) => {
          const { count, error: countError } = await supabase
            .from('members')
            .select('*', { count: 'exact', head: true })
            .eq('cell_group_id', group.id);

          if (countError) {
            console.error('Error counting members:', countError);
          }

          return {
            ...group,
            member_count: count || 0
          };
        })
      );

      setCellGroups(groupsWithCounts);
    } catch (error) {
      console.error('Error in fetchCellGroups:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMembers = async () => {
    try {
      const { data, error } = await supabase
        .from('members')
        .select('id, name, surname, email, phone, cell_group_id, status')
        .order('name');

      if (error) {
        console.error('Error fetching members:', error);
      } else {
        setMembers(data || []);
      }
    } catch (error) {
      console.error('Error in fetchMembers:', error);
    }
  };

  const fetchEvents = async () => {
    try {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .order('event_date', { ascending: false });

      if (error) {
        console.error('Error fetching events:', error);
      } else {
        setEvents(data || []);
      }
    } catch (error) {
      console.error('Error fetching events:', error);
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
            cell_group_id
          )
        `)
        .eq('event_id', eventId);

      if (error) {
        console.error('Error fetching attendees:', error);
      } else {
        setAttendees(prev => {
          const filtered = prev.filter(attendee => attendee.event_id !== eventId);
          return [...filtered, ...(data as EventAttendee[])];
        });
      }
    } catch (error) {
      console.error('Error fetching attendees:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!canCreateCellGroups) {
      alert('You do not have permission to create cell groups');
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('cell_groups')
        .insert({
          name: formData.groupName,
          leader_id: formData.leaderId || null,
          location: formData.location || null,
          meeting_day: formData.meetingDay || null,
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating cell group:', error);
        alert(`Error creating cell group: ${error.message}`);
      } else {
        console.log('Created cell group:', data);
        setShowForm(false);
        setFormData({ groupName: '', leaderId: '', location: '', meetingDay: '' });
        fetchCellGroups();
      }
    } catch (error) {
      console.error('Error in handleSubmit:', error);
      alert('Error creating cell group');
    } finally {
      setLoading(false);
    }
  };

  // Action handlers
  const handleAddReport = (group: CellGroup) => {
    setSelectedGroup(group);
    setActiveAction('report');
    // Implement report functionality
    alert(`Add Report for ${group.name}\n\nThis would open a form to submit meeting minutes and attendance.`);
  };

  const handleAddMembers = (group: CellGroup) => {
    setSelectedGroup(group);
    setActiveAction('members');
    // Implement add members functionality
    alert(`Add Members to ${group.name}\n\nThis would open a form to add new members to the group.`);
  };

  const handleCreateEvent = (group: CellGroup) => {
    setSelectedGroup(group);
    setActiveAction('event');
  };

  const handleViewAnalytics = (group: CellGroup) => {
    setSelectedGroup(group);
    setActiveAction('analytics');
    // Implement analytics functionality
    alert(`View Analytics for ${group.name}\n\nThis would show group statistics and growth metrics.`);
  };

  const handleManageGroup = (group: CellGroup) => {
    setSelectedGroup(group);
    setActiveAction('manage');
    // Implement manage group functionality
    alert(`Manage ${group.name}\n\nThis would open group settings and configuration.`);
  };

  const handleViewDetails = (group: CellGroup) => {
    setSelectedGroup(group);
    setActiveAction('details');
    // Implement view details functionality
    alert(`View Details for ${group.name}\n\nThis would show complete group information and member list.`);
  };

  const handleEventSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGroup) return;

    setLoading(true);
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
        target_groups: !eventFormData.isWholeChurch ? [selectedGroup.id] : null,
      };

      const { error } = await supabase.from('events').insert([eventData]);

      if (error) {
        throw error;
      }

      setActiveAction(null);
      setEventFormData({ 
        name: '', 
        topic: '', 
        eventDate: '', 
        eventTime: '', 
        location: '',
        isWholeChurch: true,
        targetCellGroups: [],
      });
      alert('Event created successfully!');
      await fetchEvents();
      
    } catch (error: any) {
      console.error('Error creating event:', error);
      alert(error.message || 'Failed to create event. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Action cards configuration
  const getActionCards = (group: CellGroup) => {
    const cards = [
      {
        id: 'report',
        title: 'Add Report',
        description: 'Submit meeting minutes and attendance',
        icon: FileText,
        color: 'bg-blue-500',
        action: handleAddReport,
        show: canManageGroup(group.id)
      },
      {
        id: 'members',
        title: 'Add Members',
        description: 'Manage group members',
        icon: UserPlus,
        color: 'bg-green-500',
        action: handleAddMembers,
        show: canManageGroup(group.id)
      },
      {
        id: 'event',
        title: 'Create Event',
        description: 'Schedule new events',
        icon: Calendar,
        color: 'bg-purple-500',
        action: handleCreateEvent,
        show: canManageGroup(group.id)
      },
      {
        id: 'analytics',
        title: 'View Analytics',
        description: 'See group statistics',
        icon: BarChart3,
        color: 'bg-orange-500',
        action: handleViewAnalytics,
        show: canManageGroup(group.id) || profile?.isAdmin
      },
      {
        id: 'manage',
        title: 'Manage Group',
        description: 'Edit group settings',
        icon: Settings,
        color: 'bg-gray-500',
        action: handleManageGroup,
        show: canManageGroup(group.id)
      },
      {
        id: 'details',
        title: 'View Details',
        description: 'See complete information',
        icon: Eye,
        color: 'bg-indigo-500',
        action: handleViewDetails,
        show: true
      }
    ];

    return cards.filter(card => card.show);
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
        text: 'Group Event',
        icon: Users
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

  const getGroupEvents = (groupId: string) => {
    return events.filter(event => 
      event.target_groups?.includes(groupId) || event.is_whole_church
    );
  };

  if (loading && cellGroups.length === 0) {
    return (
      <div className="animate-fadeIn">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-foreground">Cell Groups</h1>
        </div>
        <div className="text-center py-8">Loading cell groups...</div>
      </div>
    );
  }

  return (
    <div className="animate-fadeIn min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
              Cell Groups
            </h1>
            <p className="text-gray-600 dark:text-gray-400">Manage church cell groups and activities</p>
          </div>
          {canCreateCellGroups && (
            <button
              onClick={() => setShowForm(!showForm)}
              disabled={loading}
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:shadow-lg transition-all duration-200 hover:scale-105 font-medium group"
            >
              <Plus className="h-5 w-5 group-hover:rotate-90 transition-transform duration-200" />
              {showForm ? 'Cancel' : 'Create Cell Group'}
            </button>
          )}
        </div>

        {/* Create Group Form */}
        {showForm && canCreateCellGroups && (
          <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-6 mb-8 shadow-lg hover:shadow-xl transition-all duration-300">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Create New Cell Group</h2>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Group Name *</label>
                  <input
                    type="text"
                    value={formData.groupName}
                    onChange={(e) => setFormData({ ...formData, groupName: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                    placeholder="Enter group name"
                    required
                    disabled={loading}
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Leader</label>
                  <select
                    value={formData.leaderId}
                    onChange={(e) => setFormData({ ...formData, leaderId: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                    required
                    disabled={loading}
                  >
                    <option value="">Select leader</option>
                    {members.map((member) => (
                      <option key={member.id} value={member.id}>
                        {member.name} {member.surname}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Location</label>
                  <input
                    type="text"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                    placeholder="Group location"
                    required
                    disabled={loading}
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Meeting Day</label>
                  <select
                    value={formData.meetingDay}
                    onChange={(e) => setFormData({ ...formData, meetingDay: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                    required
                    disabled={loading}
                  >
                    <option value="">Select day</option>
                    <option value="Monday">Monday</option>
                    <option value="Tuesday">Tuesday</option>
                    <option value="Wednesday">Wednesday</option>
                    <option value="Thursday">Thursday</option>
                    <option value="Friday">Friday</option>
                    <option value="Saturday">Saturday</option>
                    <option value="Sunday">Sunday</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:shadow-lg transition-all duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Creating...' : 'Create Group'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200 font-medium"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {!canCreateCellGroups && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-6">
            <p className="text-yellow-800">
              You have view-only access to cell groups. Contact an administrator to create or modify groups.
            </p>
          </div>
        )}

        {/* Create Event Form */}
        {activeAction === 'event' && selectedGroup && (
          <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-6 mb-8 shadow-lg hover:shadow-xl transition-all duration-300">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
              Create Event for {selectedGroup.name}
            </h2>
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
                        onChange={() => setEventFormData({ ...eventFormData, isWholeChurch: true })}
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
                      <Users className="h-5 w-5 text-orange-600" />
                      <div>
                        <div className="font-medium text-gray-900 dark:text-white">Group Event Only</div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">Only {selectedGroup.name} members</div>
                      </div>
                    </label>
                  </div>
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
                  onClick={() => setActiveAction(null)}
                  className="px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200 font-medium"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Groups List */}
        <div className="space-y-6">
          {cellGroups.length === 0 ? (
            <div className="text-center py-12 bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl border border-gray-200/50 dark:border-gray-700/50 rounded-2xl">
              <Users className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-600 dark:text-gray-400 mb-2">No Cell Groups Yet</h3>
              <p className="text-gray-500 dark:text-gray-500">Create your first cell group to get started</p>
            </div>
          ) : (
            cellGroups.map((group) => {
              const availableActions = getActionCards(group);
              const groupEvents = getGroupEvents(group.id);
              
              return (
                <div key={group.id} className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-6 hover:shadow-xl transition-all duration-300 hover:border-gray-300/50 dark:hover:border-gray-600/50 hover:scale-[1.02]">
                  <div className="flex flex-col lg:flex-row justify-between gap-6">
                    <div className="flex-1">
                      <div className="flex items-start gap-4 mb-4">
                        <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center flex-shrink-0 shadow-lg">
                          <Users className="h-7 w-7 text-white" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2 flex-wrap">
                            <h3 className="text-2xl font-bold text-gray-900 dark:text-white">{group.name}</h3>
                            <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full text-sm font-medium">
                              {group.member_count || 0} Members
                            </span>
                          </div>
                          
                          <div className="space-y-3 text-gray-600 dark:text-gray-400 ml-18">
                            <div className="flex items-center gap-3">
                              <Users className="h-4 w-4" />
                              <span className="font-medium">
                                Leader: {group.leader ? `${group.leader.name} ${group.leader.surname}` : 'No leader assigned'}
                              </span>
                            </div>
                            {group.location && (
                              <div className="flex items-center gap-3">
                                <MapPin className="h-4 w-4" />
                                <span className="font-medium">{group.location}</span>
                              </div>
                            )}
                            {group.meeting_day && (
                              <div className="flex items-center gap-3">
                                <CalendarIcon className="h-4 w-4" />
                                <span className="font-medium">Meets every {group.meeting_day}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Group Events */}
                      {groupEvents.length > 0 && (
                        <div className="mt-6">
                          <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Upcoming Events</h4>
                          <div className="space-y-3">
                            {groupEvents.slice(0, 3).map((event) => {
                              const scopeBadge = getEventScopeBadge(event);
                              const statusBadge = getEventStatusBadge(event);
                              const ScopeIcon = scopeBadge.icon;
                              const StatusIcon = statusBadge.icon;
                              
                              return (
                                <div key={event.id} className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4 border border-gray-200 dark:border-gray-600">
                                  <div className="flex items-center justify-between mb-2">
                                    <h5 className="font-semibold text-gray-900 dark:text-white">{event.name}</h5>
                                    <div className="flex items-center gap-2">
                                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusBadge.color}`}>
                                        <StatusIcon className="h-3 w-3 inline mr-1" />
                                        {statusBadge.text}
                                      </span>
                                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${scopeBadge.color}`}>
                                        <ScopeIcon className="h-3 w-3 inline mr-1" />
                                        {scopeBadge.text}
                                      </span>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                                    <div className="flex items-center gap-1">
                                      <CalendarIcon className="h-3 w-3" />
                                      <span>{formatDate(event.event_date)}</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                      <Clock className="h-3 w-3" />
                                      <span>{formatTime(event.event_time)}</span>
                                    </div>
                                    {event.location && (
                                      <div className="flex items-center gap-1">
                                        <MapPin className="h-3 w-3" />
                                        <span>{event.location}</span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Action Cards Grid */}
                    <div className="lg:w-64">
                      <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Quick Actions</h4>
                      <div className="grid grid-cols-2 lg:grid-cols-1 gap-3">
                        {availableActions.map((card) => {
                          const IconComponent = card.icon;
                          return (
                            <button
                              key={card.id}
                              onClick={() => card.action(group)}
                              className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-600/50 transition-all duration-200 group text-left"
                            >
                              <div className={`p-2 rounded-lg ${card.color} text-white group-hover:scale-110 transition-transform duration-200`}>
                                <IconComponent className="h-4 w-4" />
                              </div>
                              <div>
                                <div className="font-medium text-gray-900 dark:text-white text-sm">
                                  {card.title}
                                </div>
                                <div className="text-xs text-gray-500 dark:text-gray-400">
                                  {card.description}
                                </div>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

export default Groups;
