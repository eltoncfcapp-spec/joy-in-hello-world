import { useState, useEffect } from 'react';
import { supabase } from '../../../integrations/supabase/client';
import { Calendar, MapPin, Clock, FileText, Save } from 'lucide-react';

interface DepartmentMeetingCreationStepProps {
  department: any;
  onMeetingCreated: () => void;
  onError: (message: string) => void;
}

const DepartmentMeetingCreationStep: React.FC<DepartmentMeetingCreationStepProps> = ({
  department,
  onMeetingCreated,
  onError
}) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    meeting_date: '',
    meeting_time: '',
    location: department.location || '',
    topic: '',
    notes: ''
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const createMeeting = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.meeting_date || !formData.meeting_time || !formData.location) {
      onError('Please fill in all required fields');
      return;
    }

    try {
      setLoading(true);

      const { error } = await supabase
        .from('department_meetings')
        .insert([{
          department_id: department.id,
          meeting_date: formData.meeting_date,
          meeting_time: formData.meeting_time,
          location: formData.location,
          topic: formData.topic || null,
          notes: formData.notes || null,
          status: 'scheduled'
        }]);

      if (error) throw error;

      // Reset form
      setFormData({
        meeting_date: '',
        meeting_time: '',
        location: department.location || '',
        topic: '',
        notes: ''
      });

      onMeetingCreated();
    } catch (error: any) {
      onError('Failed to create department meeting: ' + error.message);
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
        <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Schedule Department Meeting</h3>
        <p className="text-gray-600 dark:text-gray-400">
          Create a new meeting schedule for {department.name}
        </p>
      </div>

      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-6">
        <form onSubmit={createMeeting} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Meeting Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Meeting Date *
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="date"
                  name="meeting_date"
                  value={formData.meeting_date}
                  onChange={handleInputChange}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
            </div>

            {/* Meeting Time */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Meeting Time *
              </label>
              <div className="relative">
                <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="time"
                  name="meeting_time"
                  value={formData.meeting_time}
                  onChange={handleInputChange}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
            </div>
          </div>

          {/* Location */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Location *
            </label>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                name="location"
                value={formData.location}
                onChange={handleInputChange}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter meeting location"
                required
              />
            </div>
          </div>

          {/* Topic */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Meeting Topic/Agenda
            </label>
            <input
              type="text"
              name="topic"
              value={formData.topic}
              onChange={handleInputChange}
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="What will be discussed in this meeting?"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Additional Notes
            </label>
            <div className="relative">
              <FileText className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleInputChange}
                rows={4}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Any additional information about this meeting..."
              />
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 font-medium"
            >
              <Save className="h-4 w-4" />
              {loading ? 'Creating Meeting...' : 'Schedule Department Meeting'}
            </button>
          </div>
        </form>
      </div>

      {/* Recent Meetings Preview */}
      <div className="mt-8">
        <RecentDepartmentMeetings departmentId={department.id} />
      </div>
    </div>
  );
};

// Component to show recent meetings
const RecentDepartmentMeetings: React.FC<{ departmentId: string }> = ({ departmentId }) => {
  const [meetings, setMeetings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRecentMeetings();
  }, [departmentId]);

  const loadRecentMeetings = async () => {
    try {
      const { data, error } = await supabase
        .from('department_meetings')
        .select('*')
        .eq('department_id', departmentId)
        .order('meeting_date', { ascending: false })
        .limit(5);

      if (error) throw error;
      setMeetings(data || []);
    } catch (error) {
      console.error('Failed to load recent meetings:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-6">
        <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Recent Meetings</h4>
        <div className="animate-pulse space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-12 bg-gray-200 dark:bg-gray-700 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-6">
      <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Recent Department Meetings</h4>
      
      {meetings.length === 0 ? (
        <p className="text-gray-500 dark:text-gray-400 text-center py-4">No meetings scheduled yet</p>
      ) : (
        <div className="space-y-3">
          {meetings.map((meeting) => (
            <div key={meeting.id} className="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-600 rounded-lg">
              <div className="flex-1">
                <div className="font-medium text-gray-900 dark:text-white">
                  {new Date(meeting.meeting_date).toLocaleDateString()} at {meeting.meeting_time}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  {meeting.topic || 'No topic specified'} • {meeting.location}
                </div>
              </div>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                meeting.status === 'completed' 
                  ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                  : meeting.status === 'cancelled'
                  ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                  : 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
              }`}>
                {meeting.status}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default DepartmentMeetingCreationStep;
