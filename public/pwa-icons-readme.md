# Placeholder for PWA icons

For a production PWA, you would need to generate these icon files:

1. `android-chrome-192x192.png` - 192x192 pixels PNG
2. `android-chrome-512x512.png` - 512x512 pixels PNG
3. `apple-touch-icon.png` - 180x180 pixels PNG

You can generate these from your existing `food-truck-icon.svg` using image processing tools like Sharp in Node.js, or online SVG to PNG converters.

For now, the PWA will still work with the SVG icons in the manifest, but having PNG versions will improve compatibility with all browsers and platforms.
