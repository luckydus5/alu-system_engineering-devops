import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { RecentReports } from '@/components/dashboard/RecentReports';
import { DepartmentAccessCards } from '@/components/dashboard/DepartmentAccessCards';
import { useUserRole } from '@/hooks/useUserRole';
import { useReportStats } from '@/hooks/useReportStats';
import { FileText, CheckCircle, Clock, Sparkles } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

export default function Dashboard() {
  const { profile, highestRole } = useUserRole();
  const { stats, loading } = useReportStats();

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <DashboardLayout title="Home">
      <div className="space-y-8 animate-fade-in">
        {/* Welcome Section - Enhanced */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-primary/20 p-6 md:p-8">
          {/* Background decorations */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-secondary/20 to-transparent rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-gradient-to-tr from-primary/10 to-transparent rounded-full blur-2xl translate-y-1/2 -translate-x-1/2" />
          
          <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Sparkles className="h-4 w-4 text-secondary" />
                <span>{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</span>
              </div>
              <h1 className="text-3xl md:text-4xl font-bold text-foreground tracking-tight">
                {getGreeting()}, <span className="text-gradient">{profile?.full_name?.split(' ')[0] || 'User'}</span>!
              </h1>
              <p className="text-muted-foreground text-lg max-w-xl">
                Here's your organization overview. Access your departments and track reports seamlessly.
              </p>
            </div>
            <div className="flex gap-3">
              <Link to="/reports">
                <Button variant="outline" className="border-primary/30 hover:bg-primary/10">
                  <FileText className="h-4 w-4 mr-2" />
                  View Reports
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* Department Access Cards - Main Feature */}
        <DepartmentAccessCards />

        {/* Recent Activity Section */}
        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="shadow-corporate">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-semibold">Recent Reports</CardTitle>
                <Link to="/reports" className="text-sm text-primary hover:underline font-medium">
                  View all
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              <RecentReports compact />
            </CardContent>
          </Card>

          {/* Quick Stats Card */}
          <Card className="shadow-corporate">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-semibold">Quick Stats</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <FileText className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">Your Role</p>
                      <p className="text-xs text-muted-foreground capitalize">{highestRole}</p>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">Resolution Rate</p>
                      <p className="text-xs text-muted-foreground">
                        {stats.total > 0 ? Math.round((stats.resolved / stats.total) * 100) : 0}% of reports
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
                      <Clock className="h-5 w-5 text-amber-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">Pending Actions</p>
                      <p className="text-xs text-muted-foreground">
                        {stats.submitted + stats.inReview} reports awaiting review
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
