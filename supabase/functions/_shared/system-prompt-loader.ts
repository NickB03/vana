/**
 * System Prompt Loader for AI Chat
 *
 * Centralizes the large system prompt to improve code maintainability
 * and reduce edge function bundle size.
 */

interface SystemPromptParams {
  fullArtifactContext?: string;
  currentDate?: string;
}

/**
 * Get the system instruction for the AI chat
 * Loads from external file and interpolates dynamic values
 */
export async function getSystemInstruction(params: SystemPromptParams = {}): Promise<string> {
  const {
    fullArtifactContext = '',
    currentDate = new Date().toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  } = params;

  // In Deno edge functions, we can read the file directly
  const promptPath = new URL('./system-prompt.txt', import.meta.url);
  const promptTemplate = await Deno.readTextFile(promptPath);

  // Replace template variables
  return promptTemplate
    .replace(/\$\{new Date\(\)\.toLocaleDateString\([^)]+\)\}/g, currentDate)
    .replace(/\$\{fullArtifactContext\}/g, fullArtifactContext);
}

/**
 * Synchronous version - reads prompt template once and caches it
 * Use this to avoid repeated file reads in production
 */
let cachedPromptTemplate: string | null = null;

export async function cacheSystemPrompt(): Promise<void> {
  const promptPath = new URL('./system-prompt.txt', import.meta.url);
  cachedPromptTemplate = await Deno.readTextFile(promptPath);
}

export function getSystemInstructionSync(params: SystemPromptParams = {}): string {
  if (!cachedPromptTemplate) {
    throw new Error('System prompt not cached. Call cacheSystemPrompt() first.');
  }

  const {
    fullArtifactContext = '',
    currentDate = new Date().toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  } = params;

  return cachedPromptTemplate
    .replace(/\$\{new Date\(\)\.toLocaleDateString\([^)]+\)\}/g, currentDate)
    .replace(/\$\{fullArtifactContext\}/g, fullArtifactContext);
}
