import { Calendar as CalendarIcon, Clock, MapPin, Plus, Users } from 'lucide-react';
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
  const [cellGroups, setCellGroups] = useState<{ id: string; name: string }[]>([]);
  
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

  useEffect(() => {
    fetchEvents();
    fetchCellGroups();
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
    
    const { error } = await supabase.from('event_attendees').insert({
      event_id: eventId,
      name: attendeeFormData.name,
      surname: attendeeFormData.surname,
      phone: attendeeFormData.phone || null,
      first_time: attendeeFormData.firstTime,
      invited_by: attendeeFormData.invitedBy || null,
      cell_group_id: attendeeFormData.cellGroupId || null,
    });

    if (error) {
      console.error('Error adding attendee:', error);
      alert('Error adding attendee');
    } else {
      setShowAttendeeForm(null);
      setAttendeeFormData({ name: '', surname: '', phone: '', firstTime: false, invitedBy: '', cellGroupId: '' });
      alert('Attendee added successfully!');
    }
  };

  return (
    <div className="animate-fadeIn">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <h1 className="text-4xl font-bold gradient-text">Events Calendar</h1>
        <button 
          onClick={() => setShowEventForm(!showEventForm)}
          className="bg-primary text-primary-foreground px-6 py-3 rounded-lg flex items-center gap-2 hover:scale-105 transition-transform duration-200"
        >
          <Plus className="h-5 w-5" />
          {showEventForm ? 'Cancel' : 'Create Event'}
        </button>
      </div>

      {showEventForm && (
        <div className="bg-card border border-border rounded-xl p-6 mb-6 shadow-sm">
          <h2 className="text-xl font-semibold text-foreground mb-4">Create New Event</h2>
          <form onSubmit={handleEventSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Event Name</label>
                <input
                  type="text"
                  value={eventFormData.name}
                  onChange={(e) => setEventFormData({ ...eventFormData, name: e.target.value })}
                  className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Topic</label>
                <input
                  type="text"
                  value={eventFormData.topic}
                  onChange={(e) => setEventFormData({ ...eventFormData, topic: e.target.value })}
                  className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Date</label>
                <input
                  type="date"
                  value={eventFormData.eventDate}
                  onChange={(e) => setEventFormData({ ...eventFormData, eventDate: e.target.value })}
                  className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Time</label>
                <input
                  type="time"
                  value={eventFormData.eventTime}
                  onChange={(e) => setEventFormData({ ...eventFormData, eventTime: e.target.value })}
                  className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  required
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-foreground mb-2">Location</label>
                <input
                  type="text"
                  value={eventFormData.location}
                  onChange={(e) => setEventFormData({ ...eventFormData, location: e.target.value })}
                  className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>
            <button
              type="submit"
              className="bg-primary text-primary-foreground px-6 py-2 rounded-lg hover:opacity-90 transition-opacity"
            >
              Create Event
            </button>
          </form>
        </div>
      )}

      <div className="grid gap-6">
        {events.map((event) => (
          <div key={event.id}>
            <div className="bg-background/10 backdrop-blur-xl border border-primary/20 rounded-xl p-6 hover:scale-[1.02] transition-all duration-200">
              <div className="flex flex-col lg:flex-row justify-between gap-6">
                <div className="flex-1">
                  <div className="flex items-start gap-4 mb-4">
                    <div className="w-14 h-14 rounded-lg bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center">
                      <CalendarIcon className="h-7 w-7 text-primary-foreground" />
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold text-foreground mb-2">{event.name}</h3>
                      {event.topic && (
                        <p className="text-sm text-muted-foreground">{event.topic}</p>
                      )}
                    </div>
                  </div>
                  
                  <div className="space-y-2 text-foreground/70">
                    <div className="flex items-center gap-2">
                      <CalendarIcon className="h-4 w-4" />
                      <span>{new Date(event.event_date).toLocaleDateString()}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      <span>{event.event_time}</span>
                    </div>
                    {event.location && (
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4" />
                        <span>{event.location}</span>
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="flex flex-col justify-between items-end">
                  <button 
                    onClick={() => setShowAttendeeForm(showAttendeeForm === event.id ? null : event.id)}
                    className="px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity flex items-center gap-2"
                  >
                    <Users className="h-4 w-4" />
                    {showAttendeeForm === event.id ? 'Cancel' : 'Add Attendee'}
                  </button>
                </div>
              </div>
            </div>

            {showAttendeeForm === event.id && (
              <div className="mt-4 bg-card border border-border rounded-xl p-6 shadow-sm">
                <h3 className="text-lg font-semibold text-foreground mb-4">Add Event Attendee</h3>
                <form onSubmit={(e) => handleAttendeeSubmit(e, event.id)} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">Name</label>
                      <input
                        type="text"
                        value={attendeeFormData.name}
                        onChange={(e) => setAttendeeFormData({ ...attendeeFormData, name: e.target.value })}
                        className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">Surname</label>
                      <input
                        type="text"
                        value={attendeeFormData.surname}
                        onChange={(e) => setAttendeeFormData({ ...attendeeFormData, surname: e.target.value })}
                        className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">Phone</label>
                      <input
                        type="tel"
                        value={attendeeFormData.phone}
                        onChange={(e) => setAttendeeFormData({ ...attendeeFormData, phone: e.target.value })}
                        className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">Invited By</label>
                      <input
                        type="text"
                        value={attendeeFormData.invitedBy}
                        onChange={(e) => setAttendeeFormData({ ...attendeeFormData, invitedBy: e.target.value })}
                        className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">Cell Group</label>
                      <select
                        value={attendeeFormData.cellGroupId}
                        onChange={(e) => setAttendeeFormData({ ...attendeeFormData, cellGroupId: e.target.value })}
                        className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                      >
                        <option value="">Select cell group</option>
                        {cellGroups.map((group) => (
                          <option key={group.id} value={group.id}>{group.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="firstTime"
                        checked={attendeeFormData.firstTime}
                        onChange={(e) => setAttendeeFormData({ ...attendeeFormData, firstTime: e.target.checked })}
                        className="w-4 h-4 text-primary border-border rounded focus:ring-2 focus:ring-primary"
                      />
                      <label htmlFor="firstTime" className="text-sm font-medium text-foreground">
                        First Time Attending
                      </label>
                    </div>
                  </div>
                  <button
                    type="submit"
                    className="bg-primary text-primary-foreground px-6 py-2 rounded-lg hover:opacity-90 transition-opacity"
                  >
                    Add Attendee
                  </button>
                </form>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default Events;