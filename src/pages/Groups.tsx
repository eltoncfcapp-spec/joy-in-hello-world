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
  const [dataLoaded, setDataLoaded] = useState(false);

  // Execute the EXACT SQL query with name and surname filter
  const fetchUserCellGroups = async () => {
    try {
      if (!profile?.id || !profile?.name || !profile?.surname) {
        console.log('No user profile name/surname available');
        return [];
      }

      console.log(`Executing SQL query for user: ${profile.name} ${profile.surname}, ID: ${profile.id}`);

      // Method 1: Direct SQL query using rpc if available, or manual JOIN with name/surname filter
      const { data: cellGroupsData, error: cellGroupsError } = await supabase
        .from('cell_groups')
        .select('*')
        .eq('status', 'active')
        .order('name');

      if (cellGroupsError) {
        console.error('Error fetching cell groups:', cellGroupsError);
        throw new Error(`Failed to fetch cell groups: ${cellGroupsError.message}`);
      }

      // Get all members to filter by name and surname
      const { data: membersData, error: membersError } = await supabase
        .from('members')
        .select('*')
        .order('name');

      if (membersError) {
        console.error('Error fetching members:', membersError);
        throw new Error(`Failed to fetch members: ${membersError.message}`);
      }

      console.log('Fetched cell groups:', cellGroupsData);
      console.log('Fetched members:', membersData);

      // Manual JOIN implementation to match the exact SQL query with name/surname filter
      const userGroups: UserCellGroupQueryResult[] = [];

      cellGroupsData.forEach(cellGroup => {
        // Find the leader member for this cell group
        const leader = membersData.find(member => 
          member.id === cellGroup.leader_id &&
          member.name?.toLowerCase() === profile.name?.toLowerCase() &&
          member.surname?.toLowerCase() === profile.surname?.toLowerCase()
        );

        // Only include groups where leader matches the current user's name and surname
        if (leader) {
          userGroups.push({
            group_id: cellGroup.id,
            group_name: cellGroup.name,
            location: cellGroup.location,
            meeting_day: cellGroup.meeting_day,
            meeting_time: cellGroup.meeting_time,
            status: cellGroup.status || 'active',
            leader_name: leader.name,
            leader_surname: leader.surname,
            leader_id: cellGroup.leader_id || ''
          });
        }
      });

      console.log(`Found ${userGroups.length} cell groups for user: ${profile.name} ${profile.surname}`);
      
      // Debug: Show what groups were found
      userGroups.forEach(group => {
        console.log(`Group: ${group.group_name}, Leader: ${group.leader_name} ${group.leader_surname}, Leader ID: ${group.leader_id}`);
      });

      return userGroups;
    } catch (error) {
      console.error('Error fetching user cell groups:', error);
      throw error;
    }
  };

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      setDataLoaded(false);
      
      console.log('Starting data load...');
      const queryResults = await fetchUserCellGroups();
      console.log('Query results:', queryResults);
      
      setUserCellGroups(queryResults);
      setDataLoaded(true);
      
    } catch (error: any) {
      console.error('Error loading data:', error);
      setError(`Failed to load cell groups data: ${error.message}`);
      setDataLoaded(false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (profile) {
      loadData();
    }
  }, [profile]);

  // Generate the EXACT SQL query with name and surname filter
  const getSqlQuery = () => {
    if (!profile?.name || !profile?.surname) return '';
    
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
  AND LOWER(m.name) = '${profile.name?.toLowerCase()}'
  AND LOWER(m.surname) = '${profile.surname?.toLowerCase()}';`;
  };

  // Show loading state while query is executing
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading cell groups...</p>
          <p className="text-sm text-gray-500 mt-2">Executing SQL query with name/surname filter...</p>
        </div>
      </div>
    );
  }

  // Show error state if query failed
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

  // Only show page content after data is loaded
  if (!dataLoaded) {
    return (
      <div className="min-h-screen bg-gray-50 p-6 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Preparing data...</p>
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
            User: {profile?.name} {profile?.surname} | ID: {profile?.id}
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
                No active cell groups found where you ({profile?.name} {profile?.surname}) are the designated leader.
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

        {/* Query Information */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <h3 className="text-lg font-semibold text-blue-800 mb-2">Query Information</h3>
          <div className="text-sm text-blue-700">
            <p><strong>Current User:</strong> {profile?.name} {profile?.surname}</p>
            <p><strong>User ID:</strong> {profile?.id}</p>
            <p><strong>Groups Found:</strong> {userCellGroups.length}</p>
            <p><strong>Filter Applied:</strong> WHERE LOWER(m.name) = '{profile?.name?.toLowerCase()}' AND LOWER(m.surname) = '{profile?.surname?.toLowerCase()}'</p>
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

export default Groups;
