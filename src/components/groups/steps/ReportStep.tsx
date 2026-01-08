import { useState } from 'react';
import { supabase } from '../../../integrations/supabase/client';
import { useAuth } from '../../../contexts/AuthContext';
import { useNotifications } from '../../../hooks/useNotifications';
import { FileText, Calendar, CheckCircle, List } from 'lucide-react';

interface ReportStepProps {
  group: any;
  selectedMeeting: any;
  onReportCreated: () => void;
  onError: (message: string) => void;
}

const ReportStep: React.FC<ReportStepProps> = ({
  group,
  selectedMeeting,
  onReportCreated,
  onError
}) => {
  const { profile } = useAuth();
  const { sendLocalNotification, permission } = useNotifications();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    report_text: '',
    decisions_made: '',
    action_items: '',
    next_meeting_date: ''
  });

  const sendReportNotification = async () => {
    // Send local notification - simple message
    if (permission === 'granted') {
      await sendLocalNotification(`${group?.name || 'Group'} Report Finalized`, {
        body: 'Meeting report has been submitted.',
        tag: `report-${selectedMeeting?.id}`,
        data: { url: '/groups' }
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.report_text.trim()) {
      onError('Report text is required');
      return;
    }

    if (!selectedMeeting) {
      onError('Please select a meeting first');
      return;
    }

    try {
      setLoading(true);
      const { error } = await supabase
        .from('meeting_reports')
        .insert({
          meeting_id: selectedMeeting.id,
          report_text: formData.report_text,
          decisions_made: formData.decisions_made || null,
          action_items: formData.action_items || null,
          next_meeting_date: formData.next_meeting_date || null,
          created_by: profile?.id
        });

      if (error) throw error;

      // Send notification about the new report
      await sendReportNotification();

      setFormData({
        report_text: '',
        decisions_made: '',
        action_items: '',
        next_meeting_date: ''
      });
      
      onReportCreated();
    } catch (error: any) {
      onError('Failed to create report: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <FileText className="h-8 w-8 text-orange-600" />
        </div>
        <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Create Meeting Report</h3>
        <p className="text-gray-600 dark:text-gray-400">
          {selectedMeeting 
            ? `Generate report for meeting on ${new Date(selectedMeeting.meeting_date).toLocaleDateString()}`
            : 'Create a comprehensive meeting report'
          }
        </p>
      </div>

      {!selectedMeeting && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-6">
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-yellow-600" />
            <p className="text-yellow-700">
              Please complete the previous steps and select a meeting to create a report.
            </p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {selectedMeeting && (
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
            <div className="flex items-center gap-2 text-blue-800 dark:text-blue-300">
              <Calendar className="h-5 w-5" />
              <span className="font-medium">
                Reporting for: {new Date(selectedMeeting.meeting_date).toLocaleDateString()}
                {selectedMeeting.topic && ` - ${selectedMeeting.topic}`}
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

        <div className="flex justify-center pt-4">
          <button
            type="submit"
            disabled={loading || !selectedMeeting}
            className="px-8 py-3 bg-orange-600 hover:bg-orange-700 text-white rounded-xl transition-all duration-200 font-medium disabled:opacity-50 flex items-center gap-2"
          >
            <FileText className="h-4 w-4" />
            {loading ? 'Creating...' : 'Create Report'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ReportStep;
