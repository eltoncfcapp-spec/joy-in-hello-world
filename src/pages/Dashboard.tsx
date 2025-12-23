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
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Eye,
  Search,
  Key,
  RefreshCw,
  FileText,
  Download,
  ExternalLink,
  BookOpen,
  PlayCircle,
  Phone,
  MessageSquare,
  Home,
  CheckCircle,
  Clock,
  User,
  Image as ImageIcon,
  HelpCircle,
  Info,
  Book,
  Download as DownloadIcon,
  ChevronRight,
  EyeOff
} from 'lucide-react';
import { supabase } from '../integrations/supabase/client';
import { useAuth } from '../contexts/AuthContext';

// Types - Updated to match your database schema (NO EMAIL)
interface Member {
  id: string;
  name: string;
  surname: string;
  residence: string | null;
  phone: string | null;
  cell_group_id: string | null;
  invited_by: string | null;
  created_at: string | null;
  status: 'newcomer' | 'signed_member' | 'not_attending' | null;
  is_hidden: boolean | null;
  admin_role?: string | null;
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
  residence: string | null;
  consecutiveAbsences: number;
  lastEventDate: string;
  cell_group_id?: string | null;
  status?: string | null;
  is_hidden?: boolean | null;
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
  const [_selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [selectedSermon, setSelectedSermon] = useState<Sermon | null>(null);
  const [expandedSections, setExpandedSections] = useState<{[key: string]: boolean}>({
    events: true,
    activity: true,
    sermons: true,
    userManual: false
  });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [sermonSearchTerm, setSermonSearchTerm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [viewingPamphlet, setViewingPamphlet] = useState<string | null>(null);
  const [quickViewEvent, setQuickViewEvent] = useState<Event | null>(null);
  const [expandedImage, setExpandedImage] = useState<string | null>(null);
  const [showAllEvents, setShowAllEvents] = useState(false);
  const [showAllActivities, setShowAllActivities] = useState(false);
  const [showAllSermons, setShowAllSermons] = useState(false);
  const [showHiddenMembers, setShowHiddenMembers] = useState(false);

  // Real data state
  const [stats, setStats] = useState<StatCard[]>([]);
  const [recentActivities, setRecentActivities] = useState<Activity[]>([]);
  const [upcomingEvents, setUpcomingEvents] = useState<Event[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [cellGroups, setCellGroups] = useState<CellGroup[]>([]);
  const [absentMembers, setAbsentMembers] = useState<AbsentMember[]>([]);
  const [sermons, setSermons] = useState<Sermon[]>([]);
  const [absentCount, setAbsentCount] = useState<number>(0);
  const [hiddenMembersCount, setHiddenMembersCount] = useState<number>(0);
  const [refreshing, setRefreshing] = useState(false);

  // Check user permissions
  const currentUserCanEdit = canEdit(profile?.admin_role, profile?.permissions || []);

  // Filter functions - UPDATED: Filter out hidden members by default
  const getFilteredMembers = () => {
    if (showHiddenMembers) {
      return members;
    }
    return members.filter(member => !member.is_hidden);
  };

  const getFilteredEvents = () => {
    return upcomingEvents;
  };

  const getFilteredAbsentMembers = () => {
    if (showHiddenMembers) {
      return absentMembers;
    }
    return absentMembers.filter(member => !member.is_hidden);
  };

  const getFilteredSermons = () => {
    if (!sermonSearchTerm) return sermons;
    
    return sermons.filter(sermon => 
      sermon.title.toLowerCase().includes(sermonSearchTerm.toLowerCase()) ||
      sermon.pastor_name.toLowerCase().includes(sermonSearchTerm.toLowerCase()) ||
      sermon.summary.toLowerCase().includes(sermonSearchTerm.toLowerCase()) ||
      sermon.events?.name?.toLowerCase().includes(sermonSearchTerm.toLowerCase())
    );
  };

  // Format date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // Load absent count - UPDATED: Exclude hidden members
  const loadAbsentCount = async () => {
    try {
      const count = await getAbsentCountDirect();
      setAbsentCount(count);
      return count;
    } catch (error) {
      console.error('Error loading absent count:', error);
      setAbsentCount(0);
      return 0;
    }
  };

  // Direct method to get absent count - UPDATED: Exclude hidden members
  const getAbsentCountDirect = async (): Promise<number> => {
    try {
      // Try to use the RPC function first
      const { data: rpcData, error: rpcError } = await supabase.rpc('get_absent_member_count');
      
      if (!rpcError && rpcData !== null) {
        // Filter out hidden members from the count
        const { data: hiddenMembers } = await supabase
          .from('members')
          .select('id')
          .eq('is_hidden', true);
        
        const hiddenCount = hiddenMembers?.length || 0;
        return Math.max(0, rpcData - hiddenCount);
      }
      
      // Manual approach if RPC fails
      console.log('RPC not available, using manual count:', rpcError);
      
      // Get the last 2 Sunday events
      const { data: sundayEvents, error: eventsError } = await supabase
        .from('events')
        .select('id, event_date')
        .ilike('name', '%sunday%')
        .order('event_date', { ascending: false })
        .limit(2);

      if (eventsError || !sundayEvents || sundayEvents.length < 2) {
        console.error('Error getting Sunday events:', eventsError);
        return 0;
      }

      // Get all NON-HIDDEN members
      const { data: allMembers, error: membersError } = await supabase
        .from('members')
        .select('id')
        .eq('is_hidden', false)
        .is('is_hidden', false); // Also handle null values

      if (membersError || !allMembers) {
        console.error('Error getting members:', membersError);
        return 0;
      }

      // Get attendance records for the last 2 Sunday services
      const { data: attendances, error: attendanceError } = await supabase
        .from('event_attendees')
        .select('members_id, event_id, attendance_status')
        .in('event_id', sundayEvents.map(e => e.id));

      if (attendanceError) {
        console.error('Error getting attendance:', attendanceError);
        return 0;
      }

      // Count NON-HIDDEN members absent for both Sundays
      let count = 0;
      
      allMembers.forEach(member => {
        const memberAttendances = attendances?.filter(a => a.members_id === member.id) || [];
        let absentForBoth = true;
        
        for (const sunday of sundayEvents) {
          const attendanceForEvent = memberAttendances.find(a => a.event_id === sunday.id);
          
          if (attendanceForEvent && attendanceForEvent.attendance_status === 'present') {
            absentForBoth = false;
            break;
          }
        }
        
        if (absentForBoth) {
          count++;
        }
      });

      return count;
    } catch (error) {
      console.error('Error in getAbsentCountDirect:', error);
      return 0;
    }
  };

  // Load absent members with details - UPDATED: Exclude hidden members by default
  const loadAbsentMembers = async () => {
    try {
      // Get all Sunday Service events
      const { data: sundayEvents, error: eventsError } = await supabase
        .from('events')
        .select('id, event_date, name')
        .ilike('name', '%sunday%')
        .order('event_date', { ascending: false })
        .limit(10);

      if (eventsError) throw eventsError;
      
      if (!sundayEvents || sundayEvents.length < 2) {
        setAbsentMembers([]);
        return [];
      }

      const lastTwoSundays = sundayEvents.slice(0, 2);
      
      // Get all NON-HIDDEN members with all fields for detailed view
      const { data: allMembers, error: membersError } = await supabase
        .from('members')
        .select('*')
        .eq('is_hidden', false)
        .is('is_hidden', false); // Also handle null values

      if (membersError) throw membersError;
      if (!allMembers || allMembers.length === 0) {
        setAbsentMembers([]);
        return [];
      }

      // Get attendance records
      const { data: attendances, error: attendanceError } = await supabase
        .from('event_attendees')
        .select('members_id, event_id, attendance_status')
        .in('event_id', lastTwoSundays.map(e => e.id));

      if (attendanceError) throw attendanceError;

      // Find NON-HIDDEN members who were absent for both services
      const absent: AbsentMember[] = [];
      
      allMembers.forEach(member => {
        const memberAttendances = attendances?.filter(a => a.members_id === member.id) || [];
        
        let absentCount = 0;
        
        for (const sunday of lastTwoSundays) {
          const attendanceForEvent = memberAttendances.find(a => a.event_id === sunday.id);
          
          if (!attendanceForEvent || attendanceForEvent.attendance_status === 'absent') {
            absentCount++;
          }
        }
        
        if (absentCount >= 2) {
          absent.push({
            id: member.id,
            name: member.name,
            surname: member.surname,
            phone: member.phone,
            residence: member.residence,
            cell_group_id: member.cell_group_id,
            status: member.status,
            is_hidden: member.is_hidden,
            consecutiveAbsences: absentCount,
            lastEventDate: lastTwoSundays[0].event_date
          });
        }
      });

      setAbsentMembers(absent);
      return absent;
    } catch (error) {
      console.error('Error loading absent members:', error);
      setAbsentMembers([]);
      return [];
    }
  };

  // Calculate stats - UPDATED: Exclude hidden members from counts
  const calculateStats = (allMembers: Member[], events: Event[], allSermons: Sermon[], currentAbsentCount: number) => {
    // Filter out hidden members for stats
    const activeMembers = allMembers.filter(m => !m.is_hidden);
    const hiddenMembers = allMembers.filter(m => m.is_hidden);
    
    const totalMembers = activeMembers.length;
    const hiddenMembersCount = hiddenMembers.length;
    const newcomers = activeMembers.filter(m => m.status === 'newcomer').length;
    const signedMembers = activeMembers.filter(m => m.status === 'signed_member').length;
    const upcomingEventsCount = events.length;
    const totalSermons = allSermons.length;
    
    const uniqueGroups = [...new Set(activeMembers.map(m => m.cell_group_id).filter(Boolean))].length;

    const statsData: StatCard[] = [
      { 
        icon: Users, 
        label: 'Active Members', 
        value: totalMembers.toString(), 
        change: `${hiddenMembersCount} hidden members`, 
        changeType: 'info',
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
        icon: BookOpen, 
        label: 'Sermons', 
        value: totalSermons.toString(), 
        change: `${totalSermons} messages available`, 
        changeType: 'positive',
        color: 'from-orange-500 to-orange-600',
        bgColor: 'bg-orange-50 dark:bg-orange-950/20',
        action: 'viewSermons'
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
        color: 'from-indigo-500 to-indigo-600',
        bgColor: 'bg-indigo-50 dark:bg-indigo-950/20',
        action: 'viewGroups'
      },
      { 
        icon: AlertTriangle, 
        label: 'Absent 2 Sundays', 
        value: currentAbsentCount.toString(),
        change: currentAbsentCount > 0 ? 'Need follow-up' : 'All members present',
        changeType: currentAbsentCount > 0 ? 'negative' : 'positive',
        color: 'from-red-500 to-red-600',
        bgColor: 'bg-red-50 dark:bg-red-950/20',
        action: 'viewAbsentMembers'
      },
    ];

    setStats(statsData);
    setHiddenMembersCount(hiddenMembersCount);
  };

  // Generate recent activities - UPDATED: Only show activities for non-hidden members
  const generateRecentActivities = (allMembers: Member[], events: Event[], allSermons: Sermon[]) => {
    const activities: Activity[] = [];

    // Add recent NON-HIDDEN member joins
    const recentActiveMembers = allMembers.filter(m => !m.is_hidden).slice(0, 2);
    recentActiveMembers.forEach(member => {
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

    // Add recent sermons
    const recentSermons = allSermons.slice(0, 2);
    recentSermons.forEach(sermon => {
      activities.push({
        id: activities.length + 1,
        type: 'sermon',
        message: `New sermon: ${sermon.title} by ${sermon.pastor_name}`,
        time: formatTimeAgo(new Date(sermon.sermon_date)),
        color: 'bg-orange-500',
        icon: BookOpen,
        action: () => openSermonDetail(sermon)
      });
    });

    // Add recent events
    const recentEvents = events.slice(0, 2);
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

    setRecentActivities(activities.sort((a, b) => b.id - a.id));
  };

  const formatTimeAgo = (date: Date): string => {
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours} hours ago`;
    if (diffInHours < 168) return `${Math.floor(diffInHours / 24)} days ago`;
    return `${Math.floor(diffInHours / 168)} weeks ago`;
  };

  // Load all dashboard data
  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setRefreshing(true);
      setError(null);
      
      // Load all data in parallel for better performance
      const [
        membersData,
        cellGroupsData,
        eventsData,
        sermonsData
      ] = await Promise.all([
        // Load ALL members (including hidden)
        supabase.from('members').select('*').order('created_at', { ascending: false }),
        
        // Load cell groups
        supabase.from('cell_groups').select('id, name').order('name'),
        
        // Load events
        supabase.from('events').select('*')
          .gte('event_date', new Date().toISOString().split('T')[0])
          .order('event_date', { ascending: true }),
        
        // Load sermons
        supabase.from('sermons').select(`
          *,
          events (
            name,
            topic
          )
        `).order('sermon_date', { ascending: false })
      ]);

      if (membersData.error) throw membersData.error;
      if (cellGroupsData.error) throw cellGroupsData.error;
      if (eventsData.error) throw eventsData.error;
      if (sermonsData.error) throw sermonsData.error;

      setMembers(membersData.data || []);
      setCellGroups(cellGroupsData.data || []);
      setUpcomingEvents(eventsData.data || []);
      setSermons(sermonsData.data || []);

      // Load absent count and members in parallel
      const [absentCount, absentMembersList] = await Promise.all([
        loadAbsentCount(),
        loadAbsentMembers()
      ]);

      // Calculate stats with the actual absent count
      calculateStats(membersData.data || [], eventsData.data || [], sermonsData.data || [], absentCount);
      
      // Generate activities
      generateRecentActivities(membersData.data || [], eventsData.data || [], sermonsData.data || []);

    } catch (error) {
      console.error('Error loading dashboard data:', error);
      setError('Failed to load dashboard data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
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

  // Open sermon detail modal
  const openSermonDetail = (sermon: Sermon) => {
    setSelectedSermon(sermon);
    setActiveModal('sermonDetail');
  };

  // Initialize data on component mount
  useEffect(() => {
    loadDashboardData();
  }, []);

  const openModal = (modalType: string) => {
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
    setSelectedSermon(null);
    setError(null);
    setShowAllEvents(false);
    setShowAllActivities(false);
    setShowAllSermons(false);
    setShowHiddenMembers(false);
  };

  const openMemberDetail = (member: Member | AbsentMember) => {
    // Convert AbsentMember to Member if needed
    const fullMember: Member = {
      id: member.id,
      name: member.name,
      surname: member.surname,
      residence: member.residence,
      phone: member.phone,
      cell_group_id: 'cell_group_id' in member ? member.cell_group_id : null,
      invited_by: null,
      created_at: null,
      status: 'status' in member ? member.status as any : null,
      is_hidden: 'is_hidden' in member ? member.is_hidden : null,
      admin_role: undefined,
      permissions: undefined,
      assigned_groups: undefined,
      assigned_departments: undefined,
      can_add_members: undefined,
      can_edit_members: undefined,
      can_view_own_data: undefined,
      login_username: undefined,
      login_pin: undefined
    };
    
    setSelectedMember(fullMember);
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

  // Member Detail Modal Component (UPDATED - Shows hidden status)
  const MemberDetailModal = ({ member }: { member: Member }) => (
    <div className="space-y-6">
      <div className="flex items-center gap-4 mb-6">
        <div className={`w-20 h-20 rounded-full flex items-center justify-center text-white font-semibold text-2xl ${
          member.is_hidden 
            ? 'bg-gradient-to-br from-gray-500 to-gray-700' 
            : 'bg-gradient-to-br from-blue-500 to-purple-500'
        }`}>
          {member.name.charAt(0)}{member.surname.charAt(0)}
        </div>
        <div>
          <h3 className="text-2xl font-bold text-gray-900">{member.name} {member.surname}</h3>
          <div className="flex items-center gap-2 mt-1">
            <p className="text-gray-600">{member.status ? `Status: ${member.status.replace('_', ' ')}` : 'No status'}</p>
            {member.is_hidden && (
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-medium">
                <EyeOff className="h-3 w-3" />
                Hidden Member
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-3">
          <h4 className="font-semibold text-gray-900">Contact Information</h4>
          {member.phone && (
            <div className="flex items-center gap-2 text-gray-600">
              <Phone className="h-4 w-4" />
              <span>{member.phone}</span>
            </div>
          )}
          {member.residence && (
            <div className="flex items-center gap-2 text-gray-600">
              <Home className="h-4 w-4" />
              <span>{member.residence}</span>
            </div>
          )}
        </div>

        <div className="space-y-3">
          <h4 className="font-semibold text-gray-900">Membership Details</h4>
          {member.cell_group_id && (
            <div className="text-gray-600">
              <span className="font-medium">Cell Group:</span>{' '}
              {cellGroups.find(g => g.id === member.cell_group_id)?.name || member.cell_group_id}
            </div>
          )}
          {member.created_at && (
            <div className="text-gray-600">
              <span className="font-medium">Joined:</span>{' '}
              {formatDate(member.created_at)}
            </div>
          )}
          {member.login_username && (
            <div className="flex items-center gap-2 text-gray-600">
              <Key className="h-4 w-4" />
              <span>Login: {member.login_username}</span>
            </div>
          )}
        </div>
      </div>

      {member.admin_role && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <h4 className="font-semibold text-blue-900 mb-2">Administrative Role</h4>
          <p className="text-blue-700">{member.admin_role}</p>
        </div>
      )}

      <div className="flex gap-3 pt-4 border-t border-gray-200">
        {member.phone && (
          <a
            href={`tel:${member.phone}`}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors font-medium"
          >
            <Phone className="h-4 w-4" />
            Call Member
          </a>
        )}
        <button
          onClick={closeModal}
          className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
        >
          Close
        </button>
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
  const filteredSermons = getFilteredSermons();

  // Get display items (last 3 or all based on showAll state)
  const displayedActivities = showAllActivities ? recentActivities : recentActivities.slice(0, 3);
  const displayedEvents = showAllEvents ? filteredEvents : filteredEvents.slice(0, 3);
  const displayedSermons = showAllSermons ? filteredSermons : filteredSermons.slice(0, 3);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-6 animate-fadeIn">
      {/* Expanded Image Modal */}
      {expandedImage && (
        <div className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center p-4" onClick={() => setExpandedImage(null)}>
          <button 
            className="absolute top-4 right-4 text-white hover:text-gray-300 z-10"
            onClick={() => setExpandedImage(null)}
          >
            <X className="h-8 w-8" />
          </button>
          <div className="relative max-w-4xl max-h-[90vh] w-full" onClick={(e) => e.stopPropagation()}>
            <img 
              src={expandedImage} 
              alt="Event Pamphlet" 
              className="w-full h-auto max-h-[90vh] object-contain rounded-lg"
            />
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
            Dashboard
          </h1>
          <p className="text-foreground/60">
            {currentUserCanEdit 
              ? 'Welcome to your church management dashboard' 
              : `Welcome - ${profile?.admin_role || 'Member'} access`
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
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors font-medium disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'Refreshing...' : 'Refresh'}
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

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-6 mb-8">
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

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Activity - Show last 3 */}
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
                {displayedActivities.map((activity) => (
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
              
              {/* Show "View All" button if there are more than 3 activities */}
              {recentActivities.length > 3 && (
                <button 
                  onClick={() => setShowAllActivities(!showAllActivities)}
                  className="w-full mt-4 flex items-center justify-center gap-2 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium transition-colors py-2"
                >
                  {showAllActivities ? 'Show Less' : `View All (${recentActivities.length})`}
                  <ChevronRight className={`h-4 w-4 transition-transform ${showAllActivities ? 'rotate-90' : ''}`} />
                </button>
              )}
              
              {/* Always show "View All Activity" link to open modal */}
              <button 
                onClick={() => openModal('viewMembers')}
                className="w-full text-center text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-300 text-sm transition-colors py-2"
              >
                Open All Activity
              </button>
            </div>
          )}
        </div>

        {/* Upcoming Events - Show last 3 */}
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
                {displayedEvents.map((event) => (
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
                    
                    {/* Pamphlet Section - SMALL PREVIEW */}
                    {event.pamphlet_url && (
                      <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-600">
                        {/* Small Image Preview */}
                        <div className="mb-2">
                          <div className="flex items-center gap-2 mb-2">
                            <ImageIcon className="h-4 w-4 text-blue-500" />
                            <span className="text-sm font-medium text-gray-700">Event Pamphlet</span>
                          </div>
                          <div 
                            className="relative group cursor-pointer overflow-hidden rounded-lg border border-gray-200 bg-white"
                            onClick={() => setExpandedImage(event.pamphlet_url)}
                          >
                            <img 
                              src={event.pamphlet_url} 
                              alt={`${event.name} pamphlet`}
                              className="w-full h-32 object-contain transition-transform duration-300 group-hover:scale-105"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.style.display = 'none';
                              }}
                            />
                            <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 transition-all duration-300 flex items-center justify-center">
                              <div className="text-white text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-black bg-opacity-50 px-2 py-1 rounded-full">
                                Click to enlarge
                              </div>
                            </div>
                          </div>
                          <p className="text-xs text-gray-500 mt-1 text-center">Click image to view full size</p>
                        </div>
                        
                        {/* Action Buttons */}
                        <div className="flex items-center justify-between mt-2">
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-green-600" />
                            <span className="text-xs text-green-600 font-medium">Pamphlet Available</span>
                          </div>
                          <div className="flex gap-1">
                            <button
                              onClick={() => openQuickView(event)}
                              className="p-1.5 bg-blue-100 hover:bg-blue-200 text-blue-600 rounded-lg transition-colors duration-200 flex items-center gap-1 text-xs"
                              title="Quick View"
                            >
                              <Eye className="h-3 w-3" />
                              <span className="hidden sm:inline">View</span>
                            </button>
                            <a
                              href={event.pamphlet_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1.5 bg-green-100 hover:bg-green-200 text-green-600 rounded-lg transition-colors duration-200 flex items-center gap-1 text-xs"
                              title="Download"
                            >
                              <Download className="h-3 w-3" />
                              <span className="hidden sm:inline">Download</span>
                            </a>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
                {filteredEvents.length === 0 && (
                  <p className="text-gray-500 dark:text-gray-400 text-center py-4">No upcoming events</p>
                )}
              </div>
              
              {/* Show "View All" button if there are more than 3 events */}
              {filteredEvents.length > 3 && (
                <button 
                  onClick={() => setShowAllEvents(!showAllEvents)}
                  className="w-full mt-4 flex items-center justify-center gap-2 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium transition-colors py-2"
                >
                  {showAllEvents ? 'Show Less' : `View All (${filteredEvents.length})`}
                  <ChevronRight className={`h-4 w-4 transition-transform ${showAllEvents ? 'rotate-90' : ''}`} />
                </button>
              )}
              
              {/* Always show "View Calendar" link to open modal */}
              <button 
                onClick={() => openModal('viewEvents')}
                className="w-full text-center text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-300 text-sm transition-colors py-2"
              >
                Open Calendar
              </button>
            </div>
          )}
        </div>

        {/* Recent Sermons - Show last 3 */}
        <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl border border-gray-200/50 dark:border-gray-700/50 rounded-2xl hover:shadow-lg transition-all duration-300">
          <button 
            onClick={() => toggleSection('sermons')}
            className="w-full flex justify-between items-center p-6 hover:bg-gray-50/50 dark:hover:bg-gray-700/30 transition-colors rounded-t-2xl"
          >
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Recent Sermons</h2>
            {expandedSections.sermons ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
          </button>
          
          {expandedSections.sermons && (
            <div className="p-6 pt-0">
              <div className="space-y-4">
                {displayedSermons.map((sermon) => (
                  <div
                    key={sermon.id}
                    className="w-full border-l-4 border-orange-400 pl-4 py-3 rounded-r-lg hover:bg-gray-50/50 dark:hover:bg-gray-700/30 transition-colors duration-200 group cursor-pointer"
                    onClick={() => openSermonDetail(sermon)}
                  >
                    <div className="flex justify-between items-start mb-1">
                      <h3 className="font-semibold text-gray-900 dark:text-white group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors line-clamp-2">
                        {sermon.title}
                      </h3>
                    </div>
                    <p className="text-gray-600 dark:text-gray-400 text-sm mb-1">
                      By {sermon.pastor_name}
                    </p>
                    <p className="text-gray-500 dark:text-gray-400 text-xs flex items-center gap-1 mb-2">
                      <Calendar className="h-3 w-3" />
                      {formatDate(sermon.sermon_date)}
                    </p>
                    
                    {/* Sermon Files Section */}
                    <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-200 dark:border-gray-600">
                      <div className="flex items-center gap-2">
                        <BookOpen className="h-4 w-4 text-orange-600" />
                        <span className="text-xs text-orange-600 font-medium">Sermon Available</span>
                      </div>
                      <div className="flex gap-1">
                        {sermon.document_url && (
                          <a
                            href={sermon.document_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 bg-green-100 hover:bg-green-200 text-green-600 rounded-lg transition-colors duration-200"
                            title="Download Notes"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Download className="h-3 w-3" />
                          </a>
                        )}
                        {sermon.video_url && (
                          <a
                            href={sermon.video_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 bg-purple-100 hover:bg-purple-200 text-purple-600 rounded-lg transition-colors duration-200"
                            title="Watch Video"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <PlayCircle className="h-3 w-3" />
                          </a>
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            openSermonDetail(sermon);
                          }}
                          className="p-1.5 bg-blue-100 hover:bg-blue-200 text-blue-600 rounded-lg transition-colors duration-200"
                          title="View Details"
                        >
                          <Eye className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
                {filteredSermons.length === 0 && (
                  <p className="text-gray-500 dark:text-gray-400 text-center py-4">No sermons available</p>
                )}
              </div>
              
              {/* Show "View All" button if there are more than 3 sermons */}
              {filteredSermons.length > 3 && (
                <button 
                  onClick={() => setShowAllSermons(!showAllSermons)}
                  className="w-full mt-4 flex items-center justify-center gap-2 text-orange-600 dark:text-orange-400 hover:text-orange-700 dark:hover:text-orange-300 font-medium transition-colors py-2"
                >
                  {showAllSermons ? 'Show Less' : `View All (${filteredSermons.length})`}
                  <ChevronRight className={`h-4 w-4 transition-transform ${showAllSermons ? 'rotate-90' : ''}`} />
                </button>
              )}
              
              {/* Always show "View All Sermons" link to open modal */}
              <button 
                onClick={() => openModal('viewSermons')}
                className="w-full text-center text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-300 text-sm transition-colors py-2"
              >
                Open All Sermons
              </button>
            </div>
          )}
        </div>
      </div>

      {/* User Manual Section - Updated to mention hidden members */}
      <div className="mt-6 bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl border border-gray-200/50 dark:border-gray-700/50 rounded-2xl hover:shadow-lg transition-all duration-300">
        <button 
          onClick={() => toggleSection('userManual')}
          className="w-full flex justify-between items-center p-6 hover:bg-gray-50/50 dark:hover:bg-gray-700/30 transition-colors rounded-t-2xl"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <Book className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">User Manual</h2>
          </div>
          {expandedSections.userManual ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
        </button>
        
        {expandedSections.userManual && (
          <div className="p-6 pt-0">
            <div className="space-y-6">
              {/* Introduction */}
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700/50 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Info className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  <h3 className="font-bold text-lg text-gray-900 dark:text-white">Welcome to Church Management System</h3>
                </div>
                <p className="text-gray-700 dark:text-gray-300">
                  This guide will help you navigate and use the church management dashboard effectively.
                  All users can view data, but editing permissions are restricted to pastors and administrators.
                </p>
                <p className="text-gray-700 dark:text-gray-300 mt-2">
                  <strong>Note:</strong> Hidden members are excluded from all counts and statistics by default.
                  They are considered inactive/non-active members.
                </p>
              </div>

              {/* Dashboard Sections */}
              <div>
                <h4 className="font-semibold text-gray-900 dark:text-white mb-3 text-lg">Dashboard Overview</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Stats Cards */}
                  <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="p-1.5 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                        <TrendingUp className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                      </div>
                      <h5 className="font-medium text-gray-900 dark:text-white">Statistics Cards</h5>
                    </div>
                    <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                      <li className="flex items-start gap-2">
                        <div className="w-1.5 h-1.5 mt-1.5 bg-blue-500 rounded-full"></div>
                        <span>Click any stat card to view detailed information</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <div className="w-1.5 h-1.5 mt-1.5 bg-blue-500 rounded-full"></div>
                        <span><strong>Active Members</strong> count excludes hidden members</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <div className="w-1.5 h-1.5 mt-1.5 bg-blue-500 rounded-full"></div>
                        <span>Hidden members are shown in gray with eye-off icon</span>
                      </li>
                    </ul>
                  </div>

                  {/* Quick Access */}
                  <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="p-1.5 bg-green-100 dark:bg-green-900/30 rounded-lg">
                        <Eye className="h-4 w-4 text-green-600 dark:text-green-400" />
                      </div>
                      <h5 className="font-medium text-gray-900 dark:text-white">Viewing Data</h5>
                    </div>
                    <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                      <li className="flex items-start gap-2">
                        <div className="w-1.5 h-1.5 mt-1.5 bg-green-500 rounded-full"></div>
                        <span>Each section shows the last 3 items by default</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <div className="w-1.5 h-1.5 mt-1.5 bg-green-500 rounded-full"></div>
                        <span>Click "View All" to see complete lists</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <div className="w-1.5 h-1.5 mt-1.5 bg-green-500 rounded-full"></div>
                        <span>Hidden members are excluded by default</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Key Features - Updated */}
              <div>
                <h4 className="font-semibold text-gray-900 dark:text-white mb-3 text-lg">Key Features Guide</h4>
                <div className="space-y-4">
                  {/* Members Management */}
                  <div className="border-l-4 border-blue-400 pl-4 py-2">
                    <div className="flex items-center gap-2 mb-1">
                      <Users className="h-4 w-4 text-blue-500" />
                      <h5 className="font-medium text-gray-900 dark:text-white">Members Management</h5>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      View all church members, their contact information, and membership status.
                      Search by name, phone number, or residence. Click on any member to see detailed information.
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">
                      <strong>Note:</strong> Hidden members are excluded from counts and statistics.
                      They can be viewed by toggling "Show Hidden Members" in the members modal.
                    </p>
                  </div>

                  {/* Events & Pamphlets */}
                  <div className="border-l-4 border-purple-400 pl-4 py-2">
                    <div className="flex items-center gap-2 mb-1">
                      <Calendar className="h-4 w-4 text-purple-500" />
                      <h5 className="font-medium text-gray-900 dark:text-white">Events & Pamphlets</h5>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      View upcoming events with dates, times, and locations. Event pamphlets can be:
                    </p>
                    <ul className="text-sm text-gray-600 dark:text-gray-400 mt-1 space-y-1">
                      <li className="flex items-center gap-2">
                        <Eye className="h-3 w-3 text-blue-500" />
                        <span>Viewed inline with click-to-enlarge functionality</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <DownloadIcon className="h-3 w-3 text-green-500" />
                        <span>Downloaded for offline viewing</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <ExternalLink className="h-3 w-3 text-purple-500" />
                        <span>Opened in a new tab for full-screen viewing</span>
                      </li>
                    </ul>
                  </div>

                  {/* Sermons Library */}
                  <div className="border-l-4 border-orange-400 pl-4 py-2">
                    <div className="flex items-center gap-2 mb-1">
                      <BookOpen className="h-4 w-4 text-orange-500" />
                      <h5 className="font-medium text-gray-900 dark:text-white">Sermons Library</h5>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Access past sermons with notes and video recordings. Features include:
                    </p>
                    <ul className="text-sm text-gray-600 dark:text-gray-400 mt-1 space-y-1">
                      <li className="flex items-center gap-2">
                        <Search className="h-3 w-3 text-gray-500" />
                        <span>Search sermons by title, pastor, or content</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <DownloadIcon className="h-3 w-3 text-green-500" />
                        <span>Download sermon notes (PDF format)</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <PlayCircle className="h-3 w-3 text-purple-500" />
                        <span>Watch sermon videos online</span>
                      </li>
                    </ul>
                  </div>

                  {/* Absent Members Tracking */}
                  <div className="border-l-4 border-red-400 pl-4 py-2">
                    <div className="flex items-center gap-2 mb-1">
                      <AlertTriangle className="h-4 w-4 text-red-500" />
                      <h5 className="font-medium text-gray-900 dark:text-white">Attendance Tracking</h5>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Automatically tracks ACTIVE members who have been absent for 2 consecutive Sundays.
                      Hidden members are excluded from this tracking. Provides contact information for follow-up.
                    </p>
                  </div>
                </div>
              </div>

              {/* Permissions & Access */}
              <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Key className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                  <h4 className="font-semibold text-gray-900 dark:text-white">Permissions & Access Levels</h4>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h5 className="font-medium text-gray-900 dark:text-white mb-2">All Members Can:</h5>
                    <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                      <li className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <span>View active member information</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <span>Access event pamphlets and details</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <span>View and download sermons</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <span>See attendance statistics (excluding hidden)</span>
                      </li>
                    </ul>
                  </div>
                  <div>
                    <h5 className="font-medium text-gray-900 dark:text-white mb-2">Pastors/Admins Can:</h5>
                    <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                      <li className="flex items-center gap-2">
                        <UserPlus className="h-4 w-4 text-blue-500" />
                        <span>Add new members to the system</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <EyeOff className="h-4 w-4 text-gray-500" />
                        <span>Mark members as hidden/inactive</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <Plus className="h-4 w-4 text-blue-500" />
                        <span>Create and manage events</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-blue-500" />
                        <span>Upload event pamphlets</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Tips & Best Practices - Updated */}
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700/50 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <HelpCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                  <h4 className="font-semibold text-gray-900 dark:text-white">Tips & Best Practices</h4>
                </div>
                <div className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
                  <p className="flex items-start gap-2">
                    <span className="font-bold">👥</span>
                    <span><strong>Active vs Hidden:</strong> Hidden members are excluded from counts and statistics</span>
                  </p>
                  <p className="flex items-start gap-2">
                    <span className="font-bold">🔄</span>
                    <span><strong>Regular Refresh:</strong> Click the "Refresh" button to get the latest data</span>
                  </p>
                  <p className="flex items-start gap-2">
                    <span className="font-bold">🔍</span>
                    <span><strong>Use Search:</strong> Quickly find members or sermons using search functionality</span>
                  </p>
                  <p className="flex items-start gap-2">
                    <span className="font-bold">📱</span>
                    <span><strong>Mobile Friendly:</strong> The dashboard is optimized for both desktop and mobile use</span>
                  </p>
                  <p className="flex items-start gap-2">
                    <span className="font-bold">📞</span>
                    <span><strong>Direct Contact:</strong> Click phone numbers to call members directly</span>
                  </p>
                  <p className="flex items-start gap-2">
                    <span className="font-bold">📊</span>
                    <span><strong>Monitor Absences:</strong> Check "Absent 2 Sundays" for follow-up (excludes hidden)</span>
                  </p>
                </div>
              </div>

              {/* Support Information */}
              <div className="text-center pt-4 border-t border-gray-200 dark:border-gray-600">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Need help? Contact your church administrator or pastor for assistance.
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                  Church Management System v1.0 • Designed for effective church administration
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Quick View Pamphlet Modal - Optimized for mobile */}
      {quickViewEvent && quickViewEvent.pamphlet_url && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden shadow-2xl">
            <div className="flex justify-between items-center p-4 border-b border-gray-200">
              <div className="max-w-[70%]">
                <h3 className="text-lg font-bold text-gray-900 truncate">{quickViewEvent.name}</h3>
                <p className="text-sm text-gray-600 truncate">Event Pamphlet</p>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={closeQuickView}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors duration-200"
                >
                  <X className="h-5 w-5 text-gray-500" />
                </button>
              </div>
            </div>
            <div className="p-2 sm:p-4 h-[70vh]">
              <div className="w-full h-full rounded-lg border border-gray-200 overflow-auto">
                <iframe
                  src={quickViewEvent.pamphlet_url}
                  className="w-full h-full min-h-[500px]"
                  title="Event Pamphlet"
                />
              </div>
            </div>
            <div className="p-3 sm:p-4 border-t border-gray-200 bg-gray-50">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
                <div className="text-sm text-gray-600 space-y-1">
                  <p><strong>Date:</strong> {quickViewEvent.event_date}</p>
                  <p><strong>Time:</strong> {quickViewEvent.event_time}</p>
                  {quickViewEvent.location && <p className="truncate"><strong>Location:</strong> {quickViewEvent.location}</p>}
                </div>
                <div className="flex flex-wrap gap-2">
                  <a
                    href={quickViewEvent.pamphlet_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-all duration-200 font-medium text-sm"
                  >
                    <ExternalLink className="h-4 w-4" />
                    <span className="hidden xs:inline">Full View</span>
                  </a>
                  <a
                    href={quickViewEvent.pamphlet_url}
                    download
                    className="flex items-center justify-center gap-2 px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-xl transition-all duration-200 font-medium text-sm"
                  >
                    <Download className="h-4 w-4" />
                    <span className="hidden xs:inline">Download</span>
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Absent Members Modal - Updated to mention hidden members */}
      {activeModal === 'viewAbsentMembers' && (
        <Modal title="Members Absent for 2 Sundays" size="max-w-4xl">
          <div className="space-y-4">
            <p className="text-gray-600 dark:text-gray-400">
              Active members who have been absent for the last 2 Sunday services. Hidden members are excluded from this list.
            </p>
            
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {filteredAbsentMembers.map((member) => (
                <div key={member.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border border-red-200 rounded-xl bg-red-50">
                  <div className="flex items-center gap-4 mb-3 sm:mb-0">
                    <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-orange-500 rounded-full flex items-center justify-center text-white font-semibold">
                      {member.name.charAt(0)}{member.surname.charAt(0)}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{member.name} {member.surname}</p>
                      <p className="text-sm text-gray-500">
                        <Phone className="h-3 w-3 inline mr-1" />
                        {member.phone || 'No phone number'}
                      </p>
                      <p className="text-sm text-gray-600">
                        <Home className="h-3 w-3 inline mr-1" />
                        {member.residence || 'No residence'}
                      </p>
                      <p className="text-xs text-red-600 mt-1">
                        <AlertTriangle className="h-3 w-3 inline mr-1" />
                        Absent for {member.consecutiveAbsences} consecutive Sundays
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {member.phone && (
                      <a
                        href={`tel:${member.phone}`}
                        className="flex items-center justify-center gap-2 px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors font-medium text-sm"
                      >
                        <Phone className="h-4 w-4" />
                        <span className="hidden sm:inline">Call</span>
                      </a>
                    )}
                    <button 
                      onClick={() => {
                        openMemberDetail(member);
                      }}
                      className="flex items-center justify-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium text-sm"
                    >
                      <Eye className="h-4 w-4" />
                      <span className="hidden sm:inline">Details</span>
                    </button>
                  </div>
                </div>
              ))}
              {filteredAbsentMembers.length === 0 && (
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Users className="h-8 w-8 text-green-600" />
                  </div>
                  <h4 className="text-lg font-semibold text-gray-900 mb-2">Great News!</h4>
                  <p className="text-gray-600">
                    All active members have attended at least one of the last 2 Sunday services.
                  </p>
                  {hiddenMembersCount > 0 && (
                    <p className="text-sm text-gray-500 mt-2">
                      Note: {hiddenMembersCount} hidden members are excluded from this count.
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        </Modal>
      )}

      {/* Member Detail Modal */}
      {activeModal === 'memberDetail' && selectedMember && (
        <Modal title="Member Details" size="max-w-md">
          <MemberDetailModal member={selectedMember} />
        </Modal>
      )}

      {/* Sermons Modal */}
      {activeModal === 'viewSermons' && (
        <Modal title="All Sermons" size="max-w-4xl">
          <div className="space-y-4">
            <p className="text-gray-600 dark:text-gray-400">
              Browse all available sermons
            </p>
            
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search sermons by title, pastor, or content..."
                value={sermonSearchTerm}
                onChange={(e) => setSermonSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>

            <div className="space-y-4 max-h-96 overflow-y-auto">
              {filteredSermons.map((sermon) => (
                <div 
                  key={sermon.id}
                  className="border border-gray-200 rounded-xl p-4 hover:bg-gray-50 transition-colors duration-200 cursor-pointer"
                  onClick={() => openSermonDetail(sermon)}
                >
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start mb-3 gap-2">
                    <div className="flex-1">
                      <h4 className="font-bold text-lg text-gray-900 mb-1">{sermon.title}</h4>
                      <p className="text-orange-600 font-medium text-sm">
                        {sermon.events?.name || 'Standalone Sermon'}
                      </p>
                    </div>
                    <span className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded-full self-start sm:self-auto">
                      {formatDate(sermon.sermon_date)}
                    </span>
                  </div>
                  
                  <div className="space-y-2 mb-3">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Users className="h-3 w-3" />
                      <span>By {sermon.pastor_name}</span>
                    </div>
                    <p className="text-gray-600 text-sm line-clamp-2">
                      {sermon.summary}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {sermon.document_url && (
                      <a
                        href={sermon.document_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 px-3 py-1 bg-green-100 hover:bg-green-200 text-green-700 rounded-lg text-sm transition-colors duration-200"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Download className="h-3 w-3" />
                        Download Notes
                      </a>
                    )}
                    {sermon.video_url && (
                      <a
                        href={sermon.video_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 px-3 py-1 bg-purple-100 hover:bg-purple-200 text-purple-700 rounded-lg text-sm transition-colors duration-200"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <PlayCircle className="h-3 w-3" />
                        Watch Video
                      </a>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        openSermonDetail(sermon);
                      }}
                      className="flex items-center gap-1 px-3 py-1 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg text-sm transition-colors duration-200"
                    >
                      <Eye className="h-3 w-3" />
                      View Details
                    </button>
                  </div>
                </div>
              ))}
              {filteredSermons.length === 0 && (
                <p className="text-gray-500 dark:text-gray-400 text-center py-4">
                  {sermonSearchTerm ? 'No sermons found matching your search' : 'No sermons available'}
                </p>
              )}
            </div>
          </div>
        </Modal>
      )}

      {/* Sermon Detail Modal */}
      {activeModal === 'sermonDetail' && selectedSermon && (
        <Modal title="Sermon Details" size="max-w-2xl">
          <div className="space-y-6">
            <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
              <h3 className="text-2xl font-bold text-gray-900 mb-2">{selectedSermon.title}</h3>
              <div className="space-y-2 text-sm text-gray-600">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  <span><strong>Pastor:</strong> {selectedSermon.pastor_name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  <span><strong>Date:</strong> {formatDate(selectedSermon.sermon_date)}</span>
                </div>
                {selectedSermon.events?.name && (
                  <div className="flex items-center gap-2">
                    <BookOpen className="h-4 w-4" />
                    <span><strong>Event:</strong> {selectedSermon.events.name}</span>
                  </div>
                )}
              </div>
            </div>

            <div>
              <h4 className="font-semibold text-gray-900 mb-2">Sermon Summary</h4>
              <p className="text-gray-600 leading-relaxed">{selectedSermon.summary}</p>
            </div>

            <div>
              <h4 className="font-semibold text-gray-900 mb-3">Available Resources</h4>
              <div className="flex flex-wrap gap-3">
                {selectedSermon.document_url && (
                  <a
                    href={selectedSermon.document_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-4 py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl transition-all duration-200 font-medium"
                  >
                    <Download className="h-4 w-4" />
                    Download Sermon Notes (PDF)
                  </a>
                )}
                {selectedSermon.video_url && (
                  <a
                    href={selectedSermon.video_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-4 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl transition-all duration-200 font-medium"
                  >
                    <PlayCircle className="h-4 w-4" />
                    Watch Sermon Video
                  </a>
                )}
                {!selectedSermon.document_url && !selectedSermon.video_url && (
                  <p className="text-gray-500">No additional resources available for this sermon.</p>
                )}
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* Members Modal - Updated with hidden members toggle */}
      {activeModal === 'viewMembers' && (
        <Modal title="Members" size="max-w-4xl">
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <p className="text-gray-600 dark:text-gray-400">
                {showHiddenMembers 
                  ? 'All members (including hidden)' 
                  : 'Active members (hidden members excluded)'}
              </p>
              <button
                onClick={() => setShowHiddenMembers(!showHiddenMembers)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors font-medium ${
                  showHiddenMembers
                    ? 'bg-gray-600 hover:bg-gray-700 text-white'
                    : 'bg-gray-200 hover:bg-gray-300 text-gray-800'
                }`}
              >
                <EyeOff className="h-4 w-4" />
                {showHiddenMembers ? 'Hide Hidden Members' : 'Show Hidden Members'}
              </button>
            </div>
            
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search members by name, phone, or residence..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="space-y-3 max-h-96 overflow-y-auto">
              {filteredMembers
                .filter(member => 
                  `${member.name} ${member.surname}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
                  (member.phone && member.phone.includes(searchTerm)) ||
                  (member.residence && member.residence.toLowerCase().includes(searchTerm.toLowerCase()))
                )
                .map(member => (
                <div key={member.id} className={`flex flex-col sm:flex-row sm:items-center justify-between p-4 border rounded-xl hover:bg-gray-50 transition-colors ${
                  member.is_hidden 
                    ? 'border-gray-300 bg-gray-100' 
                    : 'border-gray-200 bg-white'
                }`}>
                  <div className="flex items-center gap-4 mb-3 sm:mb-0">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-semibold ${
                      member.is_hidden
                        ? 'bg-gradient-to-br from-gray-500 to-gray-700'
                        : 'bg-gradient-to-br from-blue-500 to-purple-500'
                    }`}>
                      {member.name.charAt(0)}{member.surname.charAt(0)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-gray-900">{member.name} {member.surname}</p>
                        {member.is_hidden && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-200 text-gray-700 rounded-full text-xs">
                            <EyeOff className="h-3 w-3" />
                            Hidden
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-500">{member.phone || 'No phone'}</p>
                      {member.residence && (
                        <p className="text-xs text-gray-600 mt-1">
                          Residence: {member.residence}
                        </p>
                      )}
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
