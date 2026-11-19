import React from 'react';

interface CommonHeadProps {
  readonly fontFamily?: string;
  readonly primaryColor?: string;
  readonly includeGlassmorphism?: boolean;
}

export default function CommonHead({
  fontFamily,
  primaryColor,
  includeGlassmorphism = false,
}: CommonHeadProps) {
  return (
    <>
      <meta charSet="utf-8" />
      <title>TruckFull</title>
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
      {includeGlassmorphism && (
        <style>{`
          .glassmorphism {
            background: rgba(38, 28, 0.6);
            backdrop-filter: blur(10px);
            -webkit-backdrop-filter: blur(10px);
            border: 1px solid rgba(255, 255, 255, 0.1);
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
