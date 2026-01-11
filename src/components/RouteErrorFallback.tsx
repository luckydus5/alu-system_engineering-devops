import { useRouteError, isRouteErrorResponse, useNavigate } from 'react-router-dom';
import { AlertTriangle, RefreshCcw, Home, FileQuestion, ShieldX, ServerCrash } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function RouteErrorFallback() {
  const error = useRouteError();
  const navigate = useNavigate();

  let title = 'Something went wrong';
  let description = 'An unexpected error occurred. Please try again.';
  let icon = <AlertTriangle className="w-8 h-8 text-white" />;
  let statusCode: number | null = null;

  if (isRouteErrorResponse(error)) {
    statusCode = error.status;
    
    switch (error.status) {
      case 404:
        title = 'Page not found';
        description = "The page you are looking for does not exist or has been moved.";
        icon = <FileQuestion className="w-8 h-8 text-white" />;
        break;
      case 401:
        title = 'Unauthorized';
        description = 'You need to be logged in to access this page.';
        icon = <ShieldX className="w-8 h-8 text-white" />;
        break;
      case 403:
        title = 'Access denied';
        description = "You do not have permission to view this page.";
        icon = <ShieldX className="w-8 h-8 text-white" />;
        break;
      case 500:
        title = 'Server error';
        description = 'Something went wrong on our end. Please try again later.';
        icon = <ServerCrash className="w-8 h-8 text-white" />;
        break;
      default:
        title = `Error ${error.status}`;
        description = error.statusText || 'An unexpected error occurred.';
    }
  } else if (error instanceof Error) {
    description = error.message;
  }

  const handleGoHome = () => {
    navigate('/');
  };

  const handleGoBack = () => {
    navigate(-1);
  };

  const handleReload = () => {
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center">
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-red-500 to-orange-500 px-6 py-8">
            <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
              {icon}
            </div>
            {statusCode && (
              <p className="text-white/60 text-sm font-mono mb-2">{statusCode}</p>
            )}
            <h1 className="text-xl font-bold text-white">{title}</h1>
            <p className="text-white/80 text-sm mt-2">{description}</p>
          </div>

          {/* Actions */}
          <div className="p-6 space-y-3">
            <Button
              onClick={handleGoHome}
              className="w-full"
              size="lg"
            >
              <Home className="w-4 h-4 mr-2" />
              Go to Dashboard
            </Button>
            
            <div className="flex gap-3">
              <Button
                onClick={handleGoBack}
                variant="outline"
                className="flex-1"
              >
                Go Back
              </Button>
              <Button
                onClick={handleReload}
                variant="outline"
                className="flex-1"
              >
                <RefreshCcw className="w-4 h-4 mr-2" />
                Reload
              </Button>
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-700">
            <p className="text-xs text-muted-foreground">
              If this keeps happening, please contact support.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
