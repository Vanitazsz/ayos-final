SET session_replication_role = replica;

--
-- PostgreSQL database dump
--

-- \restrict hvounzfdAGfCyWLv5FWb9INCP40qLSZnhzF0EKoTKaLG4hEk5TtEdhnhj5WCfP5

-- Dumped from database version 17.6
-- Dumped by pg_dump version 17.6

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Data for Name: audit_log_entries; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY "auth"."audit_log_entries" ("instance_id", "id", "payload", "created_at", "ip_address") FROM stdin;
\.


--
-- Data for Name: custom_oauth_providers; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY "auth"."custom_oauth_providers" ("id", "provider_type", "identifier", "name", "client_id", "client_secret", "acceptable_client_ids", "scopes", "pkce_enabled", "attribute_mapping", "authorization_params", "enabled", "email_optional", "issuer", "discovery_url", "skip_nonce_check", "cached_discovery", "discovery_cached_at", "authorization_url", "token_url", "userinfo_url", "jwks_uri", "created_at", "updated_at", "custom_claims_allowlist") FROM stdin;
\.


--
-- Data for Name: flow_state; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY "auth"."flow_state" ("id", "user_id", "auth_code", "code_challenge_method", "code_challenge", "provider_type", "provider_access_token", "provider_refresh_token", "created_at", "updated_at", "authentication_method", "auth_code_issued_at", "invite_token", "referrer", "oauth_client_state_id", "linking_target_id", "email_optional") FROM stdin;
614ad56a-11f6-4e5a-932c-470ac7fba106	\N	\N	\N	\N	google			2026-07-14 06:10:03.004558+00	2026-07-14 06:10:03.004558+00	oauth	\N	\N	http://localhost:3000	\N	\N	f
53bd5fbc-86ac-40e0-8da0-2646f3377d7c	\N	\N	\N	\N	google			2026-07-14 06:10:35.717963+00	2026-07-14 06:10:35.717963+00	oauth	\N	\N	http://localhost:3000	\N	\N	f
16f50405-bd11-40b9-b3fb-9940cf6e49fb	\N	\N	\N	\N	google			2026-07-14 06:49:07.481616+00	2026-07-14 06:49:07.481616+00	oauth	\N	\N	http://localhost:3000	\N	\N	f
adfc7793-0c8d-47f6-be88-0c6f037fe222	\N	\N	\N	\N	google			2026-07-14 06:53:33.839683+00	2026-07-14 06:53:33.839683+00	oauth	\N	\N	http://localhost:3000	\N	\N	f
9ea3e4a1-b1e2-40cd-a419-75e4e010e915	\N	\N	\N	\N	google			2026-07-14 07:07:08.297648+00	2026-07-14 07:07:08.297648+00	oauth	\N	\N	http://localhost:3000	\N	\N	f
6db5be30-082c-460c-ae84-f05ec02631b9	\N	\N	\N	\N	google			2026-07-14 07:08:01.501917+00	2026-07-14 07:08:01.501917+00	oauth	\N	\N	http://localhost:3000	\N	\N	f
f358e623-b1c8-4881-a56a-b3f140a238a6	\N	\N	\N	\N	google			2026-07-14 09:00:54.668698+00	2026-07-14 09:00:54.668698+00	oauth	\N	\N	http://localhost:3000	\N	\N	f
0bcf1cf0-0e38-428f-adc1-801bf98ca329	\N	\N	\N	\N	google			2026-07-15 01:32:42.150979+00	2026-07-15 01:32:42.150979+00	oauth	\N	\N	http://localhost:3000	\N	\N	f
636cc49f-c692-417d-9997-7b72e5ffbe82	\N	\N	\N	\N	google			2026-07-15 05:24:14.856047+00	2026-07-15 05:24:14.856047+00	oauth	\N	\N	http://localhost:5173/sign-in	\N	\N	f
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY "auth"."users" ("instance_id", "id", "aud", "role", "email", "encrypted_password", "email_confirmed_at", "invited_at", "confirmation_token", "confirmation_sent_at", "recovery_token", "recovery_sent_at", "email_change_token_new", "email_change", "email_change_sent_at", "last_sign_in_at", "raw_app_meta_data", "raw_user_meta_data", "is_super_admin", "created_at", "updated_at", "phone", "phone_confirmed_at", "phone_change", "phone_change_token", "phone_change_sent_at", "email_change_token_current", "email_change_confirm_status", "banned_until", "reauthentication_token", "reauthentication_sent_at", "is_sso_user", "deleted_at", "is_anonymous") FROM stdin;
00000000-0000-0000-0000-000000000000	032a57ad-8355-4751-99f8-2b1b4cc8ebf9	authenticated	authenticated	test@gmail.com	$2a$10$DVhzlCobhyXMs6.Cwkytfukl.X.sKE4pHGCuqa6ZUu7knjEMepcte	2026-07-21 02:00:31.633748+00	\N		\N		\N			\N	2026-07-21 09:43:36.234617+00	{"provider": "email", "providers": ["email"]}	{"sub": "032a57ad-8355-4751-99f8-2b1b4cc8ebf9", "name": "Test", "role": "USER", "email": "test@gmail.com", "mobile": "+631234567890", "email_verified": true, "phone_verified": false}	\N	2026-07-21 02:00:31.608664+00	2026-07-21 09:43:36.252383+00	\N	\N			\N		0	\N		\N	f	\N	f
00000000-0000-0000-0000-000000000000	58cbe239-f868-4b4c-8bc3-1b281b01da08	authenticated	authenticated	admin@local.com	$2a$10$bZCA6cnOuYWFpkqKhz0eaedj5jeH9YUdDYEEU5FWqlh5uPOm/MbGC	2026-07-20 08:58:49.897781+00	\N		\N		\N			\N	2026-07-21 15:15:02.130847+00	{"provider": "email", "ayos_role": "ADMIN", "providers": ["email"]}	{"name": "A-YOS Administrator", "email_verified": true}	\N	2026-07-20 08:58:49.848435+00	2026-07-21 16:49:35.721377+00	\N	\N			\N		0	\N		\N	f	\N	f
\.


--
-- Data for Name: identities; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY "auth"."identities" ("provider_id", "user_id", "identity_data", "provider", "last_sign_in_at", "created_at", "updated_at", "id") FROM stdin;
58cbe239-f868-4b4c-8bc3-1b281b01da08	58cbe239-f868-4b4c-8bc3-1b281b01da08	{"sub": "58cbe239-f868-4b4c-8bc3-1b281b01da08", "email": "admin@local.com", "email_verified": false, "phone_verified": false}	email	2026-07-20 08:58:49.889844+00	2026-07-20 08:58:49.889913+00	2026-07-20 08:58:49.889913+00	46782679-dbc3-4e85-9a81-7f289ee3f438
032a57ad-8355-4751-99f8-2b1b4cc8ebf9	032a57ad-8355-4751-99f8-2b1b4cc8ebf9	{"sub": "032a57ad-8355-4751-99f8-2b1b4cc8ebf9", "name": "Test", "role": "USER", "email": "test@gmail.com", "mobile": "+631234567890", "email_verified": false, "phone_verified": false}	email	2026-07-21 02:00:31.628758+00	2026-07-21 02:00:31.628807+00	2026-07-21 02:00:31.628807+00	9ff9890c-2bdb-4ee7-bc75-f63c2e544202
\.


--
-- Data for Name: instances; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY "auth"."instances" ("id", "uuid", "raw_base_config", "created_at", "updated_at") FROM stdin;
\.


--
-- Data for Name: oauth_clients; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY "auth"."oauth_clients" ("id", "client_secret_hash", "registration_type", "redirect_uris", "grant_types", "client_name", "client_uri", "logo_uri", "created_at", "updated_at", "deleted_at", "client_type", "token_endpoint_auth_method") FROM stdin;
\.


--
-- Data for Name: sessions; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY "auth"."sessions" ("id", "user_id", "created_at", "updated_at", "factor_id", "aal", "not_after", "refreshed_at", "user_agent", "ip", "tag", "oauth_client_id", "refresh_token_hmac_key", "refresh_token_counter", "scopes") FROM stdin;
0be73a91-8b80-4fee-adf1-e769affe43a9	58cbe239-f868-4b4c-8bc3-1b281b01da08	2026-07-21 01:18:14.431069+00	2026-07-21 01:18:14.431069+00	\N	aal1	\N	\N	node	112.206.250.104	\N	\N	\N	\N	\N
f9afddad-1f64-4d4e-b8c8-60c15d1bbe9b	032a57ad-8355-4751-99f8-2b1b4cc8ebf9	2026-07-21 02:00:31.64067+00	2026-07-21 02:00:31.64067+00	\N	aal1	\N	\N	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.5.2 Safari/605.1.15	112.206.250.104	\N	\N	\N	\N	\N
dd5383e2-6d26-4899-8fd9-3c3370782d6e	032a57ad-8355-4751-99f8-2b1b4cc8ebf9	2026-07-21 02:00:57.948244+00	2026-07-21 02:59:10.185357+00	\N	aal1	\N	2026-07-21 02:59:10.185256	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.5.2 Safari/605.1.15	112.206.250.104	\N	\N	\N	\N	\N
0a89b957-7df2-47ac-828e-b7ba8b1e82c9	032a57ad-8355-4751-99f8-2b1b4cc8ebf9	2026-07-21 03:15:11.777952+00	2026-07-21 03:15:11.777952+00	\N	aal1	\N	\N	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.5.2 Safari/605.1.15	112.206.250.104	\N	\N	\N	\N	\N
7e04a442-de00-418e-b573-7231c591ae7d	58cbe239-f868-4b4c-8bc3-1b281b01da08	2026-07-21 04:55:09.765151+00	2026-07-21 04:55:09.765151+00	\N	aal1	\N	\N	node	112.206.250.104	\N	\N	\N	\N	\N
cd168d8c-d8a5-4e0a-b3d4-b9c50885a629	58cbe239-f868-4b4c-8bc3-1b281b01da08	2026-07-21 04:55:09.765157+00	2026-07-21 04:55:09.765157+00	\N	aal1	\N	\N	node	112.206.250.104	\N	\N	\N	\N	\N
a44db00c-5d39-46d4-acbb-7fe5754d6c25	032a57ad-8355-4751-99f8-2b1b4cc8ebf9	2026-07-21 05:33:57.671647+00	2026-07-21 05:33:57.671647+00	\N	aal1	\N	\N	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.5.2 Safari/605.1.15	112.206.250.104	\N	\N	\N	\N	\N
669e7870-ca57-48c4-9ebf-8e75d4b3b498	58cbe239-f868-4b4c-8bc3-1b281b01da08	2026-07-21 05:36:22.820981+00	2026-07-21 05:36:22.820981+00	\N	aal1	\N	\N	node	112.206.250.104	\N	\N	\N	\N	\N
8a50ca39-783c-4e88-9519-213daa9112c0	58cbe239-f868-4b4c-8bc3-1b281b01da08	2026-07-21 05:36:50.336211+00	2026-07-21 05:36:50.336211+00	\N	aal1	\N	\N	node	112.206.250.104	\N	\N	\N	\N	\N
91c25dd5-3d62-4e75-aca2-0405322d564d	58cbe239-f868-4b4c-8bc3-1b281b01da08	2026-07-21 05:36:53.035307+00	2026-07-21 05:36:53.035307+00	\N	aal1	\N	\N	node	112.206.250.104	\N	\N	\N	\N	\N
40e2213b-286e-4655-bd4a-05da146702a8	58cbe239-f868-4b4c-8bc3-1b281b01da08	2026-07-21 05:38:56.766631+00	2026-07-21 05:38:56.766631+00	\N	aal1	\N	\N	node	112.206.250.104	\N	\N	\N	\N	\N
b1a7fb24-b40a-492d-905e-3c6bd751eb0f	58cbe239-f868-4b4c-8bc3-1b281b01da08	2026-07-21 05:39:03.218662+00	2026-07-21 05:39:03.218662+00	\N	aal1	\N	\N	node	112.206.250.104	\N	\N	\N	\N	\N
9803f200-b41d-4bd6-ac5c-5744c5236853	58cbe239-f868-4b4c-8bc3-1b281b01da08	2026-07-21 05:39:49.851384+00	2026-07-21 05:39:49.851384+00	\N	aal1	\N	\N	node	112.206.250.104	\N	\N	\N	\N	\N
07e7f99c-699d-448c-a7e2-71784e413d53	58cbe239-f868-4b4c-8bc3-1b281b01da08	2026-07-21 05:39:54.600165+00	2026-07-21 05:39:54.600165+00	\N	aal1	\N	\N	node	112.206.250.104	\N	\N	\N	\N	\N
d911d082-2ee7-44ab-b328-3abe3fd5a495	032a57ad-8355-4751-99f8-2b1b4cc8ebf9	2026-07-21 05:47:19.391405+00	2026-07-21 05:47:19.391405+00	\N	aal1	\N	\N	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.5.2 Safari/605.1.15	112.206.250.104	\N	\N	\N	\N	\N
73e711f7-9523-466a-b08a-bcf4c3bf3067	032a57ad-8355-4751-99f8-2b1b4cc8ebf9	2026-07-21 05:49:33.392124+00	2026-07-21 05:49:33.392124+00	\N	aal1	\N	\N	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Code/1.129.1 Chrome/148.0.7778.280 Electron/42.6.0 Safari/537.36	112.206.250.104	\N	\N	\N	\N	\N
321d1a7a-dd5c-4880-a16f-9f11f3c1512c	58cbe239-f868-4b4c-8bc3-1b281b01da08	2026-07-21 09:33:54.136112+00	2026-07-21 09:33:54.136112+00	\N	aal1	\N	\N	node	112.206.250.104	\N	\N	\N	\N	\N
f7b71c54-0897-40fa-9795-c05c49b449e9	032a57ad-8355-4751-99f8-2b1b4cc8ebf9	2026-07-21 09:43:36.235846+00	2026-07-21 09:43:36.235846+00	\N	aal1	\N	\N	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36	112.206.250.104	\N	\N	\N	\N	\N
9af79696-cf56-46b9-8034-7aff8d52576f	58cbe239-f868-4b4c-8bc3-1b281b01da08	2026-07-21 15:15:02.130946+00	2026-07-21 16:49:35.735321+00	\N	aal1	\N	2026-07-21 16:49:35.735196	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.5.2 Safari/605.1.15	49.144.67.53	\N	\N	\N	\N	\N
\.


--
-- Data for Name: mfa_amr_claims; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY "auth"."mfa_amr_claims" ("session_id", "created_at", "updated_at", "authentication_method", "id") FROM stdin;
0be73a91-8b80-4fee-adf1-e769affe43a9	2026-07-21 01:18:14.447533+00	2026-07-21 01:18:14.447533+00	password	26e083f4-d9af-46e9-a2cf-695c7853c420
f9afddad-1f64-4d4e-b8c8-60c15d1bbe9b	2026-07-21 02:00:31.64526+00	2026-07-21 02:00:31.64526+00	password	914e25cc-0373-48b0-8481-a916d6c842fd
dd5383e2-6d26-4899-8fd9-3c3370782d6e	2026-07-21 02:00:57.953559+00	2026-07-21 02:00:57.953559+00	password	c217b875-5ae4-41af-a44d-d2e2ad70d24a
0a89b957-7df2-47ac-828e-b7ba8b1e82c9	2026-07-21 03:15:11.833627+00	2026-07-21 03:15:11.833627+00	password	ee4afa61-bb25-4959-a6e3-53a4fa354a6c
7e04a442-de00-418e-b573-7231c591ae7d	2026-07-21 04:55:09.834278+00	2026-07-21 04:55:09.834278+00	password	c4b8f9e1-bfb0-4117-be79-a473348ebdc4
cd168d8c-d8a5-4e0a-b3d4-b9c50885a629	2026-07-21 04:55:09.855962+00	2026-07-21 04:55:09.855962+00	password	a5c0a907-9881-4f5d-a8d6-8ad0cccfd79f
a44db00c-5d39-46d4-acbb-7fe5754d6c25	2026-07-21 05:33:57.747455+00	2026-07-21 05:33:57.747455+00	password	62f828e1-e0b5-4df1-8014-fabc69ded054
669e7870-ca57-48c4-9ebf-8e75d4b3b498	2026-07-21 05:36:22.837834+00	2026-07-21 05:36:22.837834+00	password	af5bd830-0253-48cb-8341-1dc374eb62fc
8a50ca39-783c-4e88-9519-213daa9112c0	2026-07-21 05:36:50.339016+00	2026-07-21 05:36:50.339016+00	password	bd4870ff-8143-4218-be21-087b4b8bba45
91c25dd5-3d62-4e75-aca2-0405322d564d	2026-07-21 05:36:53.037872+00	2026-07-21 05:36:53.037872+00	password	9f70eee6-8bf4-4aeb-aca4-1aec4cb15e51
40e2213b-286e-4655-bd4a-05da146702a8	2026-07-21 05:38:56.774342+00	2026-07-21 05:38:56.774342+00	password	0108667b-602e-4478-853f-18a656debef7
b1a7fb24-b40a-492d-905e-3c6bd751eb0f	2026-07-21 05:39:03.221316+00	2026-07-21 05:39:03.221316+00	password	ba9d2649-d70b-48f3-a43f-6bf2de2b33bc
9803f200-b41d-4bd6-ac5c-5744c5236853	2026-07-21 05:39:49.859158+00	2026-07-21 05:39:49.859158+00	password	3609fbfa-3b49-4c86-979e-ef1952a3ef3a
07e7f99c-699d-448c-a7e2-71784e413d53	2026-07-21 05:39:54.602565+00	2026-07-21 05:39:54.602565+00	password	b962fe6f-b928-44dd-8e9d-b05a41f6d22d
d911d082-2ee7-44ab-b328-3abe3fd5a495	2026-07-21 05:47:19.415851+00	2026-07-21 05:47:19.415851+00	password	d289af13-a2b9-406f-a8bb-194ea709e2ed
73e711f7-9523-466a-b08a-bcf4c3bf3067	2026-07-21 05:49:33.413505+00	2026-07-21 05:49:33.413505+00	password	0f22b8ca-4049-4c54-964d-07e1192cc521
321d1a7a-dd5c-4880-a16f-9f11f3c1512c	2026-07-21 09:33:54.184516+00	2026-07-21 09:33:54.184516+00	password	f2618c88-64fb-4d0f-b752-c075e5b7bc75
f7b71c54-0897-40fa-9795-c05c49b449e9	2026-07-21 09:43:36.254687+00	2026-07-21 09:43:36.254687+00	password	86107bad-4ac8-4681-9ed6-dc31ceb6b333
9af79696-cf56-46b9-8034-7aff8d52576f	2026-07-21 15:15:02.173139+00	2026-07-21 15:15:02.173139+00	password	4beaaf4c-218f-4378-b5a6-3214157130e9
\.


--
-- Data for Name: mfa_factors; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY "auth"."mfa_factors" ("id", "user_id", "friendly_name", "factor_type", "status", "created_at", "updated_at", "secret", "phone", "last_challenged_at", "web_authn_credential", "web_authn_aaguid", "last_webauthn_challenge_data") FROM stdin;
\.


--
-- Data for Name: mfa_challenges; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY "auth"."mfa_challenges" ("id", "factor_id", "created_at", "verified_at", "ip_address", "otp_code", "web_authn_session_data") FROM stdin;
\.


--
-- Data for Name: oauth_authorizations; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY "auth"."oauth_authorizations" ("id", "authorization_id", "client_id", "user_id", "redirect_uri", "scope", "state", "resource", "code_challenge", "code_challenge_method", "response_type", "status", "authorization_code", "created_at", "expires_at", "approved_at", "nonce") FROM stdin;
\.


--
-- Data for Name: oauth_client_states; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY "auth"."oauth_client_states" ("id", "provider_type", "code_verifier", "created_at") FROM stdin;
\.


--
-- Data for Name: oauth_consents; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY "auth"."oauth_consents" ("id", "user_id", "client_id", "scopes", "granted_at", "revoked_at") FROM stdin;
\.


--
-- Data for Name: one_time_tokens; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY "auth"."one_time_tokens" ("id", "user_id", "token_type", "token_hash", "relates_to", "created_at", "updated_at") FROM stdin;
\.


--
-- Data for Name: refresh_tokens; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY "auth"."refresh_tokens" ("instance_id", "id", "token", "user_id", "revoked", "created_at", "updated_at", "parent", "session_id") FROM stdin;
00000000-0000-0000-0000-000000000000	67	bihdkp7w2f2y	58cbe239-f868-4b4c-8bc3-1b281b01da08	f	2026-07-21 01:18:14.44281+00	2026-07-21 01:18:14.44281+00	\N	0be73a91-8b80-4fee-adf1-e769affe43a9
00000000-0000-0000-0000-000000000000	71	63wq35by6cdr	032a57ad-8355-4751-99f8-2b1b4cc8ebf9	f	2026-07-21 02:00:31.642618+00	2026-07-21 02:00:31.642618+00	\N	f9afddad-1f64-4d4e-b8c8-60c15d1bbe9b
00000000-0000-0000-0000-000000000000	72	gqaespk7k5j7	032a57ad-8355-4751-99f8-2b1b4cc8ebf9	t	2026-07-21 02:00:57.951972+00	2026-07-21 02:59:10.141903+00	\N	dd5383e2-6d26-4899-8fd9-3c3370782d6e
00000000-0000-0000-0000-000000000000	73	7nznbumtb6oa	032a57ad-8355-4751-99f8-2b1b4cc8ebf9	f	2026-07-21 02:59:10.162005+00	2026-07-21 02:59:10.162005+00	gqaespk7k5j7	dd5383e2-6d26-4899-8fd9-3c3370782d6e
00000000-0000-0000-0000-000000000000	74	oi2sbxmvqhi4	032a57ad-8355-4751-99f8-2b1b4cc8ebf9	f	2026-07-21 03:15:11.811974+00	2026-07-21 03:15:11.811974+00	\N	0a89b957-7df2-47ac-828e-b7ba8b1e82c9
00000000-0000-0000-0000-000000000000	75	vgsarxt3crbt	58cbe239-f868-4b4c-8bc3-1b281b01da08	f	2026-07-21 04:55:09.797637+00	2026-07-21 04:55:09.797637+00	\N	7e04a442-de00-418e-b573-7231c591ae7d
00000000-0000-0000-0000-000000000000	76	46z4psp4abli	58cbe239-f868-4b4c-8bc3-1b281b01da08	f	2026-07-21 04:55:09.797631+00	2026-07-21 04:55:09.797631+00	\N	cd168d8c-d8a5-4e0a-b3d4-b9c50885a629
00000000-0000-0000-0000-000000000000	77	dzxxgjgztrrq	032a57ad-8355-4751-99f8-2b1b4cc8ebf9	f	2026-07-21 05:33:57.714557+00	2026-07-21 05:33:57.714557+00	\N	a44db00c-5d39-46d4-acbb-7fe5754d6c25
00000000-0000-0000-0000-000000000000	78	3ginpjby32td	58cbe239-f868-4b4c-8bc3-1b281b01da08	f	2026-07-21 05:36:22.83329+00	2026-07-21 05:36:22.83329+00	\N	669e7870-ca57-48c4-9ebf-8e75d4b3b498
00000000-0000-0000-0000-000000000000	79	fqqjvjjvdi74	58cbe239-f868-4b4c-8bc3-1b281b01da08	f	2026-07-21 05:36:50.337647+00	2026-07-21 05:36:50.337647+00	\N	8a50ca39-783c-4e88-9519-213daa9112c0
00000000-0000-0000-0000-000000000000	80	ym3i2r4xoczh	58cbe239-f868-4b4c-8bc3-1b281b01da08	f	2026-07-21 05:36:53.036417+00	2026-07-21 05:36:53.036417+00	\N	91c25dd5-3d62-4e75-aca2-0405322d564d
00000000-0000-0000-0000-000000000000	81	o45r5bqc4pkj	58cbe239-f868-4b4c-8bc3-1b281b01da08	f	2026-07-21 05:38:56.772062+00	2026-07-21 05:38:56.772062+00	\N	40e2213b-286e-4655-bd4a-05da146702a8
00000000-0000-0000-0000-000000000000	82	megrrlojlila	58cbe239-f868-4b4c-8bc3-1b281b01da08	f	2026-07-21 05:39:03.219902+00	2026-07-21 05:39:03.219902+00	\N	b1a7fb24-b40a-492d-905e-3c6bd751eb0f
00000000-0000-0000-0000-000000000000	83	vmbraawtxjaa	58cbe239-f868-4b4c-8bc3-1b281b01da08	f	2026-07-21 05:39:49.855831+00	2026-07-21 05:39:49.855831+00	\N	9803f200-b41d-4bd6-ac5c-5744c5236853
00000000-0000-0000-0000-000000000000	84	vwm7a5hw4fi6	58cbe239-f868-4b4c-8bc3-1b281b01da08	f	2026-07-21 05:39:54.6012+00	2026-07-21 05:39:54.6012+00	\N	07e7f99c-699d-448c-a7e2-71784e413d53
00000000-0000-0000-0000-000000000000	85	fqae3iexygrs	032a57ad-8355-4751-99f8-2b1b4cc8ebf9	f	2026-07-21 05:47:19.41045+00	2026-07-21 05:47:19.41045+00	\N	d911d082-2ee7-44ab-b328-3abe3fd5a495
00000000-0000-0000-0000-000000000000	86	il4ap6wxmxx4	032a57ad-8355-4751-99f8-2b1b4cc8ebf9	f	2026-07-21 05:49:33.4086+00	2026-07-21 05:49:33.4086+00	\N	73e711f7-9523-466a-b08a-bcf4c3bf3067
00000000-0000-0000-0000-000000000000	87	ns33u5udoltj	58cbe239-f868-4b4c-8bc3-1b281b01da08	f	2026-07-21 09:33:54.1656+00	2026-07-21 09:33:54.1656+00	\N	321d1a7a-dd5c-4880-a16f-9f11f3c1512c
00000000-0000-0000-0000-000000000000	88	u7se2pev22da	032a57ad-8355-4751-99f8-2b1b4cc8ebf9	f	2026-07-21 09:43:36.247236+00	2026-07-21 09:43:36.247236+00	\N	f7b71c54-0897-40fa-9795-c05c49b449e9
00000000-0000-0000-0000-000000000000	89	tzjgfenl737p	58cbe239-f868-4b4c-8bc3-1b281b01da08	t	2026-07-21 15:15:02.150002+00	2026-07-21 16:49:35.694444+00	\N	9af79696-cf56-46b9-8034-7aff8d52576f
00000000-0000-0000-0000-000000000000	90	hri5ghxid5yf	58cbe239-f868-4b4c-8bc3-1b281b01da08	f	2026-07-21 16:49:35.712192+00	2026-07-21 16:49:35.712192+00	tzjgfenl737p	9af79696-cf56-46b9-8034-7aff8d52576f
\.


--
-- Data for Name: sso_providers; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY "auth"."sso_providers" ("id", "resource_id", "created_at", "updated_at", "disabled") FROM stdin;
\.


--
-- Data for Name: saml_providers; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY "auth"."saml_providers" ("id", "sso_provider_id", "entity_id", "metadata_xml", "metadata_url", "attribute_mapping", "created_at", "updated_at", "name_id_format") FROM stdin;
\.


--
-- Data for Name: saml_relay_states; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY "auth"."saml_relay_states" ("id", "sso_provider_id", "request_id", "for_email", "redirect_to", "created_at", "updated_at", "flow_state_id") FROM stdin;
\.


--
-- Data for Name: sso_domains; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY "auth"."sso_domains" ("id", "sso_provider_id", "domain", "created_at", "updated_at") FROM stdin;
\.


--
-- Data for Name: webauthn_challenges; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY "auth"."webauthn_challenges" ("id", "user_id", "challenge_type", "session_data", "created_at", "expires_at") FROM stdin;
\.


--
-- Data for Name: webauthn_credentials; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY "auth"."webauthn_credentials" ("id", "user_id", "credential_id", "public_key", "attestation_type", "aaguid", "sign_count", "transports", "backup_eligible", "backed_up", "friendly_name", "created_at", "updated_at", "last_used_at") FROM stdin;
\.


--
-- Data for Name: a_booking_timeouts; Type: TABLE DATA; Schema: pgmq; Owner: postgres
--

COPY "pgmq"."a_booking_timeouts" ("msg_id", "read_ct", "enqueued_at", "archived_at", "vt", "message", "headers") FROM stdin;
\.


--
-- Data for Name: a_no_match_notifications; Type: TABLE DATA; Schema: pgmq; Owner: postgres
--

COPY "pgmq"."a_no_match_notifications" ("msg_id", "read_ct", "enqueued_at", "archived_at", "vt", "message", "headers") FROM stdin;
\.


--
-- Data for Name: a_provider_work; Type: TABLE DATA; Schema: pgmq; Owner: postgres
--

COPY "pgmq"."a_provider_work" ("msg_id", "read_ct", "enqueued_at", "archived_at", "vt", "message", "headers") FROM stdin;
\.


--
-- Data for Name: a_scheduled_notifications; Type: TABLE DATA; Schema: pgmq; Owner: postgres
--

COPY "pgmq"."a_scheduled_notifications" ("msg_id", "read_ct", "enqueued_at", "archived_at", "vt", "message", "headers") FROM stdin;
\.


--
-- Data for Name: q_booking_timeouts; Type: TABLE DATA; Schema: pgmq; Owner: postgres
--

COPY "pgmq"."q_booking_timeouts" ("msg_id", "read_ct", "enqueued_at", "vt", "message", "headers") FROM stdin;
\.


--
-- Data for Name: q_no_match_notifications; Type: TABLE DATA; Schema: pgmq; Owner: postgres
--

COPY "pgmq"."q_no_match_notifications" ("msg_id", "read_ct", "enqueued_at", "vt", "message", "headers") FROM stdin;
\.


--
-- Data for Name: q_provider_work; Type: TABLE DATA; Schema: pgmq; Owner: postgres
--

COPY "pgmq"."q_provider_work" ("msg_id", "read_ct", "enqueued_at", "vt", "message", "headers") FROM stdin;
\.


--
-- Data for Name: q_scheduled_notifications; Type: TABLE DATA; Schema: pgmq; Owner: postgres
--

COPY "pgmq"."q_scheduled_notifications" ("msg_id", "read_ct", "enqueued_at", "vt", "message", "headers") FROM stdin;
\.


--
-- Data for Name: admin_bootstrap_requests; Type: TABLE DATA; Schema: private; Owner: postgres
--

COPY "private"."admin_bootstrap_requests" ("email", "token_hash", "display_name", "expires_at", "created_at") FROM stdin;
\.


--
-- Data for Name: accounts; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."accounts" ("id", "role", "status", "email", "mobile", "is_protected", "mfa_enabled", "deleted_at", "created_at", "updated_at", "profile_completed_at", "password_changed_at") FROM stdin;
58cbe239-f868-4b4c-8bc3-1b281b01da08	ADMIN	ACTIVE	admin@local.com	\N	t	f	\N	2026-07-20 08:58:49.846497+00	2026-07-21 15:48:09.385244+00	2026-07-21 15:48:09.385244+00	\N
032a57ad-8355-4751-99f8-2b1b4cc8ebf9	USER	ACTIVE	test@gmail.com	+631234567890	f	f	\N	2026-07-21 02:00:31.60578+00	2026-07-21 15:48:09.385244+00	2026-07-21 15:48:09.385244+00	\N
\.


--
-- Data for Name: account_role_memberships; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."account_role_memberships" ("account_id", "role", "status", "granted_at", "revoked_at") FROM stdin;
58cbe239-f868-4b4c-8bc3-1b281b01da08	ADMIN	ACTIVE	2026-07-21 01:56:21.898359+00	\N
032a57ad-8355-4751-99f8-2b1b4cc8ebf9	USER	ACTIVE	2026-07-21 02:00:31.60578+00	\N
032a57ad-8355-4751-99f8-2b1b4cc8ebf9	WORKER	ACTIVE	2026-07-21 03:16:45.057002+00	\N
\.


--
-- Data for Name: account_session_roles; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."account_session_roles" ("session_id", "account_id", "active_role", "switched_at") FROM stdin;
0a89b957-7df2-47ac-828e-b7ba8b1e82c9	032a57ad-8355-4751-99f8-2b1b4cc8ebf9	USER	2026-07-21 03:17:09.727892+00
73e711f7-9523-466a-b08a-bcf4c3bf3067	032a57ad-8355-4751-99f8-2b1b4cc8ebf9	USER	2026-07-21 05:59:13.928834+00
f7b71c54-0897-40fa-9795-c05c49b449e9	032a57ad-8355-4751-99f8-2b1b4cc8ebf9	WORKER	2026-07-21 09:52:20.291438+00
\.


--
-- Data for Name: addresses; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."addresses" ("id", "account_id", "label", "line1", "line2", "barangay", "city", "province", "postal_code", "is_default", "created_at", "updated_at", "location", "recipient_name", "contact_mobile", "instructions", "archived_at", "geocoding_provider", "geocoding_provider_id", "geocoding_confidence", "geocoding_payload") FROM stdin;
\.


--
-- Data for Name: admin_profiles; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."admin_profiles" ("account_id", "display_name", "created_at", "updated_at", "given_name", "family_name", "location", "bio", "avatar_path") FROM stdin;
58cbe239-f868-4b4c-8bc3-1b281b01da08	A-YOS Administrator	2026-07-20 08:58:49.846497+00	2026-07-20 08:58:49.846497+00	\N	\N	\N	\N	\N
\.


--
-- Data for Name: ai_analyses; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."ai_analyses" ("id", "account_id", "input_type", "input_storage_path", "transcript", "detected_issue", "severity", "possible_cause", "suggested_category_name", "estimated_cost_minimum", "estimated_cost_maximum", "safety_advice", "provider", "provider_reference", "saved", "created_at", "provider_model", "idempotency_key", "request_draft") FROM stdin;
\.


--
-- Data for Name: ai_processing_consents; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."ai_processing_consents" ("id", "account_id", "consent_version", "providers", "media_processing", "accepted_at", "revoked_at", "request_correlation_id") FROM stdin;
\.


--
-- Data for Name: service_categories; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."service_categories" ("id", "name", "description", "is_active", "created_at", "updated_at", "slug", "minimum_price_minor", "maximum_price_minor", "is_safety_critical") FROM stdin;
ed2ae978-306e-4fce-8e41-a917e9dbe168	Plumbing	Plumbing repair and installation	t	2026-07-20 08:21:24.010118+00	2026-07-20 08:21:24.010118+00	\N	\N	\N	f
9381ce88-170d-41d7-9f98-fb4d81ddb487	Electrical	Electrical repair and installation	t	2026-07-20 08:21:24.010118+00	2026-07-20 08:21:24.010118+00	\N	\N	\N	f
8695a119-2c8d-4262-8055-4f44cb94f692	Cleaning	Home and property cleaning	t	2026-07-20 08:21:24.010118+00	2026-07-20 08:21:24.010118+00	\N	\N	\N	f
\.


--
-- Data for Name: user_profiles; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."user_profiles" ("account_id", "display_name", "avatar_path", "notification_preferences", "created_at", "updated_at") FROM stdin;
032a57ad-8355-4751-99f8-2b1b4cc8ebf9	Test	\N	{}	2026-07-21 02:00:31.60578+00	2026-07-21 02:00:31.60578+00
\.


--
-- Data for Name: worker_profiles; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."worker_profiles" ("account_id", "display_name", "avatar_path", "bio", "experience", "service_area", "approval_status", "recommendation_priority", "is_available", "approved_at", "created_at", "updated_at", "service_origin", "service_radius_meters") FROM stdin;
032a57ad-8355-4751-99f8-2b1b4cc8ebf9	Test	\N	\N	\N	\N	PENDING	f	f	\N	2026-07-21 03:16:45.057002+00	2026-07-21 03:16:45.057002+00	\N	\N
\.


--
-- Data for Name: service_requests; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."service_requests" ("id", "user_account_id", "category_id", "address_id", "ai_analysis_id", "status", "description", "scheduled_at", "budget", "notes", "notify_on_match", "selected_worker_id", "created_at", "updated_at", "service_location") FROM stdin;
\.


--
-- Data for Name: ai_analysis_jobs; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."ai_analysis_jobs" ("id", "account_id", "consent_id", "service_request_id", "analysis_id", "idempotency_key", "status", "description", "media_paths", "input_locale", "result", "error_code", "error_message", "retryable", "correlation_id", "started_at", "completed_at", "created_at", "updated_at") FROM stdin;
\.


--
-- Data for Name: ai_analysis_attempts; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."ai_analysis_attempts" ("id", "account_id", "analysis_id", "idempotency_key", "provider", "model", "outcome", "retryable", "latency_ms", "error_code", "created_at", "job_id", "correlation_id", "usage_metadata", "http_status") FROM stdin;
\.


--
-- Data for Name: audit_logs; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."audit_logs" ("id", "actor_id", "action", "entity_type", "entity_id", "correlation_id", "metadata", "created_at") FROM stdin;
92204084-1aa9-43a4-8809-98fa12d002de	58cbe239-f868-4b4c-8bc3-1b281b01da08	ACCOUNT_STATUS_CHANGED	account	58568e7d-48bb-4144-88cd-b659d13ca4eb	6be79d85-6e84-45fd-a1ca-84c6e3e7ecd4	{"status": "SUSPENDED"}	2026-07-21 01:18:24.934181+00
a77ab71b-f2d5-4514-b520-0a0161c5c849	58cbe239-f868-4b4c-8bc3-1b281b01da08	ACCOUNT_STATUS_CHANGED	account	58568e7d-48bb-4144-88cd-b659d13ca4eb	78009817-ec5c-46ea-bf58-1504de9fa10e	{"status": "ACTIVE"}	2026-07-21 01:19:36.403331+00
80d04d3d-0aab-4bae-bceb-f95a92ddcb06	58cbe239-f868-4b4c-8bc3-1b281b01da08	ACCOUNT_DELETED	account	58568e7d-48bb-4144-88cd-b659d13ca4eb	c4965e5f-200e-4091-9681-d18158174e7f	{"role": "USER", "email_sha256": "e0e79f6dfec975737b78491a4c0338d5ffe880290177581c29f8996a38fcd8e5"}	2026-07-21 01:54:06.133523+00
25c00e30-4e36-4f14-8488-e558db1bce06	58cbe239-f868-4b4c-8bc3-1b281b01da08	ACCOUNT_DELETED	account	fb14c56f-893c-4705-a396-8794a30633ed	311157ee-97c8-44c5-a012-78c88273f67e	{"role": "USER", "email_sha256": "129adb2100f2c1622ebad2ddb14891474dd405e83deab17263d5549b59d094b2"}	2026-07-21 01:54:10.191312+00
\.


--
-- Data for Name: authentication_events; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."authentication_events" ("id", "account_id", "event_type", "session_id_hash", "ip_address", "user_agent", "created_at") FROM stdin;
\.


--
-- Data for Name: bookings; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."bookings" ("id", "service_request_id", "user_account_id", "worker_account_id", "status", "version", "response_due_at", "accepted_at", "completed_at", "cancelled_at", "created_at", "updated_at") FROM stdin;
\.


--
-- Data for Name: booking_status_events; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."booking_status_events" ("id", "booking_id", "from_status", "to_status", "actor_id", "reason", "created_at") FROM stdin;
\.


--
-- Data for Name: cancellation_reasons; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."cancellation_reasons" ("code", "label", "applies_to", "sort_order", "is_active") FROM stdin;
SCHEDULE_CHANGED	Schedule changed	BOTH	10	t
WORKER_UNAVAILABLE	Worker unavailable	WORKER	20	t
CUSTOMER_UNAVAILABLE	Customer unavailable	USER	30	t
PRICE_DISAGREEMENT	Price disagreement	BOTH	40	t
OTHER	Other	BOTH	100	t
\.


--
-- Data for Name: cancellations; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."cancellations" ("id", "booking_id", "cancelled_by", "reason", "policy_version", "confirmed_at") FROM stdin;
\.


--
-- Data for Name: payments; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."payments" ("id", "booking_id", "method", "status", "service_amount", "commission_rate", "commission_amount", "worker_net_amount", "homeowner_platform_charge", "idempotency_key", "failure_reason", "successful_at", "created_at", "updated_at") FROM stdin;
\.


--
-- Data for Name: cash_confirmations; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."cash_confirmations" ("id", "payment_id", "account_id", "party", "confirmed_at") FROM stdin;
\.


--
-- Data for Name: content_pages; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."content_pages" ("id", "key", "title", "body", "version", "published_at", "updated_by", "created_at", "updated_at") FROM stdin;
bd9243bc-89ea-418c-adae-813be0682552	TERMS	Terms of Service	Local development terms. Replace before production.	local-1	2026-07-20 08:21:24.010118+00	\N	2026-07-20 08:21:24.010118+00	2026-07-20 08:21:24.010118+00
9b4619c5-ad85-456c-b922-178588692223	PRIVACY	Privacy Policy	Local development privacy policy. Replace before production.	local-1	2026-07-20 08:21:24.010118+00	\N	2026-07-20 08:21:24.010118+00	2026-07-20 08:21:24.010118+00
2499467a-49db-44b4-80bd-b3424d92e570	REFUND_POLICY	Refund Policy	Local development refund policy. Replace before production.	local-1	2026-07-20 08:21:24.010118+00	\N	2026-07-20 08:21:24.010118+00	2026-07-20 08:21:24.010118+00
46ce4c94-f2e0-4b47-81d9-f929347cf480	HELP_CENTER	Help Center	Local development help content. Replace before production.	local-1	2026-07-20 08:21:24.010118+00	\N	2026-07-20 08:21:24.010118+00	2026-07-20 08:21:24.010118+00
\.


--
-- Data for Name: conversations; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."conversations" ("id", "booking_id", "service_request_id", "worker_account_id", "created_at", "updated_at") FROM stdin;
\.


--
-- Data for Name: conversation_participants; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."conversation_participants" ("conversation_id", "account_id", "joined_at") FROM stdin;
\.


--
-- Data for Name: conversation_reads; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."conversation_reads" ("conversation_id", "account_id", "last_read_at") FROM stdin;
\.


--
-- Data for Name: favorites; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."favorites" ("user_account_id", "worker_account_id", "created_at") FROM stdin;
\.


--
-- Data for Name: geocoding_cache; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."geocoding_cache" ("cache_key", "operation", "normalized_request", "normalized_response", "provider", "expires_at", "created_at") FROM stdin;
\.


--
-- Data for Name: industries; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."industries" ("id", "slug", "name", "description", "is_active", "created_at", "updated_at") FROM stdin;
\.


--
-- Data for Name: job_failures; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."job_failures" ("id", "queue_name", "message_id", "payload", "attempts", "error", "failed_at", "resolved_at", "resolved_by") FROM stdin;
\.


--
-- Data for Name: location_updates; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."location_updates" ("id", "booking_id", "account_id", "recorded_at", "location") FROM stdin;
\.


--
-- Data for Name: match_candidates; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."match_candidates" ("id", "service_request_id", "worker_id", "score", "rank", "factors", "eligible", "created_at") FROM stdin;
\.


--
-- Data for Name: messages; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."messages" ("id", "conversation_id", "sender_id", "body", "original_locale", "created_at") FROM stdin;
\.


--
-- Data for Name: message_attachments; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."message_attachments" ("id", "message_id", "kind", "storage_path", "location", "content_type", "byte_size") FROM stdin;
\.


--
-- Data for Name: message_translations; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."message_translations" ("id", "message_id", "target_locale", "translated", "provider", "created_at") FROM stdin;
\.


--
-- Data for Name: notification_campaigns; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."notification_campaigns" ("id", "title", "body", "audience", "status", "scheduled_at", "sent_at", "created_by", "created_at", "updated_at") FROM stdin;
\.


--
-- Data for Name: notifications; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."notifications" ("id", "recipient_id", "audience", "title", "body", "category", "status", "scheduled_at", "sent_at", "source_key", "read_at", "created_at", "updated_at") FROM stdin;
\.


--
-- Data for Name: notification_deliveries; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."notification_deliveries" ("id", "campaign_id", "recipient_id", "notification_id", "channel", "status", "delivered_at", "read_at", "error_code") FROM stdin;
\.


--
-- Data for Name: payout_methods; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."payout_methods" ("id", "account_id", "method_type", "label", "details_encrypted", "last_four", "is_default", "created_at", "updated_at") FROM stdin;
\.


--
-- Data for Name: payout_requests; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."payout_requests" ("id", "account_id", "payout_method_id", "amount_minor", "status", "idempotency_key", "reviewed_by", "reviewed_at", "failure_reason", "created_at", "updated_at") FROM stdin;
\.


--
-- Data for Name: receipts; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."receipts" ("id", "payment_id", "receipt_number", "service_amount", "commission_rate", "commission_amount", "worker_net_amount", "homeowner_platform_charge", "issued_at") FROM stdin;
\.


--
-- Data for Name: refunds; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."refunds" ("id", "payment_id", "status", "reason", "decided_by", "decided_at", "created_at") FROM stdin;
\.


--
-- Data for Name: report_exports; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."report_exports" ("id", "report_type", "parameters", "storage_path", "status", "requested_by", "failure_reason", "created_at", "completed_at") FROM stdin;
\.


--
-- Data for Name: request_bids; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."request_bids" ("id", "service_request_id", "worker_id", "amount_minor", "message", "estimated_duration_minutes", "status", "created_at", "updated_at") FROM stdin;
\.


--
-- Data for Name: request_media; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."request_media" ("id", "service_request_id", "storage_path", "content_type", "byte_size", "created_at") FROM stdin;
\.


--
-- Data for Name: reviews; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."reviews" ("id", "booking_id", "user_account_id", "worker_account_id", "stars", "body", "recommend_worker", "moderation_status", "moderated_by", "moderated_at", "created_at", "updated_at") FROM stdin;
\.


--
-- Data for Name: review_ai_insights; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."review_ai_insights" ("review_id", "sentiment", "topics", "risk_flags", "confidence", "provider", "model", "provider_reference", "created_at") FROM stdin;
\.


--
-- Data for Name: review_media; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."review_media" ("id", "review_id", "storage_path", "content_type", "byte_size") FROM stdin;
\.


--
-- Data for Name: review_replies; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."review_replies" ("id", "review_id", "author_id", "body", "created_at", "updated_at") FROM stdin;
\.


--
-- Data for Name: review_reports; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."review_reports" ("id", "review_id", "reporter_id", "reason", "status", "resolved_by", "resolved_at", "created_at") FROM stdin;
\.


--
-- Data for Name: review_votes; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."review_votes" ("review_id", "account_id", "helpful", "created_at") FROM stdin;
\.


--
-- Data for Name: route_snapshots; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."route_snapshots" ("id", "booking_id", "requested_by", "route_geojson", "distance_meters", "duration_seconds", "worker_location", "destination", "created_at") FROM stdin;
\.


--
-- Data for Name: services; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."services" ("id", "category_id", "industry_id", "slug", "name", "description", "minimum_price_minor", "maximum_price_minor", "estimated_duration_minutes", "is_safety_critical", "is_active", "created_at", "updated_at") FROM stdin;
\.


--
-- Data for Name: skills; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."skills" ("id", "industry_id", "slug", "name", "description", "is_active", "created_at", "updated_at") FROM stdin;
\.


--
-- Data for Name: support_tickets; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."support_tickets" ("id", "owner_id", "booking_id", "subject", "description", "status", "resolution", "escalated_at", "resolved_at", "closed_at", "created_at", "updated_at", "category", "priority", "assigned_to") FROM stdin;
\.


--
-- Data for Name: support_messages; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."support_messages" ("id", "ticket_id", "sender_id", "body", "created_at") FROM stdin;
\.


--
-- Data for Name: support_attachments; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."support_attachments" ("id", "support_message_id", "storage_path", "content_type", "byte_size", "created_at") FROM stdin;
\.


--
-- Data for Name: system_settings; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."system_settings" ("key", "value", "updated_by", "updated_at") FROM stdin;
ai.enabled	false	\N	2026-07-21 14:29:33.171877+00
ai.consent_version	"2026-07-21"	\N	2026-07-21 14:29:33.171877+00
ai.gemini_model	"gemini-2.5-flash"	\N	2026-07-21 14:29:33.171877+00
ai.openai_model	"gpt-5.6-terra"	\N	2026-07-21 14:29:33.171877+00
ai.openai_transcription_model	"gpt-4o-mini-transcribe-2025-12-15"	\N	2026-07-21 14:29:33.171877+00
ai.per_user_daily_quota	20	\N	2026-07-21 14:29:33.171877+00
ai.platform_monthly_budget_minor	0	\N	2026-07-21 14:29:33.171877+00
ai.max_concurrency	4	\N	2026-07-21 14:29:33.171877+00
ai.timeout_ms	45000	\N	2026-07-21 14:29:33.171877+00
ai.circuit_breaker_failures	5	\N	2026-07-21 14:29:33.171877+00
geocoding.enabled	true	\N	2026-07-21 14:29:33.171877+00
matching.weights	{"rating": 0.20, "distance": 0.30, "priority": 0.05, "availability": 0.20, "completed_jobs": 0.10, "response_history": 0.10, "cancellation_history": 0.05}	\N	2026-07-21 14:29:33.171877+00
maps.style_url	"https://tiles.openfreemap.org/styles/liberty"	\N	2026-07-21 14:29:33.171877+00
\.


--
-- Data for Name: trash_entries; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."trash_entries" ("id", "entity_type", "entity_id", "snapshot", "deleted_by", "deleted_at", "restored_at", "restored_by") FROM stdin;
\.


--
-- Data for Name: wallets; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."wallets" ("account_id", "currency", "available_minor", "locked_minor", "created_at", "updated_at") FROM stdin;
\.


--
-- Data for Name: wallet_transactions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."wallet_transactions" ("id", "wallet_account_id", "booking_id", "payout_request_id", "transaction_type", "amount_minor", "balance_after_minor", "idempotency_key", "metadata", "created_at") FROM stdin;
\.


--
-- Data for Name: worker_availability; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."worker_availability" ("id", "worker_id", "day_of_week", "start_time", "end_time", "timezone") FROM stdin;
\.


--
-- Data for Name: worker_offerings; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."worker_offerings" ("id", "worker_id", "service_id", "price_minor", "description", "is_active", "created_at", "updated_at") FROM stdin;
\.


--
-- Data for Name: worker_portfolio_media; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."worker_portfolio_media" ("id", "worker_id", "storage_path", "caption", "sort_order", "created_at") FROM stdin;
\.


--
-- Data for Name: worker_skills; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."worker_skills" ("worker_id", "category_id", "years") FROM stdin;
\.


--
-- Data for Name: worker_verifications; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."worker_verifications" ("id", "worker_id", "status", "identity_data", "document_paths", "requested_notes", "reviewed_by", "reviewed_at", "created_at", "updated_at") FROM stdin;
\.


--
-- Data for Name: buckets; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--

COPY "storage"."buckets" ("id", "name", "owner", "created_at", "updated_at", "public", "avif_autodetection", "file_size_limit", "allowed_mime_types", "owner_id", "type") FROM stdin;
booking-evidence	booking-evidence	\N	2026-07-14 04:16:29.759888+00	2026-07-14 04:16:29.759888+00	f	f	\N	\N	\N	STANDARD
chat-attachments	chat-attachments	\N	2026-07-21 14:29:33.840639+00	2026-07-21 14:29:33.840639+00	f	f	15728640	{image/jpeg,image/png,image/webp,application/pdf}	\N	STANDARD
identity-documents	identity-documents	\N	2026-07-16 06:05:58.486779+00	2026-07-16 06:05:58.486779+00	f	f	10485760	{image/jpeg,image/png,image/webp}	\N	STANDARD
service-request-media	service-request-media	\N	2026-07-14 04:16:25.258581+00	2026-07-14 04:16:25.258581+00	f	f	\N	\N	\N	STANDARD
support-attachments	support-attachments	\N	2026-07-21 14:29:33.840639+00	2026-07-21 14:29:33.840639+00	f	f	15728640	{image/jpeg,image/png,image/webp,application/pdf}	\N	STANDARD
profile-avatars	profile-avatars	\N	2026-07-21 15:48:09.385244+00	2026-07-21 15:48:09.385244+00	f	f	5242880	{image/jpeg,image/png,image/webp,image/heic}	\N	STANDARD
worker-portfolio	worker-portfolio	\N	2026-07-14 04:16:29.759888+00	2026-07-14 04:16:29.759888+00	f	f	10485760	{image/jpeg,image/png,image/webp,image/heic}	\N	STANDARD
request-media	request-media	\N	2026-07-20 08:21:24.010118+00	2026-07-20 08:21:24.010118+00	f	f	15728640	{image/jpeg,image/png,image/webp}	\N	STANDARD
verification-documents	verification-documents	\N	2026-07-14 04:16:20.032209+00	2026-07-14 04:16:20.032209+00	f	f	15728640	{image/jpeg,image/png,application/pdf}	\N	STANDARD
message-attachments	message-attachments	\N	2026-07-20 08:21:24.010118+00	2026-07-20 08:21:24.010118+00	f	f	15728640	{image/jpeg,image/png,image/webp,audio/mpeg,audio/mp4,audio/wav}	\N	STANDARD
review-media	review-media	\N	2026-07-14 04:16:29.759888+00	2026-07-14 04:16:29.759888+00	f	f	15728640	{image/jpeg,image/png,image/webp}	\N	STANDARD
profile-images	profile-images	\N	2026-07-20 08:21:24.010118+00	2026-07-20 08:21:24.010118+00	f	f	5242880	{image/jpeg,image/png,image/webp}	\N	STANDARD
report-exports	report-exports	\N	2026-07-20 08:21:24.010118+00	2026-07-20 08:21:24.010118+00	f	f	52428800	{text/csv,application/pdf,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet}	\N	STANDARD
\.


--
-- Data for Name: buckets_analytics; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--

COPY "storage"."buckets_analytics" ("name", "type", "format", "created_at", "updated_at", "id", "deleted_at") FROM stdin;
\.


--
-- Data for Name: buckets_vectors; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--

COPY "storage"."buckets_vectors" ("id", "type", "created_at", "updated_at") FROM stdin;
\.


--
-- Data for Name: objects; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--

COPY "storage"."objects" ("id", "bucket_id", "name", "owner", "created_at", "updated_at", "last_accessed_at", "metadata", "version", "owner_id", "user_metadata") FROM stdin;
51e9fc32-d01d-446d-b8ac-ce64025ad0f8	request-media	032a57ad-8355-4751-99f8-2b1b4cc8ebf9/1ed33468-dc63-4013-aa37-c66d022cd397/38594f48-4b24-41b5-9717-92b3557c8cbc-wallpaper.png	032a57ad-8355-4751-99f8-2b1b4cc8ebf9	2026-07-21 02:07:15.613355+00	2026-07-21 02:07:15.613355+00	2026-07-21 02:07:15.613355+00	{"eTag": "\\"660866b5c4e54e53bd7aa39a95822da3\\"", "size": 3054522, "mimetype": "image/png", "cacheControl": "max-age=3600", "lastModified": "2026-07-21T02:07:16.000Z", "contentLength": 3054522, "httpStatusCode": 200}	6939dcff-5db5-48aa-af92-36ee634b70ad	032a57ad-8355-4751-99f8-2b1b4cc8ebf9	{}
e76c8241-308e-4f77-89b2-a862dabb58eb	request-media	032a57ad-8355-4751-99f8-2b1b4cc8ebf9/b56387c9-ebf2-4763-b231-5a2089b65d53/22dbb196-9e02-490e-aaed-c69e7a084110-wallpaper.png	032a57ad-8355-4751-99f8-2b1b4cc8ebf9	2026-07-21 03:25:36.418512+00	2026-07-21 03:25:36.418512+00	2026-07-21 03:25:36.418512+00	{"eTag": "\\"660866b5c4e54e53bd7aa39a95822da3\\"", "size": 3054522, "mimetype": "image/png", "cacheControl": "max-age=3600", "lastModified": "2026-07-21T03:25:37.000Z", "contentLength": 3054522, "httpStatusCode": 200}	2cc2de66-8d71-4c97-969a-adee9d43494e	032a57ad-8355-4751-99f8-2b1b4cc8ebf9	{}
\.


--
-- Data for Name: s3_multipart_uploads; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--

COPY "storage"."s3_multipart_uploads" ("id", "in_progress_size", "upload_signature", "bucket_id", "key", "version", "owner_id", "created_at", "user_metadata", "metadata") FROM stdin;
\.


--
-- Data for Name: s3_multipart_uploads_parts; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--

COPY "storage"."s3_multipart_uploads_parts" ("id", "upload_id", "size", "part_number", "bucket_id", "key", "etag", "owner_id", "version", "created_at") FROM stdin;
\.


--
-- Data for Name: vector_indexes; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--

COPY "storage"."vector_indexes" ("id", "name", "bucket_id", "data_type", "dimension", "distance_metric", "metadata_configuration", "created_at", "updated_at") FROM stdin;
\.


--
-- Name: refresh_tokens_id_seq; Type: SEQUENCE SET; Schema: auth; Owner: supabase_auth_admin
--

SELECT pg_catalog.setval('"auth"."refresh_tokens_id_seq"', 90, true);


--
-- Name: q_booking_timeouts_msg_id_seq; Type: SEQUENCE SET; Schema: pgmq; Owner: postgres
--

SELECT pg_catalog.setval('"pgmq"."q_booking_timeouts_msg_id_seq"', 1, false);


--
-- Name: q_no_match_notifications_msg_id_seq; Type: SEQUENCE SET; Schema: pgmq; Owner: postgres
--

SELECT pg_catalog.setval('"pgmq"."q_no_match_notifications_msg_id_seq"', 1, false);


--
-- Name: q_provider_work_msg_id_seq; Type: SEQUENCE SET; Schema: pgmq; Owner: postgres
--

SELECT pg_catalog.setval('"pgmq"."q_provider_work_msg_id_seq"', 1, false);


--
-- Name: q_scheduled_notifications_msg_id_seq; Type: SEQUENCE SET; Schema: pgmq; Owner: postgres
--

SELECT pg_catalog.setval('"pgmq"."q_scheduled_notifications_msg_id_seq"', 1, false);


--
-- PostgreSQL database dump complete
--

-- \unrestrict hvounzfdAGfCyWLv5FWb9INCP40qLSZnhzF0EKoTKaLG4hEk5TtEdhnhj5WCfP5

RESET ALL;
