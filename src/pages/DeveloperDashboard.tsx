import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../integrations/supabase/client';
import { 
  Database, 
  Users, 
  Building, 
  Calendar, 
  TrendingUp, 
  Shield,
  Download,
  RefreshCw,
  Trash2,
  Eye,
  EyeOff
} from 'lucide-react';

const DeveloperDashboard: React.FC = () => {
  const { isDeveloper, profile, logAuditAction } = useAuth();
  const [systemStats, setSystemStats] = useState<any>(null);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [hiddenUsers, setHiddenUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSensitiveData, setShowSensitiveData] = useState(false);

  useEffect(() => {
    if (isDeveloper()) {
      fetchSystemStats();
      fetchAuditLogs();
      fetchHiddenUsers();
    }
  }, [isDeveloper]);

  const fetchSystemStats = async () => {
    try {
      const [
        { count: membersCount },
        { count: groupsCount },
        { count: departmentsCount },
        { count: meetingsCount },
        { count: attendanceCount },
        { count: eventsCount }
      ] = await Promise.all([
        supabase.from('members').select('*', { count: 'exact', head: true }),
        supabase.from('cell_groups').select('*', { count: 'exact', head: true }),
        supabase.from('departments').select('*', { count: 'exact', head: true }),
        supabase.from('meetings').select('*', { count: 'exact', head: true }),
        supabase.from('attendance').select('*', { count: 'exact', head: true }),
        supabase.from('events').select('*', { count: 'exact', head: true })
      ]);

      setSystemStats({
        members: membersCount || 0,
        groups: groupsCount || 0,
        departments: departmentsCount || 0,
        meetings: meetingsCount || 0,
        attendance: attendanceCount || 0,
        events: eventsCount || 0
      });
    } catch (error) {
      console.error('Error fetching system stats:', error);
    }
  };

  const fetchAuditLogs = async () => {
    try {
      const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (!error && data) {
        setAuditLogs(data);
      }
    } catch (error) {
      console.error('Error fetching audit logs:', error);
    }
  };

  const fetchHiddenUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('members')
        .select('*')
        .eq('is_hidden', true)
        .order('created_at', { ascending: false });

      if (!error && data) {
        setHiddenUsers(data);
      }
    } catch (error) {
      console.error('Error fetching hidden users:', error);
    } finally {
      setLoading(false);
    }
  };

  const clearAuditLogs = async () => {
    if (!window.confirm('Are you sure you want to clear all audit logs?')) return;
    
    try {
      await supabase.from('audit_logs').delete().gt('id', '0');
      await logAuditAction('CLEAR_AUDIT_LOGS', 'audit_logs');
      fetchAuditLogs();
    } catch (error) {
      console.error('Error clearing audit logs:', error);
    }
  };

  const exportAllData = async () => {
    try {
      const tables = ['members', 'cell_groups', 'departments', 'meetings', 'attendance', 'events'];
      const allData: Record<string, any[]> = {};
      
      for (const table of tables) {
        const { data, error } = await supabase.from(table).select('*');
        if (!error && data) {
          allData[table] = data;
        }
      }
      
      const jsonString = JSON.stringify(allData, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `church_system_backup_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      await logAuditAction('EXPORT_ALL_DATA', 'system');
    } catch (error) {
      console.error('Export error:', error);
    }
  };

  const refreshAll = () => {
    setLoading(true);
    fetchSystemStats();
    fetchAuditLogs();
    fetchHiddenUsers();
  };

  if (!isDeveloper()) {
    return (
      <div className="p-6">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          <p>Access denied. This page is only accessible to developers.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Shield className="h-8 w-8 text-purple-600" />
              Developer Dashboard
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              System administration and monitoring for {profile?.name} {profile?.surname}
            </p>
          </div>
          <div className="flex gap-3 mt-4 md:mt-0">
            <button
              onClick={refreshAll}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh All
            </button>
            <button
              onClick={exportAllData}
              className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg"
            >
              <Download className="h-4 w-4" />
              Backup All
            </button>
          </div>
        </div>

        {/* Developer Info Card */}
        <div className="bg-gradient-to-r from-purple-600 to-purple-800 text-white rounded-xl p-6 mb-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
            <div>
              <h2 className="text-xl font-bold">Developer Account</h2>
              <p className="text-purple-200 mt-1">Elton Niati - 0659132527</p>
              <p className="text-purple-200 text-sm mt-2">
                This account has full system access and is hidden from regular users.
              </p>
            </div>
            <button
              onClick={() => setShowSensitiveData(!showSensitiveData)}
              className="mt-4 md:mt-0 flex items-center gap-2 bg-purple-500 hover:bg-purple-400 px-4 py-2 rounded-lg"
            >
              {showSensitiveData ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              {showSensitiveData ? 'Hide Sensitive Data' : 'Show Sensitive Data'}
            </button>
          </div>
        </div>

        {/* System Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {systemStats && Object.entries(systemStats).map(([key, value]) => (
            <div key={key} className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400 capitalize">
                    {key.replace('_', ' ')}
                  </p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white mt-2">
                    {value}
                  </p>
                </div>
                <div className="bg-blue-100 dark:bg-blue-900 p-3 rounded-lg">
                  {key === 'members' && <Users className="h-6 w-6 text-blue-600" />}
                  {key === 'groups' && <Users className="h-6 w-6 text-blue-600" />}
                  {key === 'departments' && <Building className="h-6 w-6 text-blue-600" />}
                  {key === 'meetings' && <Calendar className="h-6 w-6 text-blue-600" />}
                  {key === 'attendance' && <TrendingUp className="h-6 w-6 text-blue-600" />}
                  {key === 'events' && <Calendar className="h-6 w-6 text-blue-600" />}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Hidden Users Section */}
        {showSensitiveData && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow mb-8">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <EyeOff className="h-5 w-5 text-red-600" />
                Hidden Users ({hiddenUsers.length})
              </h2>
            </div>
            <div className="p-6">
              {loading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                </div>
              ) : hiddenUsers.length === 0 ? (
                <p className="text-gray-500 dark:text-gray-400 text-center py-8">
                  No hidden users found
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200 dark:border-gray-700">
                        <th className="text-left py-3 px-4 text-sm font-medium text-gray-600 dark:text-gray-400">Name</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-gray-600 dark:text-gray-400">Role</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-gray-600 dark:text-gray-400">Username</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-gray-600 dark:text-gray-400">Created</th>
                      </tr>
                    </thead>
                    <tbody>
                      {hiddenUsers.map((user) => (
                        <tr key={user.id} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700">
                          <td className="py-3 px-4">
                            <div className="font-medium">{user.name} {user.surname}</div>
                            {user.is_developer && (
                              <span className="text-xs bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 px-2 py-1 rounded">
                                Developer
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            <span className="text-sm">{user.admin_role || 'member'}</span>
                          </td>
                          <td className="py-3 px-4">
                            <code className="text-sm bg-gray-100 dark:bg-gray-900 px-2 py-1 rounded">
                              {user.login_username}
                            </code>
                          </td>
                          <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400">
                            {new Date(user.created_at).toLocaleDateString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Audit Logs Section */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Database className="h-5 w-5 text-blue-600" />
              Recent Audit Logs ({auditLogs.length})
            </h2>
            <button
              onClick={clearAuditLogs}
              className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm"
            >
              <Trash2 className="h-4 w-4" />
              Clear All
            </button>
          </div>
          <div className="p-6">
            {auditLogs.length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400 text-center py-8">
                No audit logs found
              </p>
            ) : (
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {auditLogs.map((log) => (
                  <div key={log.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-700">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{log.action}</span>
                          <span className="text-sm text-gray-600 dark:text-gray-400">on</span>
                          <code className="text-sm bg-gray-100 dark:bg-gray-900 px-2 py-1 rounded">
                            {log.table_name}
                          </code>
                        </div>
                        {log.record_id && (
                          <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                            Record ID: <code className="bg-gray-100 dark:bg-gray-900 px-2 py-1 rounded text-xs">
                              {log.record_id.substring(0, 8)}...
                            </code>
                          </div>
                        )}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {new Date(log.created_at).toLocaleString()}
                      </div>
                    </div>
                    {showSensitiveData && (log.old_data || log.new_data) && (
                      <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
                        {log.old_data && (
                          <div>
                            <div className="text-xs text-gray-500 mb-1">Old Data:</div>
                            <pre className="text-xs bg-gray-100 dark:bg-gray-900 p-2 rounded overflow-x-auto">
                              {JSON.stringify(log.old_data, null, 2)}
                            </pre>
                          </div>
                        )}
                        {log.new_data && (
                          <div>
                            <div className="text-xs text-gray-500 mb-1">New Data:</div>
                            <pre className="text-xs bg-gray-100 dark:bg-gray-900 p-2 rounded overflow-x-auto">
                              {JSON.stringify(log.new_data, null, 2)}
                            </pre>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-4 gap-4">
          <button
            onClick={() => fetchSystemStats()}
            className="bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 p-4 rounded-xl text-left"
          >
            <div className="font-medium">Refresh Stats</div>
            <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Update system statistics
            </div>
          </button>
          <button
            onClick={() => fetchAuditLogs()}
            className="bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 p-4 rounded-xl text-left"
          >
            <div className="font-medium">Refresh Logs</div>
            <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Load latest audit logs
            </div>
          </button>
          <button
            onClick={() => fetchHiddenUsers()}
            className="bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 p-4 rounded-xl text-left"
          >
            <div className="font-medium">Check Hidden Users</div>
            <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Review hidden accounts
            </div>
          </button>
          <button
            onClick={() => window.open('/developer-tools', '_blank')}
            className="bg-purple-100 dark:bg-purple-900 hover:bg-purple-200 dark:hover:bg-purple-800 p-4 rounded-xl text-left"
          >
            <div className="font-medium text-purple-800 dark:text-purple-200">Open Tools</div>
            <div className="text-sm text-purple-600 dark:text-purple-400 mt-1">
              Access developer tools
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeveloperDashboard;
