begin;

-- Enable realtime for bookings and location_updates so that
-- subscribeToTable('bookings', load) and subscribeToTable('location_updates', load)
-- fire on INSERT/UPDATE/DELETE and the booking lists stay in sync.
do $$ begin
  alter publication supabase_realtime add table public.bookings;
exception when duplicate_object then null; end $$;
do $$ begin
  alter publication supabase_realtime add table public.location_updates;
exception when duplicate_object then null; end $$;

-- Seed the TERMS content page so that create_service_request does not
-- fail with CONTENT_NOT_CONFIGURED.  The existing customer-support
-- migration only seeded HELP_CENTER and PRIVACY.
insert into public.content_pages (key, title, body, version, published_at)
values (
  'TERMS',
  'Terms of Service',
  $terms$
Welcome to A-YOS. By using our service-booking platform you agree to the following terms.

## Who we are

A-YOS connects homeowners with independent service professionals for home-maintenance and repair tasks. A-YOS is not a party to the service agreement between you and the professional you hire.

## Using A-YOS

You must be at least 18 years old and provide accurate account information. Your account is personal to you and may not be shared with another person. Keep your sign-in credentials secure and report suspected unauthorized access immediately.

## Service requests and bookings

When you submit a service request you describe the work you need, confirm the service location, and select a price range or budget. A-YOS may use optional AI tools to summarise your request; these are advisory and do not replace your review before submission.

Once a worker accepts and you confirm the booking, a binding service agreement is formed between you and the worker. A-YOS facilitates scheduling, messaging, and payment processing but is not responsible for the quality, safety, or legality of the services provided.

## Payments

Quoted prices are estimates unless you have agreed to a fixed-price offer. Payment is due upon completion of the service as outlined in the booking. Cash payments are confirmed through the in-app workflow. Do not make payments outside the A-YOS payment flow.

## Cancellations and refunds

You may cancel or reschedule a booking according to the cancellation policy displayed at the time of the request. Refund eligibility depends on the booking stage and the reason for cancellation. Disputes are handled through A-YOS support.

## Content and media

Photos, audio recordings, and other media you upload remain yours. By uploading them through A-YOS you grant a limited licence for A-YOS and the assigned worker to use them solely in connection with the service request.

## Prohibited conduct

Do not use A-YOS to solicit services outside the platform, to harass other users, to submit false reviews, or to violate any applicable law. A-YOS may suspend accounts that breach these terms.

## Limitation of liability

To the maximum extent permitted by law, A-YOS is not liable for indirect, incidental, or consequential damages arising from your use of the platform or services booked through it.

## Changes to these terms

We may update these terms from time to time. The current version and effective date are shown on this page. Continued use of A-YOS after a change constitutes acceptance of the updated terms.

## Contact

For questions about these terms, reach out through the Help Center in the A-YOS app.
$terms$,
  '2026-07-23',
  now()
)
on conflict (key) do update
set
  title = excluded.title,
  body = excluded.body,
  version = excluded.version,
  published_at = coalesce(public.content_pages.published_at, excluded.published_at),
  updated_at = now();

commit;
