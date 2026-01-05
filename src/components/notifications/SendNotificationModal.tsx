import { useState, useEffect } from 'react';
import { X, Send, Bell, Users, Calendar } from 'lucide-react';
import { supabase } from '../../integrations/supabase/client';

interface SendNotificationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SendNotificationModal({ isOpen, onClose }: SendNotificationModalProps) {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [targetType, setTargetType] = useState<'all' | 'group' | 'department'>('all');
  const [targetId, setTargetId] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [groups, setGroups] = useState<{ id: string; name: string }[]>([]);
  const [departments, setDepartments] = useState<{ id: string; name: string }[]>([]);

  // Load groups and departments on mount
  useEffect(() => {
    const loadData = async () => {
      const [groupsRes, deptsRes] = await Promise.all([
        supabase.from('cell_groups').select('id, name').order('name'),
        supabase.from('departments').select('id, name').order('name')
      ]);
      if (groupsRes.data) setGroups(groupsRes.data);
      if (deptsRes.data) setDepartments(deptsRes.data);
    };
    loadData();
  }, []);

  const handleSend = async () => {
    if (!title.trim() || !body.trim()) return;

    setIsLoading(true);
    try {
      // Call the edge function to send push notifications
      const { data, error } = await supabase.functions.invoke('send-push-notification', {
        body: {
          title,
          body,
          targetType,
          targetId: targetType !== 'all' ? targetId : undefined,
          url: '/'
        }
      });

      if (error) throw error;

      const result = data as { success: boolean; sent: number; failed: number; total: number; message?: string };
      
      if (result.success) {
        if (result.sent > 0) {
          alert(`Notification sent to ${result.sent} subscriber(s)!`);
        } else {
          alert(result.message || 'No subscribers found for the selected target.');
        }
        setTitle('');
        setBody('');
        onClose();
      } else {
        throw new Error('Failed to send notification');
      }
    } catch (error) {
      console.error('Error sending notification:', error);
      alert('Failed to send notification. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-card rounded-xl shadow-xl max-w-md w-full border border-border">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold text-foreground">Send Push Notification</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-muted rounded-lg transition-colors"
          >
            <X className="h-5 w-5 text-muted-foreground" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* Info Banner */}
          <div className="bg-primary/10 text-primary text-sm p-3 rounded-lg">
            📲 Notifications will be delivered even when the app is closed!
          </div>

          {/* Target Selection */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Send To
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => { setTargetType('all'); setTargetId(''); }}
                className={`p-2 rounded-lg border text-sm font-medium transition-colors ${
                  targetType === 'all'
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-background border-border hover:bg-muted'
                }`}
              >
                <Users className="h-4 w-4 mx-auto mb-1" />
                All
              </button>
              <button
                onClick={() => setTargetType('group')}
                className={`p-2 rounded-lg border text-sm font-medium transition-colors ${
                  targetType === 'group'
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-background border-border hover:bg-muted'
                }`}
              >
                <Users className="h-4 w-4 mx-auto mb-1" />
                Group
              </button>
              <button
                onClick={() => setTargetType('department')}
                className={`p-2 rounded-lg border text-sm font-medium transition-colors ${
                  targetType === 'department'
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-background border-border hover:bg-muted'
                }`}
              >
                <Calendar className="h-4 w-4 mx-auto mb-1" />
                Dept
              </button>
            </div>
          </div>

          {/* Group/Department Selector */}
          {targetType !== 'all' && (
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Select {targetType === 'group' ? 'Cell Group' : 'Department'}
              </label>
              <select
                value={targetId}
                onChange={(e) => setTargetId(e.target.value)}
                className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
              >
                <option value="">Select...</option>
                {(targetType === 'group' ? groups : departments).map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Notification title..."
              className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
            />
          </div>

          {/* Body */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Message
            </label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Notification message..."
              rows={3}
              className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary resize-none"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 p-4 border-t border-border">
          <button
            onClick={onClose}
            className="px-4 py-2 text-muted-foreground hover:bg-muted rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSend}
            disabled={!title.trim() || !body.trim() || isLoading}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <>
                <span className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Send className="h-4 w-4" />
                Send
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
