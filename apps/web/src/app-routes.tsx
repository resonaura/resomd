import { Route, Routes } from 'react-router';

import App from '@/app';
import { AccountPage } from '@/pages/account-page';
import { AdminPage } from '@/pages/admin-page';
import { AuthPage } from '@/pages/auth-page';
import { FilesPage } from '@/pages/files-page';
import { PrivacyPage } from '@/pages/privacy-page';
import { TermsPage } from '@/pages/terms-page';

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<App />} />
      <Route path="/d/:documentId" element={<App />} />
      <Route path="/auth" element={<AuthPage />} />
      <Route path="/account" element={<AccountPage />} />
      <Route path="/files" element={<FilesPage />} />
      <Route path="/admin" element={<AdminPage />} />
      <Route path="/privacy" element={<PrivacyPage />} />
      <Route path="/terms" element={<TermsPage />} />
    </Routes>
  );
}
