            )}
          </div>
        </Modal>
      )}

      {activeModal === 'addMember' && (
        <Modal title="Add New Member">
          <form onSubmit={handleAddMember} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  First Name *
                </label>
                <input
                  type="text"
                  required
                  value={newMember.name}
                  onChange={(e) => setNewMember({...newMember, name: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Last Name *
                </label>
                <input
                  type="text"
                  required
                  value={newMember.surname}
                  onChange={(e) => setNewMember({...newMember, surname: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Email
              </label>
              <input
                type="email"
                value={newMember.email}
                onChange={(e) => setNewMember({...newMember, email: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Phone
              </label>
              <input
                type="tel"
                value={newMember.phone}
                onChange={(e) => setNewMember({...newMember, phone: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Invited By
              </label>
              <input
                type="text"
                value={newMember.invited_by}
                onChange={(e) => setNewMember({...newMember, invited_by: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Cell Group
              </label>
              <select
                value={newMember.cell_group_id}
                onChange={(e) => setNewMember({...newMember, cell_group_id: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
              >
                <option value="">Select a cell group</option>
                {cellGroups.map(group => (
                  <option key={group.id} value={group.id}>{group.name}</option>
                ))}
              </select>
            </div>
            
            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={closeModal}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                Add Member
              </button>
            </div>
          </form>
        </Modal>
      )}

      {activeModal === 'createEvent' && (
        <Modal title="Create Event">
          <form onSubmit={handleCreateEvent} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Event Name *
              </label>
              <input
                type="text"
                required
                value={newEvent.name}
                onChange={(e) => setNewEvent({...newEvent, name: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Date *
                </label>
                <input
                  type="date"
                  required
                  value={newEvent.event_date}
                  onChange={(e) => setNewEvent({...newEvent, event_date: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Time *
                </label>
                <input
                  type="time"
                  required
                  value={newEvent.event_time}
                  onChange={(e) => setNewEvent({...newEvent, event_time: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Location
              </label>
              <input
                type="text"
                value={newEvent.location}
                onChange={(e) => setNewEvent({...newEvent, location: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Topic/Description
              </label>
              <textarea
                value={newEvent.topic}
                onChange={(e) => setNewEvent({...newEvent, topic: e.target.value})}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
              />
            </div>
            
            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={closeModal}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
              >
                Create Event
              </button>
            </div>
          </form>
        </Modal>
      )}

      {activeModal === 'viewAbsentMembers' && (
        <Modal title="Members Absent for 2+ Sundays">
          <div className="space-y-4">
            <p className="text-gray-600 dark:text-gray-400 text-sm">
              Members who have missed the last 2 Sunday services and may need follow-up.
            </p>
            
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {filteredAbsentMembers.map(member => (
                <div key={member.id} className="flex items-center justify-between p-3 border border-red-200 dark:border-red-800 rounded-lg bg-red-50/50 dark:bg-red-900/20">
                  <div className="flex-1">
                    <p className="font-medium text-gray-900 dark:text-white">
                      {member.name} {member.surname}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1">
                      <PhoneCall className="h-3 w-3" />
                      {member.phone || 'No phone number'}
                    </p>
                    <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                      Missed 2 consecutive Sundays
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => {
                        if (member.phone) {
                          window.open(`tel:${member.phone}`, '_blank');
                        } else {
                          alert('No phone number available');
                        }
                      }}
                      className="p-2 text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
                      title="Call member"
                    >
                      <PhoneCall className="h-4 w-4" />
                    </button>
                    <button 
                      onClick={() => {
                        const foundMember = members.find(m => m.id === member.id);
                        if (foundMember) {
                          openMemberDetail(foundMember);
                        }
                      }}
                      className="p-2 text-gray-600 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 transition-colors"
                      title="View details"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
              {filteredAbsentMembers.length === 0 && (
                <div className="text-center py-6">
                  <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-3">
                    <TrendingUp className="h-6 w-6 text-green-600 dark:text-green-400" />
                  </div>
                  <p className="text-gray-900 dark:text-white font-medium">Great news!</p>
                  <p className="text-gray-500 dark:text-gray-400 text-sm">
                    All members have attended recent Sunday services.
                  </p>
                </div>
              )}
            </div>
            
            {filteredAbsentMembers.length > 0 && (
              <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
                  {filteredAbsentMembers.length} member{filteredAbsentMembers.length !== 1 ? 's' : ''} need{filteredAbsentMembers.length === 1 ? 's' : ''} follow-up
                </p>
              </div>
            )}
          </div>
        </Modal>
      )}

      {activeModal === 'viewEvents' && (
        <Modal title="All Events">
          <div className="space-y-4">
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {filteredEvents.map(event => (
                <button
                  key={event.id}
                  onClick={() => openEventDetail(event)}
                  className="w-full text-left p-3 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors"
                >
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-semibold text-gray-900 dark:text-white">{event.name}</h4>
                    <span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded-full">
                      {event.event_date}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-1 mb-1">
                    <Clock className="h-3 w-3" />
                    {event.event_time}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    {event.location || 'No location specified'}
                  </p>
                </button>
              ))}
              {filteredEvents.length === 0 && (
                <p className="text-gray-500 dark:text-gray-400 text-center py-6">No events found</p>
              )}
            </div>
            
            {(currentUserIsAdmin || hasPermission(currentUserPermissions, 'manage_events')) && (
              <button
                onClick={() => openModal('createEvent')}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 border border-dashed border-gray-300 dark:border-gray-600 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors"
              >
                <Plus className="h-4 w-4" />
                Create New Event
              </button>
            )}
          </div>
        </Modal>
      )}

      {activeModal === 'viewGroups' && (
        <Modal title="Cell Groups">
          <div className="space-y-4">
            <p className="text-gray-600 dark:text-gray-400 text-sm">
              {currentUserIsAdmin ? 'All active cell groups' : 'Cell groups you have access to'}
            </p>
            
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {cellGroups.map(group => {
                const groupMembers = filteredMembers.filter(m => m.cell_group_id === group.id);
                return (
                  <div key={group.id} className="p-3 border border-gray-200 dark:border-gray-700 rounded-lg">
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-semibold text-gray-900 dark:text-white">{group.name}</h4>
                      <span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded-full">
                        {groupMembers.length} members
                      </span>
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      {groupMembers.length > 0 ? (
                        <div className="space-y-1">
                          {groupMembers.slice(0, 3).map(member => (
                            <div key={member.id} className="flex items-center gap-2">
                              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                              <span>{member.name} {member.surname}</span>
                            </div>
                          ))}
                          {groupMembers.length > 3 && (
                            <p className="text-gray-500 dark:text-gray-400 text-xs">
                              +{groupMembers.length - 3} more members
                            </p>
                          )}
                        </div>
                      ) : (
                        <p className="text-gray-500 dark:text-gray-400 text-xs">No members in this group</p>
                      )}
                    </div>
                  </div>
                );
              })}
              {cellGroups.length === 0 && (
                <p className="text-gray-500 dark:text-gray-400 text-center py-6">No cell groups found</p>
              )}
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default Dashboard;
