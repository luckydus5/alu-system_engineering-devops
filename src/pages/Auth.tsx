import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Mail, Eye, EyeOff, Loader2, Zap, Shield, BarChart3, Users, AlertCircle } from 'lucide-react';
import { z } from 'zod';
import hqPowerLogo from '@/assets/hq-power-logo.png';

const emailSchema = z.string().email('Please enter a valid email address');
const passwordSchema = z.string().min(6, 'Password must be at least 6 characters');

export default function Auth() {
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmailSent, setResetEmailSent] = useState(false);
  const [checkingPendingReset, setCheckingPendingReset] = useState(false);
  const [pendingResetInfo, setPendingResetInfo] = useState<{ hasReset: boolean; token: string | null }>({ hasReset: false, token: null });
  
  const { signIn, user, loading } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  // Redirect if already logged in
  useEffect(() => {
    if (!loading && user) {
      navigate('/', { replace: true });
    }
  }, [user, loading, navigate]);

  // Show loading state during initial auth check
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const validateField = (field: string, value: string, schema: z.ZodString) => {
    try {
      schema.parse(value);
      setErrors(prev => ({ ...prev, [field]: '' }));
      return true;
    } catch (err) {
      if (err instanceof z.ZodError) {
        setErrors(prev => ({ ...prev, [field]: err.errors[0].message }));
      }
      return false;
    }
  };

  // Check for pending admin password reset when email changes
  const checkPendingReset = async (emailToCheck: string) => {
    if (!emailToCheck || !emailSchema.safeParse(emailToCheck).success) {
      setPendingResetInfo({ hasReset: false, token: null });
      return false;
    }

    setCheckingPendingReset(true);
    try {
      const { data, error } = await supabase
        .rpc('check_pending_password_reset', { email_to_check: emailToCheck });

      if (!error && data && data.length > 0 && data[0].has_pending_reset) {
        setPendingResetInfo({ hasReset: true, token: data[0].reset_token });
        return true;
      } else {
        setPendingResetInfo({ hasReset: false, token: null });
        return false;
      }
    } catch (err) {
      setPendingResetInfo({ hasReset: false, token: null });
      return false;
    } finally {
      setCheckingPendingReset(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const isEmailValid = validateField('email', email, emailSchema);
    const isPasswordValid = validateField('password', password, passwordSchema);
    
    if (!isEmailValid || !isPasswordValid) return;

    setIsLoading(true);

    // First check if there's a pending admin reset for this email
    const hasPendingReset = await checkPendingReset(email);
    if (hasPendingReset && pendingResetInfo.token) {
      setIsLoading(false);
      navigate(`/admin-password-reset?token=${pendingResetInfo.token}&email=${encodeURIComponent(email)}`);
      return;
    }

    const { error } = await signIn(email, password);

    if (error) {
      setIsLoading(false);
      
      // Check if the error might be due to a pending reset (invalid credentials after reset)
      const checkAgain = await checkPendingReset(email);
      if (checkAgain && pendingResetInfo.token) {
        toast({
          title: "Password Reset Required",
          description: "Your password has been reset by an administrator. Please set a new password.",
        });
        navigate(`/admin-password-reset?token=${pendingResetInfo.token}&email=${encodeURIComponent(email)}`);
        return;
      }
      
      toast({
        title: "Login failed",
        description: error.message === 'Invalid login credentials' 
          ? 'Invalid email or password. Please try again.'
          : error.message,
        variant: "destructive",
      });
      return;
    }

    // Navigate immediately - don't wait for state updates
    toast({
      title: "Welcome back!",
      description: "You have successfully logged in.",
    });
    navigate('/', { replace: true });
    // Keep loading true to prevent flicker during navigation
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const isEmailValid = validateField('email', email, emailSchema);
    if (!isEmailValid) return;

    setIsLoading(true);
    
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    
    setIsLoading(false);

    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    setResetEmailSent(true);
    toast({
      title: "Email sent",
      description: "Check your inbox for the password reset link.",
    });
  };

  const features = [
    { icon: Zap, title: 'Real-time Monitoring', desc: 'Track fleet operations live' },
    { icon: Shield, title: 'Secure Access', desc: 'Enterprise-grade security' },
    { icon: BarChart3, title: 'Smart Analytics', desc: 'Data-driven insights' },
    { icon: Users, title: 'Team Collaboration', desc: 'Cross-department workflow' },
  ];

  // Shared left panel component
  const LeftPanel = () => (
    <div className="hidden lg:flex lg:w-1/2 xl:w-3/5 relative overflow-hidden">
      {/* Premium Blue Gradient Background */}
      <div className="absolute inset-0 gradient-hero" />
      
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-20 left-20 w-72 h-72 bg-primary/20 rounded-full blur-3xl animate-float" />
        <div className="absolute bottom-32 right-20 w-96 h-96 bg-accent/15 rounded-full blur-3xl animate-float" style={{ animationDelay: '2s' }} />
        <div className="absolute top-1/2 left-1/3 w-64 h-64 bg-secondary/10 rounded-full blur-3xl animate-float" style={{ animationDelay: '4s' }} />
        
        {/* Grid pattern overlay */}
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: `linear-gradient(hsl(220 20% 95%) 1px, transparent 1px), linear-gradient(90deg, hsl(220 20% 95%) 1px, transparent 1px)`,
          backgroundSize: '60px 60px'
        }} />
      </div>
      
      {/* Content */}
      <div className="relative z-10 flex flex-col justify-center px-12 xl:px-20 w-full">
        <div className="mb-12">
          <div className="flex items-center gap-4 mb-8">
            <div className="relative">
              <div className="absolute inset-0 bg-secondary/30 rounded-2xl blur-xl animate-pulse-glow" />
              <img 
                src={hqPowerLogo} 
                alt="HQ Power" 
                className="relative h-20 w-auto drop-shadow-2xl"
              />
            </div>
          </div>
          <h1 className="text-5xl xl:text-6xl font-bold text-white mb-4 leading-tight">
            HQ Power
            <span className="block text-gradient-gold">Management Systems</span>
          </h1>
          <p className="text-xl text-white/70 max-w-md">
            Empowering operational excellence through intelligent management systems.
          </p>
        </div>

        {/* Feature Cards */}
        <div className="grid grid-cols-2 gap-4 max-w-xl">
          {features.map((feature, index) => (
            <div 
              key={feature.title}
              className="group p-5 rounded-xl bg-white/5 backdrop-blur-sm border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all duration-300"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-secondary/20 text-secondary group-hover:bg-secondary/30 transition-colors">
                  <feature.icon className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-white text-sm">{feature.title}</h3>
                  <p className="text-xs text-white/50 mt-0.5">{feature.desc}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  // Email sent confirmation screen
  if (resetEmailSent) {
    return (
      <div className="min-h-screen flex">
        <LeftPanel />
        <div className="w-full lg:w-1/2 xl:w-2/5 flex items-center justify-center p-6 sm:p-12 bg-background">
          <div className="w-full max-w-md">
            <div className="lg:hidden flex flex-col items-center mb-10">
              <img src={hqPowerLogo} alt="HQ Power" className="h-16 w-auto mb-4" />
              <h1 className="text-2xl font-bold text-foreground">HQ Power</h1>
            </div>

            <div className="bg-card rounded-2xl shadow-premium border-0 p-8 text-center">
              <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-primary/10 flex items-center justify-center">
                <Mail className="h-8 w-8 text-primary" />
              </div>
              <h2 className="text-2xl font-bold text-foreground mb-2">Check Your Email</h2>
              <p className="text-muted-foreground mb-6">
                We've sent a password reset link to<br />
                <span className="font-semibold text-foreground">{email}</span>
              </p>
              <Button
                variant="outline"
                className="w-full h-12 rounded-xl"
                onClick={() => {
                  setShowForgotPassword(false);
                  setResetEmailSent(false);
                  setEmail('');
                }}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Sign In
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Forgot password form
  if (showForgotPassword) {
    return (
      <div className="min-h-screen flex">
        <LeftPanel />
        <div className="w-full lg:w-1/2 xl:w-2/5 flex items-center justify-center p-6 sm:p-12 bg-background">
          <div className="w-full max-w-md">
            <div className="lg:hidden flex flex-col items-center mb-10">
              <img src={hqPowerLogo} alt="HQ Power" className="h-16 w-auto mb-4" />
              <h1 className="text-2xl font-bold text-foreground">HQ Power</h1>
            </div>

            <div className="mb-8">
              <h2 className="text-3xl font-bold text-foreground mb-2">Reset Password</h2>
              <p className="text-muted-foreground">Enter your email to receive a reset link</p>
            </div>

            <div className="bg-card rounded-2xl shadow-premium border-0 p-6 sm:p-8">
              <form onSubmit={handleForgotPassword} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-medium">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={isLoading}
                    className="h-12 bg-muted/50 border-border focus:border-primary rounded-xl"
                  />
                  {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
                </div>

                <Button 
                  type="submit" 
                  className="w-full h-12 rounded-xl text-base font-semibold gradient-primary hover:opacity-90 shadow-glow" 
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Sending...
                    </>
                  ) : 'Send Reset Link'}
                </Button>

                <Button
                  type="button"
                  variant="ghost"
                  className="w-full h-12 rounded-xl"
                  onClick={() => setShowForgotPassword(false)}
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Sign In
                </Button>
              </form>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Main login form
  return (
    <div className="min-h-screen flex">
      <LeftPanel />
      
      {/* Right Panel - Login Form */}
      <div className="w-full lg:w-1/2 xl:w-2/5 flex items-center justify-center p-6 sm:p-12 bg-background">
        <div className="w-full max-w-md">
          {/* Mobile Logo */}
          <div className="lg:hidden flex flex-col items-center mb-10">
            <img src={hqPowerLogo} alt="HQ Power" className="h-16 w-auto mb-4" />
            <h1 className="text-2xl font-bold text-foreground">HQ Power</h1>
            <p className="text-sm text-muted-foreground">Management Systems</p>
          </div>

          {/* Welcome Text */}
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-foreground mb-2">Welcome Back</h2>
            <p className="text-muted-foreground">Sign in to access your dashboard</p>
          </div>

          {/* Login Card */}
          <div className="bg-card rounded-2xl shadow-premium border-0 p-6 sm:p-8">
            <form onSubmit={handleLogin} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@company.com"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setPendingResetInfo({ hasReset: false, token: null });
                  }}
                  onBlur={() => email && checkPendingReset(email)}
                  disabled={isLoading}
                  className="h-12 bg-muted/50 border-border focus:border-primary rounded-xl"
                />
                {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
                {checkingPendingReset && (
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Checking account status...
                  </p>
                )}
                {pendingResetInfo.hasReset && (
                  <div className="flex items-start gap-2 p-3 bg-orange-500/10 rounded-lg border border-orange-500/20">
                    <AlertCircle className="h-4 w-4 text-orange-600 mt-0.5 flex-shrink-0" />
                    <div className="text-sm text-orange-700 dark:text-orange-400">
                      <p className="font-medium">Password Reset Required</p>
                      <p className="text-xs mt-0.5 opacity-80">Your administrator has reset your password. Click "Sign In" to set a new password.</p>
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-sm font-medium">Password</Label>
                  <button
                    type="button"
                    className="text-xs font-medium text-primary hover:text-primary/80 transition-colors"
                    onClick={() => setShowForgotPassword(true)}
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={isLoading}
                    className="h-12 pr-12 bg-muted/50 border-border focus:border-primary rounded-xl"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
                {errors.password && <p className="text-sm text-destructive">{errors.password}</p>}
              </div>

              <Button 
                type="submit" 
                className="w-full h-12 rounded-xl text-base font-semibold gradient-primary hover:opacity-90 transition-opacity shadow-glow"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Signing in...
                  </>
                ) : 'Sign In'}
              </Button>
            </form>
          </div>

          {/* Footer */}
          <p className="text-center text-xs text-muted-foreground mt-8">
            Need access? Contact your system administrator
          </p>
          <p className="text-center text-xs text-muted-foreground mt-4">
            © {new Date().getFullYear()} HQ Power. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}
