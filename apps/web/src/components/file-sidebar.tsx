import { AnimatePresence, motion } from 'framer-motion';
import {
  ChevronRightIcon,
  FilePlusIcon,
  FileTextIcon,
  FolderIcon,
  FolderPlusIcon,
  MoreHorizontalIcon,
  PencilIcon,
  RefreshCwIcon,
  SearchIcon,
  TrashIcon,
  XIcon,
} from 'lucide-react';
import * as React from 'react';
import { Link, useNavigate } from 'react-router';
import { toast } from 'sonner';

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
import { Spinner } from '@/components/ui/spinner';
import { ApiError } from '@/lib/api';
import {
  createDocument,
  createFolder,
  deleteDocument,
  deleteFolder,
  getFileTree,
  renameOrMoveFolder,
  updateDocument,
  type FileTreeNode,
} from '@/lib/files-api';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip';

// ── Helpers ──────────────────────────────────────────────────────────

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

function matchesSearch(node: FileTreeNode, query: string): boolean {
  return node.name.toLowerCase().includes(query.toLowerCase());
}

function HighlightedName({ name, query }: { name: string; query: string }) {
  if (!query) return <>{name}</>;
  const idx = name.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return <>{name}</>;
  return (
    <>
      {name.slice(0, idx)}
      <mark className="bg-primary/20 text-foreground rounded px-0.5">
        {name.slice(idx, idx + query.length)}
      </mark>
      {name.slice(idx + query.length)}
    </>
  );
}

type PendingDelete = { id: string; type: 'folder' | 'document'; name: string };
type PendingMove = { id: string; type: 'folder' | 'document'; name: string };

// ── Tree node component ──────────────────────────────────────────────

interface TreeNodeProps {
  node: FileTreeNode;
  depth: number;
  expanded: Set<string>;
  selectedDocId: string | null;
  searchQuery: string;
  renamingId: string | null;
  renameValue: string;
  onToggleExpand: (id: string) => void;
  onSelectDocument: (id: string) => void;
  onRenameValueChange: (value: string) => void;
  onCommitRename: () => void;
  onCancelRename: () => void;
  onStartRename: (id: string, name: string) => void;
  onStartMove: (target: PendingMove) => void;
  onDelete: (target: PendingDelete) => void;
}

function TreeNode({
  node,
  depth,
  expanded,
  selectedDocId,
  searchQuery,
  renamingId,
  renameValue,
  onToggleExpand,
  onSelectDocument,
  onRenameValueChange,
  onCommitRename,
  onCancelRename,
  onStartRename,
  onStartMove,
  onDelete,
}: TreeNodeProps) {
  const isFolder = node.type === 'folder';
  const isExpanded = isFolder && expanded.has(node.id);
  const isRenaming = renamingId === node.id;
  const isSelected = !isFolder && selectedDocId === node.id;
  const indent = depth * 14 + 6;

  // Filter out non-matching nodes in search mode
  if (searchQuery) {
    const selfMatch = matchesSearch(node, searchQuery);
    const childMatch =
      isFolder &&
      flattenAll(node.children).some(entry =>
        matchesSearch(entry.node, searchQuery)
      );
    if (!selfMatch && !childMatch) return null;
  }

  return (
    <div>
      <div
        className={cn(
          'group relative flex h-7 items-center rounded-[55px] transition-colors',
          isSelected ? 'bg-primary/10' : 'hover:bg-muted/60 active:bg-muted'
        )}
        style={{ paddingLeft: `${indent}px`, paddingRight: '4px' }}
      >
        {/* Expand arrow — folders only */}
        <span
          className="hover:bg-muted flex size-6 shrink-0 items-center justify-center rounded transition-colors"
          onClick={e => {
            if (isFolder) {
              e.stopPropagation();
              onToggleExpand(node.id);
            }
          }}
        >
          {isFolder ? (
            <motion.span
              animate={{ rotate: isExpanded ? 90 : 0 }}
              transition={{ duration: 0.12 }}
              className="text-muted-foreground flex items-center justify-center"
            >
              <ChevronRightIcon className="size-3" />
            </motion.span>
          ) : (
            <span className="size-3" />
          )}
        </span>

        {/* Icon + name */}
        <span
          className="relative z-10 flex min-w-0 flex-1 cursor-pointer items-center gap-1.5 py-1.5"
          onClick={() => {
            if (isFolder) {
              onToggleExpand(node.id);
            } else {
              onSelectDocument(node.id);
            }
          }}
        >
          {isFolder ? (
            <FolderIcon
              className={cn(
                'size-3.5 shrink-0',
                isExpanded ? 'text-foreground' : 'text-muted-foreground'
              )}
            />
          ) : (
            <FileTextIcon className="text-muted-foreground size-3.5 shrink-0" />
          )}
          {isRenaming ? (
            <Input
              autoFocus
              value={renameValue}
              onChange={e => onRenameValueChange(e.target.value)}
              onClick={e => e.stopPropagation()}
              onKeyDown={e => {
                if (e.key === 'Enter') onCommitRename();
                if (e.key === 'Escape') onCancelRename();
              }}
              onBlur={onCommitRename}
              className="h-6 px-1.5 text-sm"
            />
          ) : isFolder ? (
            <span className="truncate text-sm">
              {searchQuery ? (
                <HighlightedName name={node.name} query={searchQuery} />
              ) : (
                node.name
              )}
            </span>
          ) : (
            <Link
              to={`/d/${node.id}`}
              className={cn(
                'truncate text-sm',
                isSelected
                  ? 'text-foreground font-medium'
                  : 'text-foreground/80 hover:text-foreground'
              )}
              onClick={e => {
                e.stopPropagation();
                onSelectDocument(node.id);
              }}
            >
              {searchQuery ? (
                <HighlightedName name={node.name} query={searchQuery} />
              ) : (
                node.name
              )}
            </Link>
          )}
          {isFolder && !searchQuery && node.children.length > 0 && (
            <span className="text-muted-foreground/60 ml-auto shrink-0 text-[10px] tabular-nums">
              {node.children.length}
            </span>
          )}
        </span>

        {/* ⋯ context menu button */}
        {!isRenaming && (
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon-xs"
                  className="text-muted-foreground hover:text-foreground relative z-10 size-5 shrink-0 opacity-0 transition-opacity group-hover:opacity-100"
                />
              }
            >
              <MoreHorizontalIcon className="size-3" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={() => onStartRename(node.id, node.name)}
              >
                <PencilIcon className="size-3.5" />
                Rename
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() =>
                  onStartMove({
                    id: node.id,
                    type: node.type,
                    name: node.name,
                  })
                }
              >
                <FolderIcon className="size-3.5" />
                Move to…
              </DropdownMenuItem>
              <DropdownMenuItem
                variant="destructive"
                onClick={() =>
                  onDelete({
                    id: node.id,
                    type: node.type,
                    name: node.name,
                  })
                }
              >
                <TrashIcon className="size-3.5" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {/* Children — animated expand/collapse */}
      <AnimatePresence initial={false}>
        {isFolder && isExpanded && (
          <motion.div
            key="children"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.14, ease: 'easeOut' }}
            style={{ overflow: 'hidden' }}
          >
            {node.children.length === 0 ? (
              <p
                className="text-muted-foreground/50 py-1 text-xs"
                style={{ paddingLeft: `${(depth + 1) * 14 + 36}px` }}
              >
                Empty
              </p>
            ) : (
              node.children.map(child => (
                <TreeNode
                  key={child.id}
                  node={child}
                  depth={depth + 1}
                  expanded={expanded}
                  selectedDocId={selectedDocId}
                  searchQuery={searchQuery}
                  renamingId={renamingId}
                  renameValue={renameValue}
                  onToggleExpand={onToggleExpand}
                  onSelectDocument={onSelectDocument}
                  onRenameValueChange={onRenameValueChange}
                  onCommitRename={onCommitRename}
                  onCancelRename={onCancelRename}
                  onStartRename={onStartRename}
                  onStartMove={onStartMove}
                  onDelete={onDelete}
                />
              ))
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* In search mode render children inline without animation */}
      {isFolder && searchQuery && node.children.length > 0 && (
        <div>
          {node.children.map(child => (
            <TreeNode
              key={child.id}
              node={child}
              depth={depth + 1}
              expanded={expanded}
              selectedDocId={selectedDocId}
              searchQuery={searchQuery}
              renamingId={renamingId}
              renameValue={renameValue}
              onToggleExpand={onToggleExpand}
              onSelectDocument={onSelectDocument}
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

// ── Main sidebar component ───────────────────────────────────────────

interface FileSidebarProps {
  selectedDocId?: string | null;
  /** When provided, called instead of navigating to /d/:id. */
  onOpenDocument?: (id: string) => void;
}

export function FileSidebar({
  selectedDocId = null,
  onOpenDocument,
}: FileSidebarProps) {
  const navigate = useNavigate();

  const [tree, setTree] = React.useState<FileTreeNode[] | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [expanded, setExpanded] = React.useState<Set<string>>(new Set());
  const [search, setSearch] = React.useState('');

  const [renamingId, setRenamingId] = React.useState<string | null>(null);
  const [renameValue, setRenameValue] = React.useState('');
  const [pendingDelete, setPendingDelete] =
    React.useState<PendingDelete | null>(null);
  const [pendingMove, setPendingMove] = React.useState<PendingMove | null>(
    null
  );
  const [moveTargetId, setMoveTargetId] = React.useState('root');
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
    void loadTree();
  }, [loadTree]);

  const flatFolders = tree ? flattenFolders(tree) : [];

  const toggleExpand = (id: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSelectDocument = (id: string) => {
    if (onOpenDocument) {
      onOpenDocument(id);
    } else {
      navigate(`/d/${id}`);
    }
  };

  const handleCreateFolder = async () => {
    setIsBusy(true);
    try {
      await createFolder({ name: 'New folder' });
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
      const doc = await createDocument({ name: 'Untitled.md' });
      if (onOpenDocument) {
        onOpenDocument(doc.id);
      } else {
        navigate(`/d/${doc.id}`);
      }
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
    <div className="bg-muted/20 border-border flex h-full w-full flex-col border-r">
      {/* Search */}
      <div className="border-border flex gap-1 border-b px-2 py-2">
        <div className="relative">
          <SearchIcon className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-3.5 -translate-y-1/2" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search"
            className="bord box-border h-7 pr-7 pl-8 text-sm"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              className="text-muted-foreground hover:text-foreground absolute top-1/2 right-2 -translate-y-1/2"
            >
              <XIcon className="size-3.5" />
            </button>
          )}
        </div>
        <div className="flex items-center gap-0.5">
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon-xs"
                  className="text-muted-foreground hover:text-foreground size-6"
                  onClick={handleCreateDocument}
                  disabled={isBusy}
                />
              }
            >
              <FilePlusIcon className="size-3.5" />
            </TooltipTrigger>
            <TooltipContent>New document</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon-xs"
                  className="text-muted-foreground hover:text-foreground size-6"
                  onClick={handleCreateFolder}
                  disabled={isBusy}
                />
              }
            >
              <FolderPlusIcon className="size-3.5" />
            </TooltipTrigger>
            <TooltipContent>New folder</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon-xs"
                  className="text-muted-foreground hover:text-foreground size-6"
                  onClick={() => void loadTree()}
                />
              }
            >
              <RefreshCwIcon className="size-3.5" />
            </TooltipTrigger>
            <TooltipContent>Refresh</TooltipContent>
          </Tooltip>
        </div>
      </div>

      {/* File tree */}
      <div className="min-h-0 flex-1 gap-1 overflow-x-hidden overflow-y-auto px-2 py-2">
        <AnimatePresence mode="wait">
          {isLoading ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="flex items-center justify-center py-8"
            >
              <Spinner className="size-4" />
            </motion.div>
          ) : !tree || tree.length === 0 ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="px-4 py-8 text-center"
            >
              <FolderIcon className="text-muted-foreground/30 mx-auto mb-2 size-7" />
              <p className="text-muted-foreground text-xs">No files yet</p>
              <button
                type="button"
                onClick={handleCreateDocument}
                className="text-primary mt-2 text-xs hover:underline"
              >
                Create a document
              </button>
            </motion.div>
          ) : search &&
            !flattenAll(tree).some(entry =>
              matchesSearch(entry.node, search)
            ) ? (
            <motion.div
              key="no-results"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="px-4 py-8 text-center"
            >
              <SearchIcon className="text-muted-foreground/30 mx-auto mb-2 size-7" />
              <p className="text-muted-foreground text-xs">
                No results for "{search}"
              </p>
              <button
                type="button"
                onClick={() => setSearch('')}
                className="text-primary mt-2 text-xs hover:underline"
              >
                Clear search
              </button>
            </motion.div>
          ) : (
            <motion.div
              key={`tree-${tree.length}`}
              initial="hidden"
              animate="visible"
              variants={{ hidden: {}, visible: {} }}
              className="flex flex-col gap-1"
            >
              {(tree ?? []).map((node, i) => (
                <motion.div
                  key={node.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{
                    duration: 0.12,
                    delay: Math.min(i * 0.018, 0.15),
                  }}
                >
                  <TreeNode
                    node={node}
                    depth={0}
                    expanded={expanded}
                    selectedDocId={selectedDocId}
                    searchQuery={search}
                    renamingId={renamingId}
                    renameValue={renameValue}
                    onToggleExpand={toggleExpand}
                    onSelectDocument={handleSelectDocument}
                    onRenameValueChange={setRenameValue}
                    onCommitRename={handleCommitRename}
                    onCancelRename={() => setRenamingId(null)}
                    onStartRename={(id, name) => {
                      setRenamingId(id);
                      setRenameValue(name);
                    }}
                    onStartMove={setPendingMove}
                    onDelete={setPendingDelete}
                  />
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Delete dialog */}
      <Dialog
        open={pendingDelete !== null}
        onOpenChange={open => !open && setPendingDelete(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Delete {pendingDelete?.type === 'folder' ? 'folder' : 'document'}
            </DialogTitle>
            <DialogDescription>
              Delete <strong>{pendingDelete?.name}</strong>?
              {pendingDelete?.type === 'folder' &&
                ' All contents will be permanently removed.'}
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
              {isBusy && <Spinner className="size-4" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Move dialog */}
      <Dialog
        open={pendingMove !== null}
        onOpenChange={open => !open && setPendingMove(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Move "{pendingMove?.name}"</DialogTitle>
            <DialogDescription>Select a destination folder.</DialogDescription>
          </DialogHeader>
          <Select
            value={moveTargetId}
            onValueChange={value => setMoveTargetId(value ?? 'root')}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="root">Root (no folder)</SelectItem>
              {flatFolders.map(f => (
                <SelectItem key={f.id} value={f.id}>
                  {'  '.repeat(f.depth)}
                  {f.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>
              Cancel
            </DialogClose>
            <Button onClick={handleConfirmMove} disabled={isBusy}>
              {isBusy && <Spinner className="size-4" />}
              Move
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default FileSidebar;
