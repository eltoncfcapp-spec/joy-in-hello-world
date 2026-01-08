import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get today's date
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    console.log(`Checking events for ${todayStr}`);

    // Get events happening today
    const { data: events, error: eventsError } = await supabase
      .from("events")
      .select("id, name, event_time, location")
      .eq("event_date", todayStr)
      .eq("is_completed", false);

    if (eventsError) {
      console.error("Error fetching events:", eventsError);
      return new Response(
        JSON.stringify({ error: "Failed to fetch events" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!events?.length) {
      console.log("No events today");
      return new Response(
        JSON.stringify({ success: true, message: "No events today", sent: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Found ${events.length} events today`);

    // Get subscription count
    const { data: subscriptions } = await supabase
      .from("push_subscriptions")
      .select("id");

    const subscriberCount = subscriptions?.length || 0;
    console.log(`${subscriberCount} subscribers registered`);

    // Log the events that would trigger notifications
    for (const event of events) {
      console.log(`Event reminder: ${event.name} at ${event.event_time}`);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        events: events.length, 
        subscribers: subscriberCount,
        message: `${events.length} event(s) today, ${subscriberCount} subscriber(s) registered`
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: String(error) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
