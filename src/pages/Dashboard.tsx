import { useState, useEffect } from 'react';
import { 
  Users, 
  X,
  ChevronDown,
  ChevronUp,
  RefreshCw
} from 'lucide-react';
import { supabase } from '../integrations/supabase/client';
import { useAuth } from '../contexts/AuthContext';

// Interface for the SQL query result
interface UserCellGroupQueryResult {
  group_id: string;
  group_name: string;
  location: string | null;
  meeting_day: string | null;
  meeting_time: string | null;
  status: string;
  leader_name: string;
  leader_surname: string;
}

const Dashboard = () => {
  const { profile } = useAuth();
  const [expandedSections, setExpandedSections] = useState<{[key: string]: boolean}>({
    userGroups: true
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // State for the SQL query results
  const [userCellGroups, setUserCellGroups] = useState<UserCellGroupQueryResult[]>([]);

  // Get user's full name
  const userFullName = profile ? `${profile.name || ''} ${profile.surname || ''}`.trim() : 'User';

  // FIXED: Simple and reliable approach
  const fetchUserCellGroups = async () => {
    try {
      if (!profile?.id) {
        console.log('No user profile ID available');
        return [];
      }

      console.log('🔍 Fetching cell groups for user ID:', profile.id);
      console.log('👤 User details:', { 
        name: profile.name, 
        surname: profile.surname, 
        id: profile.id 
      });

      // METHOD 1: Direct query using the user's ID as leader_id
      const { data: cellGroups, error: groupsError } = await supabase
        .from('cell_groups')
        .select('*')
        .eq('leader_id', profile.id)
        .eq('status', 'active')
        .order('name');

      if (groupsError) {
        console.error('❌ Error fetching cell groups:', groupsError);
        return [];
      }

      console.log('✅ Found cell groups directly:', cellGroups);

      // Transform to the expected format
      const userGroups: UserCellGroupQueryResult[] = (cellGroups || []).map(group => ({
        group_id: group.id,
        group_name: group.name,
        location: group.location,
        meeting_day: group.meeting_day,
        meeting_time: group.meeting_time,
        status: group.status || 'active',
        leader_name: profile.name || '',
        leader_surname: profile.surname || ''
      }));

      console.log('📊 Transformed user groups:', userGroups);
      return userGroups;

    } catch (error) {
      console.error('💥 Error in fetchUserCellGroups:', error);
      return [];
    }
  };

  // Load dashboard data
  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('🔄 Starting data load...');

      const userGroups = await fetchUserCellGroups();
      console.log('🎉 Final results to display:', userGroups);
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
      console.log('🏁 Profile loaded, starting data fetch...');
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
          <p className="text-foreground/60">
            Welcome to your church management dashboard
          </p>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={loadDashboardData}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            {loading ? 'Refreshing...' : 'Refresh Data'}
          </button>
          <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center text-white font-semibold">
            {profile?.name?.charAt(0)}{profile?.surname?.charAt(0) || 'U'}
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
          <div className="flex items-center justify-between">
            <p className="text-red-700 font-medium">{error}</p>
            <button onClick={() => setError(null)} className="text-red-500 hover:text-red-700">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Debug Info */}
      <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-6">
        <h3 className="font-semibold text-green-800 mb-3">User Information:</h3>
        <div className="text-green-700 text-sm space-y-2">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p><strong>Name:</strong> {profile?.name} {profile?.surname}</p>
              <p><strong>Role:</strong> {profile?.role}</p>
              <p><strong>User ID:</strong> {profile?.id}</p>
            </div>
            <div>
              <p><strong>Expected Results:</strong> 2 cell groups</p>
              <p><strong>Actual Results:</strong> {userCellGroups.length} cell groups</p>
              <p><strong>Query Method:</strong> Direct leader_id lookup</p>
            </div>
          </div>
        </div>
      </div>

      {/* Expected Results Section */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6 mb-6">
        <h3 className="text-xl font-bold text-yellow-800 mb-4">Expected Results from SQL Query</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left text-yellow-900">
            <thead className="text-xs text-yellow-800 uppercase bg-yellow-100">
              <tr>
                <th className="px-4 py-3">Group ID</th>
                <th className="px-4 py-3">Group Name</th>
                <th className="px-4 py-3">Location</th>
                <th className="px-4 py-3">Meeting Day</th>
                <th className="px-4 py-3">Meeting Time</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Leader Name</th>
                <th className="px-4 py-3">Leader Surname</th>
              </tr>
            </thead>
            <tbody>
              <tr className="bg-yellow-50/50 border-b border-yellow-200">
                <td className="px-4 py-3 font-mono text-xs">cc79b895-b7f1-4e0d-ad8b-92afef368404</td>
                <td className="px-4 py-3 font-medium">test3</td>
                <td className="px-4 py-3">test3</td>
                <td className="px-4 py-3">Saturday</td>
                <td className="px-4 py-3">19:20</td>
                <td className="px-4 py-3">
                  <span className="px-2 py-1 rounded-full text-xs bg-green-100 text-green-800">
                    active
                  </span>
                </td>
                <td className="px-4 py-3">Elton</td>
                <td className="px-4 py-3">Niati</td>
              </tr>
              <tr className="bg-yellow-50/50 border-b border-yellow-200">
                <td className="px-4 py-3 font-mono text-xs">1a90c0b8-3613-4e45-ba5b-d9871e3f915c</td>
                <td className="px-4 py-3 font-medium">test2</td>
                <td className="px-4 py-3">t</td>
                <td className="px-4 py-3">Sunday</td>
                <td className="px-4 py-3">08:52</td>
                <td className="px-4 py-3">
                  <span className="px-2 py-1 rounded-full text-xs bg-green-100 text-green-800">
                    active
                  </span>
                </td>
                <td className="px-4 py-3">Elton</td>
                <td className="px-4 py-3">Niati</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="text-yellow-700 text-sm mt-3">
          <strong>Note:</strong> These are the expected results that should appear below when the query works correctly.
        </p>
      </div>

      {/* User's Cell Groups Section */}
      <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-6 mb-6 hover:shadow-lg transition-all duration-300">
        <button 
          onClick={() => toggleSection('userGroups')}
          className="w-full flex justify-between items-center hover:bg-gray-50/50 dark:hover:bg-gray-700/30 transition-colors rounded-t-2xl"
        >
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            My Cell Groups ({userCellGroups.length} found)
          </h2>
          {expandedSections.userGroups ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
        </button>
        
        {expandedSections.userGroups && (
          <div className="pt-4">
            {/* SQL Query Display */}
            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4 mb-6">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Current Query Being Executed:</h3>
              <code className="bg-gray-100 dark:bg-gray-600 p-3 rounded text-sm block overflow-x-auto">
                {`const { data: cellGroups, error } = await supabase
  .from('cell_groups')
  .select('*')
  .eq('leader_id', '${profile?.id}')
  .eq('status', 'active')
  .order('name');`}
              </code>
              <p className="text-gray-600 dark:text-gray-400 text-sm mt-2">
                This query searches for cell groups where your user ID ({profile?.id}) is the leader_id.
              </p>
            </div>

            {/* Results */}
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-4">
                Actual Query Results
              </h3>

              {userCellGroups.length === 0 ? (
                <div className="text-center py-8">
                  <Users className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <h4 className="text-lg font-semibold text-gray-600 dark:text-gray-400 mb-2">No Cell Groups Found</h4>
                  <p className="text-gray-500 dark:text-gray-500 mb-4">
                    No active cell groups found where you are the designated leader.
                  </p>
                  <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 max-w-md mx-auto">
                    <h5 className="font-semibold text-orange-800 mb-2">Troubleshooting:</h5>
                    <ul className="text-orange-700 text-sm text-left space-y-1">
                      <li>• Check if your user ID matches the leader_id in cell_groups table</li>
                      <li>• Verify the cell groups have status = 'active'</li>
                      <li>• Check browser console for detailed error messages</li>
                    </ul>
                  </div>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left text-gray-700 dark:text-gray-300">
                    <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-300">
                      <tr>
                        <th className="px-4 py-3">Group ID</th>
                        <th className="px-4 py-3">Group Name</th>
                        <th className="px-4 py-3">Location</th>
                        <th className="px-4 py-3">Meeting Day</th>
                        <th className="px-4 py-3">Meeting Time</th>
                        <th className="px-4 py-3">Status</th>
                        <th className="px-4 py-3">Leader Name</th>
                        <th className="px-4 py-3">Leader Surname</th>
                      </tr>
                    </thead>
                    <tbody>
                      {userCellGroups.map((group) => (
                        <tr key={group.group_id} className="bg-white dark:bg-gray-800 border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600">
                          <td className="px-4 py-3 font-mono text-xs">{group.group_id}</td>
                          <td className="px-4 py-3 font-medium">{group.group_name}</td>
                          <td className="px-4 py-3">{group.location || 'N/A'}</td>
                          <td className="px-4 py-3">{group.meeting_day || 'N/A'}</td>
                          <td className="px-4 py-3">{group.meeting_time || 'N/A'}</td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-1 rounded-full text-xs ${
                              group.status === 'active' 
                                ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
                                : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                            }`}>
                              {group.status}
                            </span>
                          </td>
                          <td className="px-4 py-3">{group.leader_name}</td>
                          <td className="px-4 py-3">{group.leader_surname}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
