import { Calendar as CalendarIcon, Clock, MapPin, Plus, Users, ChevronDown, Phone, X } from 'lucide-react';
import { useState, useEffect } from 'react';
import { supabase } from '../integrations/supabase/client';

interface Event {
  id: string;
  name: string;
  topic: string | null;
  event_date: string;
  event_time: string;
  location: string | null;
  created_at: string | null;
}

interface EventAttendee {
  id: string;
  event_id: string;
  name: string;
  surname: string;
  phone: string | null;
  first_time: boolean | null;
  invited_by: string | null;
  invited_by_id: string | null;
  cell_group_id: string | null;
  attended_at: string | null;
}

interface AttendeeFormData {
  name: string;
  surname: string;
  phone: string;
  firstTime: boolean;
  invitedBy: string;
  cellGroupId: string;
}

const Events = () => {
  const [showEventForm, setShowEventForm] = useState(false);
  const [showAttendeeForm, setShowAttendeeForm] = useState<string | null>(null);
  const [events, setEvents] = useState<Event[]>([]);
  const [attendees, setAttendees] = useState<EventAttendee[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedEvents, setExpandedEvents] = useState<{[key: string]: boolean}>({});
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  const [eventFormData, setEventFormData] = useState({
    name: '',
    topic: '',
    eventDate: '',
    eventTime: '',
    location: '',
  });

  const [attendeeFormData, setAttendeeFormData] = useState<AttendeeFormData>({
    name: '',
    surname: '',
    phone: '',
    firstTime: false,
    invitedBy: '',
    cellGroupId: '',
  });

  const [cellGroups, setCellGroups] = useState<{id: string, name: string}[]>([]);

  useEffect(() => {
    fetchEvents();
    fetchCellGroups();
  }, []);

  const fetchCellGroups = async () => {
    try {
      const { data, error } = await supabase
        .from('cell_groups')
        .select('id, name')
        .order('name');

      if (error) throw error;
      setCellGroups(data || []);
    } catch (error: any) {
      console.error('Error fetching cell groups:', error);
    }
  };
    try {
      setLoading(true);
      setError(null);
      
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .order('event_date', { ascending: true });

      if (error) {
        throw error;
      }

      setEvents(data || []);
      // Fetch attendees for each event
      data?.forEach(event => fetchEventAttendees(event.id));
    } catch (error: any) {
      console.error('Error fetching events:', error);
      setError(error.message || 'Failed to load events. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  const fetchMembers = async () => {
    try {
      setError(null);
      
      const { data, error } = await supabase
        .from('members')
        .select(`
          id,
          name,
          surname,
          email,
          phone,
          cell_group_id,
          status,
          cell_groups!fk_cell_group(name)
        `)
        .order('name');

      if (error) {
        throw error;
      }

      setMembers(data || []);
    } catch (error: any) {
      console.error('Error fetching members:', error);
      setError(error.message || 'Failed to load members.');
    }
  };

  const fetchCellGroups = async () => {
    try {
      const { data, error } = await supabase
        .from('cell_groups')
        .select('id, name')
        .order('name');

      if (error) throw error;
      setCellGroups(data || []);
    } catch (error: any) {
      console.error('Error fetching cell groups:', error);
    }
  };

  const fetchEventAttendees = async (eventId: string) => {
    try {
      const { data: attendeesData, error: attendeesError } = await supabase
        .from('event_attendees')
        .select('*')
        .eq('event_id', eventId)
        .order('attended_at', { ascending: false });

      if (attendeesError) {
        throw attendeesError;
      }

      setAttendees(prev => {
        const filtered = prev.filter(attendee => attendee.event_id !== eventId);
        return [...filtered, ...(attendeesData || [])];
      });
    } catch (error: any) {
      console.error('Error fetching attendees:', error);
      setError('Failed to load attendees. Please refresh the page.');
    }
  };

  const handleEventSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);
    
    try {
      const { error } = await supabase.from('events').insert([{
        name: eventFormData.name.trim(),
        topic: eventFormData.topic.trim() || null,
        event_date: eventFormData.eventDate,
        event_time: eventFormData.eventTime,
        location: eventFormData.location.trim() || null,
      }]);

      if (error) {
        throw error;
      }

      setShowEventForm(false);
      setEventFormData({ name: '', topic: '', eventDate: '', eventTime: '', location: '' });
      setSuccess('Event created successfully!');
      await fetchEvents();
      
      setTimeout(() => setSuccess(null), 3000);
    } catch (error: any) {
      console.error('Error creating event:', error);
      setError(error.message || 'Failed to create event. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleAttendeeSubmit = async (e: React.FormEvent, eventId: string) => {
    e.preventDefault();
    
    if (!attendeeFormData.name.trim() || !attendeeFormData.surname.trim()) {
      setError('Please enter attendee name and surname');
      setTimeout(() => setError(null), 3000);
      return;
    }

    // Check if this person is already attending
    const alreadyAttending = attendees.some(
      a => a.event_id === eventId && 
      a.name.toLowerCase() === attendeeFormData.name.trim().toLowerCase() && 
      a.surname.toLowerCase() === attendeeFormData.surname.trim().toLowerCase()
    );

    if (alreadyAttending) {
      setError('This person is already registered for this event');
      setTimeout(() => setError(null), 3000);
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const attendeeData: any = {
        event_id: eventId,
        name: attendeeFormData.name.trim(),
        surname: attendeeFormData.surname.trim(),
        phone: attendeeFormData.phone.trim() || null,
        first_time: attendeeFormData.firstTime,
        invited_by: attendeeFormData.invitedBy.trim() || null,
        cell_group_id: attendeeFormData.cellGroupId || null,
      };

      const { error } = await supabase.from('event_attendees').insert([attendeeData]);

      if (error) {
        throw error;
      }

      resetAttendeeForm();
      await fetchEventAttendees(eventId);
      setSuccess('Attendee added successfully!');
      
      setTimeout(() => setSuccess(null), 3000);
    } catch (error: any) {
      console.error('Error adding attendee:', error);
      setError(error.message || 'Failed to add attendee. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveAttendee = async (attendeeId: string, eventId: string) => {
    if (!confirm('Are you sure you want to remove this attendee?')) {
      return;
    }

    try {
      setError(null);
      setSuccess(null);
      
      const { error } = await supabase
        .from('event_attendees')
        .delete()
        .eq('id', attendeeId);

      if (error) {
        throw error;
      }

      await fetchEventAttendees(eventId);
      setSuccess('Attendee removed successfully!');
      
      setTimeout(() => setSuccess(null), 3000);
    } catch (error: any) {
      console.error('Error removing attendee:', error);
      setError(error.message || 'Failed to remove attendee.');
    }
  };

  const resetAttendeeForm = () => {
    setShowAttendeeForm(null);
    setAttendeeFormData({
      name: '',
      surname: '',
      phone: '',
      firstTime: false,
      invitedBy: '',
      cellGroupId: '',
    });
  };

  const toggleEventExpansion = (eventId: string) => {
    setExpandedEvents(prev => ({
      ...prev,
      [eventId]: !prev[eventId]
    }));
  };

  const getEventAttendees = (eventId: string) => {
    return attendees.filter(attendee => attendee.event_id === eventId);
  };

  const getUniqueAttendees = (eventId: string) => {
    return getEventAttendees(eventId);
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-6 animate-fadeIn">
      <div className="max-w-7xl mx-auto">
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
            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:shadow-lg transition-all duration-200 hover:scale-105 font-medium group"
          >
            <Plus className="h-5 w-5 group-hover:rotate-90 transition-transform duration-200" />
            {showEventForm ? 'Cancel' : 'Create Event'}
          </button>
        </div>

        {/* Success Message */}
        {success && (
          <div className="mb-6 p-4 bg-green-100 dark:bg-green-900/30 border border-green-300 dark:border-green-700 rounded-xl text-green-700 dark:text-green-300">
            {success}
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700 rounded-xl text-red-700 dark:text-red-300">
            {error}
          </div>
        )}

        {/* Event Creation Form */}
        {showEventForm && (
          <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-6 mb-8 shadow-lg hover:shadow-xl transition-all duration-300">
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
                  disabled={loading}
                  className="flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:shadow-lg transition-all duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Creating...' : 'Create Event'}
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

        {/* Loading State */}
        {loading && events.length === 0 && (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600 dark:text-gray-400">Loading events...</p>
          </div>
        )}

        {/* Events List */}
        <div className="space-y-6">
          {!loading && events.length === 0 ? (
            <div className="text-center py-12 bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl border border-gray-200/50 dark:border-gray-700/50 rounded-2xl">
              <CalendarIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-600 dark:text-gray-400 mb-2">No Events Yet</h3>
              <p className="text-gray-500 dark:text-gray-500">Create your first event to get started</p>
            </div>
          ) : (
            events.map((event) => {
              const eventAttendees = getUniqueAttendees(event.id);
              const isExpanded = expandedEvents[event.id];
              
              return (
                <div key={event.id} className="group">
                  {/* Event Card */}
                  <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-6 hover:shadow-xl transition-all duration-300 hover:border-gray-300/50 dark:hover:border-gray-600/50 hover:scale-[1.02]">
                    <div className="flex flex-col lg:flex-row justify-between gap-6">
                      <div className="flex-1">
                        <div className="flex items-start gap-4 mb-4">
                          <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center flex-shrink-0 shadow-lg">
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
                        <div className="mt-4 flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                          <Users className="h-4 w-4" />
                          <span>{eventAttendees.length} attendees</span>
                          {eventAttendees.filter(a => a.first_time).length > 0 && (
                            <span className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-full text-xs">
                              {eventAttendees.filter(a => a.first_time).length} first-time
                            </span>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex flex-col justify-between items-end gap-4">
                        <div className="flex gap-3">
                          <button 
                            onClick={() => toggleEventExpansion(event.id)}
                            className="flex items-center gap-2 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-xl hover:shadow-lg transition-all duration-200 font-medium group"
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
                      <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                        <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Event Attendees ({eventAttendees.length})</h4>
                        {eventAttendees.length === 0 ? (
                          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                            <User className="h-12 w-12 mx-auto mb-3 opacity-50" />
                            <p>No attendees yet</p>
                            <p className="text-sm">Add attendees using the "Add Attendee" button</p>
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                            {eventAttendees.map((attendee) => (
                              <div key={attendee.id} className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4 hover:shadow-md transition-all duration-200">
                                <div className="flex items-start gap-3">
                                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-semibold text-sm flex-shrink-0">
                                    {getInitials(attendee.name, attendee.surname)}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-start justify-between mb-2">
                                      <div>
                                        <h5 className="font-semibold text-gray-900 dark:text-white truncate">
                                          {attendee.name} {attendee.surname}
                                        </h5>
                                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                                          {attendee.first_time && (
                                            <span className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-full text-xs">
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
                                    
                                    <div className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
                                      {attendee.phone && (
                                        <div className="flex items-center gap-2">
                                          <Phone className="h-3 w-3" />
                                          <span>{attendee.phone}</span>
                                        </div>
                                      )}
                                      {attendee.invited_by && (
                                        <div className="text-xs text-blue-600 dark:text-blue-400">
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
                    <div className="mt-4 bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300">
                      <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6">Add Event Attendee</h3>
                      
                      <form onSubmit={(e) => handleAttendeeSubmit(e, event.id)} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="space-y-2">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">First Name *</label>
                            <input
                              type="text"
                              value={attendeeFormData.name}
                              onChange={(e) => setAttendeeFormData({ ...attendeeFormData, name: e.target.value })}
                              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                              placeholder="Enter first name"
                              required
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Last Name *</label>
                            <input
                              type="text"
                              value={attendeeFormData.surname}
                              onChange={(e) => setAttendeeFormData({ ...attendeeFormData, surname: e.target.value })}
                              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                              placeholder="Enter last name"
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
                              placeholder="Phone number"
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Cell Group</label>
                            <select
                              value={attendeeFormData.cellGroupId}
                              onChange={(e) => setAttendeeFormData({ ...attendeeFormData, cellGroupId: e.target.value })}
                              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                            >
                              <option value="">No cell group</option>
                              {cellGroups.map(group => (
                                <option key={group.id} value={group.id}>{group.name}</option>
                              ))}
                            </select>
                          </div>
                          <div className="md:col-span-2 space-y-2">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Invited By</label>
                            <input
                              type="text"
                              value={attendeeFormData.invitedBy}
                              onChange={(e) => setAttendeeFormData({ ...attendeeFormData, invitedBy: e.target.value })}
                              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                              placeholder="Who invited this person?"
                            />
                          </div>
                        </div>

                        {/* First Time Checkbox */}
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            id={`firstTime-${event.id}`}
                            checked={attendeeFormData.firstTime}
                            onChange={(e) => setAttendeeFormData({ ...attendeeFormData, firstTime: e.target.checked })}
                            className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                          />
                          <label htmlFor={`firstTime-${event.id}`} className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            First Time Attending
                          </label>
                        </div>

                        <div className="flex gap-3 pt-4">
                          <button
                            type="submit"
                            disabled={loading || !attendeeFormData.name.trim() || !attendeeFormData.surname.trim()}
                            className="flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:shadow-lg transition-all duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <Users className="h-4 w-4" />
                            {loading ? 'Adding...' : 'Add Attendee'}
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
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

export default Events;
