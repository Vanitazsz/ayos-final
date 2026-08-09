USER ACCEPTANCE TESTING (UAT)
AYOS SYSTEM
Date: August 7, 2026
Company Name: StartupLab - Business Center & AI Consultant
Legend: P - Passed; F – Failed

Hosted prerequisites (operator verification required before UAT):

- Confirm the Supabase `system_settings` value for `ai.enabled` and the configured AI consent version.
- Confirm server-only OpenAI, Gemini, and OpenRouter keys/models are configured for the deployed Edge Functions.
- Confirm Supabase Auth “Confirm email” behavior and the production OTP email template/redirect settings.
- These hosted values are not verifiable from this repository and must not be marked passed from static inspection alone.

UAT#1: Login
Objective: To verify that users can securely access A-YOS using valid credentials, and that invalid access attempts are properly handled before any other module can be used.
Preconditions: User has a registered account (Homeowner, Worker, or Administrator) and the application is reachable.
No. Module Scenario Status Comments
1 Login Open the application login page
2 Login Enter a valid registered email and password, then log in
3 Login Verify successful login opens the appropriate Home or Dashboard screen
4 Login Verify unauthorized access to protected pages redirects the user back to Login
Login Verify the Remember Me option keeps the user signed in on the next visit

UAT#2: Homeowner Registration & Onboarding
Objective: To verify that a new homeowner can create an account and complete basic onboarding before using the platform.
Preconditions: The mobile app is reachable and the user has a valid email and mobile number.
No. Module Scenario Status Comments
1 Registration Open the Create Account screen from the landing page
2 Registration Enter name, mobile number, email, password, password confirmation, and accept the terms
3 Registration Submit and verify the OTP is requested and validated
4 Registration Verify invalid or incomplete registration details show clear feedback
5 Registration Verify the new account is signed in automatically and opens the Home screen

UAT#3: Worker Registration & Onboarding
Objective: To verify that a new worker can create an account, set up their services and skills, and submit identity documents for administrator review.
Preconditions: The mobile app is reachable and the user has a valid email, government ID, and photo.
No. Module Scenario Status Comments
1 Worker Registration Open the Register as Worker flow
2 Worker Registration Complete the worker account and email/OTP verification
3 Worker Registration Select industry and service categories/skills from the catalog
4 Worker Registration Set up services, service area, availability, and experience
5 Worker Registration Submit identity information and government ID for review

UAT#4: Home Dashboard Module
Objective: To verify that the home screen presents the service catalog and main navigation after sign-in.
Preconditions: User has signed in as a homeowner.
No. Module Scenario Status Comments
1 Home Dashboard Open the Home screen after sign-in
2 Home Dashboard View the main navigation: Home, Bookings, Create, Messages, and Account
3 Home Dashboard Browse the service categories presented on Home
4 Home Dashboard Search the service catalog and view the first set of results

UAT#5: Worker Discovery & Comparison
Objective: To verify that homeowners can browse, view, compare, and contact workers before sending a booking request.
Preconditions: User is signed in as a homeowner and approved workers exist for the selected category.
No. Module Scenario Status Comments
1 Worker Discovery Open a worker profile and view rating, reviews, skills, experience, availability, and pricing
2 Worker Discovery Search and filter workers by category and sorting options
3 Worker Discovery Open the top five matches comparison view
4 Worker Discovery Send a message to a worker before selecting them
5 Worker Discovery Verify the conversation appears in Messages

UAT#6: Service Request Creation
Objective: To verify that a homeowner can create a service request with all required details and request AI assistance.
Preconditions: User is signed in as a homeowner with location access and a photo available.
No. Module Scenario Status Comments
1 Service Request Open the Create / Send Request flow and select a service category
2 Service Request Enter the issue description, budget, and notes
3 Service Request Attach a photo to the request
4 Service Request Confirm the service address and preferred schedule
5 Service Request Review the request summary before sending
6 Service Request Use the AI Home Assistant to analyze an issue and create a request draft
7 Service Request Send the request and verify a confirmation appears

UAT#7: Matching Module
Objective: To verify that the system recommends suitable workers for a request and handles no-match situations.
Preconditions: User has an open service request.
No. Module Scenario Status Comments
1 Matching View the list of matched workers for the request
2 Matching Verify matched workers are ordered by suitability (skills, location, availability, rating)
3 Matching Select a worker and send a booking request
4 Matching Verify a clear message appears when no workers are available and filters/date can be adjusted

UAT#8: Booking Module
Objective: To verify that bookings follow the canonical status lifecycle and support cancellation.
Preconditions: A booking request has been sent to a worker.
No. Module Scenario Status Comments
1 Booking View the booking with Pending status after the request is sent
2 Booking Verify the status updates to Accepted when the worker accepts
3 Booking Verify the status progresses through Preparing, En Route, Arrived, Service Started, In Progress, and Completed
4 Booking Accept, decline, or time out a request from the worker side and verify the homeowner is notified
5 Booking Cancel a booking with a reason and confirm the cancellation
6 Booking View the cancellation reason and refund policy before confirming
7 Booking View bookings organized into Upcoming, Ongoing, Completed, and Cancelled

UAT#9: Live Tracking Module
Objective: To verify that authorized participants can view live worker location and ETA during an active booking.
Preconditions: A booking is in En Route status and location permission is available.
No. Module Scenario Status Comments
1 Live Tracking Allow location access when prompted during tracking
2 Live Tracking View the worker's location and ETA on the map
3 Live Tracking Verify location access denial is explained with a retry option
4 Live Tracking Verify Call, Chat, and Emergency options are available during an active booking
5 Live Tracking Confirm Arrival is enabled only after the worker location is persisted within the service radius
6 Live Tracking Confirm Completion changes the booking to Completed without silently charging the customer
7 Live Tracking View proof-of-work photos at Pending Confirmation and Completed

UAT#10: Messaging Module
Objective: To verify that homeowners and workers can communicate through chat with attachments and location sharing.
Preconditions: Both parties are signed in and share an active conversation.
No. Module Scenario Status Comments
1 Messaging Open the Messages list and select a conversation
2 Messaging Send a text message and verify the recipient receives it
3 Messaging Share an image and a location in the conversation
4 Messaging Verify message alerts appear in the notifications

UAT#11: Cash Payment Module
Objective: To verify that cash payment is confirmed by both parties and a receipt is generated.
Preconditions: A booking is in Completed status.
No. Module Scenario Status Comments
1 Cash Payment Open the payment screen for a completed booking
2 Cash Payment Confirm cash payment as the homeowner and verify status is awaiting worker confirmation
3 Cash Payment Confirm payment received as the worker and verify payment becomes successful
5 Cash Payment Verify the receipt shows the service amount, effective category commission, worker net amount, and homeowner charge (PHP 0)
6 Cash Payment Repeat with simulated GCash and verify the same effective commission is used

UAT#12: Reviews Module
Objective: To verify that homeowners can rate and review completed, paid bookings and that worker can view the feedback.
Preconditions: A booking is Completed and cash payment is confirmed by both parties.
No. Module Scenario Status Comments
1 Reviews Open the Rate & Review screen for a completed, paid booking
2 Reviews Submit a star rating, written review, photos, and a recommendation
3 Reviews Verify the feedback-submitted confirmation appears
4 Reviews Verify the review option is not available for bookings that are not completed and paid
5 Reviews Open the worker's Rate & Review modal and verify the feedback is read-only

UAT#13: Homeowner Profile & Settings
Objective: To verify that homeowners can manage their profile, saved addresses, preferences, and language.
Preconditions: User is signed in as a homeowner.
No. Module Scenario Status Comments
1 Homeowner Settings View and update personal profile information
2 Homeowner Settings Add and manage saved service addresses
3 Homeowner Settings Change notification preferences and verify alerts are received
4 Homeowner Settings Switch the app language between Filipino and English
5 Homeowner Settings View booking history and account details

UAT#14: Worker Dashboard / Job Posts Module
Objective: To verify that approved workers can view suitable requests and accept or decline them.
Preconditions: User is signed in as an approved worker with a completed profile.
No. Module Scenario Status Comments
1 Worker Dashboard Open the worker Dashboard / Job Posts
2 Worker Dashboard View only requests that match the worker's skills and service area
3 Worker Dashboard Open a request and view description, photos, address, schedule, and budget
4 Worker Dashboard Accept a request and verify it becomes a booking
5 Worker Dashboard Decline a request with a reason

UAT#15: Worker Booking Management
Objective: To verify that workers can start, progress, and complete accepted jobs.
Preconditions: Worker has an Accepted booking.
No. Module Scenario Status Comments
1 Worker Booking Open an Accepted booking and start the service
2 Worker Booking Progress the booking through the canonical statuses
3 Worker Booking Complete the job and verify status shows Completed
4 Worker Booking Cancel a job with a reason and confirmation

UAT#16: Wallet Module
Objective: To verify that workers can view their balance, request top-ups and payouts, and review transactions.
Preconditions: Worker has a wallet and at least one completed, paid booking.
No. Module Scenario Status Comments
1 Wallet Open the Wallet and view the current balance and recent activity
2 Wallet Submit a manual GCash top-up with amount, reference, and screenshot proof and verify it is pending review
3 Wallet Add a payout destination
4 Wallet Request a payout and verify it is pending
5 Wallet Verify the balance updates after administrator approval of a top-up or payout
6 Wallet Open transaction history and view payments, commissions, top-ups, and payouts

UAT#17: Admin Login
Objective: To verify that an administrator can securely access the protected dashboard using valid credentials, and that unauthorized access is blocked.
Preconditions: An Administrator account has been provisioned and the dashboard is reachable.
No. Module Scenario Status Comments
1 Admin Login Open the administrator login page
2 Admin Login Enter valid Administrator credentials and verify redirection to the Dashboard
3 Admin Login Enter invalid credentials and verify an error message appears
4 Admin Login Verify that opening a protected admin route without an active session redirects to Login
5 Admin Login Verify that a suspended Administrator account cannot sign in

UAT#18: Admin Dashboard
Objective: To verify that the Dashboard correctly summarizes platform activity after login.
Preconditions: Administrator has successfully logged in.
No. Module Scenario Status Comments
1 Admin Dashboard Open the Dashboard module
2 Admin Dashboard View the dashboard statistics for total users, total workers, total bookings, total revenue (completed payments), pending worker verifications, and new users this month
3 Admin Dashboard View the recent activity list of the latest audit log entries
4 Admin Dashboard Open navigation to the main management modules

UAT#19: Account & Worker Management
Objective: To verify that administrators can manage homeowner and worker accounts including account status, worker approval, and document requests.
Preconditions: Administrator is logged in and account records exist.
No. Module Scenario Status Comments
1 Account Management Open the Users and Workers lists and use search and filters
2 Account Management Open a worker's details and view profile, industry, skills, documents, service areas, wallet, and verification status
3 Account Management Approve a pending worker and verify the worker becomes available for job acceptance and receives a wallet
4 Account Management Reject a pending worker and verify a rejection reason is required and recorded
5 Account Management Request more documents from a worker and verify the verification status changes
6 Account Management Suspend a user and verify the account cannot sign in and active sessions are revoked
7 Account Management Change a suspended user's status back to Active and verify the user can sign in again

UAT#20: Booking Management Module (Admin)
Objective: To verify that administrators can review bookings and filter them by status.
Preconditions: Administrator is logged in and booking records exist.
No. Module Scenario Status Comments
1 Booking Management Open a booking and view the customer, worker, service, and amount details
2 Booking Management Filter bookings by status and verify the list updates

UAT#21: Financial Management Module (Admin)
Objective: To verify that administrators can review payments, view payment summaries, and manage platform fee settings.
Preconditions: Administrator is logged in and payment records exist.
No. Module Scenario Status Comments
1 Financial Management Open the payment records and view amount, status, customer, booking, and refunds
2 Financial Management Filter payments by status and view the payment summary
3 Financial Management View and update platform settings including the global worker commission, per-service-category overrides, and the worker activation fee contract

UAT#22: Services & Catalog Management
Objective: To verify that administrators can manage service categories and services.
Preconditions: Administrator is logged in.
No. Module Scenario Status Comments
1 Catalog Management Add, edit, or deactivate a service category
2 Catalog Management Add, edit, or deactivate a service and verify price, duration, and status settings
3 Catalog Management Verify the category list shows the number of services per category
4 Catalog Management Verify catalog changes are reflected in the mobile catalog

UAT#23: Reviews Moderation
Objective: To verify that reviews auto-publish to worker profiles and that administrators can moderate (hide, flag, or restore) reviews.
Preconditions: Administrator is logged in and submitted reviews exist.
No. Module Scenario Status Comments
1 Reviews Moderation Open the Reviews list and view review moderation status
2 Reviews Moderation Reject (hide) a published review and verify it no longer appears on worker profiles
3 Reviews Moderation Publish a previously hidden review and verify it appears on worker profiles

UAT#24: Support Module
Objective: To verify that administrators can manage support tickets including replies, assignment, priority, escalation, resolution, closure, and reopening.
Preconditions: Administrator is logged in and support tickets exist.
No. Module Scenario Status Comments
1 Support Open the Support module and select a ticket
2 Support Reply to a support ticket
3 Support Update a ticket's assigned administrator, priority, or status
4 Support Escalate an unresolved ticket and verify the status changes to Escalated
5 Support Resolve and close a ticket, then reopen it and verify it returns to the open list

UAT#25: Notifications Module
Objective: To verify that administrators can create and send notification campaigns to targeted audiences.
Preconditions: Administrator is logged in.
No. Module Scenario Status Comments
1 Notifications Open the Notifications module
2 Notifications Create a notification campaign and select an audience (all users, workers only, customers only, or inactive users)
3 Notifications Send a campaign and verify recipients receive an in-app alert
4 Notifications Verify a sent campaign cannot be edited

UAT#26: Reports & Analytics
Objective: To verify that administrators can generate, view, and download reports.
Preconditions: Administrator is logged in and sufficient platform records exist.
No. Module Scenario Status Comments
1 Reports Open the Reports / Analytics module
2 Reports Generate a report with a date range and verify the summary counts for users, workers, bookings, completed payments, and revenue
3 Reports Export a report in JSON or CSV format
4 Reports Verify the exported file appears in the reports list and can be downloaded

UAT#27: System Settings
Objective: To verify that administrators can view, change, and save system settings.
Preconditions: Administrator is logged in.
No. Module Scenario Status Comments
1 System Settings Open the Settings module and view the configured settings
2 System Settings Change a setting and save it
3 System Settings Verify the saved value persists after reloading the module

UAT#28: Audit Log, Trash & Restore
Objective: To verify that important actions are recorded in the audit log and that deleted records can be restored.
Preconditions: Administrator is logged in and prior actions and deletions exist.
No. Module Scenario Status Comments
1 Audit Log Open the Audit Log and view actor, action, entity, and timestamp
2 Trash Open the Trash and view deleted records
3 Trash Restore a deleted user record and verify it returns to its module
4 Trash Verify restoring a record of an unsupported entity type is blocked with a clear message

UAT#29: Logout
Objective: To verify that users can securely end their session and that protected data is no longer accessible after logout.
Preconditions: User is signed in.
No. Module Scenario Status Comments
1 Logout Select Logout
2 Logout Verify the active session is cleared
3 Logout Verify the user is redirected to the Login page
4 Logout Verify accessing protected pages after logout redirects back to Login

UAT#30: Voice & AI Assistant
Objective: To verify that optional AI assistance is consent-gated, produces editable results when configured, and exposes safe recovery when AI or transcription is unavailable.
Preconditions: The mobile app is reachable; the operator has verified the hosted AI/Auth prerequisites above; a customer account and a sample photo/audio recording are available.
No. Module Scenario Status Comments
1 Voice & AI Open service-request creation, open AI assistance, and verify the consent notice is shown before media processing
2 Voice & AI Record a supported voice issue and verify the transcript and editable request draft appear when a provider is enabled
3 Voice & AI Force or simulate transcription-provider failure and verify a stable visible error offers Retry and Use written description without marking the request successful
4 Voice & AI Submit an image without audio and verify image-only analysis still returns an editable issue explanation
5 Voice & AI Disable `ai.enabled` in hosted Supabase and verify the app shows a clear manual-entry path
6 Voice & AI Remove or invalidate the provider key in a controlled environment and verify no key or raw provider payload is shown to the user
7 Voice & AI Reject or change the consent version and verify processing is blocked until the current consent is accepted
8 Voice & AI Edit the AI-generated description/category details and verify the user can review the draft before sending the request

Overall UAT Results
Objective: To confirm that the full UAT scope has been executed and to record the final readiness decision.
Preconditions: All applicable UAT sections above have been executed.
No. Module Scenario Status Comments
1 Overall UAT Results Confirm all applicable module scenarios have been executed
2 Overall UAT Results Count total Passed and Failed scenarios Passed:

Failed:
3 Overall UAT Results Total Success Rate of the UAT %
