// Wrapper around the root token-based Tailwind config.
// The theme (colors, spacing, radius, shadows from renderer/design-tokens.json)
// lives in the root tailwind.config.js; this file only overrides the content
// globs so classes used by the renderer app are picked up.
const rootConfig = require('../tailwind.config.js');

module.exports = {
  ...rootConfig,
  content: [
    './pages/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
    './app/**/*.{js,ts,jsx,tsx}',
  ],
};

