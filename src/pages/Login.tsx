import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Eye, EyeOff, Mail, User, Calendar, Clock, MapPin, ChevronLeft, ChevronRight, Image as ImageIcon, X } from 'lucide-react';
import { supabase } from '../integrations/supabase/client';

interface UpcomingEvent {
  id: string;
  name: string;
  topic: string | null;
  event_date: string;
  event_time: string;
  location: string | null;
  pamphlet_url: string | null;
}

export default function Login() {
  const [identifier, setIdentifier] = useState('');
  const [credential, setCredential] = useState('');
  const [showCredential, setShowCredential] = useState(false);
  const [loginMethod, setLoginMethod] = useState<'email' | 'username'>('email');
  const [error, setError] = useState('');
  const { login, user, loading } = useAuth();
  const navigate = useNavigate();
  
  const [upcomingEvents, setUpcomingEvents] = useState<UpcomingEvent[]>([]);
  const [eventsLoading, setEventsLoading] = useState(true);
  const [currentEventIndex, setCurrentEventIndex] = useState(0);
  const [expandedImage, setExpandedImage] = useState<string | null>(null);

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      navigate('/');
    }
  }, [user, navigate]);

  // Function to check if an event is truly upcoming (not past)
  const isEventUpcoming = (eventDate: string, eventTime: string): boolean => {
    try {
      const now = new Date();
      const formattedTime = formatTimeForComparison(eventTime);
      const eventDateTimeStr = `${eventDate}T${formattedTime}:00`;
      const eventDateTime = new Date(eventDateTimeStr);
      
      // Check if the date string is valid
      if (isNaN(eventDateTime.getTime())) {
        console.error('Invalid event date/time:', eventDate, eventTime);
        return false;
      }
      
      // Check if the event is in the future
      return eventDateTime > now;
    } catch (error) {
      console.error('Error checking if event is upcoming:', error);
      return false;
    }
  };

  // Format time for comparison
  const formatTimeForComparison = (timeString: string): string => {
    if (!timeString) return '00:00';
    
    try {
      // Handle different time formats
      let hours: number, minutes: string;
      
      if (timeString.includes(':')) {
        const [h, m] = timeString.split(':');
        hours = parseInt(h) || 0;
        minutes = m || '00';
      } else if (timeString.length === 4) {
        // Handle HHMM format
        hours = parseInt(timeString.substring(0, 2)) || 0;
        minutes = timeString.substring(2, 4) || '00';
      } else if (timeString.length === 1 || timeString.length === 2) {
        // Handle H or HH format
        hours = parseInt(timeString) || 0;
        minutes = '00';
      } else {
        return '00:00';
      }
      
      // Ensure valid ranges
      hours = Math.min(23, Math.max(0, hours));
      minutes = minutes.padStart(2, '0');
      
      return `${hours.toString().padStart(2, '0')}:${minutes}`;
    } catch (error) {
      console.error('Error formatting time for comparison:', error);
      return '00:00';
    }
  };

  // Fetch upcoming events
  useEffect(() => {
    const fetchUpcomingEvents = async () => {
      try {
        setEventsLoading(true);
        const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
        
        console.log('Fetching events from:', today);

        // First, get all events from today onward that are not completed
        const { data: allEvents, error: eventsError } = await supabase
          .from('events')
          .select('id, name, topic, event_date, event_time, location, pamphlet_url')
          .gte('event_date', today)
          .eq('is_completed', false)
          .order('event_date', { ascending: true })
          .order('event_time', { ascending: true });

        if (eventsError) {
          console.error('Supabase query error:', eventsError);
          throw eventsError;
        }
        
        console.log('All events from today:', allEvents);

        // Filter to only show truly upcoming events (not past)
        const upcomingEventsList = (allEvents || []).filter(event => {
          const isUpcoming = isEventUpcoming(event.event_date, event.event_time);
          console.log(`Event ${event.name} on ${event.event_date} at ${event.event_time}: ${isUpcoming ? 'UPCOMING' : 'PAST'}`);
          return isUpcoming;
        });
        
        console.log('Upcoming events after filtering:', upcomingEventsList);
        
        // If we have upcoming events, set them
        if (upcomingEventsList.length > 0) {
          setUpcomingEvents(upcomingEventsList);
        } else {
          // If no upcoming events found, show the next event from the future
          console.log('No upcoming events today, looking for future events...');
          
          // Get the next event from any future date
          const { data: nextEvent, error: nextEventError } = await supabase
            .from('events')
            .select('id, name, topic, event_date, event_time, location, pamphlet_url')
            .gt('event_date', today) // Only future dates
            .eq('is_completed', false)
            .order('event_date', { ascending: true })
            .order('event_time', { ascending: true })
            .limit(1);
            
          if (nextEventError) {
            console.error('Error fetching next event:', nextEventError);
          }
          
          if (nextEvent && nextEvent.length > 0) {
            console.log('Found future event:', nextEvent[0]);
            setUpcomingEvents(nextEvent);
          } else {
            // If still no events, try to get any event as fallback
            console.log('No future events found, trying fallback...');
            const { data: anyEvent, error: anyError } = await supabase
              .from('events')
              .select('id, name, topic, event_date, event_time, location, pamphlet_url')
              .eq('is_completed', false)
              .order('event_date', { ascending: false })
              .limit(1);
              
            if (anyError) {
              console.error('Fallback query error:', anyError);
            } else if (anyEvent && anyEvent.length > 0) {
              console.log('Fallback event:', anyEvent[0]);
              setUpcomingEvents(anyEvent);
            }
          }
        }
        
      } catch (error: any) {
        console.error('Error fetching upcoming events:', error);
        // Try a simpler query as fallback
        try {
          const { data, error } = await supabase
            .from('events')
            .select('id, name, topic, event_date, event_time, location, pamphlet_url')
            .order('event_date', { ascending: true })
            .limit(5);
            
          if (error) {
            console.error('Fallback query error:', error);
          } else if (data) {
            // Filter for truly upcoming events
            const filteredData = data.filter(event => 
              isEventUpcoming(event.event_date, event.event_time)
            );
            setUpcomingEvents(filteredData.length > 0 ? filteredData : []);
          }
        } catch (fallbackError) {
          console.error('Fallback query also failed:', fallbackError);
        }
      } finally {
        setEventsLoading(false);
      }
    };

    fetchUpcomingEvents();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Normalize inputs: trim spaces and convert to lowercase for case-insensitive comparison
    const normalizedIdentifier = identifier.trim().toLowerCase();
    const normalizedCredential = credential.trim();

    const success = await login(normalizedIdentifier, normalizedCredential);

    if (success) {
      navigate('/');
    } else {
      setError(`Invalid ${loginMethod === 'email' ? 'email or password' : 'username or PIN'}`);
    }
  };

  const toggleLoginMethod = () => {
    setLoginMethod(loginMethod === 'email' ? 'username' : 'email');
    setIdentifier('');
    setCredential('');
    setError('');
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        return 'Date not available';
      }
      return date.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'Invalid date';
    }
  };

  const formatTime = (timeString: string) => {
    try {
      if (!timeString) return 'Time not available';
      
      // Format time for display
      const formattedTime = formatTimeForComparison(timeString);
      
      if (formattedTime === '00:00') {
        // Try to parse the original time string for display
        if (timeString.includes(':')) {
          const [h, m] = timeString.split(':');
          const hours = parseInt(h) || 0;
          const minutes = m || '00';
          const ampm = hours >= 12 ? 'PM' : 'AM';
          const formattedHour = hours % 12 || 12;
          return `${formattedHour}:${minutes.padStart(2, '0')} ${ampm}`;
        } else if (timeString.length === 4) {
          const hours = parseInt(timeString.substring(0, 2)) || 0;
          const minutes = timeString.substring(2, 4) || '00';
          const ampm = hours >= 12 ? 'PM' : 'AM';
          const formattedHour = hours % 12 || 12;
          return `${formattedHour}:${minutes} ${ampm}`;
        }
        return 'Time not specified';
      }
      
      // Convert 24-hour format to 12-hour format for display
      const [hours24, minutes] = formattedTime.split(':');
      const hours = parseInt(hours24);
      const ampm = hours >= 12 ? 'PM' : 'AM';
      const formattedHour = hours % 12 || 12;
      
      return `${formattedHour}:${minutes} ${ampm}`;
    } catch (error) {
      console.error('Error formatting time:', error);
      return 'Invalid time';
    }
  };

  const nextEvent = () => {
    if (upcomingEvents.length > 0) {
      setCurrentEventIndex((prevIndex) => 
        prevIndex === upcomingEvents.length - 1 ? 0 : prevIndex + 1
      );
    }
  };

  const prevEvent = () => {
    if (upcomingEvents.length > 0) {
      setCurrentEventIndex((prevIndex) => 
        prevIndex === 0 ? upcomingEvents.length - 1 : prevIndex - 1
      );
    }
  };

  // Auto-scroll events every 5 seconds
  useEffect(() => {
    if (upcomingEvents.length <= 1) return;
    
    const interval = setInterval(() => {
      nextEvent();
    }, 5000);
    
    return () => clearInterval(interval);
  }, [upcomingEvents.length]);

  const getPamphletUrl = (pamphletUrl: string | null) => {
    if (!pamphletUrl) return null;
    
    // If it's a Supabase storage URL, we need to get the public URL
    if (pamphletUrl.includes('supabase.co/storage/v1/object/public')) {
      return pamphletUrl;
    }
    
    // If it's just a path in storage, construct the full URL
    // Check different possible bucket names
    const possibleBuckets = ['event-pamphlets', 'pamphlets', 'events'];
    
    for (const bucket of possibleBuckets) {
      if (pamphletUrl.startsWith(bucket + '/') || !pamphletUrl.includes('/')) {
        const filePath = pamphletUrl.includes('/') ? pamphletUrl : `${bucket}/${pamphletUrl}`;
        try {
          const { data: { publicUrl } } = supabase.storage
            .from(bucket)
            .getPublicUrl(filePath);
          return publicUrl;
        } catch (error) {
          console.error(`Error getting public URL for bucket ${bucket}:`, error);
          continue;
        }
      }
    }
    
    return pamphletUrl;
  };

  // Get current event safely
  const currentEvent = upcomingEvents[currentEventIndex];
  const pamphletUrl = currentEvent ? getPamphletUrl(currentEvent.pamphlet_url) : null;
  const isCurrentEventUpcoming = currentEvent ? 
    isEventUpcoming(currentEvent.event_date, currentEvent.event_time) : false;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50 p-4">
      {/* Expanded Image Modal */}
      {expandedImage && (
        <div className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center p-4" onClick={() => setExpandedImage(null)}>
          <button 
            className="absolute top-4 right-4 text-white hover:text-gray-300 z-10"
            onClick={() => setExpandedImage(null)}
          >
            <X className="h-8 w-8" />
          </button>
          <div className="relative max-w-4xl max-h-[90vh] w-full" onClick={(e) => e.stopPropagation()}>
            <img 
              src={expandedImage} 
              alt="Event Pamphlet" 
              className="w-full h-auto max-h-[90vh] object-contain rounded-lg"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.style.display = 'none';
                target.parentElement!.innerHTML = `
                  <div class="flex flex-col items-center justify-center h-64 bg-gray-100 rounded-lg p-4">
                    <ImageIcon class="h-12 w-12 text-gray-400 mb-2" />
                    <p class="text-gray-500">Pamphlet preview not available</p>
                  </div>
                `;
              }}
            />
          </div>
        </div>
      )}

      <div className="max-w-6xl w-full grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Login Form Column */}
        <div className="space-y-8">
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-white font-bold text-xl">CM</span>
              </div>
              <h2 className="text-3xl font-bold text-gray-900">Church Management</h2>
              <p className="mt-2 text-gray-600">Sign in to your account</p>
            </div>

            {/* Login Method Toggle */}
            <div className="flex bg-gray-100 rounded-lg p-1 mb-6">
              <button
                type="button"
                onClick={() => setLoginMethod('email')}
                className={`flex items-center justify-center gap-2 flex-1 py-2 px-4 rounded-md transition-all ${
                  loginMethod === 'email'
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Mail className="h-4 w-4" />
                Email Login
              </button>
              <button
                type="button"
                onClick={() => setLoginMethod('username')}
                className={`flex items-center justify-center gap-2 flex-1 py-2 px-4 rounded-md transition-all ${
                  loginMethod === 'username'
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <User className="h-4 w-4" />
                Username/PIN
              </button>
            </div>

            <form className="space-y-6" onSubmit={handleSubmit}>
              <div className="space-y-4">
                <div>
                  <label htmlFor="identifier" className="block text-sm font-medium text-gray-700">
                    {loginMethod === 'email' ? 'Email Address' : 'Username'}
                  </label>
                  <input
                    id="identifier"
                    type={loginMethod === 'email' ? 'email' : 'text'}
                    required
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    className="mt-1 block w-full px-3 py-3 border border-gray-300 rounded-xl bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    placeholder={loginMethod === 'email' ? 'admin@church.com' : 'Enter your username'}
                    disabled={loading}
                  />
                </div>

                <div>
                  <label htmlFor="credential" className="block text-sm font-medium text-gray-700">
                    {loginMethod === 'email' ? 'Password' : 'PIN'}
                  </label>
                  <div className="relative">
                    <input
                      id="credential"
                      type={showCredential ? 'text' : loginMethod === 'email' ? 'password' : 'text'}
                      required
                      value={credential}
                      onChange={(e) => setCredential(e.target.value)}
                      className="mt-1 block w-full px-3 py-3 pr-10 border border-gray-300 rounded-xl bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                      placeholder={loginMethod === 'email' ? '••••••••' : 'Enter your 4-digit PIN'}
                      maxLength={loginMethod === 'username' ? 4 : undefined}
                      inputMode={loginMethod === 'username' ? 'numeric' : 'text'}
                      disabled={loading}
                    />
                    {loginMethod === 'email' && (
                      <button
                        type="button"
                        onClick={() => setShowCredential(!showCredential)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
                        disabled={loading}
                      >
                        {showCredential ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    )}
                  </div>
                  {loginMethod === 'username' && (
                    <p className="mt-1 text-xs text-gray-500">Enter your 4-digit PIN</p>
                  )}
                </div>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-3">
                  <p className="text-red-700 text-sm text-center">{error}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <div className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Signing in...
                  </div>
                ) : (
                  'Sign In'
                )}
              </button>

              <div className="text-center">
                <button
                  type="button"
                  onClick={toggleLoginMethod}
                  className="text-blue-600 hover:text-blue-700 text-sm font-medium disabled:opacity-50"
                  disabled={loading}
                >
                  Switch to {loginMethod === 'email' ? 'Username/PIN Login' : 'Email Login'}
                </button>
              </div>
            </form>

            {/* Information about login methods */}
            <div className="bg-gray-50 rounded-xl p-4 border border-gray-200 mt-6">
              <h4 className="font-medium text-gray-900 text-sm mb-2">About Login Methods:</h4>
              <ul className="text-xs text-gray-600 space-y-1">
                <li>• <strong>Email Login:</strong> For administrators with email/password</li>
                <li>• <strong>Username/PIN:</strong> For members with generated credentials</li>
                <li>• Members get username/PIN from church administrators</li>
                <li>• Login is case-insensitive and automatically trims spaces</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Upcoming Events Column */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-gradient-to-r from-orange-500 to-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <Calendar className="h-8 w-8 text-white" />
            </div>
            <h2 className="text-3xl font-bold text-gray-900">Upcoming Events</h2>
            <p className="mt-2 text-gray-600">Future church activities and services</p>
          </div>

          {eventsLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : upcomingEvents.length === 0 ? (
            <div className="text-center py-12">
              <Calendar className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-600 mb-2">No Upcoming Events</h3>
              <p className="text-gray-500">Check back later for future church events</p>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="relative">
                {/* Event Card */}
                <div className="bg-gradient-to-br from-blue-50 to-purple-50 border border-blue-200 rounded-2xl p-6 hover:shadow-lg transition-all duration-300">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-xl font-bold text-gray-900 mb-1">
                        {currentEvent?.name || 'No Event'}
                      </h3>
                      {currentEvent?.topic && (
                        <p className="text-blue-600 font-medium">
                          {currentEvent.topic}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {isCurrentEventUpcoming ? (
                        <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                          Upcoming
                        </span>
                      ) : (
                        <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-medium">
                          Past Event
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Event Pamphlet */}
                  {pamphletUrl && (
                    <div className="mb-4">
                      <div className="flex items-center gap-2 mb-2">
                        <ImageIcon className="h-4 w-4 text-blue-500" />
                        <span className="text-sm font-medium text-gray-700">Event Pamphlet</span>
                      </div>
                      <div 
                        className="relative group cursor-pointer overflow-hidden rounded-lg border border-gray-200 bg-white"
                        onClick={() => setExpandedImage(pamphletUrl)}
                      >
                        <img 
                          src={pamphletUrl} 
                          alt={`${currentEvent?.name || 'Event'} pamphlet`}
                          className="w-full h-48 object-contain transition-transform duration-300 group-hover:scale-105"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.style.display = 'none';
                            target.parentElement!.innerHTML = `
                              <div class="flex flex-col items-center justify-center h-48 bg-gray-100 rounded-lg p-4">
                                <ImageIcon class="h-8 w-8 text-gray-400 mb-2" />
                                <p class="text-gray-500 text-sm">Pamphlet preview not available</p>
                              </div>
                            `;
                          }}
                        />
                        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 transition-all duration-300 flex items-center justify-center">
                          <div className="text-white text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-black bg-opacity-50 px-3 py-1 rounded-full">
                            Click to enlarge
                          </div>
                        </div>
                      </div>
                      <p className="text-xs text-gray-500 mt-1 text-center">Click image to view full size</p>
                    </div>
                  )}

                  {currentEvent && (
                    <>
                      <div className="space-y-3 text-gray-600">
                        <div className="flex items-center gap-3">
                          <Calendar className="h-5 w-5 text-blue-500" />
                          <span className="font-medium">
                            {formatDate(currentEvent.event_date)}
                            {!isCurrentEventUpcoming && (
                              <span className="ml-2 text-xs text-red-500 bg-red-50 px-2 py-0.5 rounded-full">
                                (Past)
                              </span>
                            )}
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <Clock className="h-5 w-5 text-blue-500" />
                          <span className="font-medium">
                            {formatTime(currentEvent.event_time)}
                          </span>
                        </div>
                        {currentEvent.location && (
                          <div className="flex items-center gap-3">
                            <MapPin className="h-5 w-5 text-blue-500" />
                            <span className="font-medium">
                              {currentEvent.location}
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="mt-6 pt-4 border-t border-blue-100">
                        <p className="text-sm text-gray-500">
                          Event {currentEventIndex + 1} of {upcomingEvents.length}
                          {!isCurrentEventUpcoming && (
                            <span className="ml-2 text-red-500">(Past event shown for reference)</span>
                          )}
                        </p>
                      </div>
                    </>
                  )}
                </div>

                {/* Navigation Arrows */}
                {upcomingEvents.length > 1 && (
                  <>
                    <button
                      onClick={prevEvent}
                      className="absolute left-0 top-1/2 transform -translate-y-1/2 -translate-x-4 w-10 h-10 bg-white rounded-full shadow-lg flex items-center justify-center hover:shadow-xl transition-all duration-200 hover:scale-110"
                    >
                      <ChevronLeft className="h-5 w-5 text-gray-700" />
                    </button>
                    <button
                      onClick={nextEvent}
                      className="absolute right-0 top-1/2 transform -translate-y-1/2 translate-x-4 w-10 h-10 bg-white rounded-full shadow-lg flex items-center justify-center hover:shadow-xl transition-all duration-200 hover:scale-110"
                    >
                      <ChevronRight className="h-5 w-5 text-gray-700" />
                    </button>
                  </>
                )}
              </div>

              {/* Event Dots Indicator */}
              {upcomingEvents.length > 1 && (
                <div className="flex justify-center gap-2">
                  {upcomingEvents.map((event, index) => {
                    const isUpcoming = isEventUpcoming(event.event_date, event.event_time);
                    return (
                      <button
                        key={event.id}
                        onClick={() => setCurrentEventIndex(index)}
                        className={`w-2 h-2 rounded-full transition-all duration-200 ${
                          index === currentEventIndex
                            ? isUpcoming ? 'bg-green-600 w-6' : 'bg-gray-600 w-6'
                            : isUpcoming ? 'bg-green-300 hover:bg-green-400' : 'bg-gray-300 hover:bg-gray-400'
                        }`}
                        aria-label={`Go to event ${index + 1}`}
                        title={isUpcoming ? 'Upcoming event' : 'Past event'}
                      />
                    );
                  })}
                </div>
              )}

              {/* Upcoming Events List */}
              {upcomingEvents.length > 0 && (
                <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                  <h4 className="font-medium text-gray-900 text-sm mb-3">Events:</h4>
                  <div className="space-y-3 max-h-60 overflow-y-auto">
                    {upcomingEvents.map((event, index) => {
                      const eventPamphletUrl = getPamphletUrl(event.pamphlet_url);
                      const isUpcoming = isEventUpcoming(event.event_date, event.event_time);
                      
                      return (
                        <div
                          key={event.id}
                          onClick={() => setCurrentEventIndex(index)}
                          className={`p-3 rounded-lg cursor-pointer transition-all duration-200 ${
                            index === currentEventIndex
                              ? 'bg-white border border-blue-200 shadow-sm'
                              : 'hover:bg-white hover:shadow-sm'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-gray-900 text-sm">
                                  {event.name}
                                </span>
                                {!isUpcoming && (
                                  <span className="text-xs text-red-500 bg-red-50 px-1.5 py-0.5 rounded-full">
                                    Past
                                  </span>
                                )}
                              </div>
                              <div className="text-xs text-gray-500 flex items-center gap-2 mt-1">
                                <Calendar className="h-3 w-3" />
                                {formatDate(event.event_date)}
                                <Clock className="h-3 w-3 ml-2" />
                                {formatTime(event.event_time)}
                              </div>
                              {eventPamphletUrl && (
                                <div className="flex items-center gap-1 mt-1">
                                  <ImageIcon className="h-3 w-3 text-blue-500" />
                                  <span className="text-xs text-blue-600">Has pamphlet</span>
                                </div>
                              )}
                            </div>
                            {index === currentEventIndex && (
                              <div className={`w-2 h-2 rounded-full ml-2 ${isUpcoming ? 'bg-green-600' : 'bg-gray-600'}`}></div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Note about events */}
              <div className="text-center">
                <p className="text-xs text-gray-500">
                  {upcomingEvents.some(e => isEventUpcoming(e.event_date, e.event_time)) 
                    ? 'Log in to view all events and manage attendance'
                    : 'No upcoming events scheduled. Check back later.'
                  }
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
