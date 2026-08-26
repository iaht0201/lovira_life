/**
 * Brand Assets Configuration
 * Bundled binary images directly embedded in app bundle for reliable display without 404s
 */
import { APP_IMAGES } from '../assets/images';

export const BRAND_IMAGES = {
  logo: APP_IMAGES.logo,
  logoIcon: APP_IMAGES.logoIcon,
  logoFull: APP_IMAGES.logoFull,
  avatar: APP_IMAGES.avatar,
  banner: APP_IMAGES.banner,
  logoClient: APP_IMAGES.logoClient,
} as const;

export default BRAND_IMAGES;


