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

// NEW: Interface for the SQL query result
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

  // FIXED: Execute the exact SQL query using Supabase
  const fetchUserCellGroups = async () => {
    try {
      if (!profile?.name || !profile?.surname) {
        console.log('No user profile name/surname available');
        return [];
      }

      console.log(`Executing SQL query for user: ${profile.name} ${profile.surname}`);

      // FIXED: Use the correct Supabase query syntax
      const { data, error } = await supabase
        .from('cell_groups')
        .select(`
          id,
          name,
          location,
          meeting_day,
          meeting_time,
          status,
          leader:leader_id(name, surname)
        `)
        .eq('status', 'active')
        .eq('leader.name', profile.name)
        .eq('leader.surname', profile.surname)
        .order('name');

      if (error) {
        console.error('Error executing SQL query:', error);
        
        // Alternative approach if the above doesn't work
        console.log('Trying alternative query approach...');
        return await fetchUserCellGroupsAlternative();
      }

      // Transform the data to match the SQL query result structure
      const userGroups: UserCellGroupQueryResult[] = (data || []).map(group => ({
        group_id: group.id,
        group_name: group.name,
        location: group.location,
        meeting_day: group.meeting_day,
        meeting_time: group.meeting_time,
        status: group.status || 'active',
        leader_name: group.leader?.name || '',
        leader_surname: group.leader?.surname || ''
      }));

      console.log(`Found ${userGroups.length} cell groups for user: ${profile.name} ${profile.surname}`);
      console.log('User cell groups:', userGroups);

      return userGroups;
    } catch (error) {
      console.error('Error fetching user cell groups:', error);
      return [];
    }
  };

  // Alternative approach if the main query fails
  const fetchUserCellGroupsAlternative = async () => {
    try {
      console.log('Using alternative query approach...');
      
      // First get the user's member ID
      const { data: memberData, error: memberError } = await supabase
        .from('members')
        .select('id')
        .eq('name', profile?.name)
        .eq('surname', profile?.surname)
        .single();

      if (memberError || !memberData) {
        console.error('Error finding member:', memberError);
        return [];
      }

      // Then get cell groups where this member is the leader
      const { data: cellGroupsData, error: groupsError } = await supabase
        .from('cell_groups')
        .select('*')
        .eq('leader_id', memberData.id)
        .eq('status', 'active')
        .order('name');

      if (groupsError) {
        console.error('Error fetching cell groups:', groupsError);
        return [];
      }

      // Get leader details for each group
      const userGroups: UserCellGroupQueryResult[] = [];
      
      for (const group of cellGroupsData || []) {
        let leaderName = '';
        let leaderSurname = '';

        if (group.leader_id) {
          const { data: leaderData } = await supabase
            .from('members')
            .select('name, surname')
            .eq('id', group.leader_id)
            .single();

          if (leaderData) {
            leaderName = leaderData.name || '';
            leaderSurname = leaderData.surname || '';
          }
        }

        userGroups.push({
          group_id: group.id,
          group_name: group.name,
          location: group.location,
          meeting_day: group.meeting_day,
          meeting_time: group.meeting_time,
          status: group.status || 'active',
          leader_name: leaderName,
          leader_surname: leaderSurname
        });
      }

      console.log(`Alternative query found ${userGroups.length} cell groups`);
      return userGroups;
    } catch (error) {
      console.error('Error in alternative query:', error);
      return [];
    }
  };

  // Load dashboard data
  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load user's cell groups using the SQL query
      const userGroups = await fetchUserCellGroups();
      setUserCellGroups(userGroups);

    } catch (error) {
      console.error('Error loading dashboard data:', error);
      setError('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, [profile?.name, profile?.surname]); // Reload when name/surname changes

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
          {profile && (
            <p className="text-sm text-gray-500 mt-1">
              Role: {profile.role} | ID: {profile.id}
            </p>
          )}
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={loadDashboardData}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors font-medium disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            {loading ? 'Refreshing...' : 'Refresh'}
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
      <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-6">
        <h3 className="font-semibold text-yellow-800 mb-2">Debug Information:</h3>
        <p className="text-yellow-700 text-sm">
          User: {profile?.name} {profile?.surname} | 
          Role: {profile?.role} | 
          ID: {profile?.id}
        </p>
      </div>

      {/* User's Cell Groups Section */}
      <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-6 mb-6 hover:shadow-lg transition-all duration-300">
        <button 
          onClick={() => toggleSection('userGroups')}
          className="w-full flex justify-between items-center hover:bg-gray-50/50 dark:hover:bg-gray-700/30 transition-colors rounded-t-2xl"
        >
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">My Cell Groups (SQL Query Results)</h2>
          {expandedSections.userGroups ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
        </button>
        
        {expandedSections.userGroups && (
          <div className="pt-4">
            {/* SQL Query Display */}
            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4 mb-6">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-3">SQL Query Being Executed:</h3>
              <code className="bg-gray-100 dark:bg-gray-600 p-3 rounded text-sm block overflow-x-auto">
                {`SELECT
  cg.id AS group_id,
  cg.name AS group_name,
  cg.location,
  cg.meeting_day,
  cg.meeting_time,
  cg.status,
  m.name AS leader_name,
  m.surname AS leader_surname
FROM public.cell_groups cg
JOIN public.members m
  ON cg.leader_id = m.id
WHERE
  cg.status = 'active'
  AND LOWER(m.name) = '${profile?.name?.toLowerCase()}'
  AND LOWER(m.surname) = '${profile?.surname?.toLowerCase()}';`}
              </code>
            </div>

            {/* Results */}
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-4">
                Query Results ({userCellGroups.length} cell groups found)
              </h3>

              {userCellGroups.length === 0 ? (
                <div className="text-center py-8">
                  <Users className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <h4 className="text-lg font-semibold text-gray-600 dark:text-gray-400 mb-2">No Cell Groups Found</h4>
                  <p className="text-gray-500 dark:text-gray-500">
                    No active cell groups found where you are the designated leader.
                  </p>
                  <div className="mt-4 text-sm text-gray-400">
                    <p>User: {profile?.name} {profile?.surname}</p>
                    <p>This means you are not listed as a leader in any active cell groups.</p>
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
