// components/Unauthorized.tsx
import { useNavigate } from 'react-router-dom';
import { Shield, Home } from 'lucide-react';

const Unauthorized = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="max-w-md w-full space-y-8 p-8 text-center">
        <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Shield className="h-10 w-10 text-red-600" />
        </div>
        
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Access Denied</h1>
          <p className="text-muted-foreground mb-6">
            You don't have permission to access this page. Please contact an administrator if you believe this is an error.
          </p>
        </div>

        <div className="space-y-3">
          <button
            onClick={() => navigate('/dashboard')}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium"
          >
            <Home className="h-4 w-4" />
            Go to Dashboard
          </button>
          
          <button
            onClick={() => navigate('/login')}
            className="w-full px-4 py-3 border border-border text-foreground rounded-lg hover:bg-muted transition-colors font-medium"
          >
            Switch Account
          </button>
        </div>
      </div>
    </div>
  );
};

export default Unauthorized;
