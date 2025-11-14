/**
 * Pre-generation validation to catch common artifact mistakes
 * Helps prevent AI from generating invalid artifacts
 */

export interface ValidationResult {
  isValid: boolean;
  warnings: string[];
  suggestions: string[];
  shouldBlock: boolean;
}

/**
 * Validates user request for potential artifact import issues
 */
export function validateArtifactRequest(userMessage: string): ValidationResult {
  const warnings: string[] = [];
  const suggestions: string[] = [];
  const shouldBlock = false;

  const lowerMessage = userMessage.toLowerCase();

  // Check if user explicitly mentions shadcn/ui
  if (/shadcn|shadcn\/ui/.test(lowerMessage)) {
    warnings.push("User mentioned shadcn/ui components which cannot be used in artifacts");
    suggestions.push("Guide them to use Radix UI primitives + Tailwind CSS instead");
    suggestions.push("Radix UI is the same foundation that powers shadcn/ui");
  }

  // Check for local import path patterns
  const localImportPattern = /@\/components\/ui|@\/lib|@\/utils|@\/hooks|from\s+['"]@\//gi;
  if (localImportPattern.test(userMessage)) {
    warnings.push("User message includes local import paths (@/) which are not available in artifacts");
    suggestions.push("Replace any @/ imports with CDN-loaded equivalents");
    suggestions.push("Use Radix UI primitives instead of shadcn/ui components");
  }

  // Check for specific shadcn component mentions
  const shadcnComponents = ['button', 'card', 'input', 'label', 'dialog', 'tabs', 'form', 'select', 'switch', 'slider'];
  const mentionedComponents = shadcnComponents.filter(comp =>
    new RegExp(`\\b${comp}\\b`, 'i').test(lowerMessage) && lowerMessage.includes('component')
  );

  if (mentionedComponents.length > 0) {
    warnings.push(`User mentioned UI components: ${mentionedComponents.join(', ')}`);
    suggestions.push("If building UI, ensure you use Radix UI primitives + Tailwind, not shadcn/ui");
  }

  return {
    isValid: warnings.length === 0,
    warnings,
    suggestions,
    shouldBlock // Don't block, just warn
  };
}

/**
 * Generates enhanced guidance based on validation results
 */
export function generateGuidanceFromValidation(validation: ValidationResult): string {
  if (validation.isValid) {
    return "";
  }

  let guidance = "\n\n⚠️ IMPORTANT ARTIFACT CONSTRAINTS:\n";

  if (validation.warnings.length > 0) {
    guidance += "\nDetected potential issues:\n";
    validation.warnings.forEach(warning => {
      guidance += `- ${warning}\n`;
    });
  }

  if (validation.suggestions.length > 0) {
    guidance += "\nREQUIRED APPROACH:\n";
    validation.suggestions.forEach(suggestion => {
      guidance += `- ${suggestion}\n`;
    });
  }

  guidance += "\n🚨 REMEMBER: Artifacts CANNOT import from @/components/ui/* or @/lib/* or @/utils/*\n";
  guidance += "✅ USE: Radix UI primitives (import * as Dialog from '@radix-ui/react-dialog') + Tailwind CSS\n";

  return guidance;
}
