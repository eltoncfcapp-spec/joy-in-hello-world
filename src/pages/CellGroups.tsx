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

// Interface for the SQL query result - matching Dashboard
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

// Permission checking utility - matching Dashboard
const hasPermission = (userPermissions: string[] = [], requiredPermission: string): boolean => {
  return userPermissions.includes(requiredPermission) || userPermissions.includes('admin_access');
};

const CellGroups = () => {
  const { profile } = useAuth();
  const [cellGroups, setCellGroups] = useState<CellGroup[]>([]);
  const [userCellGroups, setUserCellGroups] = useState<UserCellGroupQueryResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Check user permissions - matching Dashboard
  const currentUserIsAdmin = profile?.isAdmin || (profile?.permissions && hasPermission(profile.permissions, 'admin_access'));
  const currentUserPermissions = profile?.permissions || [];

  // Execute the EXACT same SQL query as Dashboard - matching the Dashboard implementation
  const fetchUserCellGroups = async () => {
    try {
      if (!profile?.id) {
        console.log('No user profile ID available');
        return [];
      }

      console.log(`Executing SQL query for user ID: ${profile.id}, Role: ${profile.role}, Admin: ${currentUserIsAdmin}`);

      let userGroups: UserCellGroupQueryResult[] = [];

      if (currentUserIsAdmin) {
        // Admin: Get all active cell groups
        const { data: cellGroupsData, error: groupsError } = await supabase
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
              name,
              surname
            )
          `)
          .eq('status', 'active')
          .order('name');

        if (groupsError) {
          console.error('Error fetching cell groups:', groupsError);
          return [];
        }

        userGroups = (cellGroupsData || []).map(group => ({
          group_id: group.id,
          group_name: group.name,
          location: group.location,
          meeting_day: group.meeting_day,
          meeting_time: group.meeting_time,
          status: group.status || 'active',
          leader_name: group.members?.name || '',
          leader_surname: group.members?.surname || '',
          leader_id: group.leader_id || ''
        }));
      } else {
        // Non-admin users (Cell Group Leaders): ONLY get groups where they are the leader
        const { data: cellGroupsData, error: groupsError } = await supabase
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
              name,
              surname
            )
          `)
          .eq('leader_id', profile.id)
          .eq('status', 'active')
          .order('name');

        if (groupsError) {
          console.error('Error fetching cell groups:', groupsError);
          return [];
        }

        userGroups = (cellGroupsData || []).map(group => ({
          group_id: group.id,
          group_name: group.name,
          location: group.location,
          meeting_day: group.meeting_day,
          meeting_time: group.meeting_time,
          status: group.status || 'active',
          leader_name: group.members?.name || '',
          leader_surname: group.members?.surname || '',
          leader_id: group.leader_id || ''
        }));
      }

      console.log(`Found ${userGroups.length} cell groups for user: ${profile.name} ${profile.surname}`);
      return userGroups;
    } catch (error) {
      console.error('Error fetching user cell groups:', error);
      return [];
    }
  };

  // Convert query results to CellGroup format for display
  const convertToCellGroupFormat = (queryResults: UserCellGroupQueryResult[]): CellGroup[] => {
    return queryResults.map(result => ({
      id: result.group_id,
      name: result.group_name,
      location: result.location,
      meeting_day: result.meeting_day,
      meeting_time: result.meeting_time,
      leader_id: result.leader_id,
      status: result.status,
      leader: {
        id: result.leader_id,
        name: result.leader_name,
        surname: result.leader_surname,
        email: null,
        phone: null
      }
    }));
  };

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const queryResults = await fetchUserCellGroups();
      setUserCellGroups(queryResults);
      
      // Convert to CellGroup format for the table display
      const formattedCellGroups = convertToCellGroupFormat(queryResults);
      setCellGroups(formattedCellGroups);
      
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

  // Get appropriate header text based on user role
  const getHeaderText = () => {
    if (currentUserIsAdmin) {
      return "All Cell Groups (Admin View)";
    } else {
      return "My Cell Groups";
    }
  };

  // Get appropriate description based on user role
  const getDescription = () => {
    if (currentUserIsAdmin) {
      return "Showing all active cell groups - Administrative Access";
    } else {
      return "Showing cell groups where you are the designated leader";
    }
  };

  // Generate appropriate SQL query based on user role - EXACTLY matching Dashboard
  const getSqlQuery = () => {
    if (currentUserIsAdmin) {
      return `SELECT
  cg.id AS group_id,
  cg.name AS group_name,
  cg.location,
  cg.meeting_day,
  cg.meeting_time,
  cg.status,
  m.name AS leader_name,
  m.surname AS leader_surname,
  cg.leader_id
FROM public.cell_groups cg
JOIN public.members m
  ON cg.leader_id = m.id
WHERE cg.status = 'active';`;
    } else {
      return `SELECT
  cg.id AS group_id,
  cg.name AS group_name,
  cg.location,
  cg.meeting_day,
  cg.meeting_time,
  cg.status,
  m.name AS leader_name,
  m.surname AS leader_surname,
  cg.leader_id
FROM public.cell_groups cg
JOIN public.members m
  ON cg.leader_id = m.id
WHERE
  cg.status = 'active'
  AND cg.leader_id = '${profile?.id}';`;
    }
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
            {getHeaderText()}
            {currentUserIsAdmin && (
              <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                Admin
              </span>
            )}
          </h1>
          <p className="text-gray-600">
            {getDescription()}
          </p>
        </div>

        {/* Query Information */}
        <div className="bg-white rounded-lg p-6 mb-6 shadow-sm border">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">SQL Query Being Executed:</h2>
          <code className="bg-gray-100 p-4 rounded text-sm block overflow-x-auto">
            {getSqlQuery()}
          </code>
        </div>

        {/* Results - Show both formats for clarity */}
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
                {currentUserIsAdmin 
                  ? "No active cell groups found in the system."
                  : "No active cell groups found where you are the designated leader."
                }
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
                      <td className="px-4 py-3">{group.leader_name}</td>
                      <td className="px-4 py-3">{group.leader_surname}</td>
                      <td className="px-4 py-3 font-mono text-xs">{group.leader_id}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Raw Data Display - Show both formats */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg p-6 shadow-sm border">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Raw Query Results</h2>
            <pre className="bg-gray-100 p-4 rounded text-sm overflow-x-auto max-h-96">
              {JSON.stringify(userCellGroups, null, 2)}
            </pre>
          </div>

          <div className="bg-white rounded-lg p-6 shadow-sm border">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Formatted Cell Groups</h2>
            <pre className="bg-gray-100 p-4 rounded text-sm overflow-x-auto max-h-96">
              {JSON.stringify(cellGroups, null, 2)}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CellGroups;
