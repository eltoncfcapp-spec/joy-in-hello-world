import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Eye, EyeOff } from 'lucide-react';

export default function Login() {
  const [loginMode, setLoginMode] = useState<'email' | 'username'>('email');
  const [identifier, setIdentifier] = useState('');
  const [secret, setSecret] = useState('');
  const [showSecret, setShowSecret] = useState(false);
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    const success = await login(identifier.trim(), secret, loginMode);
    
    if (success) {
      navigate('/dashboard');
    } else {
      setError(loginMode === 'email' 
        ? 'Invalid email or password' 
        : 'Invalid username or PIN');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50 p-6">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden">
        <div className="p-8 bg-gradient-to-r from-blue-600 to-purple-600 text-white">
          <h1 className="text-3xl font-bold text-center">ChurchConnect</h1>
          <p className="mt-2 text-center text-blue-100">Community Management Portal</p>
        </div>
        
        <div className="p-8">
          <div className="flex justify-center gap-2 mb-6">
            <button
              type="button"
              onClick={() => setLoginMode('email')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                loginMode === 'email'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Email Login
            </button>
            <button
              type="button"
              onClick={() => setLoginMode('username')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                loginMode === 'username'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Username Login
            </button>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {loginMode === 'email' ? 'Email' : 'Username'}
              </label>
              <input
                type={loginMode === 'email' ? 'email' : 'text'}
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                placeholder={loginMode === 'email' ? 'you@example.com' : 'johndoe123'}
                required
              />
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {loginMode === 'email' ? 'Password' : 'PIN'}
              </label>
              <div className="relative">
                <input
                  type={showSecret ? 'text' : loginMode === 'username' ? 'password' : 'password'}
                  value={secret}
                  onChange={(e) => setSecret(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                  placeholder={loginMode === 'email' ? '••••••••' : '1234'}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowSecret(!showSecret)}
                  className="absolute right-2 top-2 text-gray-400 hover:text-gray-600"
                >
                  {showSecret ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg text-sm">
                {error}
              </div>
            )}

            <div className="mb-6">
              <button
                type="submit"
                className="w-full py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg font-medium hover:opacity-90 transition-opacity shadow-md"
              >
                Sign In
              </button>
            </div>

            <div className="text-center text-sm text-gray-600">
              <p>Forgot your password? Contact your administrator</p>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
