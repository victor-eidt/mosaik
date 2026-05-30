/** Matches {{ variable_name }} placeholders. Names allow letters, digits, _, -, . */
const VAR_RE = /\{\{\s*([\w.-]+)\s*\}\}/g;

/** Return the unique placeholder names found in a prompt body, in first-seen order. */
export function extractVars(body: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const match of body.matchAll(VAR_RE)) {
    const name = match[1];
    if (!seen.has(name)) {
      seen.add(name);
      out.push(name);
    }
  }
  return out;
}

/** Replace placeholders with provided values. Unfilled values keep their {{token}}. */
export function renderTemplate(body: string, values: Record<string, string>): string {
  return body.replace(VAR_RE, (whole, name: string) => {
    const v = values[name];
    return v && v.length > 0 ? v : whole;
  });
}
