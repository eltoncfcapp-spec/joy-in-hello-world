// Replace your entire Groups.tsx file with this:
import React from 'react';

const Groups = () => {
  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-8">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-blue-600 mb-4">Hello World!</h1>
        <p className="text-xl text-gray-600 mb-8">
          Your Groups page is working! 🎉
        </p>
        <div className="bg-white p-6 rounded-lg shadow-md max-w-md mx-auto">
          <h2 className="text-2xl font-semibold mb-4">Next Steps:</h2>
          <ul className="text-left space-y-2 text-gray-700">
            <li>✅ Basic component rendering</li>
            <li>✅ Tailwind CSS working</li>
            <li>✅ TypeScript compilation</li>
            <li>🔲 Add your Groups functionality back</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default Groups;
