import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeftIcon, EyeIcon, EyeOffIcon, Loader2Icon } from 'lucide-react';
import * as React from 'react';
import { Link, useNavigate } from 'react-router';

import { useTheme } from '@/components/theme/provider';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ApiError } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';

type PageTab = 'login' | 'register';

const TABS: { id: PageTab; label: string }[] = [
  { id: 'login', label: 'Sign In' },
  { id: 'register', label: 'Sign Up' },
];

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
  const { login, register } = useAuth();
  const navigate = useNavigate();

  const [tab, setTab] = React.useState<PageTab>('login');
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [displayName, setDisplayName] = React.useState('');
  const [showPassword, setShowPassword] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [error, setError] = React.useState('');

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setIsSubmitting(true);
    try {
      if (tab === 'login') {
        await login(email, password);
      } else {
        await register(email, password, displayName || undefined);
      }
      navigate('/');
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : 'Something went wrong'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-background relative flex min-h-svh flex-col items-center justify-center p-6">
      <Link
        to="/"
        className="text-muted-foreground hover:text-foreground absolute top-6 left-6 flex items-center gap-1.5 text-sm transition-colors"
      >
        <ArrowLeftIcon className="size-4" />
        Back
      </Link>

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex w-full max-w-[420px] flex-col gap-8"
      >
        <div className="flex flex-col items-center gap-3">
          <AuthLogo />
        </div>

        <Card className="border-border bg-transparent">
          <CardHeader className="pt-0 pb-0">
            <Tabs
              value={tab}
              onValueChange={value => setTab(value as PageTab)}
              className="w-full"
            >
              <TabsList className="w-full border bg-transparent">
                {TABS.map(t => (
                  <TabsTrigger
                    key={t.id}
                    value={t.id}
                    className={t.id === tab ? 'bg-border!' : undefined}
                  >
                    {t.label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </CardHeader>

          <CardContent className="flex flex-col gap-5 pt-2">
            <form onSubmit={submit} className="flex flex-col gap-0">
              <AnimatePresence mode="wait">
                {tab === 'register' && (
                  <motion.div
                    key="displayName"
                    initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                    animate={{ opacity: 1, height: 'auto', marginBottom: 16 }}
                    exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                    style={{ overflow: 'hidden' }}
                  >
                    <div className="flex flex-col gap-1.5">
                      <Label
                        htmlFor="displayName"
                        className="text-secondary-foreground/80 text-[0.8rem] font-semibold"
                      >
                        Display Name (optional)
                      </Label>
                      <Input
                        id="displayName"
                        type="text"
                        value={displayName}
                        onChange={event => setDisplayName(event.target.value)}
                        placeholder="How you want to be called"
                        autoComplete="name"
                      />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="mb-4 flex flex-col gap-1.5">
                <Label
                  htmlFor="email"
                  className="text-secondary-foreground/80 text-[0.8rem] font-semibold"
                >
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={event => setEmail(event.target.value)}
                  required
                  placeholder="your@email.com"
                  autoComplete="email"
                />
              </div>

              <div className="mb-4 flex flex-col gap-1.5">
                <Label
                  htmlFor="password"
                  className="text-secondary-foreground/80 text-[0.8rem] font-semibold"
                >
                  Password
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={event => setPassword(event.target.value)}
                    required
                    minLength={tab === 'register' ? 8 : undefined}
                    placeholder={
                      tab === 'register' ? 'At least 8 characters' : '••••••••'
                    }
                    autoComplete={
                      tab === 'login' ? 'current-password' : 'new-password'
                    }
                    className="pr-9"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-xs"
                    onClick={() => setShowPassword(value => !value)}
                    className="text-muted-foreground hover:text-foreground absolute top-1/2 right-2 -translate-y-1/2"
                  >
                    {showPassword ? (
                      <EyeOffIcon className="size-3.5" />
                    ) : (
                      <EyeIcon className="size-3.5" />
                    )}
                  </Button>
                </div>
              </div>

              {error && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-destructive bg-destructive/10 mb-4 rounded-lg px-3 py-2 text-[0.82rem]"
                >
                  {error}
                </motion.p>
              )}

              <Button type="submit" size="lg" disabled={isSubmitting}>
                {isSubmitting ? (
                  <Loader2Icon className="size-4 animate-spin" />
                ) : tab === 'login' ? (
                  'Sign In'
                ) : (
                  'Create Account'
                )}
              </Button>
            </form>

            <p className="text-muted-foreground text-center text-[0.72rem] leading-relaxed">
              By continuing, you agree to our{' '}
              <Link to="/privacy" className="text-foreground/70 underline-offset-2 hover:underline">
                Privacy Policy
              </Link>{' '}
              and{' '}
              <Link to="/terms" className="text-foreground/70 underline-offset-2 hover:underline">
                Terms
              </Link>
              .
            </p>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}

export default AuthPage;
