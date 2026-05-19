import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  const supabase = await createServerSupabase();
  const { searchParams } = new URL(req.url);
  const householdId = searchParams.get("household_id");
  const week_number = searchParams.get("week_number");
  const year = searchParams.get("year");

  let query = supabase
    .from("tasks")
    .select("*, category:task_categories(*), creator:users!created_by(*), assignee:users!assigned_to(*)");

  if (householdId) query = query.eq("household_id", householdId);
  if (week_number) query = query.eq("week_number", parseInt(week_number));
  if (year) query = query.eq("year", parseInt(year));

  query = query
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabase();
  const body = await req.json();

  const { data, error } = await supabase.from("tasks").insert(body).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data, { status: 201 });
}
