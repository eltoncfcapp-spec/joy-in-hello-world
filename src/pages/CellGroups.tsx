{/* Edit modal */}
{showEditForm && selectedGroup && (
  <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
    <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-2xl font-bold text-gray-900 dark:text-white">Edit Cell Group</h3>
        <button
          onClick={() => setShowEditForm(false)}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
      <form onSubmit={handleUpdateGroup} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Group Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Group Name *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>
          {/* Location */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Location</label>
            <input
              type="text"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          {/* Meeting Day */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Meeting Day</label>
            <select
              value={formData.meeting_day}
              onChange={(e) => setFormData({ ...formData, meeting_day: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Select day</option>
              {daysOfWeek.map(day => (
                <option key={day} value={day}>{day}</option>
              ))}
            </select>
          </div>
          {/* Meeting Time */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Meeting Time</label>
            <input
              type="time"
              value={formData.meeting_time}
              onChange={(e) => setFormData({ ...formData, meeting_time: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          {/* Group Leader */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Group Leader</label>
            <select
              value={formData.leader_id}
              onChange={(e) => setFormData({ ...formData, leader_id: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Select leader</option>
              {members.map(member => (
                <option key={member.id} value={member.id}>
                  {member.name} {member.surname}
                </option>
              ))}
            </select>
          </div>
        </div>
        {/* Buttons */}
        <div className="flex gap-3 pt-4">
          <button
            type="submit"
            disabled={loading}
            className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Updating...' : 'Update Cell Group'}
          </button>
          <button
            type="button"
            onClick={() => setShowEditForm(false)}
            className="px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  </div>
)}

{/* Members modal */}
{showMembersModal && selectedGroup && (
  <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
    <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
      {/* Modal Header */}
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
          {selectedGroup.name} - Members ({selectedGroup.members?.length || 0})
        </h3>
        <button
          onClick={() => setShowMembersModal(false)}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Add Members Section - only if user can manage */}
      {canManageGroup(selectedGroup) && (
        <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-6 mb-6">
          <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Add Members to Group</h4>
          
          <div className="space-y-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search members to add..."
                className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            {/* Available Members List */}
            {availableMembers.length === 0 ? (
              <div className="text-center py-4 text-gray-500 dark:text-gray-400">
                {searchTerm ? 'No members found matching your search' : 'No available members to add'}
              </div>
            ) : (
              <div className="border border-gray-300 dark:border-gray-600 rounded-xl max-h-60 overflow-y-auto">
                {availableMembers.map((member) => (
                  <div key={member.id} className="flex items-center gap-3 p-4 border-b border-gray-200 dark:border-gray-600 last:border-b-0 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors">
                    <input
                      type="checkbox"
                      checked={selectedMembers.includes(member.id)}
                      onChange={() => {
                        if (selectedMembers.includes(member.id)) {
                          setSelectedMembers(selectedMembers.filter(id => id !== member.id));
                        } else {
                          setSelectedMembers([...selectedMembers, member.id]);
                        }
                      }}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                    />
                    <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white text-sm font-semibold">
                      {getInitials(member.name, member.surname)}
                    </div>
                    <div className="flex-1">
                      <div className="font-medium text-gray-900 dark:text-white">{member.name} {member.surname}</div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">{member.email} • {member.phone}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Add as role dropdown */}
            {selectedMembers.length > 0 && (
              <div className="flex gap-3">
                <select
                  onChange={(e) => {
                    const role = e.target.value;
                    handleAddMembersToGroup(selectedGroup.id, selectedMembers, role);
                  }}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="member">Add as Member</option>
                  <option value="leader">Add as Leader</option>
                  <option value="assistant">Add as Assistant</option>
                </select>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Current Members List */}
      <div>
        <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Current Members</h4>
        {!selectedGroup.members || selectedGroup.members.length === 0 ? (
          <div className="text-center py-8">
            <Users className="h-12 w-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600 dark:text-gray-400">No members in this group yet</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {selectedGroup.members.map((groupMember) => (
              <div key={groupMember.id} className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600/50 transition-colors">
                {/* Member Info */}
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-semibold">
                    {getInitials(groupMember.member?.name || '', groupMember.member?.surname || '')}
                  </div>
                  <div>
                    <div className="font-medium text-gray-900 dark:text-white">{groupMember.member?.name} {groupMember.member?.surname}</div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">{groupMember.member?.phone || 'No phone'}</div>
                  </div>
                </div>

                {/* Role and Actions */}
                <div className="flex items-center gap-3">
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-medium ${
                      groupMember.role === 'leader'
                        ? 'bg-yellow-100 text-yellow-800'
                        : groupMember.role === 'assistant'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {groupMember.role}
                  </span>
                  {canManageGroup(selectedGroup) && (
                    <>
                      <select
                        value={groupMember.role}
                        onChange={(e) => handleUpdateMemberRole(groupMember.id, e.target.value)}
                        className="px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm bg-white dark:bg-gray-700"
                      >
                        <option value="member">Member</option>
                        <option value="leader">Leader</option>
                        <option value="assistant">Assistant</option>
                      </select>
                      <button
                        onClick={() => handleRemoveMemberFromGroup(groupMember.id)}
                        className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                        title="Remove from group"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  </div>
)}
</div>
);
