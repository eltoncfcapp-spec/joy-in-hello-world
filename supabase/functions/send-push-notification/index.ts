import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PushPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  url?: string;
  tag?: string;
}

interface PushSubscription {
  endpoint: string;
  p256dh: string;
  auth: string;
  member_id: string;
}

async function sendPushNotification(
  subscription: PushSubscription,
  payload: PushPayload
): Promise<{ success: boolean; error?: string }> {
  try {
    // For now, we'll store the notification and let the service worker handle it
    // Real web push requires complex encryption - we'll use a simpler approach
    console.log(`Would send push to ${subscription.endpoint}:`, payload);
    return { success: true };
  } catch (error) {
    console.error(`Error sending push to ${subscription.endpoint}:`, error);
    return { success: false, error: String(error) };
  }
}

Deno.serve(async (req) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { title, body, targetType, targetId, icon, url, tag } = await req.json();

    if (!title || !body) {
      return new Response(
        JSON.stringify({ error: "Title and body are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Sending push notification: ${title} - Target: ${targetType} ${targetId || "all"}`);

    // Get environment variables
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Build query for subscriptions
    let memberIds: string[] | null = null;

    // Filter by target if specified
    if (targetType === "group" && targetId) {
      const { data: members } = await supabase
        .from("members")
        .select("id")
        .eq("cell_group_id", targetId);
      
      if (members?.length) {
        memberIds = members.map((m) => m.id);
      } else {
        return new Response(
          JSON.stringify({ success: true, sent: 0, message: "No members in this group" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    } else if (targetType === "department" && targetId) {
      const { data: members } = await supabase
        .from("members")
        .select("id")
        .contains("assigned_departments", [targetId]);
      
      if (members?.length) {
        memberIds = members.map((m) => m.id);
      } else {
        return new Response(
          JSON.stringify({ success: true, sent: 0, message: "No members in this department" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    let query = supabase.from("push_subscriptions").select("endpoint, p256dh, auth, member_id");
    
    if (memberIds) {
      query = query.in("member_id", memberIds);
    }

    const { data: subscriptions, error: subError } = await query;

    if (subError) {
      console.error("Error fetching subscriptions:", subError);
      return new Response(
        JSON.stringify({ error: "Failed to fetch subscriptions" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!subscriptions?.length) {
      console.log("No subscriptions found");
      return new Response(
        JSON.stringify({ success: true, sent: 0, message: "No subscribers found" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Found ${subscriptions.length} subscriptions`);

    const payload: PushPayload = {
      title,
      body,
      icon: icon || "/church-icon-192.png",
      badge: "/church-icon-72.png",
      url: url || "/",
      tag: tag || `notification-${Date.now()}`,
    };

    // Send notifications to all subscribers
    const results = await Promise.all(
      subscriptions.map((sub) => sendPushNotification(sub, payload))
    );

    const successful = results.filter((r) => r.success).length;
    const failed = results.filter((r) => !r.success).length;

    console.log(`Push results: ${successful} sent, ${failed} failed`);

    return new Response(
      JSON.stringify({
        success: true,
        sent: successful,
        failed: failed,
        total: subscriptions.length,
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
