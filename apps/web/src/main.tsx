import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router';

import './index.css';
import { AppRoutes } from './app-routes.tsx';
import { ThemeProvider } from '@/components/theme/provider.tsx';
import { TooltipProvider } from '@/components/ui/tooltip.tsx';
import { AuthProvider } from '@/lib/auth-context.tsx';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <ThemeProvider>
          <TooltipProvider>
            <AppRoutes />
          </TooltipProvider>
        </ThemeProvider>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>
);
