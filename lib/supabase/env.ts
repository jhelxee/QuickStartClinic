/**
 * Reads the two Supabase environment variables, with an error message that
 * tells you what to do instead of "Cannot read properties of undefined".
 *
 * These must be inlined as literal `process.env.NEXT_PUBLIC_*` property
 * accesses — Next replaces them at build time by matching that exact text, so
 * a dynamic lookup like process.env[name] would come back undefined in the
 * browser bundle.
 */

/** Values copied straight from .env.local.example and never filled in. */
const PLACEHOLDERS = ["YOUR-PROJECT", "your-anon-key-here", "your-anon-key"];

function isPlaceholder(value: string): boolean {
  return PLACEHOLDERS.some((token) => value.includes(token));
}

const SETUP_HINT =
  `Open .env.local in the project root and set:\n` +
  `  NEXT_PUBLIC_SUPABASE_URL=https://YOUR-PROJECT.supabase.co\n` +
  `  NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key\n\n` +
  `Both values are in the Supabase dashboard under Project Settings -> API ` +
  `("Project URL" and the "anon / publishable" key).\n` +
  `Restart the dev server afterwards — Next only reads env files at startup.\n` +
  `Full walkthrough: docs/supabase-setup.md`;

function required(value: string | undefined, name: string): string {
  if (!value) {
    throw new Error(`Missing ${name}.\n\n${SETUP_HINT}`);
  }
  if (isPlaceholder(value)) {
    throw new Error(
      `${name} still contains the placeholder value from ` +
        `.env.local.example.\n\n${SETUP_HINT}`
    );
  }
  return value;
}

/**
 * Whether both variables are set to real values.
 *
 * Lets callers that don't strictly need Supabase (proxy.ts) skip it rather than
 * crashing the whole site before you've finished setting the project up.
 */
export function isSupabaseConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return Boolean(url && key && !isPlaceholder(url) && !isPlaceholder(key));
}

export function supabaseUrl(): string {
  return required(process.env.NEXT_PUBLIC_SUPABASE_URL, "NEXT_PUBLIC_SUPABASE_URL");
}

export function supabaseAnonKey(): string {
  return required(
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    "NEXT_PUBLIC_SUPABASE_ANON_KEY"
  );
}
