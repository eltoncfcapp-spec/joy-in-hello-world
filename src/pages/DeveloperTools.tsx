import React, { useState } from 'react';
import { useAuth } from './AuthProvider';
import { supabase } from '../integrations/supabase/client';

const DeveloperTools: React.FC = () => {
  const { isDeveloper, profile, updateSupabaseData, deleteSupabaseData, logAuditAction } = useAuth();
  const [activeTab, setActiveTab] = useState<'dashboard' | 'query' | 'data' | 'audit'>('dashboard');
  const [sqlQuery, setSqlQuery] = useState('');
  const [queryResult, setQueryResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [tableData, setTableData] = useState<any>(null);
  const [selectedTable, setSelectedTable] = useState('members');
  const [auditLogs, setAuditLogs] = useState<any[]>([]);

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
      <button
        onClick={() => setActiveTab('dashboard')}
        className="bg-blue-600 text-white p-3 rounded-full shadow-lg hover:bg-blue-700"
        title="Developer Tools"
      >
        🔧 Dev
      </button>
      
      {activeTab === 'dashboard' && (
        <div className="absolute bottom-16 right-0 w-96 bg-gray-900 text-white rounded-lg shadow-xl p-4">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-bold">Developer Tools</h3>
            <button
              onClick={() => setActiveTab(null)}
              className="text-gray-400 hover:text-white"
            >
              ✕
            </button>
          </div>
          
          <div className="space-y-2">
            <button
              onClick={() => setActiveTab('data')}
              className="w-full bg-gray-800 hover:bg-gray-700 p-2 rounded text-left"
            >
              📊 Database Browser
            </button>
            <button
              onClick={() => setActiveTab('query')}
              className="w-full bg-gray-800 hover:bg-gray-700 p-2 rounded text-left"
            >
              🗄️ SQL Query Tool
            </button>
            <button
              onClick={() => setActiveTab('audit')}
              className="w-full bg-gray-800 hover:bg-gray-700 p-2 rounded text-left"
            >
              📝 Audit Logs
            </button>
            <button
              onClick={() => exportData('members')}
              className="w-full bg-gray-800 hover:bg-gray-700 p-2 rounded text-left"
            >
              💾 Export Members Data
            </button>
          </div>
        </div>
      )}

      {activeTab === 'data' && (
        <div className="absolute bottom-16 right-0 w-96 bg-gray-900 text-white rounded-lg shadow-xl p-4">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-bold">Database Browser</h3>
            <button onClick={() => setActiveTab('dashboard')} className="text-gray-400 hover:text-white">← Back</button>
          </div>
          
          <select 
            value={selectedTable}
            onChange={(e) => {
              setSelectedTable(e.target.value);
              fetchTableData(e.target.value);
            }}
            className="w-full bg-gray-800 p-2 rounded mb-4"
          >
            {tables.map(table => (
              <option key={table} value={table}>{table}</option>
            ))}
          </select>
          
          <button
            onClick={() => fetchTableData(selectedTable)}
            className="w-full bg-blue-600 hover:bg-blue-700 p-2 rounded mb-4"
            disabled={loading}
          >
            {loading ? 'Loading...' : 'Load Data'}
          </button>
          
          {tableData && (
            <div className="max-h-64 overflow-auto">
              <pre className="text-xs bg-gray-800 p-2 rounded">
                {JSON.stringify(tableData.slice(0, 5), null, 2)}
                {tableData.length > 5 && `\n...and ${tableData.length - 5} more rows`}
              </pre>
            </div>
          )}
        </div>
      )}

      {activeTab === 'query' && (
        <div className="absolute bottom-16 right-0 w-96 bg-gray-900 text-white rounded-lg shadow-xl p-4">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-bold">SQL Query Tool</h3>
            <button onClick={() => setActiveTab('dashboard')} className="text-gray-400 hover:text-white">← Back</button>
          </div>
          
          <textarea
            value={sqlQuery}
            onChange={(e) => setSqlQuery(e.target.value)}
            className="w-full h-32 bg-gray-800 p-2 rounded font-mono text-sm mb-4"
            placeholder="SELECT * FROM members LIMIT 10;"
          />
          
          <button
            onClick={executeQuery}
            className="w-full bg-green-600 hover:bg-green-700 p-2 rounded mb-4"
            disabled={loading || !sqlQuery.trim()}
          >
            {loading ? 'Executing...' : 'Execute Query'}
          </button>
          
          {queryResult && (
            <div className="max-h-64 overflow-auto">
              <pre className="text-xs bg-gray-800 p-2 rounded">
                {JSON.stringify(queryResult, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}

      {activeTab === 'audit' && (
        <div className="absolute bottom-16 right-0 w-96 bg-gray-900 text-white rounded-lg shadow-xl p-4">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-bold">Audit Logs</h3>
            <div>
              <button onClick={fetchAuditLogs} className="mr-2 text-blue-400 hover:text-blue-300">↻</button>
              <button onClick={clearAuditLogs} className="text-red-400 hover:text-red-300">Clear</button>
              <button onClick={() => setActiveTab('dashboard')} className="ml-2 text-gray-400 hover:text-white">← Back</button>
            </div>
          </div>
          
          <div className="max-h-64 overflow-auto">
            {auditLogs.map((log, index) => (
              <div key={index} className="border-b border-gray-700 py-2">
                <div className="text-xs text-gray-400">
                  {new Date(log.created_at).toLocaleString()}
                </div>
                <div className="text-sm">
                  <strong>{log.action}</strong> on {log.table_name}
                </div>
                {log.record_id && (
                  <div className="text-xs text-gray-300">
                    ID: {log.record_id.substring(0, 8)}...
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default DeveloperTools;
