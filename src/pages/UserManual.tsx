import { useState } from 'react';
import { 
  Book, 
  Home, 
  Users, 
  Calendar, 
  Building, 
  TrendingUp, 
  BarChart3, 
  Settings,
  ChevronDown,
  ChevronRight,
  LogIn,
  UserPlus,
  Bell,
  Search
} from 'lucide-react';

interface ManualSection {
  id: string;
  title: string;
  icon: React.ReactNode;
  content: React.ReactNode;
}

const UserManual = () => {
  const [expandedSections, setExpandedSections] = useState<string[]>(['getting-started']);

  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev => 
      prev.includes(sectionId) 
        ? prev.filter(id => id !== sectionId)
        : [...prev, sectionId]
    );
  };

  const sections: ManualSection[] = [
    {
      id: 'getting-started',
      title: 'Getting Started',
      icon: <LogIn className="h-5 w-5" />,
      content: (
        <div className="space-y-4">
          <h4 className="font-semibold text-gray-900 dark:text-white">Logging In</h4>
          <ol className="list-decimal list-inside space-y-2 text-gray-600 dark:text-gray-300">
            <li>Open the application in your web browser</li>
            <li>Enter your <strong>Username</strong> (provided by your administrator)</li>
            <li>Enter your <strong>PIN</strong> (4-digit code)</li>
            <li>Click the <strong>"Sign In"</strong> button</li>
          </ol>
          
          <h4 className="font-semibold text-gray-900 dark:text-white mt-6">Navigation</h4>
          <p className="text-gray-600 dark:text-gray-300">
            Use the sidebar menu on the left to navigate between different sections of the app:
          </p>
          <ul className="list-disc list-inside space-y-1 text-gray-600 dark:text-gray-300 ml-4">
            <li><strong>Dashboard</strong> - Overview of church activities</li>
            <li><strong>Members</strong> - Manage church members</li>
            <li><strong>Cell Groups</strong> - Manage small groups</li>
            <li><strong>Departments</strong> - Manage church departments</li>
            <li><strong>Events</strong> - Create and manage events</li>
            <li><strong>Trends</strong> - View attendance trends</li>
            <li><strong>Analytics</strong> - Detailed statistics</li>
            <li><strong>Admin</strong> - Administrative settings</li>
          </ul>
          
          <div className="bg-blue-50 dark:bg-blue-900/30 p-4 rounded-lg mt-4">
            <p className="text-blue-700 dark:text-blue-300 text-sm">
              <strong>Tip:</strong> On mobile devices, tap the menu icon (☰) in the top-left corner to open the sidebar.
            </p>
          </div>
        </div>
      )
    },
    {
      id: 'dashboard',
      title: 'Dashboard',
      icon: <Home className="h-5 w-5" />,
      content: (
        <div className="space-y-4">
          <p className="text-gray-600 dark:text-gray-300">
            The Dashboard provides a quick overview of your church's activities and key metrics.
          </p>
          
          <h4 className="font-semibold text-gray-900 dark:text-white">Key Features:</h4>
          <ul className="list-disc list-inside space-y-2 text-gray-600 dark:text-gray-300 ml-4">
            <li><strong>Quick Stats</strong> - Total members, active groups, upcoming events</li>
            <li><strong>Recent Activity</strong> - Latest meetings and attendance records</li>
            <li><strong>Sermon Summaries</strong> - Recent sermon notes and summaries</li>
            <li><strong>Upcoming Events</strong> - List of scheduled events</li>
          </ul>
          
          <h4 className="font-semibold text-gray-900 dark:text-white mt-6">Sermon Summaries</h4>
          <p className="text-gray-600 dark:text-gray-300">
            View and manage sermon summaries from the dashboard. Administrators can add new sermon summaries with:
          </p>
          <ul className="list-disc list-inside space-y-1 text-gray-600 dark:text-gray-300 ml-4">
            <li>Pastor name</li>
            <li>Sermon date</li>
            <li>Summary text</li>
          </ul>
        </div>
      )
    },
    {
      id: 'members',
      title: 'Members Management',
      icon: <Users className="h-5 w-5" />,
      content: (
        <div className="space-y-4">
          <p className="text-gray-600 dark:text-gray-300">
            The Members section allows you to manage all church members, including adding new members, editing profiles, and tracking membership status.
          </p>
          
          <h4 className="font-semibold text-gray-900 dark:text-white">Adding a New Member</h4>
          <ol className="list-decimal list-inside space-y-2 text-gray-600 dark:text-gray-300">
            <li>Click the <strong>"Add Member"</strong> button</li>
            <li>Fill in the required fields:
              <ul className="list-disc list-inside ml-6 mt-1">
                <li>Name and Surname</li>
                <li>Phone number</li>
                <li>Email (optional)</li>
                <li>Gender</li>
                <li>Cell Group assignment</li>
              </ul>
            </li>
            <li>Set membership status (Newcomer, Signed Member, Not Attending)</li>
            <li>Click <strong>"Save"</strong> to add the member</li>
          </ol>
          
          <h4 className="font-semibold text-gray-900 dark:text-white mt-6">Member Status Types</h4>
          <ul className="list-disc list-inside space-y-2 text-gray-600 dark:text-gray-300 ml-4">
            <li><strong>Newcomer</strong> - First-time visitors or new attendees</li>
            <li><strong>Signed Member</strong> - Official church members</li>
            <li><strong>Not Attending</strong> - Members who are no longer actively attending</li>
          </ul>
          
          <h4 className="font-semibold text-gray-900 dark:text-white mt-6">Searching Members</h4>
          <p className="text-gray-600 dark:text-gray-300">
            Use the search bar to find members by name, surname, or phone number. You can also filter by status or cell group.
          </p>
        </div>
      )
    },
    {
      id: 'cell-groups',
      title: 'Cell Groups',
      icon: <Users className="h-5 w-5" />,
      content: (
        <div className="space-y-4">
          <p className="text-gray-600 dark:text-gray-300">
            Cell Groups are small fellowship groups that meet regularly. This section helps you manage these groups and their meetings.
          </p>
          
          <h4 className="font-semibold text-gray-900 dark:text-white">Creating a Meeting</h4>
          <ol className="list-decimal list-inside space-y-2 text-gray-600 dark:text-gray-300">
            <li>Select your cell group from the list</li>
            <li>Click <strong>"Create Meeting"</strong></li>
            <li>Fill in meeting details:
              <ul className="list-disc list-inside ml-6 mt-1">
                <li>Date and Time</li>
                <li>Location</li>
                <li>Topic/Theme</li>
              </ul>
            </li>
            <li>Click <strong>"Save"</strong> to create the meeting</li>
          </ol>
          
          <h4 className="font-semibold text-gray-900 dark:text-white mt-6">Taking Attendance</h4>
          <ol className="list-decimal list-inside space-y-2 text-gray-600 dark:text-gray-300">
            <li>Open an existing meeting</li>
            <li>Go to the <strong>"Attendance"</strong> tab</li>
            <li>Mark each member as Present or Absent</li>
            <li>For absent members, you can add a reason/note</li>
            <li>Click <strong>"Save Attendance"</strong></li>
          </ol>
          
          <h4 className="font-semibold text-gray-900 dark:text-white mt-6">Adding Newcomers</h4>
          <ol className="list-decimal list-inside space-y-2 text-gray-600 dark:text-gray-300">
            <li>During a meeting, go to the <strong>"Newcomers"</strong> tab</li>
            <li>Click <strong>"Add Newcomer"</strong></li>
            <li>Enter the newcomer's details</li>
            <li>Select who invited them (if applicable)</li>
            <li>The newcomer will be automatically added to the members list</li>
          </ol>
          
          <h4 className="font-semibold text-gray-900 dark:text-white mt-6">Meeting Reports</h4>
          <p className="text-gray-600 dark:text-gray-300">
            After completing a meeting, you can create a report with:
          </p>
          <ul className="list-disc list-inside space-y-1 text-gray-600 dark:text-gray-300 ml-4">
            <li>Meeting summary</li>
            <li>Decisions made</li>
            <li>Action items</li>
            <li>Next meeting date</li>
          </ul>
        </div>
      )
    },
    {
      id: 'departments',
      title: 'Departments',
      icon: <Building className="h-5 w-5" />,
      content: (
        <div className="space-y-4">
          <p className="text-gray-600 dark:text-gray-300">
            Departments represent ministry teams within the church (e.g., Worship Team, Ushers, Media Team). This section works similarly to Cell Groups.
          </p>
          
          <h4 className="font-semibold text-gray-900 dark:text-white">Department Features:</h4>
          <ul className="list-disc list-inside space-y-2 text-gray-600 dark:text-gray-300 ml-4">
            <li><strong>Create Meetings</strong> - Schedule department meetings</li>
            <li><strong>Track Attendance</strong> - Record who attended</li>
            <li><strong>Add Members</strong> - Assign members to departments</li>
            <li><strong>Generate Reports</strong> - Create meeting summaries</li>
          </ul>
          
          <h4 className="font-semibold text-gray-900 dark:text-white mt-6">Managing Department Members</h4>
          <p className="text-gray-600 dark:text-gray-300">
            Each department can have members with different roles:
          </p>
          <ul className="list-disc list-inside space-y-1 text-gray-600 dark:text-gray-300 ml-4">
            <li><strong>Leader</strong> - Department head</li>
            <li><strong>Member</strong> - Regular department member</li>
          </ul>
        </div>
      )
    },
    {
      id: 'events',
      title: 'Events',
      icon: <Calendar className="h-5 w-5" />,
      content: (
        <div className="space-y-4">
          <p className="text-gray-600 dark:text-gray-300">
            The Events section allows you to create and manage church-wide events, including Sunday services and special gatherings.
          </p>
          
          <h4 className="font-semibold text-gray-900 dark:text-white">Creating an Event</h4>
          <ol className="list-decimal list-inside space-y-2 text-gray-600 dark:text-gray-300">
            <li>Click <strong>"Create Event"</strong></li>
            <li>Select the event type:
              <ul className="list-disc list-inside ml-6 mt-1">
                <li><strong>Sunday Service</strong> - Automatically names the event "Sunday"</li>
                <li><strong>Other Event</strong> - Enter a custom event name</li>
              </ul>
            </li>
            <li>Fill in event details:
              <ul className="list-disc list-inside ml-6 mt-1">
                <li>Date and Time</li>
                <li>Location</li>
                <li>Topic/Description</li>
              </ul>
            </li>
            <li>Choose target audience:
              <ul className="list-disc list-inside ml-6 mt-1">
                <li>Whole Church</li>
                <li>Specific Cell Groups</li>
                <li>Specific Departments</li>
              </ul>
            </li>
            <li>Click <strong>"Save"</strong></li>
          </ol>
          
          <h4 className="font-semibold text-gray-900 dark:text-white mt-6">Recording Event Attendance</h4>
          <ol className="list-decimal list-inside space-y-2 text-gray-600 dark:text-gray-300">
            <li>Open the event</li>
            <li>Click <strong>"Manage Attendees"</strong></li>
            <li>You can:
              <ul className="list-disc list-inside ml-6 mt-1">
                <li>Add existing members as attendees</li>
                <li>Add newcomers (first-time visitors)</li>
                <li>Mark attendance status (Present/Absent)</li>
                <li>Add notes for absent members</li>
              </ul>
            </li>
            <li>Click <strong>"Save"</strong> to record attendance</li>
          </ol>
          
          <h4 className="font-semibold text-gray-900 dark:text-white mt-6">Completing an Event</h4>
          <p className="text-gray-600 dark:text-gray-300">
            After an event concludes, you can mark it as complete. This finalizes the attendance records and moves the event to the completed events list.
          </p>
        </div>
      )
    },
    {
      id: 'trends',
      title: 'Trends',
      icon: <TrendingUp className="h-5 w-5" />,
      content: (
        <div className="space-y-4">
          <p className="text-gray-600 dark:text-gray-300">
            The Trends section provides visual insights into attendance patterns over time.
          </p>
          
          <h4 className="font-semibold text-gray-900 dark:text-white">Available Charts:</h4>
          <ul className="list-disc list-inside space-y-2 text-gray-600 dark:text-gray-300 ml-4">
            <li><strong>Attendance Over Time</strong> - Track attendance trends week by week</li>
            <li><strong>Cell Group Comparison</strong> - Compare attendance across groups</li>
            <li><strong>Department Activity</strong> - Monitor department engagement</li>
            <li><strong>Newcomer Trends</strong> - Track new visitor patterns</li>
          </ul>
          
          <h4 className="font-semibold text-gray-900 dark:text-white mt-6">Using Filters</h4>
          <p className="text-gray-600 dark:text-gray-300">
            You can filter the trend data by:
          </p>
          <ul className="list-disc list-inside space-y-1 text-gray-600 dark:text-gray-300 ml-4">
            <li>Date range</li>
            <li>Specific cell groups</li>
            <li>Specific departments</li>
            <li>Event types</li>
          </ul>
        </div>
      )
    },
    {
      id: 'analytics',
      title: 'Analytics',
      icon: <BarChart3 className="h-5 w-5" />,
      content: (
        <div className="space-y-4">
          <p className="text-gray-600 dark:text-gray-300">
            The Analytics section provides detailed statistics and reports for church leadership.
          </p>
          
          <h4 className="font-semibold text-gray-900 dark:text-white">Key Metrics:</h4>
          <ul className="list-disc list-inside space-y-2 text-gray-600 dark:text-gray-300 ml-4">
            <li><strong>Total Members</strong> - Overall membership count</li>
            <li><strong>Active Members</strong> - Members attending regularly</li>
            <li><strong>Newcomer Conversion</strong> - New visitors becoming members</li>
            <li><strong>Attendance Rates</strong> - Average attendance percentages</li>
          </ul>
          
          <h4 className="font-semibold text-gray-900 dark:text-white mt-6">Reports Available:</h4>
          <ul className="list-disc list-inside space-y-2 text-gray-600 dark:text-gray-300 ml-4">
            <li><strong>Cell Group Performance</strong> - Attendance and growth by group</li>
            <li><strong>Department Performance</strong> - Department activity metrics</li>
            <li><strong>Top Inviters</strong> - Members who bring the most newcomers</li>
            <li><strong>Absence Alerts</strong> - Members with frequent absences</li>
          </ul>
          
          <h4 className="font-semibold text-gray-900 dark:text-white mt-6">Printing Reports</h4>
          <p className="text-gray-600 dark:text-gray-300">
            Click the <strong>"Print Report"</strong> button to generate a formatted report for printing or PDF export.
          </p>
        </div>
      )
    },
    {
      id: 'admin',
      title: 'Administration',
      icon: <Settings className="h-5 w-5" />,
      content: (
        <div className="space-y-4">
          <p className="text-gray-600 dark:text-gray-300">
            The Admin section is for administrators to manage system settings and configurations.
          </p>
          
          <h4 className="font-semibold text-gray-900 dark:text-white">Church Information</h4>
          <p className="text-gray-600 dark:text-gray-300">
            Update your church's basic information:
          </p>
          <ul className="list-disc list-inside space-y-1 text-gray-600 dark:text-gray-300 ml-4">
            <li>Church Name</li>
            <li>Address</li>
            <li>Contact Information</li>
            <li>Service Times</li>
          </ul>
          
          <h4 className="font-semibold text-gray-900 dark:text-white mt-6">User Management</h4>
          <p className="text-gray-600 dark:text-gray-300">
            Administrators can manage user accounts and permissions:
          </p>
          <ul className="list-disc list-inside space-y-2 text-gray-600 dark:text-gray-300 ml-4">
            <li><strong>Create Login Credentials</strong> - Set up usernames and PINs for members</li>
            <li><strong>Assign Roles</strong> - Set user permissions (Admin, Group Leader, etc.)</li>
            <li><strong>Reset PINs</strong> - Help users who forgot their PIN</li>
          </ul>
          
          <h4 className="font-semibold text-gray-900 dark:text-white mt-6">System Configuration</h4>
          <p className="text-gray-600 dark:text-gray-300">
            Configure system-wide settings and preferences.
          </p>
          
          <div className="bg-yellow-50 dark:bg-yellow-900/30 p-4 rounded-lg mt-4">
            <p className="text-yellow-700 dark:text-yellow-300 text-sm">
              <strong>Note:</strong> Only users with Administrator role can access these settings.
            </p>
          </div>
        </div>
      )
    },
    {
      id: 'user-roles',
      title: 'User Roles & Permissions',
      icon: <UserPlus className="h-5 w-5" />,
      content: (
        <div className="space-y-4">
          <p className="text-gray-600 dark:text-gray-300">
            The system has different user roles with varying levels of access:
          </p>
          
          <h4 className="font-semibold text-gray-900 dark:text-white">Administrator</h4>
          <ul className="list-disc list-inside space-y-1 text-gray-600 dark:text-gray-300 ml-4">
            <li>Full access to all features</li>
            <li>Can manage all members, groups, and departments</li>
            <li>Can create and modify user accounts</li>
            <li>Can view all analytics and reports</li>
            <li>Can modify system settings</li>
          </ul>
          
          <h4 className="font-semibold text-gray-900 dark:text-white mt-4">Pastor</h4>
          <ul className="list-disc list-inside space-y-1 text-gray-600 dark:text-gray-300 ml-4">
            <li>View all church data</li>
            <li>Manage events and sermons</li>
            <li>View all analytics and reports</li>
          </ul>
          
          <h4 className="font-semibold text-gray-900 dark:text-white mt-4">Deacon</h4>
          <ul className="list-disc list-inside space-y-1 text-gray-600 dark:text-gray-300 ml-4">
            <li>View church-wide data</li>
            <li>Manage events</li>
            <li>View reports</li>
          </ul>
          
          <h4 className="font-semibold text-gray-900 dark:text-white mt-4">Cell Group Leader</h4>
          <ul className="list-disc list-inside space-y-1 text-gray-600 dark:text-gray-300 ml-4">
            <li>Manage their assigned cell group</li>
            <li>Create meetings and take attendance</li>
            <li>Add newcomers to their group</li>
            <li>Create meeting reports</li>
          </ul>
          
          <h4 className="font-semibold text-gray-900 dark:text-white mt-4">Department Leader</h4>
          <ul className="list-disc list-inside space-y-1 text-gray-600 dark:text-gray-300 ml-4">
            <li>Manage their assigned department</li>
            <li>Create meetings and take attendance</li>
            <li>Create department reports</li>
          </ul>
          
          <h4 className="font-semibold text-gray-900 dark:text-white mt-4">Member</h4>
          <ul className="list-disc list-inside space-y-1 text-gray-600 dark:text-gray-300 ml-4">
            <li>View their own profile</li>
            <li>View group/department information</li>
            <li>Limited access to reports</li>
          </ul>
        </div>
      )
    },
    {
      id: 'tips',
      title: 'Tips & Best Practices',
      icon: <Bell className="h-5 w-5" />,
      content: (
        <div className="space-y-4">
          <h4 className="font-semibold text-gray-900 dark:text-white">General Tips</h4>
          <ul className="list-disc list-inside space-y-2 text-gray-600 dark:text-gray-300 ml-4">
            <li>Take attendance immediately after meetings while details are fresh</li>
            <li>Record newcomer information as soon as they visit</li>
            <li>Create meeting reports within 24 hours of the meeting</li>
            <li>Review analytics weekly to identify trends</li>
          </ul>
          
          <h4 className="font-semibold text-gray-900 dark:text-white mt-6">For Cell Group Leaders</h4>
          <ul className="list-disc list-inside space-y-2 text-gray-600 dark:text-gray-300 ml-4">
            <li>Follow up with absent members within 48 hours</li>
            <li>Update member contact information regularly</li>
            <li>Track who invites newcomers to recognize and encourage them</li>
            <li>Use meeting reports to plan future topics</li>
          </ul>
          
          <h4 className="font-semibold text-gray-900 dark:text-white mt-6">For Administrators</h4>
          <ul className="list-disc list-inside space-y-2 text-gray-600 dark:text-gray-300 ml-4">
            <li>Review absence alerts weekly</li>
            <li>Monitor newcomer-to-member conversion rates</li>
            <li>Ensure all cell groups submit regular reports</li>
            <li>Back up important data by printing reports periodically</li>
          </ul>
          
          <div className="bg-green-50 dark:bg-green-900/30 p-4 rounded-lg mt-4">
            <h5 className="font-semibold text-green-800 dark:text-green-300">Quick Actions Reminder</h5>
            <ul className="list-disc list-inside space-y-1 text-green-700 dark:text-green-400 text-sm mt-2">
              <li>Use the search function to quickly find members</li>
              <li>Bookmark frequently used sections</li>
              <li>Check the Dashboard daily for updates</li>
            </ul>
          </div>
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-xl">
          <Book className="h-8 w-8 text-blue-600 dark:text-blue-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">User Manual</h1>
          <p className="text-gray-500 dark:text-gray-400">Complete guide to using the Church Management System</p>
        </div>
      </div>

      {/* Quick Search */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
          <Search className="h-5 w-5" />
          <span className="text-sm">Click on any section below to expand and learn more</span>
        </div>
      </div>

      {/* Table of Contents */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Table of Contents</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
          {sections.map((section) => (
            <button
              key={section.id}
              onClick={() => {
                toggleSection(section.id);
                document.getElementById(section.id)?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="flex items-center gap-2 p-2 text-left text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              {section.icon}
              <span>{section.title}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Manual Sections */}
      <div className="space-y-4">
        {sections.map((section) => (
          <div
            key={section.id}
            id={section.id}
            className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden"
          >
            <button
              onClick={() => toggleSection(section.id)}
              className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                  {section.icon}
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{section.title}</h3>
              </div>
              {expandedSections.includes(section.id) ? (
                <ChevronDown className="h-5 w-5 text-gray-500" />
              ) : (
                <ChevronRight className="h-5 w-5 text-gray-500" />
              )}
            </button>
            
            {expandedSections.includes(section.id) && (
              <div className="px-4 pb-4 border-t border-gray-100 dark:border-gray-700">
                <div className="pt-4">
                  {section.content}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl p-6 text-white">
        <h3 className="text-lg font-semibold mb-2">Need More Help?</h3>
        <p className="text-blue-100 text-sm">
          If you have questions not covered in this manual, please contact your church administrator or IT support team.
        </p>
      </div>
    </div>
  );
};

export default UserManual;
