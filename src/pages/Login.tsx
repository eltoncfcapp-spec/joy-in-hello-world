import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Eye, EyeOff, Mail, User, Calendar, Clock, MapPin, ChevronLeft, ChevronRight } from 'lucide-react';
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
  const [pamphletLoading, setPamphletLoading] = useState(true);
  const [showPamphletModal, setShowPamphletModal] = useState(false);
  const scrollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      navigate('/');
    }
  }, [user, navigate]);

  // Fetch upcoming events
  useEffect(() => {
    const fetchUpcomingEvents = async () => {
      try {
        setEventsLoading(true);
        const today = new Date().toISOString().split('T')[0];
        
        const { data, error } = await supabase
          .from('events')
          .select('id, name, topic, event_date, event_time, location, pamphlet_url')
          .gte('event_date', today)
          .order('event_date', { ascending: true })
          .limit(5);

        if (error) throw error;
        
        setUpcomingEvents(data || []);
      } catch (error) {
        console.error('Error fetching upcoming events:', error);
      } finally {
        setEventsLoading(false);
      }
    };

    fetchUpcomingEvents();
  }, []);

  // Setup auto-scroll
  useEffect(() => {
    if (upcomingEvents.length <= 1) return;
    
    scrollIntervalRef.current = setInterval(() => {
      setCurrentEventIndex((prevIndex) => 
        prevIndex === upcomingEvents.length - 1 ? 0 : prevIndex + 1
      );
    }, 8000); // Increased to 8 seconds for better pamphlet viewing
    
    return () => {
      if (scrollIntervalRef.current) {
        clearInterval(scrollIntervalRef.current);
      }
    };
  }, [upcomingEvents.length]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const success = await login(identifier, credential);

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
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
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

  const nextEvent = () => {
    if (scrollIntervalRef.current) {
      clearInterval(scrollIntervalRef.current);
    }
    
    if (upcomingEvents.length > 0) {
      setCurrentEventIndex((prevIndex) => 
        prevIndex === upcomingEvents.length - 1 ? 0 : prevIndex + 1
      );
    }
    
    // Reset auto-scroll
    if (upcomingEvents.length > 1) {
      scrollIntervalRef.current = setInterval(() => {
        setCurrentEventIndex((prevIndex) => 
          prevIndex === upcomingEvents.length - 1 ? 0 : prevIndex + 1
        );
      }, 8000);
    }
  };

  const prevEvent = () => {
    if (scrollIntervalRef.current) {
      clearInterval(scrollIntervalRef.current);
    }
    
    if (upcomingEvents.length > 0) {
      setCurrentEventIndex((prevIndex) => 
        prevIndex === 0 ? upcomingEvents.length - 1 : prevIndex - 1
      );
    }
    
    // Reset auto-scroll
    if (upcomingEvents.length > 1) {
      scrollIntervalRef.current = setInterval(() => {
        setCurrentEventIndex((prevIndex) => 
          prevIndex === upcomingEvents.length - 1 ? 0 : prevIndex + 1
        );
      }, 8000);
    }
  };

  const handlePamphletLoad = () => {
    setPamphletLoading(false);
  };

  const currentEvent = upcomingEvents[currentEventIndex];

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50 p-4 md:p-6">
      <div className="max-w-7xl w-full grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
        {/* Login Form Column - Mobile first design */}
        <div className="space-y-6 md:space-y-8">
          <div className="bg-white/90 backdrop-blur-sm rounded-2xl md:rounded-3xl shadow-xl p-6 md:p-8">
            <div className="text-center mb-6 md:mb-8">
              <div className="w-14 h-14 md:w-16 md:h-16 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-3 md:mb-4">
                <span className="text-white font-bold text-lg md:text-xl">CM</span>
              </div>
              <h2 className="text-2xl md:text-3xl font-bold text-gray-900">Church Management</h2>
              <p className="mt-2 text-gray-600 text-sm md:text-base">Sign in to your account</p>
            </div>

            {/* Login Method Toggle - Responsive */}
            <div className="flex bg-gray-100 rounded-lg p-1 mb-4 md:mb-6">
              <button
                type="button"
                onClick={() => setLoginMethod('email')}
                className={`flex items-center justify-center gap-1 md:gap-2 flex-1 py-2 px-3 md:px-4 rounded-md text-sm md:text-base transition-all ${
                  loginMethod === 'email'
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Mail className="h-3 w-3 md:h-4 md:w-4" />
                <span className="truncate">Email Login</span>
              </button>
              <button
                type="button"
                onClick={() => setLoginMethod('username')}
                className={`flex items-center justify-center gap-1 md:gap-2 flex-1 py-2 px-3 md:px-4 rounded-md text-sm md:text-base transition-all ${
                  loginMethod === 'username'
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <User className="h-3 w-3 md:h-4 md:w-4" />
                <span className="truncate">Username/PIN</span>
              </button>
            </div>

            <form className="space-y-4 md:space-y-6" onSubmit={handleSubmit}>
              <div className="space-y-3 md:space-y-4">
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
                    className="mt-1 block w-full px-3 py-2.5 md:py-3 border border-gray-300 rounded-xl bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-sm md:text-base"
                    placeholder={loginMethod === 'email' ? 'Enter your email' : 'Enter your username'}
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
                      className="mt-1 block w-full px-3 py-2.5 md:py-3 pr-10 border border-gray-300 rounded-xl bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-sm md:text-base"
                      placeholder={loginMethod === 'email' ? '••••••••' : 'Enter PIN'}
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
                className="w-full flex justify-center items-center py-2.5 md:py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm md:text-base font-medium text-white bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <div className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span className="hidden sm:inline">Signing in...</span>
                    <span className="sm:hidden">Signing in...</span>
                  </div>
                ) : (
                  'Sign In'
                )}
              </button>

              <div className="text-center">
                <button
                  type="button"
                  onClick={toggleLoginMethod}
                  className="text-blue-600 hover:text-blue-700 text-xs md:text-sm font-medium disabled:opacity-50"
                  disabled={loading}
                >
                  Switch to {loginMethod === 'email' ? 'Username/PIN Login' : 'Email Login'}
                </button>
              </div>
            </form>

            {/* Information about login methods */}
            <div className="bg-gray-50/80 rounded-xl p-4 border border-gray-200 mt-6">
              <h4 className="font-medium text-gray-900 text-xs md:text-sm mb-2">About Login Methods:</h4>
              <ul className="text-xs text-gray-600 space-y-1">
                <li className="flex items-start gap-1">
                  <span className="min-w-[1rem]">•</span>
                  <span><strong>Email Login:</strong> For administrators with email/password</span>
                </li>
                <li className="flex items-start gap-1">
                  <span className="min-w-[1rem]">•</span>
                  <span><strong>Username/PIN:</strong> For members with generated credentials</span>
                </li>
                <li className="flex items-start gap-1">
                  <span className="min-w-[1rem]">•</span>
                  <span>Members get credentials from church administrators</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Upcoming Events Column */}
        <div className="bg-white/90 backdrop-blur-sm rounded-2xl md:rounded-3xl shadow-xl p-6 md:p-8">
          <div className="text-center mb-6 md:mb-8">
            <div className="w-14 h-14 md:w-16 md:h-16 bg-gradient-to-r from-orange-500 to-red-500 rounded-full flex items-center justify-center mx-auto mb-3 md:mb-4">
              <Calendar className="h-6 w-6 md:h-8 md:w-8 text-white" />
            </div>
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900">Upcoming Events</h2>
            <p className="mt-2 text-gray-600 text-sm md:text-base">Discover our upcoming church activities</p>
          </div>

          {eventsLoading ? (
            <div className="flex flex-col items-center justify-center py-8 md:py-12">
              <div className="animate-spin rounded-full h-8 w-8 md:h-10 md:h-10 border-b-2 border-orange-600 mb-3 md:mb-4"></div>
              <p className="text-gray-600 text-sm">Loading events...</p>
            </div>
          ) : upcomingEvents.length === 0 ? (
            <div className="text-center py-8 md:py-12">
              <Calendar className="h-12 w-12 md:h-16 md:w-16 text-gray-400 mx-auto mb-3 md:mb-4" />
              <h3 className="text-lg md:text-xl font-semibold text-gray-600 mb-1 md:mb-2">No Upcoming Events</h3>
              <p className="text-gray-500 text-sm md:text-base">Check back later for upcoming church events</p>
            </div>
          ) : (
            <div className="space-y-6 md:space-y-8">
              {/* Main Event Card with Pamphlet */}
              <div className="relative bg-gradient-to-br from-orange-50 to-red-50 border border-orange-200 rounded-2xl overflow-hidden">
                {/* Event Info Header */}
                <div className="p-4 md:p-6 bg-gradient-to-r from-orange-500/10 to-red-500/10">
                  <div className="flex flex-col md:flex-row md:items-start justify-between gap-3 md:gap-4">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg md:text-xl font-bold text-gray-900 truncate">
                        {currentEvent.name}
                      </h3>
                      {currentEvent.topic && (
                        <p className="text-orange-600 font-medium text-sm md:text-base truncate">
                          {currentEvent.topic}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="px-2 md:px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-xs md:text-sm font-medium whitespace-nowrap">
                        Coming Soon
                      </span>
                      {currentEvent.pamphlet_url && (
                        <span className="px-2 md:px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs md:text-sm font-medium flex items-center gap-1 whitespace-nowrap">
                          <FileText className="h-3 w-3 md:h-3.5 md:w-3.5" />
                          Pamphlet
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Event Details */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
                    <div className="flex items-center gap-2 md:gap-3">
                      <Calendar className="h-4 w-4 md:h-5 md:w-5 text-orange-500 flex-shrink-0" />
                      <div>
                        <p className="text-xs text-gray-500">Date</p>
                        <p className="font-medium text-gray-900 text-sm md:text-base">
                          {formatDate(currentEvent.event_date)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 md:gap-3">
                      <Clock className="h-4 w-4 md:h-5 md:w-5 text-orange-500 flex-shrink-0" />
                      <div>
                        <p className="text-xs text-gray-500">Time</p>
                        <p className="font-medium text-gray-900 text-sm md:text-base">
                          {formatTime(currentEvent.event_time)}
                        </p>
                      </div>
                    </div>
                    {currentEvent.location && (
                      <div className="sm:col-span-2 flex items-start gap-2 md:gap-3">
                        <MapPin className="h-4 w-4 md:h-5 md:w-5 text-orange-500 flex-shrink-0 mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-gray-500">Location</p>
                          <p className="font-medium text-gray-900 text-sm md:text-base truncate">
                            {currentEvent.location}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Pamphlet Display Section */}
                {currentEvent.pamphlet_url ? (
                  <div className="p-4 md:p-6 bg-white">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-medium text-gray-900 text-sm md:text-base flex items-center gap-2">
                        <FileText className="h-4 w-4 text-blue-600" />
                        Event Pamphlet
                      </h4>
                      <button
                        onClick={() => setShowPamphletModal(true)}
                        className="text-xs md:text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
                      >
                        <ExternalLink className="h-3 w-3 md:h-3.5 md:w-3.5" />
                        <span className="hidden sm:inline">Full Screen</span>
                        <span className="sm:hidden">Expand</span>
                      </button>
                    </div>
                    
                    {/* Responsive Pamphlet Container */}
                    <div className="relative bg-gray-50 rounded-lg border border-gray-200 overflow-hidden">
                      {pamphletLoading && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                        </div>
                      )}
                      <div className="aspect-[3/4] md:aspect-[4/3] max-h-[300px] md:max-h-[350px] overflow-hidden">
                        <iframe
                          src={currentEvent.pamphlet_url}
                          className="w-full h-full border-0"
                          title={`Pamphlet for ${currentEvent.name}`}
                          loading="lazy"
                          onLoad={handlePamphletLoad}
                          sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-6 md:p-8 bg-white text-center">
                    <FileText className="h-12 w-12 md:h-16 md:w-16 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500 text-sm md:text-base">No pamphlet available for this event</p>
                  </div>
                )}

                {/* Event Counter */}
                <div className="px-4 md:px-6 py-3 bg-gray-50/50 border-t border-gray-200">
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-gray-500">
                      Event {currentEventIndex + 1} of {upcomingEvents.length}
                    </p>
                    <p className="text-xs text-gray-500">
                      Auto-rotates every 8s
                    </p>
                  </div>
                </div>
              </div>

              {/* Navigation Controls */}
              <div className="flex items-center justify-between">
                <button
                  onClick={prevEvent}
                  className="flex items-center gap-2 px-4 py-2 md:px-5 md:py-2.5 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition-all duration-200 active:scale-95"
                  disabled={upcomingEvents.length <= 1}
                >
                  <ChevronLeft className="h-4 w-4 md:h-5 md:w-5" />
                  <span className="text-sm font-medium hidden sm:inline">Previous</span>
                </button>

                {/* Event Dots */}
                <div className="flex gap-1.5 md:gap-2">
                  {upcomingEvents.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => setCurrentEventIndex(index)}
                      className={`w-2 h-2 md:w-2.5 md:h-2.5 rounded-full transition-all duration-300 ${
                        index === currentEventIndex
                          ? 'bg-orange-600 scale-125'
                          : 'bg-gray-300 hover:bg-gray-400'
                      }`}
                      aria-label={`Go to event ${index + 1}`}
                    />
                  ))}
                </div>

                <button
                  onClick={nextEvent}
                  className="flex items-center gap-2 px-4 py-2 md:px-5 md:py-2.5 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition-all duration-200 active:scale-95"
                  disabled={upcomingEvents.length <= 1}
                >
                  <span className="text-sm font-medium hidden sm:inline">Next</span>
                  <ChevronRight className="h-4 w-4 md:h-5 md:h-5" />
                </button>
              </div>

              {/* Upcoming Events List */}
              <div className="bg-gray-50/80 rounded-xl p-4 border border-gray-200">
                <h4 className="font-medium text-gray-900 text-sm md:text-base mb-3">Upcoming Events:</h4>
                <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
                  {upcomingEvents.map((event, index) => (
                    <button
                      key={event.id}
                      onClick={() => setCurrentEventIndex(index)}
                      className={`w-full text-left p-3 rounded-lg transition-all duration-200 ${
                        index === currentEventIndex
                          ? 'bg-white border border-orange-200 shadow-sm'
                          : 'hover:bg-white/70 hover:shadow-sm'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-gray-900 text-sm truncate">
                            {event.name}
                          </div>
                          <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
                            <Calendar className="h-3 w-3 flex-shrink-0" />
                            <span className="truncate">{formatDate(event.event_date)}</span>
                            {event.pamphlet_url && (
                              <FileText className="h-3 w-3 text-blue-500 ml-auto" />
                            )}
                          </div>
                        </div>
                        {index === currentEventIndex && (
                          <div className="w-2 h-2 rounded-full bg-orange-600 flex-shrink-0"></div>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Note */}
              <div className="text-center">
                <p className="text-xs text-gray-500">
                  Log in to view all events, manage attendance, and access full features
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Pamphlet Modal */}
      {showPamphletModal && currentEvent?.pamphlet_url && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-4 md:p-6 border-b border-gray-200">
              <div>
                <h3 className="text-lg md:text-xl font-bold text-gray-900">
                  {currentEvent.name} - Pamphlet
                </h3>
                <p className="text-gray-600 text-sm mt-1">
                  {formatDate(currentEvent.event_date)} at {formatTime(currentEvent.event_time)}
                </p>
              </div>
              <button
                onClick={() => setShowPamphletModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>
            <div className="p-4 md:p-6 h-[calc(90vh-80px)]">
              <iframe
                src={currentEvent.pamphlet_url}
                className="w-full h-full rounded-lg border-0"
                title={`Full screen pamphlet for ${currentEvent.name}`}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
