import type { AuthDataSource, AuthResult, OtpResult } from "../AuthDataSource";
import apiAdapter from "@/infrastructure/api/apiAdapter";

export class ApiAuthDataSource implements AuthDataSource {
  async requestOtp(contact: string, mode?: "phone" | "email"): Promise<OtpResult> {
    return apiAdapter.post("/mobile/auth/otp-request", { contact, mode });
  }

  async verifyOtp(contact: string, code: string, mode?: "phone" | "email"): Promise<AuthResult> {
    return apiAdapter.post("/mobile/auth/otp-verify", { contact, code, mode });
  }

  async loginWithEmail(email: string, password: string): Promise<AuthResult> {
    return apiAdapter.post("/mobile/auth/login", { email, password });
  }

  async registerWithEmail(data: { firstName: string; lastName: string; email: string; password: string; phone?: string }): Promise<AuthResult> {
    return apiAdapter.post("/mobile/auth/register", { ...data });
  }

  async requestPasswordReset(email: string): Promise<OtpResult> {
    return apiAdapter.post("/mobile/auth/password-reset", { email });
  }
}
