import { useState, useEffect } from 'react';
import { supabase } from '../integrations/supabase/client';
import { useAuth } from '../contexts/AuthContext';

interface CellGroup {
  id: string;
  name: string;
  location: string | null;
  meeting_day: string | null;
  meeting_time: string | null;
  leader_id: string | null;
  status?: string | null;
  leader?: {
    id: string;
    name: string;
    surname: string;
    email: string | null;
    phone: string | null;
  } | null;
}

interface Member {
  id: string;
  name: string;
  surname: string;
  email: string | null;
  phone: string | null;
}

const CellGroups = () => {
  const { profile } = useAuth();
  const [cellGroups, setCellGroups] = useState<CellGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Manual JOIN implementation to match the exact SQL query
  const fetchCellGroupsForUser = async () => {
    try {
      if (!profile?.name || !profile?.surname) {
        console.log('No user profile name/surname available');
        return [];
      }

      console.log(`Fetching cell groups for user: ${profile.name} ${profile.surname}`);

      // Step 1: Fetch all active cell groups
      const { data: cellGroupsData, error: cellGroupsError } = await supabase
        .from('cell_groups')
        .select('*')
        .eq('status', 'active')
        .order('name');

      if (cellGroupsError) throw cellGroupsError;

      console.log('Fetched cell groups:', cellGroupsData);

      // Step 2: Fetch all members
      const { data: membersData, error: membersError } = await supabase
        .from('members')
        .select('*')
        .order('name');

      if (membersError) throw membersError;

      console.log('Fetched members:', membersData);

      // Step 3: Manual JOIN - Filter cell groups where leader matches logged-in user
      const userCellGroups = cellGroupsData
        .filter(cellGroup => {
          // Find the leader member for this cell group
          const leader = membersData.find(member => 
            member.id === cellGroup.leader_id &&
            member.name.toLowerCase() === profile.name.toLowerCase() &&
            member.surname.toLowerCase() === profile.surname.toLowerCase()
          );
          return leader !== undefined; // Only include groups where leader matches
        })
        .map(cellGroup => {
          // Add leader information to the cell group
          const leader = membersData.find(member => member.id === cellGroup.leader_id);
          return {
            ...cellGroup,
            leader: leader ? {
              id: leader.id,
              name: leader.name,
              surname: leader.surname,
              email: leader.email,
              phone: leader.phone
            } : null
          };
        });

      console.log(`Fetched ${userCellGroups.length} cell groups for user: ${profile.name} ${profile.surname}`);
      console.log('User cell groups:', userCellGroups);

      return userCellGroups as CellGroup[];
    } catch (error) {
      console.error('Error in fetchCellGroupsForUser:', error);
      throw error;
    }
  };

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const userCellGroups = await fetchCellGroupsForUser();
      setCellGroups(userCellGroups);
      
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
            Cell Groups for {profile?.name} {profile?.surname}
          </h1>
          <p className="text-gray-600">
            Showing cell groups where you are the designated leader
          </p>
        </div>

        {/* Query Information */}
        <div className="bg-white rounded-lg p-6 mb-6 shadow-sm border">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">SQL Query Being Executed:</h2>
          <code className="bg-gray-100 p-4 rounded text-sm block overflow-x-auto">
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
        <div className="bg-white rounded-lg p-6 shadow-sm border">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Query Results ({cellGroups.length} cell groups found)
          </h2>

          {cellGroups.length === 0 ? (
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
                  </tr>
                </thead>
                <tbody>
                  {cellGroups.map((group) => (
                    <tr key={group.id} className="bg-white border-b hover:bg-gray-50">
                      <td className="px-4 py-3 font-mono text-xs">{group.id}</td>
                      <td className="px-4 py-3 font-medium">{group.name}</td>
                      <td className="px-4 py-3">{group.location || 'N/A'}</td>
                      <td className="px-4 py-3">{group.meeting_day || 'N/A'}</td>
                      <td className="px-4 py-3">{group.meeting_time || 'N/A'}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          group.status === 'active' 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {group.status || 'unknown'}
                        </span>
                      </td>
                      <td className="px-4 py-3">{group.leader?.name || 'N/A'}</td>
                      <td className="px-4 py-3">{group.leader?.surname || 'N/A'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Raw Data Display */}
        <div className="bg-white rounded-lg p-6 mt-6 shadow-sm border">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Raw Data</h2>
          <pre className="bg-gray-100 p-4 rounded text-sm overflow-x-auto">
            {JSON.stringify(cellGroups, null, 2)}
          </pre>
        </div>
      </div>
    </div>
  );
};

export default CellGroups;
