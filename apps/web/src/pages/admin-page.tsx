import { Loader2Icon, ShieldIcon, TrashIcon } from 'lucide-react';
import * as React from 'react';
import { useNavigate } from 'react-router';
import { toast } from 'sonner';

import { PageShell } from '@/components/page-shell';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ApiError } from '@/lib/api';
import {
  adminDeleteDocument,
  adminDeleteUser,
  adminListDocuments,
  adminListUsers,
  adminUpdateUser,
  type AdminDocument,
  type AdminUser,
} from '@/lib/admin-api';
import { useAuth } from '@/lib/auth-context';
import { useDocumentTitle } from '@/lib/use-document-title';

type PendingUserDelete = { id: string; email: string };
type PendingDocumentDelete = { id: string; name: string };

export function AdminPage() {
  useDocumentTitle('Admin');
  const { user, isLoading: isAuthLoading } = useAuth();
  const navigate = useNavigate();

  const [users, setUsers] = React.useState<AdminUser[] | null>(null);
  const [documents, setDocuments] = React.useState<AdminDocument[] | null>(
    null
  );
  const [isBusy, setIsBusy] = React.useState(false);
  const [pendingUserDelete, setPendingUserDelete] =
    React.useState<PendingUserDelete | null>(null);
  const [pendingDocumentDelete, setPendingDocumentDelete] =
    React.useState<PendingDocumentDelete | null>(null);

  const loadUsers = React.useCallback(() => {
    return adminListUsers()
      .then(setUsers)
      .catch(error => {
        toast.error(
          error instanceof ApiError ? error.message : 'Failed to load users'
        );
      });
  }, []);

  const loadDocuments = React.useCallback(() => {
    return adminListDocuments()
      .then(setDocuments)
      .catch(error => {
        toast.error(
          error instanceof ApiError ? error.message : 'Failed to load documents'
        );
      });
  }, []);

  React.useEffect(() => {
    if (isAuthLoading) return;
    if (!user || user.role !== 'admin') {
      navigate('/');
      return;
    }
    void loadUsers();
    void loadDocuments();
  }, [isAuthLoading, user, navigate, loadUsers, loadDocuments]);

  if (!user || user.role !== 'admin') {
    return null;
  }

  const handleRoleChange = async (
    target: AdminUser,
    role: 'user' | 'admin'
  ) => {
    try {
      await adminUpdateUser(target.id, { role });
      toast.success(`${target.email} is now ${role}`);
      await loadUsers();
    } catch (error) {
      toast.error(
        error instanceof ApiError ? error.message : 'Failed to update role'
      );
    }
  };

  const handleConfirmUserDelete = async () => {
    if (!pendingUserDelete) return;
    setIsBusy(true);
    try {
      await adminDeleteUser(pendingUserDelete.id);
      toast.success(`Deleted ${pendingUserDelete.email}`);
      setPendingUserDelete(null);
      await loadUsers();
    } catch (error) {
      toast.error(
        error instanceof ApiError ? error.message : 'Failed to delete user'
      );
    } finally {
      setIsBusy(false);
    }
  };

  const handleConfirmDocumentDelete = async () => {
    if (!pendingDocumentDelete) return;
    setIsBusy(true);
    try {
      await adminDeleteDocument(pendingDocumentDelete.id);
      toast.success(`Deleted "${pendingDocumentDelete.name}"`);
      setPendingDocumentDelete(null);
      await loadDocuments();
    } catch (error) {
      toast.error(
        error instanceof ApiError ? error.message : 'Failed to delete document'
      );
    } finally {
      setIsBusy(false);
    }
  };

  return (
    <PageShell title="Admin" maxWidth="max-w-4xl">
      <div className="mb-4 flex items-center gap-2">
        <ShieldIcon className="text-muted-foreground size-4" />
        <p className="text-muted-foreground text-sm">
          Manage users and documents across the whole app.
        </p>
      </div>

      <Tabs defaultValue="users">
        <TabsList className="mb-4">
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
        </TabsList>

        <TabsContent value="users">
          {users === null ? (
            <div className="flex justify-center py-10">
              <Loader2Icon className="text-muted-foreground size-5 animate-spin" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead className="hidden sm:table-cell">
                    Display name
                  </TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead className="hidden sm:table-cell">Joined</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map(target => (
                  <TableRow key={target.id}>
                    <TableCell className="max-w-32 truncate font-medium sm:max-w-none">
                      {target.email}
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      {target.displayName ?? '—'}
                    </TableCell>
                    <TableCell>
                      <Select
                        value={target.role}
                        onValueChange={value =>
                          handleRoleChange(target, value as 'user' | 'admin')
                        }
                      >
                        <SelectTrigger size="sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="user">user</SelectItem>
                          <SelectItem value="admin">admin</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      {new Date(target.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        className="text-destructive"
                        disabled={target.id === user.id}
                        onClick={() =>
                          setPendingUserDelete({
                            id: target.id,
                            email: target.email,
                          })
                        }
                      >
                        <TrashIcon className="size-4" />
                        <span className="sr-only">Delete user</span>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </TabsContent>

        <TabsContent value="documents">
          {documents === null ? (
            <div className="flex justify-center py-10">
              <Loader2Icon className="text-muted-foreground size-5 animate-spin" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead className="hidden sm:table-cell">Owner</TableHead>
                  <TableHead className="hidden sm:table-cell">
                    Updated
                  </TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {documents.map(document => (
                  <TableRow key={document.id}>
                    <TableCell className="max-w-40 truncate font-medium sm:max-w-none">
                      {document.name}
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <Badge variant="secondary">{document.owner.email}</Badge>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      {new Date(document.updatedAt).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        className="text-destructive"
                        onClick={() =>
                          setPendingDocumentDelete({
                            id: document.id,
                            name: document.name,
                          })
                        }
                      >
                        <TrashIcon className="size-4" />
                        <span className="sr-only">Delete document</span>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </TabsContent>
      </Tabs>

      <Dialog
        open={pendingUserDelete !== null}
        onOpenChange={open => !open && setPendingUserDelete(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete {pendingUserDelete?.email}?</DialogTitle>
            <DialogDescription>
              This permanently deletes the user along with all of their
              documents and folders.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>
              Cancel
            </DialogClose>
            <Button
              variant="destructive"
              onClick={handleConfirmUserDelete}
              disabled={isBusy}
            >
              {isBusy && <Loader2Icon className="size-4 animate-spin" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={pendingDocumentDelete !== null}
        onOpenChange={open => !open && setPendingDocumentDelete(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete "{pendingDocumentDelete?.name}"?</DialogTitle>
            <DialogDescription>
              This permanently deletes the document for its owner.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>
              Cancel
            </DialogClose>
            <Button
              variant="destructive"
              onClick={handleConfirmDocumentDelete}
              disabled={isBusy}
            >
              {isBusy && <Loader2Icon className="size-4 animate-spin" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageShell>
  );
}

export default AdminPage;
