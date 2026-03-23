import { resolve, dirname } from "node:path";

const PROMPTS_DIR = resolve(dirname(import.meta.dir), "prompts");

const localeToLanguage: Record<string, string> = {
  en: "English",
  ru: "Russian",
  es: "Spanish",
  fr: "French",
};

function interpolate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? `{{${key}}}`);
}

// Cache loaded templates
const cache = new Map<string, string>();
async function getTemplate(name: string): Promise<string> {
  if (!cache.has(name)) {
    const path = resolve(PROMPTS_DIR, `${name}.md`);
    cache.set(name, await Bun.file(path).text());
  }
  return cache.get(name)!;
}

export async function buildAnalyzePrompt({
  promptText,
  phonemes,
  locale,
}: {
  promptText: string;
  phonemes: string;
  locale: string;
}): Promise<string> {
  const template = await getTemplate("analyze");
  return interpolate(template, {
    promptText,
    phonemes,
    language: localeToLanguage[locale] ?? "English",
  });
}

export async function buildAssessPrompt({
  passage,
  targetLanguage,
  locale,
}: {
  passage: string;
  targetLanguage: string;
  locale: string;
}): Promise<string> {
  const template = await getTemplate("assess");
  const drillIds =
    targetLanguage === "german"
      ? "umlauts, ch-sounds, uvular-r, consonant-clusters, word-stress, intonation"
      : "th-sounds, vowel-pairs, r-l-distinction, word-stress, intonation, consonant-clusters";

  return interpolate(template, {
    passage,
    passageLanguage: targetLanguage === "german" ? "German" : "English",
    drillIds,
    language: localeToLanguage[locale] ?? "English",
  });
}

export async function buildPhonemePrompt({
  promptText,
  phonemes,
  locale,
}: {
  promptText: string;
  phonemes: string;
  locale: string;
}): Promise<string> {
  const template = await getTemplate("phoneme");
  return interpolate(template, {
    promptText,
    phonemes,
    language: localeToLanguage[locale] ?? "English",
  });
}

export async function buildProfilePrompt({
  locale,
  variant,
}: {
  locale: string;
  variant?: string;
}): Promise<string> {
  const templateName = variant ? `profile${variant}` : "profile";
  const template = await getTemplate(templateName);
  return interpolate(template, {
    language: localeToLanguage[locale] ?? "English",
  });
}
