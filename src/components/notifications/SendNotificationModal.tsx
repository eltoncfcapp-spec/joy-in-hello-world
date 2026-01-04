import { useState } from 'react';
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
  useState(() => {
    const loadData = async () => {
      const [groupsRes, deptsRes] = await Promise.all([
        supabase.from('cell_groups').select('id, name').order('name'),
        supabase.from('departments').select('id, name').order('name')
      ]);
      if (groupsRes.data) setGroups(groupsRes.data);
      if (deptsRes.data) setDepartments(deptsRes.data);
    };
    loadData();
  });

  const handleSend = async () => {
    if (!title.trim() || !body.trim()) return;

    setIsLoading(true);
    try {
      // Get subscribed members based on target
      let query = supabase
        .from('push_subscriptions')
        .select('member_id, members!inner(id, name, cell_group_id, assigned_departments)');

      if (targetType === 'group' && targetId) {
        query = query.eq('members.cell_group_id', targetId);
      } else if (targetType === 'department' && targetId) {
        query = query.contains('members.assigned_departments', [targetId]);
      }

      const { data: subscriptions } = await query;

      if (!subscriptions?.length) {
        alert('No subscribers found for the selected target.');
        setIsLoading(false);
        return;
      }

      // For browser notifications, we trigger them client-side
      // In a real scenario, you'd use a backend service
      // Here we'll use the Notification API directly for demo
      if ('Notification' in window && Notification.permission === 'granted') {
        const registration = await navigator.serviceWorker.ready;
        await registration.showNotification(title, {
          body,
          icon: '/church-icon-192.png',
          badge: '/church-icon-72.png',
          tag: `announcement-${Date.now()}`
        });
      }

      alert(`Notification sent to ${subscriptions.length} subscriber(s)!`);
      setTitle('');
      setBody('');
      onClose();
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
            <h2 className="text-lg font-semibold text-foreground">Send Notification</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-muted rounded-lg transition-colors"
          >
            <X className="h-5 w-5 text-muted-foreground" />
          </button>
        </div>

        <div className="p-4 space-y-4">
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
