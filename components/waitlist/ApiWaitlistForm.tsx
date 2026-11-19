'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

type FormState = 'idle' | 'sending' | 'joined' | 'failed';

async function joinApiWaitlist(email: string): Promise<boolean> {
  const response = await fetch('/api/events/waitlist', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, role: 'api_customer' }),
  });
  return response.ok;
}

export function ApiWaitlistForm(): React.JSX.Element {
  const [email, setEmail] = useState('');
  const [state, setState] = useState<FormState>('idle');

  const handleSubmit = async (event: React.FormEvent): Promise<void> => {
    event.preventDefault();
    setState('sending');
    try {
      setState((await joinApiWaitlist(email)) ? 'joined' : 'failed');
    } catch {
      setState('failed');
    }
  };

  if (state === 'joined') {
    return <p className="text-foreground">You are on the list. We will email you when it opens.</p>;
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 sm:flex-row">
      <Input
        type="email"
        placeholder="you@company.com"
        aria-label="Email"
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        required
      />
      <Button type="submit" disabled={state === 'sending'}>
        {state === 'sending' ? 'Joining...' : 'Join the waitlist'}
      </Button>
      {state === 'failed' && (
        <p role="alert" className="text-sm text-destructive">
          That did not go through. Please try again in a minute.
        </p>
      )}
    </form>
  );
}
