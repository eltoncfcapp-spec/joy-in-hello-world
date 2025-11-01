import { Users, Plus, Calendar, User, Search, X, MapPin, Clock, Mail, Phone, ChevronDown } from 'lucide-react';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface Group {
  id: string;
  name: string;
  description: string | null;
  meeting_day: string;
  meeting_time: string;
  category: string;
  leader_id: string | null;
  leader?: {
    name: string;
    surname: string;
  };
  group_members?: {
    member: {
      id: string;
      name: string;
      surname: string;
      email: string | null;
      phone: string | null;
    };
  }[];
}

interface Member {
  id: string;
  name: string;
  surname: string;
  email: string | null;
  phone: string | null;
  cell_group_id: string | null;
}

const Groups = () => {
  const [showForm, setShowForm] = useState(false);
  const [groups, setGroups] = useState<Group[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isMemberDropdownOpen, setIsMemberDropdownOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    meetingDay: '',
    meetingTime: '',
    category: '',
    leaderId: '',
  });

  const categories = [
    'Youth',
    'Fellowship',
    'Prayer',
    'Worship',
    'Study',
    'Outreach',
    'Service',
    'Support'
  ];

  const daysOfWeek = [
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday',
    'Sunday'
  ];

  const categoryColors: Record<string, string> = {
    Youth: 'from-blue-500 to-blue-600',
    Fellowship: 'from-purple-500 to-purple-600',
    Prayer: 'from-green-500 to-green-600',
    Worship: 'from-orange-500 to-orange-600',
    Study: 'from-pink-500 to-pink-600',
    Outreach: 'from-red-500 to-red-600',
    Service: 'from-teal-500 to-teal-600',
    Support: 'from-indigo-500 to-indigo-600',
  };

  useEffect(() => {
    fetchGroups();
    fetchMembers();
  }, []);

  const fetchGroups = async () => {
    const { data, error } = await supabase
      .from('cell_groups')
      .select(`
        *,
        leader:members(name, surname),
        group_members(
          member:members(id, name, surname, email, phone)
        )
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching groups:', error);
    } else {
      setGroups(data || []);
    }
  };

  const fetchMembers = async () => {
    const { data, error } = await supabase
      .from('members')
      .select('*')
      .order('name');

    if (error) {
      console.error('Error fetching members:', error);
    } else {
      setMembers(data || []);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // First, create the group
      const { data: group, error: groupError } = await supabase
        .from('cell_groups')
        .insert({
          name: formData.name,
          description: formData.description || null,
          meeting_day: formData.meetingDay,
          meeting_time: formData.meetingTime,
          category: formData.category,
          leader_id: formData.leaderId || null,
        })
        .select()
        .single();

      if (groupError) throw groupError;

      // Then, add selected members to the group
      if (selectedMembers.length > 0) {
        const groupMembers = selectedMembers.map(memberId => ({
          group_id: group.id,
          member_id: memberId,
        }));

        const { error: membersError } = await supabase
          .from('group_members')
          .insert(groupMembers);

        if (membersError) throw membersError;
      }

      // Reset form and refresh data
      resetForm();
      fetchGroups();
      alert('Group created successfully!');
    } catch (error) {
      console.error('Error creating group:', error);
      alert('Error creating group');
    }
    setLoading(false);
  };

  const resetForm = () => {
    setShowForm(false);
    setFormData({
      name: '',
      description: '',
      meetingDay: '',
      meetingTime: '',
      category: '',
      leaderId: '',
    });
    setSelectedMembers([]);
    setSearchTerm('');
    setIsMemberDropdownOpen(false);
  };

  const handleMemberSelect = (memberId: string) => {
    if (selectedMembers.includes(memberId)) {
      setSelectedMembers(selectedMembers.filter(id => id !== memberId));
    } else {
      setSelectedMembers([...selectedMembers, memberId]);
    }
  };

  const handleLeaderSelect = (memberId: string) => {
    setFormData({ ...formData, leaderId: memberId });
    setIsMemberDropdownOpen(false);
  };

  const filteredMembers = members.filter(member => 
    `${member.name} ${member.surname}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
    member.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    member.phone?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getSelectedMemberDetails = () => {
    return selectedMembers.map(id => members.find(m => m.id === id)).filter(Boolean);
  };

  const getInitials = (name: string, surname: string) => {
    return `${name.charAt(0)}${surname.charAt(0)}`.toUpperCase();
  };

  const getMemberCount = (group: Group) => {
    return group.group_members?.length || 0;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-6 animate-fadeIn">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
              Groups & Ministries
            </h1>
            <p className="text-gray-600 dark:text-gray-400">Manage church groups and member assignments</p>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:shadow-lg transition-all duration-200 hover:scale-105 font-medium group"
          >
            <Plus className="h-5 w-5 group-hover:rotate-90 transition-transform duration-200" />
            {showForm ? 'Cancel' : 'Create Group'}
          </button>
        </div>

        {/* Create Group Form */}
        {showForm && (
          <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-6 mb-8 shadow-lg hover:shadow-xl transition-all duration-300">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Create New Group</h2>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Group Name *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                    placeholder="Enter group name"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Category *</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                    required
                  >
                    <option value="">Select category</option>
                    {categories.map(category => (
                      <option key={category} value={category}>{category}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Meeting Day *</label>
                  <select
                    value={formData.meetingDay}
                    onChange={(e) => setFormData({ ...formData, meetingDay: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                    required
                  >
                    <option value="">Select day</option>
                    {daysOfWeek.map(day => (
                      <option key={day} value={day}>{day}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Meeting Time *</label>
                  <input
                    type="time"
                    value={formData.meetingTime}
                    onChange={(e) => setFormData({ ...formData, meetingTime: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                    required
                  />
                </div>
                <div className="md:col-span-2 space-y-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Description</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                    placeholder="Describe the group's purpose and activities..."
                  />
                </div>
              </div>

              {/* Leader Selection */}
              <div className="space-y-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Group Leader</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => {
                      setSearchTerm(e.target.value);
                      setIsMemberDropdownOpen(true);
                    }}
                    onFocus={() => setIsMemberDropdownOpen(true)}
                    placeholder="Search for a leader..."
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                  />
                </div>

                {/* Selected Leader Display */}
                {formData.leaderId && (
                  <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-semibold">
                        {getInitials(
                          members.find(m => m.id === formData.leaderId)?.name || '',
                          members.find(m => m.id === formData.leaderId)?.surname || ''
                        )}
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-900 dark:text-white">
                          {members.find(m => m.id === formData.leaderId)?.name} {members.find(m => m.id === formData.leaderId)?.surname}
                        </h4>
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          Selected as Leader
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, leaderId: '' })}
                        className="text-gray-400 hover:text-gray-600 transition-colors"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                )}

                {/* Member Dropdown */}
                {isMemberDropdownOpen && filteredMembers.length > 0 && (
                  <div className="absolute z-10 w-full max-w-2xl mt-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl shadow-lg max-h-60 overflow-y-auto">
                    {filteredMembers.map((member) => (
                      <button
                        key={member.id}
                        type="button"
                        onClick={() => handleLeaderSelect(member.id)}
                        className="w-full text-left p-4 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors duration-150 border-b border-gray-100 dark:border-gray-600 last:border-b-0"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white text-sm font-semibold">
                            {getInitials(member.name, member.surname)}
                          </div>
                          <div className="flex-1">
                            <div className="font-medium text-gray-900 dark:text-white">
                              {member.name} {member.surname}
                            </div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">
                              {member.email} • {member.phone}
                            </div>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Member Selection */}
              <div className="space-y-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Add Members ({selectedMembers.length} selected)
                </label>
                
                {/* Selected Members Display */}
                {getSelectedMemberDetails().length > 0 && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {getSelectedMemberDetails().map((member) => (
                      <div key={member!.id} className="flex items-center gap-3 bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
                        <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-blue-500 rounded-full flex items-center justify-center text-white text-sm font-semibold">
                          {getInitials(member!.name, member!.surname)}
                        </div>
                        <div className="flex-1">
                          <div className="font-medium text-gray-900 dark:text-white text-sm">
                            {member!.name} {member!.surname}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleMemberSelect(member!.id)}
                          className="text-gray-400 hover:text-red-500 transition-colors"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Available Members List */}
                <div className="border border-gray-300 dark:border-gray-600 rounded-xl max-h-60 overflow-y-auto">
                  {members.map((member) => (
                    <div
                      key={member.id}
                      className="flex items-center gap-3 p-4 border-b border-gray-200 dark:border-gray-600 last:border-b-0 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={selectedMembers.includes(member.id)}
                        onChange={() => handleMemberSelect(member.id)}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                      />
                      <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white text-sm font-semibold">
                        {getInitials(member.name, member.surname)}
                      </div>
                      <div className="flex-1">
                        <div className="font-medium text-gray-900 dark:text-white">
                          {member.name} {member.surname}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {member.email} • {member.phone}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:shadow-lg transition-all duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Plus className="h-4 w-4" />
                  {loading ? 'Creating Group...' : 'Create Group'}
                </button>
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200 font-medium"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Groups Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {groups.length === 0 ? (
            <div className="col-span-full text-center py-12 bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl border border-gray-200/50 dark:border-gray-700/50 rounded-2xl">
              <Users className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-600 dark:text-gray-400 mb-2">No Groups Yet</h3>
              <p className="text-gray-500 dark:text-gray-500">Create your first group to get started</p>
            </div>
          ) : (
            groups.map((group) => (
              <div
                key={group.id}
                className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-6 hover:shadow-xl transition-all duration-300 hover:border-gray-300/50 dark:hover:border-gray-600/50 hover:scale-[1.02] group"
              >
                <div className="flex items-start gap-4 mb-4">
                  <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${categoryColors[group.category] || 'from-gray-500 to-gray-600'} flex items-center justify-center shadow-lg`}>
                    <Users className="h-7 w-7 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">{group.name}</h3>
                    <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full text-sm font-medium">
                      {group.category}
                    </span>
                  </div>
                </div>

                <p className="text-gray-600 dark:text-gray-400 mb-4 line-clamp-2">
                  {group.description || 'No description available'}
                </p>

                <div className="space-y-3 mb-4">
                  <div className="flex items-center gap-3 text-gray-600 dark:text-gray-400">
                    <User className="h-4 w-4" />
                    <span className="font-medium">
                      Leader: {group.leader ? `${group.leader.name} ${group.leader.surname}` : 'Not assigned'}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-gray-600 dark:text-gray-400">
                    <Users className="h-4 w-4" />
                    <span className="font-medium">{getMemberCount(group)} Members</span>
                  </div>
                  <div className="flex items-center gap-3 text-gray-600 dark:text-gray-400">
                    <Calendar className="h-4 w-4" />
                    <span className="font-medium">{group.meeting_day}s at {group.meeting_time}</span>
                  </div>
                </div>

                <button className="w-full px-4 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:shadow-lg transition-all duration-200 font-medium group">
                  View Details
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default Groups;
