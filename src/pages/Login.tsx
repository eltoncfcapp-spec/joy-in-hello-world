import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Eye, EyeOff, Mail, User, Home } from 'lucide-react';

export default function Login() {
  const [identifier, setIdentifier] = useState('');
  const [credential, setCredential] = useState('');
  const [showCredential, setShowCredential] = useState(false);
  const [loginMethod, setLoginMethod] = useState<'email' | 'username'>('email');
  const [error, setError] = useState('');
  const { login, user, loading } = useAuth();
  const navigate = useNavigate();

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      navigate('/');
    }
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const success = await login(identifier, credential);

    if (success) {
      navigate('/');
    } else {
      setError(`Invalid ${loginMethod === 'email' ? 'email or password' : 'username or PIN'}`);
    }
  };

  const handleDemoLogin = (demoIdentifier: string, demoCredential: string, method: 'email' | 'username') => {
    setIdentifier(demoIdentifier);
    setCredential(demoCredential);
    setLoginMethod(method);
  };

  const toggleLoginMethod = () => {
    setLoginMethod(loginMethod === 'email' ? 'username' : 'email');
    setIdentifier('');
    setCredential('');
    setError('');
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50 p-4">
      {/* Logo on top left - matches Dashboard */}
      <div className="absolute top-6 left-6 flex items-center gap-3">
        <div className="w-12 h-12 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
          <span className="text-white font-bold text-xl">CM</span>
        </div>
        <div className="flex flex-col">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Church Management
          </h1>
          <p className="text-xs text-gray-500">Faithful. Connected. United.</p>
        </div>
      </div>

      {/* Home button */}
      <button
        onClick={() => navigate('/')}
        className="absolute top-6 right-6 flex items-center gap-2 px-4 py-2 bg-white hover:bg-gray-50 text-gray-700 rounded-xl transition-all duration-200 shadow-sm hover:shadow-md border border-gray-200"
      >
        <Home className="h-4 w-4" />
        Return Home
      </button>

      <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-2xl shadow-xl mt-16">
        <div className="text-center">
          <div className="w-16 h-16 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
            <span className="text-white font-bold text-xl">CM</span>
          </div>
          <h2 className="text-3xl font-bold text-gray-900">Welcome Back</h2>
          <p className="mt-2 text-gray-600">Sign in to access your church dashboard</p>
        </div>

        {/* Login Method Toggle */}
        <div className="flex bg-gray-100 rounded-lg p-1">
          <button
            type="button"
            onClick={() => setLoginMethod('email')}
            className={`flex items-center justify-center gap-2 flex-1 py-2 px-4 rounded-md transition-all ${
              loginMethod === 'email'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Mail className="h-4 w-4" />
            Email Login
          </button>
          <button
            type="button"
            onClick={() => setLoginMethod('username')}
            className={`flex items-center justify-center gap-2 flex-1 py-2 px-4 rounded-md transition-all ${
              loginMethod === 'username'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <User className="h-4 w-4" />
            Username/PIN
          </button>
        </div>

        <form className="space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label htmlFor="identifier" className="block text-sm font-medium text-gray-700">
                {loginMethod === 'email' ? 'Email Address' : 'Username'}
              </label>
              <input
                id="identifier"
                type={loginMethod === 'email' ? 'email' : 'text'}
                required
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                className="mt-1 block w-full px-3 py-3 border border-gray-300 rounded-xl bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                placeholder={loginMethod === 'email' ? 'admin@church.com' : 'Enter your username'}
                disabled={loading}
              />
            </div>

            <div>
              <label htmlFor="credential" className="block text-sm font-medium text-gray-700">
                {loginMethod === 'email' ? 'Password' : 'PIN'}
              </label>
              <div className="relative">
                <input
                  id="credential"
                  type={showCredential ? 'text' : loginMethod === 'email' ? 'password' : 'text'}
                  required
                  value={credential}
                  onChange={(e) => setCredential(e.target.value)}
                  className="mt-1 block w-full px-3 py-3 pr-10 border border-gray-300 rounded-xl bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  placeholder={loginMethod === 'email' ? '••••••••' : 'Enter your 4-digit PIN'}
                  maxLength={loginMethod === 'username' ? 4 : undefined}
                  inputMode={loginMethod === 'username' ? 'numeric' : 'text'}
                  disabled={loading}
                />
                {loginMethod === 'email' && (
                  <button
                    type="button"
                    onClick={() => setShowCredential(!showCredential)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
                    disabled={loading}
                  >
                    {showCredential ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                )}
              </div>
              {loginMethod === 'username' && (
                <p className="mt-1 text-xs text-gray-500">Enter your 4-digit PIN</p>
              )}
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3">
              <p className="text-red-700 text-sm text-center">{error}</p>
            </div>
          )}

          {/* Demo Credentials */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <p className="font-medium text-blue-900 mb-2 text-sm">Demo Credentials:</p>
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => handleDemoLogin('admin@church.com', 'admin123', 'email')}
                className="w-full text-left text-blue-700 hover:text-blue-900 transition-colors text-sm p-2 bg-white rounded-lg hover:bg-blue-100 disabled:opacity-50"
                disabled={loading}
              >
                <span className="font-medium">Email Login:</span><br />
                admin@church.com / admin123
              </button>
              <button
                type="button"
                onClick={() => handleDemoLogin('user1762420855216', '6719', 'username')}
                className="w-full text-left text-blue-700 hover:text-blue-900 transition-colors text-sm p-2 bg-white rounded-lg hover:bg-blue-100 disabled:opacity-50"
                disabled={loading}
              >
                <span className="font-medium">Username/PIN Login:</span><br />
                user1762420855216 / 6719
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <div className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Signing in...
              </div>
            ) : (
              'Sign In'
            )}
          </button>

          <div className="text-center">
            <button
              type="button"
              onClick={toggleLoginMethod}
              className="text-blue-600 hover:text-blue-700 text-sm font-medium disabled:opacity-50"
              disabled={loading}
            >
              Switch to {loginMethod === 'email' ? 'Username/PIN Login' : 'Email Login'}
            </button>
          </div>
        </form>

        {/* Information about login methods */}
        <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
          <h4 className="font-medium text-gray-900 text-sm mb-2">About Login Methods:</h4>
          <ul className="text-xs text-gray-600 space-y-1">
            <li>• <strong>Email Login:</strong> For administrators with email/password</li>
            <li>• <strong>Username/PIN:</strong> For members with generated credentials</li>
            <li>• Members get username/PIN from church administrators</li>
            <li>• Contact your church administrator if you need credentials</li>
          </ul>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-8 text-center text-gray-500 text-sm">
        <p>Church Management System v1.0 • Secure & Confidential</p>
        <p className="mt-1">For church use only • © {new Date().getFullYear()}</p>
      </div>
    </div>
  );
}
