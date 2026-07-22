import { adminClient, requireAccount } from '../_shared/auth.ts';
import { json, options } from '../_shared/http.ts';

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const mobilePattern = /^\+[1-9]\d{7,14}$/;

Deno.serve(async (request) => {
  const preflight = options(request);
  if (preflight) return preflight;
  if (request.method !== 'POST')
    return json({ error: { code: 'METHOD_NOT_ALLOWED', message: 'Method not allowed.' } }, 405);
  try {
    const { account } = await requireAccount(request, 'ADMIN', true);
    const body = (await request.json()) as {
      email?: string;
      displayName?: string;
      mobile?: string;
      role?: 'USER' | 'WORKER';
    };
    const email = body.email?.trim().toLowerCase() ?? '';
    const displayName = body.displayName?.trim() ?? '';
    const mobile = body.mobile?.trim() || undefined;
    if (
      !emailPattern.test(email) ||
      displayName.length < 2 ||
      displayName.length > 120 ||
      !['USER', 'WORKER'].includes(body.role ?? '') ||
      (mobile !== undefined && !mobilePattern.test(mobile))
    ) {
      return json(
        { error: { code: 'VALIDATION_FAILED', message: 'Enter valid invitation details.' } },
        400,
      );
    }
    const admin = adminClient();
    const redirectTo = Deno.env.get('ACCOUNT_INVITE_REDIRECT_URL');
    const { data, error } = await admin.auth.admin.inviteUserByEmail(email, {
      data: { role: body.role, name: displayName, mobile: mobile ?? '' },
      ...(redirectTo ? { redirectTo } : {}),
    });
    if (error) {
      const duplicate = /already|registered|exists/i.test(error.message);
      return json(
        {
          error: {
            code: duplicate ? 'ACCOUNT_ALREADY_EXISTS' : 'INVITATION_FAILED',
            message: duplicate
              ? 'An account already exists for this email.'
              : 'The invitation could not be sent.',
          },
        },
        duplicate ? 409 : 502,
      );
    }
    await admin.from('audit_logs').insert({
      actor_id: account.id,
      action: 'ACCOUNT_INVITED',
      entity_type: 'account',
      entity_id: data.user.id,
      metadata: { role: body.role },
    });
    return json({ accountId: data.user.id, role: body.role, invited: true }, 201);
  } catch (error) {
    const code = error instanceof Error ? error.message : 'INTERNAL_ERROR';
    const status =
      code === 'UNAUTHENTICATED'
        ? 401
        : code === 'FORBIDDEN' || code === 'MFA_REQUIRED'
          ? 403
          : 500;
    return json(
      {
        error: {
          code,
          message:
            status === 500
              ? 'The invitation could not be sent.'
              : 'Administrator authorization is required.',
        },
      },
      status,
    );
  }
});
