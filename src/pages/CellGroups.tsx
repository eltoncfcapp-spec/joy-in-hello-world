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

// Interface for the SQL query result - matching Dashboard exactly
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

// Permission checking utility - matching Dashboard exactly
const hasPermission = (userPermissions: string[] = [], requiredPermission: string): boolean => {
  return userPermissions.includes(requiredPermission) || userPermissions.includes('admin_access');
};

const CellGroups = () => {
  const { profile } = useAuth();
  const [cellGroups, setCellGroups] = useState<CellGroup[]>([]);
  const [userCellGroups, setUserCellGroups] = useState<UserCellGroupQueryResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Check if current user has admin access - matching Dashboard exactly
  const currentUserIsAdmin = profile?.isAdmin || (profile?.permissions && hasPermission(profile.permissions, 'admin_access'));
  const currentUserPermissions = profile?.permissions || [];

  // Execute the EXACT same SQL query as Dashboard
  const fetchUserCellGroups = async () => {
    try {
      if (!profile?.id) {
        console.log('No user profile ID available');
        return [];
      }

      console.log(`Executing SQL query for user ID: ${profile.id}, Name: ${profile.name}, Admin: ${currentUserIsAdmin}`);

      let userGroups: UserCellGroupQueryResult[] = [];

      if (currentUserIsAdmin) {
        // Admin: Get all active cell groups
        console.log('User is ADMIN - fetching ALL cell groups');
        const { data: cellGroupsData, error: groupsError } = await supabase
          .from('cell_groups')
          .select('*')
          .eq('status', 'active')
          .order('name');

        if (groupsError) {
          console.error('Error fetching cell groups:', groupsError);
          return [];
        }

        // For admin, we need to get leader information separately
        const groupsWithLeaders = await Promise.all(
          (cellGroupsData || []).map(async (group) => {
            let leaderName = 'Unknown';
            let leaderSurname = 'Unknown';
            
            if (group.leader_id) {
              const { data: leaderData } = await supabase
                .from('members')
                .select('name, surname')
                .eq('id', group.leader_id)
                .single();
              
              if (leaderData) {
                leaderName = leaderData.name;
                leaderSurname = leaderData.surname;
              }
            }

            return {
              group_id: group.id,
              group_name: group.name,
              location: group.location,
              meeting_day: group.meeting_day,
              meeting_time: group.meeting_time,
              status: group.status || 'active',
              leader_name: leaderName,
              leader_surname: leaderSurname,
              leader_id: group.leader_id || ''
            };
          })
        );

        userGroups = groupsWithLeaders;
        console.log(`Admin sees ${userGroups.length} cell groups`);
      } else {
        // NON-ADMIN (Cell Group Leader): ONLY get groups where they are the leader - EXACTLY like Dashboard
        console.log('User is CELL GROUP LEADER - fetching ONLY their groups');
        const { data: cellGroupsData, error: groupsError } = await supabase
          .from('cell_groups')
          .select('*')
          .eq('leader_id', profile.id)  // CRITICAL: Only groups where current user is leader
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
          leader_name: profile.name || '',
          leader_surname: profile.surname || '',
          leader_id: group.leader_id || ''
        }));

        console.log(`Cell Group Leader sees ${userGroups.length} cell groups where they are leader`);
        
        // Debug: Show what groups were found
        userGroups.forEach(group => {
          console.log(`Group: ${group.group_name}, Leader ID: ${group.leader_id}, Current User ID: ${profile.id}`);
        });
      }

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
      
      console.log('Starting data load...');
      const queryResults = await fetchUserCellGroups();
      console.log('Query results:', queryResults);
      
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
  m.surname AS leader_surname
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
  m.surname AS leader_surname
FROM public.cell_groups cg
JOIN public.members m
  ON cg.leader_id = m.id
WHERE
  cg.status = 'active'
  AND m.id = '${profile?.id}';`;
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
            {!currentUserIsAdmin && (
              <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                Cell Group Leader
              </span>
            )}
          </h1>
          <p className="text-gray-600">
            {getDescription()}
          </p>
          <div className="mt-2 text-sm text-gray-500">
            User ID: {profile?.id} | Name: {profile?.name} {profile?.surname} | Role: {profile?.role}
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

        {/* Raw Data Display */}
        <div className="bg-white rounded-lg p-6 shadow-sm border">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Raw Data</h2>
          <pre className="bg-gray-100 p-4 rounded text-sm overflow-x-auto max-h-96">
            {JSON.stringify(userCellGroups, null, 2)}
          </pre>
        </div>

        {/* Permission Information */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-6">
          <h3 className="text-lg font-semibold text-blue-800 mb-2">Permission Information</h3>
          <div className="text-sm text-blue-700">
            <p><strong>Current Permissions:</strong> {currentUserPermissions.join(', ') || 'None'}</p>
            <p><strong>Admin Access:</strong> {currentUserIsAdmin ? 'Yes' : 'No'}</p>
            <p><strong>Assigned Groups:</strong> {profile?.assigned_groups?.join(', ') || 'None'}</p>
            <p><strong>Assigned Departments:</strong> {profile?.assigned_departments?.join(', ') || 'None'}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CellGroups;
