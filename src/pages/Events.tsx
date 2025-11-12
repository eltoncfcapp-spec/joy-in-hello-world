// pages/HelloWorld.tsx
import React from 'react';

const HelloWorld = () => {
  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-blue-600 mb-4">Hello World!</h1>
        <p className="text-xl text-gray-600">
          If you can see this, your React setup is working! 🎉
        </p>
        <div className="mt-8 p-4 bg-green-100 border border-green-400 rounded-lg">
          <p className="text-green-700">
            ✅ Basic React component is rendering successfully
          </p>
        </div>
      </div>
    </div>
  );
};

export default Groups;
