'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { parseAndAddTruck } from '../actions';
import { toast } from 'sonner';
import { Plus, Sparkles } from 'lucide-react';

export function AddTruckButton() {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    if (!text.trim()) return;

    setLoading(true);
    const result = await parseAndAddTruck(text);
    setLoading(false);

    if (result.success) {
      setOpen(false);
      setText('');
      toast.success(result.message || 'Truck added successfully');
    } else {
      toast.error(result.error || 'Failed to add truck');
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="size-4" />
          Add New Truck
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Quick Add Food Truck</DialogTitle>
          <DialogDescription>
            Paste raw text from Facebook or a list. AI will parse and add it.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="raw-text">Raw Text / URL</Label>
            <Textarea
              id="raw-text"
              placeholder="Paste truck details here..."
              className="h-[200px]"
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading || !text.trim()} className="gap-2">
            {loading ? (
              'Processing...'
            ) : (
              <>
                <Sparkles className="size-4" />
                Parse & Add
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
