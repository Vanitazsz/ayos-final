insert into public.content_pages (key, title, body, version, published_at)
values
  (
    'HELP_CENTER',
    'Help Center',
    $help$
Find guidance for requesting and managing services through A-YOS.

## Requesting a service

Choose the service that best matches the work you need, describe the issue clearly, and confirm the service location on the map. Photos or voice recordings are optional. AI assistance is also optional and is used only after you provide consent.

## Bookings

Review the worker, schedule, location, and price before confirming a booking. Booking updates appear in Activity. Open the booking to view its current status, worker details, and available actions.

## Payments

Follow the payment instructions shown for the booking. Cash payments are confirmed through the booking workflow. Do not send money outside the payment options displayed by A-YOS.

## Messages

Use the booking conversation to discuss service details with the assigned worker. Keep important instructions and agreements in the A-YOS chat so they remain connected to the booking.

## Changes and cancellations

Available rescheduling or cancellation actions depend on the booking status. Open the booking and follow the displayed options. A reason may be required before a cancellation can be submitted.

## Account help

Use Profile to update your personal information, saved addresses, language, and verification details. Password recovery and email verification are available from the sign-in flow.

## Safety

Review worker and booking details before allowing service access. Do not share passwords, verification codes, or unrelated financial information. For an immediate threat, fire, gas leak, medical emergency, or other urgent danger, contact the appropriate local emergency service before using A-YOS.
$help$,
    '2026-07-23',
    now()
  ),
  (
    'PRIVACY',
    'Privacy Policy',
    $privacy$
This notice explains how A-YOS handles information used to provide customer and worker service-booking features.

## Information we collect

A-YOS processes account and contact details, profile and verification information, service requests, bookings, messages, reviews, payment status, support activity, and records needed to protect account security. When you provide them, the service may also process uploaded photos, audio recordings, documents, saved addresses, and precise service or tracking coordinates.

## How information is used

Information is used to authenticate accounts, maintain role-based access, match service requests with eligible workers, manage bookings and payments, deliver messages and notifications, provide support, investigate misuse, maintain audit records, and improve service reliability.

## Location and uploaded media

Confirmed coordinates are used for service discovery, worker matching, routes, distance, and authorized booking tracking. Uploaded media is associated with the workflow where it was submitted and is stored using access-controlled paths.

## Optional AI processing

AI analysis is optional and requires request-specific consent. When enabled, request text and the media you select may be processed by the configured primary AI provider and, only after an eligible retryable failure, the configured fallback provider. You may continue manually without AI, and AI output remains advisory until you review and submit the request.

## Authorized sharing

Information is made available only where needed for the service workflow, such as to the customer and worker participating in a booking, authorized A-YOS administrators, and configured infrastructure or processing providers. Access is limited by account role, record ownership, workflow participation, and database security policies.

## Security

A-YOS uses authenticated sessions, role-based authorization, row-level database policies, private file storage, validation, and audit records to reduce unauthorized access. No online system can guarantee absolute security, so protect your password and verification codes and report suspicious account activity.

## Retention and account requests

Information is retained while needed to operate the account and service, protect users, resolve disputes, maintain required transaction or audit history, and meet applicable obligations. Profile information can be corrected in the application. Account deletion may be restricted when bookings, payments, messages, reviews, support cases, or other records must be retained; in those cases the account may be suspended while required records are preserved.

## Policy updates

The published version and update date are displayed on this page. Material changes are reflected by publishing a new version through the A-YOS content system.
$privacy$,
    '2026-07-23',
    now()
  )
on conflict (key) do update
set
  title = excluded.title,
  body = excluded.body,
  version = excluded.version,
  published_at = coalesce(public.content_pages.published_at, excluded.published_at),
  updated_at = now()
where
  public.content_pages.version = 'local-1'
  or public.content_pages.body in (
    'Local development help content. Replace before production.',
    'Local development privacy policy. Replace before production.'
  );
