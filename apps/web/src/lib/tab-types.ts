import type { SyncStatus } from '@/lib/sync-status';

export interface Tab {
  /** Unique tab ID: 'scratch' for the untitled buffer, or the cloud document ID. */
  id: string;
  /** Display name shown in the tab and document title. */
  name: string;
  /** Current editor content for this tab. */
  content: string;
  /** True when there are unsaved changes (cloud documents only). */
  isDirty: boolean;
  /** Cloud sync status for this tab. */
  syncStatus: SyncStatus;
  /** Cloud document ID, or null for the local untitled buffer. */
  documentId: string | null;
  /**
   * VS Code-style "preview" tab. Newly opened files start as preview (shown
   * in italic) and get pinned (isPreview = false) once edited. Opening
   * another file replaces the active preview tab instead of stacking.
   */
  isPreview: boolean;
}

/** The fixed ID for the always-present scratch / untitled tab. */
export const SCRATCH_TAB_ID = 'scratch';
