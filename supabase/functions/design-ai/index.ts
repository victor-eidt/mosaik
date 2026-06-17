// Supabase Edge Function: design-ai
//
// Powers the Design Systems space's AI features:
//   - mode "chat":   edit the current DESIGN.md per a natural-language instruction
//   - mode "create": generate a whole DESIGN.md from a text brief
//   - mode "image":  generate a whole DESIGN.md from an uploaded reference image
//
// Calls the OpenAI Chat Completions API (gpt-4o, vision-capable) via raw HTTP.
// Requires the `OPENAI_API_KEY` secret:
//   supabase secrets set OPENAI_API_KEY=sk-...
// Deploy with:
//   supabase functions deploy design-ai
//
// SUPABASE_URL, SUPABASE_ANON_KEY, and SUPABASE_SERVICE_ROLE_KEY are injected
// automatically by the platform.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const IMAGE_BUCKET = 'prompt-images';
// Vision-capable model. Swap to e.g. 'gpt-4.1' or 'gpt-4o-mini' here if preferred.
const MODEL = 'gpt-4o';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const SCHEMA_DOC = `A DESIGN.md file is YAML frontmatter (between --- fences) holding the structured
tokens, followed by a short freeform markdown body. The frontmatter schema is exactly:

---
name: <string>
buttonStyle: pill | rounded | square
colors:
  background: <hex>      # page canvas
  surface: <hex>         # cards / inputs
  text: <hex>
  textMuted: <hex>
  border: <hex>
  primary: <hex>         # primary action color
  primaryText: <hex>     # text/icon on top of primary
  accent: <hex>
  danger: <hex>
  success: <hex>
typography:
  fontSans: <css font stack string>
  fontMono: <css font stack string>
  baseSize: <e.g. "16px">
  scaleRatio: <number, e.g. 1.25>
  headingWeight: <number, e.g. 700>
  bodyWeight: <number, e.g. 400>
radii:
  surface: <e.g. "10px">
  button: <e.g. "8px">
  pill: <e.g. "999px">
spacing: [<ascending px numbers>]
components:
  shadows: <boolean>
  borders: <boolean>
  density: comfortable | compact
---

# <name>

<freeform markdown documentation>`;

const SYSTEM_PROMPT = `You are a senior design-systems engineer working inside a tool that manages DESIGN.md
files. A DESIGN.md is structured YAML frontmatter (the design tokens) followed by a short
markdown body documenting the system.

${SCHEMA_DOC}

OUTPUT RULES:
- Output the COMPLETE DESIGN.md and NOTHING else: no code fences, no preamble, no
  commentary. The very first character of your reply must be a dash (the opening "---").
- The frontmatter MUST be valid YAML and include EVERY field in the schema above.
- Write EVERY color as a DOUBLE-QUOTED 6-digit hex string, e.g. background: "#0a0a0a".
  NEVER output a bare #value — YAML reads an unquoted "#" as a comment and the color is lost.

QUALITY RULES:
- Choose a cohesive, intentional palette. Never leave colors blank and never make
  everything gray unless the design is genuinely monochrome.
- Ensure real contrast: 'text' must be clearly readable on 'background', and 'primaryText'
  must be clearly readable on 'primary' (e.g. white text on a saturated primary).
- 'primary' is the main brand/action color; 'accent' is a secondary highlight; 'danger'
  is red-ish and 'success' is green-ish.
- Match buttonStyle to the real shape: pill = fully rounded, rounded = small radius,
  square = 0.
- Pick a font stack that fits the personality (begin with a real family, then fallbacks).
- Keep the markdown body to 2-4 short lines describing the system's personality.`;

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

/** Strip accidental ```-fences and any prose before the leading frontmatter. */
function cleanMarkdown(text: string): string {
  let t = text.trim();
  t = t.replace(/^```(?:markdown|md|yaml)?\s*\n?/i, '').replace(/\n?```\s*$/i, '');
  const idx = t.indexOf('---');
  if (idx > 0) t = t.slice(idx);
  return t.trim();
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
  if (!OPENAI_API_KEY) {
    return json({ error: 'AI is not configured: OPENAI_API_KEY secret is missing.' }, 503);
  }

  // Verify the caller is an authenticated user.
  const authHeader = req.headers.get('Authorization') ?? '';
  const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: userData, error: userErr } = await userClient.auth.getUser();
  if (userErr || !userData.user) return json({ error: 'Not authenticated' }, 401);

  let payload: {
    mode?: 'chat' | 'create' | 'image';
    markdown?: string;
    messages?: { role: 'user' | 'assistant'; content: string }[];
    prompt?: string;
    imagePath?: string | null;
  };
  try {
    payload = await req.json();
  } catch {
    return json({ error: 'Invalid JSON body' }, 400);
  }

  const mode = payload.mode ?? 'chat';
  const currentMarkdown = payload.markdown ?? '';

  // Build the OpenAI chat message list (system prompt is prepended at request time).
  const messages: { role: 'system' | 'user' | 'assistant'; content: unknown }[] = [];

  if (mode === 'image') {
    if (!payload.imagePath) return json({ error: 'imagePath is required for image mode' }, 400);
    // Mint a short-lived signed URL with the service role so the model can fetch the private image.
    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    // Defense in depth: the path is namespaced by user id (`{user_id}/...`).
    if (!payload.imagePath.startsWith(`${userData.user.id}/`)) {
      return json({ error: 'Forbidden image path' }, 403);
    }
    const { data: signed, error: signErr } = await admin.storage
      .from(IMAGE_BUCKET)
      .createSignedUrl(payload.imagePath, 600);
    if (signErr || !signed) return json({ error: 'Could not read the reference image' }, 400);

    messages.push({
      role: 'user',
      content: [
        {
          type: 'text',
          text:
            'Analyze this UI / brand reference image and reverse-engineer its design system.\n\n' +
            'Work through it carefully:\n' +
            '1. Decide whether the interface is LIGHT or DARK, and set `background` and `surface` ' +
            'to the ACTUAL canvas and card colors you see. Do not default to a dark theme.\n' +
            '2. Identify the dominant BRAND color (primary buttons, links, active states, logo) ' +
            'and use it as `primary`; choose a complementary `accent` from the image.\n' +
            '3. Read the real `text`, `textMuted`, and `border` colors.\n' +
            '4. Infer the typography feel (sans font stack), the corner radius / button shape, ' +
            'and the spacing density.\n' +
            '5. Give it a fitting `name` based on the product or its mood.\n\n' +
            'Sample real colors from the image — the result should visibly resemble the reference. ' +
            'Output only the complete DESIGN.md.',
        },
        { type: 'image_url', image_url: { url: signed.signedUrl, detail: 'high' } },
      ],
    });
  } else if (mode === 'create') {
    messages.push({
      role: 'user',
      content:
        'Create a brand-new, complete design system from scratch for this brief:\n\n' +
        `"${payload.prompt ?? ''}"\n\n` +
        'Invent a fitting name and a cohesive, harmonious palette, typography, radii, spacing, ' +
        'and button style that match the described mood. Be opinionated and specific. ' +
        'Output only the complete DESIGN.md.',
    });
  } else {
    // Chat mode: prior turns, then current doc + instruction.
    for (const m of payload.messages ?? []) {
      if (m.role === 'user' || m.role === 'assistant') {
        messages.push({ role: m.role, content: m.content });
      }
    }
    messages.push({
      role: 'user',
      content:
        `Here is the current DESIGN.md:\n\n${currentMarkdown}\n\n` +
        'Apply this change and return the full updated DESIGN.md. Make only the changes implied, ' +
        `preserving everything else:\n${payload.prompt ?? ''}`,
    });
  }

  let aiText: string;
  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 4096,
        temperature: 0.6,
        messages: [{ role: 'system', content: SYSTEM_PROMPT }, ...messages],
      }),
    });
    if (!res.ok) {
      const detail = await res.text();
      return json({ error: `AI request failed (${res.status})`, detail }, 502);
    }
    const data = await res.json();
    aiText = data.choices?.[0]?.message?.content ?? '';
  } catch (e) {
    return json({ error: `AI request error: ${(e as Error).message}` }, 502);
  }

  const markdown = cleanMarkdown(aiText);
  if (!markdown.startsWith('---')) {
    return json({ error: 'The AI did not return a valid design document. Try rephrasing.' }, 422);
  }

  const note =
    mode === 'image'
      ? 'Generated a system from your reference image.'
      : mode === 'create'
      ? 'Generated a new system from your brief.'
      : 'Updated the design system.';
  return json({ markdown, note });
});
