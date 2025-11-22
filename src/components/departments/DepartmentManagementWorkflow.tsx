import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import DepartmentMeetingCreationStep from './DepartmentMeetingCreationStep';
import DepartmentAttendanceStep from './DepartmentAttendanceStep';
import DepartmentReportStep from './DepartmentReportStep';
import { UserPlus } from 'lucide-react';

interface DepartmentManagementWorkflowProps {
  department: any;
  meetings: any[];
  members: any[];
  onClose: () => void;
  onSuccess: (message: string) => void;
  onError: (message: string) => void;
}

const DepartmentManagementWorkflow: React.FC<DepartmentManagementWorkflowProps> = ({
  department,
  meetings,
  members,
  onClose,
  onSuccess,
  onError
}) => {
  const { profile, canCreateDepartmentMeetings, canManageDepartmentAttendance, canAddDepartmentNewcomers, canCreateDepartmentReports } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedMeeting, setSelectedMeeting] = useState<any>(null);

  const steps = [
    { number: 1, title: 'Schedule Meeting', description: 'Create a new meeting schedule' },
    { number: 2, title: 'Take Attendance', description: 'Record member attendance' },
    { number: 3, title: 'Add Newcomers', description: 'Register first-time visitors' },
    { number: 4, title: 'Create Report', description: 'Generate meeting report' }
  ];

  const canAccessStep = (stepNumber: number) => {
    if (!profile) return false;
    switch (stepNumber) {
      case 1: return canCreateDepartmentMeetings(department.id);
      case 2: return canManageDepartmentAttendance(department.id);
      case 3: return canAddDepartmentNewcomers(department.id);
      case 4: return canCreateDepartmentReports(department.id);
      default: return false;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between mb-8 relative">
        <div className="absolute top-4 left-0 right-0 h-0.5 bg-gray-200 -z-10"></div>
        {steps.map((step) => (
          <div key={step.number} className="text-center flex-1">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center mx-auto mb-2 transition-all duration-300 ${
              currentStep >= step.number 
                ? 'bg-blue-600 text-white shadow-lg' 
                : 'bg-gray-300 text-gray-600'
            }`}>
              {step.number}
            </div>
            <div className={`text-sm font-medium ${
              currentStep >= step.number ? 'text-blue-600' : 'text-gray-500'
            }`}>
              {step.title}
            </div>
            <div className="text-xs text-gray-500 mt-1 hidden sm:block">
              {step.description}
            </div>
          </div>
        ))}
      </div>

      <div className="bg-gray-50 rounded-xl p-6 min-h-[400px]">
        {currentStep === 1 && (
          <DepartmentMeetingCreationStep 
            department={department}
            onMeetingCreated={() => {
              onSuccess('Department meeting created successfully!');
              setCurrentStep(2);
            }}
            onError={onError}
          />
        )}

        {currentStep === 2 && (
          <DepartmentAttendanceStep
            department={department}
            meetings={meetings}
            selectedMeeting={selectedMeeting}
            onMeetingSelect={setSelectedMeeting}
            onAttendanceSaved={() => {
              onSuccess('Department attendance saved successfully!');
              setCurrentStep(3);
            }}
            onError={onError}
          />
        )}

        {currentStep === 3 && (
          <div className="text-center py-16">
            <UserPlus className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Add Newcomers Step</h3>
            <p className="text-gray-600">Newcomer registration would go here</p>
            <button
              onClick={() => {
                onSuccess('Newcomer added successfully!');
                setCurrentStep(4);
              }}
              className="mt-4 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Mark Newcomer Complete
            </button>
          </div>
        )}

        {currentStep === 4 && (
          <DepartmentReportStep
            department={department}
            meetings={meetings}
            selectedMeeting={selectedMeeting}
            onMeetingSelect={setSelectedMeeting}
            onReportCreated={() => {
              onSuccess('Department report generated successfully!');
              onClose();
            }}
            onError={onError}
          />
        )}
      </div>

      <div className="flex justify-between pt-6 border-t border-gray-200">
        <button 
          onClick={() => setCurrentStep(prev => prev - 1)}
          disabled={currentStep === 1}
          className="px-6 py-3 bg-gray-300 text-gray-700 rounded-xl hover:bg-gray-400 transition-all duration-200 font-medium disabled:opacity-50"
        >
          Previous
        </button>
        
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="px-6 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-all duration-200 font-medium"
          >
            Close
          </button>
          
          <button 
            onClick={() => setCurrentStep(prev => prev + 1)}
            disabled={currentStep === 4 || !canAccessStep(currentStep + 1)}
            className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all duration-200 font-medium disabled:opacity-50"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
};

export default DepartmentManagementWorkflow;
