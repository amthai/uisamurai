const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function isValidSectionSlug(slug: string): boolean {
  return slug.length >= 1 && slug.length <= 120 && SLUG_RE.test(slug);
}
