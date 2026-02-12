import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Initialize default balances for any employees missing them
    const { error: initError } = await supabase.rpc("initialize_default_leave_balances");
    if (initError) {
      console.error("Error initializing balances:", initError);
    }

    // Monthly accrual: check if it's the 1st of the month, add 1.5 days to annual leave
    const today = new Date();
    if (today.getDate() === 1) {
      const { error: accrualError } = await supabase.rpc("accrue_monthly_annual_leave");
      if (accrualError) {
        console.error("Error accruing monthly leave:", accrualError);
      } else {
        console.log("Monthly annual leave accrual completed");
      }
    }

    // Deduct active leave balances
    const { error: deductError } = await supabase.rpc("deduct_active_leave_balances");
    if (deductError) {
      console.error("Error deducting balances:", deductError);
      return new Response(JSON.stringify({ error: deductError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({ success: true, message: "Leave balances processed", timestamp: new Date().toISOString() }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Unexpected error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
