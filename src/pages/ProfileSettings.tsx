import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ChangePasswordDialog } from '@/components/profile/ChangePasswordDialog';
import { useUserRole } from '@/hooks/useUserRole';
import { useAuth } from '@/hooks/useAuth';
import { useLeaveApprovers } from '@/hooks/useLeaveApprovers';
import { POSITION_LABELS, POSITION_COLORS } from '@/lib/systemPositions';
import { 
  User, Mail, Building2, Shield, KeyRound, LogOut, 
  Phone, Briefcase, Calendar
} from 'lucide-react';
import { format } from 'date-fns';

export default function ProfileSettings() {
  const { profile, highestRole } = useUserRole();
  const { user, signOut } = useAuth();
  const { approvers } = useLeaveApprovers();
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);

  const initials = profile?.full_name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'U';

  // Find the current user's system position
  const userPosition = approvers.find(a => a.user_id === user?.id);
  const positionLabel = userPosition ? POSITION_LABELS[userPosition.approver_role] : null;
  const positionColor = userPosition ? POSITION_COLORS[userPosition.approver_role] : null;

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <User className="h-6 w-6 text-primary" />
            Profile & Settings
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Manage your account and preferences
          </p>
        </div>

        {/* Profile Card */}
        <Card className="border rounded-2xl shadow-none">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16 border-2 border-primary/20">
                <AvatarImage src={profile?.avatar_url || undefined} />
                <AvatarFallback className="bg-primary/10 text-primary text-xl font-bold">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <h2 className="text-xl font-semibold">{profile?.full_name || 'User'}</h2>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <Badge variant="outline" className="text-xs capitalize">{highestRole}</Badge>
                  {positionLabel && positionColor && (
                    <Badge variant="outline" className={`text-xs ${positionColor}`}>
                      {positionLabel}
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            <Separator className="my-5" />

            <div className="grid gap-4 sm:grid-cols-2">
              {profile?.email && (
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-lg bg-blue-500/10 flex items-center justify-center shrink-0">
                    <Mail className="h-4 w-4 text-blue-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground">Email</p>
                    <p className="text-sm font-medium truncate">{profile.email}</p>
                  </div>
                </div>
              )}
              {profile?.phone && (
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0">
                    <Phone className="h-4 w-4 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Phone</p>
                    <p className="text-sm font-medium">{profile.phone || '—'}</p>
                  </div>
                </div>
              )}
              {positionLabel && (
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-lg bg-indigo-500/10 flex items-center justify-center shrink-0">
                    <Briefcase className="h-4 w-4 text-indigo-600" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">System Position</p>
                    <p className="text-sm font-medium">{positionLabel}</p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <Card className="border rounded-2xl shadow-none">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Account Actions</CardTitle>
            <CardDescription className="text-xs">Security and account management</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button 
              variant="outline" 
              className="w-full justify-start gap-3 h-12"
              onClick={() => setChangePasswordOpen(true)}
            >
              <KeyRound className="h-4 w-4 text-muted-foreground" />
              Change Password
            </Button>
            <Button 
              variant="outline" 
              className="w-full justify-start gap-3 h-12 text-destructive hover:text-destructive"
              onClick={signOut}
            >
              <LogOut className="h-4 w-4" />
              Sign Out
            </Button>
          </CardContent>
        </Card>
      </div>

      <ChangePasswordDialog open={changePasswordOpen} onOpenChange={setChangePasswordOpen} />
    </DashboardLayout>
  );
}
