import { ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { TopNavbar } from './TopNavbar';
import { BackButton } from './BackButton';

interface DashboardLayoutProps {
  children: ReactNode;
  title?: string;
  showBackButton?: boolean;
}

export function DashboardLayout({ children, title, showBackButton = true }: DashboardLayoutProps) {
  const location = useLocation();
  const isHomePage = location.pathname === '/';

  return (
    <div className="min-h-screen w-full bg-background">
      <TopNavbar />
      
      {/* Main Content */}
      <main className="flex-1 p-4 md:p-6 max-w-7xl mx-auto">
        {/* Back Navigation */}
        {showBackButton && !isHomePage && (
          <div className="mb-4">
            <BackButton />
          </div>
        )}
        
        {title && (
          <h1 className="text-2xl font-bold text-foreground mb-6">{title}</h1>
        )}
        {children}
      </main>
    </div>
  );
}
