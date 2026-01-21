/**
 * Artifact Saver
 *
 * Saves artifacts to the artifact_versions table for proper persistence.
 * This replaces the XML embedding approach with structured database storage.
 *
 * Key features:
 * - Generates stable artifact IDs based on content hash
 * - Supports versioning (multiple versions of same artifact)
 * - Links artifacts to messages via message_id
 */

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.75.1";

/**
 * Artifact data to save
 */
export interface ArtifactToSave {
  /** Session ID this artifact belongs to (REQUIRED for two-phase save) */
  sessionId: string;
  /** Message ID this artifact belongs to (optional during tool execution, required after) */
  messageId?: string;
  /** Artifact type: react, html, svg, code, mermaid, markdown */
  artifactType: string;
  /** User-friendly title */
  artifactTitle: string;
  /** The artifact source code/content */
  artifactContent: string;
  /** Optional language for code artifacts */
  artifactLanguage?: string;
}

/**
 * Result of saving an artifact
 */
export interface SaveArtifactResult {
  success: boolean;
  /** Stable artifact ID (for referencing across versions) */
  artifactId?: string;
  /** Database record ID */
  id?: string;
  /** Version number */
  versionNumber?: number;
  /** Error message if save failed */
  error?: string;
}

/**
 * Generate a stable artifact ID based on content hash
 * Uses first 16 chars of SHA-256 hash for URL-safe IDs
 */
async function generateArtifactId(content: string, type: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(`${type}:${content}`);

  try {
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    // Use first 16 chars for compact but unique ID
    return `art-${hashHex.substring(0, 16)}`;
  } catch (error) {
    // Fallback to timestamp-based ID if crypto API fails
    console.warn('[artifact-saver] Crypto hash failed, using fallback ID:', error);
    return `art-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  }
}

/**
 * Generate content hash for deduplication
 */
async function generateContentHash(content: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(content);

  try {
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  } catch (error) {
    // Fallback
    console.warn('[artifact-saver] Content hash failed, using fallback:', error);
    return `hash-${Date.now()}-${content.length}`;
  }
}

/**
 * Save an artifact to the artifact_versions table
 *
 * @param supabase - Supabase client (service role recommended for RLS bypass)
 * @param artifact - Artifact data to save
 * @param requestId - Request ID for logging
 * @returns Save result with artifact ID
 */
export async function saveArtifact(
  supabase: SupabaseClient,
  artifact: ArtifactToSave,
  requestId: string
): Promise<SaveArtifactResult> {
  const startTime = Date.now();

  try {
    // Generate stable artifact ID
    const artifactId = await generateArtifactId(
      artifact.artifactContent,
      artifact.artifactType
    );

    // Generate content hash for deduplication
    const contentHash = await generateContentHash(artifact.artifactContent);

    // Check for existing versions of this artifact
    const { data: existingVersions, error: queryError } = await supabase
      .from('artifact_versions')
      .select('version_number')
      .eq('artifact_id', artifactId)
      .order('version_number', { ascending: false })
      .limit(1);

    if (queryError) {
      console.error(`[${requestId}] Failed to query existing artifact versions:`, queryError);
      // Continue with version 1 as fallback
    }

    // Determine version number
    const versionNumber = existingVersions && existingVersions.length > 0
      ? existingVersions[0].version_number + 1
      : 1;

    // Check for duplicate content (same hash = same content)
    if (existingVersions && existingVersions.length > 0) {
      const { data: duplicateCheck } = await supabase
        .from('artifact_versions')
        .select('id, version_number')
        .eq('artifact_id', artifactId)
        .eq('content_hash', contentHash)
        .limit(1);

      if (duplicateCheck && duplicateCheck.length > 0) {
        console.log(
          `[${requestId}] Artifact content unchanged, skipping duplicate save ` +
          `(artifact_id=${artifactId}, version=${duplicateCheck[0].version_number})`
        );
        return {
          success: true,
          artifactId,
          id: duplicateCheck[0].id,
          versionNumber: duplicateCheck[0].version_number,
        };
      }
    }

    // Insert new version with session_id (two-phase save pattern)
    const { data, error } = await supabase
      .from('artifact_versions')
      .insert({
        session_id: artifact.sessionId, // REQUIRED for two-phase save
        message_id: artifact.messageId || null, // Optional during tool execution
        artifact_id: artifactId,
        version_number: versionNumber,
        artifact_type: artifact.artifactType,
        artifact_title: artifact.artifactTitle,
        artifact_content: artifact.artifactContent,
        artifact_language: artifact.artifactLanguage || null,
        content_hash: contentHash,
      })
      .select('id')
      .single();

    if (error) {
      console.error(`[${requestId}] Failed to save artifact:`, error);
      return {
        success: false,
        error: `Database error: ${error.message}`,
      };
    }

    const latencyMs = Date.now() - startTime;
    console.log(
      `[${requestId}] ✅ Artifact saved: id=${data.id}, artifact_id=${artifactId}, ` +
      `version=${versionNumber}, type=${artifact.artifactType}, latency=${latencyMs}ms`
    );

    return {
      success: true,
      artifactId,
      id: data.id,
      versionNumber,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`[${requestId}] Artifact save error:`, errorMessage);

    return {
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * Get artifacts for a message
 *
 * @param supabase - Supabase client
 * @param messageId - Message ID to get artifacts for
 * @returns Array of artifacts
 */
export async function getArtifactsForMessage(
  supabase: SupabaseClient,
  messageId: string
): Promise<Array<{
  id: string;
  artifactId: string;
  type: string;
  title: string;
  content: string;
  language?: string;
  versionNumber: number;
}>> {
  const { data, error } = await supabase
    .from('artifact_versions')
    .select('*')
    .eq('message_id', messageId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Failed to get artifacts for message:', error);
    return [];
  }

  return (data || []).map(row => ({
    id: row.id,
    artifactId: row.artifact_id,
    type: row.artifact_type,
    title: row.artifact_title,
    content: row.artifact_content,
    language: row.artifact_language,
    versionNumber: row.version_number,
  }));
}
