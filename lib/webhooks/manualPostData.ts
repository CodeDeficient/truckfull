import type { PostData } from '@/lib/services/postProcessor';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isOptionalString(value: Record<string, unknown>, key: string): boolean {
  return value[key] === undefined || value[key] === null || typeof value[key] === 'string';
}

function isValidAttachment(value: unknown): boolean {
  if (!isRecord(value)
    || (value.url !== undefined && value.url !== null && typeof value.url !== 'string')) return false;
  if (value.media === undefined || value.media === null) return true;
  if (!isRecord(value.media)) return false;
  if (value.media.image === undefined || value.media.image === null) return true;
  return isRecord(value.media.image)
    && (value.media.image.src === undefined
      || value.media.image.src === null
      || typeof value.media.image.src === 'string');
}

function isValidAttachments(value: unknown): boolean {
  if (value === undefined || value === null) return true;
  if (!isRecord(value)) return false;
  if (value.data === undefined || value.data === null) return true;
  return Array.isArray(value.data) && value.data.every((attachment) => isValidAttachment(attachment));
}

export function normalizeManualPostData(value: unknown, facebookPostId: string): PostData | null {
  if (!isRecord(value)) return null;

  const suppliedPostId = value.post_id;
  if (suppliedPostId !== undefined
    && (typeof suppliedPostId !== 'string' || suppliedPostId !== facebookPostId)) {
    return null;
  }
  if (!isOptionalString(value, 'message')
    || !isOptionalString(value, 'full_picture')
    || !isValidAttachments(value.attachments)) return null;

  const normalized: PostData = { ...value, post_id: facebookPostId };
  if (value.message === null) delete normalized.message;
  if (value.full_picture === null) delete normalized.full_picture;
  if (value.attachments === null) delete normalized.attachments;
  return normalized;
}

export function parsePersistedPostData(rawPayload: unknown): Record<string, unknown> | null {
  if (typeof rawPayload !== 'string') return isRecord(rawPayload) ? rawPayload : null;

  try {
    const parsed: unknown = JSON.parse(rawPayload);
    return isRecord(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function buildRecoveredPostData(
  facebookPostId: string,
  payload: Record<string, unknown> | null,
  message: string | null,
  rawText: string | null,
  createdTime: string,
): PostData {
  const recoveredPayload = payload ? { ...payload } : {};
  const payloadMessage = typeof payload?.message === 'string' ? payload.message : undefined;
  return {
    ...recoveredPayload,
    post_id: facebookPostId,
    message: message || rawText || payloadMessage,
    created_time: createdTime,
  };
}

export function applyPersistedCreatedTime(
  postData: PostData,
  persistedCreatedTime: string | null,
): PostData {
  if (!persistedCreatedTime) return postData;
  return { ...postData, created_time: persistedCreatedTime };
}

export interface PersistedPostRow {
  id: string;
  truck_id: string;
  facebook_post_id: string;
  message: string | null;
  raw_text: string | null;
  created_time: string;
  raw_payload: unknown;
  status: string;
}

/**
 * Single reconstruction contract for replaying a persisted post into
 * processable input (I-4). All replay paths — manual reprocessing and
 * stuck-post recovery — must go through this function so no path can
 * reintroduce unvalidated or untrusted payload data.
 *
 * - identity and truck binding come from the persisted row, never the payload
 * - created_time always comes from the persisted canonical column
 * - message prefers the persisted text fields; the payload is only consulted
 *   as a last resort and only for validated string fields
 */
export function reconstructPostData(
  row: Pick<PersistedPostRow, 'facebook_post_id' | 'message' | 'raw_text' | 'created_time' | 'raw_payload'>,
  payload?: unknown,
): PostData {
  const rawPayload = payload === undefined ? row.raw_payload : payload;
  const parsedPayload = parsePersistedPostData(rawPayload);
  const normalized = parsedPayload ? normalizeManualPostData(parsedPayload, row.facebook_post_id) : null;
  const payloadMessage = typeof normalized?.message === 'string' ? normalized.message : undefined;

  return {
    post_id: row.facebook_post_id,
    ...(row.message || row.raw_text || payloadMessage
      ? { message: row.message || row.raw_text || payloadMessage }
      : {}),
    ...(normalized?.full_picture ? { full_picture: normalized.full_picture } : {}),
    ...(normalized?.attachments === undefined ? {} : { attachments: normalized.attachments }),
    created_time: row.created_time,
  };
}
