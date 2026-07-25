import type { AuthSessionResult } from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import * as Facebook from 'expo-auth-session/providers/facebook';
import { makeRedirectUri } from 'expo-auth-session';
import { authDataSource } from '@/infrastructure/data-source';
import type { AuthResult } from '@/infrastructure/data-source/AuthDataSource';

WebBrowser.maybeCompleteAuthSession();

const redirectUri = makeRedirectUri({ scheme: 'afriexpress', path: 'auth' });

const GOOGLE_CLIENT_IDS = {
  androidClientId: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_ANDROID,
  iosClientId: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_IOS,
  webClientId: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_WEB,
  redirectUri,
};

const FACEBOOK_CONFIG = {
  clientId: process.env.EXPO_PUBLIC_FACEBOOK_APP_ID!,
  redirectUri,
};

export type SocialAuthResult = AuthResult;

// ── Google ──
export function useGoogleAuth() {
  const [request, response, promptAsync] = Google.useAuthRequest(GOOGLE_CLIENT_IDS);
  return {
    promptGoogleLogin: () => { if (request) promptAsync(); },
    googleResponse: response,
  };
}

export async function handleGoogleResponse(
  response: AuthSessionResult | null,
): Promise<SocialAuthResult | null> {
  if (!response || response.type !== 'success') return null;
  const { authentication, params } = response as any;
  const accessToken = authentication?.accessToken ?? params?.access_token;
  const idToken = authentication?.idToken ?? params?.id_token;
  if (!accessToken && !idToken) return null;

  let email: string | undefined;
  let name: string | undefined;
  let googleId: string | undefined;
  try {
    const profileRes = await fetch('https://www.googleapis.com/userinfo/v2/me', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (profileRes.ok) {
      const profile = await profileRes.json();
      email = profile.email;
      name = profile.name;
      googleId = profile.id;
    }
  } catch {}

  return authDataSource.socialLogin('google', {
    email, name, id: googleId,
    ...(idToken ? { idToken } : {}),
    ...(accessToken ? { accessToken } : {}),
  } as any);
}

// ── Facebook ──
export function useFacebookAuth() {
  const [request, response, promptAsync] = Facebook.useAuthRequest(FACEBOOK_CONFIG);
  return {
    promptFacebookLogin: () => { if (request) promptAsync(); },
    facebookResponse: response,
  };
}

export async function handleFacebookResponse(
  response: AuthSessionResult | null,
): Promise<SocialAuthResult | null> {
  if (!response || response.type !== 'success') return null;
  const { authentication, params } = response as any;
  const accessToken = authentication?.accessToken ?? params?.access_token;
  if (!accessToken) return null;

  return authDataSource.socialLogin('facebook', { accessToken } as any);
}
