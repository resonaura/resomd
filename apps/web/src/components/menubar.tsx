import {
  BoldIcon,
  CodeIcon,
  ColumnsIcon,
  DownloadIcon,
  ExternalLinkIcon,
  EyeIcon,
  FileDownIcon,
  FilePlusIcon,
  FileUpIcon,
  HelpCircleIcon,
  ImageIcon,
  InfoIcon,
  ItalicIcon,
  LinkIcon,
  MoonIcon,
  PanelLeftIcon,
  PencilIcon,
  PrinterIcon,
  Redo2Icon,
  SaveIcon,
  ScissorsIcon,
  SearchIcon,
  SquarePenIcon,
  StrikethroughIcon,
  SunIcon,
  TableIcon,
  Undo2Icon,
} from 'lucide-react';

import { useTheme } from '@/components/theme/provider';
import {
  MenubarContent,
  MenubarItem,
  MenubarMenu,
  Menubar as MenubarRoot,
  MenubarSeparator,
  MenubarShortcut,
  MenubarTrigger,
} from '@/components/ui/menubar';
import { formatShortcut, type Platform } from '@/lib/platform';
import { cn } from '@/lib/utils';

export interface MenubarActions {
  // File
  newDocument: () => void;
  openFile: () => void;
  save: () => void;
  saveAs: () => void;
  exportPdf: () => void;
  print: () => void;
  rename: () => void;
  // Edit (Monaco-triggered)
  undo: () => void;
  redo: () => void;
  find: () => void;
  replace: () => void;
  selectAll: () => void;
  // View
  setMode: (mode: 'editor' | 'split' | 'preview') => void;
  toggleSidebar: () => void;
  toggleTheme: () => void;
  // Format
  formatBold: () => void;
  formatItalic: () => void;
  formatStrikethrough: () => void;
  insertLink: () => void;
  insertImage: () => void;
  insertCodeBlock: () => void;
  insertTable: () => void;
}

interface MenubarProps {
  actions: MenubarActions;
  platform: Platform;
  sidebarVisible: boolean;
  onAbout: () => void;
  className?: string;
}

export function Menubar({
  actions,
  platform,
  sidebarVisible,
  onAbout,
  className,
}: MenubarProps) {
  const { theme } = useTheme();

  return (
    <MenubarRoot
      className={cn(
        'bg-background hidden h-8 shrink-0 gap-0.5 rounded-none p-0 px-1 md:flex',
        className
      )}
    >
      <MenubarMenu>
        <MenubarTrigger className="h-8 px-2.5 text-xs">File</MenubarTrigger>
        <MenubarContent align="start" sideOffset={2} className="min-w-52">
          <MenubarItem onClick={actions.newDocument}>
            <FilePlusIcon className="size-3.5" />
            New
            <MenubarShortcut>{formatShortcut('mod+n')}</MenubarShortcut>
          </MenubarItem>
          <MenubarItem onClick={actions.openFile}>
            <FileUpIcon className="size-3.5" />
            Open File…
            <MenubarShortcut>{formatShortcut('mod+o')}</MenubarShortcut>
          </MenubarItem>
          <MenubarSeparator />
          <MenubarItem onClick={actions.save}>
            <SaveIcon className="size-3.5" />
            Save
            <MenubarShortcut>{formatShortcut('mod+s')}</MenubarShortcut>
          </MenubarItem>
          <MenubarItem onClick={actions.saveAs}>
            <DownloadIcon className="size-3.5" />
            Save As…
            <MenubarShortcut>{formatShortcut('mod+shift+s')}</MenubarShortcut>
          </MenubarItem>
          <MenubarItem onClick={actions.rename}>
            <PencilIcon className="size-3.5" />
            Rename…
          </MenubarItem>
          <MenubarSeparator />
          <MenubarItem onClick={actions.exportPdf}>
            <FileDownIcon className="size-3.5" />
            Export PDF…
          </MenubarItem>
          <MenubarItem onClick={actions.print}>
            <PrinterIcon className="size-3.5" />
            Print…
            <MenubarShortcut>{formatShortcut('mod+p')}</MenubarShortcut>
          </MenubarItem>
        </MenubarContent>
      </MenubarMenu>

      <MenubarMenu>
        <MenubarTrigger className="h-8 px-2.5 text-xs">Edit</MenubarTrigger>
        <MenubarContent align="start" sideOffset={2} className="min-w-52">
          <MenubarItem onClick={actions.undo}>
            <Undo2Icon className="size-3.5" />
            Undo
            <MenubarShortcut>{formatShortcut('mod+z')}</MenubarShortcut>
          </MenubarItem>
          <MenubarItem onClick={actions.redo}>
            <Redo2Icon className="size-3.5" />
            Redo
            <MenubarShortcut>{formatShortcut('mod+shift+z')}</MenubarShortcut>
          </MenubarItem>
          <MenubarSeparator />
          <MenubarItem onClick={actions.find}>
            <SearchIcon className="size-3.5" />
            Find…
            <MenubarShortcut>{formatShortcut('mod+f')}</MenubarShortcut>
          </MenubarItem>
          <MenubarItem onClick={actions.replace}>
            <ScissorsIcon className="size-3.5" />
            Replace…
            <MenubarShortcut>
              {platform === 'mac'
                ? formatShortcut('mod+alt+f')
                : formatShortcut('mod+h')}
            </MenubarShortcut>
          </MenubarItem>
          <MenubarSeparator />
          <MenubarItem onClick={actions.selectAll}>
            Select All
            <MenubarShortcut>{formatShortcut('mod+a')}</MenubarShortcut>
          </MenubarItem>
        </MenubarContent>
      </MenubarMenu>

      <MenubarMenu>
        <MenubarTrigger className="h-8 px-2.5 text-xs">View</MenubarTrigger>
        <MenubarContent align="start" sideOffset={2} className="min-w-52">
          <MenubarItem onClick={() => actions.setMode('editor')}>
            <SquarePenIcon className="size-3.5" />
            Editor Mode
            <MenubarShortcut>{formatShortcut('mod+1')}</MenubarShortcut>
          </MenubarItem>
          <MenubarItem onClick={() => actions.setMode('split')}>
            <ColumnsIcon className="size-3.5" />
            Split Mode
            <MenubarShortcut>{formatShortcut('mod+2')}</MenubarShortcut>
          </MenubarItem>
          <MenubarItem onClick={() => actions.setMode('preview')}>
            <EyeIcon className="size-3.5" />
            Preview Mode
            <MenubarShortcut>{formatShortcut('mod+3')}</MenubarShortcut>
          </MenubarItem>
          <MenubarSeparator />
          <MenubarItem onClick={actions.toggleSidebar}>
            <PanelLeftIcon className="size-3.5" />
            {sidebarVisible ? 'Hide Sidebar' : 'Show Sidebar'}
            <MenubarShortcut>{formatShortcut('mod+b')}</MenubarShortcut>
          </MenubarItem>
          <MenubarItem onClick={actions.toggleTheme}>
            {theme === 'dark' ? (
              <SunIcon className="size-3.5" />
            ) : (
              <MoonIcon className="size-3.5" />
            )}
            Toggle Theme
            <MenubarShortcut>{formatShortcut('mod+d')}</MenubarShortcut>
          </MenubarItem>
        </MenubarContent>
      </MenubarMenu>

      <MenubarMenu>
        <MenubarTrigger className="h-8 px-2.5 text-xs">Format</MenubarTrigger>
        <MenubarContent align="start" sideOffset={2} className="min-w-52">
          <MenubarItem onClick={actions.formatBold}>
            <BoldIcon className="size-3.5" />
            Bold
            <MenubarShortcut>{formatShortcut('mod+b')}</MenubarShortcut>
          </MenubarItem>
          <MenubarItem onClick={actions.formatItalic}>
            <ItalicIcon className="size-3.5" />
            Italic
            <MenubarShortcut>{formatShortcut('mod+i')}</MenubarShortcut>
          </MenubarItem>
          <MenubarItem onClick={actions.formatStrikethrough}>
            <StrikethroughIcon className="size-3.5" />
            Strikethrough
          </MenubarItem>
          <MenubarSeparator />
          <MenubarItem onClick={actions.insertLink}>
            <LinkIcon className="size-3.5" />
            Insert Link
            <MenubarShortcut>{formatShortcut('mod+k')}</MenubarShortcut>
          </MenubarItem>
          <MenubarItem onClick={actions.insertImage}>
            <ImageIcon className="size-3.5" />
            Insert Image
          </MenubarItem>
          <MenubarItem onClick={actions.insertCodeBlock}>
            <CodeIcon className="size-3.5" />
            Insert Code Block
          </MenubarItem>
          <MenubarItem onClick={actions.insertTable}>
            <TableIcon className="size-3.5" />
            Insert Table
          </MenubarItem>
        </MenubarContent>
      </MenubarMenu>

      <MenubarMenu>
        <MenubarTrigger className="h-8 px-2.5 text-xs">Help</MenubarTrigger>
        <MenubarContent align="start" sideOffset={2} className="min-w-52">
          <MenubarItem
            render={
              <a
                href="https://www.markdownguide.org"
                target="_blank"
                rel="noreferrer"
              />
            }
          >
            <HelpCircleIcon className="size-3.5" />
            Markdown Guide
            <ExternalLinkIcon className="text-muted-foreground ml-auto size-3" />
          </MenubarItem>
          <MenubarItem onClick={onAbout}>
            <InfoIcon className="size-3.5" />
            About
          </MenubarItem>
        </MenubarContent>
      </MenubarMenu>
    </MenubarRoot>
  );
}
