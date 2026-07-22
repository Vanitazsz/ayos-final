import { z } from 'zod';

export const providerNameSchema = z.string().trim().min(1).max(80);
export const publicClientConfigSchema = z.object({
  supabaseUrl: z.string().url(),
  supabasePublishableKey: z.string().min(20),
});

export function assertProductionProviders(
  environment: 'development' | 'test' | 'production',
  providers: Record<string, string>,
): void {
  if (environment === 'production') {
    const invalid = Object.entries(providers).filter(([, value]) => value === 'local-test-only');
    if (invalid.length)
      throw new Error(
        `Production providers are missing: ${invalid.map(([key]) => key).join(', ')}`,
      );
  }
}
