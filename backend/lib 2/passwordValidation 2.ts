export const PASSWORD_MIN_LENGTH = 8;

export const PASSWORD_REQUIREMENTS_MESSAGE =
  "Password must be at least 8 characters and include a letter and a number.";

export type PasswordValidationResult =
  | { valid: true }
  | { valid: false; message: string };

export function validatePassword(password: string): PasswordValidationResult {
  if (!password || password.length < PASSWORD_MIN_LENGTH) {
    return { valid: false, message: PASSWORD_REQUIREMENTS_MESSAGE };
  }
  if (!/[a-zA-Z]/.test(password)) {
    return { valid: false, message: PASSWORD_REQUIREMENTS_MESSAGE };
  }
  if (!/\d/.test(password)) {
    return { valid: false, message: PASSWORD_REQUIREMENTS_MESSAGE };
  }
  return { valid: true };
}

export function getPasswordValidationError(password: string): string | null {
  const result = validatePassword(password);
  return result.valid === false ? result.message : null;
}
