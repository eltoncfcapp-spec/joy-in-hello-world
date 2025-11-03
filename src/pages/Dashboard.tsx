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
  const [ministryGroups, setMinistryGroups] = useState<MinistryGroup[]>([]);
  const [donations, setDonations] = useState<Donation[]>([]);

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
  const [newDonation, setNewDonation] = useState({
    donor: '',
    amount: 0,
    type: '',
    message: ''
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

      // Load donations
      const { data: donationsData, error: donationsError } = await supabase
        .from('donations')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

      if (donationsError) throw donationsError;
      setDonations(donationsData || []);

      // Calculate stats
      calculateStats(membersData || [], eventsData || [], ministryGroupsData || [], donationsData || []);

      // Generate recent activities
      generateRecentActivities(membersData || [], eventsData || [], donationsData || []);

    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (members: Member[], events: Event[], ministryGroups: MinistryGroup[], donations: Donation[]) => {
    const totalMembers = members.length;
    const newcomers = members.filter(m => m.status === 'newcomer').length;
    const signedMembers = members.filter(m => m.status === 'signed_member').length;
    const upcomingEventsCount = events.length;
    const leadersCount = members.filter(m => m.is_leader).length;
    
    const monthlyDonations = donations
      .filter(d => {
        const donationDate = new Date(d.date);
        const currentMonth = new Date().getMonth();
        const currentYear = new Date().getFullYear();
        return donationDate.getMonth() === currentMonth && donationDate.getFullYear() === currentYear;
      })
      .reduce((sum, donation) => sum + donation.amount, 0);

    const lastMonthDonations = donations
      .filter(d => {
        const donationDate = new Date(d.date);
        const lastMonth = new Date().getMonth() - 1;
        const currentYear = new Date().getFullYear();
        return donationDate.getMonth() === lastMonth && donationDate.getFullYear() === currentYear;
      })
      .reduce((sum, donation) => sum + donation.amount, 0);

    const donationChange = lastMonthDonations > 0 
      ? ((monthlyDonations - lastMonthDonations) / lastMonthDonations * 100).toFixed(1)
      : '0';

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
      { 
        icon: DollarSign, 
        label: 'Monthly Donations', 
        value: `$${monthlyDonations.toLocaleString()}`, 
        change: `${donationChange}% from last month`, 
        changeType: Number(donationChange) >= 0 ? 'positive' : 'negative',
        color: 'from-emerald-500 to-emerald-600',
        bgColor: 'bg-emerald-50 dark:bg-emerald-950/20',
        action: 'viewDonations'
      },
    ];

    setStats(statsData);
  };

  const generateRecentActivities = (members: Member[], events: Event[], donations: Donation[]) => {
    const activities: Activity[] = [];

    // Add recent member joins
    const recentMembers = members.slice(0, 2);
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

    // Add recent donations
    const recentDonations = donations.slice(0, 2);
    recentDonations.forEach(donation => {
      activities.push({
        id: activities.length + 1,
        type: 'donation',
        message: `Donation received: $${donation.amount}`,
        time: formatTimeAgo(new Date(donation.date)),
        color: 'bg-purple-500',
        icon: DollarSign,
        action: () => openDonationDetail(donation)
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
    setNewDonation({ donor: '', amount: 0, type: '', message: '' });
  };

  const openMemberDetail = (member: Member) => {
    setSelectedMember(member);
    setActiveModal('memberDetail');
  };

  const openEventDetail = (event: Event) => {
    setSelectedEvent(event);
    setActiveModal('eventDetail');
  };

  const openDonationDetail = (donation: Donation) => {
    setActiveModal('donationDetail');
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

  // Record donation handler
  const handleRecordDonation = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { error } = await supabase
        .from('donations')
        .insert([{
          donor: newDonation.donor,
          amount: newDonation.amount,
          type: newDonation.type,
          message: newDonation.message,
          date: new Date().toISOString().split('T')[0]
        }]);

      if (error) throw error;
      
      alert('Donation recorded successfully!');
      await loadDashboardData();
      closeModal();
    } catch (error) {
      console.error('Error recording donation:', error);
      alert('Failed to record donation');
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
              <DollarSign className="h-5 w-5" />
              Donations
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
            <DollarSign className="h-5 w-5" />
            Donations
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

        {/* Stats Grid - Now with 6 cards including Ministry Groups */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6 mb-8">
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
              onClick={() => openModal('recordDonation')}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl transition-all duration-200 hover:scale-105 font-medium"
            >
              <DollarSign className="h-4 w-4" />
              Record Donation
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

        {/* ... Other modals remain the same ... */}
        
      </div>
    </div>
  );
};

export default Dashboard;
