// Supabase's CAPTCHA protection wants the token with every sign-in, sign-up and reset request.
export function captchaToken(formData: FormData): string | undefined {
  const token = formData.get("captcha_token");
  return typeof token === "string" && token ? token : undefined;
}

export const CAPTCHA_MESSAGE = "Please complete the check to show you’re human, then try again.";

export function isCaptchaError(error: { code?: string; message?: string } | null | undefined) {
  return !!error && (error.code === "captcha_failed" || /captcha/i.test(error.message ?? ""));
}
