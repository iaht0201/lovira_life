import avatarImg from './images/avatar.png';
import logoImg from './images/logo.png';
import logoClientImg from './images/logo_client.png';
import bannerTxt from '../../public/banner.txt?raw';
import avatarTxt from '../../public/avatar.txt?raw';
import logoTxt from '../../public/logo.txt?raw';

export const APP_IMAGES = {
  avatar: avatarTxt ? avatarTxt.trim() : avatarImg,
  banner: bannerTxt.trim(),
  logo: logoTxt ? logoTxt.trim() : logoImg,
  logoIcon: logoTxt ? logoTxt.trim() : logoImg,
  logoClient: logoTxt ? logoTxt.trim() : logoImg,
};

export default APP_IMAGES;

