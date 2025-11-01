import { Calendar as CalendarIcon, Clock, MapPin, Plus, Users, Search, X, ChevronDown } from 'lucide-react';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface Event {
  id: string;
  name: string;
  topic: string | null;
  event_date: string;
  event_time: string;
  location: string | null;
}

interface Member {
  id: string;
  name: string;
  surname: string;
  phone: string | null;
  cell_group_id: string | null;
  cell_group?: {
    name: string;
  };
}

interface AttendeeFormData {
  memberId: string;
  name: string;
  surname: string;
  phone: string;
  firstTime: boolean;
  invitedBy: string;
  cellGroupId: string;
  isNewMember: boolean;
}

const Events = () => {
  const [showEventForm, setShowEventForm] = useState(false);
  const [showAttendeeForm, setShowAttendeeForm] = useState<string | null>(null);
  const [events, setEvents] = useState<Event[]>([]);
  const [cellGroups, setCellGroups] = useState<{ id: string; name: string }[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isMemberDropdownOpen, setIsMemberDropdownOpen] = useState(false);
  
  const [eventFormData, setEventFormData] = useState({
    name: '',
    topic: '',
    eventDate: '',
    eventTime: '',
    location: '',
  });

  const [attendeeFormData, setAttendeeFormData] = useState<AttendeeFormData>({
    memberId: '',
    name: '',
    surname: '',
    phone: '',
    firstTime: false,
    invitedBy: '',
    cellGroupId: '',
    isNewMember: false,
  });

  useEffect(() => {
    fetchEvents();
    fetchCellGroups();
    fetchMembers();
  }, []);

  const fetchEvents = async () => {
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .order('event_date', { ascending: true });

    if (error) {
      console.error('Error fetching events:', error);
    } else {
      setEvents(data || []);
    }
  };

  const fetchCellGroups = async () => {
    const { data, error } = await supabase
      .from('cell_groups')
      .select('id, name')
      .order('name');

    if (error) {
      console.error('Error fetching cell groups:', error);
    } else {
      setCellGroups(data || []);
    }
  };

  const fetchMembers = async () => {
    const { data, error } = await supabase
      .from('members')
      .select(`
        id,
        name,
        surname,
        phone,
        cell_group_id,
        cell_groups (
          name
        )
      `)
      .order('name');

    if (error) {
      console.error('Error fetching members:', error);
    } else {
      setMembers(data || []);
    }
  };

  const handleEventSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const { error } = await supabase.from('events').insert({
      name: eventFormData.name,
      topic: eventFormData.topic || null,
      event_date: eventFormData.eventDate,
      event_time: eventFormData.eventTime,
      location: eventFormData.location || null,
    });

    if (error) {
      console.error('Error creating event:', error);
      alert('Error creating event');
    } else {
      setShowEventForm(false);
      setEventFormData({ name: '', topic: '', eventDate: '', eventTime: '', location: '' });
      fetchEvents();
    }
  };

  const handleAttendeeSubmit = async (e: React.FormEvent, eventId: string) => {
    e.preventDefault();
    
    if (attendeeFormData.isNewMember) {
      // Add new member first
      const { data: newMember, error: memberError } = await supabase
        .from('members')
        .insert({
          name: attendeeFormData.name,
          surname: attendeeFormData.surname,
          phone: attendeeFormData.phone || null,
          cell_group_id: attendeeFormData.cellGroupId || null,
        })
        .select()
        .single();

      if (memberError) {
        console.error('Error creating member:', memberError);
        alert('Error creating member');
        return;
      }

      // Then add as attendee
      const { error: attendeeError } = await supabase.from('event_attendees').insert({
        event_id: eventId,
        member_id: newMember.id,
        first_time: attendeeFormData.firstTime,
        invited_by: attendeeFormData.invitedBy || null,
      });

      if (attendeeError) {
        console.error('Error adding attendee:', attendeeError);
        alert('Error adding attendee');
      } else {
        resetAttendeeForm();
        alert('New member created and added to event successfully!');
        fetchMembers(); // Refresh members list
      }
    } else {
      // Add existing member as attendee
      const { error } = await supabase.from('event_attendees').insert({
        event_id: eventId,
        member_id: attendeeFormData.memberId,
        first_time: attendeeFormData.firstTime,
        invited_by: attendeeFormData.invitedBy || null,
      });

      if (error) {
        console.error('Error adding attendee:', error);
        alert('Error adding attendee');
      } else {
        resetAttendeeForm();
        alert('Attendee added successfully!');
      }
    }
  };

  const resetAttendeeForm = () => {
    setShowAttendeeForm(null);
    setAttendeeFormData({
      memberId: '',
      name: '',
      surname: '',
      phone: '',
      firstTime: false,
      invitedBy: '',
      cellGroupId: '',
      isNewMember: false,
    });
    setSearchTerm('');
    setIsMemberDropdownOpen(false);
  };

  const handleMemberSelect = (member: Member) => {
    setAttendeeFormData({
      ...attendeeFormData,
      memberId: member.id,
      name: member.name,
      surname: member.surname,
      phone: member.phone || '',
      cellGroupId: member.cell_group_id || '',
      isNewMember: false,
    });
    setSearchTerm(`${member.name} ${member.surname}`);
    setIsMemberDropdownOpen(false);
  };

  const handleNewMemberToggle = () => {
    setAttendeeFormData({
      ...attendeeFormData,
      memberId: '',
      name: '',
      surname: '',
      phone: '',
      cellGroupId: '',
      isNewMember: true,
    });
    setSearchTerm('');
    setIsMemberDropdownOpen(false);
  };

  const filteredMembers = members.filter(member => 
    `${member.name} ${member.surname}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
    member.phone?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-6 animate-fadeIn">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
              Events Calendar
            </h1>
            <p className="text-gray-600 dark:text-gray-400">Manage church events and track attendance</p>
          </div>
          <button 
            onClick={() => setShowEventForm(!showEventForm)}
            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:shadow-lg transition-all duration-200 hover:scale-105 font-medium"
          >
            <Plus className="h-5 w-5" />
            {showEventForm ? 'Cancel' : 'Create Event'}
          </button>
        </div>

        {/* Event Creation Form */}
        {showEventForm && (
          <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-6 mb-8 shadow-lg">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Create New Event</h2>
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
              </div>
              <div className="flex gap-3">
                <button
                  type="submit"
                  className="px-8 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:shadow-lg transition-all duration-200 font-medium"
                >
                  Create Event
                </button>
                <button
                  type="button"
                  onClick={() => setShowEventForm(false)}
                  className="px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200 font-medium"
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
            <div className="text-center py-12">
              <CalendarIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-600 dark:text-gray-400 mb-2">No Events Yet</h3>
              <p className="text-gray-500 dark:text-gray-500">Create your first event to get started</p>
            </div>
          ) : (
            events.map((event) => (
              <div key={event.id} className="group">
                {/* Event Card */}
                <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-6 hover:shadow-xl transition-all duration-300 hover:border-gray-300/50 dark:hover:border-gray-600/50">
                  <div className="flex flex-col lg:flex-row justify-between gap-6">
                    <div className="flex-1">
                      <div className="flex items-start gap-4 mb-4">
                        <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center flex-shrink-0">
                          <CalendarIcon className="h-7 w-7 text-white" />
                        </div>
                        <div className="flex-1">
                          <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">{event.name}</h3>
                          {event.topic && (
                            <p className="text-blue-600 dark:text-blue-400 font-medium">{event.topic}</p>
                          )}
                        </div>
                      </div>
                      
                      <div className="space-y-3 text-gray-600 dark:text-gray-400 ml-18">
                        <div className="flex items-center gap-3">
                          <CalendarIcon className="h-4 w-4" />
                          <span className="font-medium">{formatDate(event.event_date)}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <Clock className="h-4 w-4" />
                          <span className="font-medium">{event.event_time}</span>
                        </div>
                        {event.location && (
                          <div className="flex items-center gap-3">
                            <MapPin className="h-4 w-4" />
                            <span className="font-medium">{event.location}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex flex-col justify-between items-end gap-4">
                      <button 
                        onClick={() => setShowAttendeeForm(showAttendeeForm === event.id ? null : event.id)}
                        className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:shadow-lg transition-all duration-200 font-medium"
                      >
                        <Users className="h-4 w-4" />
                        {showAttendeeForm === event.id ? 'Cancel' : 'Add Attendee'}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Attendee Form */}
                {showAttendeeForm === event.id && (
                  <div className="mt-4 bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-6 shadow-lg">
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6">Add Event Attendee</h3>
                    
                    {/* Member Selection Toggle */}
                    <div className="flex gap-4 mb-6">
                      <button
                        type="button"
                        onClick={() => handleNewMemberToggle()}
                        className={`flex-1 py-3 px-4 rounded-xl border-2 transition-all duration-200 font-medium ${
                          attendeeFormData.isNewMember
                            ? 'border-green-500 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300'
                            : 'border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-gray-400 dark:hover:border-gray-500'
                        }`}
                      >
                        New Member
                      </button>
                      <button
                        type="button"
                        onClick={() => setAttendeeFormData({ ...attendeeFormData, isNewMember: false })}
                        className={`flex-1 py-3 px-4 rounded-xl border-2 transition-all duration-200 font-medium ${
                          !attendeeFormData.isNewMember
                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                            : 'border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-gray-400 dark:hover:border-gray-500'
                        }`}
                      >
                        Existing Member
                      </button>
                    </div>

                    <form onSubmit={(e) => handleAttendeeSubmit(e, event.id)} className="space-y-6">
                      {!attendeeFormData.isNewMember ? (
                        /* Existing Member Search */
                        <div className="space-y-2">
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                            Search Members
                          </label>
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
                              placeholder="Search by name or phone..."
                              className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                            />
                            {searchTerm && (
                              <button
                                type="button"
                                onClick={() => {
                                  setSearchTerm('');
                                  setIsMemberDropdownOpen(false);
                                }}
                                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                              >
                                <X className="h-4 w-4" />
                              </button>
                            )}
                          </div>

                          {/* Member Dropdown */}
                          {isMemberDropdownOpen && filteredMembers.length > 0 && (
                            <div className="absolute z-10 w-full max-w-md mt-1 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl shadow-lg max-h-60 overflow-y-auto">
                              {filteredMembers.map((member) => (
                                <button
                                  key={member.id}
                                  type="button"
                                  onClick={() => handleMemberSelect(member)}
                                  className="w-full text-left p-3 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors duration-150 border-b border-gray-100 dark:border-gray-600 last:border-b-0"
                                >
                                  <div className="font-medium text-gray-900 dark:text-white">
                                    {member.name} {member.surname}
                                  </div>
                                  <div className="text-sm text-gray-500 dark:text-gray-400">
                                    {member.phone} • {member.cell_group?.name || 'No group'}
                                  </div>
                                </button>
                              ))}
                            </div>
                          )}

                          {searchTerm && filteredMembers.length === 0 && (
                            <div className="text-center py-4 text-gray-500 dark:text-gray-400">
                              No members found. <br />
                              <button
                                type="button"
                                onClick={handleNewMemberToggle}
                                className="text-blue-600 dark:text-blue-400 hover:underline font-medium"
                              >
                                Add as new member instead
                              </button>
                            </div>
                          )}
                        </div>
                      ) : (
                        /* New Member Form */
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Name *</label>
                            <input
                              type="text"
                              value={attendeeFormData.name}
                              onChange={(e) => setAttendeeFormData({ ...attendeeFormData, name: e.target.value })}
                              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                              required
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Surname *</label>
                            <input
                              type="text"
                              value={attendeeFormData.surname}
                              onChange={(e) => setAttendeeFormData({ ...attendeeFormData, surname: e.target.value })}
                              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                              required
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Phone</label>
                            <input
                              type="tel"
                              value={attendeeFormData.phone}
                              onChange={(e) => setAttendeeFormData({ ...attendeeFormData, phone: e.target.value })}
                              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Cell Group</label>
                            <select
                              value={attendeeFormData.cellGroupId}
                              onChange={(e) => setAttendeeFormData({ ...attendeeFormData, cellGroupId: e.target.value })}
                              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                            >
                              <option value="">Select cell group</option>
                              {cellGroups.map((group) => (
                                <option key={group.id} value={group.id}>{group.name}</option>
                              ))}
                            </select>
                          </div>
                        </div>
                      )}

                      {/* Common Fields */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Invited By</label>
                          <input
                            type="text"
                            value={attendeeFormData.invitedBy}
                            onChange={(e) => setAttendeeFormData({ ...attendeeFormData, invitedBy: e.target.value })}
                            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                            placeholder="Who invited this person?"
                          />
                        </div>
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            id="firstTime"
                            checked={attendeeFormData.firstTime}
                            onChange={(e) => setAttendeeFormData({ ...attendeeFormData, firstTime: e.target.checked })}
                            className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                          />
                          <label htmlFor="firstTime" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            First Time Attending
                          </label>
                        </div>
                      </div>

                      <div className="flex gap-3 pt-4">
                        <button
                          type="submit"
                          className="px-8 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:shadow-lg transition-all duration-200 font-medium"
                        >
                          {attendeeFormData.isNewMember ? 'Create Member & Add' : 'Add Attendee'}
                        </button>
                        <button
                          type="button"
                          onClick={resetAttendeeForm}
                          className="px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200 font-medium"
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default Events;
