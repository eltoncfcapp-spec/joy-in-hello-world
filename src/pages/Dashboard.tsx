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
  Upload,
  ExternalLink,
  BookOpen,
  PlayCircle,
  Phone,
  Mail,
  MessageSquare,
  Home,
  CheckCircle,
  Clock,
  User
} from 'lucide-react';
import { supabase } from '../integrations/supabase/client';
import { useAuth } from '../contexts/AuthContext';

// Types
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
}

interface FollowUpFormData {
  memberId: string;
  followUpDate: string;
  followUpType: 'phone_call' | 'visit' | 'residence' | 'sms';
  notes: string;
  callMade: boolean;
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
  const [_selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [_selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [selectedSermon, setSelectedSermon] = useState<Sermon | null>(null);
  const [expandedSections, setExpandedSections] = useState<{[key: string]: boolean}>({
    events: true,
    activity: true,
    sermons: true
  });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [sermonSearchTerm, setSermonSearchTerm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [uploadingPamphlet, setUploadingPamphlet] = useState<string | null>(null);
  const [viewingPamphlet, setViewingPamphlet] = useState<string | null>(null);
  const [quickViewEvent, setQuickViewEvent] = useState<Event | null>(null);
  const [selectedAbsentMember, setSelectedAbsentMember] = useState<AbsentMember | null>(null);
  const [followUpForm, setFollowUpForm] = useState<FollowUpFormData>({
    memberId: '',
    followUpDate: new Date().toISOString().split('T')[0],
    followUpType: 'phone_call',
    notes: '',
    callMade: false
  });
  const [followUpLoading, setFollowUpLoading] = useState(false);

  // Real data state
  const [stats, setStats] = useState<StatCard[]>([]);
  const [recentActivities, setRecentActivities] = useState<Activity[]>([]);
  const [upcomingEvents, setUpcomingEvents] = useState<Event[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [_cellGroups, setCellGroups] = useState<CellGroup[]>([]);
  const [absentMembers, setAbsentMembers] = useState<AbsentMember[]>([]);
  const [sermons, setSermons] = useState<Sermon[]>([]);

  // Check user permissions - use admin_role from profile instead of role
  const currentUserCanEdit = canEdit(profile?.admin_role, profile?.permissions || []);

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

      // Load sermons
      const { data: sermonsData, error: sermonsError } = await supabase
        .from('sermons')
        .select(`
          *,
          events (
            name,
            topic
          )
        `)
        .order('sermon_date', { ascending: false });

      if (sermonsError) throw sermonsError;
      setSermons(sermonsData || []);

      // Load absent members first
      await loadAbsentMembers();

      // Calculate stats with all data (everyone can see) - AFTER absent members are loaded
      calculateStats(membersData || [], eventsData || [], sermonsData || []);

      // Generate recent activities with all data
      generateRecentActivities(membersData || [], eventsData || [], sermonsData || []);

    } catch (error) {
      console.error('Error loading dashboard data:', error);
      setError('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  // CORRECTED loadAbsentMembers function
  const loadAbsentMembers = async () => {
    try {
      // Get all Sunday Service events in descending order
      // Using ilike to match various Sunday service naming conventions
      const { data: sundayEvents, error: eventsError } = await supabase
        .from('events')
        .select('id, event_date, name')
        .or('name.ilike.%sunday%,name.ilike.%service%')
        .order('event_date', { ascending: false })
        .limit(10);

      if (eventsError) throw eventsError;
      
      if (!sundayEvents || sundayEvents.length < 2) {
        setAbsentMembers([]);
        return;
      }

      // Get the last 2 Sunday services
      const lastTwoSundays = sundayEvents.slice(0, 2);
      
      // Get all members with residence
      const { data: allMembers, error: membersError } = await supabase
        .from('members')
        .select('id, name, surname, phone, residence, cell_group_id, created_at, status');

      if (membersError) throw membersError;
      if (!allMembers || allMembers.length === 0) {
        setAbsentMembers([]);
        return;
      }

      // Get attendance records for the last 2 Sunday services
      const { data: attendances, error: attendanceError } = await supabase
        .from('event_attendees')
        .select('members_id, event_id, attendance_status')
        .in('event_id', lastTwoSundays.map(e => e.id));

      if (attendanceError) throw attendanceError;

      // Find members who were absent for both services
      const absent: AbsentMember[] = [];
      
      allMembers.forEach(member => {
        // Filter attendance records for this member
        const memberAttendances = attendances?.filter(a => a.members_id === member.id) || [];
        
        // Check attendance for each of the last 2 Sundays
        let absentCount = 0;
        
        for (const sunday of lastTwoSundays) {
          const attendanceForEvent = memberAttendances.find(a => a.event_id === sunday.id);
          
          // Member is considered absent if:
          // 1. They have an attendance record with attendance_status = 'absent'
          // 2. OR they don't have any attendance record at all for that event
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
            consecutiveAbsences: absentCount,
            lastEventDate: lastTwoSundays[0].event_date
          });
        }
      });

      setAbsentMembers(absent);
    } catch (error) {
      console.error('Error loading absent members:', error);
      setAbsentMembers([]);
    }
  };

  const calculateStats = (allMembers: Member[], events: Event[], allSermons: Sermon[]) => {
    const totalMembers = allMembers.length;
    const newcomers = allMembers.filter(m => m.status === 'newcomer').length;
    const signedMembers = allMembers.filter(m => m.status === 'signed_member').length;
    const upcomingEventsCount = events.length;
    const totalSermons = allSermons.length;
    
    const uniqueGroups = [...new Set(allMembers.map(m => m.cell_group_id).filter(Boolean))].length;

    // Use the current absentMembers state (already loaded)
    const absentCount = absentMembers.length;

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
        value: absentCount.toString(), 
        change: absentCount > 0 ? `${absentCount} need follow-up` : 'All members present',
        changeType: absentCount > 0 ? 'negative' : 'positive',
        color: 'from-red-500 to-red-600',
        bgColor: 'bg-red-50 dark:bg-red-950/20',
        action: 'viewAbsentMembers'
      },
    ];

    setStats(statsData);
  };

  const generateRecentActivities = (allMembers: Member[], events: Event[], allSermons: Sermon[]) => {
    const activities: Activity[] = [];

    // Add recent member joins
    const recentMembers = allMembers.slice(0, 2);
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

  // Submit follow-up action
  const submitFollowUp = async () => {
    try {
      if (!selectedAbsentMember) return;
      
      setFollowUpLoading(true);
      setError(null);

      const { error: followUpError } = await supabase
        .from('follow_up_actions')
        .insert({
          member_id: selectedAbsentMember.id,
          follow_up_date: followUpForm.followUpDate,
          follow_up_type: followUpForm.followUpType,
          status: followUpForm.callMade ? 'completed' : 'pending',
          notes: followUpForm.notes,
          assigned_to: profile?.id || null
        });

      if (followUpError) throw followUpError;

      setSuccess('Follow-up action recorded successfully!');
      setTimeout(() => {
        setSuccess(null);
        setSelectedAbsentMember(null);
        setFollowUpForm({
          memberId: '',
          followUpDate: new Date().toISOString().split('T')[0],
          followUpType: 'phone_call',
          notes: '',
          callMade: false
        });
        closeModal();
      }, 2000);
      
    } catch (error: any) {
      console.error('Error submitting follow-up:', error);
      setError(error.message || 'Failed to record follow-up action');
    } finally {
      setFollowUpLoading(false);
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

  useEffect(() => {
    loadDashboardData();
  }, []);

  const openModal = (modalType: string) => {
    setActiveModal(modalType);
    setError(null);
  };

  const closeModal = () => {
    setActiveModal(null);
    setSelectedMember(null);
    setSelectedEvent(null);
    setSelectedSermon(null);
    setSelectedAbsentMember(null);
    setFollowUpForm({
      memberId: '',
      followUpDate: new Date().toISOString().split('T')[0],
      followUpType: 'phone_call',
      notes: '',
      callMade: false
    });
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

  const getFollowUpTypeIcon = (type: string) => {
    switch(type) {
      case 'phone_call': return <Phone className="h-4 w-4" />;
      case 'visit': return <Home className="h-4 w-4" />;
      case 'residence': return <Mail className="h-4 w-4" />;
      case 'sms': return <MessageSquare className="h-4 w-4" />;
      default: return <Phone className="h-4 w-4" />;
    }
  };

  const getFollowUpTypeColor = (type: string) => {
    switch(type) {
      case 'phone_call': return 'bg-blue-100 text-blue-700';
      case 'visit': return 'bg-green-100 text-green-700';
      case 'residence': return 'bg-purple-100 text-purple-700';
      case 'sms': return 'bg-orange-100 text-orange-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const openFollowUpForm = (member: AbsentMember) => {
    setSelectedAbsentMember(member);
    setFollowUpForm(prev => ({
      ...prev,
      memberId: member.id
    }));
    setActiveModal('followUpForm');
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
  const filteredSermons = getFilteredSermons();

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

      {/* Content Grid - All users can see */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
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

        {/* Recent Sermons */}
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
                {filteredSermons.slice(0, 5).map((sermon) => (
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
              <button 
                onClick={() => openModal('viewSermons')}
                className="w-full mt-4 text-center text-orange-600 dark:text-orange-400 hover:text-orange-700 dark:hover:text-orange-300 font-medium transition-colors py-2"
              >
                View All Sermons
              </button>
            </div>
          )}
        </div>
      </div>

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

      {/* Absent Members Modal */}
      {activeModal === 'viewAbsentMembers' && (
        <Modal title="Members Absent for 2 Sundays" size="max-w-6xl">
          <div className="space-y-6">
            <div className="bg-red-50 border border-red-200 rounded-xl p-4">
              <div className="flex items-center gap-3">
                <AlertTriangle className="h-6 w-6 text-red-600" />
                <div>
                  <h4 className="font-bold text-gray-900">Follow-up Required</h4>
                  <p className="text-sm text-gray-600">
                    {filteredAbsentMembers.length} member{filteredAbsentMembers.length !== 1 ? 's' : ''} have missed 2 consecutive Sunday services.
                  </p>
                </div>
              </div>
            </div>
            
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {filteredAbsentMembers.map((member) => (
                <div key={member.id} className="border border-gray-200 rounded-xl p-4 hover:bg-gray-50 transition-colors duration-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-orange-500 rounded-full flex items-center justify-center text-white font-semibold">
                        {member.name.charAt(0)}{member.surname.charAt(0)}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{member.name} {member.surname}</p>
                        <div className="flex items-center gap-3 mt-1">
                          {member.phone && (
                            <div className="flex items-center gap-1 text-sm text-gray-600">
                              <Phone className="h-3 w-3" />
                              <span>{member.phone}</span>
                            </div>
                          )}
                          {member.residence && (
                            <div className="flex items-center gap-1 text-sm text-gray-600">
                              <Mail className="h-3 w-3" />
                              <span>{member.residence}</span>
                            </div>
                          )}
                        </div>
                        <p className="text-xs text-red-600 mt-2">
                          <AlertTriangle className="h-3 w-3 inline mr-1" />
                          Absent for {member.consecutiveAbsences} consecutive Sundays
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {member.phone && (
                        <a
                          href={`tel:${member.phone}`}
                          className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors font-medium"
                        >
                          <Phone className="h-4 w-4" />
                          Call Now
                        </a>
                      )}
                      <button 
                        onClick={() => openFollowUpForm(member)}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium"
                      >
                        <Clock className="h-4 w-4" />
                        Record Follow-up
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              {filteredAbsentMembers.length === 0 && (
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircle className="h-8 w-8 text-green-600" />
                  </div>
                  <h4 className="text-lg font-semibold text-gray-900 mb-2">Great News!</h4>
                  <p className="text-gray-600">
                    All members have attended at least one of the last 2 Sunday services.
                  </p>
                </div>
              )}
            </div>
          </div>
        </Modal>
      )}

      {/* Follow-up Form Modal */}
      {activeModal === 'followUpForm' && selectedAbsentMember && (
        <Modal title="Record Follow-up Action" size="max-w-md">
          <div className="space-y-6">
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
              <div className="flex items-center gap-3">
                <User className="h-5 w-5 text-blue-600" />
                <div>
                  <h4 className="font-bold text-gray-900">{selectedAbsentMember.name} {selectedAbsentMember.surname}</h4>
                  <div className="flex items-center gap-2 mt-1">
                    {selectedAbsentMember.phone && (
                      <div className="flex items-center gap-1 text-sm text-gray-600">
                        <Phone className="h-3 w-3" />
                        <span>{selectedAbsentMember.phone}</span>
                      </div>
                    )}
                    {selectedAbsentMember.residence && (
                      <div className="flex items-center gap-1 text-sm text-gray-600">
                        <Mail className="h-3 w-3" />
                        <span className="truncate max-w-[150px]">{selectedAbsentMember.residence}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Follow-up Date *
                </label>
                <input
                  type="date"
                  value={followUpForm.followUpDate}
                  onChange={(e) => setFollowUpForm({...followUpForm, followUpDate: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Follow-up Type *
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {(['phone_call', 'visit', 'residence', 'sms'] as const).map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setFollowUpForm({...followUpForm, followUpType: type})}
                      className={`flex items-center justify-center gap-2 px-3 py-2 rounded-lg border transition-colors ${
                        followUpForm.followUpType === type 
                          ? `${getFollowUpTypeColor(type).split(' ')[0]} border-transparent font-medium`
                          : 'border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      {getFollowUpTypeIcon(type)}
                      <span className="capitalize">{type.replace('_', ' ')}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Notes
                </label>
                <textarea
                  value={followUpForm.notes}
                  onChange={(e) => setFollowUpForm({...followUpForm, notes: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[100px]"
                  placeholder="Enter any notes about the follow-up..."
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="callMade"
                  checked={followUpForm.callMade}
                  onChange={(e) => setFollowUpForm({...followUpForm, callMade: e.target.checked})}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="callMade" className="text-sm font-medium text-gray-700">
                  Follow-up completed
                </label>
              </div>
            </div>

            <div className="flex gap-3 pt-4 border-t border-gray-200">
              <button
                onClick={closeModal}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                onClick={submitFollowUp}
                disabled={followUpLoading}
                className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {followUpLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Saving...
                  </span>
                ) : 'Save Follow-up'}
              </button>
            </div>
          </div>
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
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex-1">
                      <h4 className="font-bold text-lg text-gray-900 mb-1">{sermon.title}</h4>
                      <p className="text-orange-600 font-medium text-sm">
                        {sermon.events?.name || 'Standalone Sermon'}
                      </p>
                    </div>
                    <span className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
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

      {/* Members Modal */}
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
                placeholder="Search members by name, residence, or phone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="space-y-3 max-h-96 overflow-y-auto">
              {filteredMembers
                .filter(member => 
                  `${member.name} ${member.surname}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
                  (member.residence && member.residence.toLowerCase().includes(searchTerm.toLowerCase())) ||
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
                      <p className="text-sm text-gray-500">{member.residence || member.phone || 'No contact'}</p>
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
