import { useState, useEffect } from 'react';
import { supabase } from '../../integrations/supabase/client';
import { X, Search, User, CheckCircle, Users } from 'lucide-react';

interface Member {
  id: string;
  name: string;
  surname: string;
  phone: string | null;
  residence?: string | null;
  status: string | null;
  cell_group_id: string | null;
  cell_groups?: { name: string } | null;
}

interface EventAttendeeModalProps {
  eventId: string;
  eventName: string;
  onClose: () => void;
  onSuccess: () => void;
}

const EventAttendeeModal: React.FC<EventAttendeeModalProps> = ({
  eventId,
  eventName,
  onClose,
  onSuccess
}) => {
  const [members, setMembers] = useState<Member[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMemberId, setSelectedMemberId] = useState('');
  const [firstTime, setFirstTime] = useState(false);
  const [invitedById, setInvitedById] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchMembers();
  }, []);

  const fetchMembers = async () => {
    try {
      const { data, error } = await supabase
        .from('members')
        .select(`
          id,
          name,
          surname,
          phone,
          residence,
          status,
          cell_group_id,
          cell_groups!fk_cell_group(name)
        `)
        .neq('status', 'not_attending')
        .order('name');

      if (error) throw error;
      setMembers(data || []);
    } catch (err: any) {
      console.error('Error fetching members:', err);
      setError(err.message);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedMemberId) {
      setError('Please select a member');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Check if already registered
      const { data: existing } = await supabase
        .from('event_attendees')
        .select('id')
        .eq('event_id', eventId)
        .eq('members_id', selectedMemberId)
        .maybeSingle();

      if (existing) {
        setError('This member is already registered for this event');
        setLoading(false);
        return;
      }

      // Insert attendee
      const { error: insertError } = await supabase
        .from('event_attendees')
        .insert({
          event_id: eventId,
          members_id: selectedMemberId,
          first_time: firstTime,
          invited_by_id: invitedById || null,
          attendance_status: 'present',
          attended_at: new Date().toISOString()
        });

      if (insertError) throw insertError;

      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Error adding attendee:', err);
      setError(err.message || 'Failed to add attendee');
    } finally {
      setLoading(false);
    }
  };

  const filteredMembers = members.filter(member => {
    const search = searchTerm.toLowerCase();
    return (
      member.name.toLowerCase().includes(search) ||
      member.surname.toLowerCase().includes(search) ||
      member.phone?.toLowerCase().includes(search)
    );
  });

  const selectedMember = members.find(m => m.id === selectedMemberId);
  const inviterMembers = members.filter(m => m.id !== selectedMemberId);

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              Add Attendee
            </h2>
            <p className="text-gray-600 dark:text-gray-400 text-sm mt-1">
              {eventName}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6">
          {error && (
            <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-300">
              {error}
            </div>
          )}

          {/* Member Search */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Select Member *
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by name, phone, or email..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {searchTerm && (
              <div className="mt-2 max-h-60 overflow-y-auto border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700">
                {filteredMembers.length === 0 ? (
                  <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                    No members found
                  </div>
                ) : (
                  filteredMembers.map((member) => (
                    <button
                      key={member.id}
                      type="button"
                      onClick={() => {
                        setSelectedMemberId(member.id);
                        setSearchTerm('');
                      }}
                      className="w-full p-4 text-left hover:bg-gray-50 dark:hover:bg-gray-600 border-b border-gray-200 dark:border-gray-600 last:border-b-0"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex-shrink-0">
                          <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                            <User className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 dark:text-white">
                            {member.name} {member.surname}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                            {member.phone || 'No phone'}
                          </p>
                          {member.cell_groups && (
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              {member.cell_groups.name}
                            </p>
                          )}
                        </div>
                      </div>
                    </button>
                  ))
                )}
              </div>
            )}

            {selectedMember && (
              <div className="mt-3 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {selectedMember.name} {selectedMember.surname}
                    </p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      {selectedMember.phone || 'No phone'}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* First Time Visitor */}
          <div className="mb-6">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={firstTime}
                onChange={(e) => setFirstTime(e.target.checked)}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                First time attending this event
              </span>
            </label>
          </div>

          {/* Invited By */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Invited By (Optional)
            </label>
            <select
              value={invitedById}
              onChange={(e) => setInvitedById(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select a member...</option>
              {inviterMembers.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.name} {member.surname}
                </option>
              ))}
            </select>
          </div>

          {/* Submit Button */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!selectedMemberId || loading}
              className="flex-1 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
            >
              <Users className="h-4 w-4" />
              {loading ? 'Adding...' : 'Add Attendee'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EventAttendeeModal;
