import { NextResponse } from "next/server";
import { getPublishedSectionsNav } from "@/lib/content/published-sections";

export const dynamic = "force-dynamic";

/** Публичный список разделов для сайдбара (без кэша layout при client navigation). */
export async function GET() {
  try {
    const sections = await getPublishedSectionsNav();
    return NextResponse.json(
      { sections },
      {
        headers: {
          "Cache-Control": "private, no-store, max-age=0, must-revalidate",
        },
      },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load sections";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
