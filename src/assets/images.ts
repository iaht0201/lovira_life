import avatarImg from './images/avatar.png';
import logoImg from './images/logo.png';
import logoClientImg from './images/logo_client.png';
import bannerTxt from './banner.txt?raw';
import avatarTxt from './avatar.txt?raw';
import logoTxt from './logo.txt?raw';
import logoFullTxt from './logo_full.txt?raw';

const formatImg = (raw: string | undefined, fallback: string): string => {
  if (!raw) return fallback;
  const trimmed = raw.trim();
  if (!trimmed) return fallback;
  if (trimmed.startsWith('data:') || trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed;
  }
  return `data:image/png;base64,${trimmed}`;
};

export const APP_IMAGES = {
  avatar: formatImg(avatarTxt, avatarImg),
  banner: formatImg(bannerTxt, ''),
  logoIcon: formatImg(logoTxt, logoImg),
  logoFull: formatImg(logoFullTxt, formatImg(logoTxt, logoImg)),
  logo: formatImg(logoFullTxt, formatImg(logoTxt, logoImg)),
  logoClient: formatImg(logoTxt, logoClientImg),
};

export default APP_IMAGES;

