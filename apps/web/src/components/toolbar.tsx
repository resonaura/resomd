import { AnimatePresence, motion } from 'framer-motion';
import {
  CheckIcon,
  CloudIcon,
  ColumnsIcon,
  DownloadIcon,
  EyeIcon,
  FileDownIcon,
  FileUpIcon,
  Loader2Icon,
  LogOutIcon,
  MenuIcon,
  MoonIcon,
  PanelLeftIcon,
  PrinterIcon,
  ShieldIcon,
  SquarePenIcon,
  SunIcon,
  UserIcon,
  XIcon,
} from 'lucide-react';
import { useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { toast } from 'sonner';

import { FileSidebar } from '@/components/file-sidebar';
import { useTheme } from '@/components/theme/provider';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Separator } from '@/components/ui/separator';
import { Spinner } from '@/components/ui/spinner';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { AUTH_WEB_URL } from '@/lib/api';
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
  sidebarVisible?: boolean;
  onToggleSidebar?: () => void;
  selectedDocId?: string | null;
}

export function AppToolbar({
  content,
  onLoadContent,
  previewRef,
  mode,
  onModeChange,
  docName,
  syncStatus,
  sidebarVisible = false,
  onToggleSidebar,
  selectedDocId = null,
}: AppToolbarProps) {
  const { theme, setTheme } = useTheme();
  const { user, logout, signIn } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const handleFileSelected = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
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
    <>
      <header className="bg-background border-border flex h-12 shrink-0 items-center justify-between border-b px-2 transition-colors duration-300 sm:px-3">
        {/* ── Left: Sidebar toggle + Logo ── */}
        <div className="flex items-center gap-1.5">
          {/* Mobile: hamburger opens file sidebar as a slide-over */}
          {user && (
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="flex sm:hidden"
                    onClick={() => setMobileSidebarOpen(true)}
                  />
                }
              >
                <MenuIcon className="size-4" />
              </TooltipTrigger>
              <TooltipContent>Files</TooltipContent>
            </Tooltip>
          )}

          {/* Desktop: panel toggle */}
          {user && onToggleSidebar && (
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className={sidebarVisible ? '' : 'text-muted-foreground'}
                    onClick={onToggleSidebar}
                  />
                }
              >
                <PanelLeftIcon className="size-4" />
              </TooltipTrigger>
              <TooltipContent>
                {sidebarVisible ? 'Hide files' : 'Show files'}
              </TooltipContent>
            </Tooltip>
          )}

          <img
            src={theme === 'dark' ? '/icon.svg' : '/icon-light.svg'}
            alt="ResoMD"
            className="size-5 shrink-0"
          />

          {/* Doc name + sync status — desktop only */}
          {docName && (
            <>
              <Separator orientation="vertical" className="mx-1 h-5" />
              <div className="hidden items-center gap-1.5 text-xs sm:flex">
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
                  <CloudIcon className="text-muted-foreground size-3.5" />
                )}
              </div>
            </>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept=".md,.markdown,text/markdown"
            className="hidden"
            onChange={handleFileSelected}
          />
        </div>

        {/* ── Center: Mode toggle ── */}
        <div className="flex items-center">
          <div className="bg-muted flex h-8 items-center gap-0.5 rounded-lg p-0.5">
            {[
              {
                mode: 'editor' as const,
                icon: <SquarePenIcon className="size-4" />,
                label: 'Editor',
                mobile: true,
              },
              {
                mode: 'split' as const,
                icon: <ColumnsIcon className="size-4" />,
                label: 'Split',
                mobile: false,
              },
              {
                mode: 'preview' as const,
                icon: <EyeIcon className="size-4" />,
                label: 'Preview',
                mobile: true,
              },
            ].map(({ mode: m, icon, label, mobile }) => (
              <Tooltip key={m}>
                <TooltipTrigger
                  render={
                    <Button
                      variant={mode === m ? 'secondary' : 'ghost'}
                      size="icon-sm"
                      className={`h-7 w-9 rounded-md p-0 transition-all ${
                        mobile ? 'flex' : 'hidden sm:flex'
                      } ${
                        mode === m
                          ? 'bg-background text-foreground shadow-sm'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                      onClick={() => onModeChange(m)}
                    >
                      {icon}
                      <span className="sr-only">{label}</span>
                    </Button>
                  }
                />
                <TooltipContent>{label}</TooltipContent>
              </Tooltip>
            ))}
          </div>
        </div>

        {/* ── Right: Actions ── */}
        <div className="flex items-center gap-0.5 sm:gap-1">
          {/* Desktop: Open, Save, Print */}
          <div className="hidden items-center gap-0.5 sm:flex">
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="text-muted-foreground hover:text-foreground"
                    onClick={() => fileInputRef.current?.click()}
                  />
                }
              >
                <FileUpIcon className="size-4" />
              </TooltipTrigger>
              <TooltipContent>Open .md file</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="text-muted-foreground hover:text-foreground"
                    onClick={handleDownloadMarkdown}
                  />
                }
              >
                <DownloadIcon className="size-4" />
              </TooltipTrigger>
              <TooltipContent>Download Markdown</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="text-muted-foreground hover:text-foreground"
                    onClick={handlePrint}
                    disabled={isExporting}
                  />
                }
              >
                <PrinterIcon className="size-4" />
              </TooltipTrigger>
              <TooltipContent>Print</TooltipContent>
            </Tooltip>
          </div>

          {/* Mobile: More actions in a dropdown */}
          <div className="flex sm:hidden">
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="text-muted-foreground"
                  />
                }
              >
                <FileDownIcon className="size-4" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => fileInputRef.current?.click()}>
                  <FileUpIcon className="size-4" />
                  Open file
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleDownloadMarkdown}>
                  <DownloadIcon className="size-4" />
                  Download .md
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handlePrint} disabled={isExporting}>
                  <PrinterIcon className="size-4" />
                  Print
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <Separator orientation="vertical" className="mx-0.5 h-5" />

          {/* Theme toggle */}
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="text-muted-foreground hover:text-foreground relative overflow-hidden"
                  onClick={cycleTheme}
                />
              }
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
            </TooltipTrigger>
            <TooltipContent>Toggle theme</TooltipContent>
          </Tooltip>

          {/* Export PDF */}
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  variant="secondary"
                  size="icon-sm"
                  className="hidden sm:flex"
                  onClick={handleExportPdf}
                  disabled={isExporting}
                />
              }
            >
              {isExporting ? (
                <Loader2Icon className="size-4 animate-spin" />
              ) : (
                <FileDownIcon className="size-4" />
              )}
            </TooltipTrigger>
            <TooltipContent>Export PDF</TooltipContent>
          </Tooltip>

          {/* User menu / Sign in */}
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="rounded-full"
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
                <DropdownMenuGroup>
                  <DropdownMenuLabel>
                    {user.displayName || user.email}
                  </DropdownMenuLabel>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  render={
                    <a href={`${AUTH_WEB_URL}/profile`} target="_blank" />
                  }
                >
                  <UserIcon className="size-4" />
                  Account
                </DropdownMenuItem>
                <DropdownMenuItem render={<Link to="/files" />}>
                  <FileUpIcon className="size-4" />
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
            <Button variant="outline" size="sm" onClick={() => signIn()}>
              <UserIcon className="size-4" />
              <span className="hidden sm:inline">Sign in</span>
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

      {/* Mobile file sidebar slide-over */}
      <AnimatePresence>
        {mobileSidebarOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-50 bg-black/50 sm:hidden"
              onClick={() => setMobileSidebarOpen(false)}
            />
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ duration: 0.25, ease: 'easeInOut' }}
              className="fixed inset-y-0 left-0 z-50 w-72 max-w-[85vw] sm:hidden"
            >
              <div className="bg-background border-border relative flex h-full flex-col border-r">
                <div className="border-border flex h-12 shrink-0 items-center justify-between border-b px-3">
                  <span className="text-sm font-medium">Files</span>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => setMobileSidebarOpen(false)}
                  >
                    <XIcon className="size-4" />
                  </Button>
                </div>
                <div className="min-h-0 flex-1">
                  <FileSidebar selectedDocId={selectedDocId} />
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

export default AppToolbar;
