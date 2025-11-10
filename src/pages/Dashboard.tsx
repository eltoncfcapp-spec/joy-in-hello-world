import { useState, useEffect } from 'react';
import { 
  Users, 
  X,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  AlertTriangle
} from 'lucide-react';
import { supabase } from '../integrations/supabase/client';
import { useAuth } from '../contexts/AuthContext';

interface UserCellGroupQueryResult {
  group_id: string;
  group_name: string;
  location: string | null;
  meeting_day: string | null;
  meeting_time: string | null;
  status: string;
  leader_name: string;
  leader_surname: string;
  leader_id: string; // ADDED: This will show us the actual leader_id
}

const Dashboard = () => {
  const { profile } = useAuth();
  const [expandedSections, setExpandedSections] = useState<{[key: string]: boolean}>({
    userGroups: true,
    diagnostics: true
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userCellGroups, setUserCellGroups] = useState<UserCellGroupQueryResult[]>([]);
  const [diagnosticInfo, setDiagnosticInfo] = useState<any>(null);

  const userFullName = profile ? `${profile.name || ''} ${profile.surname || ''}`.trim() : 'User';

  // COMPREHENSIVE DIAGNOSTIC FUNCTION
  const runDiagnostics = async () => {
    try {
      console.log('🔍 RUNNING COMPREHENSIVE DIAGNOSTICS...');
      
      const diagnostics = {
        userProfile: profile,
        allCellGroups: null,
        expectedGroups: null,
        actualLeaderIds: null,
        databaseCheck: null
      };

      // 1. Get ALL cell groups to see what's actually in the database
      const { data: allGroups, error: allGroupsError } = await supabase
        .from('cell_groups')
        .select('*')
        .order('name');

      if (!allGroupsError) {
        diagnostics.allCellGroups = allGroups;
        console.log('📋 ALL CELL GROUPS IN DATABASE:', allGroups);
      }

      // 2. Get the specific groups we expect (test2 and test3)
      const { data: expectedGroups, error: expectedError } = await supabase
        .from('cell_groups')
        .select('*')
        .in('id', ['1a90c0b8-3613-4e45-ba5b-d9871e3f915c', 'cc79b895-b7f1-4e0d-ad8b-92afef368404']);

      if (!expectedError) {
        diagnostics.expectedGroups = expectedGroups;
        console.log('🎯 EXPECTED GROUPS (test2, test3):', expectedGroups);
      }

      // 3. Get leader information for the expected groups
      if (expectedGroups && expectedGroups.length > 0) {
        const leaderIds = expectedGroups.map(g => g.leader_id).filter(Boolean);
        const { data: leaders, error: leadersError } = await supabase
          .from('members')
          .select('id, name, surname')
          .in('id', leaderIds);

        if (!leadersError) {
          diagnostics.actualLeaderIds = leaders;
          console.log('👥 ACTUAL LEADERS OF EXPECTED GROUPS:', leaders);
        }
      }

      // 4. Check if there are ANY groups with current user as leader
      const { data: userGroups, error: userGroupsError } = await supabase
        .from('cell_groups')
        .select('*')
        .eq('leader_id', profile?.id)
        .eq('status', 'active');

      if (!userGroupsError) {
        diagnostics.databaseCheck = {
          query: `leader_id = '${profile?.id}' AND status = 'active'`,
          results: userGroups,
          count: userGroups?.length || 0
        };
        console.log('🔎 GROUPS WITH CURRENT USER AS LEADER:', userGroups);
      }

      setDiagnosticInfo(diagnostics);
      return diagnostics;

    } catch (error) {
      console.error('💥 Diagnostic error:', error);
      return null;
    }
  };

  // FIXED: Fetch user cell groups with diagnostic info
  const fetchUserCellGroups = async () => {
    try {
      console.log('🔍 FETCHING USER CELL GROUPS...');
      
      // Run diagnostics first
      const diagnostics = await runDiagnostics();
      
      // Try multiple query methods to find what works

      // METHOD 1: Direct leader_id query (current approach)
      console.log('🔄 METHOD 1: Direct leader_id query');
      const { data: method1Results, error: method1Error } = await supabase
        .from('cell_groups')
        .select('*')
        .eq('leader_id', profile?.id)
        .eq('status', 'active')
        .order('name');

      console.log('METHOD 1 RESULTS:', method1Results);
      console.log('METHOD 1 ERROR:', method1Error);

      // METHOD 2: Get all active groups and filter by leader name (fallback)
      console.log('🔄 METHOD 2: Filter by leader name');
      const { data: allActiveGroups, error: method2Error } = await supabase
        .from('cell_groups')
        .select('*')
        .eq('status', 'active')
        .order('name');

      let method2Results = [];
      if (allActiveGroups) {
        // We need to get leader details for each group
        for (const group of allActiveGroups) {
          if (group.leader_id) {
            const { data: leaderData } = await supabase
              .from('members')
              .select('name, surname')
              .eq('id', group.leader_id)
              .single();

            if (leaderData && 
                leaderData.name === profile?.name && 
                leaderData.surname === profile?.surname) {
              
              method2Results.push({
                group_id: group.id,
                group_name: group.name,
                location: group.location,
                meeting_day: group.meeting_day,
                meeting_time: group.meeting_time,
                status: group.status,
                leader_name: leaderData.name,
                leader_surname: leaderData.surname,
                leader_id: group.leader_id // Include for debugging
              });
            }
          }
        }
      }
      console.log('METHOD 2 RESULTS:', method2Results);

      // Use whichever method found results
      const finalResults = method1Results && method1Results.length > 0 
        ? method1Results.map(group => ({
            group_id: group.id,
            group_name: group.name,
            location: group.location,
            meeting_day: group.meeting_day,
            meeting_time: group.meeting_time,
            status: group.status,
            leader_name: profile?.name || '',
            leader_surname: profile?.surname || '',
            leader_id: group.leader_id // Include for debugging
          }))
        : method2Results;

      console.log('🎯 FINAL RESULTS TO DISPLAY:', finalResults);
      return finalResults;

    } catch (error) {
      console.error('💥 Error in fetchUserCellGroups:', error);
      return [];
    }
  };

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      const userGroups = await fetchUserCellGroups();
      setUserCellGroups(userGroups);

    } catch (error) {
      console.error('💥 Error loading dashboard data:', error);
      setError('Failed to load dashboard data. Check console for details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (profile?.id) {
      loadDashboardData();
    }
  }, [profile?.id]);

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-6 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-6 animate-fadeIn">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
            Welcome, {userFullName}
          </h1>
          <p className="text-foreground/60">Church Management Dashboard</p>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={loadDashboardData}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Critical Alert */}
      <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
        <div className="flex items-start gap-3">
          <AlertTriangle className="h-6 w-6 text-red-600 mt-0.5 flex-shrink-0" />
          <div>
            <h3 className="font-semibold text-red-800 mb-2">Data Mismatch Detected</h3>
            <p className="text-red-700">
              SQL query returns 2 cell groups, but React app finds 0. This indicates a <strong>leader_id mismatch</strong>.
            </p>
          </div>
        </div>
      </div>

      {/* Diagnostics Section */}
      <div className="bg-orange-50 border border-orange-200 rounded-2xl p-6 mb-6">
        <button 
          onClick={() => toggleSection('diagnostics')}
          className="w-full flex justify-between items-center hover:bg-orange-100/50 transition-colors rounded-t-2xl"
        >
          <h2 className="text-xl font-bold text-orange-900">Diagnostic Information</h2>
          {expandedSections.diagnostics ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
        </button>
        
        {expandedSections.diagnostics && diagnosticInfo && (
          <div className="pt-4 space-y-6">
            {/* User Info */}
            <div className="bg-white rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 mb-3">Current User Information</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p><strong>User ID:</strong> {profile?.id}</p>
                  <p><strong>Name:</strong> {profile?.name} {profile?.surname}</p>
                  <p><strong>Role:</strong> {profile?.role}</p>
                </div>
                <div>
                  <p><strong>Expected Groups:</strong> 2 (test2, test3)</p>
                  <p><strong>Found Groups:</strong> {userCellGroups.length}</p>
                </div>
              </div>
            </div>

            {/* Database Check */}
            {diagnosticInfo.databaseCheck && (
              <div className="bg-white rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-3">Database Query Results</h3>
                <p className="text-sm mb-2"><strong>Query:</strong> {diagnosticInfo.databaseCheck.query}</p>
                <p className="text-sm mb-3"><strong>Results Found:</strong> {diagnosticInfo.databaseCheck.count}</p>
                
                {diagnosticInfo.databaseCheck.results && diagnosticInfo.databaseCheck.results.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-3 py-2">Group ID</th>
                          <th className="px-3 py-2">Name</th>
                          <th className="px-3 py-2">Leader ID</th>
                        </tr>
                      </thead>
                      <tbody>
                        {diagnosticInfo.databaseCheck.results.map((group: any) => (
                          <tr key={group.id} className="border-b">
                            <td className="px-3 py-2 font-mono text-xs">{group.id}</td>
                            <td className="px-3 py-2">{group.name}</td>
                            <td className="px-3 py-2 font-mono text-xs">{group.leader_id}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-red-600 text-sm">❌ No groups found with current user as leader</p>
                )}
              </div>
            )}

            {/* Expected Groups Info */}
            {diagnosticInfo.expectedGroups && (
              <div className="bg-white rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-3">Expected Groups (From SQL Query)</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 py-2">Group ID</th>
                        <th className="px-3 py-2">Name</th>
                        <th className="px-3 py-2">Actual Leader ID</th>
                        <th className="px-3 py-2">Matches User ID?</th>
                      </tr>
                    </thead>
                    <tbody>
                      {diagnosticInfo.expectedGroups.map((group: any) => (
                        <tr key={group.id} className="border-b">
                          <td className="px-3 py-2 font-mono text-xs">{group.id}</td>
                          <td className="px-3 py-2">{group.name}</td>
                          <td className="px-3 py-2 font-mono text-xs">{group.leader_id}</td>
                          <td className="px-3 py-2">
                            {group.leader_id === profile?.id ? (
                              <span className="text-green-600">✅ Yes</span>
                            ) : (
                              <span className="text-red-600">❌ No</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Solution */}
            <div className="bg-blue-50 rounded-lg p-4">
              <h3 className="font-semibold text-blue-900 mb-3">Solution</h3>
              <p className="text-blue-800 text-sm">
                The <strong>leader_id</strong> in your cell_groups table must match your user ID: <code className="bg-blue-100 px-1 rounded">{profile?.id}</code>
              </p>
              <p className="text-blue-800 text-sm mt-2">
                Update the leader_id for test2 and test3 groups to: <code className="bg-blue-100 px-1 rounded">{profile?.id}</code>
              </p>
            </div>
          </div>
        )}
      </div>

      {/* User's Cell Groups Section */}
      <div className="bg-white/70 backdrop-blur-xl border border-gray-200/50 rounded-2xl p-6 mb-6">
        <button 
          onClick={() => toggleSection('userGroups')}
          className="w-full flex justify-between items-center hover:bg-gray-50/50 transition-colors rounded-t-2xl"
        >
          <h2 className="text-xl font-bold text-gray-900">
            My Cell Groups ({userCellGroups.length} found)
          </h2>
          {expandedSections.userGroups ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
        </button>
        
        {expandedSections.userGroups && (
          <div className="pt-4">
            {userCellGroups.length === 0 ? (
              <div className="text-center py-8">
                <Users className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h4 className="text-lg font-semibold text-gray-600 mb-2">No Cell Groups Found</h4>
                <p className="text-gray-500">
                  Check the Diagnostic Information above to identify the issue.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left text-gray-700">
                  <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                    <tr>
                      <th className="px-4 py-3">Group ID</th>
                      <th className="px-4 py-3">Group Name</th>
                      <th className="px-4 py-3">Location</th>
                      <th className="px-4 py-3">Meeting Day</th>
                      <th className="px-4 py-3">Meeting Time</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Leader Name</th>
                      <th className="px-4 py-3">Leader ID</th>
                    </tr>
                  </thead>
                  <tbody>
                    {userCellGroups.map((group) => (
                      <tr key={group.group_id} className="bg-white border-b hover:bg-gray-50">
                        <td className="px-4 py-3 font-mono text-xs">{group.group_id}</td>
                        <td className="px-4 py-3 font-medium">{group.group_name}</td>
                        <td className="px-4 py-3">{group.location || 'N/A'}</td>
                        <td className="px-4 py-3">{group.meeting_day || 'N/A'}</td>
                        <td className="px-4 py-3">{group.meeting_time || 'N/A'}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 rounded-full text-xs ${
                            group.status === 'active' 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {group.status}
                          </span>
                        </td>
                        <td className="px-4 py-3">{group.leader_name} {group.leader_surname}</td>
                        <td className="px-4 py-3 font-mono text-xs">{group.leader_id}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
