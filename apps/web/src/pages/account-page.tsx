import { Loader2Icon, TrashIcon } from 'lucide-react';
import * as React from 'react';
import { useNavigate } from 'react-router';
import { toast } from 'sonner';

import { PageShell } from '@/components/page-shell';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ApiError } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';

export function AccountPage() {
  const { user, isLoading, updateProfile, deleteAccount, logout } = useAuth();
  const navigate = useNavigate();
  const [isSaving, setIsSaving] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState(false);

  React.useEffect(() => {
    if (!isLoading && !user) {
      navigate('/auth');
    }
  }, [isLoading, user, navigate]);

  if (!user) {
    return null;
  }

  const handleSave = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const displayName = String(form.get('displayName') ?? '').trim();
    const avatarUrl = String(form.get('avatarUrl') ?? '').trim();
    setIsSaving(true);
    try {
      await updateProfile({
        displayName: displayName || undefined,
        avatarUrl: avatarUrl || undefined,
      });
      toast.success('Profile updated');
    } catch (error) {
      toast.error(
        error instanceof ApiError ? error.message : 'Failed to update profile'
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await deleteAccount();
      toast.success('Account deleted');
      navigate('/');
    } catch (error) {
      toast.error(
        error instanceof ApiError ? error.message : 'Failed to delete account'
      );
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <PageShell title="Account" maxWidth="max-w-lg">
      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <CardDescription>{user.email}</CardDescription>
        </CardHeader>
        <form onSubmit={handleSave}>
          <CardContent className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <Avatar size="lg">
                <AvatarImage src={user.avatarUrl ?? undefined} />
                <AvatarFallback>
                  {(user.displayName || user.email)[0]?.toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="text-muted-foreground text-sm">
                {user.role === 'admin' ? 'Administrator' : 'Member'}
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="displayName">Display name</Label>
              <Input
                id="displayName"
                name="displayName"
                defaultValue={user.displayName ?? ''}
                maxLength={120}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="avatarUrl">Avatar URL</Label>
              <Input
                id="avatarUrl"
                name="avatarUrl"
                type="url"
                defaultValue={user.avatarUrl ?? ''}
                placeholder="https://…"
              />
            </div>
          </CardContent>
          <CardFooter className="justify-between">
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                logout();
                navigate('/');
              }}
            >
              Log out
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving && <Loader2Icon className="size-4 animate-spin" />}
              Save changes
            </Button>
          </CardFooter>
        </form>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Danger zone</CardTitle>
          <CardDescription>
            Deleting your account permanently removes your documents and
            folders. This cannot be undone.
          </CardDescription>
        </CardHeader>
        <CardFooter className="justify-end">
          <Dialog>
            <DialogTrigger render={<Button variant="destructive" />}>
              <TrashIcon className="size-4" />
              Delete account
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Delete your account?</DialogTitle>
                <DialogDescription>
                  This permanently deletes your account, documents, and folders.
                  This cannot be undone.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <DialogClose render={<Button variant="outline" />}>
                  Cancel
                </DialogClose>
                <Button
                  variant="destructive"
                  onClick={handleDelete}
                  disabled={isDeleting}
                >
                  {isDeleting && (
                    <Loader2Icon className="size-4 animate-spin" />
                  )}
                  Delete permanently
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardFooter>
      </Card>
    </PageShell>
  );
}

export default AccountPage;
