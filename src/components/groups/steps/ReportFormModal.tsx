import { useState } from 'react';
import { supabase } from '../../integrations/supabase/client';
import { useAuth } from '../../contexts/AuthContext';
import { 
  X, FileText, Calendar, CheckCircle, List, Save 
} from 'lucide-react';

interface ReportFormModalProps {
  meeting?: any;
  group: any;
  onClose: () => void;
  onSuccess: (message: string) => void;
  onError: (message: string) => void;
}

const ReportFormModal: React.FC<ReportFormModalProps> = ({
  meeting,
  group,
  onClose,
  onSuccess,
  onError
}) => {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    report_text: '',
    decisions_made: '',
    action_items: '',
    next_meeting_date: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.report_text.trim()) {
      onError('Report text is required');
      return;
    }

    try {
      setLoading(true);
      const { error } = await supabase
        .from('meeting_reports')
        .insert({
          meeting_id: meeting?.id || null,
          report_text: formData.report_text,
          decisions_made: formData.decisions_made || null,
          action_items: formData.action_items || null,
          next_meeting_date: formData.next_meeting_date || null,
          created_by: profile?.id
        });

      if (error) throw error;

      setFormData({
        report_text: '',
        decisions_made: '',
        action_items: '',
        next_meeting_date: ''
      });
      
      onSuccess('Meeting report created successfully!');
      onClose();
    } catch (error: any) {
      onError('Failed to create report: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              Create Meeting Report
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              {group.name} {meeting ? `- ${new Date(meeting.meeting_date).toLocaleDateString()}` : ''}
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
        <div className="flex-1 overflow-y-auto p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {meeting && (
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
                <div className="flex items-center gap-2 text-blue-800 dark:text-blue-300">
                  <Calendar className="h-5 w-5" />
                  <span className="font-medium">
                    Reporting for: {new Date(meeting.meeting_date).toLocaleDateString()}
                    {meeting.topic && ` - ${meeting.topic}`}
                  </span>
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Meeting Summary *
              </label>
              <textarea
                value={formData.report_text}
                onChange={(e) => setFormData({ ...formData, report_text: e.target.value })}
                rows={6}
                required
                placeholder="Provide a detailed summary of what happened during the meeting, discussions held, topics covered, etc."
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  Decisions Made
                </div>
              </label>
              <textarea
                value={formData.decisions_made}
                onChange={(e) => setFormData({ ...formData, decisions_made: e.target.value })}
                rows={3}
                placeholder="List any important decisions that were made during the meeting..."
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <div className="flex items-center gap-2">
                  <List className="h-4 w-4 text-blue-600" />
                  Action Items
                </div>
              </label>
              <textarea
                value={formData.action_items}
                onChange={(e) => setFormData({ ...formData, action_items: e.target.value })}
                rows={3}
                placeholder="List action items, responsibilities, and deadlines..."
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Next Meeting Date
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                <input
                  type="date"
                  value={formData.next_meeting_date}
                  onChange={(e) => setFormData({ ...formData, next_meeting_date: e.target.value })}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            <div className="flex justify-center pt-4 gap-3">
              <button
                type="submit"
                disabled={loading}
                className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-all duration-200 font-medium disabled:opacity-50"
              >
                <Save className="h-4 w-4" />
                {loading ? 'Creating...' : 'Create Report'}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200 font-medium"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ReportFormModal;
