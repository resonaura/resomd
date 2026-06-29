import { ArrowLeftIcon } from 'lucide-react';
import { Link } from 'react-router';

import { useTheme } from '@/components/theme/provider';
import { Button } from '@/components/ui/button';

interface PageShellProps {
  title: string;
  children: React.ReactNode;
  maxWidth?: string;
}

export function PageShell({
  title,
  children,
  maxWidth = 'max-w-md',
}: PageShellProps) {
  const { theme } = useTheme();

  return (
    <div className="bg-background flex min-h-svh flex-col">
      <header className="border-border flex h-14 shrink-0 items-center justify-between border-b px-3 sm:h-12 sm:px-4">
        <Link
          to="/"
          className="text-muted-foreground hover:text-foreground flex items-center gap-2 text-sm font-medium transition-colors"
        >
          <img
            src={theme === 'dark' ? '/icon.svg' : '/icon-light.svg'}
            alt="ResoMD"
            className="size-5"
          />
          <span className="hidden sm:inline">ResoMD</span>
        </Link>
        <Button
          variant="ghost"
          size="sm"
          className="max-sm:size-10 max-sm:px-0"
          render={<Link to="/" />}
        >
          <ArrowLeftIcon className="size-4" />
          <span className="hidden sm:inline">Back to editor</span>
          <span className="sr-only sm:hidden">Back to editor</span>
        </Button>
      </header>

      <main className="flex flex-1 justify-center px-4 py-8 sm:py-12">
        <div className={`w-full ${maxWidth}`}>
          <h1 className="font-heading mb-6 text-2xl font-medium">{title}</h1>
          {children}
        </div>
      </main>

      <footer className="text-muted-foreground flex justify-center gap-4 px-4 py-6 text-xs">
        <Link to="/privacy" className="hover:text-foreground">
          Privacy Policy
        </Link>
        <Link to="/terms" className="hover:text-foreground">
          Terms of Use
        </Link>
      </footer>
    </div>
  );
}
