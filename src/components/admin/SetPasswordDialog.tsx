import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { KeyRound, Eye, EyeOff, Loader2, ShieldAlert, Copy, Check, AlertTriangle } from 'lucide-react';

interface SetPasswordDialogProps {
  user: {
    id: string;
    email: string;
    full_name: string | null;
  } | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

// Generate a random temporary password
function generateTempPassword(length: number = 12): string {
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const numbers = '0123456789';
  const special = '!@#$%^&*';
  
  // Ensure at least one of each type
  let password = '';
  password += uppercase[Math.floor(Math.random() * uppercase.length)];
  password += lowercase[Math.floor(Math.random() * lowercase.length)];
  password += numbers[Math.floor(Math.random() * numbers.length)];
  password += special[Math.floor(Math.random() * special.length)];
  
  // Fill the rest randomly
  const allChars = uppercase + lowercase + numbers + special;
  for (let i = password.length; i < length; i++) {
    password += allChars[Math.floor(Math.random() * allChars.length)];
  }
  
  // Shuffle the password
  return password.split('').sort(() => Math.random() - 0.5).join('');
}

export function SetPasswordDialog({ 
  user, 
  open, 
  onOpenChange, 
  onSuccess 
}: SetPasswordDialogProps) {
  const [isResetting, setIsResetting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [copied, setCopied] = useState(false);
  const [resetComplete, setResetComplete] = useState(false);
  const [finalPassword, setFinalPassword] = useState('');
  const { toast } = useToast();

  const handleGeneratePassword = () => {
    const tempPass = generateTempPassword();
    setPassword(tempPass);
    setConfirmPassword(tempPass);
    setShowPassword(true);
  };

  const handleCopyPassword = async () => {
    const textToCopy = resetComplete ? finalPassword : password;
    await navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({
      title: 'Password Copied',
      description: 'The password has been copied to your clipboard.',
    });
  };

  const handleReset = async () => {
    if (!user) return;

    if (password.length < 8) {
      toast({
        title: 'Password too short',
        description: 'Password must be at least 8 characters.',
        variant: 'destructive',
      });
      return;
    }

    if (password !== confirmPassword) {
      toast({
        title: 'Passwords do not match',
        description: 'Please make sure both passwords match.',
        variant: 'destructive',
      });
      return;
    }

    // Check password strength
    const hasUppercase = /[A-Z]/.test(password);
    const hasLowercase = /[a-z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    const hasSpecial = /[^A-Za-z0-9]/.test(password);

    if (!hasUppercase || !hasLowercase || !hasNumber || !hasSpecial) {
      toast({
        title: 'Weak password',
        description: 'Password must contain uppercase, lowercase, number, and special character.',
        variant: 'destructive',
      });
      return;
    }

    setIsResetting(true);

    try {
      const { data, error } = await supabase.functions.invoke('admin-reset-password', {
        body: {
          action: 'set-password',
          userId: user.id,
          userEmail: user.email,
          newPassword: password,
        },
      });

      if (error) throw error;

      if (data?.error) {
        throw new Error(data.error);
      }

      setFinalPassword(password);
      setResetComplete(true);
      
      toast({
        title: 'Password Set Successfully',
        description: `You can now give this password to ${user.full_name || user.email}.`,
      });

    } catch (error: any) {
      toast({
        title: 'Failed to set password',
        description: error.message || 'An unexpected error occurred',
        variant: 'destructive',
      });
    } finally {
      setIsResetting(false);
    }
  };

  const handleClose = () => {
    setPassword('');
    setConfirmPassword('');
    setShowPassword(false);
    setCopied(false);
    setResetComplete(false);
    setFinalPassword('');
    onOpenChange(false);
    if (resetComplete) {
      onSuccess?.();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-orange-500/10">
              <ShieldAlert className="h-5 w-5 text-orange-600" />
            </div>
            <DialogTitle>Set User Password</DialogTitle>
          </div>
          <DialogDescription>
            Set a new password for this user. You will need to give them this password personally.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* User info */}
          <div className="bg-muted p-3 rounded-lg">
            <p className="font-semibold text-foreground">{user?.full_name || 'Unknown User'}</p>
            <p className="text-sm text-muted-foreground">{user?.email}</p>
          </div>

          {resetComplete ? (
            // Success state - show the password to copy
            <div className="space-y-4">
              <div className="flex items-start gap-2 p-3 bg-green-500/10 rounded-lg border border-green-500/20">
                <Check className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm">
                  <p className="font-medium text-green-700 dark:text-green-400">Password Reset Successful!</p>
                  <p className="mt-1 text-green-600/80 dark:text-green-300/80">
                    Give the following password to the user. They can change it after logging in.
                  </p>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label>New Password</Label>
                <div className="flex gap-2">
                  <div className="flex-1 relative">
                    <Input
                      type={showPassword ? 'text' : 'password'}
                      value={finalPassword}
                      readOnly
                      className="pr-10 font-mono bg-muted"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleCopyPassword}
                    className="flex-shrink-0"
                  >
                    {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              <div className="flex items-start gap-2 p-3 bg-amber-500/10 rounded-lg border border-amber-500/20">
                <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-amber-600 dark:text-amber-400">
                  Make sure to copy this password now. Once you close this dialog, you won't be able to see it again.
                </p>
              </div>
            </div>
          ) : (
            // Password input form
            <>
              <div className="space-y-2">
                <Label htmlFor="password">New Password</Label>
                <div className="flex gap-2">
                  <div className="flex-1 relative">
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter new password"
                      className="pr-10"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleCopyPassword}
                    className="flex-shrink-0"
                    disabled={!password}
                  >
                    {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <Input
                  id="confirmPassword"
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                />
              </div>

              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={handleGeneratePassword}
              >
                <KeyRound className="h-4 w-4 mr-2" />
                Generate Strong Password
              </Button>

              <div className="text-xs text-muted-foreground space-y-1">
                <p className="font-medium">Password requirements:</p>
                <ul className="list-disc list-inside space-y-0.5">
                  <li className={password.length >= 8 ? 'text-green-600' : ''}>At least 8 characters</li>
                  <li className={/[A-Z]/.test(password) ? 'text-green-600' : ''}>One uppercase letter</li>
                  <li className={/[a-z]/.test(password) ? 'text-green-600' : ''}>One lowercase letter</li>
                  <li className={/[0-9]/.test(password) ? 'text-green-600' : ''}>One number</li>
                  <li className={/[^A-Za-z0-9]/.test(password) ? 'text-green-600' : ''}>One special character</li>
                </ul>
              </div>

              <Badge variant="outline" className="bg-primary/5">
                <KeyRound className="h-3 w-3 mr-1" />
                Admin Password Reset
              </Badge>
            </>
          )}
        </div>

        <DialogFooter>
          {resetComplete ? (
            <Button onClick={handleClose}>
              Done
            </Button>
          ) : (
            <>
              <Button variant="outline" onClick={handleClose} disabled={isResetting}>
                Cancel
              </Button>
              <Button
                onClick={handleReset}
                disabled={isResetting || !password || !confirmPassword}
                className="bg-orange-600 hover:bg-orange-700 text-white"
              >
                {isResetting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Setting Password...
                  </>
                ) : (
                  <>
                    <KeyRound className="h-4 w-4 mr-2" />
                    Set Password
                  </>
                )}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
