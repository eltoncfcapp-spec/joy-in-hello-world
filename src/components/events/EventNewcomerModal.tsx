import { useState } from 'react';
import { supabase } from '../../integrations/supabase/client';
import { X, User, Phone, Mail, Users } from 'lucide-react';

interface EventNewcomerModalProps {
  eventId: string;
  eventName: string;
  onClose: () => void;
  onSuccess: () => void;
}

const EventNewcomerModal: React.FC<EventNewcomerModalProps> = ({
  eventId,
  eventName,
  onClose,
  onSuccess
}) => {
  const [formData, setFormData] = useState({
    name: '',
    surname: '',
    phone: '',
    email: '',
    notes: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim() || !formData.surname.trim()) {
      setError('Name and surname are required');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Check if member already exists
      let existingMember = null;
      
      if (formData.email.trim()) {
        const { data } = await supabase
          .from('members')
          .select('id')
          .eq('email', formData.email.trim())
          .maybeSingle();
        existingMember = data;
      }
      
      if (!existingMember && formData.phone.trim()) {
        const { data } = await supabase
          .from('members')
          .select('id')
          .eq('phone', formData.phone.trim())
          .maybeSingle();
        existingMember = data;
      }

      let memberId;
      
      if (existingMember) {
        memberId = existingMember.id;
      } else {
        // Create new member
        const { data: newMember, error: memberError } = await supabase
          .from('members')
          .insert([{
            name: formData.name.trim(),
            surname: formData.surname.trim(),
            phone: formData.phone.trim() || null,
            residence: 'Unknown',
            status: 'newcomer',
            first_time_visit_date: new Date().toISOString(),
            is_permanent_member: false,
            is_leader: false,
            admin_role: 'member',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            status_date: new Date().toISOString()
          }])
          .select('id')
          .single();

        if (memberError) throw memberError;
        memberId = newMember.id;
      }

      // Add to event attendees
      const { error: attendeeError } = await supabase
        .from('event_attendees')
        .insert({
          event_id: eventId,
          members_id: memberId,
          first_time: true,
          attendance_status: 'present',
          attended_at: new Date().toISOString()
        });

      if (attendeeError) throw attendeeError;

      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Error adding newcomer:', err);
      setError(err.message || 'Failed to add newcomer');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              Register Newcomer
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

          <div className="space-y-4">
            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                First Name *
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Enter first name"
                  required
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Surname */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Surname *
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  value={formData.surname}
                  onChange={(e) => setFormData({ ...formData, surname: e.target.value })}
                  placeholder="Enter surname"
                  required
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Phone */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Phone Number
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="Enter phone number"
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="Enter email address"
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Additional Notes
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Any additional information..."
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 resize-none"
              />
            </div>
          </div>

          {/* Submit Buttons */}
          <div className="flex gap-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
            >
              <Users className="h-4 w-4" />
              {loading ? 'Adding...' : 'Add Newcomer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EventNewcomerModal;
