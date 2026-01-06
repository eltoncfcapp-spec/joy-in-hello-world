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

Deno.serve(async (req) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY");
    const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY");

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get tomorrow's date
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    // Get today's date for same-day reminders
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    console.log(`Checking for events on ${todayStr} and ${tomorrowStr}`);

    // Fetch events happening tomorrow or today
    const { data: events, error: eventsError } = await supabase
      .from("events")
      .select("*")
      .or(`event_date.eq.${tomorrowStr},event_date.eq.${todayStr}`)
      .eq("is_completed", false);

    if (eventsError) {
      console.error("Error fetching events:", eventsError);
      return new Response(
        JSON.stringify({ error: "Failed to fetch events" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!events?.length) {
      console.log("No upcoming events found");
      return new Response(
        JSON.stringify({ success: true, message: "No upcoming events", sent: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Found ${events.length} upcoming events`);

    // Get all push subscriptions
    const { data: subscriptions, error: subError } = await supabase
      .from("push_subscriptions")
      .select("endpoint, p256dh, auth, member_id");

    if (subError || !subscriptions?.length) {
      console.log("No subscriptions found");
      return new Response(
        JSON.stringify({ success: true, message: "No subscribers", sent: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let totalSent = 0;

    // Send reminders for each event
    for (const event of events) {
      const isToday = event.event_date === todayStr;
      const timeText = isToday ? "today" : "tomorrow";
      
      const payload: PushPayload = {
        title: `🗓️ Event Reminder: ${event.name}`,
        body: `${event.name} is ${timeText} at ${event.event_time}${event.location ? ` - ${event.location}` : ''}`,
        icon: "/church-icon-192.png",
        badge: "/church-icon-72.png",
        url: "/events",
        tag: `event-reminder-${event.id}`,
      };

      // Filter subscriptions based on event target
      let targetSubscriptions = subscriptions;

      if (!event.is_whole_church) {
        // Get members from target groups/departments
        const memberIds: string[] = [];

        if (event.target_groups?.length) {
          const { data: groupMembers } = await supabase
            .from("members")
            .select("id")
            .in("cell_group_id", event.target_groups);
          
          if (groupMembers) {
            memberIds.push(...groupMembers.map(m => m.id));
          }
        }

        if (event.target_departments?.length) {
          const { data: deptMembers } = await supabase
            .from("department_members")
            .select("member_id")
            .in("department_id", event.target_departments);
          
          if (deptMembers) {
            memberIds.push(...deptMembers.map(m => m.member_id));
          }
        }

        if (memberIds.length > 0) {
          targetSubscriptions = subscriptions.filter(s => 
            s.member_id && memberIds.includes(s.member_id)
          );
        }
      }

      console.log(`Sending ${event.name} reminder to ${targetSubscriptions.length} subscribers`);

      // Log notification (actual push would require web-push library)
      for (const sub of targetSubscriptions) {
        console.log(`Would send to ${sub.endpoint}:`, payload);
        totalSent++;
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        events: events.length,
        sent: totalSent,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in event-reminders:", error);
    return new Response(
      JSON.stringify({ error: String(error) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
