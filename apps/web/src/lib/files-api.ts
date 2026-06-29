import { apiFetch } from '@/lib/api';

export interface FileTreeFolder {
  id: string;
  type: 'folder';
  name: string;
  parentId: string | null;
  children: FileTreeNode[];
}

export interface FileTreeDocument {
  id: string;
  type: 'document';
  name: string;
  folderId: string | null;
  updatedAt: string;
}

export type FileTreeNode = FileTreeFolder | FileTreeDocument;

export interface DocumentDetail {
  id: string;
  name: string;
  content: string;
  folderId: string | null;
  updatedAt: string;
}

export function getFileTree() {
  return apiFetch<FileTreeNode[]>('/files/tree');
}

export function createFolder(input: { name: string; parentId?: string }) {
  return apiFetch<FileTreeFolder>('/files/folder', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function renameOrMoveFolder(
  id: string,
  input: { name?: string; parentId?: string | null }
) {
  return apiFetch<FileTreeFolder>(`/files/folder/${id}`, {
    method: 'PUT',
    body: JSON.stringify(input),
  });
}

export function deleteFolder(id: string) {
  return apiFetch<void>(`/files/folder/${id}`, { method: 'DELETE' });
}

export function createDocument(input: {
  name: string;
  folderId?: string;
  content?: string;
}) {
  return apiFetch<DocumentDetail>('/files/document', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function getDocument(id: string) {
  return apiFetch<DocumentDetail>(`/files/document/${id}`);
}

export function updateDocument(
  id: string,
  input: { name?: string; folderId?: string | null; content?: string }
) {
  return apiFetch<DocumentDetail>(`/files/document/${id}`, {
    method: 'PUT',
    body: JSON.stringify(input),
  });
}

export function deleteDocument(id: string) {
  return apiFetch<void>(`/files/document/${id}`, { method: 'DELETE' });
}
