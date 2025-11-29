import { Calendar as CalendarIcon, Clock, MapPin, Plus, Phone, X, User, Search, Mail, Building, Users as UsersIcon, CheckCircle, AlertCircle, Upload, FileText, Eye, BookOpen, Download, PlayCircle, AlertTriangle, Edit, Trash2 } from 'lucide-react';
import { useState, useEffect } from 'react';

// Mock Supabase client for demo
const supabase = {
  from: (table: string) => ({
    select: (query?: string) => ({
      eq: (col: string, val: any) => ({
        order: (col: string, opts?: any) => Promise.resolve({ data: [], error: null }),
        single: () => Promise.resolve({ data: null, error: null })
      }),
      order: (col: string, opts?: any) => Promise.resolve({ data: [], error: null }),
      single: () => Promise.resolve({ data: null, error: null })
    }),
    insert: (data: any) => ({
      select: (query?: string) => ({
        single: () => Promise.resolve({ data: null, error: null })
      })
    }),
    update: (data: any) => ({
      eq: (col: string, val: any) => Promise.resolve({ data: null, error: null })
    }),
    delete: () => ({
      eq: (col: string, val: any) => Promise.resolve({ data: null, error: null })
    })
  }),
  storage: {
    from: (bucket: string) => ({
      upload: (path: string, file: File, opts?: any) => Promise.resolve({ data: null, error: null }),
      getPublicUrl: (path: string) => ({ data: { publicUrl: '' } }),
      remove: (paths: string[]) => Promise.resolve({ data: null, error: null })
    })
  }
};

// Mock Auth Context
const useAuth = () => ({
  user: { id: '1', email: 'admin@church.com' },
  profile: { admin_role: 'admin', pastor_role: 'senior_pastor' },
  isAdmin: () => true,
  isPastor: () => true,
  loading: false
});

interface Event {
  id: string;
  name: string;
  topic: string | null;
  event_date: string;
  event_time: string;
  location: string | null;
  created_at: string | null;
  is_whole_church: boolean;
  target_groups: string[] | null;
  target_departments: string[] | null;
  is_completed: boolean;
  completed_at: string | null;
  pamphlet_url: string | null;
}

interface Member {
  id: string;
  name: string;
  surname: string;
  email: string | null;
  phone: string | null;
  cell_group_id: string | null;
  cell_groups: { name: string } | null;
  ministry_group_id: string | null;
  ministry_groups: { name: string } | null;
  status: 'newcomer' | 'signed_member' | 'not_attending' | null;
}

interface EventAttendee {
  id: string;
  event_id: string;
  members_id: string;
  first_time: boolean | null;
  invited_by_id: string | null;
  attended_at: string | null;
  attendance_status: 'present' | 'absent';
  members: Member;
  invited_by_member?: {
    id: string;
    name: string;
    surname: string;
  } | null;
}

const Events = () => {
  const { user, profile, isAdmin, isPastor, loading: authLoading } = useAuth();
  const [showAttendeeForm, setShowAttendeeForm] = useState<string | null>(null);
  const [events, setEvents] = useState<Event[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [attendees, setAttendees] = useState<EventAttendee[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [inviterSearchTerm, setInviterSearchTerm] = useState('');
  const [isMemberDropdownOpen, setIsMemberDropdownOpen] = useState(false);
  const [isInviterDropdownOpen, setIsInviterDropdownOpen] = useState(false);
  
  const [attendeeFormData, setAttendeeFormData] = useState({
    memberId: '',
    firstTime: false,
    invitedById: '',
  });

  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [selectedInviter, setSelectedInviter] = useState<Member | null>(null);

  const hasAccess = () => {
    return isAdmin?.() || isPastor?.();
  };

  const fetchEventAttendees = async (eventId: string) => {
    try {
      const { data, error } = await supabase
        .from('event_attendees')
        .select(`
          *,
          members!event_attendees_members_id_fkey (
            id,
            name,
            surname,
            email,
            phone,
            status,
            cell_group_id,
            ministry_group_id,
            cell_groups!fk_cell_group(name),
            ministry_groups(name)
          ),
          invited_by_member:members!event_attendees_invited_by_id_fkey (
            id,
            name,
            surname
          )
        `)
        .eq('event_id', eventId)
        .order('attended_at', { ascending: false });

      if (error) throw error;

      const attendeesWithDefaults = (data || []).map((attendee: any) => ({
        ...attendee,
        attendance_status: attendee.attendance_status || 'present'
      }));

      setAttendees(prev => {
        const filtered = prev.filter(attendee => attendee.event_id !== eventId);
        return [...filtered, ...attendeesWithDefaults];
      });
    } catch (error: any) {
      console.error('Error fetching attendees:', error);
    }
  };

  const handleMemberSelect = (member: Member) => {
    setAttendeeFormData(prev => ({
      ...prev,
      memberId: member.id,
    }));
    setSelectedMember(member);
    setSearchTerm(`${member.name} ${member.surname}`);
    setIsMemberDropdownOpen(false);
  };

  const handleInviterSelect = (member: Member) => {
    setAttendeeFormData(prev => ({
      ...prev,
      invitedById: member.id,
    }));
    setSelectedInviter(member);
    setInviterSearchTerm(`${member.name} ${member.surname}`);
    setIsInviterDropdownOpen(false);
  };

  const handleAttendeeSubmit = async (e: React.FormEvent, eventId: string) => {
    e.preventDefault();
    
    // Validation
    if (!attendeeFormData.memberId || !selectedMember) {
      setError('Please select a member');
      setTimeout(() => setError(null), 3000);
      return;
    }

    // Check if member is already registered for this event
    const alreadyRegistered = attendees.some(
      a => a.event_id === eventId && a.members_id === attendeeFormData.memberId
    );

    if (alreadyRegistered) {
      setError('This member is already registered for this event');
      setTimeout(() => setError(null), 3000);
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const attendeeData = {
        event_id: eventId,
        members_id: attendeeFormData.memberId,
        first_time: attendeeFormData.firstTime,
        invited_by_id: attendeeFormData.invitedById || null,
        attendance_status: 'present' as const,
        attended_at: new Date().toISOString()
      };

      console.log('Submitting attendee data:', attendeeData);

      const { data, error } = await supabase
        .from('event_attendees')
        .insert([attendeeData])
        .select(`
          *,
          members!event_attendees_members_id_fkey (
            id,
            name,
            surname,
            email,
            phone,
            status,
            cell_group_id,
            ministry_group_id,
            cell_groups!fk_cell_group(name),
            ministry_groups(name)
          ),
          invited_by_member:members!event_attendees_invited_by_id_fkey (
            id,
            name,
            surname
          )
        `)
        .single();

      if (error) {
        console.error('Supabase error details:', error);
        throw error;
      }

      console.log('Attendee added successfully:', data);

      // Reset form completely
      resetAttendeeForm();
      
      // Refresh attendees for this event
      await fetchEventAttendees(eventId);
      
      setSuccess(`Successfully added ${selectedMember.name} ${selectedMember.surname} to the event!`);
      setTimeout(() => setSuccess(null), 3000);
    } catch (error: any) {
      console.error('Error adding attendee:', error);
      setError(error.message || 'Failed to add attendee. Please try again.');
      setTimeout(() => setError(null), 5000);
    } finally {
      setLoading(false);
    }
  };

  const resetAttendeeForm = () => {
    setShowAttendeeForm(null);
    setAttendeeFormData({
      memberId: '',
      firstTime: false,
      invitedById: '',
    });
    setSelectedMember(null);
    setSelectedInviter(null);
    setSearchTerm('');
    setInviterSearchTerm('');
    setIsMemberDropdownOpen(false);
    setIsInviterDropdownOpen(false);
  };

  const clearMemberSelection = () => {
    setSelectedMember(null);
    setAttendeeFormData(prev => ({ ...prev, memberId: '' }));
    setSearchTerm('');
  };

  const clearInviterSelection = () => {
    setSelectedInviter(null);
    setAttendeeFormData(prev => ({ ...prev, invitedById: '' }));
    setInviterSearchTerm('');
  };

  const filteredMembers = members.filter(member => {
    const searchLower = searchTerm.toLowerCase();
    return (
      member.name.toLowerCase().includes(searchLower) ||
      member.surname.toLowerCase().includes(searchLower) ||
      `${member.name} ${member.surname}`.toLowerCase().includes(searchLower) ||
      member.phone?.toLowerCase().includes(searchLower) ||
      member.email?.toLowerCase().includes(searchLower)
    );
  });

  const filteredInviters = members.filter(member => {
    const searchLower = inviterSearchTerm.toLowerCase();
    return (
      member.name.toLowerCase().includes(searchLower) ||
      member.surname.toLowerCase().includes(searchLower) ||
      `${member.name} ${member.surname}`.toLowerCase().includes(searchLower) ||
      member.phone?.toLowerCase().includes(searchLower) ||
      member.email?.toLowerCase().includes(searchLower)
    );
  });

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
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
              Events & Sermons
            </h1>
            <p className="text-gray-600">Manage church events and add attendees</p>
          </div>
        </div>

        {/* Success Message */}
        {success && (
          <div className="mb-6 p-4 bg-green-100 border border-green-300 rounded-xl text-green-700 flex items-center gap-2">
            <CheckCircle className="h-5 w-5" />
            {success}
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-100 border border-red-300 rounded-xl text-red-700 flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            {error}
          </div>
        )}

        {/* Demo Event Card */}
        <div className="bg-white rounded-2xl p-6 shadow-lg">
          <div className="flex flex-col lg:flex-row justify-between gap-6">
            <div className="flex-1">
              <div className="flex items-start gap-4 mb-4">
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center shadow-lg">
                  <CalendarIcon className="h-7 w-7 text-white" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2 flex-wrap">
                    <h3 className="text-2xl font-bold text-gray-900">Sunday Service</h3>
                    <span className="px-3 py-1 rounded-full text-sm font-medium flex items-center gap-2 bg-yellow-100 text-yellow-700">
                      <AlertCircle className="h-3 w-3" />
                      Active
                    </span>
                  </div>
                  <p className="text-blue-600 font-medium">Weekly Worship Service</p>
                </div>
              </div>
              
              <div className="space-y-3 text-gray-600 ml-18">
                <div className="flex items-center gap-3">
                  <CalendarIcon className="h-4 w-4" />
                  <span className="font-medium">Sunday, December 1, 2024</span>
                </div>
                <div className="flex items-center gap-3">
                  <Clock className="h-4 w-4" />
                  <span className="font-medium">10:00 AM</span>
                </div>
                <div className="flex items-center gap-3">
                  <MapPin className="h-4 w-4" />
                  <span className="font-medium">Main Sanctuary</span>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-3 lg:w-48">
              <button
                onClick={() => setShowAttendeeForm(showAttendeeForm === 'demo-event' ? null : 'demo-event')}
                className="flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:shadow-lg transition-all duration-200 font-medium text-sm"
              >
                <Plus className="h-4 w-4" />
                {showAttendeeForm === 'demo-event' ? 'Cancel' : 'Add Attendee'}
              </button>
            </div>
          </div>

          {/* Add Attendee Form */}
          {showAttendeeForm === 'demo-event' && (
            <div className="mt-6 p-6 bg-gray-50 rounded-xl border border-gray-200">
              <h4 className="text-lg font-semibold text-gray-900 mb-4">Add Attendee</h4>
              <form onSubmit={(e) => handleAttendeeSubmit(e, 'demo-event')} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Member Search */}
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Member * {selectedMember && <span className="text-green-600">(Selected)</span>}
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => {
                          setSearchTerm(e.target.value);
                          setIsMemberDropdownOpen(true);
                          if (!e.target.value) {
                            clearMemberSelection();
                          }
                        }}
                        onFocus={() => setIsMemberDropdownOpen(true)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                        placeholder="Search members..."
                        disabled={loading}
                      />
                      <Search className="absolute right-3 top-3.5 h-4 w-4 text-gray-400" />
                      
                      {isMemberDropdownOpen && filteredMembers.length > 0 && !selectedMember && (
                        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-xl shadow-lg max-h-60 overflow-y-auto">
                          {filteredMembers.slice(0, 10).map((member) => (
                            <div
                              key={member.id}
                              onClick={() => handleMemberSelect(member)}
                              className="flex items-center gap-3 p-3 hover:bg-gray-100 cursor-pointer transition-colors duration-150"
                            >
                              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white text-xs font-medium">
                                {getInitials(member.name, member.surname)}
                              </div>
                              <div className="flex-1">
                                <div className="font-medium text-gray-900">
                                  {member.name} {member.surname}
                                </div>
                                <div className="text-sm text-gray-500">
                                  {member.phone || member.email}
                                </div>
                              </div>
                              <span className={`px-2 py-1 rounded-full text-xs ${getStatusBadge(member.status).color}`}>
                                {getStatusBadge(member.status).text}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Inviter Search */}
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Invited By (Optional) {selectedInviter && <span className="text-green-600">(Selected)</span>}
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={inviterSearchTerm}
                        onChange={(e) => {
                          setInviterSearchTerm(e.target.value);
                          setIsInviterDropdownOpen(true);
                          if (!e.target.value) {
                            clearInviterSelection();
                          }
                        }}
                        onFocus={() => setIsInviterDropdownOpen(true)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                        placeholder="Search inviter..."
                        disabled={loading}
                      />
                      <Search className="absolute right-3 top-3.5 h-4 w-4 text-gray-400" />
                      
                      {isInviterDropdownOpen && filteredInviters.length > 0 && !selectedInviter && (
                        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-xl shadow-lg max-h-60 overflow-y-auto">
                          {filteredInviters.slice(0, 10).map((member) => (
                            <div
                              key={member.id}
                              onClick={() => handleInviterSelect(member)}
                              className="flex items-center gap-3 p-3 hover:bg-gray-100 cursor-pointer transition-colors duration-150"
                            >
                              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white text-xs font-medium">
                                {getInitials(member.name, member.surname)}
                              </div>
                              <div className="flex-1">
                                <div className="font-medium text-gray-900">
                                  {member.name} {member.surname}
                                </div>
                                <div className="text-sm text-gray-500">
                                  {member.phone || member.email}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* First Time Checkbox */}
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="firstTime"
                    checked={attendeeFormData.firstTime}
                    onChange={(e) => setAttendeeFormData({ ...attendeeFormData, firstTime: e.target.checked })}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                    disabled={loading}
                  />
                  <label htmlFor="firstTime" className="text-sm font-medium text-gray-700">
                    First time attending an event
                  </label>
                </div>

                {/* Selected Member Preview */}
                {selectedMember && (
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white text-sm font-medium">
                          {getInitials(selectedMember.name, selectedMember.surname)}
                        </div>
                        <div>
                          <div className="font-medium text-gray-900">
                            {selectedMember.name} {selectedMember.surname}
                          </div>
                          <div className="text-sm text-gray-600">
                            {selectedMember.phone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{selectedMember.phone}</span>}
                            {selectedMember.email && <span className="flex items-center gap-1"><Mail className="h-3 w-3" />{selectedMember.email}</span>}
                          </div>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={clearMemberSelection}
                        className="p-1 hover:bg-red-100 rounded-lg transition-colors duration-150"
                        disabled={loading}
                      >
                        <X className="h-4 w-4 text-red-500" />
                      </button>
                    </div>
                  </div>
                )}

                {/* Selected Inviter Preview */}
                {selectedInviter && (
                  <div className="p-4 bg-green-50 border border-green-200 rounded-xl">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center text-white text-sm font-medium">
                          {getInitials(selectedInviter.name, selectedInviter.surname)}
                        </div>
                        <div>
                          <div className="text-sm text-gray-600 mb-1">Invited by:</div>
                          <div className="font-medium text-gray-900">
                            {selectedInviter.name} {selectedInviter.surname}
                          </div>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={clearInviterSelection}
                        className="p-1 hover:bg-red-100 rounded-lg transition-colors duration-150"
                        disabled={loading}
                      >
                        <X className="h-4 w-4 text-red-500" />
                      </button>
                    </div>
                  </div>
                )}

                {/* Form Actions */}
                <div className="flex gap-3">
                  <button
                    type="submit"
                    disabled={loading || !selectedMember}
                    className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:shadow-lg transition-all duration-200 font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        Adding...
                      </>
                    ) : (
                      <>
                        <Plus className="h-4 w-4" />
                        Add Attendee
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={resetAttendeeForm}
                    disabled={loading}
                    className="px-6 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-all duration-200 font-medium text-sm disabled:opacity-50"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Events;
