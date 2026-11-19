'use client';

import { SharedAuthPage } from './SharedAuthPage';

interface AuthenticationPageProps {
  readonly mode: 'login' | 'register';
  readonly title: string;
  readonly linkText: string;
  readonly linkHref: string;
}

export default function AuthenticationPage({
  mode,
  title,
  linkText,
  linkHref,
}: AuthenticationPageProps) {
  return <SharedAuthPage mode={mode} title={title} linkText={linkText} linkHref={linkHref} />;
}
