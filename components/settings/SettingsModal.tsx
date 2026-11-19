'use client';

import { useEffect, useCallback, useState } from 'react';
import { User, Palette } from 'lucide-react';
import { BaseModal } from '@/components/ui/modal/BaseModal';
import { Button } from '@/components/ui/button';
import { DeleteAccountButton } from '@/components/settings/DeleteAccountButton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { getSupabase } from '@/lib/supabase/client';
import { useSettingsModalStore } from '@/lib/stores/useSettingsModalStore';
import { useSafeAuth } from '@/lib/auth/useSafeAuth';
import { useThemeSwitcher } from '@/components/ThemeProvider';
import { useModalLifecycle } from '@/hooks/useModalLifecycle';

/**
 * Comprehensive settings modal component
 * Contains all user settings organized in tabs
 */
// Tab subcomponents to reduce main function length
function GeneralTab({
  email,
  setEmail,
}: {
  readonly email: string;
  readonly setEmail: (e: string) => void;
}) {
  return (
    <TabsContent value="general" className="space-y-4">
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Account</h3>
        <div className="space-y-3">
          <div className="grid gap-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Changing your email will require verification
            </p>
          </div>
        </div>
        <Separator />
        <div className="space-y-3">
          <h4 className="text-sm font-medium">Account Actions</h4>
          <div className="space-y-2">
            <DeleteAccountButton />
          </div>
        </div>
      </div>
    </TabsContent>
  );
}

function AppearanceTab({
  theme,
  setTheme,
}: {
  readonly theme: string | undefined;
  readonly setTheme: (t: string) => void;
}) {
  return (
    <TabsContent value="appearance" className="space-y-4">
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Appearance</h3>
        <div className="space-y-3">
          <div className="grid gap-2">
            <Label htmlFor="theme">Theme</Label>
            <Select value={theme} onValueChange={setTheme}>
              <SelectTrigger id="theme">
                <SelectValue placeholder="Select a theme" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="light">Light</SelectItem>
                <SelectItem value="dark">Dark</SelectItem>
                <SelectItem value="system">System</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">Choose how the app looks to you</p>
          </div>
        </div>
      </div>
    </TabsContent>
  );
}

interface SettingsModalProps {
  readonly isOpen?: boolean;
  readonly onClose?: () => void;
}

export function SettingsModal({
  isOpen: externalIsOpen,
  onClose: externalOnClose,
}: SettingsModalProps) {
  const {
    isOpen: storeIsOpen,
    closeModal: storeCloseModal,
    activeSection,
    setActiveSection,
  } = useSettingsModalStore();
  const { user } = useSafeAuth();
  const { theme, setTheme } = useThemeSwitcher();
  const [email, setEmail] = useState('');

  // Sync email state with user data
  useEffect(() => {
    if (user?.email) {
      setEmail(user.email);
    }
  }, [user?.email]);

  // Determine the actual open state based on external prop or store
  const actualIsOpen = externalIsOpen ?? storeIsOpen;
  const closeModalHandler = externalOnClose ?? storeCloseModal;

  const { dialogRef, onOpen, onClose } = useModalLifecycle(closeModalHandler);

  useEffect(() => {
    // Use external state if provided, otherwise use store state
    if (externalIsOpen === undefined) {
      if (storeIsOpen) {
        onOpen();
      } else {
        onClose();
      }
    } else {
      if (externalIsOpen) {
        onOpen();
      } else {
        onClose();
      }
    }
  }, [externalIsOpen, storeIsOpen, onOpen, onClose]);

  // Tab navigation with keyboard
  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    if (event.key === 'Tab' && dialogRef.current) {
      const focusableElements = dialogRef.current.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      );
      const nodes = [...focusableElements] as HTMLElement[];
      const firstElement = nodes[0];
      const lastElement = nodes.at(-1) as HTMLElement;

      if (event.shiftKey && document.activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
      } else if (!event.shiftKey && document.activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    }
  }, []);

  return (
    <BaseModal
      open={actualIsOpen}
      onClose={closeModalHandler}
      title={<span className="text-xl">Settings</span>}
      description={<span>Manage your account settings and preferences</span>}
      ref={dialogRef}
      contentProps={{
        className: 'sm:max-w-[700px] max-h-[90vh] overflow-hidden flex flex-col',
        onKeyDown: handleKeyDown,
        role: 'dialog',
      }}
    >
      <Tabs
        value={activeSection}
        onValueChange={setActiveSection}
        className="flex-1 overflow-hidden flex flex-col"
      >
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="general" className="text-xs">
            <User className="w-3 h-3 mr-1" />
            General
          </TabsTrigger>
          <TabsTrigger value="appearance" className="text-xs">
            <Palette className="w-3 h-3 mr-1" />
            Theme
          </TabsTrigger>
        </TabsList>

        <div className="flex-1 overflow-y-auto mt-4">
          <GeneralTab email={email} setEmail={setEmail} />
          <AppearanceTab theme={theme} setTheme={setTheme} />
        </div>
      </Tabs>

      <div className="flex justify-end gap-2 pt-4 border-t">
        <Button variant="outline" onClick={closeModalHandler}>
          Cancel
        </Button>
        <Button
          onClick={async () => {
            // Handle Email Update
            if (email && email !== user?.email) {
              const supabase = getSupabase();
              const { error: emailError } = await supabase.auth.updateUser({
                email: email,
              });

              if (emailError) {
                toast.error(`Email update failed: ${emailError.message}`);
                return; // Stop if error, keep modal open
              }

              toast.info('Confirmation email sent to your new address.');
            }

            closeModalHandler();
          }}
        >
          Save Changes
        </Button>
      </div>
    </BaseModal>
  );
}
