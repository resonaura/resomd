import { AnimatePresence, motion } from 'framer-motion';
import {
  CheckIcon,
  CloudIcon,
  ColumnsIcon,
  EyeIcon,
  FileDownIcon,
  FilesIcon,
  FileUpIcon,
  Loader2Icon,
  LogOutIcon,
  MoonIcon,
  PrinterIcon,
  ShieldIcon,
  SquarePenIcon,
  SunIcon,
  UserIcon,
} from 'lucide-react';
import { useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { toast } from 'sonner';

import { useTheme } from '@/components/theme/provider';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Spinner } from '@/components/ui/spinner';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useAuth } from '@/lib/auth-context';
import { print } from '@/lib/pdf';
import { exportNodeToPdfViaServer } from '@/lib/pdf-server';
import type { SyncStatus } from '@/lib/sync-status';

interface AppToolbarProps {
  content: string;
  onLoadContent: (content: string) => void;
  previewRef: React.RefObject<HTMLDivElement | null>;
  mode: 'editor' | 'split' | 'preview';
  onModeChange: (mode: 'editor' | 'split' | 'preview') => void;
  docName?: string | null;
  syncStatus?: SyncStatus;
}

export function AppToolbar({
  content,
  onLoadContent,
  previewRef,
  mode,
  onModeChange,
  docName,
  syncStatus,
}: AppToolbarProps) {
  const { theme, setTheme } = useTheme();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isExporting, setIsExporting] = useState(false);

  const handleFileSelected = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) {
      return;
    }

    const text = await file.text();
    onLoadContent(text);
    toast.success(`Loaded "${file.name}"`);
  };

  const handleDownloadMarkdown = () => {
    const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'document.md';
    link.click();
    URL.revokeObjectURL(url);
  };

  const handlePrint = async () => {
    const node = previewRef.current;
    if (!node) {
      toast.error('Preview content is not ready for export');
      return;
    }

    setIsExporting(true);
    try {
      await print(node);
    } catch (error) {
      console.error(error);
      toast.error('Failed to print');
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportPdf = async () => {
    const node = previewRef.current;
    if (!node) {
      toast.error('Preview content is not ready for export');
      return;
    }

    setIsExporting(true);
    try {
      await exportNodeToPdfViaServer(node);
      toast.success('PDF exported');
    } catch (error) {
      console.error(error);
      toast.error((error as Error).toString());
    } finally {
      setIsExporting(false);
    }
  };

  const cycleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  return (
    <header className="border-border bg-background flex h-14 shrink-0 items-center justify-between border-b px-2 transition-colors duration-300 sm:h-12 sm:px-3">
      {/* Left Section: Logo & File actions */}
      <div className="flex items-center gap-1 sm:gap-1.5">
        <div className="flex items-center gap-2.5 pr-2 select-none">
          <img
            src={theme === 'dark' ? '/icon.svg' : '/icon-light.svg'}
            alt="ResoMD Logo"
            className="size-5 shrink-0"
          />
        </div>

        {docName && (
          <div className="text-muted-foreground hidden items-center gap-1.5 border-r pr-3 text-xs sm:flex">
            <span className="text-foreground max-w-32 truncate font-medium">
              {docName}
            </span>
            {syncStatus === 'saving' && (
              <Loader2Icon className="size-3.5 animate-spin" />
            )}
            {syncStatus === 'synced' && (
              <CheckIcon className="size-3.5 text-emerald-500" />
            )}
            {syncStatus === 'error' && (
              <span className="text-destructive">Sync failed</span>
            )}
            {(syncStatus === 'saving' || syncStatus === 'synced') && (
              <CloudIcon className="size-3.5" />
            )}
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept=".md,.markdown,text/markdown"
          className="hidden"
          onChange={handleFileSelected}
        />

        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                variant="ghost"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                className="text-muted-foreground hover:text-foreground max-sm:h-10 max-sm:w-10 max-sm:px-0"
              >
                <FileUpIcon className="size-4" />
                <span className="hidden sm:inline">Open</span>
                <span className="sr-only sm:hidden">Open file</span>
              </Button>
            }
          />
          <TooltipContent>Open a .md file</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDownloadMarkdown}
                className="text-muted-foreground hover:text-foreground max-sm:h-10 max-sm:w-10 max-sm:px-0"
              >
                <FileDownIcon className="size-4" />
                <span className="hidden sm:inline">Save</span>
                <span className="sr-only sm:hidden">Download Markdown</span>
              </Button>
            }
          />
          <TooltipContent>Download as Markdown</TooltipContent>
        </Tooltip>
      </div>

      {/* Center Section: Display Mode Tab Capsule using standard Buttons */}
      <div className="flex items-center select-none">
        <div className="bg-muted flex h-9 items-center gap-0.5 rounded-lg p-0.5 sm:h-8">
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  variant={mode === 'editor' ? 'secondary' : 'ghost'}
                  size="icon-sm"
                  className={`flex h-8 w-10 cursor-pointer items-center justify-center rounded-md p-0 transition-all duration-150 sm:h-7 sm:w-9 ${
                    mode === 'editor'
                      ? 'bg-background text-foreground hover:bg-background shadow-sm'
                      : 'text-muted-foreground hover:text-foreground hover:bg-transparent'
                  }`}
                  onClick={() => onModeChange('editor')}
                >
                  <SquarePenIcon className="size-4" />
                  <span className="sr-only">Editor Mode</span>
                </Button>
              }
            />
            <TooltipContent>Editor Mode</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  variant={mode === 'split' ? 'secondary' : 'ghost'}
                  size="icon-sm"
                  className={`hidden h-8 w-10 cursor-pointer items-center justify-center rounded-md p-0 transition-all duration-150 sm:flex sm:h-7 sm:w-9 ${
                    mode === 'split'
                      ? 'bg-background text-foreground hover:bg-background shadow-sm'
                      : 'text-muted-foreground hover:text-foreground hover:bg-transparent'
                  }`}
                  onClick={() => onModeChange('split')}
                >
                  <ColumnsIcon className="size-4" />
                  <span className="sr-only">Split Mode</span>
                </Button>
              }
            />
            <TooltipContent>Split Mode (desktop only)</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  variant={mode === 'preview' ? 'secondary' : 'ghost'}
                  size="icon-sm"
                  className={`flex h-8 w-10 cursor-pointer items-center justify-center rounded-md p-0 transition-all duration-150 sm:h-7 sm:w-9 ${
                    mode === 'preview'
                      ? 'bg-background text-foreground hover:bg-background shadow-sm'
                      : 'text-muted-foreground hover:text-foreground hover:bg-transparent'
                  }`}
                  onClick={() => onModeChange('preview')}
                >
                  <EyeIcon className="size-4" />
                  <span className="sr-only">Preview Mode</span>
                </Button>
              }
            />
            <TooltipContent>Preview Mode</TooltipContent>
          </Tooltip>
        </div>
      </div>

      {/* Right Section: PDF & Theme Toggles */}
      <div className="flex items-center gap-1 sm:gap-1.5">
        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={handlePrint}
                disabled={isExporting}
                className="text-muted-foreground hover:text-foreground hidden max-sm:size-10 sm:flex"
              >
                <PrinterIcon className="size-4" />
                <span className="sr-only">Print</span>
              </Button>
            }
          />
          <TooltipContent>Print</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={cycleTheme}
                className="text-muted-foreground hover:text-foreground relative cursor-pointer overflow-hidden max-sm:size-10"
              >
                <AnimatePresence mode="wait" initial={false}>
                  <motion.span
                    key={theme}
                    initial={{ opacity: 0, rotate: -90, scale: 0.8 }}
                    animate={{ opacity: 1, rotate: 0, scale: 1 }}
                    exit={{ opacity: 0, rotate: 90, scale: 0.8 }}
                    transition={{ duration: 0.15 }}
                    className="flex size-4 items-center justify-center"
                  >
                    {theme === 'dark' ? (
                      <MoonIcon className="size-4" />
                    ) : (
                      <SunIcon className="size-4" />
                    )}
                  </motion.span>
                </AnimatePresence>
              </Button>
            }
          />
          <TooltipContent>Toggle Theme</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                variant="secondary"
                size="sm"
                onClick={handleExportPdf}
                disabled={isExporting}
                className="max-sm:size-10 max-sm:px-0"
              >
                {isExporting ? (
                  <Loader2Icon className="size-4 animate-spin" />
                ) : (
                  <FileDownIcon className="size-4" />
                )}
                <span className="hidden sm:inline">Export PDF</span>
                <span className="sr-only sm:hidden">Export PDF</span>
              </Button>
            }
          />
          <TooltipContent>Export PDF</TooltipContent>
        </Tooltip>

        {user ? (
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="rounded-full max-sm:size-10"
                />
              }
            >
              <Avatar size="sm">
                <AvatarImage src={user.avatarUrl ?? undefined} />
                <AvatarFallback>
                  {(user.displayName || user.email)[0]?.toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>
                {user.displayName || user.email}
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem render={<Link to="/account" />}>
                <UserIcon className="size-4" />
                Account
              </DropdownMenuItem>
              <DropdownMenuItem render={<Link to="/files" />}>
                <FilesIcon className="size-4" />
                My Files
              </DropdownMenuItem>
              {user.role === 'admin' && (
                <DropdownMenuItem render={<Link to="/admin" />}>
                  <ShieldIcon className="size-4" />
                  Admin
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                variant="destructive"
                onClick={() => {
                  logout();
                  navigate('/');
                }}
              >
                <LogOutIcon className="size-4" />
                Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <Button
            variant="outline"
            size="sm"
            className="max-sm:h-10"
            render={<Link to="/auth" />}
          >
            <UserIcon className="size-4" />
            <span className="hidden sm:inline">Log in</span>
          </Button>
        )}
      </div>

      <AnimatePresence>
        {isExporting && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            className="fixed inset-0 z-9999 flex flex-col items-center justify-center bg-black text-white"
          >
            <Spinner className="size-6 text-white" />
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
export default AppToolbar;
