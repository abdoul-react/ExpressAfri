export type AuthResult = {
  user: { id: string; name: string; email?: string; phone?: string; avatar: string };
  accessToken: string;
  refreshToken: string;
  /** Alias pour setTokens() — présent dans les réponses mock et API. */
  access?: string;
  refresh?: string;
};

export type OtpResult = { ok: boolean };

export interface AuthDataSource {
  requestOtp(contact: string, mode?: "phone" | "email"): Promise<OtpResult>;
  verifyOtp(contact: string, code: string, mode?: "phone" | "email"): Promise<AuthResult>;
  loginWithEmail(email: string, password: string): Promise<AuthResult>;
  registerWithEmail(data: { firstName: string; lastName: string; email: string; password: string; phone?: string }): Promise<AuthResult>;
  requestPasswordReset(email: string): Promise<OtpResult>;
  socialLogin(provider: string, payload: { email?: string; name?: string; id?: string }): Promise<AuthResult>;
}
