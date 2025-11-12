import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';

const CellGroups = () => {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate loading
    const timer = setTimeout(() => {
      setLoading(false);
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Simple Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-blue-600 mb-4">Hello World!</h1>
          <p className="text-gray-600 text-lg">
            This is a test page to see if updates are working.
          </p>
          <p className="text-gray-500 mt-2">
            User: {profile?.name} {profile?.surname} | ID: {profile?.id}
          </p>
        </div>

        {/* Simple Content */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-2xl font-semibold text-gray-800 mb-4">
            Page is working! 🎉
          </h2>
          <div className="space-y-3">
            <p className="text-gray-600">
              If you can see this message, the page is updating correctly.
            </p>
            <p className="text-gray-600">
              Current time: {new Date().toLocaleTimeString()}
            </p>
            <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">
              <strong>Success!</strong> The component is rendering properly.
            </div>
          </div>
        </div>

        {/* Test Button */}
        <div className="text-center">
          <button
            onClick={() => alert('Button clicked! Page is interactive.')}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg transition-colors"
          >
            Test Interactive Button
          </button>
        </div>
      </div>
    </div>
  );
};

export default CellGroups;
