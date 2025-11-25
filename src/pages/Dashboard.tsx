import { useState, useEffect } from 'react';
import { 
  Users, 
  Calendar, 
  TrendingUp, 
  MoreVertical, 
  ArrowUp, 
  ArrowDown, 
  X,
  Plus,
  UserPlus,
  MapPin,
  Clock,
  ChevronDown,
  ChevronUp,
  PhoneCall,
  AlertTriangle,
  Eye,
  Search,
  Key,
  RefreshCw,
  Edit,
  Save,
  Trash2,
  FileText,
  Download,
  Upload,
  ExternalLink
} from 'lucide-react';
import { supabase } from '../integrations/supabase/client';
import { useAuth } from '../contexts/AuthContext';

// Types
interface Member {
  id: string;
  name: string;
  surname: string;
  email: string | null;
  phone: string | null;
  cell_group_id: string | null;
  invited_by: string | null;
  created_at: string | null;
  status: 'newcomer' | 'signed_member' | 'not_attending' | null;
  role?: string | null;
  permissions?: string[] | null;
  assigned_groups?: string[] | null;
  assigned_departments?: string[] | null;
  can_add_members?: boolean | null;
  can_edit_members?: boolean | null;
  can_view_own_data?: boolean | null;
  login_username?: string | null;
  login_pin?: string | null;
}

interface CellGroup {
  id: string;
  name: string;
}

interface Event {
  id: string;
  name: string;
  event_date: string;
  event_time: string;
  location: string | null;
  topic: string | null;
  created_at: string | null;
  pamphlet_url: string | null;
}

interface StatCard {
  icon: any;
  label: string;
  value: string;
  change: string;
  changeType: 'positive' | 'negative' | 'info';
  color: string;
  bgColor: string;
  action: string;
}

interface Activity {
  id: number;
  type: string;
  message: string;
  time: string;
  color: string;
  icon: any;
  action: () => void;
}

interface AbsentMember {
  id: string;
  name: string;
  surname: string;
  phone: string | null;
  consecutiveAbsences: number;
}

// Permission checking utilities
const hasPermission = (userPermissions: string[] = [], requiredPermission: string): boolean => {
  return userPermissions.includes(requiredPermission) || userPermissions.includes('admin_access');
};

const canEdit = (userRole: string | null | undefined, userPermissions: string[] = []): boolean => {
  return userRole === 'pastor' || userRole === 'admin' || hasPermission(userPermissions, 'admin_access');
};

const Dashboard = () => {
  const { profile } = useAuth();
  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [expandedSections, setExpandedSections] = useState<{[key: string]: boolean}>({
    events: true,
    activity: true
  });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [uploadingPamphlet, setUploadingPamphlet] = useState<string | null>(null);
  const [viewingPamphlet, setViewingPamphlet] = useState<string | null>(null);
  const [quickViewEvent, setQuickViewEvent] = useState<Event | null>(null);

  // Real data state
  const [stats, setStats] = useState<StatCard[]>([]);
  const [recentActivities, setRecentActivities] = useState<Activity[]>([]);
  const [upcomingEvents, setUpcomingEvents] = useState<Event[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [cellGroups, setCellGroups] = useState<CellGroup[]>([]);
  const [absentMembers, setAbsentMembers] = useState<AbsentMember[]>([]);

  // Form states
  const [newMember, setNewMember] = useState({
    name: '',
    surname: '',
    email: '',
    phone: '',
    invited_by: '',
    cell_group_id: ''
  });
  const [newEvent, setNewEvent] = useState({
    name: '',
    location: '',
    event_date: '',
    event_time: '',
    topic: ''
  });

  // Check user permissions
  const currentUserCanEdit = canEdit(profile?.role, profile?.permissions);
  const currentUserPermissions = profile?.permissions || [];

  // All users can see data - no filtering for viewing
  const getFilteredMembers = () => {
    return members;
  };

  const getFilteredEvents = () => {
    return upcomingEvents;
  };

  const getFilteredAbsentMembers = () => {
    return absentMembers;
  };

  // Load dashboard data from Supabase
  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Load members with additional fields for permissions
      const { data: membersData, error: membersError } = await supabase
        .from('members')
        .select('*')
        .order('created_at', { ascending: false });

      if (membersError) throw membersError;
      setMembers(membersData || []);

      // Load cell groups
      const { data: cellGroupsData, error: cellGroupsError } = await supabase
        .from('cell_groups')
        .select('id, name')
        .order('name');

      if (cellGroupsError) throw cellGroupsError;
      setCellGroups(cellGroupsData || []);

      // Load events with pamphlet URLs
      const { data: eventsData, error: eventsError } = await supabase
        .from('events')
        .select('*')
        .gte('event_date', new Date().toISOString().split('T')[0])
        .order('event_date', { ascending: true });

      if (eventsError) throw eventsError;
      setUpcomingEvents(eventsData || []);

      // Calculate stats with all data (everyone can see)
      calculateStats(membersData || [], eventsData || []);

      // Generate recent activities with all data
      generateRecentActivities(membersData || [], eventsData || []);

      // Load absent members
      await loadAbsentMembers();

    } catch (error) {
      console.error('Error loading dashboard data:', error);
      setError('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const loadAbsentMembers = async () => {
    try {
      // Get all Sunday Service events in descending order
      const { data: sundayEvents, error: eventsError } = await supabase
        .from('events')
        .select('id, event_date, name')
        .ilike('name', '%sunday%service%')
        .order('event_date', { ascending: false })
        .limit(10);

      if (eventsError) throw eventsError;
      if (!sundayEvents || sundayEvents.length < 2) {
        setAbsentMembers([]);
        return;
      }

      // Get the last 2 Sunday services
      const lastTwoSundays = sundayEvents.slice(0, 2);
      
      // Get all members
      const { data: allMembers, error: membersError } = await supabase
        .from('members')
        .select('id, name, surname, phone, assigned_groups, assigned_departments');

      if (membersError) throw membersError;
      if (!allMembers) {
        setAbsentMembers([]);
        return;
      }

      // Get attendance for the last 2 Sunday services
      const { data: attendances, error: attendanceError } = await supabase
        .from('event_attendees')
        .select('members_id, event_id')
        .in('event_id', lastTwoSundays.map(e => e.id));

      if (attendanceError) throw attendanceError;

      // Find members who were absent for both services
      const absent: AbsentMember[] = [];
      
      allMembers.forEach(member => {
        const memberAttendances = attendances?.filter(a => a.members_id === member.id) || [];
        
        // Check if member was absent for both Sundays (no attendance record = absent)
        const absentCount = lastTwoSundays.filter(sunday => {
          const hasAttendance = memberAttendances.some(a => a.event_id === sunday.id);
          return !hasAttendance; // No attendance record means absent
        }).length;

        if (absentCount === 2) {
          absent.push({
            id: member.id,
            name: member.name,
            surname: member.surname,
            phone: member.phone,
            consecutiveAbsences: 2
          });
        }
      });

      setAbsentMembers(absent);
    } catch (error) {
      console.error('Error loading absent members:', error);
      setAbsentMembers([]);
    }
  };

  const calculateStats = (allMembers: Member[], events: Event[]) => {
    const totalMembers = allMembers.length;
    const newcomers = allMembers.filter(m => m.status === 'newcomer').length;
    const signedMembers = allMembers.filter(m => m.status === 'signed_member').length;
    const upcomingEventsCount = events.length;
    
    const uniqueGroups = [...new Set(allMembers.map(m => m.cell_group_id).filter(Boolean))].length;

    const statsData: StatCard[] = [
      { 
        icon: Users, 
        label: 'Total Members', 
        value: totalMembers.toString(), 
        change: `${signedMembers} signed members`, 
        changeType: 'positive',
        color: 'from-blue-500 to-blue-600',
        bgColor: 'bg-blue-50 dark:bg-blue-950/20',
        action: 'viewMembers'
      },
      { 
        icon: Calendar, 
        label: 'Upcoming Events', 
        value: upcomingEventsCount.toString(), 
        change: events[0] ? `Next: ${events[0].name}` : 'No upcoming events',
        changeType: 'info',
        color: 'from-purple-500 to-purple-600',
        bgColor: 'bg-purple-50 dark:bg-purple-950/20',
        action: 'viewEvents'
      },
      { 
        icon: UserPlus, 
        label: 'Newcomers', 
        value: newcomers.toString(), 
        change: `${newcomers} new visitors`, 
        changeType: 'positive',
        color: 'from-green-500 to-green-600',
        bgColor: 'bg-green-50 dark:bg-green-950/20',
        action: 'viewMembers'
      },
      { 
        icon: TrendingUp, 
        label: 'Active Groups', 
        value: uniqueGroups.toString(), 
        change: `${uniqueGroups} cell groups`, 
        changeType: 'positive',
        color: 'from-orange-500 to-orange-600',
        bgColor: 'bg-orange-50 dark:bg-orange-950/20',
        action: 'viewGroups'
      },
      { 
        icon: AlertTriangle, 
        label: 'Absent 2 Sundays', 
        value: absentMembers.length.toString(), 
        change: absentMembers.length > 0 ? 'Need follow-up' : 'All members present',
        changeType: absentMembers.length > 0 ? 'negative' : 'positive',
        color: 'from-red-500 to-red-600',
        bgColor: 'bg-red-50 dark:bg-red-950/20',
        action: 'viewAbsentMembers'
      },
    ];

    setStats(statsData);
  };

  const generateRecentActivities = (allMembers: Member[], events: Event[]) => {
    const activities: Activity[] = [];

    // Add recent member joins
    const recentMembers = allMembers.slice(0, 3);
    recentMembers.forEach(member => {
      activities.push({
        id: activities.length + 1,
        type: 'member',
        message: `${member.name} ${member.surname} joined the church`,
        time: formatTimeAgo(member.created_at ? new Date(member.created_at) : new Date()),
        color: 'bg-green-500',
        icon: Users,
        action: () => openMemberDetail(member)
      });
    });

    // Add recent events
    const recentEvents = events.slice(0, 3);
    recentEvents.forEach(event => {
      activities.push({
        id: activities.length + 1,
        type: 'event',
        message: `Upcoming event: ${event.name}`,
        time: formatTimeAgo(new Date(event.event_date)),
        color: 'bg-blue-500',
        icon: Calendar,
        action: () => openEventDetail(event)
      });
    });

    setRecentActivities(activities.sort((a, b) => b.id - a.id).slice(0, 6));
  };

  const formatTimeAgo = (date: Date): string => {
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours} hours ago`;
    if (diffInHours < 168) return `${Math.floor(diffInHours / 24)} days ago`;
    return `${Math.floor(diffInHours / 168)} weeks ago`;
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

      // Update local state
      setUpcomingEvents(prev => prev.map(event => 
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

  // View pamphlet in modal
  const viewPamphlet = (pamphletUrl: string) => {
    setViewingPamphlet(pamphletUrl);
  };

  // Close pamphlet modal
  const closePamphletModal = () => {
    setViewingPamphlet(null);
  };

  // Quick view pamphlet on event card
  const openQuickView = (event: Event) => {
    setQuickViewEvent(event);
  };

  const closeQuickView = () => {
    setQuickViewEvent(null);
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  const openModal = (modalType: string) => {
    // Check permissions for editing modals only
    if ((modalType === 'addMember' || modalType === 'createEvent') && !currentUserCanEdit) {
      setError('You do not have permission to perform this action');
      return;
    }

    setActiveModal(modalType);
    setError(null);
  };

  const closeModal = () => {
    setActiveModal(null);
    setSelectedMember(null);
    setSelectedEvent(null);
    setEditingMember(null);
    // Reset form states
    setNewMember({ name: '', surname: '', email: '', phone: '', invited_by: '', cell_group_id: '' });
    setNewEvent({ name: '', location: '', event_date: '', event_time: '', topic: '' });
    setError(null);
  };

  const openMemberDetail = (member: Member) => {
    setSelectedMember(member);
    setActiveModal('memberDetail');
  };

  const openEventDetail = (event: Event) => {
    setSelectedEvent(event);
    setActiveModal('eventDetail');
  };

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const getChangeIcon = (type: string) => {
    if (type === 'positive') return <ArrowUp className="h-3 w-3" />;
    if (type === 'negative') return <ArrowDown className="h-3 w-3" />;
    return null;
  };

  // Add new member handler
  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { error } = await supabase
        .from('members')
        .insert([{
          name: newMember.name,
          surname: newMember.surname,
          email: newMember.email || null,
          phone: newMember.phone || null,
          invited_by: newMember.invited_by || null,
          cell_group_id: newMember.cell_group_id || null,
          status: 'newcomer'
        }]);

      if (error) throw error;
      
      alert('Member added successfully!');
      await loadDashboardData();
      closeModal();
    } catch (error) {
      console.error('Error adding member:', error);
      setError('Failed to add member');
    }
  };

  // Create event handler
  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { error } = await supabase
        .from('events')
        .insert([{
          name: newEvent.name,
          event_date: newEvent.event_date,
          event_time: newEvent.event_time,
          location: newEvent.location || null,
          topic: newEvent.topic || null
        }]);

      if (error) throw error;
      
      alert('Event created successfully!');
      await loadDashboardData();
      closeModal();
    } catch (error) {
      console.error('Error creating event:', error);
      setError('Failed to create event');
    }
  };

  // Edit member handler
  const handleEditMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMember) return;

    try {
      const { error } = await supabase
        .from('members')
        .update({
          name: editingMember.name,
          surname: editingMember.surname,
          email: editingMember.email,
          phone: editingMember.phone,
          invited_by: editingMember.invited_by,
          cell_group_id: editingMember.cell_group_id,
          status: editingMember.status
        })
        .eq('id', editingMember.id);

      if (error) throw error;
      
      alert('Member updated successfully!');
      await loadDashboardData();
      setEditingMember(null);
      closeModal();
    } catch (error) {
      console.error('Error updating member:', error);
      setError('Failed to update member');
    }
  };

  // Delete member handler
  const handleDeleteMember = async (memberId: string) => {
    if (!confirm('Are you sure you want to delete this member?')) return;

    try {
      const { error } = await supabase
        .from('members')
        .delete()
        .eq('id', memberId);

      if (error) throw error;
      
      alert('Member deleted successfully!');
      await loadDashboardData();
      closeModal();
    } catch (error) {
      console.error('Error deleting member:', error);
      setError('Failed to delete member');
    }
  };

  const Modal = ({ children, title, size = 'max-w-md' }: { children: React.ReactNode; title: string; size?: string }) => (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className={`bg-white rounded-2xl ${size} w-full max-h-[90vh] overflow-y-auto shadow-2xl`}>
        <div className="flex justify-between items-center p-6 border-b border-gray-200">
          <h3 className="text-2xl font-bold text-gray-900">{title}</h3>
          <button 
            onClick={closeModal}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="p-6">
          {children}
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-6 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  const filteredMembers = getFilteredMembers();
  const filteredEvents = getFilteredEvents();
  const filteredAbsentMembers = getFilteredAbsentMembers();

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-6 animate-fadeIn">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
            Dashboard
          </h1>
          <p className="text-foreground/60">
            {currentUserCanEdit 
              ? 'Welcome to your church management dashboard' 
              : `Welcome - ${profile?.role || 'Member'} access`
            }
          </p>
          {!currentUserCanEdit && (
            <p className="text-sm text-gray-500 mt-1">
              View-only access - contact pastor/admin for edits
            </p>
          )}
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={loadDashboardData}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors font-medium disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            {loading ? 'Refreshing...' : 'Refresh'}
          </button>
          <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center text-white font-semibold">
            {profile?.name?.charAt(0)}{profile?.surname?.charAt(0) || 'U'}
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
          <div className="flex items-center justify-between">
            <p className="text-red-700 font-medium">{error}</p>
            <button onClick={() => setError(null)} className="text-red-500 hover:text-red-700">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-6">
          <div className="flex items-center justify-between">
            <p className="text-green-700 font-medium">{success}</p>
            <button onClick={() => setSuccess(null)} className="text-green-500 hover:text-green-700">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Stats Grid - All users can see */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat) => (
          <button
            key={stat.label}
            onClick={() => openModal(stat.action)}
            className="group relative bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-6 hover:scale-105 transition-all duration-300 hover:shadow-xl hover:border-gray-300/50 dark:hover:border-gray-600/50 text-left focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <div className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${stat.color} opacity-5 group-hover:opacity-10 transition-opacity duration-300`} />
            
            <div className="relative z-10">
              <div className="flex justify-between items-start mb-4">
                <div className={`p-3 rounded-xl ${stat.bgColor}`}>
                  <stat.icon className="h-6 w-6 text-gray-700 dark:text-gray-300" />
                </div>
                <MoreVertical className="h-5 w-5 text-gray-400 cursor-pointer hover:text-gray-600 transition-colors" />
              </div>
              
              <h3 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                {stat.value}
              </h3>
              <p className="text-gray-600 dark:text-gray-400 text-sm font-medium mb-3">
                {stat.label}
              </p>
              
              <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                stat.changeType === 'positive' 
                  ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                  : stat.changeType === 'negative'
                  ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
                  : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
              }`}>
                {getChangeIcon(stat.changeType)}
                {stat.change}
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* Content Grid - All users can see */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activity */}
        <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl border border-gray-200/50 dark:border-gray-700/50 rounded-2xl hover:shadow-lg transition-all duration-300">
          <button 
            onClick={() => toggleSection('activity')}
            className="w-full flex justify-between items-center p-6 hover:bg-gray-50/50 dark:hover:bg-gray-700/30 transition-colors rounded-t-2xl"
          >
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Recent Activity</h2>
            {expandedSections.activity ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
          </button>
          
          {expandedSections.activity && (
            <div className="p-6 pt-0">
              <div className="space-y-4">
                {recentActivities.map((activity) => (
                  <button
                    key={activity.id}
                    onClick={activity.action}
                    className="w-full flex items-center gap-4 p-3 rounded-xl hover:bg-gray-50/50 dark:hover:bg-gray-700/30 transition-colors duration-200 group text-left focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-inset"
                  >
                    <div className={`w-10 h-10 rounded-full ${activity.color} flex items-center justify-center flex-shrink-0`}>
                      <activity.icon className="h-5 w-5 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-gray-900 dark:text-white font-medium truncate">
                        {activity.message}
                      </p>
                      <p className="text-gray-500 dark:text-gray-400 text-sm">
                        {activity.time}
                      </p>
                    </div>
                    <div className="w-2 h-2 rounded-full bg-gray-300 group-hover:bg-gray-400 transition-colors" />
                  </button>
                ))}
                {recentActivities.length === 0 && (
                  <p className="text-gray-500 dark:text-gray-400 text-center py-4">No recent activity</p>
                )}
              </div>
              <button 
                onClick={() => openModal('viewMembers')}
                className="w-full mt-4 text-center text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium transition-colors py-2"
              >
                View All Activity
              </button>
            </div>
          )}
        </div>

        {/* Upcoming Events */}
        <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl border border-gray-200/50 dark:border-gray-700/50 rounded-2xl hover:shadow-lg transition-all duration-300">
          <button 
            onClick={() => toggleSection('events')}
            className="w-full flex justify-between items-center p-6 hover:bg-gray-50/50 dark:hover:bg-gray-700/30 transition-colors rounded-t-2xl"
          >
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Upcoming Events</h2>
            {expandedSections.events ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
          </button>
          
          {expandedSections.events && (
            <div className="p-6 pt-0">
              <div className="space-y-4">
                {filteredEvents.map((event) => (
                  <div
                    key={event.id}
                    className="w-full border-l-4 border-blue-400 pl-4 py-3 rounded-r-lg hover:bg-gray-50/50 dark:hover:bg-gray-700/30 transition-colors duration-200 group"
                  >
                    <div className="flex justify-between items-start mb-1">
                      <h3 className="font-semibold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                        {event.name}
                      </h3>
                      <span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded-full">
                        {event.event_date}
                      </span>
                    </div>
                    <p className="text-gray-600 dark:text-gray-400 text-sm mb-1">
                      {event.event_time}
                    </p>
                    <p className="text-gray-500 dark:text-gray-400 text-xs flex items-center gap-1 mb-2">
                      <MapPin className="h-3 w-3" />
                      {event.location || 'No location'}
                    </p>
                    
                    {/* Pamphlet Section on Event Card */}
                    {event.pamphlet_url && (
                      <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-200 dark:border-gray-600">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-green-600" />
                          <span className="text-xs text-green-600 font-medium">Pamphlet Available</span>
                        </div>
                        <div className="flex gap-1">
                          <button
                            onClick={() => openQuickView(event)}
                            className="p-1.5 bg-blue-100 hover:bg-blue-200 text-blue-600 rounded-lg transition-colors duration-200"
                            title="Quick View"
                          >
                            <Eye className="h-3 w-3" />
                          </button>
                          <a
                            href={event.pamphlet_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 bg-green-100 hover:bg-green-200 text-green-600 rounded-lg transition-colors duration-200"
                            title="Download"
                          >
                            <Download className="h-3 w-3" />
                          </a>
                        </div>
                      </div>
                    )}

                    {/* Upload Option for Admins */}
                    {currentUserCanEdit && !event.pamphlet_url && (
                      <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-600">
                        <label className="flex items-center gap-2 text-xs text-blue-600 hover:text-blue-700 cursor-pointer w-fit">
                          <Upload className="h-3 w-3" />
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
                  </div>
                ))}
                {filteredEvents.length === 0 && (
                  <p className="text-gray-500 dark:text-gray-400 text-center py-4">No upcoming events</p>
                )}
              </div>
              <button 
                onClick={() => openModal('viewEvents')}
                className="w-full mt-4 text-center text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium transition-colors py-2"
              >
                View Calendar
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions - Only show if user has edit permissions */}
      {currentUserCanEdit && (
        <div className="mt-6 bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Quick Actions</h2>
          <div className="flex flex-wrap gap-3">
            <button 
              onClick={() => openModal('addMember')}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-all duration-200 hover:scale-105 font-medium"
            >
              <UserPlus className="h-4 w-4" />
              Add New Member
            </button>
            <button 
              onClick={() => openModal('createEvent')}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-xl transition-all duration-200 hover:scale-105 font-medium"
            >
              <Plus className="h-4 w-4" />
              Create Event
            </button>
          </div>
        </div>
      )}

      {/* Quick View Pamphlet Modal */}
      {quickViewEvent && quickViewEvent.pamphlet_url && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden shadow-2xl">
            <div className="flex justify-between items-center p-4 border-b border-gray-200">
              <div>
                <h3 className="text-lg font-bold text-gray-900">{quickViewEvent.name}</h3>
                <p className="text-sm text-gray-600">Event Pamphlet</p>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={quickViewEvent.pamphlet_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 bg-green-100 hover:bg-green-200 text-green-600 rounded-lg transition-colors duration-200"
                  title="Open in new tab"
                >
                  <ExternalLink className="h-4 w-4" />
                </a>
                <button
                  onClick={closeQuickView}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors duration-200"
                >
                  <X className="h-5 w-5 text-gray-500" />
                </button>
              </div>
            </div>
            <div className="p-4 h-96">
              <iframe
                src={quickViewEvent.pamphlet_url}
                className="w-full h-full rounded-lg border border-gray-200"
                title="Event Pamphlet"
              />
            </div>
            <div className="p-4 border-t border-gray-200 bg-gray-50">
              <div className="flex justify-between items-center">
                <div className="text-sm text-gray-600">
                  <p><strong>Date:</strong> {quickViewEvent.event_date}</p>
                  <p><strong>Time:</strong> {quickViewEvent.event_time}</p>
                  {quickViewEvent.location && <p><strong>Location:</strong> {quickViewEvent.location}</p>}
                </div>
                <a
                  href={quickViewEvent.pamphlet_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-all duration-200 font-medium"
                >
                  <Download className="h-4 w-4" />
                  Download
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Rest of the modals (member detail, event detail, etc.) remain the same */}
      {activeModal === 'viewMembers' && (
        <Modal title="Members" size="max-w-4xl">
          <div className="space-y-4">
            <p className="text-gray-600 dark:text-gray-400">
              All church members
            </p>
            
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search members by name, email, or phone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="space-y-3 max-h-96 overflow-y-auto">
              {filteredMembers
                .filter(member => 
                  `${member.name} ${member.surname}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
                  (member.email && member.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
                  (member.phone && member.phone.includes(searchTerm))
                )
                .map(member => (
                <div key={member.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-semibold">
                      {member.name.charAt(0)}{member.surname.charAt(0)}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{member.name} {member.surname}</p>
                      <p className="text-sm text-gray-500">{member.email || member.phone || 'No contact'}</p>
                      {member.login_username && (
                        <p className="text-xs text-blue-600 mt-1 flex items-center gap-1">
                          <Key className="h-3 w-3" />
                          Login: {member.login_username}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => openMemberDetail(member)}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium"
                    >
                      <Eye className="h-4 w-4" />
                      View Details
                    </button>
                    {currentUserCanEdit && (
                      <button 
                        onClick={() => {
                          setEditingMember(member);
                          setActiveModal('editMember');
                        }}
                        className="flex items-center gap-2 px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg transition-colors font-medium"
                      >
                        <Edit className="h-4 w-4" />
                        Edit
                      </button>
                    )}
                  </div>
                </div>
              ))}
              {filteredMembers.length === 0 && (
                <p className="text-gray-500 dark:text-gray-400 text-center py-4">
                  No members found
                </p>
              )}
            </div>
          </div>
        </Modal>
      )}

      {/* ... (other modals remain the same) ... */}

      {/* Pamphlet Viewer Modal */}
      {viewingPamphlet && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h3 className="text-xl font-bold text-gray-900">Event Pamphlet</h3>
              <button
                onClick={closePamphletModal}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors duration-200"
              >
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>
            <div className="p-6 max-h-[70vh] overflow-auto">
              <iframe
                src={viewingPamphlet}
                className="w-full h-96 rounded-lg border border-gray-200"
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
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-all duration-200"
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

export default Dashboard;
