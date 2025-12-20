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
      day: 'numeric',
      year: 'numeric'
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
    if (pamphletUrl.startsWith('pamphlets/')) {
      const { data: { publicUrl } } = supabase.storage
        .from('pamphlets')
        .getPublicUrl(pamphletUrl);
      return publicUrl;
    }
    
    return pamphletUrl;
  };

  const currentEvent = upcomingEvents[currentEventIndex];
  const pamphletUrl = currentEvent ? getPamphletUrl(currentEvent.pamphlet_url) : null;

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
            <p className="mt-2 text-gray-600">Stay informed about church activities</p>
          </div>

          {eventsLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : upcomingEvents.length === 0 ? (
            <div className="text-center py-12">
              <Calendar className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-600 mb-2">No Upcoming Events</h3>
              <p className="text-gray-500">Check back later for upcoming church events</p>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="relative">
                {/* Event Card */}
                <div className="bg-gradient-to-br from-blue-50 to-purple-50 border border-blue-200 rounded-2xl p-6 hover:shadow-lg transition-all duration-300">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-xl font-bold text-gray-900 mb-1">
                        {currentEvent.name}
                      </h3>
                      {currentEvent.topic && (
                        <p className="text-blue-600 font-medium">
                          {currentEvent.topic}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                        Coming Soon
                      </span>
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
                          alt={`${currentEvent.name} pamphlet`}
                          className="w-full h-48 object-contain transition-transform duration-300 group-hover:scale-105"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.style.display = 'none';
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

                  <div className="space-y-3 text-gray-600">
                    <div className="flex items-center gap-3">
                      <Calendar className="h-5 w-5 text-blue-500" />
                      <span className="font-medium">
                        {formatDate(currentEvent.event_date)}
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
                    </p>
                  </div>
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
                  {upcomingEvents.map((event, index) => (
                    <button
                      key={event.id}
                      onClick={() => setCurrentEventIndex(index)}
                      className={`w-2 h-2 rounded-full transition-all duration-200 ${
                        index === currentEventIndex
                          ? 'bg-blue-600 w-6'
                          : 'bg-gray-300 hover:bg-gray-400'
                      }`}
                      aria-label={`Go to event ${index + 1}`}
                    />
                  ))}
                </div>
              )}

              {/* Upcoming Events List */}
              <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                <h4 className="font-medium text-gray-900 text-sm mb-3">All Upcoming Events:</h4>
                <div className="space-y-3 max-h-60 overflow-y-auto">
                  {upcomingEvents.map((event, index) => {
                    const eventPamphletUrl = getPamphletUrl(event.pamphlet_url);
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
                            <div className="font-medium text-gray-900 text-sm">
                              {event.name}
                            </div>
                            <div className="text-xs text-gray-500 flex items-center gap-2">
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
                            <div className="w-2 h-2 rounded-full bg-blue-600 ml-2"></div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Note about events */}
              <div className="text-center">
                <p className="text-xs text-gray-500">
                  Log in to view all events and manage attendance
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
