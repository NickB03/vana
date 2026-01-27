/**
 * Skills Definitions Index
 *
 * Imports all skill definitions to trigger self-registration,
 * and re-exports for direct access.
 */

// Import all skills to trigger registration via registerSkill()
import './web-search-skill.ts';
import './code-assistant-skill.ts';
import './data-viz-skill.ts';

// Re-export for direct access
export { WEB_SEARCH_SKILL } from './web-search-skill.ts';
export { CODE_ASSISTANT_SKILL } from './code-assistant-skill.ts';
export { DATA_VIZ_SKILL } from './data-viz-skill.ts';
