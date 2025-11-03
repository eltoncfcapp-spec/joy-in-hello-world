import { useState, useEffect } from 'react';
import { 
  Users, 
  Calendar, 
  DollarSign, 
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
  ChevronUp
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
  invited_by: string | null;
  created_at: string | null;
  status: 'newcomer' | 'signed_member' | 'not_attending' | null;
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
}

interface Donation {
  id: string;
  donor: string;
  amount: number;
  date: string;
  type: string;
  message: string;
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
  const [newDonation] = useState({
    donor: '',
    amount: 0,
    type: '',
    message: ''
  });

  // Load dashboard data from Supabase
  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      // Load members
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

      // Load events
      const { data: eventsData, error: eventsError } = await supabase
        .from('events')
        .select('*')
        .gte('event_date', new Date().toISOString().split('T')[0])
        .order('event_date', { ascending: true });

      if (eventsError) throw eventsError;
      setUpcomingEvents(eventsData || []);

      // Calculate stats
      calculateStats(membersData || [], eventsData || []);

      // Generate recent activities
      generateRecentActivities(membersData || [], eventsData || []);

    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (members: Member[], events: Event[]) => {
    const totalMembers = members.length;
    const newcomers = members.filter(m => m.status === 'newcomer').length;
    const signedMembers = members.filter(m => m.status === 'signed_member').length;
    const upcomingEventsCount = events.length;
    
    const uniqueGroups = [...new Set(members.map(m => m.cell_group_id).filter(Boolean))].length;

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
    setActiveModal(modalType);
  };

  const closeModal = () => {
    setActiveModal(null);
    setSelectedMember(null);
    setSelectedEvent(null);
    // Reset form states
    setNewMember({ name: '', surname: '', email: '', phone: '', invited_by: '', cell_group_id: '' });
    setNewEvent({ name: '', location: '', event_date: '', event_time: '', topic: '' });
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

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'border-red-400';
      case 'medium': return 'border-yellow-400';
      case 'low': return 'border-green-400';
      default: return 'border-gray-400';
    }
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
          status: newMember.status,
          join_date: new Date().toISOString().split('T')[0]
        }])
        .select();

      if (error) throw error;
      
      if (data) {
        await loadDashboardData(); // Refresh data
        closeModal();
      }
    } catch (error) {
      console.error('Error adding member:', error);
    }
  };

  // Create event handler
  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { data, error } = await supabase
        .from('events')
        .insert([{
          title: newEvent.title,
          location: newEvent.location,
          date: newEvent.date,
          time: newEvent.time,
          description: newEvent.description,
          type: newEvent.type,
          max_attendees: newEvent.maxAttendees,
          priority: newEvent.priority,
          attendees: 0
        }])
        .select();

      if (error) throw error;
      
      if (data) {
        await loadDashboardData(); // Refresh data
        closeModal();
      }
    } catch (error) {
      console.error('Error creating event:', error);
    }
  };

  // Record donation handler
  const handleRecordDonation = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { data, error } = await supabase
        .from('donations')
        .insert([{
          donor: newDonation.donor,
          amount: newDonation.amount,
          type: newDonation.type,
          message: newDonation.message,
          date: new Date().toISOString().split('T')[0]
        }])
        .select();

      if (error) throw error;
      
      if (data) {
        await loadDashboardData(); // Refresh data
        closeModal();
      }
    } catch (error) {
      console.error('Error recording donation:', error);
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
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-6 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-6 animate-fadeIn">
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

      {/* Stats Grid */}
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
                    className={`w-full border-l-4 ${getPriorityColor(event.priority)} pl-4 py-3 rounded-r-lg hover:bg-gray-50/50 dark:hover:bg-gray-700/30 transition-colors duration-200 group text-left focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-inset`}
                  >
                    <div className="flex justify-between items-start mb-1">
                      <h3 className="font-semibold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                        {event.title}
                      </h3>
                      <span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded-full">
                        {event.attendees} attending
                      </span>
                    </div>
                    <p className="text-gray-600 dark:text-gray-400 text-sm mb-1">
                      {event.time}
                    </p>
                    <p className="text-gray-500 dark:text-gray-400 text-xs flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {event.location}
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
            onClick={() => openModal('recordDonation')}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl transition-all duration-200 hover:scale-105 font-medium"
          >
            <DollarSign className="h-4 w-4" />
            Record Donation
          </button>
          <button 
            onClick={() => openModal('sendAnnouncement')}
            className="flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-xl transition-all duration-200 hover:scale-105 font-medium"
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
              {members.map(member => (
                <div key={member.id} className="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-700 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">{member.name}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{member.group}</p>
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

      {activeModal === 'memberDetail' && selectedMember && (
        <Modal title="Member Details">
          <div className="space-y-4">
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold text-xl mx-auto mb-3">
                {selectedMember.name.split(' ').map(n => n[0]).join('')}
              </div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">{selectedMember.name}</h3>
              <p className="text-gray-500 dark:text-gray-400">{selectedMember.group}</p>
            </div>
            
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Email:</span>
                <span className="text-gray-900 dark:text-white">{selectedMember.email}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Phone:</span>
                <span className="text-gray-900 dark:text-white">{selectedMember.phone}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Join Date:</span>
                <span className="text-gray-900 dark:text-white">{selectedMember.joinDate}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Status:</span>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  selectedMember.status === 'active' 
                    ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                    : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
                }`}>
                  {selectedMember.status}
                </span>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {activeModal === 'eventDetail' && selectedEvent && (
        <Modal title="Event Details">
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">{selectedEvent.title}</h3>
            
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-gray-500" />
                <span className="text-gray-900 dark:text-white">{selectedEvent.time}</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-gray-500" />
                <span className="text-gray-900 dark:text-white">{selectedEvent.location}</span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-gray-500" />
                <span className="text-gray-900 dark:text-white">{selectedEvent.type}</span>
              </div>
            </div>

            <div>
              <p className="text-gray-600 dark:text-gray-400 text-sm">{selectedEvent.description}</p>
            </div>

            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-gray-600 dark:text-gray-400">Attendance</span>
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  {selectedEvent.attendees} / {selectedEvent.maxAttendees}
                </span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                <div 
                  className="bg-green-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${(selectedEvent.attendees / selectedEvent.maxAttendees) * 100}%` }}
                />
              </div>
            </div>
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
            <p className="text-gray-600 dark:text-gray-400">Create a new church event.</p>
            <div className="space-y-3">
              <input 
                type="text" 
                placeholder="Event Title"
                value={newEvent.title}
                onChange={(e) => setNewEvent({...newEvent, title: e.target.value})}
                className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                required
              />
              <input 
                type="text" 
                placeholder="Location"
                value={newEvent.location}
                onChange={(e) => setNewEvent({...newEvent, location: e.target.value})}
                className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                required
              />
              <input 
                type="date"
                value={newEvent.date}
                onChange={(e) => setNewEvent({...newEvent, date: e.target.value})}
                className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                required
              />
              <input 
                type="time"
                value={newEvent.time}
                onChange={(e) => setNewEvent({...newEvent, time: e.target.value})}
                className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                required
              />
              <textarea 
                placeholder="Event Description"
                rows={3}
                value={newEvent.description}
                onChange={(e) => setNewEvent({...newEvent, description: e.target.value})}
                className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
            <button type="submit" className="w-full bg-green-600 hover:bg-green-700 text-white py-3 rounded-lg font-medium transition-colors">
              Create Event
            </button>
          </form>
        </Modal>
      )}

      {activeModal === 'recordDonation' && (
        <Modal title="Record Donation">
          <form onSubmit={handleRecordDonation} className="space-y-4">
            <p className="text-gray-600 dark:text-gray-400">Record a new donation.</p>
            <div className="space-y-3">
              <input 
                type="text" 
                placeholder="Donor Name"
                value={newDonation.donor}
                onChange={(e) => setNewDonation({...newDonation, donor: e.target.value})}
                className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                required
              />
              <input 
                type="number" 
                placeholder="Amount"
                value={newDonation.amount || ''}
                onChange={(e) => setNewDonation({...newDonation, amount: parseFloat(e.target.value)})}
                className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                required
              />
              <select 
                value={newDonation.type}
                onChange={(e) => setNewDonation({...newDonation, type: e.target.value})}
                className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                required
              >
                <option value="">Select Type</option>
                <option value="Tithes">Tithes</option>
                <option value="Offering">Offering</option>
                <option value="Building Fund">Building Fund</option>
                <option value="Missions">Missions</option>
              </select>
              <textarea 
                placeholder="Message (Optional)"
                rows={2}
                value={newDonation.message}
                onChange={(e) => setNewDonation({...newDonation, message: e.target.value})}
                className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
            <button type="submit" className="w-full bg-purple-600 hover:bg-purple-700 text-white py-3 rounded-lg font-medium transition-colors">
              Record Donation
            </button>
          </form>
        </Modal>
      )}
    </div>
  );
};

export default Dashboard;
