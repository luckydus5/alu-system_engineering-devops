import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ResetPasswordRequest {
  action: "initiate" | "complete";
  userId?: string;
  userEmail?: string;
  token?: string;
  newPassword?: string;
}

serve(async (req: Request): Promise<Response> => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    
    // Create admin client with service role key
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    const { action, userId, userEmail, token, newPassword }: ResetPasswordRequest = await req.json();

    if (action === "initiate") {
      // Verify the caller is a super admin
      const authHeader = req.headers.get("Authorization");
      if (!authHeader?.startsWith("Bearer ")) {
        console.log("No auth header provided");
        return new Response(
          JSON.stringify({ error: "Unauthorized" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Extract the JWT token
      const jwt = authHeader.replace("Bearer ", "");
      
      // Use admin client to get user from JWT
      const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(jwt);
      
      if (userError || !userData?.user) {
        console.error("User verification error:", userError);
        return new Response(
          JSON.stringify({ error: "Invalid authentication" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const callingUser = userData.user;
      console.log("Authenticated user:", callingUser.id, callingUser.email);

      // Check if calling user is super_admin
      const { data: roleData, error: roleError } = await supabaseAdmin
        .from("user_roles")
        .select("role")
        .eq("user_id", callingUser.id)
        .single();

      console.log("Role check:", roleData, roleError);

      if (roleError || roleData?.role !== "super_admin") {
        return new Response(
          JSON.stringify({ error: "Only super admins can reset passwords" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Get calling user's profile for the initiated_by_name field
      const { data: callerProfile } = await supabaseAdmin
        .from("profiles")
        .select("full_name, email")
        .eq("id", callingUser.id)
        .single();

      if (!userId || !userEmail) {
        return new Response(
          JSON.stringify({ error: "User ID and email are required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Expire any existing pending resets for this user
      await supabaseAdmin
        .from("admin_password_resets")
        .update({ is_used: true, used_at: new Date().toISOString() })
        .eq("user_id", userId)
        .eq("is_used", false);

      // Create new reset token
      const { data: resetData, error: insertError } = await supabaseAdmin
        .from("admin_password_resets")
        .insert({
          user_id: userId,
          user_email: userEmail,
          initiated_by: callingUser.id,
          initiated_by_name: callerProfile?.full_name || callerProfile?.email || callingUser.email,
        })
        .select()
        .single();

      if (insertError) {
        console.error("Insert error:", insertError);
        return new Response(
          JSON.stringify({ error: "Failed to create reset token" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      console.log("Reset token created:", resetData.id);

      // Create a notification for the user
      await supabaseAdmin
        .from("notifications")
        .insert({
          user_id: userId,
          title: "Password Reset Required",
          message: `Your password has been reset by an administrator. Please log in to set a new password.`,
          type: "security",
        });

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "Password reset initiated successfully",
          expiresAt: resetData.expires_at
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );

    } else if (action === "complete") {
      // Complete password reset - no auth required, just valid token
      if (!token || !newPassword) {
        return new Response(
          JSON.stringify({ error: "Token and new password are required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Validate password strength
      if (newPassword.length < 8) {
        return new Response(
          JSON.stringify({ error: "Password must be at least 8 characters" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (!/[A-Z]/.test(newPassword) || !/[a-z]/.test(newPassword) || 
          !/[0-9]/.test(newPassword) || !/[^A-Za-z0-9]/.test(newPassword)) {
        return new Response(
          JSON.stringify({ error: "Password must contain uppercase, lowercase, number, and special character" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Find the reset token
      const { data: resetData, error: findError } = await supabaseAdmin
        .from("admin_password_resets")
        .select("*")
        .eq("token", token)
        .eq("is_used", false)
        .gt("expires_at", new Date().toISOString())
        .single();

      if (findError || !resetData) {
        console.error("Token lookup error:", findError);
        return new Response(
          JSON.stringify({ error: "Invalid or expired reset token" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      console.log("Found valid reset token for user:", resetData.user_id);

      // Update the user's password using admin API
      const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
        resetData.user_id,
        { password: newPassword }
      );

      if (updateError) {
        console.error("Password update error:", updateError);
        return new Response(
          JSON.stringify({ error: "Failed to update password" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Mark the token as used
      await supabaseAdmin
        .from("admin_password_resets")
        .update({ is_used: true, used_at: new Date().toISOString() })
        .eq("id", resetData.id);

      // Create success notification
      await supabaseAdmin
        .from("notifications")
        .insert({
          user_id: resetData.user_id,
          title: "Password Updated Successfully",
          message: "Your password has been changed. You can now log in with your new password.",
          type: "security",
        });

      console.log("Password updated successfully for user:", resetData.user_id);

      return new Response(
        JSON.stringify({ success: true, message: "Password updated successfully" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );

    } else {
      return new Response(
        JSON.stringify({ error: "Invalid action" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

  } catch (error: unknown) {
    console.error("Error in admin-reset-password:", error);
    const errorMessage = error instanceof Error ? error.message : "Internal server error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
