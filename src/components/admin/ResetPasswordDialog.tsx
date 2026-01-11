import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { KeyRound, AlertTriangle, Loader2, ShieldAlert } from 'lucide-react';

interface ResetPasswordDialogProps {
  user: {
    id: string;
    email: string;
    full_name: string | null;
  } | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function ResetPasswordDialog({ 
  user, 
  open, 
  onOpenChange, 
  onSuccess 
}: ResetPasswordDialogProps) {
  const [isResetting, setIsResetting] = useState(false);
  const { toast } = useToast();

  const handleReset = async () => {
    if (!user) return;

    setIsResetting(true);

    try {
      const { data, error } = await supabase.functions.invoke('admin-reset-password', {
        body: {
          action: 'initiate',
          userId: user.id,
          userEmail: user.email,
        },
      });

      if (error) throw error;

      if (data?.error) {
        throw new Error(data.error);
      }

      toast({
        title: 'Password Reset Initiated',
        description: `${user.full_name || user.email} will be prompted to set a new password on their next login.`,
      });

      onSuccess?.();
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: 'Failed to reset password',
        description: error.message || 'An unexpected error occurred',
        variant: 'destructive',
      });
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-orange-500/10">
              <ShieldAlert className="h-5 w-5 text-orange-600" />
            </div>
            <AlertDialogTitle>Reset User Password</AlertDialogTitle>
          </div>
          <AlertDialogDescription asChild>
            <div className="space-y-3">
              <p>
                You are about to reset the password for:
              </p>
              <div className="bg-muted p-3 rounded-lg">
                <p className="font-semibold text-foreground">{user?.full_name || 'Unknown User'}</p>
                <p className="text-sm text-muted-foreground">{user?.email}</p>
              </div>
              <div className="flex items-start gap-2 p-3 bg-orange-500/10 rounded-lg border border-orange-500/20">
                <AlertTriangle className="h-4 w-4 text-orange-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm">
                  <p className="font-medium text-orange-700 dark:text-orange-400">What happens next:</p>
                  <ul className="mt-1 text-orange-600/80 dark:text-orange-300/80 space-y-1">
                    <li>• User's current password will be invalidated</li>
                    <li>• User will be prompted to set a new password on login</li>
                    <li>• Reset link expires in 24 hours</li>
                  </ul>
                </div>
              </div>
              <Badge variant="outline" className="bg-primary/5">
                <KeyRound className="h-3 w-3 mr-1" />
                Secure Admin Reset
              </Badge>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isResetting}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleReset}
            disabled={isResetting}
            className="bg-orange-600 hover:bg-orange-700 text-white"
          >
            {isResetting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Resetting...
              </>
            ) : (
              <>
                <KeyRound className="h-4 w-4 mr-2" />
                Reset Password
              </>
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
