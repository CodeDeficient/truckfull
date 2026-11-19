type OgStyles = Record<string, string | number>;

const CONTAINER: OgStyles = {
  width: '100%',
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
  backgroundColor: '#0a0a0a',
  padding: '60px 80px',
  position: 'relative',
  overflow: 'hidden',
};

const GLOW_CIRCLE: OgStyles = {
  position: 'absolute',
  top: '-100px',
  right: '-100px',
  width: '400px',
  height: '400px',
  borderRadius: '50%',
  background: 'radial-gradient(circle, rgba(234,88,12,0.15) 0%, transparent 70%)',
};

const HEADER_ROW: OgStyles = {
  display: 'flex',
  alignItems: 'center',
  gap: '16px',
  marginBottom: '40px',
};

const ACCENT_BAR: OgStyles = {
  display: 'flex',
  width: '60px',
  height: '4px',
  backgroundColor: '#ea580c',
  borderRadius: '2px',
  marginBottom: '24px',
};

const TITLE: OgStyles = {
  fontSize: '64px',
  fontWeight: 800,
  color: '#ffffff',
  margin: '0 0 12px 0',
  lineHeight: 1.1,
  letterSpacing: '-0.03em',
};

const LOCATION: OgStyles = {
  fontSize: '28px',
  color: '#a1a1aa',
  margin: '0 0 24px 0',
  fontWeight: 500,
};

const CUISINE_TAG: OgStyles = {
  display: 'flex',
  padding: '8px 20px',
  borderRadius: '9999px',
  backgroundColor: 'rgba(234,88,12,0.15)',
  color: '#fb923c',
  fontSize: '20px',
  fontWeight: 600,
};

const CUISINE_TAG_ROW: OgStyles = {
  display: 'flex',
  gap: '10px',
  flexWrap: 'wrap',
};

const BODY: OgStyles = {
  display: 'flex',
  flexDirection: 'column',
  flex: 1,
  justifyContent: 'center',
};

const FOOTER: OgStyles = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  borderTop: '1px solid #27272a',
  paddingTop: '24px',
  marginTop: 'auto',
};

const FOOTER_SUBTITLE: OgStyles = {
  fontSize: '18px',
  color: '#71717a',
  fontWeight: 500,
};

const FOOTER_BRAND: OgStyles = {
  fontSize: '20px',
  color: '#ea580c',
  fontWeight: 700,
  letterSpacing: '-0.01em',
};

const BRAND_TEXT: OgStyles = {
  fontSize: '24px',
  fontWeight: 700,
  color: '#ffffff',
  letterSpacing: '-0.02em',
};

const ICON_WRAPPER: OgStyles = {
  borderRadius: '12px',
};

export function buildOgStyles() {
  return {
    container: CONTAINER,
    glowCircle: GLOW_CIRCLE,
    headerRow: HEADER_ROW,
    accentBar: ACCENT_BAR,
    title: TITLE,
    location: LOCATION,
    cuisineTag: CUISINE_TAG,
    cuisineTagRow: CUISINE_TAG_ROW,
    body: BODY,
    footer: FOOTER,
    footerSubtitle: FOOTER_SUBTITLE,
    footerBrand: FOOTER_BRAND,
    brandText: BRAND_TEXT,
    iconWrapper: ICON_WRAPPER,
  };
}
