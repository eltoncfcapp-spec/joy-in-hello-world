import { useState, useEffect } from 'react';
import { 
  Users, Calendar, TrendingUp, MoreVertical, 
  ArrowUp, ArrowDown, X, Plus, UserPlus, MapPin, Clock,
  ChevronDown, ChevronUp, PhoneCall, AlertTriangle
} from 'lucide-react';
import { supabase } from '../integrations/supabase/client';
import { useAuth } from '../contexts/AuthContext';

interface StatCardProps {
  icon: typeof Users;
  title: string;
  value: string;
  change: string;
  changeType: 'positive' | 'negative' | 'info';
}

const StatCard: React.FC<StatCardProps> = ({ icon: Icon, title, value, change, changeType }) => {
  const colorMap: Record<typeof changeType, string> = {
    positive: 'bg-green-100 text-green-700',
    negative: 'bg-red-100 text-red-700',
    info: 'bg-blue-100 text-blue-700'
  };

  return (
    <div className="bg-white rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start">
        <div className="bg-primary/10 p-2 rounded-lg">
          <Icon className="h-6 w-6 text-primary" />
        </div>
        <MoreVertical className="h-5 w-5 text-gray-400 cursor-pointer" />
      </div>
      <h3 className="text-3xl font-bold mt-4 mb-2">{value}</h3>
      <p className="text-gray-600 mb-1">{title}</p>
      <div className={`flex items-center gap-1 text-xs font-medium ${colorMap[changeType]} px-2 py-1 rounded-full`}>
        {changeType === 'positive' && <ArrowUp className="h-3 w-3" />}
        {changeType === 'negative' && <ArrowDown className="h-3 w-3" />}
        {change}
      </div>
    </div>
  );
};

export default function Dashboard() {
  const { user } = useAuth();
  const [expandedSections, setExpandedSections] = useState({
    activity: true,
    events: true,
    groups: true
  });
  
  // ... (other state variables)

  useEffect(() => {
    loadDashboardData();
  }, [user]);

  const loadDashboardData = async () => {
    // ... (data loading logic with role-based filtering)
  };

  // Role-based access control
  const canSeeAllGroups = user?.role === 'admin';
  const canEditMembers = user?.permissions.canEditMembers;
  const canAddMembers = user?.permissions.canAddMembers;

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
        <StatCard 
          icon={Users} 
          title="Total Members" 
          value="128" 
          change="12 new this month" 
          changeType="positive" 
        />
        {/* ...other stat cards */}
      </div>

      {/* Activity Section */}
      <div className="bg-white rounded-xl mb-6">
        <div 
          className="flex justify-between items-center p-5 cursor-pointer"
          onClick={() => setExpandedSections(prev => ({
            ...prev,
            activity: !prev.activity
          }))}
        >
          <h2 className="text-lg font-semibold">Recent Activity</h2>
          {expandedSections.activity 
            ? <ChevronUp className="h-5 w-5" /> 
            : <ChevronDown className="h-5 w-5" />
          }
        </div>
        
        {expandedSections.activity && (
          <div className="p-5">
            {/* Activity items with role-based editing */}
          </div>
        )}
      </div>

      {/* Quick Actions */}
      {canAddMembers && (
        <div className="bg-white rounded-xl p-5 mb-6">
          <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
          <div className="flex gap-3 flex-wrap">
            <button className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
              <Plus className="h-4 w-4" /> Add New Member
            </button>
            {canSeeAllGroups && (
              <button className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700">
                <UserPlus className="h-4 w-4" /> Create Event
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
