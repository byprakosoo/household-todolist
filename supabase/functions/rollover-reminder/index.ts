// ============================================================
// WeekSync: Rollover Reminder Edge Function
// Deploy via: supabase functions deploy rollover-reminder
// Env vars: RESEND_API_KEY
// ============================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;

interface TaskRow {
  id: string;
  title: string;
  assignee_type: string;
  household_id: string;
}

interface HouseholdWithTasks {
  household_id: string;
  invite_code: string;
  tasks: TaskRow[];
  members: { email: string; display_name: string }[];
}

Deno.serve(async (_req: Request) => {
  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const now = new Date();
    const isoWeek = getISOWeek(now);
    const year = now.getFullYear();

    // Fetch all incomplete tasks for the current week
    const { data: tasks, error: tasksError } = await supabase
      .from("tasks")
      .select("id, title, assignee_type, household_id")
      .eq("week_number", isoWeek)
      .eq("year", year)
      .eq("is_done", false);

    if (tasksError) {
      return new Response(JSON.stringify({ error: tasksError.message }), { status: 500 });
    }

    if (!tasks || tasks.length === 0) {
      return new Response(JSON.stringify({ message: "No incomplete tasks this week" }), { status: 200 });
    }

    // Group tasks by household
    const byHousehold = new Map<string, TaskRow[]>();
    for (const t of tasks) {
      const existing = byHousehold.get(t.household_id) || [];
      existing.push(t);
      byHousehold.set(t.household_id, existing);
    }

    const results: { household: string; sent: number }[] = [];

    for (const [householdId, householdTasks] of byHousehold) {
      // Get household invite code (for deep link)
      const { data: hh } = await supabase
        .from("households")
        .select("invite_code")
        .eq("id", householdId)
        .single();

      // Get household members' emails
      const { data: members } = await supabase
        .from("household_members")
        .select("user_id")
        .eq("household_id", householdId);

      if (!members || members.length === 0) continue;

      const userIds = members.map((m) => m.user_id);

      const { data: users } = await supabase
        .from("users")
        .select("email, display_name")
        .in("id", userIds);

      if (!users || users.length === 0) continue;

      const taskListText = householdTasks
        .map((t) => `• ${t.title} (${t.assignee_type})`)
        .join("\n");

      const subject = `WeekSync: You have ${householdTasks.length} unfinished task${householdTasks.length > 1 ? "s" : ""} — Roll over?`;
      const html = `
        <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
          <h2>Weekly Rollover Reminder</h2>
          <p>You have <strong>${householdTasks.length}</strong> unfinished task${householdTasks.length > 1 ? "s" : ""} this week:</p>
          <ul>${householdTasks.map((t) => `<li>${t.title} — <em>${t.assignee_type}</em></li>`).join("")}</ul>
          <p><a href="${Deno.env.get("APP_URL")}/rollover?household=${householdId}" style="display: inline-block; background: #18181b; color: #fff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600;">Review &amp; Roll Over</a></p>
          <p style="color: #888; font-size: 12px;">WeekSync — Shared weekly tasks for you and your partner</p>
        </div>
      `;

      for (const user of users) {
        if (!user.email) continue;
        await sendEmail(user.email, subject, html);
      }

      results.push({ household: householdId, sent: users.length });
    }

    return new Response(JSON.stringify({ success: true, results }), { status: 200 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), { status: 500 });
  }
});

async function sendEmail(to: string, subject: string, html: string) {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "WeekSync <onboarding@resend.dev>",
      to,
      subject,
      html,
    }),
  });

  if (!res.ok) {
    console.error(`Resend error: ${await res.text()}`);
  }

  return res;
}

function getISOWeek(d: Date): number {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  date.setUTCDate(date.getUTCDate() + 4 - (date.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  return Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}
