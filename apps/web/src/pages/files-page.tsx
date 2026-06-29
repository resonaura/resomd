import {
  FileTextIcon,
  FolderIcon,
  FolderPlusIcon,
  Loader2Icon,
  MoreVerticalIcon,
  PencilIcon,
  PlusIcon,
  SearchIcon,
  TrashIcon,
} from 'lucide-react';
import * as React from 'react';
import { Link, useNavigate } from 'react-router';
import { toast } from 'sonner';

import { PageShell } from '@/components/page-shell';
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ApiError } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import {
  createDocument,
  createFolder,
  deleteDocument,
  deleteFolder,
  getFileTree,
  renameOrMoveFolder,
  updateDocument,
  type FileTreeDocument,
  type FileTreeFolder,
  type FileTreeNode,
} from '@/lib/files-api';

interface FlatFolder {
  id: string;
  name: string;
  parentId: string | null;
  depth: number;
}

function flattenFolders(
  nodes: FileTreeNode[],
  depth = 0,
  parentId: string | null = null
): FlatFolder[] {
  const result: FlatFolder[] = [];
  for (const node of nodes) {
    if (node.type !== 'folder') continue;
    result.push({ id: node.id, name: node.name, parentId, depth });
    result.push(...flattenFolders(node.children, depth + 1, node.id));
  }
  return result;
}

function findNode(nodes: FileTreeNode[], id: string): FileTreeNode | null {
  for (const node of nodes) {
    if (node.id === id) return node;
    if (node.type === 'folder') {
      const found = findNode(node.children, id);
      if (found) return found;
    }
  }
  return null;
}

function flattenAll(
  nodes: FileTreeNode[]
): { node: FileTreeNode; path: string }[] {
  const result: { node: FileTreeNode; path: string }[] = [];
  for (const node of nodes) {
    result.push({ node, path: node.name });
    if (node.type === 'folder') {
      result.push(
        ...flattenAll(node.children).map(entry => ({
          node: entry.node,
          path: `${node.name}/${entry.path}`,
        }))
      );
    }
  }
  return result;
}

type PendingDelete = { id: string; type: 'folder' | 'document'; name: string };
type PendingMove = { id: string; type: 'folder' | 'document'; name: string };

function TreeRow({
  node,
  depth,
  expanded,
  onToggleExpand,
  selectedFolderId,
  onSelectFolder,
  renamingId,
  renameValue,
  onRenameValueChange,
  onCommitRename,
  onCancelRename,
  onStartRename,
  onStartMove,
  onDelete,
}: {
  node: FileTreeNode;
  depth: number;
  expanded: Set<string>;
  onToggleExpand: (id: string) => void;
  selectedFolderId: string | null;
  onSelectFolder: (id: string) => void;
  renamingId: string | null;
  renameValue: string;
  onRenameValueChange: (value: string) => void;
  onCommitRename: () => void;
  onCancelRename: () => void;
  onStartRename: (id: string, name: string) => void;
  onStartMove: (target: PendingMove) => void;
  onDelete: (target: PendingDelete) => void;
}) {
  const isFolder = node.type === 'folder';
  const isExpanded = isFolder && expanded.has(node.id);
  const isRenaming = renamingId === node.id;
  const isSelected = isFolder && selectedFolderId === node.id;

  return (
    <div>
      <div
        className={`group flex items-center gap-1.5 rounded-2xl px-2 py-1.5 text-sm ${
          isSelected ? 'bg-muted text-foreground' : 'hover:bg-muted/60'
        }`}
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
      >
        <button
          type="button"
          className="flex min-w-0 flex-1 items-center gap-1.5 text-left"
          onClick={() => {
            if (isFolder) {
              onToggleExpand(node.id);
              onSelectFolder(node.id);
            }
          }}
        >
          {isFolder ? (
            <FolderIcon className="text-muted-foreground size-4 shrink-0" />
          ) : (
            <FileTextIcon className="text-muted-foreground size-4 shrink-0" />
          )}
          {isRenaming ? (
            <Input
              autoFocus
              value={renameValue}
              onChange={event => onRenameValueChange(event.target.value)}
              onClick={event => event.stopPropagation()}
              onKeyDown={event => {
                if (event.key === 'Enter') onCommitRename();
                if (event.key === 'Escape') onCancelRename();
              }}
              onBlur={onCommitRename}
              className="h-6 px-2 text-sm"
            />
          ) : isFolder ? (
            <span className="truncate">{node.name}</span>
          ) : (
            <Link
              to={`/d/${node.id}`}
              className="truncate hover:underline"
              onClick={event => event.stopPropagation()}
            >
              {node.name}
            </Link>
          )}
        </button>

        {!isRenaming && (
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon-xs"
                  className="text-muted-foreground opacity-100 max-sm:size-8 sm:opacity-0 sm:group-hover:opacity-100"
                />
              }
            >
              <MoreVerticalIcon className="size-3.5" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={() => onStartRename(node.id, node.name)}
              >
                <PencilIcon className="size-4" />
                Rename
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() =>
                  onStartMove({ id: node.id, type: node.type, name: node.name })
                }
              >
                <FolderIcon className="size-4" />
                Move to…
              </DropdownMenuItem>
              <DropdownMenuItem
                variant="destructive"
                onClick={() =>
                  onDelete({ id: node.id, type: node.type, name: node.name })
                }
              >
                <TrashIcon className="size-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {isFolder && isExpanded && (
        <div>
          {node.children.length === 0 && (
            <p
              className="text-muted-foreground py-1 text-xs"
              style={{ paddingLeft: `${(depth + 1) * 16 + 28}px` }}
            >
              Empty folder
            </p>
          )}
          {node.children.map(child => (
            <TreeRow
              key={child.id}
              node={child}
              depth={depth + 1}
              expanded={expanded}
              onToggleExpand={onToggleExpand}
              selectedFolderId={selectedFolderId}
              onSelectFolder={onSelectFolder}
              renamingId={renamingId}
              renameValue={renameValue}
              onRenameValueChange={onRenameValueChange}
              onCommitRename={onCommitRename}
              onCancelRename={onCancelRename}
              onStartRename={onStartRename}
              onStartMove={onStartMove}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function FilesPage() {
  const { user, isLoading: isAuthLoading } = useAuth();
  const navigate = useNavigate();

  const [tree, setTree] = React.useState<FileTreeNode[] | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [expanded, setExpanded] = React.useState<Set<string>>(new Set());
  const [selectedFolderId, setSelectedFolderId] = React.useState<string | null>(
    null
  );
  const [search, setSearch] = React.useState('');

  const [renamingId, setRenamingId] = React.useState<string | null>(null);
  const [renameValue, setRenameValue] = React.useState('');
  const [pendingDelete, setPendingDelete] =
    React.useState<PendingDelete | null>(null);
  const [pendingMove, setPendingMove] = React.useState<PendingMove | null>(
    null
  );
  const [moveTargetId, setMoveTargetId] = React.useState<string>('root');
  const [isBusy, setIsBusy] = React.useState(false);

  const loadTree = React.useCallback(() => {
    return getFileTree()
      .then(setTree)
      .catch(error => {
        toast.error(
          error instanceof ApiError ? error.message : 'Failed to load files'
        );
      })
      .finally(() => setIsLoading(false));
  }, []);

  React.useEffect(() => {
    if (!isAuthLoading && !user) {
      navigate('/auth');
      return;
    }
    if (user) {
      void loadTree();
    }
  }, [isAuthLoading, user, navigate, loadTree]);

  if (!user) {
    return null;
  }

  const flatFolders = tree ? flattenFolders(tree) : [];
  const currentFolder =
    tree && selectedFolderId
      ? (findNode(tree, selectedFolderId) as FileTreeFolder | null)
      : null;
  const currentChildren: FileTreeNode[] = currentFolder
    ? currentFolder.children
    : (tree ?? []);

  const breadcrumb: FlatFolder[] = [];
  {
    let cursor = selectedFolderId;
    while (cursor) {
      const folder = flatFolders.find(f => f.id === cursor);
      if (!folder) break;
      breadcrumb.unshift(folder);
      cursor = folder.parentId;
    }
  }

  const searchResults = search.trim()
    ? flattenAll(tree ?? []).filter(entry =>
        entry.node.name.toLowerCase().includes(search.trim().toLowerCase())
      )
    : null;

  const toggleExpand = (id: string) => {
    setExpanded(previous => {
      const next = new Set(previous);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleCreateFolder = async () => {
    setIsBusy(true);
    try {
      await createFolder({
        name: 'New folder',
        parentId: selectedFolderId ?? undefined,
      });
      await loadTree();
    } catch (error) {
      toast.error(
        error instanceof ApiError ? error.message : 'Failed to create folder'
      );
    } finally {
      setIsBusy(false);
    }
  };

  const handleCreateDocument = async () => {
    setIsBusy(true);
    try {
      const document = await createDocument({
        name: 'Untitled.md',
        folderId: selectedFolderId ?? undefined,
      });
      navigate(`/d/${document.id}`);
    } catch (error) {
      toast.error(
        error instanceof ApiError ? error.message : 'Failed to create document'
      );
    } finally {
      setIsBusy(false);
    }
  };

  const handleCommitRename = async () => {
    if (!renamingId) return;
    const id = renamingId;
    const name = renameValue.trim();
    setRenamingId(null);
    if (!name) return;

    const node = tree ? findNode(tree, id) : null;
    if (!node) return;

    try {
      if (node.type === 'folder') {
        await renameOrMoveFolder(id, { name });
      } else {
        await updateDocument(id, { name });
      }
      await loadTree();
    } catch (error) {
      toast.error(
        error instanceof ApiError ? error.message : 'Failed to rename'
      );
    }
  };

  const handleConfirmDelete = async () => {
    if (!pendingDelete) return;
    setIsBusy(true);
    try {
      if (pendingDelete.type === 'folder') {
        await deleteFolder(pendingDelete.id);
      } else {
        await deleteDocument(pendingDelete.id);
      }
      toast.success(`Deleted "${pendingDelete.name}"`);
      setPendingDelete(null);
      await loadTree();
    } catch (error) {
      toast.error(
        error instanceof ApiError ? error.message : 'Failed to delete'
      );
    } finally {
      setIsBusy(false);
    }
  };

  const handleConfirmMove = async () => {
    if (!pendingMove) return;
    const targetFolderId = moveTargetId === 'root' ? null : moveTargetId;
    setIsBusy(true);
    try {
      if (pendingMove.type === 'folder') {
        await renameOrMoveFolder(pendingMove.id, {
          parentId: targetFolderId,
        });
      } else {
        await updateDocument(pendingMove.id, { folderId: targetFolderId });
      }
      toast.success(`Moved "${pendingMove.name}"`);
      setPendingMove(null);
      await loadTree();
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : 'Failed to move');
    } finally {
      setIsBusy(false);
    }
  };

  return (
    <PageShell title="My Files" maxWidth="max-w-5xl">
      <div className="flex flex-col gap-4 sm:flex-row">
        <aside className="border-border bg-card/40 w-full shrink-0 rounded-3xl border p-2 sm:w-56">
          <div className="flex items-center gap-1 px-2 pt-1 pb-2">
            <Button
              variant="ghost"
              size="icon-xs"
              className="max-sm:size-9"
              onClick={handleCreateFolder}
              disabled={isBusy}
            >
              <FolderPlusIcon className="size-4" />
              <span className="sr-only">New folder</span>
            </Button>
            <Button
              variant="ghost"
              size="icon-xs"
              className="max-sm:size-9"
              onClick={handleCreateDocument}
              disabled={isBusy}
            >
              <PlusIcon className="size-4" />
              <span className="sr-only">New document</span>
            </Button>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-6">
              <Loader2Icon className="text-muted-foreground size-4 animate-spin" />
            </div>
          ) : (
            <div
              className={`rounded-2xl px-1 py-1 ${
                selectedFolderId === null ? 'bg-muted' : ''
              }`}
            >
              <button
                type="button"
                onClick={() => setSelectedFolderId(null)}
                className="w-full rounded-2xl px-2 py-1.5 text-left text-sm font-medium"
              >
                Root
              </button>
              {(tree ?? []).map(node => (
                <TreeRow
                  key={node.id}
                  node={node}
                  depth={1}
                  expanded={expanded}
                  onToggleExpand={toggleExpand}
                  selectedFolderId={selectedFolderId}
                  onSelectFolder={setSelectedFolderId}
                  renamingId={renamingId}
                  renameValue={renameValue}
                  onRenameValueChange={setRenameValue}
                  onCommitRename={handleCommitRename}
                  onCancelRename={() => setRenamingId(null)}
                  onStartRename={(id, name) => {
                    setRenamingId(id);
                    setRenameValue(name);
                  }}
                  onStartMove={target => {
                    setPendingMove(target);
                    setMoveTargetId('root');
                  }}
                  onDelete={setPendingDelete}
                />
              ))}
            </div>
          )}
        </aside>

        <section className="border-border min-w-0 flex-1 rounded-3xl border p-4">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <nav className="text-muted-foreground flex min-w-0 flex-wrap items-center gap-1 text-sm">
              <button
                type="button"
                className="hover:text-foreground"
                onClick={() => setSelectedFolderId(null)}
              >
                Root
              </button>
              {breadcrumb.map(folder => (
                <span key={folder.id} className="flex items-center gap-1">
                  <span>/</span>
                  <button
                    type="button"
                    className="hover:text-foreground"
                    onClick={() => setSelectedFolderId(folder.id)}
                  >
                    {folder.name}
                  </button>
                </span>
              ))}
            </nav>

            <div className="relative w-full sm:w-56">
              <SearchIcon className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
              <Input
                value={search}
                onChange={event => setSearch(event.target.value)}
                placeholder="Search documents…"
                className="pl-9"
              />
            </div>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-10">
              <Loader2Icon className="text-muted-foreground size-5 animate-spin" />
            </div>
          ) : searchResults ? (
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {searchResults.length === 0 && (
                <p className="text-muted-foreground col-span-full py-8 text-center text-sm">
                  No matches for "{search}"
                </p>
              )}
              {searchResults.map(({ node, path }) => (
                <FileCard key={node.id} node={node} subtitle={path} />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {currentChildren.length === 0 && (
                <p className="text-muted-foreground col-span-full py-8 text-center text-sm">
                  This folder is empty
                </p>
              )}
              {currentChildren.map(node => (
                <FileCard
                  key={node.id}
                  node={node}
                  onOpenFolder={
                    node.type === 'folder'
                      ? () => setSelectedFolderId(node.id)
                      : undefined
                  }
                />
              ))}
            </div>
          )}
        </section>
      </div>

      <Dialog
        open={pendingDelete !== null}
        onOpenChange={open => !open && setPendingDelete(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete "{pendingDelete?.name}"?</DialogTitle>
            <DialogDescription>
              {pendingDelete?.type === 'folder'
                ? 'This deletes the folder and everything inside it. This cannot be undone.'
                : 'This permanently deletes the document. This cannot be undone.'}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>
              Cancel
            </DialogClose>
            <Button
              variant="destructive"
              onClick={handleConfirmDelete}
              disabled={isBusy}
            >
              {isBusy && <Loader2Icon className="size-4 animate-spin" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={pendingMove !== null}
        onOpenChange={open => !open && setPendingMove(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Move "{pendingMove?.name}"</DialogTitle>
            <DialogDescription>Choose a destination folder.</DialogDescription>
          </DialogHeader>
          <Select
            value={moveTargetId}
            onValueChange={value => setMoveTargetId(value ?? 'root')}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Choose a folder" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="root">Root</SelectItem>
              {flatFolders
                .filter(folder => folder.id !== pendingMove?.id)
                .map(folder => (
                  <SelectItem key={folder.id} value={folder.id}>
                    {'  '.repeat(folder.depth)}
                    {folder.name}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>
              Cancel
            </DialogClose>
            <Button onClick={handleConfirmMove} disabled={isBusy}>
              {isBusy && <Loader2Icon className="size-4 animate-spin" />}
              Move
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageShell>
  );
}

function FileCard({
  node,
  subtitle,
  onOpenFolder,
}: {
  node: FileTreeNode;
  subtitle?: string;
  onOpenFolder?: () => void;
}) {
  const isFolder = node.type === 'folder';
  const inner = (
    <div className="border-border hover:bg-muted/40 flex items-center gap-2.5 rounded-2xl border p-3 transition-colors">
      {isFolder ? (
        <FolderIcon className="size-5 shrink-0" />
      ) : (
        <FileTextIcon className="size-5 shrink-0" />
      )}
      <div className="min-w-0">
        <p className="truncate text-sm font-medium">{node.name}</p>
        {subtitle && (
          <p className="text-muted-foreground truncate text-xs">{subtitle}</p>
        )}
        {!subtitle && node.type === 'document' && (
          <p className="text-muted-foreground text-xs">
            {new Date((node as FileTreeDocument).updatedAt).toLocaleString()}
          </p>
        )}
      </div>
    </div>
  );

  if (isFolder) {
    return (
      <button type="button" onClick={onOpenFolder} className="text-left">
        {inner}
      </button>
    );
  }

  return <Link to={`/d/${node.id}`}>{inner}</Link>;
}

export default FilesPage;
