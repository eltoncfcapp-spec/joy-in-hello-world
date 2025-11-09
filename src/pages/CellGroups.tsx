const CellGroups = () => {
  const { profile } = useAuth();
  const [cellGroup, setCellGroup] = useState<CellGroup | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Simplified: Load the user's cell group directly
  const loadUserCellGroup = async () => {
    try {
      setLoading(true);
      setError(null);

      if (!profile?.login_username) {
        setError('User not properly authenticated');
        return;
      }

      console.log('🔍 Loading cell group for user:', profile.login_username);

      // Use the working query from before
      const { data, error: queryError } = await supabase
        .from('cell_groups')
        .select(`
          *,
          leader:members!leader_id(id, name, surname, email, phone)
        `)
        .eq('members.login_username', profile.login_username)
        .single();

      if (queryError) {
        console.error('Error loading cell group:', queryError);
        
        // Fallback: Try to get cell group via cell_group_id
        if (profile.cell_group_id) {
          const { data: fallbackData, error: fallbackError } = await supabase
            .from('cell_groups')
            .select(`
              *,
              leader:members!leader_id(id, name, surname, email, phone)
            `)
            .eq('id', profile.cell_group_id)
            .single();

          if (fallbackError) {
            throw new Error('No cell group found for this user');
          }
          setCellGroup(fallbackData as CellGroup);
        } else {
          throw new Error('No cell group found for this user');
        }
      } else {
        setCellGroup(data as CellGroup);
      }

    } catch (error: any) {
      console.error('Error loading cell group:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (profile) {
      loadUserCellGroup();
    }
  }, [profile]);

  // Show loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-6 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading your cell group...</p>
        </div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-6 flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="h-8 w-8 text-red-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">No Cell Group Found</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">{error}</p>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            You are not assigned to any cell group. Please contact an administrator.
          </p>
        </div>
      </div>
    );
  }

  // Show cell group data
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
            My Cell Group
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            {cellGroup?.leader ? 
              `Led by ${cellGroup.leader.name} ${cellGroup.leader.surname}` : 
              'No leader assigned'
            }
          </p>
        </div>

        {/* Cell Group Card */}
        {cellGroup && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 mb-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                  {cellGroup.name}
                </h2>
                {cellGroup.description && (
                  <p className="text-gray-600 dark:text-gray-400 mb-3">
                    {cellGroup.description}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2 bg-green-100 dark:bg-green-900 px-3 py-1 rounded-full">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-green-800 dark:text-green-200 text-sm font-medium">
                  {cellGroup.status || 'Active'}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              {/* Location */}
              {cellGroup.location && (
                <div className="flex items-center gap-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <MapPin className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Location</p>
                    <p className="font-medium text-gray-900 dark:text-white">{cellGroup.location}</p>
                  </div>
                </div>
              )}

              {/* Meeting Day */}
              {cellGroup.meeting_day && (
                <div className="flex items-center gap-3 p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                  <Calendar className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Meeting Day</p>
                    <p className="font-medium text-gray-900 dark:text-white">{cellGroup.meeting_day}</p>
                  </div>
                </div>
              )}

              {/* Meeting Time */}
              {cellGroup.meeting_time && (
                <div className="flex items-center gap-3 p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                  <Users className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Meeting Time</p>
                    <p className="font-medium text-gray-900 dark:text-white">{cellGroup.meeting_time}</p>
                  </div>
                </div>
              )}

              {/* Member Count */}
              <div className="flex items-center gap-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <User className="h-5 w-5 text-green-600 dark:text-green-400" />
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Members</p>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {cellGroup.current_member_count || 0}
                  </p>
                </div>
              </div>
            </div>

            {/* Leader Info */}
            {cellGroup.leader && (
              <div className="border-t dark:border-gray-700 pt-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Group Leader</h3>
                <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                    <span className="text-white font-bold text-sm">
                      {cellGroup.leader.name?.[0]}{cellGroup.leader.surname?.[0]}
                    </span>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {cellGroup.leader.name} {cellGroup.leader.surname}
                    </p>
                    {cellGroup.leader.email && (
                      <p className="text-sm text-gray-600 dark:text-gray-400">{cellGroup.leader.email}</p>
                    )}
                    {cellGroup.leader.phone && (
                      <p className="text-sm text-gray-600 dark:text-gray-400">{cellGroup.leader.phone}</p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Action Buttons for Leaders */}
        {profile?.is_leader && cellGroup && (
          <div className="flex gap-3">
            <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
              <Edit className="h-4 w-4" />
              Edit Group
            </button>
            <button className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
              <Users className="h-4 w-4" />
              Manage Members
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default CellGroups;
