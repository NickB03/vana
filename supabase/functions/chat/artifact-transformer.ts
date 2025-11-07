/**
 * Post-generation artifact transformer
 * Automatically fixes common import issues in AI-generated code
 */

export interface TransformResult {
  transformedContent: string;
  changes: string[];
  hadIssues: boolean;
}

/**
 * Transform artifact content to fix invalid imports
 */
export function transformArtifactCode(content: string): TransformResult {
  const changes: string[] = [];
  let transformedContent = content;
  let hadIssues = false;

  // 1. Fix shadcn/ui Button imports
  if (/import\s+\{\s*Button\s*\}\s+from\s+['"]@\/components\/ui\/button['"]/g.test(transformedContent)) {
    transformedContent = transformedContent.replace(
      /import\s+\{\s*Button\s*\}\s+from\s+['"]@\/components\/ui\/button['"]/g,
      '// Button: Use Tailwind classes instead of shadcn/ui import'
    );
    changes.push('Removed Button import - use Tailwind: <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">');
    hadIssues = true;
  }

  // 2. Fix shadcn/ui Card imports
  if (/import\s+\{\s*([^}]+)\}\s+from\s+['"]@\/components\/ui\/card['"]/g.test(transformedContent)) {
    transformedContent = transformedContent.replace(
      /import\s+\{\s*([^}]+)\}\s+from\s+['"]@\/components\/ui\/card['"]/g,
      '// Card components: Use <div> with Tailwind classes'
    );
    changes.push('Removed Card imports - use: <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">');
    hadIssues = true;
  }

  // 3. Fix shadcn/ui Input imports
  if (/import\s+\{\s*Input\s*\}\s+from\s+['"]@\/components\/ui\/input['"]/g.test(transformedContent)) {
    transformedContent = transformedContent.replace(
      /import\s+\{\s*Input\s*\}\s+from\s+['"]@\/components\/ui\/input['"]/g,
      '// Input: Use native input with Tailwind'
    );
    changes.push('Removed Input import - use: <input className="w-full px-3 py-2 border rounded-lg">');
    hadIssues = true;
  }

  // 4. Fix shadcn/ui Label imports
  if (/import\s+\{\s*Label\s*\}\s+from\s+['"]@\/components\/ui\/label['"]/g.test(transformedContent)) {
    transformedContent = transformedContent.replace(
      /import\s+\{\s*Label\s*\}\s+from\s+['"]@\/components\/ui\/label['"]/g,
      '// Label: Use native label with Tailwind'
    );
    changes.push('Removed Label import - use: <label className="text-sm font-medium">');
    hadIssues = true;
  }

  // 5. Fix shadcn/ui Badge imports
  if (/import\s+\{\s*Badge\s*\}\s+from\s+['"]@\/components\/ui\/badge['"]/g.test(transformedContent)) {
    transformedContent = transformedContent.replace(
      /import\s+\{\s*Badge\s*\}\s+from\s+['"]@\/components\/ui\/badge['"]/g,
      '// Badge: Use span with Tailwind'
    );
    changes.push('Removed Badge import - use: <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">');
    hadIssues = true;
  }

  // 6. Fix shadcn/ui Dialog imports
  if (/import\s+\{\s*([^}]+)\}\s+from\s+['"]@\/components\/ui\/dialog['"]/g.test(transformedContent)) {
    transformedContent = transformedContent.replace(
      /import\s+\{\s*([^}]+)\}\s+from\s+['"]@\/components\/ui\/dialog['"]/g,
      'import * as Dialog from \'@radix-ui/react-dialog\''
    );
    changes.push('Replaced Dialog imports with Radix UI: import * as Dialog from \'@radix-ui/react-dialog\'');
    hadIssues = true;
  }

  // 7. Fix shadcn/ui Tabs imports
  if (/import\s+\{\s*([^}]+)\}\s+from\s+['"]@\/components\/ui\/tabs['"]/g.test(transformedContent)) {
    transformedContent = transformedContent.replace(
      /import\s+\{\s*([^}]+)\}\s+from\s+['"]@\/components\/ui\/tabs['"]/g,
      'import * as Tabs from \'@radix-ui/react-tabs\''
    );
    changes.push('Replaced Tabs imports with Radix UI: import * as Tabs from \'@radix-ui/react-tabs\'');
    hadIssues = true;
  }

  // 8. Fix shadcn/ui Switch imports
  if (/import\s+\{\s*Switch\s*\}\s+from\s+['"]@\/components\/ui\/switch['"]/g.test(transformedContent)) {
    transformedContent = transformedContent.replace(
      /import\s+\{\s*Switch\s*\}\s+from\s+['"]@\/components\/ui\/switch['"]/g,
      'import * as Switch from \'@radix-ui/react-switch\''
    );
    changes.push('Replaced Switch import with Radix UI: import * as Switch from \'@radix-ui/react-switch\'');
    hadIssues = true;
  }

  // 9. Fix @/lib/utils imports (cn function)
  if (/import\s+\{\s*cn\s*\}\s+from\s+['"]@\/lib\/utils['"]/g.test(transformedContent)) {
    transformedContent = transformedContent.replace(
      /import\s+\{\s*cn\s*\}\s+from\s+['"]@\/lib\/utils['"]/g,
      '// cn() not available - use template literals for conditional classes'
    );
    changes.push('Removed cn() import - use template literals or clsx library');
    hadIssues = true;
  }

  // 10. Fix any remaining @/ imports
  const localImports = /import\s+.*from\s+['"]@\/[^'"]+['"]/g;
  const remainingImports = transformedContent.match(localImports);
  if (remainingImports) {
    remainingImports.forEach(imp => {
      transformedContent = transformedContent.replace(
        imp,
        `// REMOVED INVALID IMPORT: ${imp.trim()}`
      );
      changes.push(`Removed invalid local import: ${imp.trim()}`);
      hadIssues = true;
    });
  }

  // 10.5. Remove ALL React imports (hooks, components, etc. - auto-injected by artifact environment)
  // Matches all forms:
  // - import { useState, useEffect } from "react"
  // - import React, { useState } from "react"
  // - import { Component, useState } from "react"
  // - import { useContext, useMemo } from 'react'
  if (/import\s+.*from\s+['"]react['"];?/g.test(transformedContent)) {
    transformedContent = transformedContent.replace(
      /import\s+.*from\s+['"]react['"];?\s*/g,
      '// React and hooks auto-injected by artifact environment\n'
    );
    changes.push('Removed React imports - already available globally');
    hadIssues = true;
  }

  // 11. Replace component usage with Tailwind equivalents
  if (hadIssues) {
    // Replace <Button> with <button className="">
    transformedContent = transformedContent.replace(
      /<Button\s+([^>]*)>/g,
      (match, attrs) => {
        const hasVariant = /variant=["']([^"']+)["']/.test(attrs);
        const variant = hasVariant ? attrs.match(/variant=["']([^"']+)["']/)[1] : 'default';

        let baseClasses = 'px-4 py-2 rounded-lg font-semibold transition';
        if (variant === 'default' || variant === 'primary') {
          baseClasses += ' bg-blue-600 text-white hover:bg-blue-700';
        } else if (variant === 'outline') {
          baseClasses += ' border border-gray-300 hover:bg-gray-100';
        } else if (variant === 'ghost') {
          baseClasses += ' hover:bg-gray-100';
        }

        const cleanAttrs = attrs
          .replace(/variant=["'][^"']+["']/g, '')
          .replace(/size=["'][^"']+["']/g, '')
          .trim();

        return `<button className="${baseClasses}" ${cleanAttrs}>`;
      }
    );
    transformedContent = transformedContent.replace(/<\/Button>/g, '</button>');

    // Replace <Card> with <div>
    transformedContent = transformedContent.replace(
      /<Card([^>]*)>/g,
      '<div className="bg-white dark:bg-gray-800 rounded-lg shadow$1">'
    );
    transformedContent = transformedContent.replace(/<\/Card>/g, '</div>');

    // Replace <CardHeader> with <div>
    transformedContent = transformedContent.replace(
      /<CardHeader([^>]*)>/g,
      '<div className="p-6$1">'
    );
    transformedContent = transformedContent.replace(/<\/CardHeader>/g, '</div>');

    // Replace <CardTitle> with <h3>
    transformedContent = transformedContent.replace(
      /<CardTitle([^>]*)>/g,
      '<h3 className="text-lg font-semibold$1">'
    );
    transformedContent = transformedContent.replace(/<\/CardTitle>/g, '</h3>');

    // Replace <CardContent> with <div>
    transformedContent = transformedContent.replace(
      /<CardContent([^>]*)>/g,
      '<div className="p-6$1">'
    );
    transformedContent = transformedContent.replace(/<\/CardContent>/g, '</div>');

    // Replace <Input> with <input>
    transformedContent = transformedContent.replace(
      /<Input\s+/g,
      '<input className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white" '
    );

    // Replace <Label> with <label>
    transformedContent = transformedContent.replace(
      /<Label\s+/g,
      '<label className="text-sm font-medium text-gray-700 dark:text-gray-300" '
    );

    // Replace <Badge> with <span>
    transformedContent = transformedContent.replace(
      /<Badge([^>]*)>/g,
      '<span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 rounded-full text-xs$1">'
    );
    transformedContent = transformedContent.replace(/<\/Badge>/g, '</span>');
  }

  // 12. Fix inline event handlers (onclick="..." → onClick={...})
  // Matches ANY quoted event handler with length limit to prevent ReDoS
  const inlineEventPattern = /\s(on\w+)\s*=\s*["']([^"'\r\n]{0,1000})["']/gi;
  if (inlineEventPattern.test(transformedContent)) {
    transformedContent = transformedContent.replace(
      /\s(on\w+)\s*=\s*["']([^"'\r\n]{0,1000})["']/gi,
      (match, eventName, handlerCode) => {
        // Normalize to React camelCase (onclick → onClick, onchange → onChange)
        const reactEventName = 'on' + eventName.charAt(2).toUpperCase() + eventName.slice(3);

        // Remove parentheses if present (onClick="handleClick()" → onClick={handleClick})
        const handlerFunction = handlerCode.replace(/\(\)$/, '').trim();

        changes.push(`Fixed inline handler: ${eventName} → ${reactEventName}`);
        hadIssues = true;

        return ` ${reactEventName}={${handlerFunction}}`;
      }
    );
  }

  return {
    transformedContent,
    changes,
    hadIssues
  };
}
