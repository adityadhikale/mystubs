import React from 'react';
import {
  SiNetflix,
  SiYoutube,
  SiCrunchyroll,
} from '@icons-pack/react-simple-icons';
import {
  Clapperboard,
  Download,
  MoreHorizontal,
} from 'lucide-react';

// Import local PNG assets
import disneyHotstarLogo from '../assets/platform-logos/disney-hotstar.png';
import sonylivLogo from '../assets/platform-logos/sonyliv.png';
import zee5Logo from '../assets/platform-logos/zee5.png';
import primeVideoLogo from '../assets/platform-logos/prime-video.png';

// Wrapper for image-based icons
function ImageIcon({ src, alt, size = 16, style = {}, rounded = false, ...props }) {
  return (
    <img
      src={src}
      alt={alt}
      style={{
        width: `${size}px`,
        height: `${size}px`,
        objectFit: rounded ? 'cover' : 'contain',
        display: 'inline-block',
        verticalAlign: 'middle',
        borderRadius: rounded ? '50%' : undefined,
        ...style,
      }}
      {...props}
    />
  );
}

export const platformIconMap = {
  'Netflix': (props) => <SiNetflix color="#E50914" {...props} />,
  'Prime Video': (props) => <ImageIcon src={primeVideoLogo} alt="Prime Video" rounded={true} {...props} />,
  'Disney+ Hotstar': (props) => <ImageIcon src={disneyHotstarLogo} alt="Disney+ Hotstar" rounded={true} {...props} />,
  'Crunchyroll': (props) => <SiCrunchyroll color="#F47521" {...props} />,
  'Theater': Clapperboard,
  'YouTube': (props) => <SiYoutube color="#FF0000" {...props} />,
  'SonyLIV': (props) => <ImageIcon src={sonylivLogo} alt="SonyLIV" {...props} />,
  'ZEE5': (props) => <ImageIcon src={zee5Logo} alt="ZEE5" {...props} />,
  'Torrent/Downloaded': Download,
  'Other': MoreHorizontal,
};

/**
 * Gets the icon component or render function for a given platform name.
 *
 * @param {string} platform Name of the platform
 * @returns {React.ComponentType|null} Icon component or null if not found
 */
export function getPlatformIcon(platform) {
  if (!platform) return null;
  const normalized = platform.trim();
  return platformIconMap[normalized] || null;
}
