import { ReactNode } from 'react';
import { TopNavbar } from './TopNavbar';

interface DashboardLayoutProps {
  children: ReactNode;
  title?: string;
}

export function DashboardLayout({ children, title }: DashboardLayoutProps) {
  return (
    <div className="min-h-screen w-full bg-background">
      <TopNavbar />
      
      {/* Main Content */}
      <main className="flex-1 p-4 md:p-6 max-w-7xl mx-auto">
        {title && (
          <h1 className="text-2xl font-bold text-foreground mb-6">{title}</h1>
        )}
        {children}
      </main>
    </div>
  );
}
