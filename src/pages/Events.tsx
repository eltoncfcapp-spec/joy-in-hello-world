import { Calendar as CalendarIcon, Clock, MapPin, Plus, Phone, X, User, Search, Mail, Building, Users as UsersIcon, CheckCircle, AlertCircle, Upload, FileText, Eye, BookOpen, Download, PlayCircle, AlertTriangle, Edit, Trash2 } from 'lucide-react';
import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { supabase } from '../integrations/supabase/client';
import { useAuth } from '../contexts/AuthContext';

interface Event {
  id: string;
  name: string;
  topic: string | null;
  event_date: string;
  event_time: string;
  location: string | null;
  created_at: string | null;
  updated_at: string | null;
  is_whole_church: boolean;
  target_groups: string[] | null;
  target_departments: string[] | null;
  is_completed: boolean;
  completed_at: string | null;
  pamphlet_url: string | null;
  last_synced_at: string | null;
  backup_file_url: string | null;
  backup_created_at: string | null;
}

interface Sermon {
  id: string;
  title: string;
  summary: string;
  pastor_name: string;
  sermon_date: string;
  event_id: string | null;
  video_url: string | null;
  document_url: string | null;
  created_at: string | null;
  updated_at: string | null;
  events?: {
    name: string;
    topic: string | null;
  } | null;
}

interface Member {
  id: string;
  name: string;
  surname: string;
  login_username: string | null;
  phone: string | null;
  cell_group_id: string | null;
  status: 'newcomer' | 'signed_member' | 'not_attending' | null;
  cell_group_name?: string | null;
  ministry_group_names?: string[];
  department_names?: string[];
}

interface CellGroup {
  id: string;
  name: string;
}

interface MinistryGroup {
  id: string;
  name: string;
}

interface Department {
  id: string;
  name: string;
}

interface EventAttendee {
  id: string;
  event_id: string;
  members_id: string;
  first_time: boolean | null;
  invited_by_id: string | null;
  attended_at: string | null;
  attendance_status: 'present' | 'absent' | string | null;
  notes?: string | null;
  members: Member;
  invited_by_member?: {
    id: string;
    name: string;
    surname: string;
  } | null;
}

interface SermonModalProps {
  showSermonModal: string | null;
  closeSermonModal: () => void;
  sermonFormData: {
    title: string;
    summary: string;
    pastorName: string;
    sermonDate: string;
    eventId: string;
    videoFile: File | null;
    documentFile: File | null;
    existingVideoUrl: string;
    existingDocumentUrl: string;
  };
  setSermonFormData: React.Dispatch<React.SetStateAction<{
    title: string;
    summary: string;
    pastorName: string;
    sermonDate: string;
    eventId: string;
    videoFile: File | null;
    documentFile: File | null;
    existingVideoUrl: string;
    existingDocumentUrl: string;
  }>>;
  editingSermon: Sermon | null;
  sermonLoading: string | null;
  uploadingSermonFile: { type: string; eventId?: string } | null;
  handleSermonSubmit: (e: React.FormEvent) => Promise<void>;
}

const SermonModal = ({ 
  showSermonModal, 
  closeSermonModal, 
  sermonFormData, 
  setSermonFormData,
  editingSermon,
  sermonLoading,
  uploadingSermonFile,
  handleSermonSubmit 
}: SermonModalProps) => {
  // ✅ ALL HOOKS MUST BE AT THE TOP, BEFORE ANY RETURNS
  const modalTitle = useMemo(() => {
    if (editingSermon) return 'Edit Sermon';
    if (showSermonModal === 'new') return 'Add New Sermon';
    return 'Add Sermon to Event';
  }, [editingSermon, showSermonModal]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setSermonFormData(prev => ({ ...prev, [name]: value }));
  }, [setSermonFormData]);

  const handleFileChange = useCallback((type: 'video' | 'document', file: File | null) => {
    setSermonFormData(prev => ({
      ...prev,
      [type === 'video' ? 'videoFile' : 'documentFile']: file
    }));
  }, [setSermonFormData]);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    await handleSermonSubmit(e);
  }, [handleSermonSubmit]);

  // ✅ NOW the conditional return comes AFTER all hooks
  if (!showSermonModal) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white">
            {modalTitle}
          </h3>
          <button
            onClick={closeSermonModal}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors duration-200"
            aria-label="Close modal"
          >
            <X className="h-5 w-5 text-gray-500 dark:text-gray-400" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Sermon Title *
              </label>
              <input
                type="text"
                name="title"
                value={sermonFormData.title}
                onChange={handleInputChange}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                placeholder="Enter sermon title"
                required
                minLength={2}
                maxLength={200}
              />
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Sermon Summary *
              </label>
              <textarea
                name="summary"
                value={sermonFormData.summary}
                onChange={handleInputChange}
                rows={4}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 resize-none"
                placeholder="Enter the sermon summary, key points, scriptures, and main message..."
                required
                minLength={10}
                maxLength={1000}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Pastor Name *
                </label>
                <input
                  type="text"
                  name="pastorName"
                  value={sermonFormData.pastorName}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                  placeholder="Enter pastor's name"
                  required
                  minLength={2}
                  maxLength={100}
                />
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Sermon Date *
                </label>
                <input
                  type="date"
                  name="sermonDate"
                  value={sermonFormData.sermonDate}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                  required
                />
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Video File
                  </label>
                  <div className="flex items-center gap-1 px-2 py-1 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 rounded-lg text-xs">
                    <AlertTriangle className="h-3 w-3" />
                    <span>Development - Large Storage</span>
                  </div>
                </div>
                
                {sermonFormData.existingVideoUrl && (
                  <div className="mb-3 p-3 bg-purple-50 border border-purple-200 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <PlayCircle className="h-4 w-4 text-purple-600" />
                        <span className="text-sm text-purple-700">Video file already uploaded</span>
                      </div>
                      <a
                        href={sermonFormData.existingVideoUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-purple-600 hover:text-purple-700 text-sm"
                      >
                        View
                      </a>
                    </div>
                  </div>
                )}

                <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl cursor-pointer hover:border-purple-500 dark:hover:border-purple-400 transition-all duration-200">
                  <div className="flex flex-col items-center justify-center pt-3 pb-4">
                    <PlayCircle className="h-6 w-6 text-gray-400 mb-1" />
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {sermonFormData.videoFile ? sermonFormData.videoFile.name : 'Click to upload video (MP4, MOV, AVI)'}
                    </p>
                    {uploadingSermonFile?.type === 'video' && (
                      <p className="text-xs text-blue-500 mt-1">Uploading...</p>
                    )}
                  </div>
                  <input
                    type="file"
                    accept="video/*"
                    onChange={(e) => handleFileChange('video', e.target.files?.[0] || null)}
                    className="hidden"
                  />
                </label>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Sermon Notes (PDF/DOC)
                </label>
                
                {sermonFormData.existingDocumentUrl && (
                  <div className="mb-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-green-600" />
                        <span className="text-sm text-green-700">Document file already uploaded</span>
                      </div>
                      <a
                        href={sermonFormData.existingDocumentUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-green-600 hover:text-green-700 text-sm"
                      >
                        View
                      </a>
                    </div>
                  </div>
                )}

                <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl cursor-pointer hover:border-green-500 dark:hover:border-green-400 transition-all duration-200">
                  <div className="flex flex-col items-center justify-center pt-3 pb-4">
                    <FileText className="h-6 w-6 text-gray-400 mb-1" />
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {sermonFormData.documentFile ? sermonFormData.documentFile.name : 'Click to upload notes (PDF, DOC, DOCX, TXT)'}
                    </p>
                    {uploadingSermonFile?.type === 'document' && (
                      <p className="text-xs text-blue-500 mt-1">Uploading...</p>
                    )}
                  </div>
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx,.txt"
                    onChange={(e) => handleFileChange('document', e.target.files?.[0] || null)}
                    className="hidden"
                  />
                </label>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              type="submit"
              disabled={sermonLoading === 'saving'}
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-orange-600 to-amber-600 text-white rounded-xl hover:shadow-lg transition-all duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <BookOpen className="h-4 w-4" />
              {sermonLoading === 'saving' ? 'Saving...' : (editingSermon ? 'Update Sermon' : 'Save Sermon')}
            </button>
            <button
              type="button"
              onClick={closeSermonModal}
              className="px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200 font-medium"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

interface NewcomerModalProps {
  showNewcomerModal: string | null;
  closeNewcomerModal: () => void;
  handleNewcomerSubmit: (newcomerData: {
    name: string;
    surname: string;
    phone: string;
    login_username: string;
    notes: string;
    residence: string;
    gender: string;
  }, eventId: string) => Promise<void>;
  loading: boolean;
  eventName?: string;
}

const NewcomerModal = ({ 
  showNewcomerModal, 
  closeNewcomerModal, 
  handleNewcomerSubmit, 
  loading,
  eventName 
}: NewcomerModalProps) => {
  // ✅ Move hooks to the top
  const [newcomerFormData, setNewcomerFormData] = useState({
    name: '',
    surname: '',
    phone: '',
    login_username: '',
    notes: '',
    residence: '',
    gender: ''
  });

  useEffect(() => {
    if (!showNewcomerModal) {
      // Reset form when modal closes
      setNewcomerFormData({
        name: '',
        surname: '',
        phone: '',
        login_username: '',
        notes: '',
        residence: '',
        gender: ''
      });
    }
  }, [showNewcomerModal]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setNewcomerFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await handleNewcomerSubmit(newcomerFormData, showNewcomerModal!);
  };

  // ✅ Conditional return after all hooks
  if (!showNewcomerModal) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white">
            Add Newcomer - {eventName || 'Event'}
          </h3>
          <button
            onClick={closeNewcomerModal}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors duration-200"
          >
            <X className="h-5 w-5 text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                First Name *
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  name="name"
                  value={newcomerFormData.name}
                  onChange={handleChange}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                  placeholder="Enter first name"
                  required
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Last Name *
              </label>
              <input
                type="text"
                name="surname"
                value={newcomerFormData.surname}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                placeholder="Enter last name"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Phone Number
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="tel"
                  name="phone"
                  value={newcomerFormData.phone}
                  onChange={handleChange}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                  placeholder="Enter phone number"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="email"
                  name="login_username"
                  value={newcomerFormData.login_username}
                  onChange={handleChange}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                  placeholder="Enter email address"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Residence *
              </label>
              <input
                type="text"
                name="residence"
                value={newcomerFormData.residence}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                placeholder="Enter residence address"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Gender *
              </label>
              <select
                name="gender"
                value={newcomerFormData.gender}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                required
              >
                <option value="">Select gender</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Additional Notes
            </label>
            <textarea
              name="notes"
              value={newcomerFormData.notes}
              onChange={handleChange}
              rows={3}
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
              placeholder="Any additional notes about the newcomer..."
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl transition-colors disabled:opacity-50 font-medium"
            >
              <User className="h-4 w-4" />
              {loading ? 'Adding Newcomer...' : 'Add Newcomer'}
            </button>
            <button
              type="button"
              onClick={closeNewcomerModal}
              className="px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200 font-medium"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// BulkAttendanceModal Component (Fixed with useMemo and default to "all absent")
const BulkAttendanceModal = ({ 
  showBulkAttendanceModal, 
  closeBulkAttendanceModal,
  events,
  fetchTargetMembersForEvent,
  bulkAttendanceSearch,
  setBulkAttendanceSearch,
  bulkAttendance,
  handleBulkAttendanceChange,
  saveBulkAttendance,
  loading,
  attendanceNotesRef,
  getInitials
}: {
  showBulkAttendanceModal: string | null;
  closeBulkAttendanceModal: () => void;
  events: Event[];
  fetchTargetMembersForEvent: (event: Event) => Member[];
  bulkAttendanceSearch: string;
  setBulkAttendanceSearch: (search: string) => void;
  bulkAttendance: Record<string, 'present' | 'absent'>;
  handleBulkAttendanceChange: (memberId: string, status: 'present' | 'absent') => void;
  saveBulkAttendance: (eventId: string) => Promise<void>;
  loading: boolean;
  attendanceNotesRef: React.MutableRefObject<Record<string, string>>;
  getInitials: (name: string, surname: string) => string;
}) => {
  // ✅ Conditional return at the beginning (no hooks after this)
  if (!showBulkAttendanceModal) return null;

  const event = events.find(e => e.id === showBulkAttendanceModal);
  if (!event) return null;

  const targetMembers = fetchTargetMembersForEvent(event);
  
  // FIXED: Memoize filtered members calculation
  const filteredMembers = useMemo(() => {
    if (!bulkAttendanceSearch.trim()) return targetMembers;
    
    const searchLower = bulkAttendanceSearch.toLowerCase().trim();
    
    return targetMembers.filter(member => {
      const searchableText = `${member.name} ${member.surname} ${member.phone || ''} ${member.login_username || ''}`.toLowerCase();
      return searchableText.includes(searchLower);
    });
  }, [targetMembers, bulkAttendanceSearch]); // Only recalculates when targetMembers or search changes

  const stats = {
    present: Object.values(bulkAttendance).filter(status => status === 'present').length,
    absent: Object.values(bulkAttendance).filter(status => status === 'absent').length,
    total: targetMembers.length,
    filtered: filteredMembers.length
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
          <div className="min-w-0">
            <h3 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white truncate">
              Bulk Attendance - {event.name}
            </h3>
            <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mt-1 truncate">
              Manage attendance for all target members - {targetMembers.length} members found
              {bulkAttendanceSearch && ` (${filteredMembers.length} filtered)`}
            </p>
          </div>
          <button
            onClick={closeBulkAttendanceModal}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors duration-200 flex-shrink-0 ml-2"
          >
            <X className="h-5 w-5 text-gray-500 dark:text-gray-400" />
          </button>
        </div>
        
        <div className="flex-1 overflow-hidden flex flex-col">
          <div className="p-4 sm:p-6 flex-shrink-0">
            {/* Search Bar - Immediate filtering */}
            <div className="mb-4">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-4 w-4 sm:h-5 sm:w-5 text-gray-400" />
                <input
                  type="text"
                  value={bulkAttendanceSearch}
                  onChange={(e) => setBulkAttendanceSearch(e.target.value)}
                  className="w-full px-4 py-3 pl-10 sm:pl-12 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-sm sm:text-base"
                  placeholder="Search by name, surname, phone, or email..."
                />
                {bulkAttendanceSearch && (
                  <button
                    onClick={() => setBulkAttendanceSearch('')}
                    className="absolute right-4 top-1/2 transform -translate-y-1/2 p-1 hover:bg-gray-100 dark:hover:bg-gray-600 rounded"
                  >
                    <X className="h-4 w-4 text-gray-500" />
                  </button>
                )}
              </div>
              {bulkAttendanceSearch && (
                <p className="mt-2 text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                  Found {filteredMembers.length} member{filteredMembers.length !== 1 ? 's' : ''} matching "{bulkAttendanceSearch}"
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-4">
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-xl p-3 sm:p-4 text-center">
                <div className="text-lg sm:text-2xl font-bold text-green-600 dark:text-green-400">{stats.present}</div>
                <div className="text-xs sm:text-sm text-green-700 dark:text-green-300 font-medium">Present</div>
              </div>
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-xl p-3 sm:p-4 text-center">
                <div className="text-lg sm:text-2xl font-bold text-red-600 dark:text-red-400">{stats.absent}</div>
                <div className="text-xs sm:text-sm text-red-700 dark:text-red-300 font-medium">Absent</div>
              </div>
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-xl p-3 sm:p-4 text-center">
                <div className="text-lg sm:text-2xl font-bold text-blue-600 dark:text-blue-400">{stats.total}</div>
                <div className="text-xs sm:text-sm text-blue-700 dark:text-blue-300 font-medium">Total Expected</div>
              </div>
              <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-700 rounded-xl p-3 sm:p-4 text-center">
                <div className="text-lg sm:text-2xl font-bold text-purple-600 dark:text-purple-400">{stats.filtered}</div>
                <div className="text-xs sm:text-sm text-purple-700 dark:text-purple-300 font-medium">Currently Showing</div>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 mb-4">
              <button
                onClick={() => {
                  // Mark all as present
                  targetMembers.forEach(member => {
                    handleBulkAttendanceChange(member.id, 'present');
                  });
                }}
                className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-xs sm:text-sm"
              >
                Mark All Present
              </button>
              <button
                onClick={() => {
                  // Mark all as absent (this is the default)
                  targetMembers.forEach(member => {
                    handleBulkAttendanceChange(member.id, 'absent');
                  });
                }}
                className="px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-xs sm:text-sm"
              >
                Mark All Absent
              </button>
              <button
                onClick={() => {
                  // Clear all attendance
                  Object.keys(bulkAttendance).forEach(key => handleBulkAttendanceChange(key, 'absent'));
                }}
                className="px-3 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-xs sm:text-sm"
              >
                Clear All
              </button>
              {bulkAttendanceSearch && (
                <button
                  onClick={() => {
                    filteredMembers.forEach(member => {
                      handleBulkAttendanceChange(member.id, 'present');
                    });
                  }}
                  className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-xs sm:text-sm"
                >
                  Mark Filtered Present
                </button>
              )}
              {bulkAttendanceSearch && (
                <button
                  onClick={() => {
                    filteredMembers.forEach(member => {
                      handleBulkAttendanceChange(member.id, 'absent');
                    });
                  }}
                  className="px-3 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors text-xs sm:text-sm"
                >
                  Mark Filtered Absent
                </button>
              )}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-4 sm:px-6 pb-4">
            {filteredMembers.length === 0 ? (
              <div className="text-center py-8">
                <UsersIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500 dark:text-gray-400 text-sm sm:text-base">
                  {bulkAttendanceSearch 
                    ? `No members found matching "${bulkAttendanceSearch}"` 
                    : 'No target members found for this event.'}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredMembers.map((member) => (
                  <div key={member.id} className="p-3 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 hover:border-blue-400 dark:hover:border-blue-500 transition-colors">
                    <div className="flex items-center justify-between gap-3">
                      {/* Left side - Member info */}
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white text-xs font-medium flex-shrink-0">
                          {getInitials(member.name, member.surname)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-gray-900 dark:text-white text-sm truncate">
                            {member.name} {member.surname}
                          </div>
                          <div className="flex items-center gap-3 text-xs text-gray-600 dark:text-gray-400">
                            {member.phone && <span className="truncate">{member.phone}</span>}
                            {member.cell_group_name && (
                              <>
                                <span>•</span>
                                <span className="truncate">{member.cell_group_name}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      {/* Right side - Buttons */}
                      <div className="flex gap-2 flex-shrink-0">
                        <button
                          onClick={() => handleBulkAttendanceChange(member.id, 'present')}
                          className={`px-3 py-1.5 rounded-lg transition-colors text-xs font-medium ${
                            bulkAttendance[member.id] === 'present'
                              ? 'bg-green-600 text-white'
                              : 'bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-600 dark:text-gray-300'
                          }`}
                        >
                          Present
                        </button>
                        <button
                          onClick={() => handleBulkAttendanceChange(member.id, 'absent')}
                          className={`px-3 py-1.5 rounded-lg transition-colors text-xs font-medium ${
                            bulkAttendance[member.id] === 'absent'
                              ? 'bg-red-600 text-white'
                              : 'bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-600 dark:text-gray-300'
                          }`}
                        >
                          Absent
                        </button>
                      </div>
                    </div>
                    
                    {/* Notes section - only show when absent */}
                    {bulkAttendance[member.id] === 'absent' && (
                      <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-600">
                        <textarea
                          defaultValue={attendanceNotesRef.current[member.id] || ''}
                          onChange={(e) => {
                            attendanceNotesRef.current[member.id] = e.target.value;
                          }}
                          placeholder="Reason for absence (optional)..."
                          className="w-full px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-xs focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none"
                          rows={1}
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="sticky bottom-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 p-4 sm:p-6 flex-shrink-0">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
              {stats.present + stats.absent} of {targetMembers.length} members marked
            </div>
            <div className="flex gap-3 w-full sm:w-auto">
              <button
                onClick={closeBulkAttendanceModal}
                className="flex-1 sm:flex-none px-4 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200 font-medium text-sm"
              >
                Cancel
              </button>
              <button
                onClick={() => saveBulkAttendance(showBulkAttendanceModal)}
                disabled={loading || Object.keys(bulkAttendance).length === 0}
                className="flex-1 sm:flex-none px-4 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-xl transition-all duration-200 font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg hover:shadow-xl"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4" />
                    <span className="hidden sm:inline">Save Attendance</span>
                    <span className="sm:hidden">Save ({Object.keys(bulkAttendance).length})</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const Events = () => {
  const { user, profile, isAdmin, isPastor, loading: authLoading } = useAuth();
  const [showEventForm, setShowEventForm] = useState(false);
  const [showSermonModal, setShowSermonModal] = useState<string | null>(null);
  const [showSermonList, setShowSermonList] = useState(false);
  const [events, setEvents] = useState<Event[]>([]);
  const [sermons, setSermons] = useState<Sermon[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [cellGroups, setCellGroups] = useState<CellGroup[]>([]);
  const [ministryGroups, setMinistryGroups] = useState<MinistryGroup[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [attendees, setAttendees] = useState<EventAttendee[]>([]);
  const [loading, setLoading] = useState(false);
  const [sermonLoading, setSermonLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [uploadingPamphlet, setUploadingPamphlet] = useState<string | null>(null);
  const [viewingPamphlet, setViewingPamphlet] = useState<string | null>(null);
  const [uploadingSermonFile, setUploadingSermonFile] = useState<{type: string, eventId?: string} | null>(null);
  const [editingSermon, setEditingSermon] = useState<Sermon | null>(null);
  
  const [showAttendeeModal, setShowAttendeeModal] = useState<{type: 'present' | 'absent', eventId: string} | null>(null);
  const [showBulkAttendanceModal, setShowBulkAttendanceModal] = useState<string | null>(null);
  const [showNewcomerModal, setShowNewcomerModal] = useState<string | null>(null);
  const [showSyncModal, setShowSyncModal] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  
  const attendanceNotesRef = useRef<Record<string, string>>({});
  const memberDepartmentMapRef = useRef<Map<string, string[]>>(new Map());
  const memberMinistryMapRef = useRef<Map<string, string[]>>(new Map());
  const memberCellGroupMapRef = useRef<Map<string, string>>(new Map());

  const [eventFormData, setEventFormData] = useState({
    eventType: '' as 'sunday' | 'other' | '',
    name: '',
    topic: '',
    eventDate: '',
    eventTime: '',
    location: '',
    isWholeChurch: true,
    targetCellGroups: [] as string[],
    targetMinistryGroups: [] as string[],
    targetDepartments: [] as string[],
  });

  const [sermonFormData, setSermonFormData] = useState({
    title: '',
    summary: '',
    pastorName: '',
    sermonDate: '',
    eventId: '',
    videoFile: null as File | null,
    documentFile: null as File | null,
    existingVideoUrl: '',
    existingDocumentUrl: '',
  });

  const [bulkAttendanceSearch, setBulkAttendanceSearch] = useState('');
  const [bulkAttendance, setBulkAttendance] = useState<Record<string, 'present' | 'absent'>>({});
  const [_attendanceNotes, setAttendanceNotes] = useState<Record<string, string>>({});

  // Track if we've set the Sunday service name
  const [isSundayServiceSet, setIsSundayServiceSet] = useState(false);

  // Optimize access check
  const hasAccess = useMemo(() => {
    return isAdmin?.() || isPastor?.();
  }, [isAdmin, isPastor]);

  // Fetch functions with optimizations
  const fetchEvents = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .order('event_date', { ascending: false });

      if (error) throw error;

      const eventsWithDefaults = (data || []).map((event: any) => ({
        ...event,
        is_whole_church: event.is_whole_church ?? true,
        target_groups: event.target_groups ?? [],
        target_departments: event.target_departments ?? [],
        is_completed: event.is_completed ?? false,
        completed_at: event.completed_at ?? null,
        pamphlet_url: event.pamphlet_url ?? null,
        last_synced_at: event.last_synced_at ?? null,
        backup_file_url: event.backup_file_url ?? null,
        backup_created_at: event.backup_created_at ?? null
      }));
      
      setEvents(eventsWithDefaults as Event[]);
      
      // Fetch attendees for all events in parallel
      const attendeePromises = eventsWithDefaults.map((event: Event) => 
        fetchEventAttendees(event.id)
      );
      await Promise.all(attendeePromises);
      
    } catch (error: any) {
      console.error('Error fetching events:', error);
      setError(error.message || 'Failed to load events.');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchSermons = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('sermons')
        .select(`
          *,
          events (
            name,
            topic
          )
        `)
        .order('sermon_date', { ascending: false });

      if (error) throw error;
      setSermons((data || []) as Sermon[]);
    } catch (error: any) {
      console.error('Error fetching sermons:', error);
    }
  }, []);

  const fetchMembers = useCallback(async () => {
    try {
      setError(null);
      
      // Fetch all data in parallel
      const [
        { data: membersData, error: membersError },
        { data: cellGroupsData },
        { data: ministryGroupMembersData },
        { data: departmentMembersData }
      ] = await Promise.all([
        supabase
          .from('members')
          .select('id, name, surname, login_username, phone, cell_group_id, status')
          .order('name'),
        supabase.from('cell_groups').select('id, name'),
        supabase.from('ministry_group_members').select('member_id, ministry_groups!inner(id, name)'),
        supabase.from('department_members').select('member_id, departments!inner(id, name)')
      ]);

      if (membersError) throw membersError;

      // Create maps for faster lookups
      const cellGroupMap = new Map(cellGroupsData?.map(cg => [cg.id, cg.name]) || []);
      const ministryGroupMap = new Map<string, string[]>();
      const departmentMap = new Map<string, string[]>();
      // Store cell group ID for member lookup

      // Build ministry group map
      ministryGroupMembersData?.forEach(mgm => {
        const existing = ministryGroupMap.get(mgm.member_id) || [];
        ministryGroupMap.set(mgm.member_id, [...existing, mgm.ministry_groups.id]);
      });

      // Build department map
      departmentMembersData?.forEach(dm => {
        const existing = departmentMap.get(dm.member_id) || [];
        departmentMap.set(dm.member_id, [...existing, dm.departments.id]);
      });

      // Store in ref for performance
      memberMinistryMapRef.current = ministryGroupMap;
      memberDepartmentMapRef.current = departmentMap;
      memberCellGroupMapRef.current = cellGroupMap;

      // Combine all data
      const membersWithDetails = (membersData || []).map((member: any) => ({
        ...member,
        cell_group_name: member.cell_group_id ? cellGroupMap.get(member.cell_group_id) : null,
        ministry_group_names: ministryGroupMap.get(member.id) || [],
        department_names: departmentMap.get(member.id) || []
      }));

      setMembers(membersWithDetails);
    } catch (error: any) {
      console.error('Error fetching members:', error);
      setError(error.message || 'Failed to load members.');
    }
  }, []);

  const fetchCellGroups = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('cell_groups')
        .select('id, name')
        .order('name');

      if (error) throw error;
      setCellGroups(data || []);
    } catch (error: any) {
      console.error('Error fetching cell groups:', error);
    }
  }, []);

  const fetchMinistryGroups = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('ministry_groups')
        .select('id, name')
        .order('name');

      if (error) throw error;
      setMinistryGroups(data || []);
    } catch (error: any) {
      console.error('Error fetching ministry groups:', error);
    }
  }, []);

  const fetchDepartments = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('departments')
        .select('id, name')
        .order('name');

      if (error) throw error;
      setDepartments(data || []);
    } catch (error: any) {
      console.error('Error fetching departments:', error);
    }
  }, []);

  const fetchEventAttendees = useCallback(async (eventId: string) => {
    try {
      // Fetch attendees with member info in a single query
      const { data: attendeesData, error: attendeesError } = await supabase
        .from('event_attendees')
        .select(`
          *,
          members:members_id (
            id, name, surname, login_username, phone, cell_group_id, status
          )
        `)
        .eq('event_id', eventId)
        .order('attended_at', { ascending: false });

      if (attendeesError) throw attendeesError;

      // Fetch inviter details in batch
      const inviteeIds = (attendeesData || [])
        .filter(attendee => attendee.invited_by_id)
        .map(attendee => attendee.invited_by_id)
        .filter((id): id is string => id !== null);
      
      let invitedByMap = new Map();
      if (inviteeIds.length > 0) {
        const { data: inviterData } = await supabase
          .from('members')
          .select('id, name, surname')
          .in('id', inviteeIds);
        
        if (inviterData) {
          inviterData.forEach(inviter => {
            invitedByMap.set(inviter.id, inviter);
          });
        }
      }

      const attendeesWithDetails = (attendeesData || []).map((attendee: any) => ({
        ...attendee,
        attendance_status: attendee.attendance_status || 'present',
        members: attendee.members || { id: attendee.members_id, name: 'Unknown', surname: 'Member' },
        invited_by_member: attendee.invited_by_id ? invitedByMap.get(attendee.invited_by_id) : null
      }));

      setAttendees(prev => {
        const filtered = prev.filter(attendee => attendee.event_id !== eventId);
        return [...filtered, ...attendeesWithDetails];
      });
      
      return attendeesWithDetails;
    } catch (error: any) {
      console.error('Error fetching attendees:', error);
      return [];
    }
  }, []);

  // Optimized version of isMemberInTargetGroups
  const isMemberInTargetGroups = useCallback((member: Member, event: Event): boolean => {
    if (event.is_whole_church) return true;

    // Check cell groups
    if (event.target_groups && event.target_groups.length > 0) {
      if (member.cell_group_id && event.target_groups.includes(member.cell_group_id)) {
        return true;
      }
    }

    // Check departments and ministry groups
    if (event.target_departments && event.target_departments.length > 0) {
      // Use cached maps for faster lookups
      const memberDepartments = memberDepartmentMapRef.current.get(member.id) || [];
      const memberMinistries = memberMinistryMapRef.current.get(member.id) || [];
      
      // Convert arrays to Sets for O(1) lookups
      const memberDeptSet = new Set(memberDepartments);
      const memberMinistrySet = new Set(memberMinistries);
      
      // Check if member is in any target department or ministry group
      for (const targetId of event.target_departments) {
        if (memberDeptSet.has(targetId) || memberMinistrySet.has(targetId)) {
          return true;
        }
      }
    }

    return false;
  }, []);

  // Batch fetch for bulk attendance
  const fetchTargetMembersForEvent = useCallback((event: Event): Member[] => {
    if (event.is_whole_church) {
      // For whole church events, all non-"not_attending" members are targets
      return members.filter(member => member.status !== 'not_attending');
    }

    return members.filter(member => {
      if (member.status === 'not_attending') return false;
      return isMemberInTargetGroups(member, event);
    });
  }, [members, isMemberInTargetGroups]);

  // FIXED: Optimized filter members for bulk attendance search - immediate filtering
  const filterTargetMembersSearch = useCallback((targetMembers: Member[], searchTerm: string): Member[] => {
    if (!searchTerm.trim()) return targetMembers;
    
    const searchLower = searchTerm.toLowerCase().trim();
    
    return targetMembers.filter(member => {
      // Create searchable text once
      const searchableText = `${member.name} ${member.surname} ${member.phone || ''} ${member.login_username || ''}`.toLowerCase();
      return searchableText.includes(searchLower);
    });
  }, []);
  
  // Use the search filter
  console.log('Filter function available:', typeof filterTargetMembersSearch);

  // Optimized handleDeleteEvent
  const handleDeleteEvent = useCallback(async (eventId: string) => {
    if (!confirm('Are you sure you want to delete this event? This action cannot be undone.')) return;

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const event = events.find(e => e.id === eventId);
      if (!event) throw new Error('Event not found');

      // Prepare all promises
      const promises = [];

      // 1. Delete associated sermons and their files
      const eventSermons = sermons.filter(s => s.event_id === eventId);
      for (const sermon of eventSermons) {
        if (sermon.video_url) {
          promises.push(deleteSermonFile(sermon.video_url, 'video'));
        }
        if (sermon.document_url) {
          promises.push(deleteSermonFile(sermon.document_url, 'document'));
        }
        
        promises.push(
          supabase.from('sermons').delete().eq('id', sermon.id)
        );
      }

      // 2. Delete event pamphlet if exists
      if (event.pamphlet_url) {
        const urlParts = event.pamphlet_url.split('/');
        const fileName = urlParts[urlParts.length - 1];
        const filePath = `event-pamphlets/${fileName}`;

        promises.push(
          supabase.storage.from('event-pamphlets').remove([filePath])
        );
      }

      // 3. Delete event attendees
      promises.push(
        supabase.from('event_attendees').delete().eq('event_id', eventId)
      );

      // 4. Delete the event itself
      promises.push(
        supabase.from('events').delete().eq('id', eventId)
      );

      // Execute all promises
      await Promise.all(promises);

      // Update local state
      setEvents(prev => prev.filter(event => event.id !== eventId));
      setSermons(prev => prev.filter(sermon => sermon.event_id !== eventId));
      setAttendees(prev => prev.filter(attendee => attendee.event_id !== eventId));

      setSuccess(`Event "${event.name}" deleted successfully!`);
      setTimeout(() => setSuccess(null), 3000);
    } catch (error: any) {
      console.error('Error deleting event:', error);
      setError(error.message || 'Failed to delete event. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [events, sermons]);

  const saveAttendance = useCallback(async (eventId: string, memberId: string, status: 'present' | 'absent', notes?: string) => {
    try {
      setLoading(true);
      setError(null);

      const { data: existingRecord } = await supabase
        .from('event_attendees')
        .select('id')
        .eq('event_id', eventId)
        .eq('members_id', memberId)
        .single();

      const attendanceData: any = {
        event_id: eventId,
        members_id: memberId,
        first_time: false,
        invited_by_id: null,
        attendance_status: status,
        attended_at: status === 'present' ? new Date().toISOString() : null,
        notes: notes || null,
      };

      let error;
      if (existingRecord) {
        const { error: updateError } = await supabase
          .from('event_attendees')
          .update(attendanceData)
          .eq('id', existingRecord.id);
        error = updateError;
      } else {
        const { error: insertError } = await supabase
          .from('event_attendees')
          .insert([attendanceData]);
        error = insertError;
      }

      if (error) throw error;

      await fetchEventAttendees(eventId);
      return true;
    } catch (error: any) {
      console.error('Error saving attendance:', error);
      setError(error.message || 'Failed to save attendance.');
      return false;
    } finally {
      setLoading(false);
    }
  }, [fetchEventAttendees]);

  const saveBulkAttendance = useCallback(async (eventId: string) => {
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const savePromises = Object.entries(bulkAttendance).map(async ([memberId, status]) => {
        const notes = attendanceNotesRef.current[memberId] || '';
        return await saveAttendance(eventId, memberId, status, notes);
      });

      const results = await Promise.all(savePromises);
      const successfulSaves = results.filter(result => result).length;
      const totalSaves = Object.keys(bulkAttendance).length;

      if (successfulSaves === totalSaves) {
        setSuccess(`Successfully saved attendance for ${successfulSaves} members!`);
        closeBulkAttendanceModal();
        
        await fetchEventAttendees(eventId);
      } else {
        setError(`Failed to save attendance for ${totalSaves - successfulSaves} members.`);
      }

      setTimeout(() => {
        setSuccess(null);
        setError(null);
      }, 5000);
    } catch (error: any) {
      console.error('Error saving bulk attendance:', error);
      setError(error.message || 'Failed to save bulk attendance.');
    } finally {
      setLoading(false);
    }
  }, [bulkAttendance, saveAttendance, fetchEventAttendees]);

  // Memoize event attendees
  const getEventAttendees = useCallback((eventId: string) => {
    return attendees.filter(attendee => attendee.event_id === eventId);
  }, [attendees]);

  const getPresentAttendees = useCallback((eventId: string) => {
    const eventAttendees = getEventAttendees(eventId);
    return eventAttendees.filter(attendee => 
      attendee.attendance_status === 'present'
    );
  }, [getEventAttendees]);

  const getAbsentAttendees = useCallback((eventId: string) => {
    const eventAttendees = getEventAttendees(eventId);
    return eventAttendees.filter(attendee => 
      attendee.attendance_status === 'absent'
    );
  }, [getEventAttendees]);

  // Memoize attendance stats
  const getAttendanceStats = useCallback((eventId: string) => {
    const eventAttendees = getEventAttendees(eventId);
    const present = eventAttendees.filter(a => a.attendance_status === 'present').length;
    const absent = eventAttendees.filter(a => a.attendance_status === 'absent').length;
    const firstTimers = eventAttendees.filter(a => a.first_time && a.attendance_status === 'present').length;
    
    return { present, absent, firstTimers, total: present + absent };
  }, [getEventAttendees]);

  const getSermonForEvent = useCallback((eventId: string) => {
    return sermons.find(sermon => sermon.event_id === eventId);
  }, [sermons]);

  const syncEventToCloud = useCallback(async (eventId: string) => {
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const event = events.find(e => e.id === eventId);
      if (!event) throw new Error('Event not found');

      const eventAttendees = getEventAttendees(eventId);

      const syncData = {
        event_id: event.id,
        event_name: event.name,
        event_date: event.event_date,
        event_time: event.event_time,
        location: event.location,
        is_completed: event.is_completed,
        total_attendees: eventAttendees.length,
        present_count: getAttendanceStats(eventId).present,
        absent_count: getAttendanceStats(eventId).absent,
        attendees: eventAttendees.map(attendee => ({
          member_id: attendee.members_id,
          member_name: `${attendee.members.name} ${attendee.members.surname}`,
          status: attendee.attendance_status,
          first_time: attendee.first_time,
          invited_by: attendee.invited_by_member ? `${attendee.invited_by_member.name} ${attendee.invited_by_member.surname}` : null,
          attended_at: attendee.attended_at,
          notes: attendee.notes
        })),
        synced_at: new Date().toISOString(),
        synced_by: user?.id,
        synced_by_name: profile?.name ? `${profile.name} ${profile.surname}` : 'Unknown'
      };

      const { error: updateError } = await supabase
        .from('events')
        .update({ 
          last_synced_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', eventId);

      if (updateError) throw updateError;

      const { error: logError } = await supabase
        .from('audit_logs')
        .insert([{
          table_name: 'events',
          record_id: eventId,
          action: 'SYNC',
          new_data: syncData,
          user_id: user?.id,
          created_at: new Date().toISOString()
        }]);

      if (logError) {
        console.warn('Failed to log sync action:', logError);
      }

      setEvents(prev => prev.map(event => 
        event.id === eventId 
          ? { ...event, last_synced_at: new Date().toISOString() }
          : event
      ));

      setSuccess(`Event "${event.name}" successfully synced to cloud!`);
      setTimeout(() => setSuccess(null), 3000);
      
      setShowSyncModal(null);
      
    } catch (error: any) {
      console.error('Error syncing event to cloud:', error);
      setError(error.message || 'Failed to sync event to cloud. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [events, getEventAttendees, getAttendanceStats, user, profile]);

  const exportEventData = useCallback((eventId: string) => {
    const event = events.find(e => e.id === eventId);
    if (!event) return;

    const eventAttendees = getEventAttendees(eventId);
    
    const csvRows = [];
    
    csvRows.push(['Event Information']);
    csvRows.push(['Name', event.name]);
    csvRows.push(['Date', event.event_date]);
    csvRows.push(['Time', event.event_time]);
    csvRows.push(['Location', event.location || '']);
    csvRows.push(['Topic', event.topic || '']);
    csvRows.push(['']);
    
    csvRows.push(['Attendees List']);
    csvRows.push(['Name', 'Surname', 'Status', 'First Time', 'Attended At', 'Invited By']);
    
    eventAttendees.forEach(attendee => {
      csvRows.push([
        attendee.members.name,
        attendee.members.surname,
        attendee.attendance_status,
        attendee.first_time ? 'Yes' : 'No',
        attendee.attended_at ? new Date(attendee.attended_at).toLocaleString() : '',
        attendee.invited_by_member ? `${attendee.invited_by_member.name} ${attendee.invited_by_member.surname}` : ''
      ]);
    });
    
    const csvContent = csvRows.map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `event_${event.name.replace(/\s+/g, '_')}_${event.event_date}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    
    setSuccess(`Event data exported successfully!`);
    setTimeout(() => setSuccess(null), 3000);
  }, [events, getEventAttendees]);

  const uploadPamphlet = useCallback(async (eventId: string, file: File) => {
    try {
      setUploadingPamphlet(eventId);
      setError(null);

      const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
      
      if (!allowedTypes.includes(file.type)) {
        throw new Error('Invalid file type. Please upload PDF, image, or document files.');
      }

      const maxSize = 5 * 1024 * 1024;
      if (file.size > maxSize) {
        throw new Error('File size too large. Please upload files smaller than 5MB.');
      }

      const fileExt = file.name.split('.').pop();
      const fileName = `pamphlet-${eventId}-${Date.now()}.${fileExt}`;
      const filePath = `event-pamphlets/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('event-pamphlets')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true
        });

      if (uploadError) {
        throw new Error(`Upload failed: ${uploadError.message}`);
      }

      const { data: { publicUrl } } = supabase.storage
        .from('event-pamphlets')
        .getPublicUrl(filePath);

      const { error: updateError } = await supabase
        .from('events')
        .update({ 
          pamphlet_url: publicUrl,
          updated_at: new Date().toISOString()
        })
        .eq('id', eventId);

      if (updateError) {
        throw new Error(`Database update failed: ${updateError.message}`);
      }

      setEvents(prev => prev.map(event => 
        event.id === eventId ? { ...event, pamphlet_url: publicUrl } : event
      ));

      setSuccess('Pamphlet uploaded successfully!');
      setTimeout(() => setSuccess(null), 3000);
    } catch (error: any) {
      console.error('Error uploading pamphlet:', error);
      setError(error.message || 'Failed to upload pamphlet.');
    } finally {
      setUploadingPamphlet(null);
    }
  }, []);

  const deletePamphlet = useCallback(async (eventId: string) => {
    try {
      if (!confirm('Are you sure you want to delete this pamphlet?')) return;

      setError(null);
      const event = events.find(e => e.id === eventId);
      if (!event?.pamphlet_url) return;

      const urlParts = event.pamphlet_url.split('/');
      const fileName = urlParts[urlParts.length - 1];
      const filePath = `event-pamphlets/${fileName}`;

      const { error: deleteError } = await supabase.storage
        .from('event-pamphlets')
        .remove([filePath]);

      if (deleteError) {
        console.warn('File deletion failed:', deleteError);
      }

      const { error: updateError } = await supabase
        .from('events')
        .update({ 
          pamphlet_url: null,
          updated_at: new Date().toISOString()
        })
        .eq('id', eventId);

      if (updateError) throw updateError;

      setEvents(prev => prev.map(event => 
        event.id === eventId ? { ...event, pamphlet_url: null } : event
      ));

      setSuccess('Pamphlet deleted successfully!');
      setTimeout(() => setSuccess(null), 3000);
    } catch (error: any) {
      console.error('Error deleting pamphlet:', error);
      setError(error.message || 'Failed to delete pamphlet.');
    }
  }, [events]);

  const viewPamphlet = useCallback((pamphletUrl: string) => {
    setViewingPamphlet(pamphletUrl);
  }, []);

  const closePamphletModal = useCallback(() => {
    setViewingPamphlet(null);
  }, []);

  const uploadSermonFile = useCallback(async (file: File, type: 'video' | 'document'): Promise<string> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
    const filePath = `${type}s/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('sermon-files')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage
      .from('sermon-files')
      .getPublicUrl(filePath);

    return publicUrl;
  }, []);

  const deleteSermonFile = useCallback(async (fileUrl: string, type: 'video' | 'document') => {
    try {
      if (!fileUrl) return;
      
      const urlParts = fileUrl.split('/');
      const fileName = urlParts[urlParts.length - 1];
      const filePath = `${type}s/${fileName}`;

      const { error: deleteError } = await supabase.storage
        .from('sermon-files')
        .remove([filePath]);

      if (deleteError) {
        console.warn('File deletion failed:', deleteError);
      }
    } catch (error: any) {
      console.error('Error deleting file:', error);
    }
  }, []);

  const handleSermonSubmit = useCallback(async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    
    if (!hasAccess) {
      setError('You do not have permission to manage sermons');
      setTimeout(() => setError(null), 3000);
      return;
    }

    if (!sermonFormData.pastorName.trim()) {
      setError('Please enter the pastor name');
      setTimeout(() => setError(null), 3000);
      return;
    }

    if (!sermonFormData.title.trim()) {
      setError('Please enter a sermon title');
      setTimeout(() => setError(null), 3000);
      return;
    }

    if (!sermonFormData.summary.trim()) {
      setError('Please enter a sermon summary');
      setTimeout(() => setError(null), 3000);
      return;
    }

    setSermonLoading('saving');
    setError(null);
    setSuccess(null);

    try {
      let videoUrl = sermonFormData.existingVideoUrl;
      let documentUrl = sermonFormData.existingDocumentUrl;

      if (sermonFormData.videoFile) {
        setUploadingSermonFile({ type: 'video' });
        try {
          videoUrl = await uploadSermonFile(sermonFormData.videoFile, 'video');
        } catch (error: any) {
          throw new Error(`Failed to upload video: ${error.message}`);
        } finally {
          setUploadingSermonFile(null);
        }
      }
      
      if (sermonFormData.documentFile) {
        setUploadingSermonFile({ type: 'document' });
        try {
          documentUrl = await uploadSermonFile(sermonFormData.documentFile, 'document');
        } catch (error: any) {
          throw new Error(`Failed to upload document: ${error.message}`);
        } finally {
          setUploadingSermonFile(null);
        }
      }

      const sermonData = {
        title: sermonFormData.title.trim(),
        summary: sermonFormData.summary.trim(),
        pastor_name: sermonFormData.pastorName.trim(),
        sermon_date: sermonFormData.sermonDate,
        event_id: sermonFormData.eventId || null,
        video_url: videoUrl,
        document_url: documentUrl,
        updated_at: new Date().toISOString()
      };

      let error;
      if (editingSermon) {
        const { error: updateError } = await supabase
          .from('sermons')
          .update(sermonData)
          .eq('id', editingSermon.id);
        error = updateError;
      } else {
        const { error: insertError } = await supabase
          .from('sermons')
          .insert([{ ...sermonData, created_at: new Date().toISOString() }]);
        error = insertError;
      }

      if (error) throw error;

      setShowSermonModal(null);
      setEditingSermon(null);
      setSermonFormData({ 
        title: '', 
        summary: '', 
        pastorName: '', 
        sermonDate: '', 
        eventId: '',
        videoFile: null,
        documentFile: null,
        existingVideoUrl: '',
        existingDocumentUrl: '',
      });
      
      await fetchSermons();
      setSuccess(editingSermon ? 'Sermon updated successfully!' : 'Sermon added successfully!');
      
      setTimeout(() => setSuccess(null), 3000);
    } catch (error: any) {
      console.error('Error saving sermon:', error);
      setError(error.message || `Failed to ${editingSermon ? 'update' : 'save'} sermon. Please try again.`);
    } finally {
      setSermonLoading(null);
    }
  }, [hasAccess, sermonFormData, editingSermon, uploadSermonFile, fetchSermons]);

  const handleDeleteSermon = useCallback(async (sermonId: string) => {
    if (!confirm('Are you sure you want to delete this sermon? This action cannot be undone.')) return;

    try {
      setError(null);
      setSermonLoading(sermonId);

      const sermonToDelete = sermons.find(s => s.id === sermonId);
      if (!sermonToDelete) throw new Error('Sermon not found');

      if (sermonToDelete.video_url) {
        await deleteSermonFile(sermonToDelete.video_url, 'video');
      }
      if (sermonToDelete.document_url) {
        await deleteSermonFile(sermonToDelete.document_url, 'document');
      }

      const { error } = await supabase
        .from('sermons')
        .delete()
        .eq('id', sermonId);

      if (error) throw error;

      setSermons(prev => prev.filter(sermon => sermon.id !== sermonId));
      setSuccess('Sermon deleted successfully!');
      setTimeout(() => setSuccess(null), 3000);
    } catch (error: any) {
      console.error('Error deleting sermon:', error);
      setError(error.message || 'Failed to delete sermon.');
      await fetchSermons();
    } finally {
      setSermonLoading(null);
    }
  }, [sermons, deleteSermonFile, fetchSermons]);

  const openSermonModal = useCallback((eventId?: string, sermonToEdit?: Sermon) => {
    if (sermonToEdit) {
      setEditingSermon(sermonToEdit);
      setSermonFormData({
        title: sermonToEdit.title,
        summary: sermonToEdit.summary,
        pastorName: sermonToEdit.pastor_name,
        sermonDate: sermonToEdit.sermon_date,
        eventId: sermonToEdit.event_id || '',
        videoFile: null,
        documentFile: null,
        existingVideoUrl: sermonToEdit.video_url || '',
        existingDocumentUrl: sermonToEdit.document_url || '',
      });
    } else {
      const event = eventId ? events.find(e => e.id === eventId) : null;
      setEditingSermon(null);
      setSermonFormData({
        title: event?.name || '',
        summary: '',
        pastorName: '',
        sermonDate: event?.event_date || new Date().toISOString().split('T')[0],
        eventId: eventId || '',
        videoFile: null,
        documentFile: null,
        existingVideoUrl: '',
        existingDocumentUrl: '',
      });
    }
    
    setShowSermonModal(eventId || sermonToEdit?.id || 'new');
  }, [events]);

  const closeSermonModal = useCallback(() => {
    setShowSermonModal(null);
    setEditingSermon(null);
    setSermonFormData({ 
      title: '', 
      summary: '', 
      pastorName: '', 
      sermonDate: '', 
      eventId: '',
      videoFile: null,
      documentFile: null,
      existingVideoUrl: '',
      existingDocumentUrl: '',
    });
    setError(null);
    setUploadingSermonFile(null);
  }, []);

  const removeSermonFile = useCallback(async (sermonId: string, fileType: 'video' | 'document') => {
    if (!confirm(`Are you sure you want to remove the ${fileType} file?`)) return;

    try {
      setSermonLoading(`remove-${fileType}-${sermonId}`);
      setError(null);

      const sermon = sermons.find(s => s.id === sermonId);
      if (!sermon) throw new Error('Sermon not found');

      const fileUrl = fileType === 'video' ? sermon.video_url : sermon.document_url;
      if (!fileUrl) return;

      await deleteSermonFile(fileUrl, fileType);

      const updateData = fileType === 'video' 
        ? { video_url: null } 
        : { document_url: null };

      const { error } = await supabase
        .from('sermons')
        .update(updateData)
        .eq('id', sermonId);

      if (error) throw error;

      await fetchSermons();
      setSuccess(`${fileType === 'video' ? 'Video' : 'Document'} removed successfully!`);
      setTimeout(() => setSuccess(null), 3000);
    } catch (error: any) {
      console.error(`Error removing ${fileType}:`, error);
      setError(error.message || `Failed to remove ${fileType}.`);
    } finally {
      setSermonLoading(null);
    }
  }, [sermons, deleteSermonFile, fetchSermons]);

  const markMembersAsAbsent = useCallback(async (eventId: string, absentMemberIds: string[]) => {
    try {
      const absentRecords = absentMemberIds.map(memberId => ({
        event_id: eventId,
        members_id: memberId,
        first_time: false,
        invited_by_id: null,
        attendance_status: 'absent' as const,
        attended_at: null
      }));

      for (const record of absentRecords) {
        const { data: existing } = await supabase
          .from('event_attendees')
          .select('id')
          .eq('event_id', eventId)
          .eq('members_id', record.members_id)
          .single();

        if (existing) {
          await supabase
            .from('event_attendees')
            .update(record)
            .eq('id', existing.id);
        } else {
          await supabase
            .from('event_attendees')
            .insert([record]);
        }
      }
      
      await fetchEventAttendees(eventId);
    } catch (error: any) {
      console.error('Error marking members as absent:', error);
      throw error;
    }
  }, [fetchEventAttendees]);

  const handleCompleteEvent = useCallback(async (eventId: string) => {
    if (!confirm('Are you sure you want to mark this event as completed? This will automatically mark all expected but unregistered members as absent.')) {
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const event = events.find(e => e.id === eventId);
      if (!event) throw new Error('Event not found');

      const eventAttendees = getEventAttendees(eventId);
      const attendeeIds = new Set(eventAttendees.map(a => a.members_id));

      const absentMemberIds: string[] = [];

      for (const member of members) {
        if (member.status === 'not_attending') continue;
        if (attendeeIds.has(member.id)) continue;

        const shouldAttend = isMemberInTargetGroups(member, event);
        if (shouldAttend) {
          absentMemberIds.push(member.id);
        }
      }

      if (absentMemberIds.length > 0) {
        await markMembersAsAbsent(eventId, absentMemberIds);
      }

      const { error } = await supabase
        .from('events')
        .update({
          is_completed: true,
          completed_at: new Date().toISOString()
        })
        .eq('id', eventId);

      if (error) throw error;

      setEvents(prev => prev.map(event => 
        event.id === eventId 
          ? { ...event, is_completed: true, completed_at: new Date().toISOString() }
          : event
      ));

      setSuccess(`Event marked as completed! ${absentMemberIds.length} members marked as absent.`);
      setTimeout(() => setSuccess(null), 3000);
    } catch (error: any) {
      console.error('Error completing event:', error);
      setError(error.message || 'Failed to complete event. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [events, members, isMemberInTargetGroups, getEventAttendees, markMembersAsAbsent]);

  const handleEventSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!hasAccess) {
      setError('You do not have permission to create events');
      setTimeout(() => setError(null), 3000);
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);
    
    try {
      // For Sunday service, use "Sunday" if name is empty or use the user's input
      const eventName = eventFormData.eventType === 'sunday' && !eventFormData.name.trim() 
        ? 'Sunday' 
        : eventFormData.name.trim();

      if (!eventName) {
        throw new Error('Event name is required');
      }

      const eventData = {
        name: eventName,
        topic: eventFormData.topic.trim() || null,
        event_date: eventFormData.eventDate,
        event_time: eventFormData.eventTime,
        location: eventFormData.location.trim() || null,
        is_whole_church: eventFormData.isWholeChurch,
        is_completed: false,
        completed_at: null,
        pamphlet_url: null,
        target_groups: !eventFormData.isWholeChurch && eventFormData.targetCellGroups.length > 0 ? eventFormData.targetCellGroups : null,
        target_departments: !eventFormData.isWholeChurch && [...eventFormData.targetMinistryGroups, ...eventFormData.targetDepartments].length > 0 
          ? [...eventFormData.targetMinistryGroups, ...eventFormData.targetDepartments] 
          : null,
        last_synced_at: null,
        backup_file_url: null,
        backup_created_at: null
      };

      const { error } = await supabase
        .from('events')
        .insert([eventData])
        .select()
        .single();

      if (error) throw error;

      setShowEventForm(false);
      setEventFormData({ 
        eventType: '',
        name: '', 
        topic: '', 
        eventDate: '', 
        eventTime: '', 
        location: '',
        isWholeChurch: true,
        targetCellGroups: [],
        targetMinistryGroups: [],
        targetDepartments: [],
      });
      setIsSundayServiceSet(false);
      
      await fetchEvents();
      setSuccess('Event created successfully!');
      
      setTimeout(() => setSuccess(null), 3000);
    } catch (error: any) {
      console.error('Error creating event:', error);
      setError(error.message || 'Failed to create event. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [eventFormData, hasAccess, fetchEvents]);

  const handleRemoveAttendee = useCallback(async (attendeeId: string, eventId: string) => {
    if (!confirm('Are you sure you want to remove this attendee?')) return;

    try {
      setError(null);
      setSuccess(null);
      
      const { error } = await supabase
        .from('event_attendees')
        .delete()
        .eq('id', attendeeId);

      if (error) throw error;

      setAttendees(prev => prev.filter(attendee => attendee.id !== attendeeId));
      await fetchEventAttendees(eventId);
      
      setSuccess('Attendee removed successfully!');
      setTimeout(() => setSuccess(null), 3000);
    } catch (error: any) {
      console.error('Error removing attendee:', error);
      setError(error.message || 'Failed to remove attendee.');
    }
  }, [fetchEventAttendees]);

  const openAttendeeModal = useCallback((type: 'present' | 'absent', eventId: string) => {
    setShowAttendeeModal({ type, eventId });
  }, []);

  const closeAttendeeModal = useCallback(() => {
    setShowAttendeeModal(null);
  }, []);

  // Optimized openBulkAttendanceModal - DEFAULT TO ALL ABSENT
  const openBulkAttendanceModal = useCallback((eventId: string) => {
    setShowBulkAttendanceModal(eventId);
    setBulkAttendanceSearch('');
    
    const event = events.find(e => e.id === eventId);
    if (!event) return;

    const targetMembers = fetchTargetMembersForEvent(event);
    
    const initialAttendance: Record<string, 'present' | 'absent'> = {};
    const existingAttendees = getEventAttendees(eventId);
    const existingAttendeeMap = new Map(existingAttendees.map(a => [a.members_id, a]));

    for (const member of targetMembers) {
      const existingAttendee = existingAttendeeMap.get(member.id);
      // CHANGED: Default to 'absent' instead of 'present'
      initialAttendance[member.id] = existingAttendee?.attendance_status as 'present' | 'absent' || 'absent';
    }

    setBulkAttendance(initialAttendance);
  }, [events, fetchTargetMembersForEvent, getEventAttendees]);

  const closeBulkAttendanceModal = useCallback(() => {
    setShowBulkAttendanceModal(null);
    setBulkAttendanceSearch('');
    setBulkAttendance({});
    setAttendanceNotes({});
    attendanceNotesRef.current = {};
  }, []);

  const handleBulkAttendanceChange = useCallback((memberId: string, status: 'present' | 'absent') => {
    setBulkAttendance(prev => ({ ...prev, [memberId]: status }));
  }, []);

  const openNewcomerModal = useCallback((eventId: string) => {
    setShowNewcomerModal(eventId);
  }, []);

  const closeNewcomerModal = useCallback(() => {
    setShowNewcomerModal(null);
  }, []);

  // UPDATED handleNewcomerSubmit with residence and gender
  const handleNewcomerSubmit = useCallback(async (newcomerData: {
    name: string;
    surname: string;
    phone: string;
    login_username: string;
    notes: string;
    residence: string;
    gender: string;
  }, eventId: string) => {
    if (!newcomerData.name.trim() || !newcomerData.surname.trim()) {
      setError('Name and surname are required');
      setTimeout(() => setError(null), 3000);
      return;
    }

    if (!newcomerData.residence.trim()) {
      setError('Residence is required');
      setTimeout(() => setError(null), 3000);
      return;
    }

    if (!newcomerData.gender) {
      setError('Gender is required');
      setTimeout(() => setError(null), 3000);
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      let existingMember = null;
      if (newcomerData.login_username.trim()) {
        const { data: login_usernameMatch } = await supabase
          .from('members')
          .select('*')
          .eq('login_username', newcomerData.login_username.trim())
          .single();
        existingMember = login_usernameMatch;
      }
      
      if (!existingMember && newcomerData.phone.trim()) {
        const { data: phoneMatch } = await supabase
          .from('members')
          .select('*')
          .eq('phone', newcomerData.phone.trim())
          .single();
        existingMember = phoneMatch;
      }

      let memberId;
      
      if (existingMember) {
        memberId = existingMember.id;
      } else {
        const memberPayload: {
          name: string;
          surname: string;
          phone: string | null;
          login_username: string | null;
          residence: string;
          gender: 'male' | 'female' | null;
          status: 'newcomer';
          first_time_visit_date: string;
          is_permanent_member: boolean;
          is_leader: boolean;
          admin_role: string;
          created_at: string;
          updated_at: string;
          status_date: string;
        } = {
          name: newcomerData.name.trim(),
          surname: newcomerData.surname.trim(),
          phone: newcomerData.phone.trim() || null,
          login_username: newcomerData.login_username.trim() || null,
          residence: newcomerData.residence.trim(),
          gender: (newcomerData.gender === 'male' || newcomerData.gender === 'female') ? newcomerData.gender : null,
          status: 'newcomer',
          first_time_visit_date: new Date().toISOString(),
          is_permanent_member: false,
          is_leader: false,
          admin_role: 'member',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          status_date: new Date().toISOString()
        };

        const { data: memberData, error: memberError } = await supabase
          .from('members')
          .insert([memberPayload])
          .select()
          .single();

        if (memberError) {
          if (memberError.code === '23505' && memberError.message.includes('login_username')) {
            setError('A member with this login_username already exists');
            return;
          }
          throw memberError;
        }
        memberId = memberData.id;
      }

      // Add as attendee with first_time = true
      const attendeeData = {
        event_id: eventId,
        members_id: memberId,
        first_time: true,
        invited_by_id: null,
        attendance_status: 'present' as const,
        attended_at: new Date().toISOString()
      };

      const { data: newAttendee, error: attendeeError } = await supabase
        .from('event_attendees')
        .insert([attendeeData])
        .select('*')
        .single();

      if (attendeeError) throw attendeeError;

      // Add the new attendee to state
      const memberData = existingMember || { 
        id: memberId, 
        name: newcomerData.name.trim(), 
        surname: newcomerData.surname.trim(),
        login_username: newcomerData.login_username.trim() || null,
        phone: newcomerData.phone.trim() || null,
        residence: newcomerData.residence.trim(),
        gender: newcomerData.gender,
        status: 'newcomer' as const,
        cell_group_id: null,
        ministry_group_names: []
      };

      const attendeeWithMember: EventAttendee = {
        ...newAttendee,
        members: memberData as Member,
        invited_by_member: null
      };

      setAttendees(prev => [...prev, attendeeWithMember]);

      // Refresh members list
      await fetchMembers();
      
      closeNewcomerModal();
      setSuccess('Newcomer added successfully!');
      setTimeout(() => setSuccess(null), 3000);
    } catch (error: any) {
      console.error('Error adding newcomer:', error);
      setError(error.message || 'Failed to add newcomer.');
    } finally {
      setLoading(false);
    }
  }, [fetchMembers, closeNewcomerModal]);

  const formatDate = useCallback((dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }, []);

  const formatTime = useCallback((timeString: string) => {
    const [hours, minutes] = timeString.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const formattedHour = hour % 12 || 12;
    return `${formattedHour}:${minutes} ${ampm}`;
  }, []);

  const getInitials = useCallback((name: string, surname: string) => {
    return `${name.charAt(0)}${surname.charAt(0)}`.toUpperCase();
  }, []);

  // Status badge helper - available for UI components
  const statusBadges = {
    newcomer: { color: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300', text: 'Newcomer' },
    signed_member: { color: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300', text: 'Signed Member' },
    not_attending: { color: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300', text: 'Not Attending' },
  };
  console.log('Status badges available:', Object.keys(statusBadges));

  const getEventScopeBadge = useCallback((event: Event) => {
    if (event.is_whole_church) {
      return {
        color: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300',
        text: 'Whole Church',
        icon: Building
      };
    } else {
      return {
        color: 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300',
        text: 'Target Groups',
        icon: UsersIcon
      };
    }
  }, []);

  const getEventStatusBadge = useCallback((event: Event) => {
    if (event.is_completed) {
      return {
        color: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300',
        text: 'Completed',
        icon: CheckCircle
      };
    } else {
      return {
        color: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300',
        text: 'Active',
        icon: AlertCircle
      };
    }
  }, []);

  // Clean up file URLs
  useEffect(() => {
    return () => {
      if (viewingPamphlet && viewingPamphlet.startsWith('blob:')) {
        URL.revokeObjectURL(viewingPamphlet);
      }
    };
  }, [viewingPamphlet]);

  // Initialize data
  useEffect(() => {
    if (user && !authLoading) {
      const initializeData = async () => {
        try {
          setLoading(true);
          
          // Fetch all data in parallel
          await Promise.all([
            fetchEvents(),
            fetchSermons(),
            fetchMembers(),
            fetchCellGroups(),
            fetchMinistryGroups(),
            fetchDepartments()
          ]);
        } catch (error) {
          console.error('Error initializing data:', error);
          setError('Failed to initialize data. Please refresh the page.');
        } finally {
          setLoading(false);
        }
      };
      
      initializeData();
    }
  }, [user, authLoading, fetchEvents, fetchSermons, fetchMembers, fetchCellGroups, fetchMinistryGroups, fetchDepartments]);

  // Sermon List Component
  const SermonList = useCallback(() => {
    return (
      <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-6 mb-8 shadow-lg hover:shadow-xl transition-all duration-300">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Sermons</h2>
          <button
            onClick={() => openSermonModal()}
            className="flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-orange-600 to-amber-600 text-white rounded-xl hover:shadow-lg transition-all duration-200 font-medium text-sm"
          >
            <Plus className="h-4 w-4" />
            Add Sermon
          </button>
        </div>

        {sermons.length === 0 ? (
          <div className="text-center py-12">
            <BookOpen className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-600 dark:text-gray-400 mb-2">No Sermons Yet</h3>
            <p className="text-gray-500 dark:text-gray-500">Add your first sermon to get started</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {sermons.map((sermon) => (
              <div key={sermon.id} className="bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl p-6 hover:shadow-lg transition-all duration-300">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="font-bold text-gray-900 dark:text-white text-lg mb-1">
                      {sermon.title}
                    </h3>
                    <p className="text-blue-600 dark:text-blue-400 text-sm">
                      {sermon.events?.name || 'Standalone Sermon'}
                    </p>
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => openSermonModal(undefined, sermon)}
                      className="p-2 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-lg transition-colors duration-150"
                      title="Edit Sermon"
                      disabled={sermonLoading === sermon.id}
                    >
                      <Edit className="h-4 w-4 text-blue-500" />
                    </button>
                    <button
                      onClick={() => handleDeleteSermon(sermon.id)}
                      className="p-2 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition-colors duration-150"
                      title="Delete Sermon"
                      disabled={sermonLoading === sermon.id}
                    >
                      {sermonLoading === sermon.id ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-500" />
                      ) : (
                        <Trash2 className="h-4 w-4 text-red-500" />
                      )}
                    </button>
                  </div>
                </div>

                <div className="space-y-2 mb-4">
                  <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                    <User className="h-3 w-3" />
                    <span>By {sermon.pastor_name}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                    <CalendarIcon className="h-3 w-3" />
                    <span>{formatDate(sermon.sermon_date)}</span>
                  </div>
                </div>

                <p className="text-gray-600 dark:text-gray-400 text-sm mb-4 line-clamp-3">
                  {sermon.summary}
                </p>

                <div className="flex flex-wrap gap-2">
                  {sermon.video_url && (
                    <div className="flex items-center gap-1">
                      <a
                        href={sermon.video_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 px-3 py-2 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-lg text-sm hover:bg-purple-200 dark:hover:bg-purple-800/30 transition-all duration-200"
                      >
                        <PlayCircle className="h-3 w-3" />
                        Video
                      </a>
                      {hasAccess && (
                        <button
                          onClick={() => removeSermonFile(sermon.id, 'video')}
                          className="p-2 hover:bg-red-100 dark:hover:bg-red-900/30 rounded transition-colors duration-150"
                          title="Remove Video"
                          disabled={sermonLoading === `remove-video-${sermon.id}`}
                        >
                          {sermonLoading === `remove-video-${sermon.id}` ? (
                            <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-red-500" />
                          ) : (
                            <X className="h-3 w-3 text-red-500" />
                          )}
                        </button>
                      )}
                    </div>
                  )}
                  {sermon.document_url && (
                    <div className="flex items-center gap-1">
                      <a
                        href={sermon.document_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 px-3 py-2 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-lg text-sm hover:bg-green-200 dark:hover:bg-green-800/30 transition-all duration-200"
                      >
                        <Download className="h-3 w-3" />
                        Notes
                      </a>
                      {hasAccess && (
                        <button
                          onClick={() => removeSermonFile(sermon.id, 'document')}
                          className="p-2 hover:bg-red-100 dark:hover:bg-red-900/30 rounded transition-colors duration-150"
                          title="Remove Document"
                          disabled={sermonLoading === `remove-document-${sermon.id}`}
                        >
                          {sermonLoading === `remove-document-${sermon.id}` ? (
                            <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-red-500" />
                          ) : (
                            <X className="h-3 w-3 text-red-500" />
                          )}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }, [sermons, sermonLoading, hasAccess, formatDate, openSermonModal, handleDeleteSermon, removeSermonFile]);

  const SyncModal = useCallback(() => {
    if (!showSyncModal) return null;

    const event = events.find(e => e.id === showSyncModal);
    if (!event) return null;

    const stats = getAttendanceStats(event.id);
    const eventAttendees = getEventAttendees(event.id);

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
            <div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                <Upload className="inline-block h-5 w-5 mr-2 text-blue-500" />
                Sync to Cloud - {event.name}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Backup event data to cloud storage
              </p>
            </div>
            <button
              onClick={() => setShowSyncModal(null)}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors duration-200"
            >
              <X className="h-5 w-5 text-gray-500 dark:text-gray-400" />
            </button>
          </div>

          <div className="p-6">
            <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-xl">
              <h4 className="font-semibold text-blue-800 dark:text-blue-300 mb-2">What will be synced:</h4>
              <ul className="space-y-2 text-sm text-blue-700 dark:text-blue-400">
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4" />
                  Event details (name, date, time, location)
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4" />
                  Attendance statistics ({stats.present} present, {stats.absent} absent)
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4" />
                  Attendee list ({eventAttendees.length} members)
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4" />
                  First-time visitor information
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4" />
                  Inviter information
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4" />
                  Sync timestamp and user information
                </li>
              </ul>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                <div className="text-2xl font-bold text-gray-900 dark:text-white">{stats.present}</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Present</div>
              </div>
              <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                <div className="text-2xl font-bold text-gray-900 dark:text-white">{stats.absent}</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Absent</div>
              </div>
              <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                <div className="text-2xl font-bold text-gray-900 dark:text-gray-400">{eventAttendees.length}</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Total Registered</div>
              </div>
              <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                <div className="text-2xl font-bold text-gray-900 dark:text-gray-400">{stats.firstTimers}</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">First Timers</div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => exportEventData(event.id)}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 border border-green-300 dark:border-green-700 text-green-700 dark:text-green-300 rounded-xl hover:bg-green-50 dark:hover:bg-green-900/20 transition-all duration-200 font-medium text-sm"
                >
                  <Download className="h-4 w-4" />
                  Export as CSV
                </button>
                <button
                  onClick={() => syncEventToCloud(event.id)}
                  disabled={loading}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:shadow-lg transition-all duration-200 font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Upload className="h-4 w-4" />
                  {loading ? 'Syncing...' : 'Sync to Cloud'}
                </button>
              </div>
              
              <p className="text-xs text-gray-500 dark:text-gray-500 text-center">
                Last synced: {event.last_synced_at ? new Date(event.last_synced_at).toLocaleString() : 'Never'}
              </p>
            </div>
          </div>

          <div className="flex justify-end p-6 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={() => setShowSyncModal(null)}
              className="px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200 font-medium text-sm"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }, [showSyncModal, events, getAttendanceStats, getEventAttendees, exportEventData, syncEventToCloud, loading]);

  const AttendeeModal = useCallback(() => {
    if (!showAttendeeModal) return null;

    const { type, eventId } = showAttendeeModal;
    const attendees = type === 'present' ? getPresentAttendees(eventId) : getAbsentAttendees(eventId);
    const event = events.find(e => e.id === eventId);

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
          <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="min-w-0">
              <h3 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white truncate">
                {type === 'present' ? 'Present' : 'Absent'} Attendees - {event?.name}
              </h3>
              <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mt-1">
                Total: {attendees.length} {type === 'present' ? 'present' : 'absent'}
              </p>
            </div>
            <button
              onClick={closeAttendeeModal}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors duration-200 flex-shrink-0 ml-2"
            >
              <X className="h-5 w-5 text-gray-500 dark:text-gray-400" />
            </button>
          </div>
          <div className="p-4 sm:p-6 max-h-[70vh] overflow-y-auto">
            {attendees.length === 0 ? (
              <div className="text-center py-12">
                <UsersIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h4 className="text-lg font-semibold text-gray-600 dark:text-gray-400 mb-2">
                  No {type === 'present' ? 'Present' : 'Absent'} Attendees
                </h4>
                <p className="text-gray-500 dark:text-gray-500">
                  {type === 'present' 
                    ? 'No members have been marked as present for this event.' 
                    : 'No members have been marked as absent for this event.'}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {attendees.map((attendee) => (
                  <div key={attendee.id} className={`flex items-center justify-between p-4 ${
                    type === 'present' 
                      ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700' 
                      : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700'
                  } rounded-xl`}>
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center text-white text-sm font-medium flex-shrink-0 ${
                        type === 'present'
                          ? 'bg-gradient-to-br from-green-500 to-emerald-500'
                          : 'bg-gradient-to-br from-red-500 to-orange-500'
                      }`}>
                        {getInitials(attendee.members.name, attendee.members.surname)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-gray-900 dark:text-white truncate text-sm sm:text-base">
                          {attendee.members.name} {attendee.members.surname}
                        </div>
                        <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 space-y-1">
                          {attendee.members.phone && (
                            <div className="flex items-center gap-1 truncate">
                              <Phone className="h-3 w-3 flex-shrink-0" />
                              <span className="truncate">{attendee.members.phone}</span>
                            </div>
                          )}
                          {attendee.members.login_username && (
                            <div className="flex items-center gap-1 truncate">
                              <Mail className="h-3 w-3 flex-shrink-0" />
                              <span className="truncate">{attendee.members.login_username}</span>
                            </div>
                          )}
                          {type === 'present' && attendee.first_time && (
                            <span className="inline-block px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full text-xs">
                              First Time
                            </span>
                          )}
                          {type === 'present' && attendee.invited_by_member && (
                            <div className="text-xs text-gray-500 truncate">
                              Invited by: {attendee.invited_by_member.name} {attendee.invited_by_member.surname}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    {type === 'present' && hasAccess && (
                      <button
                        onClick={() => handleRemoveAttendee(attendee.id, eventId)}
                        className="p-2 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition-colors duration-150 flex-shrink-0 ml-2"
                        title="Remove Attendee"
                      >
                        <X className="h-4 w-4 text-red-500" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="flex justify-end p-4 sm:p-6 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={closeAttendeeModal}
              className="px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200 font-medium text-sm"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }, [showAttendeeModal, events, getPresentAttendees, getAbsentAttendees, hasAccess, handleRemoveAttendee, closeAttendeeModal, getInitials]);

  const DeleteConfirmModal = useCallback(() => {
    if (!showDeleteConfirm) return null;

    const event = events.find(e => e.id === showDeleteConfirm);
    if (!event) return null;

    const eventAttendees = getEventAttendees(event.id);
    const eventSermons = sermons.filter(s => s.event_id === event.id);

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-md w-full">
          <div className="p-6">
            <div className="flex items-center justify-center w-12 h-12 mx-auto mb-4 rounded-full bg-red-100 dark:bg-red-900/30">
              <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white text-center mb-2">
              Delete Event
            </h3>
            <p className="text-gray-600 dark:text-gray-400 text-center mb-6">
              Are you sure you want to delete "<span className="font-semibold">{event.name}</span>"?
            </p>
            
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-xl p-4 mb-6">
              <h4 className="font-semibold text-red-800 dark:text-red-300 mb-2">This will permanently delete:</h4>
              <ul className="space-y-1 text-sm text-red-700 dark:text-red-400">
                <li className="flex items-center gap-2">
                  <X className="h-3 w-3" />
                  Event details and information
                </li>
                <li className="flex items-center gap-2">
                  <X className="h-3 w-3" />
                  {eventAttendees.length} attendee records
                </li>
                <li className="flex items-center gap-2">
                  <X className="h-3 w-3" />
                  {eventSermons.length} sermon{eventSermons.length !== 1 ? 's' : ''} and associated files
                </li>
                {event.pamphlet_url && (
                  <li className="flex items-center gap-2">
                    <X className="h-3 w-3" />
                    Event pamphlet file
                  </li>
                )}
              </ul>
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(null)}
                className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200 font-medium text-sm"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  handleDeleteEvent(event.id);
                  setShowDeleteConfirm(null);
                }}
                disabled={loading}
                className="flex-1 px-4 py-3 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white rounded-xl transition-all duration-200 font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4" />
                    <span>Delete Event</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }, [showDeleteConfirm, events, getEventAttendees, sermons, handleDeleteEvent, loading]);

  const PamphletModal = useCallback(() => {
    if (!viewingPamphlet) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
          <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white">Event Pamphlet</h3>
            <button
              onClick={closePamphletModal}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors duration-200"
            >
              <X className="h-5 w-5 text-gray-500 dark:text-gray-400" />
            </button>
          </div>
          <div className="p-6 max-h-[70vh] overflow-auto">
            <iframe
              src={viewingPamphlet}
              className="w-full h-96 rounded-lg border border-gray-200 dark:border-gray-700"
              title="Event Pamphlet"
            />
            <div className="mt-4 flex justify-between items-center">
              <a
                href={viewingPamphlet}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all duration-200 text-sm"
              >
                <FileText className="h-4 w-4" />
                Open in New Tab
              </a>
              <button
                onClick={closePamphletModal}
                className="px-4 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200 text-sm"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }, [viewingPamphlet, closePamphletModal]);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-6 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-6 flex items-center justify-center">
        <div className="max-w-md text-center">
          <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-8">
            <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Authentication Required</h1>
            <p className="text-gray-600 dark:text-gray-400 mb-4">Please log in to access the events page.</p>
          </div>
        </div>
      </div>
    );
  }

  if (!hasAccess) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-6 flex items-center justify-center">
        <div className="max-w-md text-center">
          <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-8">
            <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Access Denied</h1>
            <p className="text-gray-600 dark:text-gray-400 mb-4">You need to be a pastor or administrator to access the events page.</p>
            <p className="text-sm text-gray-500 dark:text-gray-500">
              Current role: {profile?.admin_role === 'admin' ? 'Admin' : profile?.pastor_role ? 'Pastor' : 'Member'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-4 sm:p-6">
      {loading && events.length === 0 && !showEventForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600 dark:text-gray-400">Loading events...</p>
          </div>
        </div>
      )}
      
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 sm:mb-8">
          <div>
            <h1 className="text-2xl sm:text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
              Events & Sermons
            </h1>
            <p className="text-gray-600 dark:text-gray-400 text-sm sm:text-base">Manage church events and sermons</p>
            <div className="mt-2">
              <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs sm:text-sm font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
                {isAdmin?.() ? 'Administrator' : isPastor?.() ? 'Pastor' : 'Member'}
              </span>
            </div>
          </div>
          <div className="flex gap-2 sm:gap-3">
            <button 
              onClick={() => setShowSermonList(!showSermonList)}
              className="flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-orange-600 to-amber-600 text-white rounded-xl hover:shadow-lg transition-all duration-200 hover:scale-105 font-medium text-sm group"
            >
              <BookOpen className="h-4 w-5 group-hover:scale-110 transition-transform duration-200" />
              {showSermonList ? 'Hide Sermons' : 'View Sermons'}
            </button>
            <button 
              onClick={() => setShowEventForm(!showEventForm)}
              className="flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:shadow-lg transition-all duration-200 hover:scale-105 font-medium text-sm group"
            >
              <Plus className="h-4 w-5 group-hover:rotate-90 transition-transform duration-200" />
              {showEventForm ? 'Cancel' : 'Create Event'}
            </button>
          </div>
        </div>

        {success && (
          <div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-green-100 dark:bg-green-900/30 border border-green-300 dark:border-green-700 rounded-xl text-green-700 dark:text-green-300 text-sm sm:text-base">
            {success}
          </div>
        )}

        {error && (
          <div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700 rounded-xl text-red-700 dark:text-red-300 text-sm sm:text-base">
            {error}
          </div>
        )}

        {showSermonList && <SermonList />}

        {showEventForm && (
          <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-4 sm:p-6 mb-6 sm:mb-8 shadow-lg hover:shadow-xl transition-all duration-300">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-4 sm:mb-6">Create New Event</h2>
            <form onSubmit={handleEventSubmit} className="space-y-4 sm:space-y-6">
              {!eventFormData.eventType && (
                <div className="space-y-4">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Select Event Type *</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <button
                      type="button"
                      onClick={() => {
                        setEventFormData({ 
                          ...eventFormData, 
                          eventType: 'sunday',
                          name: isSundayServiceSet ? eventFormData.name : 'Sunday'
                        });
                        if (!isSundayServiceSet) {
                          setIsSundayServiceSet(true);
                        }
                      }}
                      className="flex items-center justify-center gap-3 p-4 sm:p-6 border-2 border-gray-300 dark:border-gray-600 rounded-xl hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all duration-200"
                    >
                      <CalendarIcon className="h-6 w-6 sm:h-8 sm:w-8 text-blue-600" />
                      <div className="text-left">
                        <div className="font-semibold text-gray-900 dark:text-white text-sm sm:text-lg">Sunday Service</div>
                        <div className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">Regular Sunday worship service</div>
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => setEventFormData({ ...eventFormData, eventType: 'other' })}
                      className="flex items-center justify-center gap-3 p-4 sm:p-6 border-2 border-gray-300 dark:border-gray-600 rounded-xl hover:border-purple-500 hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-all duration-200"
                    >
                      <Plus className="h-6 w-6 sm:h-8 sm:w-8 text-purple-600" />
                      <div className="text-left">
                        <div className="font-semibold text-gray-900 dark:text-white text-sm sm:text-lg">Other Event</div>
                        <div className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">Custom event with your own name</div>
                      </div>
                    </button>
                  </div>
                </div>
              )}

              {eventFormData.eventType && (
                <>
                  <div className="flex items-center gap-2 mb-4">
                    <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full text-xs sm:text-sm font-medium">
                      {eventFormData.eventType === 'sunday' ? 'Sunday Service' : 'Other Event'}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setEventFormData({ 
                          ...eventFormData, 
                          eventType: '', 
                          name: '' 
                        });
                        setIsSundayServiceSet(false);
                      }}
                      className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 text-xs sm:text-sm underline"
                    >
                      Change type
                    </button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                    {eventFormData.eventType === 'sunday' ? (
                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Event Name *</label>
                        <input
                          type="text"
                          value={eventFormData.name}
                          onChange={(e) => {
                            const value = e.target.value;
                            setEventFormData({ ...eventFormData, name: value });
                            if (value !== 'Sunday') {
                              setIsSundayServiceSet(true);
                            }
                          }}
                          className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-sm sm:text-base"
                          placeholder="Enter event name (default: Sunday)"
                          required
                          minLength={2}
                          maxLength={100}
                        />
                        <p className="text-xs text-gray-500">Default name is "Sunday" but you can customize it</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Event Name *</label>
                        <input
                          type="text"
                          value={eventFormData.name}
                          onChange={(e) => setEventFormData({ ...eventFormData, name: e.target.value })}
                          className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-sm sm:text-base"
                          placeholder="Enter event name"
                          required
                          minLength={2}
                          maxLength={100}
                        />
                      </div>
                    )}
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Topic</label>
                      <input
                        type="text"
                        value={eventFormData.topic}
                        onChange={(e) => setEventFormData({ ...eventFormData, topic: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-sm sm:text-base"
                        placeholder="Event topic or theme"
                        maxLength={200}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Date *</label>
                      <input
                        type="date"
                        value={eventFormData.eventDate}
                        onChange={(e) => setEventFormData({ ...eventFormData, eventDate: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-sm sm:text-base"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Time *</label>
                      <input
                        type="time"
                        value={eventFormData.eventTime}
                        onChange={(e) => setEventFormData({ ...eventFormData, eventTime: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-sm sm:text-base"
                        required
                      />
                    </div>
                    <div className="md:col-span-2 space-y-2">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Location</label>
                      <input
                        type="text"
                        value={eventFormData.location}
                        onChange={(e) => setEventFormData({ ...eventFormData, location: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-sm sm:text-base"
                        placeholder="Event location"
                        maxLength={200}
                      />
                    </div>

                    <div className="md:col-span-2 space-y-4">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Event Scope</label>
                      <div className="flex flex-col sm:flex-row gap-4">
                        <label className="flex items-center gap-3 p-4 border border-gray-300 dark:border-gray-600 rounded-xl cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200 flex-1">
                          <input
                            type="radio"
                            name="eventScope"
                            checked={eventFormData.isWholeChurch}
                            onChange={() => setEventFormData({ ...eventFormData, isWholeChurch: true, targetCellGroups: [], targetMinistryGroups: [], targetDepartments: [] })}
                            className="text-blue-600 border-gray-300 focus:ring-2 focus:ring-blue-500"
                          />
                          <Building className="h-5 w-5 text-purple-600" />
                          <div>
                            <div className="font-medium text-gray-900 dark:text-white text-sm sm:text-base">Whole Church Event</div>
                            <div className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">All church members are expected to attend</div>
                          </div>
                        </label>
                        <label className="flex items-center gap-3 p-4 border border-gray-300 dark:border-gray-600 rounded-xl cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200 flex-1">
                          <input
                            type="radio"
                            name="eventScope"
                            checked={!eventFormData.isWholeChurch}
                            onChange={() => setEventFormData({ ...eventFormData, isWholeChurch: false })}
                            className="text-blue-600 border-gray-300 focus:ring-2 focus:ring-blue-500"
                          />
                          <UsersIcon className="h-5 w-5 text-orange-600" />
                          <div>
                            <div className="font-medium text-gray-900 dark:text-white text-sm sm:text-base">Target Groups Only</div>
                            <div className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">Specific cell groups, ministry groups, or departments</div>
                          </div>
                        </label>
                      </div>
                    </div>

                    {!eventFormData.isWholeChurch && (
                      <>
                        <div className="space-y-2">
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Target Cell Groups</label>
                          <div className="space-y-2 max-h-40 overflow-y-auto">
                            {cellGroups.map((group) => (
                              <label key={group.id} className="flex items-center gap-3 p-3 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200">
                                <input
                                  type="checkbox"
                                  checked={eventFormData.targetCellGroups.includes(group.id)}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setEventFormData({
                                        ...eventFormData,
                                        targetCellGroups: [...eventFormData.targetCellGroups, group.id]
                                      });
                                    } else {
                                      setEventFormData({
                                        ...eventFormData,
                                        targetCellGroups: eventFormData.targetCellGroups.filter(id => id !== group.id)
                                      });
                                    }
                                  }}
                                  className="text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                                />
                                <span className="text-gray-700 dark:text-gray-300 text-sm">{group.name}</span>
                              </label>
                            ))}
                          </div>
                        </div>
                        <div className="space-y-2">
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Target Ministry Groups</label>
                          <div className="space-y-2 max-h-40 overflow-y-auto">
                            {ministryGroups.map((group) => (
                              <label key={group.id} className="flex items-center gap-3 p-3 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200">
                                <input
                                  type="checkbox"
                                  checked={eventFormData.targetMinistryGroups.includes(group.id)}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setEventFormData({
                                        ...eventFormData,
                                        targetMinistryGroups: [...eventFormData.targetMinistryGroups, group.id]
                                      });
                                    } else {
                                      setEventFormData({
                                        ...eventFormData,
                                        targetMinistryGroups: eventFormData.targetMinistryGroups.filter(id => id !== group.id)
                                      });
                                    }
                                  }}
                                  className="text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                                />
                                <span className="text-gray-700 dark:text-gray-300 text-sm">{group.name}</span>
                              </label>
                            ))}
                          </div>
                        </div>
                        <div className="space-y-2">
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Target Departments</label>
                          <div className="space-y-2 max-h-40 overflow-y-auto">
                            {departments.map((dept) => (
                              <label key={dept.id} className="flex items-center gap-3 p-3 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200">
                                <input
                                  type="checkbox"
                                  checked={eventFormData.targetDepartments.includes(dept.id)}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setEventFormData({
                                        ...eventFormData,
                                        targetDepartments: [...eventFormData.targetDepartments, dept.id]
                                      });
                                    } else {
                                      setEventFormData({
                                        ...eventFormData,
                                        targetDepartments: eventFormData.targetDepartments.filter(id => id !== dept.id)
                                      });
                                    }
                                  }}
                                  className="text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                                />
                                <span className="text-gray-700 dark:text-gray-300 text-sm">{dept.name}</span>
                              </label>
                            ))}
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                  <div className="flex gap-3">
                    <button
                      type="submit"
                      disabled={loading}
                      className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:shadow-lg transition-all duration-200 font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {loading ? 'Creating...' : 'Create Event'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowEventForm(false)}
                      className="px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200 font-medium text-sm"
                    >
                      Cancel
                    </button>
                  </div>
                </>
              )}
            </form>
          </div>
        )}

        {!loading && events.length === 0 && !showEventForm ? (
          <div className="text-center py-12 bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl border border-gray-200/50 dark:border-gray-700/50 rounded-2xl">
            <CalendarIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-600 dark:text-gray-400 mb-2">No Events Yet</h3>
            <p className="text-gray-500 dark:text-gray-500">Create your first event to get started</p>
          </div>
        ) : (
          <div className="space-y-4 sm:space-y-6">
            {events.map((event) => {
              const scopeBadge = getEventScopeBadge(event);
              const statusBadge = getEventStatusBadge(event);
              const ScopeIcon = scopeBadge.icon;
              const StatusIcon = statusBadge.icon;
              const sermon = getSermonForEvent(event.id);
              const stats = getAttendanceStats(event.id);
              
              return (
                <div key={event.id} className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-4 sm:p-6 hover:shadow-xl transition-all duration-300 hover:border-gray-300/50 dark:hover:border-gray-600/50">
                  <div className="flex flex-col lg:flex-row justify-between gap-4 sm:gap-6">
                    <div className="flex-1">
                      <div className="flex items-start gap-3 sm:gap-4 mb-4">
                        <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center flex-shrink-0 shadow-lg">
                          <CalendarIcon className="h-6 w-6 sm:h-7 sm:w-7 text-white" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 sm:gap-3 mb-2 flex-wrap">
                            <h3 className="text-lg sm:text-2xl font-bold text-gray-900 dark:text-white">{event.name}</h3>
                            <span className={`px-2 py-1 sm:px-3 sm:py-1 rounded-full text-xs sm:text-sm font-medium flex items-center gap-1 sm:gap-2 ${statusBadge.color}`}>
                              <StatusIcon className="h-3 w-3" />
                              {statusBadge.text}
                            </span>
                            <span className={`px-2 py-1 sm:px-3 sm:py-1 rounded-full text-xs sm:text-sm font-medium flex items-center gap-1 sm:gap-2 ${scopeBadge.color}`}>
                              <ScopeIcon className="h-3 w-3" />
                              {scopeBadge.text}
                            </span>
                            {sermon && (
                              <span className="px-2 py-1 sm:px-3 sm:py-1 rounded-full text-xs sm:text-sm font-medium flex items-center gap-1 sm:gap-2 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
                                <BookOpen className="h-3 w-3" />
                                Has Sermon
                              </span>
                            )}
                          </div>
                          {event.topic && (
                            <p className="text-blue-600 dark:text-blue-400 font-medium text-sm sm:text-base">{event.topic}</p>
                          )}
                        </div>
                      </div>
                      
                      <div className="space-y-2 sm:space-y-3 text-gray-600 dark:text-gray-400 ml-0 sm:ml-18">
                        <div className="flex items-center gap-2 sm:gap-3">
                          <CalendarIcon className="h-4 w-4" />
                          <span className="font-medium text-sm sm:text-base">{formatDate(event.event_date)}</span>
                        </div>
                        <div className="flex items-center gap-2 sm:gap-3">
                          <Clock className="h-4 w-4" />
                          <span className="font-medium text-sm sm:text-base">{formatTime(event.event_time)}</span>
                        </div>
                        {event.location && (
                          <div className="flex items-center gap-2 sm:gap-3">
                            <MapPin className="h-4 w-4" />
                            <span className="font-medium text-sm sm:text-base">{event.location}</span>
                          </div>
                        )}
                      </div>

                      {sermon && (
                        <div className="mt-4 p-3 sm:p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-xl">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div className="flex items-center gap-2 sm:gap-3">
                              <BookOpen className="h-5 w-5 text-blue-600 flex-shrink-0" />
                              <div className="min-w-0">
                                <div className="font-medium text-gray-900 dark:text-white text-sm sm:text-base truncate">
                                  {sermon.title} by {sermon.pastor_name}
                                </div>
                                <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                                  {sermon.summary}
                                </div>
                              </div>
                            </div>
                            <div className="flex gap-2">
                              {sermon.video_url && (
                                <a
                                  href={sermon.video_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-1 px-2 py-2 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-lg text-xs hover:bg-purple-200 dark:hover:bg-purple-800/30 transition-all duration-200 flex-shrink-0"
                                >
                                  <PlayCircle className="h-3 w-3" />
                                  Video
                                </a>
                              )}
                              {sermon.document_url && (
                                <a
                                  href={sermon.document_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-1 px-2 py-2 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-lg text-xs hover:bg-green-200 dark:hover:bg-green-800/30 transition-all duration-200 flex-shrink-0"
                                >
                                  <Download className="h-3 w-3" />
                                  Notes
                                </a>
                              )}
                            </div>
                          </div>
                        </div>
                      )}

                      {event.pamphlet_url && (
                        <div className="mt-4">
                          <div className="flex flex-col sm:flex-row sm:items-center gap-3 flex-wrap">
                            <div className="flex items-center gap-2">
                              <FileText className="h-5 w-5 text-green-600" />
                              <span className="font-medium text-gray-700 dark:text-gray-300 text-sm sm:text-base">Event Pamphlet:</span>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              <button
                                onClick={() => viewPamphlet(event.pamphlet_url!)}
                                className="inline-flex items-center gap-2 px-3 py-2 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-xl hover:bg-green-200 dark:hover:bg-green-800/30 transition-all duration-200 text-xs sm:text-sm"
                              >
                                <Eye className="h-3 w-3 sm:h-4 sm:w-4" />
                                View Pamphlet
                              </button>
                              <a
                                href={event.pamphlet_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 px-3 py-2 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-xl hover:bg-blue-200 dark:hover:bg-blue-800/30 transition-all duration-200 text-xs sm:text-sm"
                              >
                                <FileText className="h-3 w-3 sm:h-4 sm:w-4" />
                                Download
                              </a>
                              {hasAccess && (
                                <button
                                  onClick={() => deletePamphlet(event.id)}
                                  className="inline-flex items-center gap-2 px-3 py-2 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-xl hover:bg-red-200 dark:hover:bg-red-800/30 transition-all duration-200 text-xs sm:text-sm"
                                >
                                  <X className="h-3 w-3 sm:h-4 sm:w-4" />
                                  Remove
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      )}

                      {hasAccess && !event.pamphlet_url && (
                        <div className="mt-4">
                          <label className="inline-flex items-center gap-2 px-3 py-2 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-xl hover:bg-blue-200 dark:hover:bg-blue-800/30 transition-all duration-200 cursor-pointer text-xs sm:text-sm">
                            <Upload className="h-3 w-3 sm:h-4 sm:w-4" />
                            {uploadingPamphlet === event.id ? 'Uploading...' : 'Upload Pamphlet'}
                            <input
                              type="file"
                              accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  uploadPamphlet(event.id, file);
                                }
                              }}
                              className="hidden"
                              disabled={uploadingPamphlet === event.id}
                            />
                          </label>
                        </div>
                      )}

                      <div className="mt-4 sm:mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                        <button
                          onClick={() => openAttendeeModal('present', event.id)}
                          className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 border border-green-200 dark:border-green-700 rounded-xl p-3 sm:p-4 text-center hover:shadow-lg transition-all duration-200 cursor-pointer"
                        >
                          <div className="text-lg sm:text-2xl font-bold text-green-600 dark:text-green-400">{stats.present}</div>
                          <div className="text-xs sm:text-sm text-green-700 dark:text-green-300 font-medium">Present</div>
                          <div className="text-xs text-green-600 dark:text-green-400 mt-1">Click to view</div>
                        </button>
                        <button
                          onClick={() => openAttendeeModal('absent', event.id)}
                          className="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20 border border-red-200 dark:border-red-700 rounded-xl p-3 sm:p-4 text-center hover:shadow-lg transition-all duration-200 cursor-pointer"
                        >
                          <div className="text-lg sm:text-2xl font-bold text-red-600 dark:text-red-400">{stats.absent}</div>
                          <div className="text-xs sm:text-sm text-red-700 dark:text-red-300 font-medium">Absent</div>
                          <div className="text-xs text-red-600 dark:text-red-400 mt-1">Click to view</div>
                        </button>
                        <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 border border-blue-200 dark:border-blue-700 rounded-xl p-3 sm:p-4 text-center">
                          <div className="text-lg sm:text-2xl font-bold text-blue-600 dark:text-blue-400">
                            {stats.firstTimers}
                          </div>
                          <div className="text-xs sm:text-sm text-blue-700 dark:text-blue-300 font-medium">First Timers</div>
                        </div>
                        <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 border border-purple-200 dark:border-purple-700 rounded-xl p-3 sm:p-4 text-center">
                          <div className="text-lg sm:text-2xl font-bold text-purple-600 dark:text-purple-400">
                            {stats.total}
                          </div>
                          <div className="text-xs sm:text-sm text-purple-700 dark:text-purple-300 font-medium">Total Registered</div>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col gap-2 sm:gap-3 lg:w-48">
                      {!event.is_completed && (
                        <>
                          <button
                            onClick={() => openBulkAttendanceModal(event.id)}
                            className="flex items-center justify-center gap-2 px-3 py-3 bg-gradient-to-r from-orange-600 to-amber-600 text-white rounded-xl hover:shadow-lg transition-all duration-200 font-medium text-xs sm:text-sm"
                          >
                            <UsersIcon className="h-3 w-3 sm:h-4 sm:w-4" />
                            Bulk Attendance
                          </button>
                          <button
                            onClick={() => openNewcomerModal(event.id)}
                            className="flex items-center justify-center gap-2 px-3 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl hover:shadow-lg transition-all duration-200 font-medium text-xs sm:text-sm"
                          >
                            <User className="h-3 w-3 sm:h-4 sm:w-4" />
                            Add Newcomer
                          </button>
                          {hasAccess && (
                            <button
                              onClick={() => handleCompleteEvent(event.id)}
                              className="flex items-center justify-center gap-2 px-3 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl hover:shadow-lg transition-all duration-200 font-medium text-xs sm:text-sm"
                            >
                              <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4" />
                              Complete Event
                            </button>
                          )}
                        </>
                      )}
                      <button
                        onClick={() => openSermonModal(event.id)}
                        className="flex items-center justify-center gap-2 px-3 py-3 bg-gradient-to-r from-orange-600 to-amber-600 text-white rounded-xl hover:shadow-lg transition-all duration-200 font-medium text-xs sm:text-sm"
                      >
                        <BookOpen className="h-3 w-3 sm:h-4 sm:w-4" />
                        {sermon ? 'Edit Sermon' : 'Add Sermon'}
                      </button>
                      <button
                        onClick={() => setShowSyncModal(event.id)}
                        className="flex items-center justify-center gap-2 px-3 py-3 bg-gradient-to-r from-indigo-600 to-blue-600 text-white rounded-xl hover:shadow-lg transition-all duration-200 font-medium text-xs sm:text-sm"
                      >
                        <Upload className="h-3 w-3 sm:h-4 sm:w-4" />
                        Sync to Cloud
                      </button>
                      {hasAccess && (
                        <button
                          onClick={() => setShowDeleteConfirm(event.id)}
                          className="flex items-center justify-center gap-2 px-3 py-3 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-xl hover:shadow-lg transition-all duration-200 font-medium text-xs sm:text-sm"
                        >
                          <Trash2 className="h-3 w-3 sm:h-4 sm:w-4" />
                          Delete Event
                        </button>
                      )}
                      <button
                        onClick={() => openAttendeeModal('present', event.id)}
                        className="flex items-center justify-between px-3 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200 font-medium text-xs sm:text-sm"
                      >
                        <span>View Present ({stats.present})</span>
                        <Eye className="h-3 w-3 sm:h-4 sm:w-4" />
                      </button>
                      <button
                        onClick={() => openAttendeeModal('absent', event.id)}
                        className="flex items-center justify-between px-3 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200 font-medium text-xs sm:text-sm"
                      >
                        <span>View Absent ({stats.absent})</span>
                        <Eye className="h-3 w-3 sm:h-4 sm:w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <SermonModal
        showSermonModal={showSermonModal}
        closeSermonModal={closeSermonModal}
        sermonFormData={sermonFormData}
        setSermonFormData={setSermonFormData}
        editingSermon={editingSermon}
        sermonLoading={sermonLoading}
        uploadingSermonFile={uploadingSermonFile}
        handleSermonSubmit={handleSermonSubmit}
      />

      {/* Use the separate NewcomerModal component */}
      <NewcomerModal
        showNewcomerModal={showNewcomerModal}
        closeNewcomerModal={closeNewcomerModal}
        handleNewcomerSubmit={handleNewcomerSubmit}
        loading={loading}
        eventName={showNewcomerModal ? events.find(e => e.id === showNewcomerModal)?.name : undefined}
      />

      <PamphletModal />
      
      {/* Use the separate BulkAttendanceModal component with useMemo optimization */}
      <BulkAttendanceModal
        showBulkAttendanceModal={showBulkAttendanceModal}
        closeBulkAttendanceModal={closeBulkAttendanceModal}
        events={events}
        fetchTargetMembersForEvent={fetchTargetMembersForEvent}
        bulkAttendanceSearch={bulkAttendanceSearch}
        setBulkAttendanceSearch={setBulkAttendanceSearch}
        bulkAttendance={bulkAttendance}
        handleBulkAttendanceChange={handleBulkAttendanceChange}
        saveBulkAttendance={saveBulkAttendance}
        loading={loading}
        attendanceNotesRef={attendanceNotesRef}
        getInitials={getInitials}
      />
      
      <AttendeeModal />
      <SyncModal />
      <DeleteConfirmModal />
    </div>
  );
};

export default Events;
