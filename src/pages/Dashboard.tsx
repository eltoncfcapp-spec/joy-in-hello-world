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
  Mail,
  UserPlus,
  MapPin,
  Clock,
  ChevronDown,
  ChevronUp,
  Crown,
  LayoutDashboard,
  LogOut,
  User
} from 'lucide-react';
import { supabase } from '../integrations/supabase/client';

// Types
interface Member {
  id: string;
  name: string;
  surname: string;
  email: string | null;
  phone: string | null;
  cell_group_id: string | null;
  ministry_group_id: string | null;
  invited_by: string | null;
  created_at: string | null;
  status: 'newcomer' | 'signed_member' | 'not_attending' | null;
  is_leader: boolean | null;
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
  description: string | null;
  created_at: string;
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

const Dashboard = () => {
  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [expandedSections, setExpandedSections] = useState<{[key: string]: boolean}>({
    events: true,
    activity: true
  });
  const [loading, setLoading] = useState(true);

  // Real data state
  const [stats, setStats] = useState<StatCard[]>([]);
  const [recentActivities, setRecentActivities] = useState<Activity[]>([]);
  const [upcomingEvents, setUpcomingEvents] = useState<Event[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [cellGroups, setCellGroups] = useState<CellGroup[]>([]);
  const [ministryGroups, setMinistryGroups] = useState<MinistryGroup[]>([]);

  // Form states
  const [newMember, setNewMember] = useState({
    name: '',
    surname: '',
    email: '',
    phone: '',
    invited_by: '',
    cell_group_id: '',
    ministry_group_id: '',
    is_leader: false
  });
  const [newEvent, setNewEvent] = useState({
    name: '',
    location: '',
    event_date: '',
    event_time: '',
    topic: ''
  });
  const [newMinistryGroup, setNewMinistryGroup] = useState({
    name: '',
    description: ''
  });

  // Load dashboard data from Supabase
  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      // Load members with related data
      const { data: membersData, error: membersError } = await supabase
        .from('members')
        .select(`
          *,
          cell_groups(name),
          ministry_groups(name)
        `)
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

      // Load ministry groups
      const { data: ministryGroupsData, error: ministryGroupsError } = await supabase
        .from('ministry_groups')
        .select('*')
        .order('name');

      if (ministryGroupsError) throw ministryGroupsError;
      setMinistryGroups(ministryGroupsData || []);

      // Load events
      const { data: eventsData, error: eventsError } = await supabase
        .from('events')
        .select('*')
        .gte('event_date', new Date().toISOString().split('T')[0])
        .order('event_date', { ascending: true });

      if (eventsError) throw eventsError;
      setUpcomingEvents(eventsData || []);

      // Calculate stats
      calculateStats(membersData || [], eventsData || [], ministryGroupsData || []);

      // Generate recent activities
      generateRecentActivities(membersData || [], eventsData || []);

    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (members: Member[], events: Event[], ministryGroups: MinistryGroup[]) => {
    const totalMembers = members.length;
    const newcomers = members.filter(m => m.status === 'newcomer').length;
    const signedMembers = members.filter(m => m.status === 'signed_member').length;
    const upcomingEventsCount = events.length;
    const leadersCount = members.filter(m => m.is_leader).length;
    
    const uniqueCellGroups = [...new Set(members.map(m => m.cell_group_id).filter(Boolean))].length;
    const uniqueMinistryGroups = ministryGroups.length;

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
        label: 'Cell Groups', 
        value: uniqueCellGroups.toString(), 
        change: `${uniqueCellGroups} active groups`, 
        changeType: 'positive',
        color: 'from-orange-500 to-orange-600',
        bgColor: 'bg-orange-50 dark:bg-orange-950/20',
        action: 'viewGroups'
      },
      { 
        icon: Crown, 
        label: 'Ministry Groups', 
        value: uniqueMinistryGroups.toString(), 
        change: `${leadersCount} leaders`, 
        changeType: 'positive',
        color: 'from-red-500 to-red-600',
        bgColor: 'bg-red-50 dark:bg-red-950/20',
        action: 'viewMinistryGroups'
      },
    ];

    setStats(statsData);
  };

  const generateRecentActivities = (members: Member[], events: Event[]) => {
    const activities: Activity[] = [];

    // Add recent member joins
    const recentMembers = members.slice(0, 3);
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

    setRecentActivities(activities.sort((a, b) => b.id - a.id).slice(0, 4));
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
    setActiveModal(modalType);
  };

  const closeModal = () => {
    setActiveModal(null);
    setSelectedMember(null);
    setSelectedEvent(null);
    // Reset form states
    setNewMember({ name: '', surname: '', email: '', phone: '', invited_by: '', cell_group_id: '', ministry_group_id: '', is_leader: false });
    setNewEvent({ name: '', location: '', event_date: '', event_time: '', topic: '' });
    setNewMinistryGroup({ name: '', description: '' });
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
          ministry_group_id: newMember.ministry_group_id || null,
          is_leader: newMember.is_leader,
          status: 'newcomer'
        }]);

      if (error) throw error;
      
      alert('Member added successfully!');
      await loadDashboardData();
      closeModal();
    } catch (error) {
      console.error('Error adding member:', error);
      alert('Failed to add member');
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
      alert('Failed to create event');
    }
  };

  // Create ministry group handler
  const handleCreateMinistryGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { error } = await supabase
        .from('ministry_groups')
        .insert([{
          name: newMinistryGroup.name,
          description: newMinistryGroup.description || null
        }]);

      if (error) throw error;
      
      alert('Ministry Group created successfully!');
      await loadDashboardData();
      closeModal();
    } catch (error) {
      console.error('Error creating ministry group:', error);
      alert('Failed to create ministry group');
    }
  };

  const Modal = ({ children, title }: { children: React.ReactNode; title: string }) => (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto animate-scaleIn">
        <div className="flex justify-between items-center p-6 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white">{title}</h3>
          <button 
            onClick={closeModal}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
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
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 flex">
        {/* Sidebar */}
        <div className="w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 min-h-screen p-6">
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Church App</h1>
          </div>
          
          <nav className="space-y-2">
            <button className="w-full flex items-center gap-3 px-4 py-3 bg-blue-600 text-white rounded-xl font-medium">
              <LayoutDashboard className="h-5 w-5" />
              Dashboard
            </button>
            <button className="w-full flex items-center gap-3 px-4 py-3 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors">
              <Users className="h-5 w-5" />
              Members
            </button>
            <button className="w-full flex items-center gap-3 px-4 py-3 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors">
              <Calendar className="h-5 w-5" />
              Events
            </button>
            <button className="w-full flex items-center gap-3 px-4 py-3 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors">
              <TrendingUp className="h-5 w-5" />
              Groups
            </button>
            <button className="w-full flex items-center gap-3 px-4 py-3 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors">
              <User className="h-5 w-5" />
              Admin
            </button>
          </nav>

          <div className="mt-auto pt-8 border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white text-sm font-semibold">
                AU
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">Admin User</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Logged in as</p>
              </div>
            </div>
            <button className="w-full flex items-center gap-3 px-4 py-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors">
              <LogOut className="h-4 w-4" />
              Logout
            </button>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 p-6 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600 dark:text-gray-400">Loading dashboard...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 flex">
      {/* Sidebar */}
      <div className="w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 min-h-screen p-6">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Church App</h1>
        </div>
        
        <nav className="space-y-2">
          <button className="w-full flex items-center gap-3 px-4 py-3 bg-blue-600 text-white rounded-xl font-medium">
            <LayoutDashboard className="h-5 w-5" />
            Dashboard
          </button>
          <button className="w-full flex items-center gap-3 px-4 py-3 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors">
            <Users className="h-5 w-5" />
            Members
          </button>
          <button className="w-full flex items-center gap-3 px-4 py-3 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors">
            <Calendar className="h-5 w-5" />
            Events
          </button>
          <button className="w-full flex items-center gap-3 px-4 py-3 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors">
            <TrendingUp className="h-5 w-5" />
            Groups
          </button>
          <button className="w-full flex items-center gap-3 px-4 py-3 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors">
            <User className="h-5 w-5" />
            Admin
          </button>
        </nav>

        <div className="mt-auto pt-8 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white text-sm font-semibold">
              AU
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-white">Admin User</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Logged in as</p>
            </div>
          </div>
          <button className="w-full flex items-center gap-3 px-4 py-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors">
            <LogOut className="h-4 w-4" />
            Logout
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-6 animate-fadeIn">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
              Dashboard
            </h1>
            <p className="text-foreground/60">Welcome to your church management dashboard</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center text-white font-semibold">
              AD
            </div>
          </div>
        </div>

        {/* Stats Grid - 5 cards without donations */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6 mb-8">
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
                  onClick={() => openModal('activity')}
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
                  {upcomingEvents.map((event) => (
                    <button
                      key={event.id}
                      onClick={() => openEventDetail(event)}
                      className="w-full border-l-4 border-blue-400 pl-4 py-3 rounded-r-lg hover:bg-gray-50/50 dark:hover:bg-gray-700/30 transition-colors duration-200 group text-left focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-inset"
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
                      <p className="text-gray-500 dark:text-gray-400 text-xs flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {event.location || 'No location'}
                      </p>
                    </button>
                  ))}
                  {upcomingEvents.length === 0 && (
                    <p className="text-gray-500 dark:text-gray-400 text-center py-4">No upcoming events</p>
                  )}
                </div>
                <button 
                  onClick={() => openModal('events')}
                  className="w-full mt-4 text-center text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium transition-colors py-2"
                >
                  View Calendar
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions */}
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
            <button 
              onClick={() => openModal('createMinistryGroup')}
              className="flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-xl transition-all duration-200 hover:scale-105 font-medium"
            >
              <Crown className="h-4 w-4" />
              Create Ministry Group
            </button>
            <button 
              onClick={() => openModal('sendAnnouncement')}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl transition-all duration-200 hover:scale-105 font-medium"
            >
              <Mail className="h-4 w-4" />
              Send Announcement
            </button>
          </div>
        </div>

        {/* Modals */}
        {activeModal === 'viewMembers' && (
          <Modal title="All Members">
            <div className="space-y-4">
              <p className="text-gray-600 dark:text-gray-400">View and manage all church members.</p>
              <div className="space-y-3">
                {members.slice(0, 5).map(member => (
                  <div key={member.id} className="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-700 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">{member.name} {member.surname}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {member.email || member.phone || 'No contact'}
                        {member.is_leader && (
                          <span className="ml-2 px-2 py-1 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 rounded-full text-xs">
                            Leader
                          </span>
                        )}
                      </p>
                    </div>
                    <button 
                      onClick={() => openMemberDetail(member)}
                      className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 text-sm font-medium"
                    >
                      View Details
                    </button>
                  </div>
                ))}
                {members.length === 0 && (
                  <p className="text-gray-500 dark:text-gray-400 text-center py-4">No members found</p>
                )}
              </div>
            </div>
          </Modal>
        )}

        {activeModal === 'viewMinistryGroups' && (
          <Modal title="Ministry Groups">
            <div className="space-y-4">
              <p className="text-gray-600 dark:text-gray-400">View all ministry groups.</p>
              <div className="space-y-3">
                {ministryGroups.map(group => (
                  <div key={group.id} className="p-3 border border-gray-200 dark:border-gray-700 rounded-lg">
                    <p className="font-medium text-gray-900 dark:text-white">{group.name}</p>
                    {group.description && (
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{group.description}</p>
                    )}
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
                      Members: {members.filter(m => m.ministry_group_id === group.id).length}
                      {members.filter(m => m.ministry_group_id === group.id && m.is_leader).length > 0 && 
                        ` • ${members.filter(m => m.ministry_group_id === group.id && m.is_leader).length} leaders`
                      }
                    </p>
                  </div>
                ))}
                {ministryGroups.length === 0 && (
                  <p className="text-gray-500 dark:text-gray-400 text-center py-4">No ministry groups found</p>
                )}
              </div>
            </div>
          </Modal>
        )}

        {activeModal === 'memberDetail' && selectedMember && (
          <Modal title="Member Details">
            <div className="space-y-4">
              <div className="text-center">
                <div className="w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold text-xl mx-auto mb-3">
                  {selectedMember.name.charAt(0)}{selectedMember.surname.charAt(0)}
                </div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">{selectedMember.name} {selectedMember.surname}</h3>
                <div className="flex items-center justify-center gap-2 mt-2">
                  {selectedMember.is_leader && (
                    <span className="px-2 py-1 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 rounded-full text-xs font-medium">
                      Leader
                    </span>
                  )}
                  <span className="text-gray-500 dark:text-gray-400 text-sm">
                    {selectedMember.cell_groups?.name ? `Cell Group: ${selectedMember.cell_groups.name}` : 'No cell group'}
                  </span>
                </div>
              </div>
              
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Email:</span>
                  <span className="text-gray-900 dark:text-white">{selectedMember.email || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Phone:</span>
                  <span className="text-gray-900 dark:text-white">{selectedMember.phone || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Invited By:</span>
                  <span className="text-gray-900 dark:text-white">{selectedMember.invited_by || 'N/A'}</span>
                </div>
                {selectedMember.ministry_groups && (
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Ministry Group:</span>
                    <span className="text-gray-900 dark:text-white">
                      {selectedMember.ministry_groups.name}
                    </span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Status:</span>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    selectedMember.status === 'signed_member' 
                      ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                      : selectedMember.status === 'not_attending'
                      ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
                      : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                  }`}>
                    {selectedMember.status || 'newcomer'}
                  </span>
                </div>
              </div>
            </div>
          </Modal>
        )}

        {activeModal === 'eventDetail' && selectedEvent && (
          <Modal title="Event Details">
            <div className="space-y-4">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">{selectedEvent.name}</h3>
              
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-gray-500" />
                  <span className="text-gray-900 dark:text-white">{selectedEvent.event_time}</span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-gray-500" />
                  <span className="text-gray-900 dark:text-white">{selectedEvent.location || 'No location'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-gray-500" />
                  <span className="text-gray-900 dark:text-white">{selectedEvent.event_date}</span>
                </div>
              </div>

              {selectedEvent.topic && (
                <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                  <p className="text-gray-600 dark:text-gray-400 text-sm">{selectedEvent.topic}</p>
                </div>
              )}
            </div>
          </Modal>
        )}

        {activeModal === 'addMember' && (
          <Modal title="Add New Member">
            <form onSubmit={handleAddMember} className="space-y-4">
              <div className="space-y-3">
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    First Name *
                  </label>
                  <input 
                    type="text" 
                    placeholder="Enter first name"
                    value={newMember.name}
                    onChange={(e) => setNewMember({...newMember, name: e.target.value})}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Last Name *
                  </label>
                  <input 
                    type="text" 
                    placeholder="Enter last name"
                    value={newMember.surname}
                    onChange={(e) => setNewMember({...newMember, surname: e.target.value})}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Email
                  </label>
                  <input 
                    type="email" 
                    placeholder="Enter email address"
                    value={newMember.email}
                    onChange={(e) => setNewMember({...newMember, email: e.target.value})}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Phone
                  </label>
                  <input 
                    type="tel" 
                    placeholder="Enter phone number"
                    value={newMember.phone}
                    onChange={(e) => setNewMember({...newMember, phone: e.target.value})}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Invited By
                  </label>
                  <input 
                    type="text" 
                    placeholder="Who invited this member?"
                    value={newMember.invited_by}
                    onChange={(e) => setNewMember({...newMember, invited_by: e.target.value})}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Cell Group
                  </label>
                  <select 
                    value={newMember.cell_group_id}
                    onChange={(e) => setNewMember({...newMember, cell_group_id: e.target.value})}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                  >
                    <option value="">Select cell group</option>
                    {cellGroups.map((group) => (
                      <option key={group.id} value={group.id}>
                        {group.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Ministry Group
                  </label>
                  <select 
                    value={newMember.ministry_group_id}
                    onChange={(e) => setNewMember({...newMember, ministry_group_id: e.target.value})}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                  >
                    <option value="">Select ministry group</option>
                    {ministryGroups.map((group) => (
                      <option key={group.id} value={group.id}>
                        {group.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <input 
                    type="checkbox" 
                    id="is_leader"
                    checked={newMember.is_leader}
                    onChange={(e) => setNewMember({...newMember, is_leader: e.target.checked})}
                    className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
                  />
                  <label htmlFor="is_leader" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    This member is a leader
                  </label>
                </div>
              </div>
              <div className="flex gap-3">
                <button 
                  type="submit" 
                  className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:shadow-lg text-white py-3 rounded-xl font-medium transition-all duration-200"
                >
                  Add Member
                </button>
                <button 
                  type="button" 
                  onClick={closeModal}
                  className="px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200 font-medium"
                >
                  Cancel
                </button>
              </div>
            </form>
          </Modal>
        )}

        {activeModal === 'createEvent' && (
          <Modal title="Create New Event">
            <form onSubmit={handleCreateEvent} className="space-y-4">
              <div className="space-y-3">
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Event Name *
                  </label>
                  <input 
                    type="text" 
                    placeholder="Enter event name"
                    value={newEvent.name}
                    onChange={(e) => setNewEvent({...newEvent, name: e.target.value})}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Location
                  </label>
                  <input 
                    type="text" 
                    placeholder="Event location"
                    value={newEvent.location}
                    onChange={(e) => setNewEvent({...newEvent, location: e.target.value})}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Date *
                  </label>
                  <input 
                    type="date"
                    value={newEvent.event_date}
                    onChange={(e) => setNewEvent({...newEvent, event_date: e.target.value})}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Time *
                  </label>
                  <input 
                    type="time"
                    value={newEvent.event_time}
                    onChange={(e) => setNewEvent({...newEvent, event_time: e.target.value})}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Topic
                  </label>
                  <textarea 
                    placeholder="Event topic or description"
                    rows={3}
                    value={newEvent.topic}
                    onChange={(e) => setNewEvent({...newEvent, topic: e.target.value})}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                  />
                </div>
              </div>
              <div className="flex gap-3">
                <button 
                  type="submit" 
                  className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 hover:shadow-lg text-white py-3 rounded-xl font-medium transition-all duration-200"
                >
                  Create Event
                </button>
                <button 
                  type="button" 
                  onClick={closeModal}
                  className="px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200 font-medium"
                >
                  Cancel
                </button>
              </div>
            </form>
          </Modal>
        )}

        {activeModal === 'createMinistryGroup' && (
          <Modal title="Create Ministry Group">
            <form onSubmit={handleCreateMinistryGroup} className="space-y-4">
              <div className="space-y-3">
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Ministry Group Name *
                  </label>
                  <input 
                    type="text" 
                    placeholder="Enter ministry group name"
                    value={newMinistryGroup.name}
                    onChange={(e) => setNewMinistryGroup({...newMinistryGroup, name: e.target.value})}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Description
                  </label>
                  <textarea 
                    placeholder="Enter ministry group description"
                    rows={3}
                    value={newMinistryGroup.description}
                    onChange={(e) => setNewMinistryGroup({...newMinistryGroup, description: e.target.value})}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                  />
                </div>
              </div>
              <div className="flex gap-3">
                <button 
                  type="submit" 
                  className="flex-1 bg-gradient-to-r from-orange-600 to-amber-600 hover:shadow-lg text-white py-3 rounded-xl font-medium transition-all duration-200"
                >
                  Create Ministry Group
                </button>
                <button 
                  type="button" 
                  onClick={closeModal}
                  className="px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200 font-medium"
                >
                  Cancel
                </button>
              </div>
            </form>
          </Modal>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
