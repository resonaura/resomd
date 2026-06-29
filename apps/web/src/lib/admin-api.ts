import { apiFetch } from '@/lib/api';

export interface AdminUser {
  id: string;
  email: string;
  displayName: string | null;
  avatarUrl: string | null;
  role: 'user' | 'admin';
  createdAt: string;
}

export interface AdminDocument {
  id: string;
  name: string;
  folderId: string | null;
  updatedAt: string;
  createdAt: string;
  owner: { id: string; email: string };
}

export function adminListUsers() {
  return apiFetch<AdminUser[]>('/admin/users');
}

export function adminUpdateUser(
  id: string,
  input: { displayName?: string; role?: 'user' | 'admin' }
) {
  return apiFetch<AdminUser>(`/admin/users/${id}`, {
    method: 'PUT',
    body: JSON.stringify(input),
  });
}

export function adminDeleteUser(id: string) {
  return apiFetch<void>(`/admin/users/${id}`, { method: 'DELETE' });
}

export function adminListDocuments() {
  return apiFetch<AdminDocument[]>('/admin/documents');
}

export function adminDeleteDocument(id: string) {
  return apiFetch<void>(`/admin/documents/${id}`, { method: 'DELETE' });
}
