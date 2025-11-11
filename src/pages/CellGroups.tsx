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

// Permission checking utility
const hasPermission = (userPermissions: string[] = [], requiredPermission: string): boolean => {
  return userPermissions.includes(requiredPermission) || userPermissions.includes('admin_access');
};

const CellGroups = () => {
  const { profile } = useAuth();
  const [cellGroups, setCellGroups] = useState<CellGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Check user permissions
  const currentUserIsAdmin = profile?.isAdmin || (profile?.permissions && hasPermission(profile.permissions, 'admin_access'));
  const currentUserPermissions = profile?.permissions || [];

  // Fetch cell groups based on user role
  const fetchCellGroups = async () => {
    try {
      if (!profile?.id) {
        console.log('No user profile ID available');
        return [];
      }

      console.log(`Fetching cell groups for user: ${profile.name} ${profile.surname}, Role: ${profile.role}, Admin: ${currentUserIsAdmin}`);

      let cellGroupsData: CellGroup[] = [];

      if (currentUserIsAdmin) {
        // Admin can see all active cell groups
        const { data, error: cellGroupsError } = await supabase
          .from('cell_groups')
          .select('*')
          .eq('status', 'active')
          .order('name');

        if (cellGroupsError) throw cellGroupsError;
        cellGroupsData = data || [];
      } else if (profile?.assigned_groups && profile.assigned_groups.length > 0) {
        // Leader can see only their assigned groups
        const { data, error: cellGroupsError } = await supabase
          .from('cell_groups')
          .select('*')
          .eq('status', 'active')
          .in('id', profile.assigned_groups)
          .order('name');

        if (cellGroupsError) throw cellGroupsError;
        cellGroupsData = data || [];
      } else {
        // Regular member - show groups where they are the leader
        const { data, error: cellGroupsError } = await supabase
          .from('cell_groups')
          .select('*')
          .eq('status', 'active')
          .eq('leader_id', profile.id)
          .order('name');

        if (cellGroupsError) throw cellGroupsError;
        cellGroupsData = data || [];
      }

      console.log('Fetched cell groups:', cellGroupsData);

      // If no cell groups found for regular member, check if they are a member of any group
      if (cellGroupsData.length === 0 && !currentUserIsAdmin && (!profile?.assigned_groups || profile.assigned_groups.length === 0)) {
        // Check if user is a member of any cell group
        const { data: memberData, error: memberError } = await supabase
          .from('members')
          .select('cell_group_id')
          .eq('id', profile.id)
          .single();

        if (!memberError && memberData?.cell_group_id) {
          const { data: memberGroups, error: memberGroupsError } = await supabase
            .from('cell_groups')
            .select('*')
            .eq('id', memberData.cell_group_id)
            .eq('status', 'active');

          if (!memberGroupsError && memberGroups) {
            cellGroupsData = memberGroups;
          }
        }
      }

      // Fetch all members to get leader information
      const { data: membersData, error: membersError } = await supabase
        .from('members')
        .select('*')
        .order('name');

      if (membersError) throw membersError;

      console.log('Fetched members:', membersData);

      // Add leader information to cell groups
      const cellGroupsWithLeaders = cellGroupsData.map(cellGroup => {
        const leader = membersData?.find(member => member.id === cellGroup.leader_id);
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

      console.log(`Fetched ${cellGroupsWithLeaders.length} cell groups for user`);
      console.log('User cell groups:', cellGroupsWithLeaders);

      return cellGroupsWithLeaders as CellGroup[];
    } catch (error) {
      console.error('Error in fetchCellGroups:', error);
      throw error;
    }
  };

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const userCellGroups = await fetchCellGroups();
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

  // Get appropriate header text based on user role
  const getHeaderText = () => {
    if (currentUserIsAdmin) {
      return "All Cell Groups";
    } else if (profile?.assigned_groups && profile.assigned_groups.length > 0) {
      return `My Managed Cell Groups`;
    } else {
      return `My Cell Groups`;
    }
  };

  // Get appropriate description based on user role
  const getDescription = () => {
    if (currentUserIsAdmin) {
      return "Showing all active cell groups (Admin View)";
    } else if (profile?.assigned_groups && profile.assigned_groups.length > 0) {
      return "Showing cell groups you are assigned to manage";
    } else {
      return "Showing cell groups where you are the leader or member";
    }
  };

  // Generate appropriate SQL query based on user role
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
    } else if (profile?.assigned_groups && profile.assigned_groups.length > 0) {
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
  AND cg.id IN (${profile.assigned_groups.map(id => `'${id}'`).join(', ')});`;
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
  AND (cg.leader_id = '${profile?.id}' OR cg.id IN (
    SELECT cell_group_id FROM members WHERE id = '${profile?.id}'
  ));`;
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
                {currentUserIsAdmin 
                  ? "No active cell groups found in the system."
                  : "No cell groups found for your account."
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
                    {currentUserIsAdmin && <th className="px-4 py-3">Leader ID</th>}
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
                      {currentUserIsAdmin && (
                        <td className="px-4 py-3 font-mono text-xs">{group.leader_id || 'N/A'}</td>
                      )}
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
