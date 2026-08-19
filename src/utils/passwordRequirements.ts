export interface PasswordRequirementState {
  minLength: boolean;
  uppercase: boolean;
  number: boolean;
  symbol: boolean;
  matches: boolean;
}

export function getPasswordRequirementState(
  password: string,
  confirmation?: string,
): PasswordRequirementState {
  return {
    minLength: password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    number: /\d/.test(password),
    symbol: /[^A-Za-z0-9]/.test(password),
    matches:
      confirmation !== undefined &&
      confirmation.length > 0 &&
      password === confirmation,
  };
}
