import { useState, useEffect, memo } from 'react';
import { X, RefreshCw } from 'lucide-react';

interface ServiceTime {
  id?: string;
  day: string;
  time: string;
  type: string;
  description: string;
}

interface CommunicationTemplate {
  id?: string;
  name: string;
  subject: string;
  body: string;
  type: 'email' | 'sms' | 'notification';
}

interface ChurchInfo {
  id?: string;
  name: string;
  address: string;
  phone: string;
  email: string;
  website: string;
  denomination: string;
  doctrinal_statement: string;
  service_times: ServiceTime[];
  communication_templates: CommunicationTemplate[];
}

interface ChurchInfoModalProps {
  churchInfo: ChurchInfo | null;
  onClose: () => void;
  onSave: (info: ChurchInfo) => Promise<void>;
  loading: boolean;
  error: string | null;
}

const ChurchInfoModal = memo(({ 
  churchInfo, 
  onClose, 
  onSave, 
  loading, 
  error 
}: ChurchInfoModalProps) => {
  // Use local state for form fields to prevent parent re-renders
  const [localInfo, setLocalInfo] = useState<ChurchInfo>({
    name: '',
    address: '',
    phone: '',
    email: '',
    website: '',
    denomination: '',
    doctrinal_statement: '',
    service_times: [],
    communication_templates: []
  });

  // Initialize local state from props only once when modal opens
  useEffect(() => {
    if (churchInfo) {
      setLocalInfo(churchInfo);
    }
  }, []);

  const handleFieldChange = (field: keyof ChurchInfo, value: string) => {
    setLocalInfo(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSave = async () => {
    await onSave(localInfo);
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="flex justify-between items-center p-6 border-b border-gray-200">
          <h3 className="text-2xl font-bold text-gray-900">Church Information Management</h3>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="p-6">
          <div className="space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                <p className="text-red-700 font-medium">{error}</p>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Church Name</label>
                <input
                  type="text"
                  value={localInfo.name}
                  onChange={(e) => handleFieldChange('name', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Denomination</label>
                <input
                  type="text"
                  value={localInfo.denomination}
                  onChange={(e) => handleFieldChange('denomination', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Address</label>
              <textarea
                value={localInfo.address}
                onChange={(e) => handleFieldChange('address', e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Phone</label>
                <input
                  type="text"
                  value={localInfo.phone}
                  onChange={(e) => handleFieldChange('phone', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                <input
                  type="email"
                  value={localInfo.email}
                  onChange={(e) => handleFieldChange('email', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Website</label>
                <input
                  type="url"
                  value={localInfo.website}
                  onChange={(e) => handleFieldChange('website', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Doctrinal Statement</label>
              <textarea
                value={localInfo.doctrinal_statement}
                onChange={(e) => handleFieldChange('doctrinal_statement', e.target.value)}
                rows={6}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="Enter your church's doctrinal statement..."
              />
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <RefreshCw className="h-5 w-5 text-blue-400" />
                </div>
                <div className="ml-3">
                  <p className="text-sm text-blue-700">
                    Click "Save Changes" to save your updates.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <button
                onClick={handleSave}
                disabled={loading}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? 'Saving...' : 'Save Changes'}
              </button>
              <button onClick={onClose} className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50">
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

ChurchInfoModal.displayName = 'ChurchInfoModal';

export default ChurchInfoModal;
