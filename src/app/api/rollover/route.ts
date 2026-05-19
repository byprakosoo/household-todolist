import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";

// GET: fetch pending (incomplete) tasks for rollover
export async function GET(req: NextRequest) {
  const supabase = await createServerSupabase();
  const { searchParams } = new URL(req.url);
  const householdId = searchParams.get("household_id");
  const week_number = searchParams.get("week_number");
  const year = searchParams.get("year");

  if (!householdId || !week_number || !year) {
    return NextResponse.json({ error: "Missing required params" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("tasks")
    .select("*, category:task_categories(*)")
    .eq("household_id", householdId)
    .eq("week_number", parseInt(week_number))
    .eq("year", parseInt(year))
    .eq("is_done", false)
    .order("sort_order", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
