import { useState } from 'react';
import { supabase } from '../../../integrations/supabase/client';
import { Calendar, MapPin, Clock, FileText } from 'lucide-react';

interface MeetingCreationStepProps {
  group: any;
  onMeetingCreated: () => void;
  onError: (message: string) => void;
}

const MeetingCreationStep: React.FC<MeetingCreationStepProps> = ({
  group,
  onMeetingCreated,
  onError
}) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    meeting_date: '',
    meeting_time: '',
    location: group.location || '',
    topic: '',
    notes: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.meeting_date) {
      onError('Meeting date is required');
      return;
    }

    try {
      setLoading(true);
      const { error } = await supabase
        .from('meetings')
        .insert({
          group_id: group.id,
          meeting_date: formData.meeting_date,
          meeting_time: formData.meeting_time,
          location: formData.location,
          topic: formData.topic,
          notes: formData.notes,
          status: 'scheduled'
        });

      if (error) throw error;

      setFormData({
        meeting_date: '',
        meeting_time: '',
        location: group.location || '',
        topic: '',
        notes: ''
      });
      
      onMeetingCreated();
    } catch (error: any) {
      onError('Failed to create meeting: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Calendar className="h-8 w-8 text-blue-600" />
        </div>
        <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Schedule Meeting</h3>
        <p className="text-gray-600 dark:text-gray-400">Create a new meeting schedule for {group.name}</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Meeting Date *
            </label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <input
                type="date"
                required
                value={formData.meeting_date}
                onChange={(e) => setFormData({ ...formData, meeting_date: e.target.value })}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Meeting Time
            </label>
            <div className="relative">
              <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <input
                type="time"
                value={formData.meeting_time}
                onChange={(e) => setFormData({ ...formData, meeting_time: e.target.value })}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Location
            </label>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <input
                type="text"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                placeholder="Enter meeting location"
                className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Topic/Agenda
            </label>
            <input
              type="text"
              value={formData.topic}
              onChange={(e) => setFormData({ ...formData, topic: e.target.value })}
              placeholder="What will be discussed?"
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Notes
            </label>
            <div className="relative">
              <FileText className="absolute left-3 top-3 text-gray-400 h-5 w-5" />
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={4}
                placeholder="Additional notes about the meeting..."
                className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>

        <div className="flex justify-center pt-4">
          <button
            type="submit"
            disabled={loading}
            className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-all duration-200 font-medium disabled:opacity-50 flex items-center gap-2"
          >
            {loading ? 'Creating...' : 'Schedule Meeting'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default MeetingCreationStep;
