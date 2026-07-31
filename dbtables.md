## Table `accounts`

FR-01–FR-09, FR-19, FR-49–FR-51, FR-89–FR-91, FR-99–FR-101

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `role` | `account_role` |  |
| `status` | `account_status` |  |
| `email` | `text` |  Unique |
| `mobile` | `text` |  Nullable Unique |
| `is_protected` | `bool` |  |
| `mfa_enabled` | `bool` |  |
| `deleted_at` | `timestamptz` |  Nullable |
| `created_at` | `timestamptz` |  |
| `updated_at` | `timestamptz` |  |
| `profile_completed_at` | `timestamptz` |  Nullable |
| `password_changed_at` | `timestamptz` |  Nullable |

## Table `user_profiles`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `account_id` | `uuid` | Primary |
| `display_name` | `text` |  |
| `avatar_path` | `text` |  Nullable |
| `notification_preferences` | `jsonb` |  |
| `created_at` | `timestamptz` |  |
| `updated_at` | `timestamptz` |  |
| `verification_status` | `text` |  |
| `subdivision_id` | `uuid` |  Nullable |
| `preferred_locale` | `text` |  |

## Table `worker_profiles`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `account_id` | `uuid` | Primary |
| `display_name` | `text` |  |
| `avatar_path` | `text` |  Nullable |
| `bio` | `text` |  Nullable |
| `experience` | `text` |  Nullable |
| `service_area` | `text` |  Nullable |
| `approval_status` | `worker_approval_status` |  |
| `recommendation_priority` | `bool` |  |
| `is_available` | `bool` |  |
| `approved_at` | `timestamptz` |  Nullable |
| `created_at` | `timestamptz` |  |
| `updated_at` | `timestamptz` |  |
| `service_origin` | `geography` |  Nullable |
| `service_radius_meters` | `int4` |  Nullable |
| `latitude` | `numeric` |  Nullable |
| `longitude` | `numeric` |  Nullable |
| `primary_industry_id` | `uuid` |  Nullable |
| `subdivision_id` | `uuid` |  Nullable |
| `preferred_locale` | `text` |  |

## Table `admin_profiles`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `account_id` | `uuid` | Primary |
| `display_name` | `text` |  |
| `created_at` | `timestamptz` |  |
| `updated_at` | `timestamptz` |  |
| `given_name` | `text` |  Nullable |
| `family_name` | `text` |  Nullable |
| `location` | `text` |  Nullable |
| `bio` | `text` |  Nullable |
| `avatar_path` | `text` |  Nullable |

## Table `worker_verifications`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `worker_id` | `uuid` |  Unique |
| `status` | `worker_approval_status` |  |
| `identity_data` | `jsonb` |  |
| `document_paths` | `_text` |  |
| `requested_notes` | `text` |  Nullable |
| `reviewed_by` | `uuid` |  Nullable |
| `reviewed_at` | `timestamptz` |  Nullable |
| `created_at` | `timestamptz` |  |
| `updated_at` | `timestamptz` |  |

## Table `worker_availability`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `worker_id` | `uuid` |  |
| `day_of_week` | `int2` |  |
| `start_time` | `time` |  |
| `end_time` | `time` |  |
| `timezone` | `text` |  |

## Table `service_categories`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `name` | `text` |  Unique |
| `description` | `text` |  Nullable |
| `is_active` | `bool` |  |
| `created_at` | `timestamptz` |  |
| `updated_at` | `timestamptz` |  |
| `slug` | `text` |  Nullable |
| `minimum_price_minor` | `int8` |  Nullable |
| `maximum_price_minor` | `int8` |  Nullable |
| `is_safety_critical` | `bool` |  |
| `industry_id` | `uuid` |  Nullable |

## Table `worker_skills`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `worker_id` | `uuid` | Primary |
| `category_id` | `uuid` | Primary |
| `years` | `int4` |  |
| `rate_minor` | `int8` |  Nullable |

## Table `addresses`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `account_id` | `uuid` |  |
| `label` | `text` |  |
| `line1` | `text` |  |
| `line2` | `text` |  Nullable |
| `barangay` | `text` |  |
| `city` | `text` |  |
| `province` | `text` |  |
| `postal_code` | `text` |  Nullable |
| `is_default` | `bool` |  |
| `created_at` | `timestamptz` |  |
| `updated_at` | `timestamptz` |  |
| `location` | `geography` |  Nullable |
| `latitude` | `numeric` |  Nullable |
| `longitude` | `numeric` |  Nullable |
| `recipient_name` | `text` |  Nullable |
| `contact_mobile` | `text` |  Nullable |
| `instructions` | `text` |  Nullable |
| `archived_at` | `timestamptz` |  Nullable |
| `geocoding_provider` | `text` |  Nullable |
| `geocoding_provider_id` | `text` |  Nullable |
| `geocoding_confidence` | `numeric` |  Nullable |
| `geocoding_payload` | `jsonb` |  Nullable |

## Table `ai_analyses`

FR-92–FR-98

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `account_id` | `uuid` |  |
| `input_type` | `text` |  |
| `input_storage_path` | `text` |  Nullable |
| `transcript` | `text` |  Nullable |
| `detected_issue` | `text` |  Nullable |
| `severity` | `text` |  Nullable |
| `possible_cause` | `text` |  Nullable |
| `suggested_category_name` | `text` |  Nullable |
| `estimated_cost_minimum` | `numeric` |  Nullable |
| `estimated_cost_maximum` | `numeric` |  Nullable |
| `safety_advice` | `text` |  Nullable |
| `provider` | `text` |  |
| `provider_reference` | `text` |  Nullable |
| `saved` | `bool` |  |
| `created_at` | `timestamptz` |  |
| `provider_model` | `text` |  Nullable |
| `idempotency_key` | `text` |  Nullable |
| `request_draft` | `text` |  Nullable |

## Table `service_requests`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `user_account_id` | `uuid` |  |
| `category_id` | `uuid` |  |
| `address_id` | `uuid` |  |
| `ai_analysis_id` | `uuid` |  Nullable Unique |
| `status` | `request_status` |  |
| `description` | `text` |  |
| `scheduled_at` | `timestamptz` |  |
| `budget` | `numeric` |  |
| `notes` | `text` |  Nullable |
| `notify_on_match` | `bool` |  |
| `selected_worker_id` | `uuid` |  Nullable |
| `created_at` | `timestamptz` |  |
| `updated_at` | `timestamptz` |  |
| `service_location` | `geography` |  |
| `subdivision_id` | `uuid` |  Nullable |
| `address_snapshot` | `jsonb` |  Nullable |

## Table `request_media`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `service_request_id` | `uuid` |  |
| `storage_path` | `text` |  |
| `content_type` | `text` |  |
| `byte_size` | `int4` |  |
| `created_at` | `timestamptz` |  |

## Table `match_candidates`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `service_request_id` | `uuid` |  |
| `worker_id` | `uuid` |  |
| `score` | `numeric` |  |
| `rank` | `int4` |  |
| `factors` | `jsonb` |  |
| `eligible` | `bool` |  |
| `created_at` | `timestamptz` |  |

## Table `bookings`

FR-14–FR-18, FR-58–FR-62, FR-104

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `service_request_id` | `uuid` |  |
| `user_account_id` | `uuid` |  |
| `worker_account_id` | `uuid` |  |
| `status` | `booking_status` |  |
| `version` | `int4` |  |
| `response_due_at` | `timestamptz` |  |
| `accepted_at` | `timestamptz` |  Nullable |
| `completed_at` | `timestamptz` |  Nullable |
| `cancelled_at` | `timestamptz` |  Nullable |
| `created_at` | `timestamptz` |  |
| `updated_at` | `timestamptz` |  |
| `agreed_service_amount` | `numeric` |  |
| `currency` | `text` |  |
| `worker_start_lat` | `float8` |  Nullable |
| `worker_start_lng` | `float8` |  Nullable |

## Table `booking_status_events`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `booking_id` | `uuid` |  |
| `from_status` | `booking_status` |  Nullable |
| `to_status` | `booking_status` |  |
| `actor_id` | `uuid` |  Nullable |
| `reason` | `text` |  Nullable |
| `created_at` | `timestamptz` |  |

## Table `cancellations`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `booking_id` | `uuid` |  Unique |
| `cancelled_by` | `uuid` |  |
| `reason` | `text` |  |
| `policy_version` | `text` |  |
| `confirmed_at` | `timestamptz` |  |
| `reason_code` | `text` |  Nullable |
| `initiator_role` | `account_role` |  Nullable |
| `job_stage` | `text` |  Nullable |
| `fee_amount` | `numeric` |  |
| `refund_amount` | `numeric` |  |
| `resolution_status` | `text` |  |

## Table `location_updates`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `booking_id` | `uuid` |  |
| `account_id` | `uuid` |  |
| `recorded_at` | `timestamptz` |  |
| `location` | `geography` |  |
| `latitude` | `numeric` |  Nullable |
| `longitude` | `numeric` |  Nullable |

## Table `payments`

FR-25–FR-28, FR-73

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `booking_id` | `uuid` |  Unique |
| `method` | `payment_method` |  |
| `status` | `payment_status` |  |
| `service_amount` | `numeric` |  |
| `commission_rate` | `numeric` |  |
| `commission_amount` | `numeric` |  |
| `worker_net_amount` | `numeric` |  |
| `homeowner_platform_charge` | `numeric` |  |
| `idempotency_key` | `text` |  Unique |
| `failure_reason` | `text` |  Nullable |
| `successful_at` | `timestamptz` |  Nullable |
| `created_at` | `timestamptz` |  |
| `updated_at` | `timestamptz` |  |
| `currency` | `text` |  |
| `provider` | `text` |  Nullable |
| `provider_payment_id` | `text` |  Nullable |
| `paid_at` | `timestamptz` |  Nullable |

## Table `cash_confirmations`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `payment_id` | `uuid` |  |
| `account_id` | `uuid` |  |
| `party` | `cash_confirmation_party` |  |
| `confirmed_at` | `timestamptz` |  |

## Table `receipts`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `payment_id` | `uuid` |  Unique |
| `receipt_number` | `text` |  Unique |
| `service_amount` | `numeric` |  |
| `commission_rate` | `numeric` |  |
| `commission_amount` | `numeric` |  |
| `worker_net_amount` | `numeric` |  |
| `homeowner_platform_charge` | `numeric` |  |
| `issued_at` | `timestamptz` |  |

## Table `refunds`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `payment_id` | `uuid` |  Unique |
| `status` | `refund_status` |  |
| `reason` | `text` |  |
| `decided_by` | `uuid` |  Nullable |
| `decided_at` | `timestamptz` |  Nullable |
| `created_at` | `timestamptz` |  |

## Table `reviews`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `booking_id` | `uuid` |  Unique |
| `user_account_id` | `uuid` |  |
| `worker_account_id` | `uuid` |  |
| `stars` | `int2` |  |
| `body` | `text` |  |
| `recommend_worker` | `bool` |  |
| `moderation_status` | `review_moderation_status` |  |
| `moderated_by` | `uuid` |  Nullable |
| `moderated_at` | `timestamptz` |  Nullable |
| `created_at` | `timestamptz` |  |
| `updated_at` | `timestamptz` |  |

## Table `review_media`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `review_id` | `uuid` |  |
| `storage_path` | `text` |  |
| `content_type` | `text` |  |
| `byte_size` | `int4` |  |

## Table `conversations`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `booking_id` | `uuid` |  Nullable Unique |
| `service_request_id` | `uuid` |  Nullable |
| `worker_account_id` | `uuid` |  Nullable |
| `created_at` | `timestamptz` |  |
| `updated_at` | `timestamptz` |  |
| `archived_at` | `timestamptz` |  Nullable |
| `archived_by` | `uuid` |  Nullable |

## Table `conversation_participants`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `conversation_id` | `uuid` | Primary |
| `account_id` | `uuid` | Primary |
| `joined_at` | `timestamptz` |  |
| `last_read_at` | `timestamptz` |  Nullable |

## Table `messages`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `conversation_id` | `uuid` |  |
| `sender_id` | `uuid` |  |
| `body` | `text` |  Nullable |
| `original_locale` | `text` |  Nullable |
| `created_at` | `timestamptz` |  |

## Table `message_attachments`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `message_id` | `uuid` |  |
| `kind` | `text` |  |
| `storage_path` | `text` |  Nullable |
| `location` | `jsonb` |  Nullable |
| `content_type` | `text` |  Nullable |
| `byte_size` | `int4` |  Nullable |

## Table `message_translations`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `message_id` | `uuid` |  |
| `target_locale` | `text` |  |
| `translated` | `text` |  |
| `provider` | `text` |  |
| `created_at` | `timestamptz` |  |

## Table `notifications`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `recipient_id` | `uuid` |  Nullable |
| `audience` | `notification_audience` |  Nullable |
| `title` | `text` |  |
| `body` | `text` |  |
| `category` | `text` |  |
| `status` | `notification_status` |  |
| `scheduled_at` | `timestamptz` |  Nullable |
| `sent_at` | `timestamptz` |  Nullable |
| `source_key` | `text` |  Nullable Unique |
| `read_at` | `timestamptz` |  Nullable |
| `created_at` | `timestamptz` |  |
| `updated_at` | `timestamptz` |  |

## Table `support_tickets`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `owner_id` | `uuid` |  |
| `booking_id` | `uuid` |  Nullable |
| `subject` | `text` |  |
| `description` | `text` |  |
| `status` | `ticket_status` |  |
| `resolution` | `text` |  Nullable |
| `escalated_at` | `timestamptz` |  Nullable |
| `resolved_at` | `timestamptz` |  Nullable |
| `closed_at` | `timestamptz` |  Nullable |
| `created_at` | `timestamptz` |  |
| `updated_at` | `timestamptz` |  |
| `category` | `text` |  Nullable |
| `priority` | `text` |  Nullable |
| `assigned_to` | `uuid` |  Nullable |

## Table `content_pages`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `key` | `content_key` |  Unique |
| `title` | `text` |  |
| `body` | `text` |  |
| `version` | `text` |  |
| `published_at` | `timestamptz` |  Nullable |
| `updated_by` | `uuid` |  Nullable |
| `created_at` | `timestamptz` |  |
| `updated_at` | `timestamptz` |  |

## Table `system_settings`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `key` | `text` | Primary |
| `value` | `jsonb` |  |
| `updated_by` | `uuid` |  Nullable |
| `updated_at` | `timestamptz` |  |

## Table `trash_entries`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `entity_type` | `text` |  |
| `entity_id` | `text` |  |
| `snapshot` | `jsonb` |  |
| `deleted_by` | `uuid` |  |
| `deleted_at` | `timestamptz` |  |
| `restored_at` | `timestamptz` |  Nullable |
| `restored_by` | `uuid` |  Nullable |

## Table `audit_logs`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `actor_id` | `uuid` |  Nullable |
| `action` | `text` |  |
| `entity_type` | `text` |  Nullable |
| `entity_id` | `text` |  Nullable |
| `correlation_id` | `text` |  |
| `metadata` | `jsonb` |  |
| `created_at` | `timestamptz` |  |

## Table `report_exports`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `report_type` | `text` |  |
| `parameters` | `jsonb` |  |
| `storage_path` | `text` |  Nullable |
| `status` | `text` |  |
| `requested_by` | `uuid` |  |
| `failure_reason` | `text` |  Nullable |
| `created_at` | `timestamptz` |  |
| `completed_at` | `timestamptz` |  Nullable |

## Table `favorites`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `user_account_id` | `uuid` | Primary |
| `worker_account_id` | `uuid` | Primary |
| `created_at` | `timestamptz` |  |

## Table `job_failures`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `queue_name` | `text` |  |
| `message_id` | `int8` |  Nullable |
| `payload` | `jsonb` |  |
| `attempts` | `int4` |  |
| `error` | `text` |  |
| `failed_at` | `timestamptz` |  |
| `resolved_at` | `timestamptz` |  Nullable |
| `resolved_by` | `uuid` |  Nullable |

## Table `ai_analysis_attempts`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `account_id` | `uuid` |  |
| `analysis_id` | `uuid` |  Nullable |
| `idempotency_key` | `text` |  |
| `provider` | `text` |  |
| `model` | `text` |  |
| `outcome` | `text` |  |
| `retryable` | `bool` |  |
| `latency_ms` | `int4` |  |
| `error_code` | `text` |  Nullable |
| `created_at` | `timestamptz` |  |
| `job_id` | `uuid` |  Nullable |
| `correlation_id` | `text` |  Nullable |
| `usage_metadata` | `jsonb` |  |
| `http_status` | `int4` |  Nullable |

## Table `account_role_memberships`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `account_id` | `uuid` | Primary |
| `role` | `account_role` | Primary |
| `status` | `text` |  |
| `granted_at` | `timestamptz` |  |
| `revoked_at` | `timestamptz` |  Nullable |

## Table `account_session_roles`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `session_id` | `text` | Primary |
| `account_id` | `uuid` |  |
| `active_role` | `account_role` |  |
| `switched_at` | `timestamptz` |  |

## Table `industries`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `slug` | `text` |  Unique |
| `name` | `text` |  Unique |
| `description` | `text` |  Nullable |
| `is_active` | `bool` |  |
| `created_at` | `timestamptz` |  |
| `updated_at` | `timestamptz` |  |
| `sort_order` | `int4` |  |

## Table `skills`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `industry_id` | `uuid` |  |
| `slug` | `text` |  |
| `name` | `text` |  |
| `description` | `text` |  Nullable |
| `is_active` | `bool` |  |
| `created_at` | `timestamptz` |  |
| `updated_at` | `timestamptz` |  |

## Table `services`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `category_id` | `uuid` |  |
| `industry_id` | `uuid` |  Nullable |
| `slug` | `text` |  Unique |
| `name` | `text` |  |
| `description` | `text` |  Nullable |
| `minimum_price_minor` | `int8` |  |
| `maximum_price_minor` | `int8` |  Nullable |
| `estimated_duration_minutes` | `int4` |  Nullable |
| `is_safety_critical` | `bool` |  |
| `is_active` | `bool` |  |
| `created_at` | `timestamptz` |  |
| `updated_at` | `timestamptz` |  |

## Table `worker_offerings`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `worker_id` | `uuid` |  |
| `service_id` | `uuid` |  |
| `price_minor` | `int8` |  Nullable |
| `description` | `text` |  Nullable |
| `is_active` | `bool` |  |
| `created_at` | `timestamptz` |  |
| `updated_at` | `timestamptz` |  |

## Table `request_bids`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `service_request_id` | `uuid` |  |
| `worker_id` | `uuid` |  |
| `amount_minor` | `int8` |  |
| `message` | `text` |  Nullable |
| `estimated_duration_minutes` | `int4` |  Nullable |
| `status` | `text` |  |
| `created_at` | `timestamptz` |  |
| `updated_at` | `timestamptz` |  |

## Table `wallets`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `account_id` | `uuid` | Primary |
| `currency` | `text` |  |
| `available_minor` | `int8` |  |
| `locked_minor` | `int8` |  |
| `created_at` | `timestamptz` |  |
| `updated_at` | `timestamptz` |  |

## Table `wallet_transactions`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `wallet_account_id` | `uuid` |  |
| `booking_id` | `uuid` |  Nullable |
| `payout_request_id` | `uuid` |  Nullable |
| `transaction_type` | `text` |  |
| `amount_minor` | `int8` |  |
| `balance_after_minor` | `int8` |  |
| `idempotency_key` | `text` |  Unique |
| `metadata` | `jsonb` |  |
| `created_at` | `timestamptz` |  |

## Table `payout_methods`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `account_id` | `uuid` |  |
| `method_type` | `text` |  |
| `label` | `text` |  |
| `details_encrypted` | `text` |  |
| `last_four` | `text` |  Nullable |
| `is_default` | `bool` |  |
| `created_at` | `timestamptz` |  |
| `updated_at` | `timestamptz` |  |

## Table `payout_requests`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `account_id` | `uuid` |  |
| `payout_method_id` | `uuid` |  |
| `amount_minor` | `int8` |  |
| `status` | `text` |  |
| `idempotency_key` | `text` |  Unique |
| `reviewed_by` | `uuid` |  Nullable |
| `reviewed_at` | `timestamptz` |  Nullable |
| `failure_reason` | `text` |  Nullable |
| `created_at` | `timestamptz` |  |
| `updated_at` | `timestamptz` |  |

## Table `support_messages`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `ticket_id` | `uuid` |  |
| `sender_id` | `uuid` |  |
| `body` | `text` |  |
| `created_at` | `timestamptz` |  |

## Table `support_attachments`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `support_message_id` | `uuid` |  |
| `storage_path` | `text` |  |
| `content_type` | `text` |  |
| `byte_size` | `int4` |  |
| `created_at` | `timestamptz` |  |

## Table `review_votes`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `review_id` | `uuid` | Primary |
| `account_id` | `uuid` | Primary |
| `helpful` | `bool` |  |
| `created_at` | `timestamptz` |  |

## Table `review_reports`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `review_id` | `uuid` |  |
| `reporter_id` | `uuid` |  |
| `reason` | `text` |  |
| `status` | `text` |  |
| `resolved_by` | `uuid` |  Nullable |
| `resolved_at` | `timestamptz` |  Nullable |
| `created_at` | `timestamptz` |  |

## Table `review_replies`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `review_id` | `uuid` |  |
| `author_id` | `uuid` |  |
| `body` | `text` |  |
| `created_at` | `timestamptz` |  |
| `updated_at` | `timestamptz` |  |

## Table `review_ai_insights`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `review_id` | `uuid` | Primary |
| `sentiment` | `text` |  |
| `topics` | `_text` |  |
| `risk_flags` | `_text` |  |
| `confidence` | `numeric` |  |
| `provider` | `text` |  |
| `model` | `text` |  |
| `provider_reference` | `text` |  Nullable |
| `created_at` | `timestamptz` |  |

## Table `notification_campaigns`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `title` | `text` |  |
| `body` | `text` |  |
| `audience` | `notification_audience` |  |
| `status` | `notification_status` |  |
| `scheduled_at` | `timestamptz` |  Nullable |
| `sent_at` | `timestamptz` |  Nullable |
| `created_by` | `uuid` |  |
| `created_at` | `timestamptz` |  |
| `updated_at` | `timestamptz` |  |

## Table `notification_deliveries`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `campaign_id` | `uuid` |  |
| `recipient_id` | `uuid` |  |
| `notification_id` | `uuid` |  Nullable |
| `channel` | `text` |  |
| `status` | `text` |  |
| `delivered_at` | `timestamptz` |  Nullable |
| `read_at` | `timestamptz` |  Nullable |
| `error_code` | `text` |  Nullable |

## Table `cancellation_reasons`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `code` | `text` | Primary |
| `label` | `text` |  |
| `applies_to` | `text` |  |
| `sort_order` | `int4` |  |
| `is_active` | `bool` |  |

## Table `ai_processing_consents`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `account_id` | `uuid` |  |
| `consent_version` | `text` |  |
| `providers` | `_text` |  |
| `media_processing` | `bool` |  |
| `accepted_at` | `timestamptz` |  |
| `revoked_at` | `timestamptz` |  Nullable |
| `request_correlation_id` | `text` |  |

## Table `ai_analysis_jobs`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `account_id` | `uuid` |  |
| `consent_id` | `uuid` |  |
| `service_request_id` | `uuid` |  Nullable |
| `analysis_id` | `uuid` |  Nullable |
| `idempotency_key` | `text` |  |
| `status` | `text` |  |
| `description` | `text` |  |
| `media_paths` | `jsonb` |  |
| `input_locale` | `text` |  Nullable |
| `result` | `jsonb` |  Nullable |
| `error_code` | `text` |  Nullable |
| `error_message` | `text` |  Nullable |
| `retryable` | `bool` |  |
| `correlation_id` | `text` |  |
| `started_at` | `timestamptz` |  Nullable |
| `completed_at` | `timestamptz` |  Nullable |
| `created_at` | `timestamptz` |  |
| `updated_at` | `timestamptz` |  |

## Table `geocoding_cache`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `cache_key` | `text` | Primary |
| `operation` | `text` |  |
| `normalized_request` | `jsonb` |  |
| `normalized_response` | `jsonb` |  |
| `provider` | `text` |  |
| `expires_at` | `timestamptz` |  |
| `created_at` | `timestamptz` |  |

## Table `route_snapshots`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `booking_id` | `uuid` |  |
| `requested_by` | `uuid` |  |
| `route_geojson` | `jsonb` |  |
| `distance_meters` | `int4` |  |
| `duration_seconds` | `int4` |  |
| `worker_location` | `geography` |  |
| `destination` | `geography` |  |
| `created_at` | `timestamptz` |  |

## Table `authentication_events`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `account_id` | `uuid` |  |
| `event_type` | `text` |  |
| `session_id_hash` | `text` |  Nullable |
| `ip_address` | `inet` |  Nullable |
| `user_agent` | `text` |  Nullable |
| `created_at` | `timestamptz` |  |

## Table `conversation_reads`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `conversation_id` | `uuid` | Primary |
| `account_id` | `uuid` | Primary |
| `last_read_at` | `timestamptz` |  |

## Table `worker_portfolio_media`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `worker_id` | `uuid` |  |
| `storage_path` | `text` |  Unique |
| `caption` | `text` |  Nullable |
| `sort_order` | `int4` |  |
| `created_at` | `timestamptz` |  |

## Table `worker_portfolio_items`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `worker_id` | `uuid` |  |
| `category_id` | `uuid` |  Nullable |
| `title` | `text` |  |
| `description` | `text` |  |
| `completed_on` | `date` |  Nullable |
| `sort_order` | `int4` |  |
| `is_published` | `bool` |  |
| `created_at` | `timestamptz` |  |
| `updated_at` | `timestamptz` |  |

## Table `service_templates`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `category_id` | `uuid` |  |
| `name` | `text` |  |
| `description` | `text` |  Nullable |
| `base_price` | `numeric` |  |
| `estimated_duration_minutes` | `int4` |  |
| `is_active` | `bool` |  |
| `archived_at` | `timestamptz` |  Nullable |
| `created_at` | `timestamptz` |  |
| `updated_at` | `timestamptz` |  |

## Table `wallet_accounts`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `account_id` | `uuid` |  Unique |
| `currency` | `text` |  |
| `status` | `text` |  |
| `created_at` | `timestamptz` |  |
| `updated_at` | `timestamptz` |  |

## Table `payout_destinations`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `worker_id` | `uuid` |  |
| `kind` | `text` |  |
| `label` | `text` |  |
| `account_name` | `text` |  |
| `account_reference` | `text` |  |
| `is_default` | `bool` |  |
| `status` | `text` |  |
| `created_at` | `timestamptz` |  |
| `updated_at` | `timestamptz` |  |

## Table `customer_verifications`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `customer_id` | `uuid` |  |
| `id_type` | `text` |  |
| `id_front_url` | `text` |  |
| `id_back_url` | `text` |  Nullable |
| `status` | `text` |  |
| `review_notes` | `text` |  Nullable |
| `reviewed_by` | `uuid` |  Nullable |
| `reviewed_at` | `timestamptz` |  Nullable |
| `created_at` | `timestamptz` |  |
| `updated_at` | `timestamptz` |  |

## Table `subdivisions`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `name` | `text` |  |
| `center_lat` | `float8` |  |
| `center_lng` | `float8` |  |
| `radius_meters` | `int4` |  |
| `boundary` | `jsonb` |  Nullable |
| `is_active` | `bool` |  |
| `created_at` | `timestamptz` |  |
| `updated_at` | `timestamptz` |  |

## Table `worker_presence`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `worker_id` | `uuid` | Primary |
| `location` | `geography` |  |
| `accuracy_meters` | `numeric` |  Nullable |
| `online` | `bool` |  |
| `last_seen_at` | `timestamptz` |  |
| `updated_at` | `timestamptz` |  |

## Table `live_dispatch_sessions`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `service_request_id` | `uuid` | Primary |
| `started_at` | `timestamptz` |  |
| `expires_at` | `timestamptz` |  |
| `search_radius_meters` | `int4` |  |

## Table `service_request_dispatches`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `service_request_id` | `uuid` |  |
| `worker_id` | `uuid` |  |
| `status` | `text` |  |
| `wave` | `int2` |  |
| `distance_meters` | `numeric` |  |
| `approximate_latitude` | `numeric` |  |
| `approximate_longitude` | `numeric` |  |
| `offered_at` | `timestamptz` |  |
| `expires_at` | `timestamptz` |  |
| `viewed_at` | `timestamptz` |  Nullable |
| `responded_at` | `timestamptz` |  Nullable |
| `updated_at` | `timestamptz` |  |

## Table `account_blocks`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `blocker_id` | `uuid` | Primary |
| `blocked_id` | `uuid` | Primary |
| `reason` | `text` |  Nullable |
| `created_at` | `timestamptz` |  |

## Table `account_reports`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `reporter_id` | `uuid` |  |
| `reported_id` | `uuid` |  |
| `booking_id` | `uuid` |  Nullable |
| `reason_code` | `text` |  |
| `details` | `text` |  |
| `status` | `text` |  |
| `reviewed_by` | `uuid` |  Nullable |
| `reviewed_at` | `timestamptz` |  Nullable |
| `resolution` | `text` |  Nullable |
| `created_at` | `timestamptz` |  |
| `updated_at` | `timestamptz` |  |

## Table `booking_disputes`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `booking_id` | `uuid` |  |
| `opened_by` | `uuid` |  |
| `reason` | `text` |  |
| `status` | `text` |  |
| `resolved_by` | `uuid` |  Nullable |
| `resolved_at` | `timestamptz` |  Nullable |
| `resolution` | `text` |  Nullable |
| `created_at` | `timestamptz` |  |
| `updated_at` | `timestamptz` |  |

## Table `booking_proof_media`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `booking_id` | `uuid` |  |
| `worker_id` | `uuid` |  |
| `storage_path` | `text` |  Unique |
| `content_type` | `text` |  |
| `byte_size` | `int4` |  |
| `created_at` | `timestamptz` |  |

## Table `worker_industries`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `worker_id` | `uuid` | Primary |
| `industry_id` | `uuid` | Primary |
| `created_at` | `timestamptz` |  |

## Custom Types / Enums

### `account_role`

`USER` | `WORKER` | `ADMIN`

### `account_status`

`PENDING_VERIFICATION` | `ACTIVE` | `SUSPENDED`

### `worker_approval_status`

`PENDING` | `NEEDS_DOCUMENTS` | `APPROVED` | `REJECTED`

### `request_status`

`DRAFT` | `OPEN` | `MATCHED` | `BOOKED` | `CLOSED` | `CANCELLED`

### `booking_status`

`PENDING` | `ACCEPTED` | `WORKER_PREPARING` | `WORKER_EN_ROUTE` | `WORKER_ARRIVED` | `SERVICE_STARTED` | `IN_PROGRESS` | `PENDING_CONFIRMATION` | `COMPLETED` | `CANCELLED`

### `payment_method`

`CASH` | `GCASH` | `MAYA` | `CREDIT_DEBIT_CARD` | `WALLET`

### `payment_status`

`PENDING` | `AWAITING_CONFIRMATIONS` | `SUCCESSFUL` | `FAILED`

### `cash_confirmation_party`

`USER` | `WORKER`

### `refund_status`

`PENDING` | `PROCESSED` | `REJECTED`

### `review_moderation_status`

`PENDING` | `PUBLISHED` | `REJECTED`

### `ticket_status`

`OPEN` | `ESCALATED` | `RESOLVED` | `CLOSED`

### `notification_audience`

`USERS` | `WORKERS` | `EVERYONE`

### `notification_status`

`DRAFT` | `SCHEDULED` | `SENT` | `FAILED`

### `content_key`

`TERMS` | `PRIVACY` | `REFUND_POLICY` | `HELP_CENTER`

## RLS Policies

### `skills`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `skills_read` | SELECT | anon, authenticated | PERMISSIVE | `(is_active OR is_admin(false))` | — |

### `services`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `services_read` | SELECT | anon, authenticated | PERMISSIVE | `(is_active OR is_admin(false))` | — |

### `cancellation_reasons`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `cancellation_reasons_read` | SELECT | anon, authenticated | PERMISSIVE | `(is_active OR is_admin(false))` | — |

### `worker_offerings`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `offerings_owner_all` | ALL | authenticated | PERMISSIVE | `(worker_id = auth.uid())` | `(worker_id = auth.uid())` |
| `offerings_read` | SELECT | authenticated | PERMISSIVE | `(is_active OR (worker_id = auth.uid()) OR is_admin(false))` | — |

### `industries`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `industries_admin_write` | ALL | authenticated | PERMISSIVE | `is_admin(true)` | `is_admin(true)` |
| `industries_public_read` | SELECT | anon, authenticated | PERMISSIVE | `(is_active OR is_admin(false))` | — |
| `taxonomy_read` | SELECT | anon, authenticated | PERMISSIVE | `(is_active OR is_admin(false))` | — |

### `payout_methods`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `payout_methods_owner_all` | ALL | authenticated | PERMISSIVE | `(account_id = auth.uid())` | `(account_id = auth.uid())` |

### `review_votes`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `review_votes_owner_all` | ALL | authenticated | PERMISSIVE | `(account_id = auth.uid())` | `(account_id = auth.uid())` |
| `review_votes_read` | SELECT | authenticated | PERMISSIVE | `true` | — |

### `review_replies`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `review_replies_owner_all` | ALL | authenticated | PERMISSIVE | `(author_id = auth.uid())` | `(author_id = auth.uid())` |
| `review_replies_read` | SELECT | authenticated | PERMISSIVE | `true` | — |

### `request_bids`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `bids_participants_read` | SELECT | authenticated | PERMISSIVE | `((worker_id = auth.uid()) OR (EXISTS ( SELECT 1    FROM service_requests r   WHERE ((r.id = request_bids.service_request_id) AND (r.user_account_id = auth.uid())))) OR is_admin(false))` | — |

### `wallets`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `wallets_owner_read` | SELECT | authenticated | PERMISSIVE | `((account_id = auth.uid()) OR is_admin(false))` | — |

### `wallet_transactions`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `wallet_transactions_owner_read` | SELECT | authenticated | PERMISSIVE | `((wallet_account_id = auth.uid()) OR is_admin(false))` | — |

### `payout_requests`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `payout_requests_owner_read` | SELECT | authenticated | PERMISSIVE | `((account_id = auth.uid()) OR is_admin(false))` | — |

### `review_ai_insights`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `review_insights_admin_read` | SELECT | authenticated | PERMISSIVE | `is_admin(false)` | — |

### `notification_campaigns`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `campaigns_admin_all` | ALL | authenticated | PERMISSIVE | `is_admin(false)` | `is_admin(false)` |

### `notification_deliveries`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `deliveries_owner_admin_read` | SELECT | authenticated | PERMISSIVE | `((recipient_id = auth.uid()) OR is_admin(false))` | — |

### `route_snapshots`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `route_snapshots_booking_parties` | SELECT | authenticated | PERMISSIVE | `(is_booking_party(booking_id) OR is_admin(false))` | — |

### `support_messages`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `support_messages_participant_insert` | INSERT | authenticated | PERMISSIVE | — | `((sender_id = auth.uid()) AND ((EXISTS ( SELECT 1    FROM support_tickets t   WHERE ((t.id = support_messages.ticket_id) AND (t.owner_id = auth.uid())))) OR is_admin(false)))` |
| `support_messages_participant_read` | SELECT | authenticated | PERMISSIVE | `((sender_id = auth.uid()) OR (EXISTS ( SELECT 1    FROM support_tickets t   WHERE ((t.id = support_messages.ticket_id) AND (t.owner_id = auth.uid())))) OR is_admin(false))` | — |

### `support_attachments`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `support_attachments_owner_insert` | INSERT | authenticated | PERMISSIVE | — | `((EXISTS ( SELECT 1    FROM support_messages m   WHERE ((m.id = support_attachments.support_message_id) AND (m.sender_id = auth.uid())))) AND (split_part(storage_path, '/'::text, 1) = (auth.uid())::text))` |
| `support_attachments_participant_read` | SELECT | authenticated | PERMISSIVE | `(EXISTS ( SELECT 1    FROM (support_messages m      JOIN support_tickets t ON ((t.id = m.ticket_id)))   WHERE ((m.id = support_attachments.support_message_id) AND ((t.owner_id = auth.uid()) OR is_admin(false)))))` | — |

### `review_reports`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `review_reports_owner_admin_read` | SELECT | authenticated | PERMISSIVE | `((reporter_id = auth.uid()) OR is_admin(false))` | — |
| `review_reports_owner_insert` | INSERT | authenticated | PERMISSIVE | — | `(reporter_id = auth.uid())` |

### `request_media`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `request_media_authorized_read` | SELECT | authenticated | PERMISSIVE | `((EXISTS ( SELECT 1    FROM service_requests r   WHERE ((r.id = request_media.service_request_id) AND ((r.user_account_id = auth.uid()) OR (r.selected_worker_id = auth.uid()))))) OR is_admin(false))` | — |

### `match_candidates`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `matches_authorized_read` | SELECT | authenticated | PERMISSIVE | `((worker_id = auth.uid()) OR (EXISTS ( SELECT 1    FROM service_requests r   WHERE ((r.id = match_candidates.service_request_id) AND (r.user_account_id = auth.uid())))) OR is_admin(false))` | — |

### `booking_status_events`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `booking_events_party_or_admin_read` | SELECT | authenticated | PERMISSIVE | `is_booking_party(booking_id)` | — |

### `bookings`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `bookings_party_or_admin_read` | SELECT | authenticated | PERMISSIVE | `((user_account_id = auth.uid()) OR (worker_account_id = auth.uid()) OR is_admin(false))` | — |

### `ai_processing_consents`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `ai_consents_owner_insert` | INSERT | authenticated | PERMISSIVE | — | `(account_id = auth.uid())` |
| `ai_consents_owner_read` | SELECT | authenticated | PERMISSIVE | `((account_id = auth.uid()) OR is_admin(false))` | — |

### `account_role_memberships`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `role_memberships_owner_or_admin_read` | SELECT | authenticated | PERMISSIVE | `((account_id = auth.uid()) OR is_admin(true))` | — |

### `worker_verifications`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `verification_owner_insert` | INSERT | authenticated | PERMISSIVE | — | `((worker_id = auth.uid()) AND ("current_role"() = 'WORKER'::account_role) AND (status = 'PENDING'::worker_approval_status))` |
| `verification_owner_or_admin_read` | SELECT | authenticated | PERMISSIVE | `((worker_id = auth.uid()) OR is_admin(false))` | — |
| `verification_owner_pending_update` | UPDATE | authenticated | PERMISSIVE | `((worker_id = auth.uid()) AND (status = ANY (ARRAY['PENDING'::worker_approval_status, 'NEEDS_DOCUMENTS'::worker_approval_status])))` | `((worker_id = auth.uid()) AND (status = ANY (ARRAY['PENDING'::worker_approval_status, 'NEEDS_DOCUMENTS'::worker_approval_status])))` |

### `worker_availability`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `availability_owner_write` | ALL | authenticated | PERMISSIVE | `(worker_id = auth.uid())` | `(worker_id = auth.uid())` |
| `availability_read` | SELECT | authenticated | PERMISSIVE | `true` | — |

### `service_categories`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `categories_public_read` | SELECT | anon, authenticated | PERMISSIVE | `(is_active OR is_admin(false))` | — |

### `worker_skills`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `skills_read` | SELECT | authenticated | PERMISSIVE | `true` | — |

### `cash_confirmations`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `confirmations_party_or_admin_read` | SELECT | authenticated | PERMISSIVE | `(EXISTS ( SELECT 1    FROM payments p   WHERE ((p.id = cash_confirmations.payment_id) AND is_booking_party(p.booking_id))))` | — |

### `addresses`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `addresses_owner_accepted_worker_or_admin_read` | SELECT | authenticated | PERMISSIVE | `((account_id = auth.uid()) OR is_admin(false) OR (EXISTS ( SELECT 1    FROM (service_requests request      JOIN bookings booking ON ((booking.service_request_id = request.id)))   WHERE ((request.address_id = addresses.id) AND (booking.worker_account_id = auth.uid()) AND (booking.status = ANY (ARRAY['ACCEPTED'::booking_status, 'WORKER_PREPARING'::booking_status, 'WORKER_EN_ROUTE'::booking_status, 'WORKER_ARRIVED'::booking_status, 'SERVICE_STARTED'::booking_status, 'IN_PROGRESS'::booking_status, 'PENDING_CONFIRMATION'::booking_status, 'COMPLETED'::booking_status]))))))` | — |
| `addresses_owner_write` | ALL | authenticated | PERMISSIVE | `(account_id = auth.uid())` | `(account_id = auth.uid())` |

### `ai_analyses`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `analyses_owner_or_admin` | SELECT | authenticated | PERMISSIVE | `((account_id = auth.uid()) OR is_admin(false))` | — |

### `location_updates`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `locations_party_or_admin_read` | SELECT | authenticated | PERMISSIVE | `is_booking_party(booking_id)` | — |

### `receipts`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `receipts_party_or_admin_read` | SELECT | authenticated | PERMISSIVE | `(EXISTS ( SELECT 1    FROM payments p   WHERE ((p.id = receipts.payment_id) AND is_booking_party(p.booking_id))))` | — |

### `refunds`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `refunds_party_or_admin_read` | SELECT | authenticated | PERMISSIVE | `(EXISTS ( SELECT 1    FROM payments p   WHERE ((p.id = refunds.payment_id) AND is_booking_party(p.booking_id))))` | — |

### `reviews`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `reviews_visible_read` | SELECT | authenticated | PERMISSIVE | `((moderation_status = 'PUBLISHED'::review_moderation_status) OR (user_account_id = auth.uid()) OR (worker_account_id = auth.uid()) OR is_admin(false))` | — |

### `review_media`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `review_media_visible_read` | SELECT | authenticated | PERMISSIVE | `((EXISTS ( SELECT 1    FROM reviews r   WHERE ((r.id = review_media.review_id) AND ((r.moderation_status = 'PUBLISHED'::review_moderation_status) OR (r.user_account_id = auth.uid()) OR (r.worker_account_id = auth.uid()))))) OR is_admin(false))` | — |

### `messages`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `messages_matched_insert` | INSERT | authenticated | PERMISSIVE | — | `((sender_id = auth.uid()) AND chat_can_send(conversation_id))` |
| `messages_matched_read` | SELECT | authenticated | PERMISSIVE | `chat_can_read(conversation_id)` | — |

### `message_attachments`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `attachments_matched_insert` | INSERT | authenticated | PERMISSIVE | — | `(EXISTS ( SELECT 1    FROM messages message   WHERE ((message.id = message_attachments.message_id) AND (message.sender_id = auth.uid()) AND chat_can_send(message.conversation_id))))` |
| `attachments_matched_read` | SELECT | authenticated | PERMISSIVE | `(EXISTS ( SELECT 1    FROM messages message   WHERE ((message.id = message_attachments.message_id) AND chat_can_read(message.conversation_id))))` | — |

### `message_translations`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `translations_matched_read` | SELECT | authenticated | PERMISSIVE | `(EXISTS ( SELECT 1    FROM messages message   WHERE ((message.id = message_translations.message_id) AND chat_can_read(message.conversation_id))))` | — |

### `ai_analysis_attempts`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `ai_attempts_owner_or_admin_read` | SELECT | authenticated | PERMISSIVE | `((account_id = auth.uid()) OR is_admin(false))` | — |

### `content_pages`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `content_published_read` | SELECT | anon, authenticated | PERMISSIVE | `((published_at IS NOT NULL) OR is_admin(false))` | — |

### `system_settings`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `settings_admin_read` | SELECT | authenticated | PERMISSIVE | `is_admin(false)` | — |

### `trash_entries`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `trash_admin_read` | SELECT | authenticated | PERMISSIVE | `is_admin(true)` | — |

### `audit_logs`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `audit_admin_read` | SELECT | authenticated | PERMISSIVE | `is_admin(true)` | — |

### `report_exports`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `exports_admin_read` | SELECT | authenticated | PERMISSIVE | `is_admin(true)` | — |

### `favorites`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `favorites_owner_read` | SELECT | authenticated | PERMISSIVE | `(user_account_id = auth.uid())` | — |
| `favorites_owner_write` | ALL | authenticated | PERMISSIVE | `(user_account_id = auth.uid())` | `(user_account_id = auth.uid())` |

### `job_failures`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `job_failures_admin_read` | SELECT | authenticated | PERMISSIVE | `is_admin(true)` | — |

### `conversations`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `conversations_matched_read` | SELECT | authenticated | PERMISSIVE | `chat_can_read(id)` | — |

### `support_tickets`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `tickets_owner_insert` | INSERT | authenticated | PERMISSIVE | — | `(owner_id = auth.uid())` |
| `tickets_owner_or_admin_read` | SELECT | authenticated | PERMISSIVE | `((owner_id = auth.uid()) OR is_admin(false))` | — |

### `notifications`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `notifications_auth_insert` | INSERT | authenticated | PERMISSIVE | — | `true` |
| `notifications_recipient_read` | SELECT | authenticated | PERMISSIVE | `((recipient_id = auth.uid()) OR (audience = 'EVERYONE'::notification_audience) OR ((audience = 'USERS'::notification_audience) AND ("current_role"() = 'USER'::account_role)) OR ((audience = 'WORKERS'::notification_audience) AND ("current_role"() = 'WORKER'::account_role)) OR is_admin(false))` | — |
| `notifications_recipient_update` | UPDATE | authenticated | PERMISSIVE | `(recipient_id = auth.uid())` | `(recipient_id = auth.uid())` |

### `conversation_participants`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `participants_matched_read` | SELECT | authenticated | PERMISSIVE | `chat_can_read(conversation_id)` | — |

### `worker_profiles`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `worker_profile_discovery_read` | SELECT | authenticated | PERMISSIVE | `((approval_status = 'APPROVED'::worker_approval_status) OR (account_id = auth.uid()) OR is_admin(false))` | — |
| `worker_profile_self_update` | UPDATE | authenticated | PERMISSIVE | `(account_id = auth.uid())` | `((account_id = auth.uid()) AND ((approval_status = 'APPROVED'::worker_approval_status) OR (NOT is_available)))` |

### `service_requests`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `requests_authorized_read` | SELECT | authenticated | PERMISSIVE | `((user_account_id = auth.uid()) OR (selected_worker_id = auth.uid()) OR is_admin(false))` | — |

### `accounts`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `accounts_self_or_admin_read` | SELECT | authenticated | PERMISSIVE | `((id = auth.uid()) OR is_admin(false))` | — |

### `admin_profiles`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `admin_profile_self_or_admin` | SELECT | authenticated | PERMISSIVE | `((account_id = auth.uid()) OR is_admin(false))` | — |

### `authentication_events`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `authentication_events_owner_admin_read` | SELECT | authenticated | PERMISSIVE | `((account_id = auth.uid()) OR is_admin(false))` | — |

### `conversation_reads`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `conversation_reads_participant_read` | SELECT | authenticated | PERMISSIVE | `((account_id = auth.uid()) AND is_conversation_participant(conversation_id))` | — |

### `worker_portfolio_media`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `worker_portfolio_authenticated_read` | SELECT | authenticated | PERMISSIVE | `(EXISTS ( SELECT 1    FROM worker_profiles worker   WHERE ((worker.account_id = worker_portfolio_media.worker_id) AND ((worker.approval_status = 'APPROVED'::worker_approval_status) OR (worker.account_id = auth.uid()) OR is_admin(false)))))` | — |
| `worker_portfolio_owner_write` | ALL | authenticated | PERMISSIVE | `((worker_id = auth.uid()) OR is_admin(false))` | `((worker_id = auth.uid()) OR is_admin(false))` |

### `worker_portfolio_items`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `portfolio_items_visible_read` | SELECT | authenticated | PERMISSIVE | `((worker_id = auth.uid()) OR is_admin(false) OR (is_published AND (EXISTS ( SELECT 1    FROM worker_profiles w   WHERE ((w.account_id = worker_portfolio_items.worker_id) AND (w.approval_status = 'APPROVED'::worker_approval_status))))))` | — |

### `service_templates`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `service_templates_public_read` | SELECT | anon, authenticated | PERMISSIVE | `((archived_at IS NULL) AND (is_active OR ((( SELECT auth.uid() AS uid) IS NOT NULL) AND is_admin(false))))` | — |

### `wallet_accounts`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `wallet_accounts_owner_or_admin_read` | SELECT | authenticated | PERMISSIVE | `((account_id = auth.uid()) OR is_admin(false))` | — |

### `payout_destinations`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `payout_destinations_owner_read` | SELECT | authenticated | PERMISSIVE | `((worker_id = auth.uid()) OR is_admin(false))` | — |

### `customer_verifications`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `customer_verifications_owner_or_admin_read` | SELECT | authenticated | PERMISSIVE | `((customer_id = auth.uid()) OR is_admin(false))` | — |

### `subdivisions`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `subdivisions_admin_delete` | DELETE | authenticated | PERMISSIVE | `is_admin(true)` | — |
| `subdivisions_admin_insert` | INSERT | authenticated | PERMISSIVE | — | `is_admin(true)` |
| `subdivisions_admin_update` | UPDATE | authenticated | PERMISSIVE | `is_admin(true)` | `is_admin(true)` |
| `subdivisions_authenticated_read` | SELECT | authenticated | PERMISSIVE | `(is_active OR is_admin(false))` | — |

### `ai_analysis_jobs`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `ai_jobs_owner_read` | SELECT | authenticated | PERMISSIVE | `((account_id = auth.uid()) OR is_admin(false))` | — |

### `service_request_dispatches`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `dispatch_participant_read` | SELECT | authenticated | PERMISSIVE | `((worker_id = auth.uid()) OR (EXISTS ( SELECT 1    FROM service_requests r   WHERE ((r.id = service_request_dispatches.service_request_id) AND (r.user_account_id = auth.uid())))) OR is_admin(false))` | — |

### `live_dispatch_sessions`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `live_dispatch_session_owner_read` | SELECT | authenticated | PERMISSIVE | `((EXISTS ( SELECT 1    FROM service_requests r   WHERE ((r.id = live_dispatch_sessions.service_request_id) AND (r.user_account_id = auth.uid())))) OR is_admin(false))` | — |

### `worker_presence`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `worker_presence_owner_read` | SELECT | authenticated | PERMISSIVE | `((worker_id = auth.uid()) OR is_admin(false))` | — |

### `account_blocks`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `account_blocks_owner_or_admin_read` | SELECT | authenticated | PERMISSIVE | `((blocker_id = auth.uid()) OR is_admin(false))` | — |

### `account_reports`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `account_reports_reporter_or_admin_read` | SELECT | authenticated | PERMISSIVE | `((reporter_id = auth.uid()) OR is_admin(false))` | — |

### `booking_disputes`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `booking_disputes_party_or_admin_read` | SELECT | authenticated | PERMISSIVE | `(is_admin(false) OR (EXISTS ( SELECT 1    FROM bookings booking   WHERE ((booking.id = booking_disputes.booking_id) AND ((auth.uid() = booking.user_account_id) OR (auth.uid() = booking.worker_account_id))))))` | — |

### `booking_proof_media`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `booking_proof_media_party_or_admin_read` | SELECT | authenticated | PERMISSIVE | `(is_admin(false) OR (EXISTS ( SELECT 1    FROM bookings booking   WHERE ((booking.id = booking_proof_media.booking_id) AND ((auth.uid() = booking.user_account_id) OR (auth.uid() = booking.worker_account_id))))))` | — |

### `payments`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `payments_party_or_admin_read` | SELECT | authenticated | PERMISSIVE | `(EXISTS ( SELECT 1    FROM bookings b   WHERE ((b.id = payments.booking_id) AND is_booking_party(b.id))))` | — |

### `cancellations`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `cancellations_party_or_admin_read` | SELECT | authenticated | PERMISSIVE | `is_booking_party(booking_id)` | — |

### `user_profiles`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `user_profile_authenticated_read` | SELECT | authenticated | PERMISSIVE | `true` | — |
| `user_profile_self_update` | UPDATE | authenticated | PERMISSIVE | `(account_id = auth.uid())` | `(account_id = auth.uid())` |

### `worker_industries`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `worker_industries_select_own` | SELECT | authenticated | PERMISSIVE | `(worker_id = auth.uid())` | — |

