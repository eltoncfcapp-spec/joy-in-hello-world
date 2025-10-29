import { Calendar as CalendarIcon, Clock, MapPin, Plus } from 'lucide-react';

const Events = () => {
  const events = [
    {
      id: 1,
      title: 'Sunday Service',
      date: 'Dec 29, 2024',
      time: '10:00 AM - 12:00 PM',
      location: 'Main Sanctuary',
      attendees: 250,
      category: 'Worship',
    },
    {
      id: 2,
      title: 'Youth Group Meeting',
      date: 'Dec 30, 2024',
      time: '6:00 PM - 8:00 PM',
      location: 'Youth Hall',
      attendees: 45,
      category: 'Youth',
    },
    {
      id: 3,
      title: 'Prayer Meeting',
      date: 'Jan 1, 2025',
      time: '7:00 PM - 9:00 PM',
      location: 'Prayer Room',
      attendees: 80,
      category: 'Prayer',
    },
    {
      id: 4,
      title: 'Bible Study',
      date: 'Jan 3, 2025',
      time: '6:30 PM - 8:00 PM',
      location: 'Community Room',
      attendees: 35,
      category: 'Study',
    },
  ];

  const categoryColors: Record<string, string> = {
    Worship: 'bg-purple-500/20 text-purple-400',
    Youth: 'bg-blue-500/20 text-blue-400',
    Prayer: 'bg-green-500/20 text-green-400',
    Study: 'bg-orange-500/20 text-orange-400',
  };

  return (
    <div className="animate-fadeIn">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <h1 className="text-4xl font-bold gradient-text">Events Calendar</h1>
        <button className="bg-primary text-primary-foreground px-6 py-3 rounded-lg flex items-center gap-2 hover:scale-105 transition-transform duration-200">
          <Plus className="h-5 w-5" />
          Create Event
        </button>
      </div>

      <div className="grid gap-6">
        {events.map((event) => (
          <div
            key={event.id}
            className="bg-background/10 backdrop-blur-xl border border-primary/20 rounded-xl p-6 hover:scale-[1.02] transition-all duration-200"
          >
            <div className="flex flex-col lg:flex-row justify-between gap-6">
              <div className="flex-1">
                <div className="flex items-start gap-4 mb-4">
                  <div className="w-14 h-14 rounded-lg bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center">
                    <CalendarIcon className="h-7 w-7 text-primary-foreground" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-foreground mb-2">{event.title}</h3>
                    <span className={`px-3 py-1 rounded-full text-sm ${categoryColors[event.category]}`}>
                      {event.category}
                    </span>
                  </div>
                </div>
                
                <div className="space-y-2 text-foreground/70">
                  <div className="flex items-center gap-2">
                    <CalendarIcon className="h-4 w-4" />
                    <span>{event.date}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    <span>{event.time}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    <span>{event.location}</span>
                  </div>
                </div>
              </div>
              
              <div className="flex flex-col justify-between items-end">
                <div className="text-right">
                  <p className="text-3xl font-bold text-foreground">{event.attendees}</p>
                  <p className="text-sm text-foreground/60">Expected Attendees</p>
                </div>
                <button className="mt-4 px-6 py-2 bg-primary/20 text-primary border border-primary/30 rounded-lg hover:bg-primary/30 transition-colors">
                  View Details
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Events;
