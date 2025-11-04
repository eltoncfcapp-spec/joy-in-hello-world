// pages/Departments.tsx
import { useState, useEffect } from 'react';
import { Building, Plus, Users, Mail, Phone, MapPin, Edit, Trash2, Search } from 'lucide-react';
import { supabase } from '../integrations/supabase/client';

interface Department {
  id: string;
  name: string;
  description: string | null;
  leader_id: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  meeting_schedule: string | null;
  created_at: string;
  members_count?: number;
  leader?: {
    name: string;
    surname: string;
  } | null;
}

const Departments = () => {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchDepartments();
  }, []);

  const fetchDepartments = async () => {
    try {
      const { data, error } = await supabase
        .from('ministry_groups')
        .select(`
          *,
          leader:members!ministry_groups_leader_id_fkey(name, surname),
          members:members!members_ministry_group_id_fkey(count)
        `);

      if (error) throw error;
      setDepartments(data || []);
    } catch (error) {
      console.error('Error fetching departments:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredDepartments = departments.filter(dept =>
    dept.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    dept.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600 dark:text-gray-400">Loading departments...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
              Ministry Departments
            </h1>
            <p className="text-gray-600 dark:text-gray-400">Manage church departments and ministry groups</p>
          </div>
          <button 
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:shadow-lg transition-all duration-200 hover:scale-105 font-medium group"
          >
            <Plus className="h-5 w-5 group-hover:rotate-90 transition-transform duration-200" />
            Add Department
          </button>
        </div>

        {/* Search Bar */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-3.5 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search departments..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Departments Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredDepartments.map((department) => (
            <div key={department.id} className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-6 hover:shadow-xl transition-all duration-300">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
                    <Building className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                      {department.name}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {department.members_count || 0} members
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
                    <Edit className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                  </button>
                  <button className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors">
                    <Trash2 className="h-4 w-4 text-red-600 dark:text-red-400" />
                  </button>
                </div>
              </div>

              {department.description && (
                <p className="text-gray-600 dark:text-gray-400 mb-4 text-sm">
                  {department.description}
                </p>
              )}

              <div className="space-y-2 text-sm">
                {department.leader && (
                  <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                    <Users className="h-4 w-4" />
                    <span>Leader: {department.leader.name} {department.leader.surname}</span>
                  </div>
                )}
                {department.contact_email && (
                  <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                    <Mail className="h-4 w-4" />
                    <span>{department.contact_email}</span>
                  </div>
                )}
                {department.contact_phone && (
                  <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                    <Phone className="h-4 w-4" />
                    <span>{department.contact_phone}</span>
                  </div>
                )}
                {department.meeting_schedule && (
                  <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                    <MapPin className="h-4 w-4" />
                    <span>Meets: {department.meeting_schedule}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {filteredDepartments.length === 0 && (
          <div className="text-center py-12 bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl border border-gray-200/50 dark:border-gray-700/50 rounded-2xl">
            <Building className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-600 dark:text-gray-400 mb-2">No Departments Found</h3>
            <p className="text-gray-500 dark:text-gray-500">
              {searchTerm ? 'Try adjusting your search terms' : 'Create your first department to get started'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Departments;
