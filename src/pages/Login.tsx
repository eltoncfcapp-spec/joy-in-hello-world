import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Eye, EyeOff, Key } from 'lucide-react';

export default function Login() {
  const [loginMode, setLoginMode] = useState<'email' | 'username'>('email');
  const [identifier, setIdentifier] = useState('');
  const [secret, setSecret] = useState('');
  const [showSecret, setShowSecret] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Try login with identifier and secret
    const success = await login(identifier, secret, loginMode);

    if (success) {
      navigate('/');
    } else {
      setError(
        loginMode === 'email'
          ? 'Invalid email or password'
          : 'Invalid username or PIN'
      );
    }
  };

  const handleDemoLogin = (demoIdentifier: string, demoSecret: string, mode: 'email' | 'username') => {
    setIdentifier(demoIdentifier);
    setSecret(demoSecret);
    setLoginMode(mode);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="max-w-md w-full space-y-8 p-8 bg-card rounded-lg shadow-lg">
        <div>
          <h2 className="text-3xl font-bold text-center text-foreground">Church Management</h2>
          <p className="mt-2 text-center text-muted-foreground">Sign in to your account</p>
        </div>

        {/* Mode Toggle */}
        <div className="flex justify-center gap-2 mb-4">
          <button
            type="button"
            onClick={() => setLoginMode('email')}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              loginMode === 'email'
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:text-foreground'
            }`}
          >
            Email Login
          </button>
          <button
            type="button"
            onClick={() => setLoginMode('username')}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              loginMode === 'username'
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:text-foreground'
            }`}
          >
            Username Login
          </button>
        </div>

        <form className="space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label htmlFor="identifier" className="block text-sm font-medium text-foreground">
                {loginMode === 'email' ? 'Email' : 'Username'}
              </label>
              <input
                id="identifier"
                type={loginMode === 'email' ? 'email' : 'text'}
                required
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-border rounded-md shadow-sm bg-background text-foreground focus:outline-none focus:ring-primary focus:border-primary"
                placeholder={loginMode === 'email' ? 'admin@church.com' : 'john_doe'}
              />
            </div>

            <div>
              <label htmlFor="secret" className="block text-sm font-medium text-foreground">
                {loginMode === 'email' ? 'Password' : 'PIN'}
              </label>
              <div className="relative">
                <input
                  id="secret"
                  type={showSecret ? 'text' : loginMode === 'username' ? 'number' : 'password'}
                  required
                  value={secret}
                  onChange={(e) => setSecret(e.target.value)}
                  className="mt-1 block w-full px-3 py-2 pr-10 border border-border rounded-md shadow-sm bg-background text-foreground focus:outline-none focus:ring-primary focus:border-primary"
                  placeholder={loginMode === 'email' ? '••••••••' : '1234'}
                />
                <button
                  type="button"
                  onClick={() => setShowSecret(!showSecret)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-muted-foreground hover:text-foreground"
                >
                  {showSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Remember Me */}
            <div className="flex items-center">
              <input
                id="remember-me"
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="h-4 w-4 text-primary border-border rounded focus:ring-primary"
              />
              <label htmlFor="remember-me" className="ml-2 block text-sm text-foreground">
                Keep me logged in
              </label>
            </div>
          </div>

          {error && <div className="text-destructive text-sm text-center">{error}</div>}

          <div className="bg-muted/50 p-4 rounded-md text-sm text-muted-foreground">
            <p className="font-medium mb-2">Demo Login Options:</p>
            <div className="space-y-1">
              <button
                type="button"
                onClick={() => handleDemoLogin('admin@church.com', 'admin123', 'email')}
                className="w-full text-left hover:text-foreground transition-colors"
              >
                • Email: admin@church.com / Password: admin123
              </button>
              <button
                type="button"
                onClick={() => handleDemoLogin('sarah_smith', '5432', 'username')}
                className="w-full text-left hover:text-foreground transition-colors"
              >
                • Username: sarah_smith / PIN: 5432
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-primary-foreground bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
          >
            Sign in
          </button>
        </form>
      </div>
    </div>
  );
}
