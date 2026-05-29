import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";

type RolloverBody = {
  taskIds?: string[];
  sourceWeek?: number;
  sourceYear?: number;
  targetWeek?: number;
  targetYear?: number;
  householdId?: string;
};

// POST: confirm rollover - clone selected or all unfinished source tasks into target week
export async function POST(req: NextRequest) {
  const supabase = await createServerSupabase();
  const body = (await req.json()) as RolloverBody;
  const { taskIds, sourceWeek, sourceYear, targetWeek, targetYear, householdId } = body;

  if (!targetWeek || !targetYear || !householdId) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  if (!taskIds?.length && (!sourceWeek || !sourceYear)) {
    return NextResponse.json({ error: "Missing source week or task ids" }, { status: 400 });
  }

  let originalsQuery = supabase
    .from("tasks")
    .select("*")
    .eq("household_id", householdId)
    .eq("is_done", false)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (taskIds?.length) {
    originalsQuery = originalsQuery.in("id", taskIds);
  } else {
    originalsQuery = originalsQuery
      .eq("week_number", sourceWeek!)
      .eq("year", sourceYear!);
  }

  const { data: originals, error: fetchError } = await originalsQuery;

  if (fetchError) return NextResponse.json({ error: fetchError.message }, { status: 500 });
  if (!originals?.length) {
    const { error: updateError } = await supabase
      .from("households")
      .update({
        rollover_confirmed: true,
        confirmed_week: targetWeek,
        confirmed_year: targetYear,
      })
      .eq("id", householdId);

    if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });

    return NextResponse.json({ success: true, count: 0, skipped: 0 });
  }

  const originalIds = originals.map((task) => task.id);
  const { data: existingRollovers, error: existingError } = await supabase
    .from("tasks")
    .select("rolled_over_from")
    .eq("household_id", householdId)
    .eq("week_number", targetWeek)
    .eq("year", targetYear)
    .in("rolled_over_from", originalIds);

  if (existingError) return NextResponse.json({ error: existingError.message }, { status: 500 });

  const alreadyRolled = new Set(
    (existingRollovers || [])
      .map((task) => task.rolled_over_from)
      .filter(Boolean)
  );
  const tasksToInsert = originals.filter((task) => !alreadyRolled.has(task.id));

  const { data: latestTargetTask, error: orderError } = await supabase
    .from("tasks")
    .select("sort_order")
    .eq("household_id", householdId)
    .eq("week_number", targetWeek)
    .eq("year", targetYear)
    .order("sort_order", { ascending: false })
    .limit(1);

  if (orderError) return NextResponse.json({ error: orderError.message }, { status: 500 });

  const nextSortOrder = (latestTargetTask?.[0]?.sort_order ?? -1) + 1;

  const inserts = tasksToInsert.map((t, i) => ({
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
    sort_order: nextSortOrder + i,
    rolled_over_from: t.id,
  }));

  if (inserts.length > 0) {
    const { error: insertError } = await supabase.from("tasks").insert(inserts);
    if (insertError) return NextResponse.json({ error: insertError.message }, { status: 400 });
  }

  const { error: updateError } = await supabase
    .from("households")
    .update({
      rollover_confirmed: true,
      confirmed_week: targetWeek,
      confirmed_year: targetYear,
    })
    .eq("id", householdId);

  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });

  return NextResponse.json({
    success: true,
    count: inserts.length,
    skipped: originals.length - inserts.length,
  });
}
