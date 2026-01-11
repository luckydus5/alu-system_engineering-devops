import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Home } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BackButtonProps {
  className?: string;
  variant?: 'default' | 'outline' | 'ghost' | 'secondary';
  showHome?: boolean;
  label?: string;
}

export function BackButton({ 
  className, 
  variant = 'outline',
  showHome = true,
  label = 'Back'
}: BackButtonProps) {
  const navigate = useNavigate();
  const location = useLocation();

  const canGoBack = window.history.length > 1 && location.pathname !== '/';

  const handleBack = () => {
    if (canGoBack) {
      navigate(-1);
    } else {
      navigate('/');
    }
  };

  const handleHome = () => {
    navigate('/');
  };

  if (location.pathname === '/') {
    return null;
  }

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <Button
        variant={variant}
        size="sm"
        onClick={handleBack}
        className="gap-2"
      >
        <ArrowLeft className="h-4 w-4" />
        <span className="hidden sm:inline">{label}</span>
      </Button>
      {showHome && location.pathname !== '/' && (
        <Button
          variant="ghost"
          size="sm"
          onClick={handleHome}
          className="gap-2"
        >
          <Home className="h-4 w-4" />
          <span className="hidden sm:inline">Home</span>
        </Button>
      )}
    </div>
  );
}
