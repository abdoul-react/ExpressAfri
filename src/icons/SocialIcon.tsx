import React from 'react';
import Svg, { Path, Circle } from 'react-native-svg';
import { useColors } from '@/design-system';

type Props = { size?: number };

// Tracés officiels du « G » Google (Google Identity Branding Guidelines)
function GoogleIcon({ size = 24 }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M23.52 12.27c0-.85-.08-1.66-.22-2.45H12v4.64h6.46a5.52 5.52 0 0 1-2.4 3.62v3h3.88c2.27-2.09 3.58-5.17 3.58-8.81z"
        fill="#4285F4"
      />
      <Path
        d="M12 24c3.24 0 5.96-1.07 7.94-2.91l-3.88-3.01c-1.07.72-2.45 1.15-4.06 1.15-3.12 0-5.77-2.11-6.71-4.95H1.28v3.1A11.99 11.99 0 0 0 12 24z"
        fill="#34A853"
      />
      <Path
        d="M5.29 14.28A7.22 7.22 0 0 1 4.91 12c0-.79.14-1.56.38-2.28v-3.1H1.28A11.97 11.97 0 0 0 0 12c0 1.94.46 3.77 1.28 5.38l4.01-3.1z"
        fill="#FBBC05"
      />
      <Path
        d="M12 4.77c1.76 0 3.34.61 4.59 1.8l3.44-3.44C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.28 6.62l4.01 3.1C6.23 6.88 8.88 4.77 12 4.77z"
        fill="#EA4335"
      />
    </Svg>
  );
}

// Pomme monochrome, couleur du thème (le noir fixe était invisible en mode sombre)
function AppleIcon({ size = 24 }: Props) {
  const colors = useColors();
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M16.37 12.65c.03 3.25 2.85 4.33 2.88 4.34-.02.08-.45 1.54-1.48 3.05-.9 1.3-1.83 2.6-3.3 2.63-1.44.03-1.9-.85-3.55-.85-1.65 0-2.16.82-3.52.88-1.42.05-2.5-1.41-3.4-2.71C2.15 17.34.74 12.48 2.63 9.2a5.28 5.28 0 0 1 4.45-2.7c1.39-.03 2.7.93 3.55.93.85 0 2.44-1.15 4.11-.98.7.03 2.67.28 3.93 2.13-.1.06-2.35 1.37-2.3 4.07zM13.65 3.83c.75-.9 1.25-2.17 1.11-3.42-1.08.04-2.38.72-3.15 1.62-.69.8-1.3 2.09-1.14 3.32 1.2.09 2.43-.61 3.18-1.52z"
        fill={colors.text}
      />
    </Svg>
  );
}

function FacebookIcon({ size = 24 }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="12" r="11" fill="#1877F2" />
      <Path
        d="M15.67 12.88l.48-3.1h-3v-2c0-.85.42-1.68 1.76-1.68h1.36V3.21s-1.23-.21-2.41-.21c-2.46 0-4.06 1.49-4.06 4.18v2.6H7.06v3.1h2.74v7.5a10.9 10.9 0 0 0 3.37 0v-7.5h2.5z"
        fill="#fff"
      />
    </Svg>
  );
}

export { GoogleIcon, AppleIcon, FacebookIcon };
