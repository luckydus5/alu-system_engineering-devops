import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import Dashboard from './Dashboard';
import { Loader2 } from 'lucide-react';

const Index = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    console.log('[Index] Auth state:', { user: user?.email, loading });
    if (!loading && !user) {
      console.log('[Index] No user, redirecting to /auth');
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  if (loading) {
    console.log('[Index] Showing loading state');
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    console.log('[Index] No user, returning null (redirect pending)');
    return null;
  }

  console.log('[Index] User authenticated, showing Dashboard');
  return <Dashboard />;
};

export default Index;
