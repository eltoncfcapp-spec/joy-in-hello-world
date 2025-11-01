import { useState } from 'react';
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

// Types
interface Member {
  id: string;
  name: string;
  joinDate: string;
  email: string;
  phone: string;
  group: string;
  status: 'active' | 'inactive';
}

interface Event {
  id: string;
  title: string;
  date: string;
  time: string;
  location: string;
  description: string;
  attendees: number;
  maxAttendees: number;
  type: string;
}

interface Donation {
  id: string;
  donor: string;
  amount: number;
  date: string;
  type: string;
  message: string;
}

const Dashboard = () => {
  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [selectedDonation, setSelectedDonation] = useState<Donation | null>(null);
  const [expandedSections, setExpandedSections] = useState<{[key: string]: boolean}>({
    events: true,
    activity: true
  });

  const stats = [
    { 
      icon: Users, 
      label: 'Total Members', 
      value: '324', 
      change: '+12 this month', 
      changeType: 'positive',
      color: 'from-blue-500 to-blue-600',
      bgColor: 'bg-blue-50 dark:bg-blue-950/20',
      action: 'viewMembers'
    },
    { 
      icon: Calendar, 
      label: 'Upcoming Events', 
      value: '8', 
      change: 'Next: Sunday Service', 
      changeType: 'info',
      color: 'from-purple-500 to-purple-600',
      bgColor: 'bg-purple-50 dark:bg-purple-950/20',
      action: 'viewEvents'
    },
    { 
      icon: DollarSign, 
      label: 'Monthly Donations', 
      value: '$12,450', 
      change: '+8% from last month', 
      changeType: 'positive',
      color: 'from-green-500 to-green-600',
      bgColor: 'bg-green-50 dark:bg-green-950/20',
      action: 'viewDonations'
    },
    { 
      icon: TrendingUp, 
      label: 'Active Groups', 
      value: '15', 
      change: '3 new this quarter', 
      changeType: 'positive',
      color: 'from-orange-500 to-orange-600',
      bgColor: 'bg-orange-50 dark:bg-orange-950/20',
      action: 'viewGroups'
    },
  ];

  const recentActivities = [
    { 
      id: 1,
      type: 'member', 
      message: 'John Doe joined the church', 
      time: '2 hours ago',
      color: 'bg-green-500',
      icon: Users,
      action: () => openMemberDetail(members[0])
    },
    { 
      id: 2,
      type: 'event', 
      message: 'New event: Youth Group Meeting', 
      time: '5 hours ago',
      color: 'bg-blue-500',
      icon: Calendar,
      action: () => openEventDetail(upcomingEvents[1])
    },
    { 
      id: 3,
      type: 'donation', 
      message: 'Donation received: $500', 
      time: '1 day ago',
      color: 'bg-purple-500',
      icon: DollarSign,
      action: () => openDonationDetail(donations[0])
    },
    { 
      id: 4,
      type: 'group', 
      message: 'New Bible study group formed', 
      time: '2 days ago',
      color: 'bg-orange-500',
      icon: TrendingUp,
      action: () => openModal('groups')
    },
  ];

  const upcomingEvents = [
    { 
      id: 1,
      title: 'Sunday Service', 
      time: 'Tomorrow, 10:00 AM', 
      location: 'Main Sanctuary',
      description: 'Weekly Sunday service with communion. All are welcome to join us for worship and fellowship.',
      priority: 'high',
      attendees: 120,
      maxAttendees: 200,
      type: 'Worship'
    },
    { 
      id: 2,
      title: 'Prayer Meeting', 
      time: 'Wednesday, 7:00 PM', 
      location: 'Prayer Room',
      description: 'Evening prayer meeting for community needs and church missions.',
      priority: 'medium',
      attendees: 45,
      maxAttendees: 60,
      type: 'Prayer'
    },
    { 
      id: 3,
      title: 'Bible Study', 
      time: 'Friday, 6:30 PM', 
      location: 'Fellowship Hall',
      description: 'Study of the Book of Romans. Bring your Bible and notebook.',
      priority: 'medium',
      attendees: 35,
      maxAttendees: 50,
      type: 'Study'
    },
    { 
      id: 4,
      title: 'Youth Group', 
      time: 'Saturday, 4:00 PM', 
      location: 'Youth Center',
      description: 'Youth group activities and Bible study for ages 13-18.',
      priority: 'low',
      attendees: 25,
      maxAttendees: 40,
      type: 'Youth'
    },
  ];

  const members: Member[] = [
    {
      id: '1',
      name: 'John Doe',
      joinDate: '2024-01-15',
      email: 'john.doe@email.com',
      phone: '(555) 123-4567',
      group: 'Young Adults',
      status: 'active'
    },
    {
      id: '2',
      name: 'Sarah Smith',
      joinDate: '2024-01-10',
      email: 'sarah.smith@email.com',
      phone: '(555) 987-6543',
      group: 'Women\'s Ministry',
      status: 'active'
    }
  ];

  const donations: Donation[] = [
    {
      id: '1',
      donor: 'John Doe',
      amount: 500,
      date: '2024-01-20',
      type: 'Tithes',
      message: 'Thank you for the ministry'
    },
    {
      id: '2',
      donor: 'Anonymous',
      amount: 250,
      date: '2024-01-19',
      type: 'Offering',
      message: ''
    }
  ];

  const openModal = (modalType: string) => {
    setActiveModal(modalType);
  };

  const closeModal = () => {
    setActiveModal(null);
    setSelectedMember(null);
    setSelectedEvent(null);
    setSelectedDonation(null);
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
    setSelectedDonation(donation);
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

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'border-red-400';
      case 'medium': return 'border-yellow-400';
      case 'low': return 'border-green-400';
      default: return 'border-gray-400';
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
          <div className="space-y-4">
            <p className="text-gray-600 dark:text-gray-400">Add a new member to the church database.</p>
            <div className="space-y-3">
              <input 
                type="text" 
                placeholder="Full Name"
                className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
              <input 
                type="email" 
                placeholder="Email Address"
                className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
              <input 
                type="tel" 
                placeholder="Phone Number"
                className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
              <select className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
                <option>Select Group</option>
                <option>Young Adults</option>
                <option>Women's Ministry</option>
                <option>Men's Fellowship</option>
                <option>Youth Group</option>
              </select>
            </div>
            <button className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-medium transition-colors">
              Add Member
            </button>
          </div>
        </Modal>
      )}

      {activeModal === 'createEvent' && (
        <Modal title="Create New Event">
          <div className="space-y-4">
            <p className="text-gray-600 dark:text-gray-400">Create a new church event.</p>
            <div className="space-y-3">
              <input 
                type="text" 
                placeholder="Event Title"
                className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
              <input 
                type="text" 
                placeholder="Location"
                className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
              <input 
                type="datetime-local"
                className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
              <textarea 
                placeholder="Event Description"
                rows={3}
                className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
            <button className="w-full bg-green-600 hover:bg-green-700 text-white py-3 rounded-lg font-medium transition-colors">
              Create Event
            </button>
          </div>
        </Modal>
      )}

      {/* Add more modals for other actions as needed */}
    </div>
  );
};

export default Dashboard;
