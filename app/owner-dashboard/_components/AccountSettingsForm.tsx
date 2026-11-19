import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { User, Shield, Key, Eye, EyeOff } from 'lucide-react';
import { useSafeAuth } from '@/lib/auth/useSafeAuth';
import { useState } from 'react';

const EMAIL_PATTERN = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

// Define validation schemas
const accountSettingsSchema = z
  .object({
    displayName: z.string().min(2, 'Display name must be at least 2 characters'),
    email: z
      .string()
      .min(1, 'Invalid email address')
      .refine((val) => {
        return EMAIL_PATTERN.test(val);
      }, 'Invalid email address'),
    phone: z.string().optional(),
    currentPassword: z.string().min(1, 'Current password is required for changes').optional(),
    newPassword: z.string().min(8, 'New password must be at least 8 characters').optional(),
    confirmPassword: z.string().optional(),
  })
  .refine((data) => !data.newPassword || data.newPassword === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  })
  .refine(
    (data) => !data.newPassword || (data.currentPassword && data.currentPassword.length > 0),
    {
      message: 'Current password is required to change your password',
      path: ['currentPassword'],
    },
  );

// Define form types
type AccountSettingsFormValues = z.infer<typeof accountSettingsSchema>;

interface AccountSettingsFormProps {
  onSubmit: (data: AccountSettingsFormValues) => void;
  isSaving: boolean;
  resetForm: () => void;
}

import React from 'react';

export function AccountSettingsForm({
  onSubmit,
  isSaving,
  resetForm,
  children,
}: AccountSettingsFormProps & { children?: React.ReactNode }) {
  const { user, loading: authLoading } = useSafeAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);

  // Initialize form with account settings
  const accountForm = useForm<AccountSettingsFormValues>({
    resolver: zodResolver(accountSettingsSchema),
    defaultValues: {
      displayName: ((user?.user_metadata as Record<string, unknown>)?.full_name as string) ?? '',
      email: user?.email ?? '',
      phone: ((user?.user_metadata as Record<string, unknown>)?.phone as string) ?? '',
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
  });

  // Handle password visibility toggle
  const togglePasswordVisibility = () => setShowPassword(!showPassword);
  const toggleNewPasswordVisibility = () => setShowNewPassword(!showNewPassword);

  // Loading state while settings are being saved
  const isLoading = authLoading || isSaving;

  // Wrapper function to handle submit without Promise return type error
  const handleSubmitWrapper = async (e: React.FormEvent) => {
    e.preventDefault();
    await accountForm.handleSubmit(onSubmit)(e);
  };

  return (
    <Form {...accountForm}>
      <form onSubmit={handleSubmitWrapper} className="space-y-4">
        <ProfileInformationSection accountForm={accountForm} isLoading={isLoading} />
        <div className="py-3 border-t border-border/20" />
        <SecuritySettingsSection
          accountForm={accountForm}
          showPassword={showPassword}
          showNewPassword={showNewPassword}
          togglePasswordVisibility={togglePasswordVisibility}
          toggleNewPasswordVisibility={toggleNewPasswordVisibility}
          isLoading={isLoading}
        />
        <div className="py-3 border-t border-border/20" />
        <AccountActionsSection
          isSaving={isSaving}
          isLoading={isLoading}
          onReset={() => {
            accountForm.reset();
            resetForm();
          }}
          children={children}
        />
      </form>
    </Form>
  );
}

const ProfileInformationSection = ({
  accountForm,
  isLoading,
}: {
  accountForm: ReturnType<typeof useForm<AccountSettingsFormValues>>;
  isLoading: boolean;
}) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <User className="h-4 w-4 text-primary" />
        <h3 className="text-lg font-medium">Profile Information</h3>
      </div>

      <FormField
        control={accountForm.control}
        name="displayName"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Display Name</FormLabel>
            <FormControl>
              <Input
                placeholder="Enter your display name"
                {...field}
                aria-describedby="display-name-description"
                disabled={isLoading}
              />
            </FormControl>
            <FormDescription id="display-name-description">
              This is how your name will appear in the app
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={accountForm.control}
        name="email"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Email</FormLabel>
            <FormControl>
              <Input placeholder="your@email.com" {...field} disabled={isLoading} />
            </FormControl>
            <FormDescription>Changing your email will require verification</FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={accountForm.control}
        name="phone"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Phone Number</FormLabel>
            <FormControl>
              <Input
                placeholder="+1 (555) 123-4567"
                {...field}
                aria-describedby="phone-description"
                disabled={isLoading}
              />
            </FormControl>
            <FormDescription id="phone-description">
              Optional: Used for account recovery and notifications
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
};

const SecuritySettingsSection = ({
  accountForm,
  showPassword,
  showNewPassword,
  togglePasswordVisibility,
  toggleNewPasswordVisibility,
  isLoading,
}: {
  accountForm: ReturnType<typeof useForm<AccountSettingsFormValues>>;
  showPassword: boolean;
  showNewPassword: boolean;
  togglePasswordVisibility: () => void;
  toggleNewPasswordVisibility: () => void;
  isLoading: boolean;
}) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Key className="h-4 w-4 text-primary" />
        <h3 className="text-lg font-medium">Security Settings</h3>
      </div>

      <FormField
        control={accountForm.control}
        name="currentPassword"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Current Password</FormLabel>
            <FormControl>
              <div className="relative">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your current password"
                  {...field}
                  aria-describedby="current-password-description"
                  disabled={isLoading}
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 flex items-center pr-3"
                  onClick={togglePasswordVisibility}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  disabled={isLoading}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  )}
                </button>
              </div>
            </FormControl>
            <FormDescription id="current-password-description">
              Required to change your password
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={accountForm.control}
        name="newPassword"
        render={({ field }) => (
          <FormItem>
            <FormLabel>New Password</FormLabel>
            <FormControl>
              <div className="relative">
                <Input
                  type={showNewPassword ? 'text' : 'password'}
                  placeholder="Enter new password"
                  {...field}
                  aria-describedby="new-password-description"
                  disabled={isLoading}
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 flex items-center pr-3"
                  onClick={toggleNewPasswordVisibility}
                  aria-label={showNewPassword ? 'Hide password' : 'Show password'}
                  disabled={isLoading}
                >
                  {showNewPassword ? (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  )}
                </button>
              </div>
            </FormControl>
            <FormDescription id="new-password-description">
              Password must be at least 8 characters and include a mix of letters, numbers, and
              symbols
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={accountForm.control}
        name="confirmPassword"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Confirm New Password</FormLabel>
            <FormControl>
              <Input
                type="password"
                placeholder="Confirm new password"
                {...field}
                disabled={isLoading}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
};

const AccountActionsSection = ({
  isSaving,
  isLoading,
  onReset,
  children,
}: {
  isSaving: boolean;
  isLoading: boolean;
  onReset: () => void;
  children?: React.ReactNode;
}) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Shield className="h-4 w-4 text-primary" />
        <h3 className="text-lg font-medium">Account Actions</h3>
      </div>
      <div className="flex flex-col gap-2">
        <Button type="submit" className="w-full bg-green-600/10 text-green-600 font-semibold hover:bg-green-600/15 hover:shadow-none hover:scale-100" disabled={isLoading}>
          {isSaving ? 'Saving...' : 'Save Account Settings'}
        </Button>
        <Button
          type="button"
          variant="ghost"
          className="w-full text-muted-foreground hover:text-foreground hover:shadow-none hover:scale-100 hover:bg-muted/50 transition-none"
          onClick={onReset}
          disabled={isLoading}
        >
          Reset Changes
        </Button>
        {children}
      </div>
    </div>
  );
};
