import { useState, useEffect } from 'react';
import { supabase } from '../integrations/supabase/client';
import { useAuth } from '../contexts/AuthContext';

// Interface for the SQL query result - matching your exact query
interface UserCellGroupQueryResult {
  group_id: string;
  group_name: string;
  location: string | null;
  meeting_day: string | null;
  meeting_time: string | null;
  status: string;
  leader_name: string;
  leader_surname: string;
  leader_id: string;
}

const CellGroups = () => {
  const { profile } = useAuth();
  const [userCellGroups, setUserCellGroups] = useState<UserCellGroupQueryResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Execute the EXACT SQL query from your example
  const fetchUserCellGroups = async () => {
    try {
      if (!profile?.id) {
        console.log('No user profile ID available');
        return [];
      }

      console.log(`Executing SQL query for user ID: ${profile.id}, Name: ${profile.name}`);

      // For ALL users (including cell group admins), ONLY show their own groups
      // Using the EXACT SQL query structure from your example
      const { data, error: queryError } = await supabase
        .from('cell_groups')
        .select(`
          id,
          name,
          location,
          meeting_day,
          meeting_time,
          status,
          leader_id,
          members!cell_groups_leader_id_fkey (
            id,
            name,
            surname
          )
        `)
        .eq('status', 'active')
        .eq('members.id', profile.id)  // CRITICAL: Only groups where current user is the leader
        .order('name');

      if (queryError) {
        console.error('Error fetching cell groups:', queryError);
        
        // If the JOIN query fails, try a simpler approach
        const { data: fallbackData, error: fallbackError } = await supabase
          .from('cell_groups')
          .select('*')
          .eq('leader_id', profile.id)
          .eq('status', 'active')
          .order('name');

        if (fallbackError) {
          console.error('Error with fallback query:', fallbackError);
          return [];
        }

        const fallbackGroups: UserCellGroupQueryResult[] = (fallbackData || []).map(group => ({
          group_id: group.id,
          group_name: group.name,
          location: group.location,
          meeting_day: group.meeting_day,
          meeting_time: group.meeting_time,
          status: group.status || 'active',
          leader_name: profile.name || '',
          leader_surname: profile.surname || '',
          leader_id: group.leader_id || ''
        }));

        console.log(`Found ${fallbackGroups.length} cell groups using fallback query`);
        return fallbackGroups;
      }

      const userGroups: UserCellGroupQueryResult[] = (data || []).map(group => ({
        group_id: group.id,
        group_name: group.name,
        location: group.location,
        meeting_day: group.meeting_day,
        meeting_time: group.meeting_time,
        status: group.status || 'active',
        leader_name: group.members?.name || profile.name || '',
        leader_surname: group.members?.surname || profile.surname || '',
        leader_id: group.leader_id || ''
      }));

      console.log(`Found ${userGroups.length} cell groups for user: ${profile.name} ${profile.surname}`);
      
      // Debug: Show what groups were found
      userGroups.forEach(group => {
        console.log(`Group: ${group.group_name}, Leader: ${group.leader_name} ${group.leader_surname}, Leader ID: ${group.leader_id}`);
      });

      return userGroups;
    } catch (error) {
      console.error('Error fetching user cell groups:', error);
      return [];
    }
  };

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('Starting data load...');
      const queryResults = await fetchUserCellGroups();
      console.log('Query results:', queryResults);
      
      setUserCellGroups(queryResults);
      
    } catch (error: any) {
      console.error('Error loading data:', error);
      setError(`Failed to load cell groups data: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (profile) {
      loadData();
    }
  }, [profile]);

  // Generate the EXACT SQL query from your example
  const getSqlQuery = () => {
    return `SELECT 
  cg.id AS group_id, 
  cg.name AS group_name, 
  cg.location, 
  cg.meeting_day, 
  cg.meeting_time, 
  cg.status, 
  m.name AS leader_name, 
  m.surname AS leader_surname 
FROM public.cell_groups cg 
JOIN public.members m ON cg.leader_id = m.id 
WHERE cg.status = 'active' 
  AND m.id = '${profile?.id}';`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading cell groups...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-6 flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <div className="text-red-600 font-bold">!</div>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Error</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={loadData}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            My Cell Groups (SQL Query Results)
          </h1>
          <p className="text-gray-600">
            Showing cell groups where you are the designated leader
          </p>
          <div className="mt-2 text-sm text-gray-500">
            User ID: {profile?.id} | Name: {profile?.name} {profile?.surname}
          </div>
        </div>

        {/* Query Information */}
        <div className="bg-white rounded-lg p-6 mb-6 shadow-sm border">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">SQL Query Being Executed:</h2>
          <code className="bg-gray-100 p-4 rounded text-sm block overflow-x-auto">
            {getSqlQuery()}
          </code>
        </div>

        {/* Results */}
        <div className="bg-white rounded-lg p-6 shadow-sm border mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Query Results ({userCellGroups.length} cell groups found)
          </h2>

          {userCellGroups.length === 0 ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <div className="text-gray-400 text-2xl">∅</div>
              </div>
              <h3 className="text-xl font-semibold text-gray-600 mb-2">No Cell Groups Found</h3>
              <p className="text-gray-500">
                No active cell groups found where you are the designated leader.
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
                    <th className="px-4 py-3">Leader Surname</th>
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
                      <td className="px-4 py-3">
                        {group.leader_name}
                        {group.leader_name === profile?.name && (
                          <span className="ml-1 inline-flex items-center px-1 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                            You
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {group.leader_surname}
                        {group.leader_surname === profile?.surname && (
                          <span className="ml-1 inline-flex items-center px-1 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                            You
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs">
                        {group.leader_id}
                        {group.leader_id === profile?.id && (
                          <span className="ml-1 inline-flex items-center px-1 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                            You
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Debug Information */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <h3 className="text-lg font-semibold text-blue-800 mb-2">Query Information</h3>
          <div className="text-sm text-blue-700">
            <p><strong>Current User ID:</strong> {profile?.id}</p>
            <p><strong>Current User Name:</strong> {profile?.name} {profile?.surname}</p>
            <p><strong>Groups Found:</strong> {userCellGroups.length}</p>
            <p><strong>Query Type:</strong> User-Specific Groups Only (JOIN with member ID filter)</p>
          </div>
        </div>

        {/* Raw Data Display */}
        <div className="bg-white rounded-lg p-6 shadow-sm border">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Raw Query Results</h2>
          <pre className="bg-gray-100 p-4 rounded text-sm overflow-x-auto max-h-96">
            {JSON.stringify(userCellGroups, null, 2)}
          </pre>
        </div>
      </div>
    </div>
  );
};

export default CellGroups;
