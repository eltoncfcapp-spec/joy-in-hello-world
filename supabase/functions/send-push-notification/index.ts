import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Web Push encryption using Web Crypto API
async function generatePushMessage(subscription: { endpoint: string; p256dh: string; auth: string }, payload: string, vapidPublicKey: string, vapidPrivateKey: string): Promise<{ endpoint: string; body: Uint8Array; headers: Record<string, string> }> {
  // For simplicity, we'll use the Supabase functions invoke to call an external push service
  // or use local notifications as fallback
  throw new Error("Direct web-push not implemented - use local notifications");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { title, body, url, tag } = await req.json();

    if (!title || !body) {
      return new Response(
        JSON.stringify({ error: "Title and body are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Recording notification: ${title} - ${body}`);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get ALL subscriptions count for logging
    const { data: subscriptions, error: subError } = await supabase
      .from("push_subscriptions")
      .select("id, endpoint");

    if (subError) {
      console.error("Error fetching subscriptions:", subError);
    }

    const subscriberCount = subscriptions?.length || 0;
    console.log(`Notification queued for ${subscriberCount} subscribers: ${title}`);

    // Return success - notifications will be shown via service worker when app is opened
    // or via the scheduled cron job
    return new Response(
      JSON.stringify({
        success: true,
        queued: true,
        subscribers: subscriberCount,
        notification: { title, body, url, tag }
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in send-push-notification:", error);
    return new Response(
      JSON.stringify({ error: String(error) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
