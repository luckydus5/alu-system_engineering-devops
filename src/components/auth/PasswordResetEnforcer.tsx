import { useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

/**
 * Forces users to complete an admin-initiated password reset.
 * If a logged-in user has a pending reset token, we immediately sign them out
 * and redirect them to /admin-password-reset to set a new password.
 */
export function PasswordResetEnforcer() {
  const { user, loading, signOut } = useAuth();
  const { toast } = useToast();
  const location = useLocation();
  const navigate = useNavigate();

  const isHandlingRef = useRef(false);

  useEffect(() => {
    const run = async () => {
      if (loading) return;
      if (!user?.email) return;
      if (isHandlingRef.current) return;

      // Don't interfere with the reset pages themselves
      if (location.pathname.startsWith("/admin-password-reset")) return;
      if (location.pathname.startsWith("/reset-password")) return;
      if (location.pathname.startsWith("/auth")) return;

      isHandlingRef.current = true;
      try {
        const { data, error } = await supabase.rpc("check_pending_password_reset", {
          email_to_check: user.email,
        });

        const hasReset = !error && data?.[0]?.has_pending_reset;
        const token = data?.[0]?.reset_token ?? null;

        if (hasReset && token) {
          toast({
            title: "Password reset required",
            description:
              "An administrator reset your password. Please set a new password to continue.",
          });

          // Revoke local session immediately
          await signOut();

          navigate(
            `/admin-password-reset?token=${token}&email=${encodeURIComponent(user.email)}`,
            { replace: true }
          );
        }
      } finally {
        isHandlingRef.current = false;
      }
    };

    run();
  }, [loading, user?.email, location.pathname, navigate, signOut, toast]);

  return null;
}
