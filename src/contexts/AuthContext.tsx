// Example 1: Component that shows different content based on role
const GroupManagement: React.FC = () => {
  const { profile, hasPermission, canManageGroup } = useAuth();
  
  if (!profile) return <div>Loading...</div>;
  
  return (
    <div>
      <h1>Group Management</h1>
      
      {/* Admin sees all options */}
      {hasPermission('manage_all_groups') && (
        <button>Create New Group</button>
      )}
      
      {/* Group leader sees limited options */}
      {hasPermission('manage_own_group') && (
        <button>Manage My Groups</button>
      )}
      
      {/* Show group-specific content */}
      {canManageGroup('some-group-id') && (
        <div>Group management content</div>
      )}
    </div>
  );
};

// Example 2: Protected route component
const ProtectedRoute: React.FC<{ 
  children: ReactNode; 
  requiredPermission: Permission 
}> = ({ children, requiredPermission }) => {
  const { hasPermission, loading } = useAuth();
  
  if (loading) return <div>Loading...</div>;
  
  if (!hasPermission(requiredPermission)) {
    return <div>Access Denied</div>;
  }
  
  return <>{children}</>;
};

// Example 3: Using in a component
const UserDashboard: React.FC = () => {
  const { profile, getUserGroups, getUserDepartments } = useAuth();
  
  const userGroups = getUserGroups();
  const userDepartments = getUserDepartments();
  
  return (
    <div>
      <h2>Welcome, {profile?.name}</h2>
      <p>Role: {profile?.role}</p>
      
      <div>
        <h3>Your Groups:</h3>
        {userGroups.map(group => (
          <div key={group}>{group}</div>
        ))}
      </div>
      
      <div>
        <h3>Your Departments:</h3>
        {userDepartments.map(dept => (
          <div key={dept}>{dept}</div>
        ))}
      </div>
    </div>
  );
};
