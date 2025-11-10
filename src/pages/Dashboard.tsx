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
  Crown,
  User
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
  description: string | null;
  leader_id: string | null;
  location: string | null;
  meeting_day: string | null;
  meeting_time: string | null;
  current_member_count: number;
  status: string;
  login_username: string | null;
  created_at: string;
  updated_at: string;
}

interface Event {
  id: string;
  name: string;
  event_date: string;
  event_time: string;
  location: string | null;
  topic: string | null;
  created_at: string | null;
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

interface UserCellGroupInfo {
  groupName: string | null;
  leaderName: string | null;
  leaderSurname: string | null;
  meetingDay: string | null;
  meetingTime: string | null;
  location: string | null;
}

// Interface for the SQL query result
interface UserCellGroupQueryResult {
  group_id: string;
  group_name: string;
  location: string | null;
  meeting_day: string | null;
  meeting_time: string | null;
  status: string;
  leader_name: string;
  leader_surname: string;
  leader_id: string;
}

// Permission checking utility
const hasPermission = (userPermissions: string[] = [], requiredPermission: string): boolean => {
  return userPermissions.includes(requiredPermission) || userPermissions.includes('admin_access');
};

const Dashboard = () => {
  const { profile } = useAuth();
  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [expandedSections, setExpandedSections] = useState<{[key: string]: boolean}>({
    events: true,
    activity: true,
    userInfo: true,
    userGroups: true
  });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Real data state
  const [stats, setStats] = useState<StatCard[]>([]);
  const [recentActivities, setRecentActivities] = useState<Activity[]>([]);
  const [upcomingEvents, setUpcomingEvents] = useState<Event[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [cellGroups, setCellGroups] = useState<CellGroup[]>([]);
  const [absentMembers, setAbsentMembers] = useState<AbsentMember[]>([]);
  const [userCellGroupInfo, setUserCellGroupInfo] = useState<UserCellGroupInfo | null>(null);
  
  // State for the SQL query results
  const [userCellGroups, setUserCellGroups] = useState<UserCellGroupQueryResult[]>([]);

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

  // Get user's full name
  const userFullName = profile ? `${profile.name || ''} ${profile.surname || ''}`.trim() : 'User';

  // Check if current user has admin access
  const currentUserIsAdmin = profile?.isAdmin || (profile?.permissions && hasPermission(profile.permissions, 'admin_access'));
  const currentUserPermissions = profile?.permissions || [];

  // Execute the SQL query using Supabase
  const fetchUserCellGroups = async () => {
    try {
      if (!profile?.id) {
        console.log('No user profile ID available');
        return [];
      }

      console.log(`Executing SQL query for user ID: ${profile.id}`);

      // Get cell groups where user is the leader
      const { data: cellGroupsData, error: groupsError } = await supabase
        .from('cell_groups')
        .select('*')
        .eq('leader_id', profile.id)
        .eq('status', 'active')
        .order('name');

      if (groupsError) {
        console.error('Error fetching cell groups:', groupsError);
        return [];
      }

      // Transform the data to match the SQL query result structure
      const userGroups: UserCellGroupQueryResult[] = (cellGroupsData || []).map(group => ({
        group_id: group.id,
        group_name: group.name,
        location: group.location,
        meeting_day: group.meeting_day,
        meeting_time: group.meeting_time,
        status: group.status || 'active',
        leader_name: profile.name || '',
        leader_surname: profile.surname || '',
        leader_id: group.leader_id || ''
      }));

      console.log(`Found ${userGroups.length} cell groups for user: ${profile.name} ${profile.surname}`);
      return userGroups;
    } catch (error) {
      console.error('Error fetching user cell groups:', error);
      return [];
    }
  };

  // Load user's cell group information
  const loadUserCellGroupInfo = async () => {
    if (!profile?.cell_group_id) {
      setUserCellGroupInfo(null);
      return;
    }

    try {
      const { data: userGroupInfo, error } = await supabase
        .from('cell_groups')
        .select(`
          name,
          description,
          leader_id,
          location,
          meeting_day,
          meeting_time,
          members!cell_groups_leader_id_fkey (
            name,
            surname
          )
        `)
        .eq('id', profile.cell_group_id)
        .single();

      if (error) {
        console.error('Error fetching user cell group info:', error);
        return;
      }

      if (userGroupInfo) {
        setUserCellGroupInfo({
          groupName: userGroupInfo.name,
          leaderName: userGroupInfo.members?.name || null,
          leaderSurname: userGroupInfo.members?.surname || null,
          meetingDay: userGroupInfo.meeting_day,
          meetingTime: userGroupInfo.meeting_time,
          location: userGroupInfo.location
        });
      }
    } catch (error) {
      console.error('Error loading user cell group info:', error);
    }
  };

  // Filter data based on user permissions
  const getFilteredMembers = () => {
    let filtered = [...members];

    if (!currentUserIsAdmin) {
      if (profile?.assigned_groups && profile.assigned_groups.length > 0) {
        filtered = filtered.filter(member => 
          member.assigned_groups?.some(group => profile.assigned_groups?.includes(group))
        );
      }
      if (profile?.assigned_departments && profile.assigned_departments.length > 0) {
        filtered = filtered.filter(member => 
          member.assigned_departments?.some(dept => profile.assigned_departments?.includes(dept))
        );
      }
    }

    return filtered;
  };

  const getFilteredEvents = () => {
    return upcomingEvents;
  };

  const getFilteredAbsentMembers = () => {
    let filtered = [...absentMembers];

    if (!currentUserIsAdmin) {
      if (profile?.assigned_groups && profile.assigned_groups.length > 0) {
        filtered = filtered.filter(absentMember => {
          const member = members.find(m => m.id === absentMember.id);
          return member?.assigned_groups?.some(group => profile.assigned_groups?.includes(group));
        });
      }
      if (profile?.assigned_departments && profile.assigned_departments.length > 0) {
        filtered = filtered.filter(absentMember => {
          const member = members.find(m => m.id === absentMember.id);
          return member?.assigned_departments?.some(dept => profile.assigned_departments?.includes(dept));
        });
      }
    }

    return filtered;
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
        .select('*')
        .order('name');

      if (cellGroupsError) throw cellGroupsError;
      setCellGroups(cellGroupsData || []);

      // Load events
      const { data: eventsData, error: eventsError } = await supabase
        .from('events')
        .select('*')
        .gte('event_date', new Date().toISOString().split('T')[0])
        .order('event_date', { ascending: true });

      if (eventsError) throw eventsError;
      setUpcomingEvents(eventsData || []);

      // Load user's cell group information
      await loadUserCellGroupInfo();

      // Load user's cell groups using the SQL query
      const userGroups = await fetchUserCellGroups();
      setUserCellGroups(userGroups);

      // Calculate stats with filtered data
      const filteredMembers = getFilteredMembers();
      calculateStats(filteredMembers, eventsData || []);

      // Generate recent activities with filtered data
      generateRecentActivities(filteredMembers, eventsData || []);

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

      const lastTwoSundays = sundayEvents.slice(0, 2);
      
      const { data: allMembers, error: membersError } = await supabase
        .from('members')
        .select('id, name, surname, phone, assigned_groups, assigned_departments');

      if (membersError) throw membersError;
      if (!allMembers) {
        setAbsentMembers([]);
        return;
      }

      const { data: attendances, error: attendanceError } = await supabase
        .from('event_attendees')
        .select('members_id, event_id')
        .in('event_id', lastTwoSundays.map(e => e.id));

      if (attendanceError) throw attendanceError;

      const absent: AbsentMember[] = [];
      
      allMembers.forEach(member => {
        const memberAttendances = attendances?.filter(a => a.members_id === member.id) || [];
        
        const absentCount = lastTwoSundays.filter(sunday => {
          const hasAttendance = memberAttendances.some(a => a.event_id === sunday.id);
          return !hasAttendance;
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

  const calculateStats = (filteredMembers: Member[], events: Event[]) => {
    const totalMembers = filteredMembers.length;
    const newcomers = filteredMembers.filter(m => m.status === 'newcomer').length;
    const signedMembers = filteredMembers.filter(m => m.status === 'signed_member').length;
    const upcomingEventsCount = events.length;
    
    const uniqueGroups = [...new Set(filteredMembers.map(m => m.cell_group_id).filter(Boolean))].length;
    const filteredAbsentMembers = getFilteredAbsentMembers();

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
        value: filteredAbsentMembers.length.toString(), 
        change: filteredAbsentMembers.length > 0 ? 'Need follow-up' : 'All members present',
        changeType: filteredAbsentMembers.length > 0 ? 'negative' : 'positive',
        color: 'from-red-500 to-red-600',
        bgColor: 'bg-red-50 dark:bg-red-950/20',
        action: 'viewAbsentMembers'
      },
    ];

    setStats(statsData);
  };

  const generateRecentActivities = (filteredMembers: Member[], events: Event[]) => {
    const activities: Activity[] = [];

    // Add recent member joins (only from filtered members)
    const recentMembers = filteredMembers.slice(0, 3);
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

  useEffect(() => {
    loadDashboardData();
  }, []);

  const openModal = (modalType: string) => {
    if (modalType === 'viewMembers' && !currentUserIsAdmin && !hasPermission(currentUserPermissions, 'view_members')) {
      setError('You do not have permission to view all members');
      return;
    }
    
    if (modalType === 'addMember' && !currentUserIsAdmin && !hasPermission(currentUserPermissions, 'add_members')) {
      setError('You do not have permission to add members');
      return;
    }
    
    if (modalType === 'createEvent' && !currentUserIsAdmin && !hasPermission(currentUserPermissions, 'manage_events')) {
      setError('You do not have permission to create events');
      return;
    }

    setActiveModal(modalType);
    setError(null);
  };

  const closeModal = () => {
    setActiveModal(null);
    setSelectedMember(null);
    setSelectedEvent(null);
    setNewMember({ name: '', surname: '', email: '', phone: '', invited_by: '', cell_group_id: '' });
    setNewEvent({ name: '', location: '', event_date: '', event_time: '', topic: '' });
    setError(null);
  };

  const openMemberDetail = (member: Member) => {
    if (!currentUserIsAdmin) {
      if (profile?.assigned_groups && profile.assigned_groups.length > 0) {
        const hasAccess = member.assigned_groups?.some(group => profile.assigned_groups?.includes(group));
        if (!hasAccess) {
          if (profile?.assigned_departments && profile.assigned_departments.length > 0) {
            const hasDeptAccess = member.assigned_departments?.some(dept => profile.assigned_departments?.includes(dept));
            if (!hasDeptAccess) {
              setError('You do not have permission to view this member');
              return;
            }
          } else {
            setError('You do not have permission to view this member');
            return;
          }
        }
      }
    }

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
            Welcome, {userFullName}
          </h1>
          <p className="text-foreground/60">
            {currentUserIsAdmin 
              ? 'Welcome to your church management dashboard' 
              : `Welcome - ${profile?.role} access`
            }
          </p>
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

      {/* User's Cell Groups Section - SQL Query Results */}
      <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-6 mb-6 hover:shadow-lg transition-all duration-300">
        <button 
          onClick={() => toggleSection('userGroups')}
          className="w-full flex justify-between items-center hover:bg-gray-50/50 dark:hover:bg-gray-700/30 transition-colors rounded-t-2xl"
        >
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">My Cell Groups (SQL Query Results)</h2>
          {expandedSections.userGroups ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
        </button>
        
        {expandedSections.userGroups && (
          <div className="pt-4">
            {/* SQL Query Display */}
            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4 mb-6">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-3">SQL Query Being Executed:</h3>
              <code className="bg-gray-100 dark:bg-gray-600 p-3 rounded text-sm block overflow-x-auto">
                {`SELECT
  cg.id AS group_id,
  cg.name AS group_name,
  cg.location,
  cg.meeting_day,
  cg.meeting_time,
  cg.status,
  m.name AS leader_name,
  m.surname AS leader_surname
FROM public.cell_groups cg
JOIN public.members m
  ON cg.leader_id = m.id
WHERE
  cg.status = 'active'
  AND m.id = '${profile?.id}';`}
              </code>
            </div>

            {/* Results */}
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-4">
                Query Results ({userCellGroups.length} cell groups found)
              </h3>

              {userCellGroups.length === 0 ? (
                <div className="text-center py-8">
                  <Users className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <h4 className="text-lg font-semibold text-gray-600 dark:text-gray-400 mb-2">No Cell Groups Found</h4>
                  <p className="text-gray-500 dark:text-gray-500">
                    No active cell groups found where you are the designated leader.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left text-gray-700 dark:text-gray-300">
                    <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-300">
                      <tr>
                        <th className="px-4 py-3">Group ID</th>
                        <th className="px-4 py-3">Group Name</th>
                        <th className="px-4 py-3">Location</th>
                        <th className="px-4 py-3">Meeting Day</th>
                        <th className="px-4 py-3">Meeting Time</th>
                        <th className="px-4 py-3">Status</th>
                        <th className="px-4 py-3">Leader Name</th>
                        <th className="px-4 py-3">Leader Surname</th>
                        <th className="px-4 py-3">Leader ID</th>
                      </tr>
                    </thead>
                    <tbody>
                      {userCellGroups.map((group) => (
                        <tr key={group.group_id} className="bg-white dark:bg-gray-800 border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600">
                          <td className="px-4 py-3 font-mono text-xs">{group.group_id}</td>
                          <td className="px-4 py-3 font-medium">{group.group_name}</td>
                          <td className="px-4 py-3">{group.location || 'N/A'}</td>
                          <td className="px-4 py-3">{group.meeting_day || 'N/A'}</td>
                          <td className="px-4 py-3">{group.meeting_time || 'N/A'}</td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-1 rounded-full text-xs ${
                              group.status === 'active' 
                                ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
                                : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                            }`}>
                              {group.status}
                            </span>
                          </td>
                          <td className="px-4 py-3">{group.leader_name}</td>
                          <td className="px-4 py-3">{group.leader_surname}</td>
                          <td className="px-4 py-3 font-mono text-xs">{group.leader_id}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6 mb-8">
        {stats.map((stat, index) => (
          <div
            key={index}
            className={`${stat.bgColor} rounded-2xl p-6 hover:shadow-lg transition-all duration-300 border border-gray-200/50 dark:border-gray-700/50 backdrop-blur-sm`}
          >
            <div className="flex justify-between items-start mb-4">
              <div className={`p-3 rounded-xl bg-gradient-to-r ${stat.color}`}>
                <stat.icon className="h-6 w-6 text-white" />
              </div>
              <button className="p-2 hover:bg-white/20 rounded-lg transition-colors">
                <MoreVertical className="h-4 w-4 text-gray-600 dark:text-gray-400" />
              </button>
            </div>
            
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              {stat.value}
            </h3>
            
            <p className="text-gray-600 dark:text-gray-400 text-sm mb-3">
              {stat.label}
            </p>
            
            <div className={`flex items-center gap-1 text-sm ${
              stat.changeType === 'positive' ? 'text-green-600 dark:text-green-400' :
              stat.changeType === 'negative' ? 'text-red-600 dark:text-red-400' :
              'text-blue-600 dark:text-blue-400'
            }`}>
              {getChangeIcon(stat.changeType)}
              <span>{stat.change}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        {/* Recent Activity */}
        <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-6 hover:shadow-lg transition-all duration-300">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Recent Activity</h2>
            <button 
              onClick={() => toggleSection('activity')}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              {expandedSections.activity ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
            </button>
          </div>
          
          {expandedSections.activity && (
            <div className="space-y-4">
              {recentActivities.map((activity) => (
                <div
                  key={activity.id}
                  className="flex items-center gap-4 p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded-xl transition-colors cursor-pointer"
                  onClick={activity.action}
                >
                  <div className={`p-2 rounded-lg ${activity.color}`}>
                    <activity.icon className="h-4 w-4 text-white" />
                  </div>
                  <div className="flex-1">
                    <p className="text-gray-900 dark:text-white font-medium">
                      {activity.message}
                    </p>
                    <p className="text-gray-500 dark:text-gray-400 text-sm">
                      {activity.time}
                    </p>
                  </div>
                  <button className="p-2 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors">
                    <Eye className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Upcoming Events */}
        <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-6 hover:shadow-lg transition-all duration-300">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Upcoming Events</h2>
            <div className="flex items-center gap-2">
              <button 
                onClick={() => toggleSection('events')}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                {expandedSections.events ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
              </button>
              {currentUserIsAdmin && (
                <button 
                  onClick={() => openModal('createEvent')}
                  className="flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm font-medium"
                >
                  <Plus className="h-4 w-4" />
                  Add Event
                </button>
              )}
            </div>
          </div>
          
          {expandedSections.events && (
            <div className="space-y-4">
              {filteredEvents.slice(0, 5).map((event) => (
                <div
                  key={event.id}
                  className="flex items-center gap-4 p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded-xl transition-colors cursor-pointer border border-gray-200/50 dark:border-gray-600/50"
                  onClick={() => openEventDetail(event)}
                >
                  <div className="p-3 rounded-xl bg-blue-100 dark:bg-blue-900/20">
                    <Calendar className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 dark:text-white">
                      {event.name}
                    </h3>
                    <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400 mt-1">
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        {new Date(event.event_date).toLocaleDateString()} at {event.event_time}
                      </div>
                      {event.location && (
                        <div className="flex items-center gap-1">
                          <MapPin className="h-4 w-4" />
                          {event.location}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              
              {filteredEvents.length === 0 && (
                <div className="text-center py-8">
                  <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-500 dark:text-gray-400">No upcoming events</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* User Cell Group Information */}
      {userCellGroupInfo && (
        <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-6 mt-8 hover:shadow-lg transition-all duration-300">
          <button 
            onClick={() => toggleSection('userInfo')}
            className="w-full flex justify-between items-center hover:bg-gray-50/50 dark:hover:bg-gray-700/30 transition-colors rounded-t-2xl"
          >
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">My Cell Group</h2>
            {expandedSections.userInfo ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
          </button>
          
          {expandedSections.userInfo && (
            <div className="pt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-950/20 dark:to-purple-950/20 rounded-xl p-4">
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                    <User className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    Your Information
                  </h3>
                  <div className="space-y-2">
                    <p className="text-gray-700 dark:text-gray-300">
                      <span className="font-medium">Name:</span> {profile?.name} {profile?.surname}
                    </p>
                    <p className="text-gray-700 dark:text-gray-300">
                      <span className="font-medium">Role:</span> {profile?.role || 'Member'}
                    </p>
                    <p className="text-gray-700 dark:text-gray-300">
                      <span className="font-medium">Email:</span> {profile?.email || 'Not provided'}
                    </p>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 rounded-xl p-4">
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                    <Users className="h-5 w-5 text-green-600 dark:text-green-400" />
                    Cell Group Details
                  </h3>
                  <div className="space-y-2">
                    <p className="text-gray-700 dark:text-gray-300">
                      <span className="font-medium">Group:</span> {userCellGroupInfo.groupName}
                    </p>
                    {userCellGroupInfo.leaderName && (
                      <p className="text-gray-700 dark:text-gray-300">
                        <span className="font-medium">Leader:</span> {userCellGroupInfo.leaderName} {userCellGroupInfo.leaderSurname}
                      </p>
                    )}
                    {userCellGroupInfo.meetingDay && userCellGroupInfo.meetingTime && (
                      <p className="text-gray-700 dark:text-gray-300">
                        <span className="font-medium">Meets:</span> {userCellGroupInfo.meetingDay} at {userCellGroupInfo.meetingTime}
                      </p>
                    )}
                    {userCellGroupInfo.location && (
                      <p className="text-gray-700 dark:text-gray-300">
                        <span className="font-medium">Location:</span> {userCellGroupInfo.location}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      {activeModal === 'createEvent' && (
        <Modal title="Create New Event" size="max-w-md">
          <form onSubmit={handleCreateEvent} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Event Name</label>
              <input
                type="text"
                required
                value={newEvent.name}
                onChange={(e) => setNewEvent({...newEvent, name: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
              <input
                type="text"
                value={newEvent.location}
                onChange={(e) => setNewEvent({...newEvent, location: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                <input
                  type="date"
                  required
                  value={newEvent.event_date}
                  onChange={(e) => setNewEvent({...newEvent, event_date: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Time</label>
                <input
                  type="time"
                  required
                  value={newEvent.event_time}
                  onChange={(e) => setNewEvent({...newEvent, event_time: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Topic (Optional)</label>
              <input
                type="text"
                value={newEvent.topic}
                onChange={(e) => setNewEvent({...newEvent, topic: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div className="flex gap-3 pt-4">
              <button
                type="submit"
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg transition-colors font-medium"
              >
                Create Event
              </button>
              <button
                type="button"
                onClick={closeModal}
                className="flex-1 bg-gray-500 hover:bg-gray-600 text-white py-2 px-4 rounded-lg transition-colors font-medium"
              >
                Cancel
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};

export default Dashboard;
