import { Loader2Icon } from 'lucide-react';
import * as React from 'react';
import { useNavigate, useSearchParams } from 'react-router';

import { useTheme } from '@/components/theme/provider';
import { AUTH_WEB_URL } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { useDocumentTitle } from '@/lib/use-document-title';

function AuthLogo() {
  const { theme } = useTheme();
  return (
    <img
      src={theme === 'dark' ? '/icon.svg' : '/icon-light.svg'}
      alt="ResoMD"
      className="size-11"
    />
  );
}

export function AuthPage() {
  useDocumentTitle('Sign in');
  const { user, isLoading } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  React.useEffect(() => {
    if (isLoading) return;

    if (user) {
      // Already authenticated — go to the intended destination or home.
      const redirect = searchParams.get('redirect') ?? '/';
      navigate(redirect);
      return;
    }

    // Not authenticated — redirect to the central auth service.
    // Pass the original destination through so the auth service can
    // send the user back to the right page after login.
    const redirectPath = searchParams.get('redirect');
    const redirectUrl = redirectPath
      ? `${window.location.origin}${redirectPath}`
      : `${window.location.origin}/`;
    window.location.href = `${AUTH_WEB_URL}/auth?redirect=${encodeURIComponent(
      redirectUrl
    )}&client_id=resomd`;
  }, [isLoading, user, navigate, searchParams]);

  return (
    <div className="bg-background relative flex min-h-svh flex-col items-center justify-center p-6">
      <div className="flex flex-col items-center gap-4">
        <AuthLogo />
        <div className="text-muted-foreground flex items-center gap-2 text-sm">
          <Loader2Icon className="size-4 animate-spin" />
          Redirecting to sign in…
        </div>
      </div>
    </div>
  );
}

export default AuthPage;
