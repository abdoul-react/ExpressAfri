import * as authService from "./authService";

type Mode = "phone" | "email";

export function useAuth() {
  const loginWithEmail = (email: string, password: string) =>
    authService.loginWithEmail(email, password);

  const registerWithEmail = (data: {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    phone?: string;
  }) => authService.registerWithEmail(data);

  const requestOtp = (contact: string, mode: Mode = "phone") =>
    authService.requestOtp(contact, mode);

  const verifyOtp = (contact: string, code: string, mode: Mode = "phone") =>
    authService.verifyOtp(contact, code, mode);

  const requestPasswordReset = (email: string) =>
    authService.requestPasswordReset(email);

  return { loginWithEmail, registerWithEmail, requestOtp, verifyOtp, requestPasswordReset };
}
