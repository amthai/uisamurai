import { supabaseServer } from "@/lib/supabase/server";

export type PublishedSectionNavItem = {
  slug: string;
  title: string;
};

const REQUEST_CHUNK = 1000;

function isMissingColumnError(error: { message?: string } | null, column: "nav_title"): boolean {
  return Boolean(error?.message?.includes(`column sections.${column} does not exist`));
}

export async function getPublishedSectionsNav(): Promise<PublishedSectionNavItem[]> {
  const { count, error: countError } = await supabaseServer
    .from("sections")
    .select("id", { count: "exact", head: true })
    .eq("is_published", true);

  if (countError) {
    throw new Error(countError.message);
  }

  const total = count ?? 0;
  if (total === 0) {
    return [];
  }

  const out: PublishedSectionNavItem[] = [];
  let offset = 0;
  let hasNavTitleColumn = true;

  while (offset < total) {
    if (!hasNavTitleColumn) {
      const { data, error } = await supabaseServer
        .from("sections")
        .select("slug, title, sort_order")
        .eq("is_published", true)
        .order("sort_order", { ascending: true })
        .range(offset, offset + REQUEST_CHUNK - 1);
      if (error) {
        throw new Error(error.message);
      }
      const rows = (data ?? []) as Array<{ slug: string; title: string }>;
      if (rows.length === 0) {
        break;
      }
      out.push(...rows.map((r) => ({ slug: r.slug, title: r.title })));
      offset += rows.length;
      continue;
    }

    const { data, error } = await supabaseServer
      .from("sections")
      .select("slug, title, nav_title, sort_order")
      .eq("is_published", true)
      .order("sort_order", { ascending: true })
      .range(offset, offset + REQUEST_CHUNK - 1);

    if (error) {
      if (isMissingColumnError(error, "nav_title")) {
        hasNavTitleColumn = false;
        continue;
      }
      throw new Error(error.message);
    }

    const rows = (data ?? []) as Array<{ slug: string; title: string; nav_title: string | null }>;
    if (rows.length === 0) {
      break;
    }

    out.push(
      ...rows.map((r) => ({
        slug: r.slug,
        title: (r.nav_title ?? "").trim() || r.title,
      })),
    );
    offset += rows.length;
  }

  return out;
}
