export type SignupState = { message: string; submitted?: boolean };

// Preview-only defaults. Explicit environment settings always take precedence.
export function previewFeatureEnabled(flag: string | undefined, environment: string | undefined): boolean {
  return flag === undefined ? environment === "preview" : flag === "true";
}

export function signupEnabled(): boolean {
  return previewFeatureEnabled(process.env.SELF_SIGNUP_ENABLED, process.env.VERCEL_ENV);
}

export function validateSignup(email: unknown, password: unknown, confirmation: unknown):
  | { ok: true; email: string; password: string }
  | { ok: false; message: string } {
  if (typeof email !== "string" || email.trim().length > 320 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) || /[\u0000-\u001f\u007f]/.test(email)) {
    return { ok: false, message: "Informe um e-mail válido." };
  }
  if (typeof password !== "string" || password.length < 6 || password.length > 4096 || password.includes("\0")) {
    return { ok: false, message: "Use uma senha entre 6 e 4.096 caracteres." };
  }
  if (password !== confirmation) return { ok: false, message: "As duas senhas precisam ser iguais." };
  return { ok: true, email: email.trim(), password };
}
