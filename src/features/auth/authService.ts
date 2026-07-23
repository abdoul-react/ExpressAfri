import { authDataSource } from "@/infrastructure/data-source";

export async function requestOtp(contact: string, mode: "phone" | "email" = "phone") {
  return authDataSource.requestOtp(contact, mode);
}

export async function verifyOtp(
  contact: string,
  code: string,
  mode: "phone" | "email" = "phone",
) {
  return authDataSource.verifyOtp(contact, code, mode);
}

export async function loginWithEmail(email: string, password: string) {
  return authDataSource.loginWithEmail(email, password);
}

export async function registerWithEmail(data: {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  phone?: string;
}) {
  return authDataSource.registerWithEmail(data);
}

export async function requestPasswordReset(email: string) {
  return authDataSource.requestPasswordReset(email);
}

export default {
  requestOtp,
  verifyOtp,
  loginWithEmail,
  registerWithEmail,
  requestPasswordReset,
};
