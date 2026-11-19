import React from 'react';

interface CommonHeadSectionProps {
  readonly fontFamily?: string;
  readonly primaryColor?: string;
  readonly title?: string;
  readonly description?: string;
  readonly includeGlassmorphism?: boolean; // Added to support this property
}

function CommonHeadSection({
  fontFamily,
  primaryColor,
  title,
  description,
}: CommonHeadSectionProps) {
  return (
    <>
      <meta charSet="utf-8" />
      {title ? <title>{title}</title> : <title>TruckFull</title>}
      {description ? <meta name="description" content={description} /> : null}
      {fontFamily && (
        <style>{`
          :root {
            --font-family: ${fontFamily};
          }
        `}</style>
      )}
      {primaryColor && (
        <style>{`
          :root {
            --primary-color: ${primaryColor};
          }
        `}</style>
      )}
      <style>{`
        body {
          font-family: ${fontFamily ?? 'sans-serif'};
        }
      `}</style>
    </>
  );
}

// Named export for compatibility
export { CommonHeadSection };

// Also export as default for backward compatibility
export default CommonHeadSection;
