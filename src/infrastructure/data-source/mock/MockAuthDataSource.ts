import type { AuthDataSource, AuthResult, OtpResult } from "../AuthDataSource";

export class MockAuthDataSource implements AuthDataSource {
  async requestOtp(_contact: string, _mode?: "phone" | "email"): Promise<OtpResult> {
    await new Promise((r) => setTimeout(r, 250));
    return { ok: true };
  }

  async verifyOtp(contact: string, _code: string, _mode?: "phone" | "email"): Promise<AuthResult> {
    await new Promise((r) => setTimeout(r, 250));
    return {
      user: { id: "mock-user", name: "Utilisateur Mock", phone: contact, avatar: "https://picsum.photos/seed/me/120" },
      accessToken: "mock-access-token",
      refreshToken: "mock-refresh-token",
    };
  }

  async loginWithEmail(email: string, _password: string): Promise<AuthResult> {
    await new Promise((r) => setTimeout(r, 250));
    return {
      user: { id: "mock-user", name: "Utilisateur Mock", email, avatar: "https://picsum.photos/seed/me/120" },
      accessToken: "mock-access-token",
      refreshToken: "mock-refresh-token",
    };
  }

  async registerWithEmail(data: { firstName: string; lastName: string; email: string; password: string; phone?: string }): Promise<AuthResult> {
    await new Promise((r) => setTimeout(r, 250));
    return {
      user: { id: "mock-user", name: `${data.firstName} ${data.lastName}`.trim(), email: data.email, avatar: "https://picsum.photos/seed/me/120" },
      accessToken: "mock-access-token",
      refreshToken: "mock-refresh-token",
    };
  }

  async requestPasswordReset(_email: string): Promise<OtpResult> {
    await new Promise((r) => setTimeout(r, 250));
    return { ok: true };
  }
}
