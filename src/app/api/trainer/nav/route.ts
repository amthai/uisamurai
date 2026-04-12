import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/** Публичный список разделов для сайдбара (без кэша layout при client navigation). */
export async function GET() {
  const { data, error } = await supabaseServer
    .from("sections")
    .select("slug, title")
    .eq("is_published", true)
    .order("sort_order", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    sections: (data ?? []).map((s) => ({ slug: s.slug as string, title: s.title as string })),
  });
}
