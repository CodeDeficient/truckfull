'use client';

import React from 'react';
import { Turnstile, type TurnstileInstance } from '@marsidev/react-turnstile';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Eye, EyeOff, Shield, AlertCircle, Loader2 } from 'lucide-react';

interface AuthError {
  message: string;
  field?: string;
  code?: string;
}

interface PasswordStrength {
  score: number;
  feedback: string[];
  isValid: boolean;
}

interface AuthEmailFormProps {
  readonly email: string;
  readonly password: string;
  readonly isLoading: boolean;
  readonly mode: 'signin' | 'signup';
  readonly error?: AuthError;
  readonly showPassword?: boolean;
  readonly passwordStrength?: PasswordStrength;
  readonly turnstileSiteKey?: string;
  readonly turnstileToken: string;
  readonly turnstileResetSignal?: number;
  readonly theme?: 'light' | 'dark';
  readonly onEmailChange: (email: string) => void;
  readonly onPasswordChange: (password: string) => void;
  readonly onTurnstileTokenChange: (token: string) => void;
  readonly onSubmit: (e: React.FormEvent) => void;
  readonly onToggleMode: () => void;
  readonly onTogglePasswordVisibility?: () => void;
  readonly onForgotPassword?: () => void;
}

const getStrengthColor = (score: number) => {
  switch (score) {
    case 0:
    case 1: {
      return 'bg-red-500';
    }
    case 2: {
      return 'bg-yellow-500';
    }
    case 3: {
      return 'bg-blue-500';
    }
    case 4: {
      return 'bg-green-500';
    }
    default: {
      return 'bg-gray-200';
    }
  }
};

const getStrengthText = (score: number) => {
  switch (score) {
    case 0:
    case 1: {
      return 'Weak';
    }
    case 2: {
      return 'Fair';
    }
    case 3: {
      return 'Good';
    }
    case 4: {
      return 'Strong';
    }
    default: {
      return '';
    }
  }
};

const PasswordStrengthIndicator: React.FC<{ strength: PasswordStrength }> = ({ strength }) => {
  return (
    <div className="mt-2 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">
          Password strength: {getStrengthText(strength.score)}
        </span>
        <Shield className={`size-3 ${strength.isValid ? 'text-green-500' : 'text-gray-400'}`} />
      </div>
      <div className="flex gap-1">
        {[0, 1, 2, 3].map((level) => (
          <div
            key={level}
            className={`h-1 flex-1 rounded-full ${
              level < strength.score
                ? getStrengthColor(strength.score)
                : 'bg-muted'
            }`}
          />
        ))}
      </div>
      {strength.feedback.length > 0 && (
        <ul className="text-xs text-muted-foreground space-y-1">
          {strength.feedback.map((feedback, index) => (
            <li key={index} className="flex items-center gap-1">
              <AlertCircle className="size-3 text-yellow-500" />
              {feedback}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

interface SignupTurnstileProps {
  readonly siteKey: string;
  readonly resetSignal: number;
  readonly theme: 'light' | 'dark';
  readonly onTokenChange: (token: string) => void;
}

type WidgetStatus = 'loading' | 'solved' | 'error';

const SignupTurnstile: React.FC<SignupTurnstileProps> = ({
  siteKey,
  resetSignal,
  theme,
  onTokenChange,
}) => {
  const turnstileRef = React.useRef<TurnstileInstance | undefined>(undefined);
  const [status, setStatus] = React.useState<WidgetStatus>('loading');

  // Reset the widget after a failed submitted attempt: Turnstile tokens are
  // single-use, so the widget must re-render a fresh challenge.
  React.useEffect(() => {
    if (resetSignal > 0) {
      turnstileRef.current?.reset();
      onTokenChange('');
      setStatus('loading');
    }
  }, [resetSignal, onTokenChange]);

  return (
    <div className="space-y-1">
      {/* Explicit reserved area between the Terms checkbox and the submit
       * button so the security check is always visible and the form does not
       * jump when the widget mounts. `appearance: always` + `size: flexible`
       * make the rendered challenge explicit (not a hidden invisible mode).
       * The status line has its own fixed-height slot so the button below
       * never shifts between loading, solved, and error states. */}
      <div
        className="w-full min-h-[5.5rem] overflow-visible"
        data-testid="signup-turnstile-area"
      >
        <Turnstile
          ref={turnstileRef}
          siteKey={siteKey}
          options={{
            action: 'signup',
            appearance: 'always',
            size: 'flexible',
            theme,
          }}
          onWidgetLoad={() => setStatus((prev) => (prev === 'solved' ? prev : 'loading'))}
          onSuccess={(token) => {
            setStatus('solved');
            onTokenChange(token);
          }}
          onError={() => {
            setStatus('error');
            onTokenChange('');
          }}
          onExpire={() => {
            setStatus('loading');
            onTokenChange('');
          }}
        />
      </div>
      <div className="flex h-4 items-center">
        {status === 'loading' && (
          <p className="text-xs text-muted-foreground" data-testid="turnstile-status">
            Security check loading…
          </p>
        )}
        {status === 'error' && (
          <p className="text-xs text-destructive" data-testid="turnstile-status">
            Security check failed. Please try again.
          </p>
        )}
      </div>
    </div>
  );
};

export const AuthEmailForm: React.FC<AuthEmailFormProps> = ({
  email,
  password,
  isLoading,
  mode,
  error,
  showPassword = false,
  passwordStrength,
  turnstileSiteKey,
  turnstileToken,
  turnstileResetSignal = 0,
  theme,
  onEmailChange,
  onPasswordChange,
  onTurnstileTokenChange,
  onSubmit,
  onToggleMode,
  onTogglePasswordVisibility,
  onForgotPassword,
}) => {
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => onEmailChange(e.target.value)}
          disabled={isLoading}
          className={error?.field === 'email' ? 'border-destructive' : ''}
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <div className="relative">
          <Input
            id="password"
            type={showPassword ? 'text' : 'password'}
            placeholder="••••••••"
            value={password}
            onChange={(e) => onPasswordChange(e.target.value)}
            disabled={isLoading}
            className={`pr-10 ${error?.field === 'password' ? 'border-destructive' : ''}`}
            required
          />
          {onTogglePasswordVisibility && (
            <button
              type="button"
              onClick={onTogglePasswordVisibility}
              className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground hover:text-foreground"
              disabled={isLoading}
            >
              {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          )}
        </div>

        {mode === 'signup' && passwordStrength && password && (
          <PasswordStrengthIndicator strength={passwordStrength} />
        )}
      </div>

      {mode === 'signup' && (
        <div className="flex items-start space-x-2">
          <input
            id="terms-agreement"
            type="checkbox"
            required
            className="mt-1"
            disabled={isLoading}
          />
          <label htmlFor="terms-agreement" className="text-sm text-muted-foreground">
            I agree to the{' '}
            <a
              href="/terms"
              className="text-blue-400 hover:underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              Terms of Service
            </a>{' '}
            and{' '}
            <a
              href="/privacy"
              className="text-blue-400 hover:underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              Privacy Policy
            </a>
          </label>
        </div>
      )}

      {mode === 'signup' && turnstileSiteKey && (
        <SignupTurnstile
          siteKey={turnstileSiteKey}
          resetSignal={turnstileResetSignal}
          theme={theme === 'dark' ? 'dark' : 'light'}
          onTokenChange={onTurnstileTokenChange}
        />
      )}

      <Button
        type="submit"
        className="w-full bg-primary/10 text-primary font-semibold hover:bg-primary/15 no-hover-effects"
        disabled={
          isLoading ||
          !email ||
          !password ||
          (mode === 'signup' && passwordStrength && !passwordStrength.isValid) ||
          (mode === 'signup' && !turnstileToken)
        }
      >
        {isLoading && <Loader2 className="mr-2 size-4 animate-spin" />}
        {(() => {
          if (isLoading) {
            return mode === 'signin' ? 'Signing in...' : 'Creating account...';
          }
          return mode === 'signin' ? 'Sign In' : 'Create Account';
        })()}
      </Button>
      <div className="text-center">
        <button
          type="button"
          onClick={onToggleMode}
          className="text-sm text-blue-400 hover:text-blue-300"
          disabled={isLoading}
        >
          {mode === 'signin'
            ? "Don't have an account? Sign up"
            : 'Already have an account? Sign in'}
        </button>
      </div>
      {mode === 'signin' && onForgotPassword && (
        <div className="text-center">
          <button
            type="button"
            onClick={onForgotPassword}
            className="text-sm text-muted-foreground hover:text-foreground"
            disabled={isLoading}
          >
            Forgot your password?
          </button>
        </div>
      )}
    </form>
  );
};
