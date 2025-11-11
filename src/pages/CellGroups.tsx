import { useState, useEffect } from 'react';
import {
  Users,
  MapPin,
  Clock,
  Calendar,
  Crown,
  Phone,
  Mail,
  Search,
  Filter,
  Eye,
  MoreVertical,
  RefreshCw,
  AlertCircle
} from 'lucide-react';
import { supabase } from '../integrations/supabase/client';
import { useAuth } from '../contexts/AuthContext';

// ---------- Types ----------
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

interface GroupMember {
  id: string;
  name: string;
  surname: string;
  email: string | null;
  phone: string | null;
  status: string;
  joined_date: string;
}

interface GroupDetails extends UserCellGroupQueryResult {
  members?: GroupMember[];
  member_count?: number;
  description?: string | null;
}

// ---------- Component ----------
const CellGroups = () => {
  const { profile } = useAuth();
  const [groups, setGroups] = useState<GroupDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGroup, setSelectedGroup] = useState<GroupDetails | null>(null);
  const [membersLoading, setMembersLoading] = useState(false);

  // ---------- SQL Query ----------
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
  m.surname AS leader_surname,
  cg.leader_id
FROM public.cell_groups cg
JOIN public.members m ON cg.leader_id = m.id
WHERE cg.status = 'active'
  AND LOWER(m.name) = '${profile.name.toLowerCase()}'
  AND LOWER(m.surname) = '${profile.surname.toLowerCase()}'
ORDER BY cg.name;`;
  };

  // ---------- Fetch Groups ----------
  const fetchUserCellGroups = async (): Promise<GroupDetails[]> => {
    if (!profile?.id || !profile?.name || !profile?.surname) return [];

    const { data: cellGroups, error: cgError } = await supabase
      .from('cell_groups')
      .select('*')
      .eq('status', 'active')
      .order('name');

    if (cgError) throw new Error(cgError.message);

    const { data: members, error: mError } = await supabase
      .from('members')
      .select('*');

    if (mError) throw new Error(mError.message);

    const userGroups: GroupDetails[] = [];

    for (const g of cellGroups) {
      const leader = members.find(
        (m) =>
          m.id === g.leader_id &&
          m.name?.toLowerCase() === profile.name.toLowerCase() &&
          m.surname?.toLowerCase() === profile.surname.toLowerCase()
      );

      if (leader) {
        userGroups.push({
          group_id: g.id,
          group_name: g.name,
          location: g.location,
          meeting_day: g.meeting_day,
          meeting_time: g.meeting_time,
          status: g.status,
          leader_name: leader.name,
          leader_surname: leader.surname,
          leader_id: g.leader_id,
          description: g.description,
          member_count: 0
        });
      }
    }

    // Count members for each group
    for (const group of userGroups) {
      const { count } = await supabase
        .from('members')
        .select('*', { count: 'exact', head: true })
        .eq('cell_group_id', group.group_id);
      group.member_count = count || 0;
    }

    return userGroups;
  };

  // ---------- Fetch Members ----------
  const fetchGroupMembers = async (groupId: string): Promise<GroupMember[]> => {
    const { data, error } = await supabase
      .from('members')
      .select('*')
      .eq('cell_group_id', groupId)
      .order('name');

    if (error) throw new Error(error.message);

    return (data || []).map((m) => ({
      id: m.id,
      name: m.name,
      surname: m.surname,
      email: m.email,
      phone: m.phone,
      status: m.status,
      joined_date: m.created_at
    }));
  };

  // ---------- Load Data ----------
  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const results = await fetchUserCellGroups();
      setGroups(results);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (profile) loadData();
  }, [profile]);

  // ---------- Helpers ----------
  const formatSchedule = (g: GroupDetails) => {
    if (!g.meeting_day && !g.meeting_time) return 'Not set';
    return `${g.meeting_day || ''} at ${g.meeting_time || ''}`;
  };

  const filtered = groups.filter((g) =>
    [g.group_name, g.location, g.meeting_day]
      .join(' ')
      .toLowerCase()
      .includes(searchTerm.toLowerCase())
  );

  // ---------- UI ----------
  if (loading)
    return (
      <div className="p-8 text-center">
        <div className="animate-spin h-10 w-10 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p>Loading your cell groups...</p>
      </div>
    );

  if (error)
    return (
      <div className="p-8 text-center text-red-600">
        <AlertCircle className="inline h-6 w-6 mr-2" />
        {error}
        <div className="mt-4">
          <button onClick={loadData} className="bg-blue-600 text-white px-4 py-2 rounded">
            Retry
          </button>
        </div>
      </div>
    );

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-blue-600">My Cell Groups</h1>
        <p className="text-gray-600">
          Showing cell groups where you ({profile?.name} {profile?.surname}) are the leader.
        </p>
      </div>

      {/* SQL Query */}
      <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg border">
        <h2 className="font-semibold mb-2">SQL Query Executed:</h2>
        <code className="text-sm block whitespace-pre overflow-x-auto">{getSqlQuery()}</code>
      </div>

      {/* Search */}
      <div className="flex items-center gap-2">
        <Search className="h-5 w-5 text-gray-400" />
        <input
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search groups..."
          className="flex-1 border px-3 py-2 rounded"
        />
        <button onClick={loadData} className="flex items-center gap-2 bg-gray-700 text-white px-4 py-2 rounded">
          <RefreshCw className="h-4 w-4" />
          Refresh
        </button>
      </div>

      {/* Results */}
      {filtered.length === 0 ? (
        <div className="text-center py-10 text-gray-500">
          <Users className="h-10 w-10 mx-auto mb-3 text-gray-400" />
          No cell groups found.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((g) => (
            <div
              key={g.group_id}
              className="p-4 border rounded-lg bg-white dark:bg-gray-800 hover:shadow transition"
            >
              <div className="flex justify-between mb-2">
                <h3 className="font-semibold">{g.group_name}</h3>
                <span
                  className={`px-2 py-1 text-xs rounded-full ${
                    g.status === 'active'
                      ? 'bg-green-100 text-green-700'
                      : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {g.status}
                </span>
              </div>
              <p className="text-sm text-gray-600 mb-2">
                <MapPin className="inline h-4 w-4 mr-1" />
                {g.location || 'No location'}
              </p>
              <p className="text-sm text-gray-600 mb-2">
                <Clock className="inline h-4 w-4 mr-1" />
                {formatSchedule(g)}
              </p>
              <p className="text-sm text-gray-600 mb-2">
                <Crown className="inline h-4 w-4 mr-1 text-yellow-500" />
                Leader: {g.leader_name} {g.leader_surname}
              </p>
              <p className="text-sm text-gray-600 mb-4">
                <Users className="inline h-4 w-4 mr-1" />
                {g.member_count} members
              </p>
              <button
                onClick={async () => {
                  setMembersLoading(true);
                  const members = await fetchGroupMembers(g.group_id);
                  setSelectedGroup({ ...g, members });
                  setMembersLoading(false);
                }}
                className="bg-blue-600 text-white w-full py-2 rounded"
              >
                <Eye className="inline h-4 w-4 mr-1" />
                View Members
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Selected Group Modal */}
      {selectedGroup && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-2xl w-full relative">
            <button
              onClick={() => setSelectedGroup(null)}
              className="absolute right-4 top-4 text-gray-500 hover:text-gray-700"
            >
              ×
            </button>
            <h2 className="text-xl font-bold mb-4">{selectedGroup.group_name} Members</h2>
            {membersLoading ? (
              <div className="text-center">Loading members...</div>
            ) : selectedGroup.members && selectedGroup.members.length > 0 ? (
              <div className="space-y-2">
                {selectedGroup.members.map((m) => (
                  <div key={m.id} className="flex justify-between border p-2 rounded">
                    <div>
                      <p className="font-medium">
                        {m.name} {m.surname}
                      </p>
                      <p className="text-xs text-gray-500">{m.email || m.phone || 'No contact'}</p>
                    </div>
                    <span
                      className={`text-xs px-2 py-1 rounded ${
                        m.status === 'active'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {m.status}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p>No members found in this group.</p>
            )}
          </div>
        </div>
      )}

      {/* Raw Query Data */}
      <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg border">
        <h2 className="font-semibold mb-2">Raw Query Results</h2>
        <pre className="text-xs overflow-x-auto max-h-96 bg-gray-100 dark:bg-gray-700 p-2 rounded">
          {JSON.stringify(groups, null, 2)}
        </pre>
      </div>
    </div>
  );
};

export default CellGroups;
