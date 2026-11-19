import React from 'react';

interface PageHeadProps {
  readonly title?: string;
}

export default function PageHead({ title }: PageHeadProps) {
  return (
    <>
      {title && <title>{title}</title>}
      <meta charSet="utf-8" />
      <link href="data:image/x-icon;base64," rel="icon" type="image/x-icon" />
    </>
  );
}
