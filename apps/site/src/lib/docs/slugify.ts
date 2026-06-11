/**
 * Heading slug helpers shared by the TOC extractor and the heading-id rehype
 * plugin, so anchor ids match on both sides. Replaces github-slugger.
 */

/** `Handling 429` -> `handling-429`; `What you'll need` -> `what-youll-need`. */
export function slugify(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, '') // drop punctuation/symbols
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Returns a slugger that de-duplicates repeated headings within one document
 * by appending `-1`, `-2`, … (same scheme as github-slugger).
 */
export function createSlugger(): (text: string) => string {
  const seen = new Map<string, number>();
  return (text: string): string => {
    const base = slugify(text);
    if (!seen.has(base)) {
      seen.set(base, 0);
      return base;
    }
    const n = (seen.get(base) ?? 0) + 1;
    seen.set(base, n);
    return `${base}-${n}`;
  };
}
