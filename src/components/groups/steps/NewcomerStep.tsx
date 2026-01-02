import { useState, useEffect } from 'react';
import { supabase } from '../../../integrations/supabase/client';
import { UserPlus, User, Phone, Mail, Search } from 'lucide-react';

interface NewcomerStepProps {
  group: any;
  selectedMeeting: any;
  onNewcomerAdded: () => void;
  onError: (message: string) => void;
}

interface ChurchMember {
  id: string;
  name: string;
  surname: string;
  phone: string | null;
}

const NewcomerStep: React.FC<NewcomerStepProps> = ({
  group,
  selectedMeeting,
  onNewcomerAdded,
  onError
}) => {
  const [loading, setLoading] = useState(false);
  const [churchMembers, setChurchMembers] = useState<ChurchMember[]>([]);
  const [filteredMembers, setFilteredMembers] = useState<ChurchMember[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showMemberDropdown, setShowMemberDropdown] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    surname: '',
    phone: '',
    gender: '' as 'male' | 'female',
    invited_by: '',
    invited_by_member_id: '',
    notes: ''
  });

  // Load all church members for the "Invited By" dropdown
  useEffect(() => {
    loadChurchMembers();
  }, []);

  // Filter members based on search term
  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredMembers(churchMembers.slice(0, 10)); // Show first 10 members when no search
    } else {
      const filtered = churchMembers.filter(member =>
        `${member.name} ${member.surname}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
        member.phone?.includes(searchTerm)
      ).slice(0, 10); // Limit to 10 results
      setFilteredMembers(filtered);
    }
  }, [searchTerm, churchMembers]);

  const loadChurchMembers = async () => {
    try {
      // Get all members from the church (excluding newcomers if needed)
      const { data, error } = await supabase
        .from('members')
        .select('id, name, surname, phone')
        .neq('status', 'newcomer') // Optional: exclude newcomers from inviting
        .order('name');

      if (error) throw error;
      setChurchMembers((data || []) as ChurchMember[]);
      setFilteredMembers((data?.slice(0, 10) || []) as ChurchMember[]);
    } catch (error: any) {
      console.error('Failed to load church members:', error);
    }
  };

  const handleMemberSelect = (member: ChurchMember) => {
    setFormData({
      ...formData,
      invited_by: `${member.name} ${member.surname}`,
      invited_by_member_id: member.id
    });
    setSearchTerm(`${member.name} ${member.surname}`);
    setShowMemberDropdown(false);
  };

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    if (value.trim() === '') {
      setFormData({
        ...formData,
        invited_by: '',
        invited_by_member_id: ''
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.surname) {
      onError('Name and surname are required');
      return;
    }

    try {
      setLoading(true);
      const { error } = await supabase
        .from('members')
        .insert([{
          name: formData.name,
          surname: formData.surname,
          phone: formData.phone,
          gender: formData.gender,
          residence: 'Unknown',
          cell_group_id: group.id,
          status: 'newcomer',
          invited_by: formData.invited_by,
          first_time_visit_date: new Date().toISOString()
        }]);

      if (error) throw error;

      // Reset form
      setFormData({
        name: '',
        surname: '',
        phone: '',
        gender: '' as 'male' | 'female',
        invited_by: '',
        invited_by_member_id: '',
        notes: ''
      });
      setSearchTerm('');
      
      onNewcomerAdded();
    } catch (error: any) {
      onError('Failed to add newcomer: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <UserPlus className="h-8 w-8 text-purple-600" />
        </div>
        <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Add Newcomer</h3>
        <p className="text-gray-600 dark:text-gray-400">
          {selectedMeeting 
            ? `Register first-time visitor for ${new Date(selectedMeeting.meeting_date).toLocaleDateString()}`
            : 'Register a first-time visitor to the group'
          }
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              First Name *
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Enter first name"
                className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Last Name *
            </label>
            <input
              type="text"
              required
              value={formData.surname}
              onChange={(e) => setFormData({ ...formData, surname: e.target.value })}
              placeholder="Enter last name"
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Phone Number
            </label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="Enter phone number"
                className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Gender
            </label>
            <select
              value={formData.gender}
              onChange={(e) => setFormData({ ...formData, gender: e.target.value as 'male' | 'female' })}
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Select gender</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
            </select>
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Invited By (Select from church members)
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5 z-10" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => handleSearchChange(e.target.value)}
                onFocus={() => setShowMemberDropdown(true)}
                placeholder="Search for church member..."
                className="w-full pl-10 pr-10 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              
              {/* Member Dropdown */}
              {showMemberDropdown && (
                <>
                  {/* Backdrop */}
                  <div 
                    className="fixed inset-0 z-20"
                    onClick={() => setShowMemberDropdown(false)}
                  />
                  
                  {/* Dropdown List */}
                  <div className="absolute top-full left-0 right-0 z-30 mt-1 max-h-60 overflow-y-auto bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl shadow-lg">
                    {filteredMembers.length === 0 ? (
                      <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                        No members found
                      </div>
                    ) : (
                      filteredMembers.map((member) => (
                        <button
                          key={member.id}
                          type="button"
                          onClick={() => handleMemberSelect(member)}
                          className="w-full p-3 text-left hover:bg-gray-100 dark:hover:bg-gray-600 border-b border-gray-200 dark:border-gray-500 last:border-b-0 transition-colors"
                        >
                          <div className="font-medium text-gray-900 dark:text-white">
                            {member.name} {member.surname}
                          </div>
                          <div className="text-sm text-gray-600 dark:text-gray-400">
                            {member.phone || 'No phone'}
                          </div>
                        </button>
                      ))
                    )}
                    
                    {/* Manual entry option */}
                    <button
                      type="button"
                      onClick={() => {
                        setShowMemberDropdown(false);
                        setFormData(prev => ({
                          ...prev,
                          invited_by: searchTerm,
                          invited_by_member_id: ''
                        }));
                      }}
                      className="w-full p-3 text-left hover:bg-gray-100 dark:hover:bg-gray-600 border-t border-gray-200 dark:border-gray-500 transition-colors text-blue-600 dark:text-blue-400 font-medium"
                    >
                      + Use custom name: "{searchTerm}"
                    </button>
                  </div>
                </>
              )}
            </div>
            
            {/* Selected member display */}
            {formData.invited_by_member_id && (
              <div className="mt-2 p-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                <div className="text-sm text-green-800 dark:text-green-300">
                  <strong>Selected:</strong> {formData.invited_by}
                </div>
              </div>
            )}
            
            {formData.invited_by && !formData.invited_by_member_id && (
              <div className="mt-2 p-2 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                <div className="text-sm text-yellow-800 dark:text-yellow-300">
                  <strong>Custom entry:</strong> {formData.invited_by}
                </div>
              </div>
            )}
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Notes
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
              placeholder="Any additional notes about the newcomer..."
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        <div className="flex justify-center pt-4">
          <button
            type="submit"
            disabled={loading}
            className="px-8 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl transition-all duration-200 font-medium disabled:opacity-50 flex items-center gap-2"
          >
            <UserPlus className="h-4 w-4" />
            {loading ? 'Adding...' : 'Add Newcomer'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default NewcomerStep;
