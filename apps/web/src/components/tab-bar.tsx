import { AnimatePresence, motion } from 'framer-motion';
import { PanelLeftIcon, PlusIcon, XIcon } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { SCRATCH_TAB_ID, type Tab } from '@/lib/tab-types';
import { cn } from '@/lib/utils';

export type { Tab };

interface TabBarProps {
  tabs: Tab[];
  activeTabId: string | null;
  onSelectTab: (id: string) => void;
  onCloseTab: (id: string) => void;
  onNewTab: () => void;
  onRenameTab: (id: string) => void;
  /** Show/hide the file sidebar (desktop panel toggle). */
  sidebarVisible?: boolean;
  onToggleSidebar?: () => void;
}

export function TabBar({
  tabs,
  activeTabId,
  onSelectTab,
  onCloseTab,
  onNewTab,
  onRenameTab,
  sidebarVisible,
  onToggleSidebar,
}: TabBarProps) {
  return (
    <div className="bg-background border-border flex h-9 shrink-0 items-center gap-1 border-b pr-1 pl-1.5">
      {/* File sidebar toggle — lives in the tab row now (desktop only;
         mobile uses the hamburger in the toolbar) */}
      {onToggleSidebar && (
        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                variant="ghost"
                size="icon-xs"
                className={cn(
                  'hidden shrink-0 sm:flex',
                  sidebarVisible ? '' : 'text-muted-foreground'
                )}
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

      <div className="flex min-w-0 flex-1 items-center gap-0.5 overflow-x-auto">
        <AnimatePresence initial={false} mode="popLayout">
          {tabs.map(tab => (
            <TabItem
              key={tab.id}
              tab={tab}
              isActive={tab.id === activeTabId}
              onSelect={() => onSelectTab(tab.id)}
              onClose={() => onCloseTab(tab.id)}
              onRename={() => onRenameTab(tab.id)}
            />
          ))}
        </AnimatePresence>
      </div>

      <Button
        variant="ghost"
        size="icon-xs"
        className="text-muted-foreground hover:text-foreground shrink-0"
        onClick={onNewTab}
      >
        <PlusIcon className="size-3.5" />
      </Button>
    </div>
  );
}

interface TabItemProps {
  tab: Tab;
  isActive: boolean;
  onSelect: () => void;
  onClose: () => void;
  onRename: () => void;
}

function TabItem({ tab, isActive, onSelect, onClose, onRename }: TabItemProps) {
  const isScratch = tab.id === SCRATCH_TAB_ID;
  const showDirty = tab.isDirty && !isScratch;
  const showClose = !isScratch;

  return (
    <motion.div
      layout="position"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, width: 0 }}
      transition={{ duration: 0.15, ease: 'easeOut' }}
      className={cn(
        'group relative flex h-7 shrink-0 items-center gap-1.5 rounded-md px-2.5 text-xs transition-colors',
        isActive
          ? 'bg-muted text-foreground'
          : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
      )}
    >
      {/* Click target for switching tabs */}
      <button
        type="button"
        className="flex min-w-0 items-center gap-1.5"
        onClick={onSelect}
        onAuxClick={e => {
          // Middle-click to close
          if (e.button === 1 && showClose) onClose();
        }}
        onDoubleClick={e => {
          // Double-click to rename (document tabs only)
          if (!isScratch) {
            e.stopPropagation();
            onRename();
          }
        }}
      >
        <span
          className={cn(
            'max-w-32 truncate font-medium',
            tab.isPreview && 'italic'
          )}
        >
          {tab.name}
        </span>
        {showDirty && (
          <span className="bg-primary/60 size-1.5 shrink-0 rounded-full" />
        )}
        {tab.syncStatus === 'saving' && !showDirty && (
          <span className="text-muted-foreground/60 size-1.5 shrink-0 animate-pulse rounded-full bg-current" />
        )}
      </button>

      {/* Close button — closes the tab directly */}
      {showClose ? (
        <button
          type="button"
          aria-label="Close tab"
          className={cn(
            'text-muted-foreground hover:text-foreground flex size-4 shrink-0 items-center justify-center rounded transition-opacity',
            isActive
              ? 'opacity-60 group-hover:opacity-100'
              : 'opacity-0 group-hover:opacity-100'
          )}
          onClick={e => {
            e.stopPropagation();
            onClose();
          }}
        >
          <XIcon className="size-3" />
        </button>
      ) : (
        <span className="size-4 shrink-0" />
      )}

      {/* Active indicator bar */}
      {isActive && (
        <motion.span
          layoutId="active-tab-indicator"
          className="bg-primary absolute right-0 bottom-0 left-0 h-0.5"
        />
      )}
    </motion.div>
  );
}
