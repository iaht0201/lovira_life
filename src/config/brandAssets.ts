/**
 * Brand Assets Configuration
 * Optimized WebP static assets served directly from /public/brand/
 * Lightweight (<1MB total), instant loading on all devices and network conditions.
 */

export const BRAND_IMAGES = {
  logo: '/brand/lovira-logo.webp',
  logoIcon: '/brand/lovira-logo-icon.webp',
  avatar: '/brand/lovira-avatar.webp',
  banner: '/brand/lovira-banner.webp',
  pwa192: '/brand/pwa-192.png',
  pwa512: '/brand/pwa-512.png',
} as const;

export default BRAND_IMAGES;
