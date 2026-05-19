import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";

// POST: confirm rollover — clone selected tasks into next week
export async function POST(req: NextRequest) {
  const supabase = await createServerSupabase();
  const body = await req.json();
  const { taskIds, targetWeek, targetYear, householdId } = body;

  if (!taskIds?.length || !targetWeek || !targetYear || !householdId) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  // Fetch the original tasks
  const { data: originals, error: fetchError } = await supabase
    .from("tasks")
    .select("*")
    .in("id", taskIds)
    .eq("household_id", householdId);

  if (fetchError) return NextResponse.json({ error: fetchError.message }, { status: 500 });

  // Clone them into the target week
  const inserts = originals.map((t, i) => ({
    household_id: t.household_id,
    created_by: t.created_by,
    assigned_to: t.assigned_to,
    category_id: t.category_id,
    title: t.title,
    notes: t.notes,
    assignee_type: t.assignee_type,
    is_done: false,
    week_number: targetWeek,
    year: targetYear,
    sort_order: i,
    rolled_over_from: t.id,
  }));

  const { error: insertError } = await supabase.from("tasks").insert(inserts);
  if (insertError) return NextResponse.json({ error: insertError.message }, { status: 400 });

  return NextResponse.json({ success: true, count: inserts.length });
}
