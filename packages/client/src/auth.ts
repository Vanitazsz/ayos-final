import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database.types.js";

export type RegistrationInput = {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
};

export function createAuthService(client: SupabaseClient<Database>) {
  return {
    register(input: RegistrationInput) {
      return client.auth.signUp({
        email: input.email,
        password: input.password,
        options: {
          data: {
            first_name: input.firstName,
            last_name: input.lastName,
            phone: input.phone ?? null
          }
        }
      });
    },
    login(email: string, password: string) {
      return client.auth.signInWithPassword({ email, password });
    },
    logout(scope: "local" | "global" | "others" = "local") {
      return client.auth.signOut({ scope });
    },
    sendPasswordReset(email: string, redirectTo: string) {
      return client.auth.resetPasswordForEmail(email, { redirectTo });
    },
    updatePassword(password: string) {
      return client.auth.updateUser({ password });
    },
    resendEmailVerification(email: string) {
      return client.auth.resend({ type: "signup", email });
    }
  };
}
