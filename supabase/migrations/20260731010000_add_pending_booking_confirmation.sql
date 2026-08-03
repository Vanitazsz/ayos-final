alter type public.booking_status
add value if not exists 'PENDING_CONFIRMATION' before 'COMPLETED';
