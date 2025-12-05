import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../integrations/supabase/client';
import { Database, Terminal, X, RefreshCw, Download, Trash2 } from 'lucide-react';

const DeveloperTools: React.FC = () => {
  const { isDeveloper, profile, updateSupabaseData, deleteSupabaseData, logAuditAction } = useAuth();
  const [activeTab, setActiveTab] = useState<'dashboard' | 'query' | 'data' | 'audit'>('dashboard');
  const [sqlQuery, setSqlQuery] = useState('');
  const [queryResult, setQueryResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [tableData, setTableData] = useState<any>(null);
  const [selectedTable, setSelectedTable] = useState('members');
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  const tables = [
    'members', 'cell_groups', 'departments', 'meetings', 'attendance',
    'department_meetings', 'group_meetings', 'events', 'event_attendees',
    'ministry_groups', 'audit_logs'
  ];

  const fetchTableData = async (table: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .limit(100);

      if (!error) {
        setTableData(data);
      } else {
        console.error('Error fetching table data:', error);
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const executeQuery = async () => {
    if (!sqlQuery.trim()) return;
    
    setLoading(true);
    try {
      // For security, you should use RPC functions instead of direct SQL
      const result = await supabase.rpc('execute_developer_query', { 
        query_text: sqlQuery 
      });
      
      setQueryResult(result);
      await logAuditAction('EXECUTE_DEV_QUERY', 'system', undefined, undefined, { query: sqlQuery });
    } catch (error) {
      console.error('Query execution error:', error);
      setQueryResult({ error: error.message });
    } finally {
      setLoading(false);
    }
  };

  const fetchAuditLogs = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (!error) {
        setAuditLogs(data || []);
      }
    } catch (error) {
      console.error('Error fetching audit logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const clearAuditLogs = async () => {
    if (window.confirm('Clear all audit logs? This cannot be undone.')) {
      try {
        await supabase.from('audit_logs').delete().neq('id', '0');
        await logAuditAction('CLEAR_AUDIT_LOGS', 'audit_logs');
        fetchAuditLogs();
      } catch (error) {
        console.error('Error clearing audit logs:', error);
      }
    }
  };

  const exportData = async (table: string) => {
    try {
      const { data, error } = await supabase
        .from(table)
        .select('*');

      if (!error && data) {
        const jsonString = JSON.stringify(data, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${table}_export_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        await logAuditAction('EXPORT_DATA', table);
      }
    } catch (error) {
      console.error('Export error:', error);
    }
  };

  if (!isDeveloper()) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {/* Floating Action Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="bg-purple-600 text-white p-3 rounded-full shadow-lg hover:bg-purple-700 transition-colors flex items-center gap-2"
        title="Developer Tools"
      >
        {isOpen ? <X className="h-5 w-5" /> : <Terminal className="h-5 w-5" />}
        <span className="hidden sm:inline">Dev Tools</span>
      </button>
      
      {/* Developer Tools Panel */}
      {isOpen && (
        <div className="absolute bottom-16 right-0 w-80 sm:w-96 bg-gray-900 text-white rounded-lg shadow-xl p-4 border border-purple-500">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-bold flex items-center gap-2">
              <Database className="h-5 w-5" />
              Developer Tools
            </h3>
            <button
              onClick={() => setIsOpen(false)}
              className="text-gray-400 hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          
          {/* Tabs */}
          <div className="flex border-b border-gray-700 mb-4">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`flex-1 py-2 text-sm font-medium ${activeTab === 'dashboard' ? 'text-purple-400 border-b-2 border-purple-400' : 'text-gray-400'}`}
            >
              Dashboard
            </button>
            <button
              onClick={() => setActiveTab('data')}
              className={`flex-1 py-2 text-sm font-medium ${activeTab === 'data' ? 'text-purple-400 border-b-2 border-purple-400' : 'text-gray-400'}`}
            >
              Data
            </button>
            <button
              onClick={() => setActiveTab('query')}
              className={`flex-1 py-2 text-sm font-medium ${activeTab === 'query' ? 'text-purple-400 border-b-2 border-purple-400' : 'text-gray-400'}`}
            >
              SQL
            </button>
            <button
              onClick={() => setActiveTab('audit')}
              className={`flex-1 py-2 text-sm font-medium ${activeTab === 'audit' ? 'text-purple-400 border-b-2 border-purple-400' : 'text-gray-400'}`}
            >
              Audit
            </button>
          </div>
          
          {/* Dashboard Tab */}
          {activeTab === 'dashboard' && (
            <div className="space-y-3">
              <div className="bg-gray-800 p-3 rounded">
                <div className="text-sm text-gray-400">Developer</div>
                <div className="font-medium">{profile?.name} {profile?.surname}</div>
                <div className="text-xs text-purple-400">{profile?.phone}</div>
              </div>
              
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => {
                    setActiveTab('data');
                    fetchTableData('members');
                  }}
                  className="bg-gray-800 hover:bg-gray-700 p-3 rounded text-left"
                >
                  <div className="text-sm">Database</div>
                  <div className="text-xs text-gray-400">Browse tables</div>
                </button>
                <button
                  onClick={() => setActiveTab('query')}
                  className="bg-gray-800 hover:bg-gray-700 p-3 rounded text-left"
                >
                  <div className="text-sm">SQL Query</div>
                  <div className="text-xs text-gray-400">Execute queries</div>
                </button>
                <button
                  onClick={() => {
                    setActiveTab('audit');
                    fetchAuditLogs();
                  }}
                  className="bg-gray-800 hover:bg-gray-700 p-3 rounded text-left"
                >
                  <div className="text-sm">Audit Logs</div>
                  <div className="text-xs text-gray-400">View activities</div>
                </button>
                <button
                  onClick={() => exportData('members')}
                  className="bg-gray-800 hover:bg-gray-700 p-3 rounded text-left"
                >
                  <div className="text-sm">Export Data</div>
                  <div className="text-xs text-gray-400">JSON export</div>
                </button>
              </div>
            </div>
          )}
          
          {/* Data Browser Tab */}
          {activeTab === 'data' && (
            <div>
              <select 
                value={selectedTable}
                onChange={(e) => {
                  setSelectedTable(e.target.value);
                  fetchTableData(e.target.value);
                }}
                className="w-full bg-gray-800 p-2 rounded mb-3 text-sm"
              >
                {tables.map(table => (
                  <option key={table} value={table}>{table}</option>
                ))}
              </select>
              
              <button
                onClick={() => fetchTableData(selectedTable)}
                className="w-full bg-purple-600 hover:bg-purple-700 p-2 rounded mb-3 flex items-center justify-center gap-2"
                disabled={loading}
              >
                {loading ? 'Loading...' : (
                  <>
                    <RefreshCw className="h-4 w-4" />
                    Load Data
                  </>
                )}
              </button>
              
              {tableData && (
                <div className="max-h-64 overflow-auto">
                  <div className="text-xs text-gray-400 mb-2">
                    Showing {Math.min(tableData.length, 5)} of {tableData.length} rows
                  </div>
                  <pre className="text-xs bg-gray-800 p-2 rounded overflow-x-auto">
                    {JSON.stringify(tableData.slice(0, 5), null, 2)}
                    {tableData.length > 5 && `\n...and ${tableData.length - 5} more rows`}
                  </pre>
                  <button
                    onClick={() => exportData(selectedTable)}
                    className="w-full mt-2 bg-gray-800 hover:bg-gray-700 p-2 rounded flex items-center justify-center gap-2 text-sm"
                  >
                    <Download className="h-4 w-4" />
                    Export {selectedTable}
                  </button>
                </div>
              )}
            </div>
          )}
          
          {/* SQL Query Tab */}
          {activeTab === 'query' && (
            <div>
              <div className="text-xs text-gray-400 mb-2">
                Use with caution. Only SELECT queries recommended.
              </div>
              <textarea
                value={sqlQuery}
                onChange={(e) => setSqlQuery(e.target.value)}
                className="w-full h-32 bg-gray-800 p-2 rounded font-mono text-sm mb-3"
                placeholder="SELECT * FROM members LIMIT 10;"
              />
              
              <button
                onClick={executeQuery}
                className="w-full bg-green-600 hover:bg-green-700 p-2 rounded mb-3"
                disabled={loading || !sqlQuery.trim()}
              >
                {loading ? 'Executing...' : 'Execute Query'}
              </button>
              
              {queryResult && (
                <div className="max-h-64 overflow-auto">
                  <pre className="text-xs bg-gray-800 p-2 rounded overflow-x-auto">
                    {JSON.stringify(queryResult, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}
          
          {/* Audit Logs Tab */}
          {activeTab === 'audit' && (
            <div>
              <div className="flex gap-2 mb-3">
                <button
                  onClick={fetchAuditLogs}
                  className="flex-1 bg-gray-800 hover:bg-gray-700 p-2 rounded flex items-center justify-center gap-2"
                >
                  <RefreshCw className="h-4 w-4" />
                  Refresh
                </button>
                <button
                  onClick={clearAuditLogs}
                  className="bg-red-600 hover:bg-red-700 p-2 rounded flex items-center gap-2"
                  title="Clear all logs"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              
              <div className="max-h-64 overflow-auto">
                {auditLogs.length === 0 ? (
                  <div className="text-center text-gray-400 py-4">
                    No audit logs found
                  </div>
                ) : (
                  auditLogs.map((log, index) => (
                    <div key={index} className="border-b border-gray-700 py-2">
                      <div className="text-xs text-gray-400">
                        {new Date(log.created_at).toLocaleString()}
                      </div>
                      <div className="text-sm">
                        <span className="font-medium">{log.action}</span> on {log.table_name}
                      </div>
                      {log.record_id && (
                        <div className="text-xs text-gray-300">
                          ID: {log.record_id?.substring(0, 8)}...
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default DeveloperTools;
