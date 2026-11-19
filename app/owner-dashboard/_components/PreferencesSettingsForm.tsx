import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel } from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Palette } from 'lucide-react';
import { logError } from '@/lib/logging';

const preferenceSettingsSchema = z.object({
  animations: z.boolean(),
});

type PreferenceSettingsFormValues = z.infer<typeof preferenceSettingsSchema>;

interface PreferencesSettingsFormProps {
  readonly onSubmit: (data: PreferenceSettingsFormValues) => Promise<void> | void;
  readonly isSaving: boolean;
  readonly resetForm: () => void;
  readonly settings: Partial<PreferenceSettingsFormValues>;
}

const SWITCH_ROW = 'flex flex-row items-center justify-between rounded-lg bg-muted/30 p-2.5';
const SECTION_DIVIDER = 'py-2 border-t border-border/20';

export function PreferencesSettingsForm({
  onSubmit,
  isSaving,
  resetForm,
  settings,
}: PreferencesSettingsFormProps) {
  const preferenceForm = useForm<PreferenceSettingsFormValues>({
    resolver: zodResolver(preferenceSettingsSchema),
    defaultValues: settings,
  });

  const isLoading = isSaving;

  useEffect(() => {
    preferenceForm.reset(settings);
  }, [preferenceForm, settings]);

  const handleSubmit = async (data: PreferenceSettingsFormValues) => {
    try {
      await onSubmit(data);
    } catch (error) {
      logError('Error submitting preferences', error);
    }
  };

  return (
    <Form {...preferenceForm}>
      <form onSubmit={preferenceForm.handleSubmit(handleSubmit)} className="space-y-3">
        <div className="flex items-center gap-2">
          <Palette className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium">Display</span>
        </div>
        <FormField
          control={preferenceForm.control}
          name="animations"
          render={({ field }) => (
            <FormItem className={SWITCH_ROW}>
              <div>
                <FormLabel className="text-sm">Animations</FormLabel>
                <p className="text-xs text-muted-foreground">Smooth transitions in the schedule calendar</p>
              </div>
              <FormControl>
                <Switch checked={field.value} onCheckedChange={field.onChange} aria-label="Toggle animations" disabled={isLoading} />
              </FormControl>
            </FormItem>
          )}
        />
        <div className={SECTION_DIVIDER} />

        <div className="flex flex-col gap-2">
          <Button type="submit" className="w-full bg-green-600/10 text-green-600 font-semibold hover:bg-green-600/15 hover:shadow-none hover:scale-100" disabled={isLoading}>
            {isSaving ? 'Saving...' : 'Save Preferences'}
          </Button>
          <Button
            type="button"
            variant="ghost"
            className="w-full text-muted-foreground hover:text-foreground hover:shadow-none hover:scale-100 hover:bg-muted/50 transition-none"
            onClick={() => resetForm()}
            disabled={isLoading}
          >
            Reset to Defaults
          </Button>
        </div>
      </form>
    </Form>
  );
}
