import { Calendar as CalendarIcon, Clock, MapPin, Plus, Users, Search, X, User, ChevronDown, Phone, Mail } from 'lucide-react';
import { useState, useEffect } from 'react';

interface Event {
  id: string;
  name: string;
  topic: string | null;
  event_date: string;
  event_time: string;
  location: string | null;
  created_at: string;
}

interface Member {
  id: string;
  name: string;
  surname: string;
  email: string | null;
  phone: string | null;
  cell_group_id: string | null;
  cell_group_name?: string;
  ministry_group_name?: string;
  status: 'newcomer' | 'signed_member' | 'not_attending' | null;
}

interface EventAttendee {
  id: string;
  event_id: string;
  member_id: string;
  first_time: boolean;
  invited_by: string | null;
  created_at: string;
  member: Member;
}

interface AttendeeFormData {
  memberId: string;
  firstTime: boolean;
  invitedBy: string;
}

const Events = () => {
  const [showEventForm, setShowEventForm] = useState(false);
  const [showAttendeeForm, setShowAttendeeForm] = useState<string | null>(null);
  const [events, setEvents] = useState<Event[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [attendees, setAttendees] = useState<EventAttendee[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isMemberDropdownOpen, setIsMemberDropdownOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [expandedEvents, setExpandedEvents] = useState<{[key: string]: boolean}>({});
  
  const [eventFormData, setEventFormData] = useState({
    name: '',
    topic: '',
    eventDate: '',
    eventTime: '',
    location: '',
  });

  const [attendeeFormData, setAttendeeFormData] = useState<AttendeeFormData>({
    memberId: '',
    firstTime: false,
    invitedBy: '',
  });

  const [selectedMember, setSelectedMember] = useState<Member | null>(null);

  useEffect(() => {
    fetchEvents();
    fetchMembers();
  }, []);

  const fetchEvents = async () => {
    try {
      // Replace with your actual Supabase fetch
      // const { data, error } = await supabase
      //   .from('events')
      //   .select('*')
      //   .order('event_date', { ascending: true });
      
      // if (error) throw error;
      // setEvents(data || []);
      // data?.forEach(event => fetchEventAttendees(event.id));
    } catch (error) {
      console.error('Error fetching events:', error);
    }
  };

  const fetchMembers = async () => {
    try {
      // Replace with your actual Supabase fetch
      // const { data, error } = await supabase
      //   .from('members')
      //   .select(`
      //     id,
      //     name,
      //     surname,
      //     email,
      //     phone,
      //     cell_group_id,
      //     status,
      //     cell_groups (name),
      //     ministry_groups (name)
      //   `)
      //   .order('name');
      
      // if (error) throw error;
      // const formattedMembers = data?.map(m => ({
      //   ...m,
      //   cell_group_name: m.cell_groups?.name,
      //   ministry_group_name: m.ministry_groups?.name
      // })) || [];
      // setMembers(formattedMembers);
    } catch (error) {
      console.error('Error fetching members:', error);
    }
  };

  const fetchEventAttendees = async (eventId: string) => {
    try {
      // Replace with your actual Supabase fetch
      // const { data, error } = await supabase
      //   .from('event_attendees')
      //   .select(`
      //     *,
      //     members (
      //       id, name, surname, email, phone, status,
      //       cell_groups (name),
      //       ministry_groups (name)
      //     )
      //   `)
      //   .eq('event_id', eventId)
      //   .order('created_at', { ascending: false });
      
      // if (error) throw error;
      // const formattedAttendees = data?.map(a => ({
      //   ...a,
      //   member: {
      //     ...a.members,
      //     cell_group_name: a.members.cell_groups?.name,
      //     ministry_group_name: a.members.ministry_groups?.name
      //   }
      // })) || [];
      // setAttendees(prev => {
      //   const filtered = prev.filter(att => att.event_id !== eventId);
      //   return [...filtered, ...formattedAttendees];
      // });
    } catch (error) {
      console.error('Error fetching attendees:', error);
    }
  };

  const handleEventSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    // Simulate API call
    setTimeout(() => {
      const newEvent: Event = {
        id: Date.now().toString(),
        name: eventFormData.name,
        topic: eventFormData.topic || null,
        event_date: eventFormData.eventDate,
        event_time: eventFormData.eventTime,
        location: eventFormData.location || null,
        created_at: new Date().toISOString()
      };

      setEvents([...events, newEvent]);
      setShowEventForm(false);
      setEventFormData({ name: '', topic: '', eventDate: '', eventTime: '', location: '' });
      setLoading(false);
      alert('Event created successfully!');
    }, 500);
  };

  const handleAttendeeSubmit = async (e: React.FormEvent, eventId: string) => {
    e.preventDefault();
    
    if (!attendeeFormData.memberId) {
      alert('Please select a member');
      return;
    }

    // Check if member is already attending this event
    const alreadyAttending = attendees.some(
      a => a.event_id === eventId && a.member_id === attendeeFormData.memberId
    );

    if (alreadyAttending) {
      alert('This member is already registered for this event');
      return;
    }

    setLoading(true);

    // Simulate API call
    setTimeout(() => {
      const member = members.find(m => m.id === attendeeFormData.memberId);
      if (member) {
        const newAttendee: EventAttendee = {
          id: Date.now().toString(),
          event_id: eventId,
          member_id: attendeeFormData.memberId,
          first_time: attendeeFormData.firstTime,
          invited_by: attendeeFormData.invitedBy || null,
          created_at: new Date().toISOString(),
          member: member
        };

        setAttendees([...attendees, newAttendee]);
        resetAttendeeForm();
        setLoading(false);
        alert('Attendee added successfully!');
      }
    }, 500);
  };

  const handleRemoveAttendee = async (attendeeId: string, eventId: string) => {
    if (!confirm('Are you sure you want to remove this attendee?')) {
      return;
    }

    // Simulate API call
    setAttendees(attendees.filter(a => a.id !== attendeeId));
    alert('Attendee removed successfully!');
  };

  const resetAttendeeForm = () => {
    setShowAttendeeForm(null);
    setAttendeeFormData({
      memberId: '',
      firstTime: false,
      invitedBy: '',
    });
    setSelectedMember(null);
    setSearchTerm('');
    setIsMemberDropdownOpen(false);
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

  const toggleEventExpansion = (eventId: string) => {
    setExpandedEvents(prev => ({
      ...prev,
      [eventId]: !prev[eventId]
    }));
  };

  const filteredMembers = members.filter(member => {
    const searchLower = searchTerm.toLowerCase();
    const fullName = `${member.name} ${member.surname}`.toLowerCase();
    const phone = member.phone?.toLowerCase() || '';
    const email = member.email?.toLowerCase() || '';
    
    return (
      member.name.toLowerCase().includes(searchLower) ||
      member.surname.toLowerCase().includes(searchLower) ||
      fullName.includes(searchLower) ||
      phone.includes(searchLower) ||
      email.includes(searchLower)
    );
  });

  const getEventAttendees = (eventId: string) => {
    return attendees.filter(attendee => attendee.event_id === eventId);
  };

  const getUniqueAttendees = (eventId: string) => {
    const eventAttendees = getEventAttendees(eventId);
    const uniqueAttendees = eventAttendees.filter((attendee, index, self) =>
      index === self.findIndex(a => a.member_id === attendee.member_id)
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
      newcomer: { color: 'bg-blue-100 text-blue-700', text: 'Newcomer' },
      signed_member: { color: 'bg-green-100 text-green-700', text: 'Signed Member' },
      not_attending: { color: 'bg-red-100 text-red-700', text: 'Not Attending' },
    };
    return badges[(status as keyof typeof badges) || 'newcomer'] || badges.newcomer;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
              Events Calendar
            </h1>
            <p className="text-gray-600">Manage church events and track attendance</p>
          </div>
          <button 
            onClick={() => setShowEventForm(!showEventForm)}
            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:shadow-lg transition-all duration-200 hover:scale-105 font-medium group"
          >
            <Plus className="h-5 w-5 group-hover:rotate-90 transition-transform duration-200" />
            {showEventForm ? 'Cancel' : 'Create Event'}
          </button>
        </div>

        {/* Event Creation Form */}
        {showEventForm && (
          <div className="bg-white border border-gray-200 rounded-2xl p-6 mb-8 shadow-lg">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Create New Event</h2>
            <form onSubmit={handleEventSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">Event Name *</label>
                  <input
                    type="text"
                    value={eventFormData.name}
                    onChange={(e) => setEventFormData({ ...eventFormData, name: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                    placeholder="Enter event name"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">Topic</label>
                  <input
                    type="text"
                    value={eventFormData.topic}
                    onChange={(e) => setEventFormData({ ...eventFormData, topic: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                    placeholder="Event topic or theme"
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">Date *</label>
                  <input
                    type="date"
                    value={eventFormData.eventDate}
                    onChange={(e) => setEventFormData({ ...eventFormData, eventDate: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">Time *</label>
                  <input
                    type="time"
                    value={eventFormData.eventTime}
                    onChange={(e) => setEventFormData({ ...eventFormData, eventTime: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                    required
                  />
                </div>
                <div className="md:col-span-2 space-y-2">
                  <label className="block text-sm font-medium text-gray-700">Location</label>
                  <input
                    type="text"
                    value={eventFormData.location}
                    onChange={(e) => setEventFormData({ ...eventFormData, location: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                    placeholder="Event location"
                  />
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
                  onClick={() => setShowEventForm(false)}
                  className="px-6 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-all duration-200 font-medium"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Events List */}
        <div className="space-y-6">
          {events.length === 0 ? (
            <div className="text-center py-12 bg-white border border-gray-200 rounded-2xl">
              <CalendarIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-600 mb-2">No Events Yet</h3>
              <p className="text-gray-500">Create your first event to get started</p>
            </div>
          ) : (
            events.map((event) => {
              const eventAttendees = getUniqueAttendees(event.id);
              const isExpanded = expandedEvents[event.id];
              
              return (
                <div key={event.id} className="group">
                  {/* Event Card */}
                  <div className="bg-white border border-gray-200 rounded-2xl p-6 hover:shadow-xl transition-all duration-300 hover:border-gray-300">
                    <div className="flex flex-col lg:flex-row justify-between gap-6">
                      <div className="flex-1">
                        <div className="flex items-start gap-4 mb-4">
                          <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center flex-shrink-0 shadow-lg">
                            <CalendarIcon className="h-7 w-7 text-white" />
                          </div>
                          <div className="flex-1">
                            <h3 className="text-2xl font-bold text-gray-900 mb-2">{event.name}</h3>
                            {event.topic && (
                              <p className="text-blue-600 font-medium">{event.topic}</p>
                            )}
                          </div>
                        </div>
                        
                        <div className="space-y-3 text-gray-600 ml-18">
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
                        </div>

                        {/* Attendees Count */}
                        <div className="mt-4 flex items-center gap-2 text-sm text-gray-600">
                          <Users className="h-4 w-4" />
                          <span>{eventAttendees.length} attendees</span>
                          {eventAttendees.filter(a => a.first_time).length > 0 && (
                            <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs">
                              {eventAttendees.filter(a => a.first_time).length} first-time
                            </span>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex flex-col justify-between items-end gap-4">
                        <div className="flex gap-3">
                          <button 
                            onClick={() => toggleEventExpansion(event.id)}
                            className="flex items-center gap-2 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-xl hover:shadow-lg transition-all duration-200 font-medium"
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
                        </div>
                      </div>
                    </div>

                    {/* Expanded Attendees List */}
                    {isExpanded && (
                      <div className="mt-6 pt-6 border-t border-gray-200">
                        <h4 className="text-lg font-semibold text-gray-900 mb-4">Event Attendees ({eventAttendees.length})</h4>
                        {eventAttendees.length === 0 ? (
                          <div className="text-center py-8 text-gray-500">
                            <User className="h-12 w-12 mx-auto mb-3 opacity-50" />
                            <p>No attendees yet</p>
                            <p className="text-sm">Add attendees using the "Add Attendee" button</p>
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                            {eventAttendees.map((attendee) => (
                              <div key={attendee.id} className="bg-gray-50 rounded-xl p-4 hover:shadow-md transition-all duration-200">
                                <div className="flex items-start gap-3">
                                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-semibold text-sm flex-shrink-0">
                                    {getInitials(attendee.member.name, attendee.member.surname)}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-start justify-between mb-2">
                                      <div>
                                        <h5 className="font-semibold text-gray-900 truncate">
                                          {attendee.member.name} {attendee.member.surname}
                                        </h5>
                                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadge(attendee.member.status).color}`}>
                                            {getStatusBadge(attendee.member.status).text}
                                          </span>
                                          {attendee.first_time && (
                                            <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs">
                                              First Time
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                      <button
                                        onClick={() => handleRemoveAttendee(attendee.id, event.id)}
                                        className="text-gray-400 hover:text-red-500 transition-colors ml-2 flex-shrink-0"
                                        title="Remove attendee"
                                      >
                                        <X className="h-4 w-4" />
                                      </button>
                                    </div>
                                    
                                    <div className="space-y-1 text-sm text-gray-600">
                                      {attendee.member.phone && (
                                        <div className="flex items-center gap-2">
                                          <Phone className="h-3 w-3" />
                                          <span>{attendee.member.phone}</span>
                                        </div>
                                      )}
                                      {attendee.member.email && (
                                        <div className="flex items-center gap-2">
                                          <Mail className="h-3 w-3" />
                                          <span className="truncate">{attendee.member.email}</span>
                                        </div>
                                      )}
                                      {attendee.member.cell_group_name && (
                                        <div className="text-xs">
                                          Cell Group: {attendee.member.cell_group_name}
                                        </div>
                                      )}
                                      {attendee.invited_by && (
                                        <div className="text-xs text-blue-600">
                                          Invited by: {attendee.invited_by}
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
                  {showAttendeeForm === event.id && (
                    <div className="mt-4 bg-white border border-gray-200 rounded-2xl p-6 shadow-lg">
                      <h3 className="text-xl font-bold text-gray-900 mb-6">Add Event Attendee</h3>
                      
                      <form onSubmit={(e) => handleAttendeeSubmit(e, event.id)} className="space-y-6">
                        {/* Member Search and Selection */}
                        <div className="space-y-4">
                          <label className="block text-sm font-medium text-gray-700">
                            Search and Select Member *
                          </label>
                          
                          {/* Search Input */}
                          <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <input
                              type="text"
                              value={searchTerm}
                              onChange={(e) => {
                                setSearchTerm(e.target.value);
                                setIsMemberDropdownOpen(true);
                              }}
                              onFocus={() => setIsMemberDropdownOpen(true)}
                              placeholder="Search by name, surname, email, or phone..."
                              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                            />
                            {searchTerm && (
                              <button
                                type="button"
                                onClick={() => {
                                  setSearchTerm('');
                                  setSelectedMember(null);
                                  setAttendeeFormData({ ...attendeeFormData, memberId: '' });
                                  setIsMemberDropdownOpen(false);
                                }}
                                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                              >
                                <X className="h-4 w-4" />
                              </button>
                            )}
                          </div>

                          {/* Selected Member Display */}
                          {selectedMember && (
                            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                              <div className="flex items-center gap-3">
                                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-semibold">
                                  {getInitials(selectedMember.name, selectedMember.surname)}
                                </div>
                                <div className="flex-1">
                                  <h4 className="font-semibold text-gray-900">
                                    {selectedMember.name} {selectedMember.surname}
                                  </h4>
                                  <div className="text-sm text-gray-600 space-y-1">
                                    {selectedMember.phone && <div className="flex items-center gap-2"><Phone className="h-3 w-3" /> {selectedMember.phone}</div>}
                                    {selectedMember.email && <div className="flex items-center gap-2"><Mail className="h-3 w-3" /> {selectedMember.email}</div>}
                                    {selectedMember.cell_group_name && <div>Cell Group: {selectedMember.cell_group_name}</div>}
                                  </div>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedMember(null);
                                    setAttendeeFormData({ ...attendeeFormData, memberId: '' });
                                    setSearchTerm('');
                                  }}
                                  className="text-gray-400 hover:text-gray-600 transition-colors"
                                >
                                  <X className="h-4 w-4" />
