 USER ACCEPTANCE TESTING (UAT)
AYOS SYSTEM
Date: August 11, 2026
Company Name: StartupLab - Business Center & AI Consultant
Legend: P - Passed; F – Failed
UAT#1: Sign In (Homeowner)
Objective: To verify that a homeowner can sign in to the correct workspace and reach the Home screen, and that the Sign In screen secondary actions navigate correctly.
Preconditions: Registered, email-verified homeowner test account exists. Tester is already on the Sign In screen.
No.	Module	Scenario	Status	Comments
1	Sign In	Enter homeowner test email in Email Address -> field accepts input		
2	Sign In	Enter homeowner test password in Password -> input is masked by default		
3	Sign In	Tap the eye icon -> password visibility toggles		
4	Sign In	Check Remember Me, then tap Login -> Home screen loads with greeting and Explore Services categories		
5	Sign In	Close and reopen the app -> session persists without re-prompting for email/password (Remember Me honored)		
6	Sign In	Tap Forgot password? -> navigates to Password Recovery		
7	Sign In	Tap Create an account -> navigates to Create Account flow		
8	Sign In	Tap Continue with Google -> Google auth flow launches		

UAT#2: Password Recovery (Homeowner)
Objective: To verify that a homeowner can reset a forgotten password through the reset-link flow and sign in with the new password.
Preconditions: Registered homeowner test account exists and its email inbox (or Mailpit) is accessible. Tester is already on the Sign In screen.
No.	Module	Scenario	Status	Comments
1	Password Recovery	Tap Forgot password? -> Password Recovery screen opens with an Email Address field		
2	Password Recovery	Enter the test account email in Email Address -> field accepts input		
3	Password Recovery	Tap Send Reset Link -> confirmation message appears that the reset link was sent to the email		
4	Password Recovery	Open the email and tap the reset link -> password reset page opens		
5	Password Recovery	Enter a new password in New Password and confirm it in Confirm Password -> inputs accepted and masked		
6	Password Recovery	Tap Reset Password -> password updated confirmation appears		
7	Password Recovery	Sign in with the new password -> Home screen opens		

UAT#3: Create Account (Homeowner)
Objective: To verify that a new homeowner can create an account and reach the email verification step.
Preconditions: A new, unregistered email address is available. Terms and Conditions and Privacy Policy are published. Tester is already on the Sign In screen.
No.	Module	Scenario	Status	Comments
1	Create Account	Tap Create an account -> account type selection opens with I need services and I provide services cards		
2	Create Account	Tap the I need services card -> homeowner registration form opens		
3	Create Account	Enter full name in Full Name -> field accepts input		
4	Create Account	Enter mobile number with country code in Mobile Number -> field accepts input		
5	Create Account	Enter the email address in Email Address -> field accepts input		
6	Create Account	Enter a password in Password and re-enter it in Confirm Password -> inputs accepted and masked		
7	Create Account	Check the Terms and Conditions & Privacy Policy checkbox -> box is selectable		
8	Create Account	Tap Send Email Code -> account is created and Email Verification screen opens		

UAT#4: Email Verification (Homeowner)
Objective: To verify that a new homeowner account is activated after entering the correct email verification code.
Preconditions: A homeowner registration has been submitted and the Email Verification screen is open. The email inbox (or Mailpit) is accessible.
No.	Module	Scenario	Status	Comments
1	Email Verification	Open the email inbox and read the 6-digit verification code -> code found		
2	Email Verification	Enter the code in the code boxes -> digits accepted		
3	Email Verification	Tap Verify -> account is verified and the app proceeds to sign-in or account setup		

UAT#5: Home Screen (Homeowner)
Objective: To verify that the Home screen loads after sign-in and all main navigation tabs respond correctly.
Preconditions: Signed in as a homeowner. Home screen is open.
No.	Module	Scenario	Status	Comments
1	Home Screen	Verify the greeting shows the homeowner name -> greeting displayed		
2	Home Screen	Verify the Explore Services category grid is visible -> categories shown		
3	Home Screen	Tap the Activity tab -> My Bookings screen opens		
4	Home Screen	Tap the Messages tab -> Messages screen opens		
5	Home Screen	Tap the Account tab -> Profile screen opens		
6	Home Screen	Tap the Home tab -> returns to Home screen		

UAT#6: Service Discovery (Homeowner)
Objective: To verify that a homeowner can browse service categories and search for workers from the Home screen.
Preconditions: Signed in as a homeowner. At least one service category with approved workers exists. Tester is on the Home screen.
No.	Module	Scenario	Status	Comments
1	Service Discovery	Tap a service category (for example Cleaning) -> category page opens with heading such as Cleaning Experts		
2	Service Discovery	Review the worker list on the category page -> available professionals shown		
3	Service Discovery	Tap a worker card -> worker details open		
4	Service Discovery	Tap the Search workers... field -> keyboard opens and field is focused		
5	Service Discovery	Enter a service or worker name -> matching results appear		
6	Service Discovery	Tap a search result -> worker or service details open		

UAT#7: Worker Details (Homeowner)
Objective: To verify that a homeowner can review the complete worker profile before deciding.
Preconditions: Signed in as a homeowner. A worker profile is open.
No.	Module	Scenario	Status	Comments
1	Worker Details	Verify the worker name and category at the top of the profile -> displayed		
2	Worker Details	Verify the Verified badge -> visible on the profile		
3	Worker Details	Verify the rating and number of reviews -> displayed		
4	Worker Details	Review the About section -> worker information shown		
5	Worker Details	Open the Services Offered section -> services and prices listed		
6	Worker Details	Open the Reviews section -> published reviews visible		

UAT#8: AI Home Assistant (Homeowner)
Objective: To verify that the AI Home Assistant analyzes an issue and produces an editable service-request draft.
Preconditions: Signed in as a homeowner. AI providers are configured in the test environment. Tester is on the Home screen.
No.	Module	Scenario	Status	Comments
1	AI Home Assistant	Tap the + button -> request screen opens with the A-yos AI instructions		
2	AI Home Assistant	Enter an issue description in Describe the problem (at least 10 characters) -> field accepts input		
3	AI Home Assistant	Tap Take Photo or Upload Photo (optional) -> photo attaches to the request		
4	AI Home Assistant	Tap Record Voice (optional) -> spoken description recorded and converted to text		
5	AI Home Assistant	Check the AI consent checkbox -> consent accepted		
6	AI Home Assistant	Tap Continue -> AI analyzes the issue		
7	AI Home Assistant	Review the AI result: detected issue, severity, suggested category, estimated cost range, and safety advice -> all shown		
8	AI Home Assistant	Review the editable request draft -> draft can be edited		

UAT#9: Create Request (Service & Location) (Homeowner)
Objective: To verify that a homeowner can prepare a service request with service, description, photo, and address.
Preconditions: Signed in as a homeowner with verified identity and location permission. Tester is on the Home screen.
No.	Module	Scenario	Status	Comments
1	Create Request (Service & Location)	Tap the + button -> Create Request screen opens		
2	Create Request (Service & Location)	Tap a service category in the Select Service section -> service selected		
3	Create Request (Service & Location)	Enter the issue description in Describe the problem (at least 10 characters) -> field accepts input		
4	Create Request (Service & Location)	Tap Upload Photo -> photo attaches to the request		
5	Create Request (Service & Location)	Enter the service address in the Service Location section -> field accepts input		
6	Create Request (Service & Location)	Tap Continue -> proceeds to the urgency and schedule step		

UAT#10: Schedule & Review (Homeowner)
Objective: To verify that a homeowner can set urgency and schedule, review the summary, and post the request.
Preconditions: A request is in progress and the urgency screen is open.
No.	Module	Scenario	Status	Comments
1	Schedule & Review	Choose urgency ASAP / Emergency or This Week -> urgency selected		
2	Schedule & Review	Tap Review Request -> schedule screen opens		
3	Schedule & Review	Tap a day -> day selected		
4	Schedule & Review	Tap a time slot (Morning 8am-12pm, Afternoon 12-4pm, or Evening 4-8pm) -> slot selected		
5	Schedule & Review	Verify Post Request becomes enabled only after a day and time are chosen -> button enabled		
6	Schedule & Review	Review the request summary -> service, description, address, schedule, and budget are shown		
7	Schedule & Review	Tap Post Request -> request is posted and the matching screen opens		

UAT#11: Worker Matching & Selection (Homeowner)
Objective: To verify that eligible workers are matched, appear with distance and rate, and can be hired to create a booking.
Preconditions: A request has been posted and the matching screen is open. An approved, online worker is available in the test area.
No.	Module	Scenario	Status	Comments
1	Worker Matching & Selection	Review the search radius setting -> current radius shown		
2	Worker Matching & Selection	Adjust the search radius with the controls -> radius updates		
3	Worker Matching & Selection	Tap Start Matching -> message shows how many workers were notified		
4	Worker Matching & Selection	Review the matched worker cards -> each shows name, distance, and rate		
5	Worker Matching & Selection	Tap Accept Worker on an accepting worker -> Hire This Worker? confirmation appears		
6	Worker Matching & Selection	Tap Hire Worker -> booking is created and opens in the tracking or booking details screen		

UAT#12: My Bookings (Activity) (Homeowner)
Objective: To verify that the Activity screen groups bookings into Upcoming, Ongoing, Completed, and Cancelled and opens booking details.
Preconditions: Signed in as a homeowner with bookings in different states. Tester is on the Home screen.
No.	Module	Scenario	Status	Comments
1	My Bookings (Activity)	Tap the Activity tab -> My Bookings screen opens		
2	My Bookings (Activity)	Open the Upcoming tab -> upcoming (Pending / Accepted) bookings listed		
3	My Bookings (Activity)	Open the Ongoing tab -> active bookings listed		
4	My Bookings (Activity)	Open the Completed tab -> completed bookings listed		
5	My Bookings (Activity)	Open the Cancelled tab -> cancelled bookings listed		
6	My Bookings (Activity)	Tap a booking -> booking details shown (service, provider, date, amount)		

UAT#13: Booking Details & Lifecycle (Homeowner)
Objective: To verify that the homeowner can watch the booking progress through its official statuses, use contact options, and confirm job completion.
Preconditions: Signed in as a homeowner with an active booking. The assigned worker is available to change statuses during the session.
No.	Module	Scenario	Status	Comments
1	Booking Details & Lifecycle	Open the active booking -> current status shown (for example Pending or Accepted)		
2	Booking Details & Lifecycle	Worker updates the status to En Route -> status changes on the homeowner screen		
3	Booking Details & Lifecycle	Worker continues to Arrived, Service Started, In Progress -> each status change appears on the homeowner screen		
4	Booking Details & Lifecycle	Review the progress timeline -> booking status history shown		
5	Booking Details & Lifecycle	Tap Call (where provided) -> call flow starts		
6	Booking Details & Lifecycle	Tap Chat -> conversation opens for the booking		
7	Booking Details & Lifecycle	Tap Emergency (where provided) -> emergency action available		
8	Booking Details & Lifecycle	Worker marks the job complete -> screen states the job is complete and asks for confirmation		
9	Booking Details & Lifecycle	Tap Confirm Job Completion -> confirmation is recorded and the booking moves to the payment step		

UAT#14: Cancellation (Homeowner)
Objective: To verify that a homeowner can cancel a booking with a reason and confirm after reviewing the refund policy.
Preconditions: Signed in as a homeowner with a cancellable booking. Permission from the QA team to cancel the test booking.
No.	Module	Scenario	Status	Comments
1	Cancellation	Open the booking and tap the Cancel option -> cancellation flow opens		
2	Cancellation	Select a cancellation reason -> reason selected		
3	Cancellation	Read the refund policy information shown before confirming -> refund policy displayed		
4	Cancellation	Tap Confirm Cancellation -> booking status changes to Cancelled		
5	Cancellation	Open the Cancelled tab -> booking appears there with the reason		

UAT#15: Live Tracking (Homeowner)
Objective: To verify that the homeowner can track the worker live location and ETA once location access is granted.
Preconditions: The booking is in Worker En Route status and location permission can be granted. Tester is on the tracking flow.
No.	Module	Scenario	Status	Comments
1	Live Tracking	Tap Allow on the location permission prompt -> location permission granted		
2	Live Tracking	Open the tracking screen for the active booking -> map appears		
3	Live Tracking	Verify the worker location marker on the map -> live position displayed		
4	Live Tracking	Verify the ETA on the map -> arrival estimate displayed		

UAT#16: Messaging (Homeowner)
Objective: To verify that a homeowner can exchange messages, translate between English and Filipino, and share images and location in chat.
Preconditions: Signed in as a homeowner. A conversation with the worker exists (available after matching).
No.	Module	Scenario	Status	Comments
1	Messaging	Tap the Messages tab -> conversation list opens with the worker conversation		
2	Messaging	Tap the worker conversation -> chat thread opens		
3	Messaging	Enter a message in the message field -> text appears		
4	Messaging	Tap Send -> message appears in the thread		
5	Messaging	Worker replies -> reply appears in the thread		
6	Messaging	Tap Show translation on a message -> translated message appears with an indicator and the original is preserved		
7	Messaging	Tap Show original -> original message displayed again		
8	Messaging	Tap the attachment option and choose an image -> image appears in the thread		
9	Messaging	Tap the location share option and share the current location -> shared location appears in the thread		

UAT#17: Payment (Homeowner)
Objective: To verify that a homeowner can pay a completed booking by cash or simulated GCash.
Preconditions: Signed in as a homeowner. The booking is completed and at the payment step.
No.	Module	Scenario	Status	Comments
1	Payment	Tap Continue to Payment on the completed booking -> Payment screen opens with the total amount due		
2	Payment	Verify Cash on Service is available as a payment method -> selectable		
3	Payment	Select Cash on Service and confirm the cash payment -> confirmation is recorded and payment awaits the worker confirmation of receipt		
4	Payment	Select the GCash (Simulation) method -> clearly labeled as a simulation with a Simulation Only notice		
5	Payment	Tap to proceed with the simulated GCash payment -> simulated payment processes		
6	Payment	Verify the payment completes -> success screen or Paid status shown		

UAT#18: Receipt (Homeowner)
Objective: To verify that a successful payment generates a receipt with the correct amounts.
Preconditions: The booking is completed and paid (both parties confirmed).
No.	Module	Scenario	Status	Comments
1	Receipt	Worker confirms payment received -> payment status becomes successful		
2	Receipt	Open the receipt for the booking -> receipt opens		
3	Receipt	Verify the service amount on the receipt -> shown		
4	Receipt	Verify the commission rate and amount (10%) -> shown		
5	Receipt	Verify the worker net amount -> shown		
6	Receipt	Verify the homeowner platform charge (PHP 0) -> shown		
7	Receipt	Verify the booking is complete with a receipt number -> shown on the receipt		

UAT#19: Rate & Review (Homeowner)
Objective: To verify that a homeowner can rate, review, and recommend a worker after a completed, paid booking.
Preconditions: Signed in as a homeowner. The booking is completed and paid.
No.	Module	Scenario	Status	Comments
1	Rate & Review	Open the completed, paid booking and tap the option to leave a review -> Rate Service screen opens		
2	Rate & Review	Tap a star rating (for example 5 stars) -> stars highlight		
3	Rate & Review	Enter review text in the review field (at least 3 characters) -> accepted		
4	Rate & Review	Add up to 3 photos -> photos attach		
5	Rate & Review	Set the Recommend Worker switch to Yes -> switch toggles		
6	Rate & Review	Tap Submit Review -> feedback-submitted confirmation appears		

UAT#20: Notifications (Homeowner)
Objective: To verify that the homeowner can view, mark as read, and act on notifications.
Preconditions: Signed in as a homeowner. At least one notification exists (booking, message, or payment update).
No.	Module	Scenario	Status	Comments
1	Notifications	Tap the bell icon on Home -> Notifications screen opens		
2	Notifications	Verify the notification for the recent activity appears -> shown with unread indicator		
3	Notifications	Tap Mark all as read -> unread indicators clear		
4	Notifications	Tap a notification -> opens the related screen (for example the booking)		

UAT#21: Profile & Settings (Homeowner)
Objective: To verify that the homeowner can manage personal information, saved addresses, and the chat language.
Preconditions: Signed in as a homeowner. Tester is on the Home screen.
No.	Module	Scenario	Status	Comments
1	Profile & Settings	Tap the Account tab -> Profile screen shows name, email, and verification status		
2	Profile & Settings	Open Personal Information -> form opens		
3	Profile & Settings	Change the full name to an updated name -> change accepted		
4	Profile & Settings	Tap Save -> confirmation appears and the profile shows the updated name		
5	Profile & Settings	Open Saved Addresses -> saved addresses list opens		
6	Profile & Settings	Tap Add Address -> address form opens		
7	Profile & Settings	Enter the address label (for example Home) -> accepted		
8	Profile & Settings	Enter street and building and barangay, city, province -> accepted		
9	Profile & Settings	Confirm the address location -> location confirmed		
10	Profile & Settings	Tap Save Address -> address appears in the saved addresses list		
11	Profile & Settings	Set the address as default -> marked as default		
12	Profile & Settings	Open Message Language -> language options shown (English / Filipino)		
13	Profile & Settings	Select Filipino and tap Save language -> confirmation appears		
14	Profile & Settings	Select English and tap Save language -> confirmation appears		

UAT#22: Support & Legal (Homeowner)
Objective: To verify that the Help Center and Privacy Policy pages open and display published content.
Preconditions: Signed in as a homeowner. The content pages are published.
No.	Module	Scenario	Status	Comments
1	Support & Legal	Tap the Account tab -> Profile screen opens		
2	Support & Legal	Open Help Center -> help content or frequently asked questions appear		
3	Support & Legal	Return to the Account tab and open Privacy Policy -> privacy policy content appears		

UAT#23: Customer Support (Homeowner)
Objective: To verify that a homeowner can submit a confidential provider report and receive a ticket reference.
Preconditions: Signed in as a homeowner. A booking exists for which a report can be submitted.
No.	Module	Scenario	Status	Comments
1	Customer Support	Open a booking and tap Report Provider -> report flow opens		
2	Customer Support	Read the confidentiality notice -> message states the report is confidential and reviewed by support		
3	Customer Support	Select a reason (for example Late / No Show) -> reason selected		
4	Customer Support	Enter a description (at least 10 characters) -> accepted		
5	Customer Support	Add up to 3 proof photos (optional) -> photos attach		
6	Customer Support	Tap Submit Report -> confirmation appears with a ticket reference number		

UAT#24: Logout (Homeowner)
Objective: To verify that the homeowner can sign out and that protected screens require sign-in afterwards.
Preconditions: Signed in as a homeowner.
No.	Module	Scenario	Status	Comments
1	Logout	Tap the Account tab -> Profile screen opens		
2	Logout	Tap Log Out -> sign-out confirmation prompt appears		
3	Logout	Confirm the sign-out -> returns to the Sign In screen		
4	Logout	Try to open the Home or Activity screens -> app asks for sign-in instead of showing protected screens		

UAT#25: Registration - Step 1 (Account) (Worker)
Objective: To verify that a new worker can create an account and complete the first registration step.
Preconditions: Terms and Conditions and Privacy Policy are published. A valid email and government ID image are ready. Tester is on the Sign In screen.
No.	Module	Scenario	Status	Comments
1	Registration - Step 1 (Account)	Tap Create an account -> account type selection opens		
2	Registration - Step 1 (Account)	Tap the I provide services card -> worker registration Step 1 opens		
3	Registration - Step 1 (Account)	Enter first name and last name -> fields accept input		
4	Registration - Step 1 (Account)	Enter email -> field accepts input		
5	Registration - Step 1 (Account)	Enter mobile number -> field accepts input		
6	Registration - Step 1 (Account)	Select birthday -> date selected		
7	Registration - Step 1 (Account)	Enter a password and confirm it in Confirm Password -> inputs accepted and masked		
8	Registration - Step 1 (Account)	Tap Next Step -> proceeds to Step 2 (Industry & Skills)		

UAT#26: Registration - Step 2 (Industry & Skills) (Worker)
Objective: To verify that a worker can select their industry, employment type, and skills.
Preconditions: Worker registration Step 1 is complete and Step 2 is open.
No.	Module	Scenario	Status	Comments
1	Registration - Step 2 (Industry & Skills)	Select a primary industry -> industry selected		
2	Registration - Step 2 (Industry & Skills)	Select an employment type -> type selected		
3	Registration - Step 2 (Industry & Skills)	Select at least one skill -> skill selected		
4	Registration - Step 2 (Industry & Skills)	Tap Next Step -> proceeds to Step 3 (Office Address & Contact)		

UAT#27: Registration - Step 3 (Office Address & Identity) (Worker)
Objective: To verify that a worker can enter their address and submit identity documents.
Preconditions: Worker registration Step 2 is complete and Step 3 is open. Government ID images (front and back) are ready.
No.	Module	Scenario	Status	Comments
1	Registration - Step 3 (Office Address & Identity)	Enter the address details -> field accepts input		
2	Registration - Step 3 (Office Address & Identity)	Enter the contact person information -> field accepts input		
3	Registration - Step 3 (Office Address & Identity)	Select the government ID type -> type selected		
4	Registration - Step 3 (Office Address & Identity)	Upload the front of the government ID -> image attaches		
5	Registration - Step 3 (Office Address & Identity)	Upload the back of the government ID -> image attaches		
6	Registration - Step 3 (Office Address & Identity)	Tap Next Step -> proceeds to Step 4 (Review & Submit)		

UAT#28: Registration - Step 4 (Review & Submit) (Worker)
Objective: To verify that a worker can review the application and submit it for administrator review.
Preconditions: Worker registration Steps 1-3 are complete and Step 4 is open.
No.	Module	Scenario	Status	Comments
1	Registration - Step 4 (Review & Submit)	Review the account, industry, and address details -> all match what was entered		
2	Registration - Step 4 (Review & Submit)	Check the accurate information consent box -> box is selectable		
3	Registration - Step 4 (Review & Submit)	Check the privacy policy consent box -> box is selectable		
4	Registration - Step 4 (Review & Submit)	Check the terms of service consent box -> box is selectable		
5	Registration - Step 4 (Review & Submit)	Tap Submit Registration -> success message Registration Submitted! appears		
6	Registration - Step 4 (Review & Submit)	Tap Go to Sign In -> returns to the Sign In screen		

UAT#29: Sign In (Worker)
Objective: To verify that a worker can sign in to the correct workspace and reach the worker Dashboard, and that the Sign In screen secondary actions navigate correctly.
Preconditions: Approved, verified worker test account exists. Tester is already on the Sign In screen.
No.	Module	Scenario	Status	Comments
1	Sign In	Enter worker test email in Email Address -> field accepts input		
2	Sign In	Enter worker test password in Password -> input is masked by default		
3	Sign In	Tap the eye icon -> password visibility toggles		
4	Sign In	Check Remember Me, then tap Login -> Worker Dashboard loads		
5	Sign In	Close and reopen the app -> session persists without re-prompting for email/password (Remember Me honored)		
6	Sign In	Tap Forgot password? -> navigates to Password Recovery		
7	Sign In	Tap Create an account -> navigates to Worker Registration Step 1		
8	Sign In	Tap Continue with Google -> Google auth flow launches		

UAT#30: Verification Status (Worker)
Objective: To verify that the worker can see their approval status, document statuses, and any administrator feedback.
Preconditions: Signed in as a worker. The account has a verification record.
No.	Module	Scenario	Status	Comments
1	Verification Status	Open Verification from the Dashboard quick actions (or Profile then Verification) -> verification screen opens		
2	Verification Status	Verify the application status (Pending, Approved, Rejected, or Needs Review) -> shown		
3	Verification Status	Open the Documents tab -> submitted documents listed		
4	Verification Status	Verify each document shows a status (Verified, In Review, Rejected, or Missing) -> shown		
5	Verification Status	If a document was rejected, verify the administrator feedback -> shown		
6	Verification Status	Open the FAQ tab -> frequently asked questions appear		

UAT#31: Profile - Industry & Skills (Worker)
Objective: To verify that a worker can define their industries, skills, service rates, and experience.
Preconditions: Signed in as a worker.
No.	Module	Scenario	Status	Comments
1	Profile - Industry & Skills	Tap the Profile tab -> Profile opens		
2	Profile - Industry & Skills	Open Industry & Skills -> screen opens		
3	Profile - Industry & Skills	Select a primary industry -> industry selected		
4	Profile - Industry & Skills	Select at least one skill -> skill selected		
5	Profile - Industry & Skills	Enter a service rate for each selected skill -> accepted		
6	Profile - Industry & Skills	Select the years of experience -> selected		
7	Profile - Industry & Skills	Tap Save Changes -> saved confirmation appears with a summary		

UAT#32: Profile - Service Areas & Availability (Worker)
Objective: To verify that a worker can set their service origin and coverage radius and become eligible for matching.
Preconditions: Signed in as a worker. Location permission is available.
No.	Module	Scenario	Status	Comments
1	Profile - Service Areas & Availability	Open Service Areas (Service Setup) -> screen opens with a matching readiness checklist		
2	Profile - Service Areas & Availability	Review the matching readiness checklist -> setup status shown		
3	Profile - Service Areas & Availability	Use the current location to confirm the service origin -> origin confirmed		
4	Profile - Service Areas & Availability	Enter a service area label -> accepted		
5	Profile - Service Areas & Availability	Select a coverage radius -> selected		
6	Profile - Service Areas & Availability	Tap Save Service Availability -> Service availability saved confirmation appears		
7	Profile - Service Areas & Availability	Verify the matching readiness checklist updates -> reflects the new setup		

UAT#33: Profile - Personal Information (Worker)
Objective: To verify that a worker can update personal details and bio.
Preconditions: Signed in as a worker.
No.	Module	Scenario	Status	Comments
1	Profile - Personal Information	Open Personal Information -> form opens with full name, email, and phone fields		
2	Profile - Personal Information	Review the full name, email, and phone number fields -> pre-filled correctly		
3	Profile - Personal Information	Update the bio with a short description -> accepted		
4	Profile - Personal Information	Tap Save Changes -> confirmation appears that the information was updated		

UAT#34: Dashboard (Worker)
Objective: To verify that the worker Dashboard shows the stats, live status, quick actions, and active bookings.
Preconditions: Signed in as a worker with booking activity.
No.	Module	Scenario	Status	Comments
1	Dashboard	Verify the Today Stats show Active, Pending, Completed, and Earnings -> all four shown		
2	Dashboard	Review the Live Status card and presence banner -> online/offline state shown		
3	Dashboard	Review the Quick Actions (My Bookings, Earnings, Premium, Verification) -> all present		
4	Dashboard	Review the Active Bookings section -> current bookings listed		

UAT#35: Incoming Requests (Worker)
Objective: To verify that an approved worker can accept or decline a matching request with a recorded reason.
Preconditions: Signed in as an approved, online worker. A matching request has been offered.
No.	Module	Scenario	Status	Comments
1	Incoming Requests	Wait for a request offer to appear on the Dashboard -> offer appears		
2	Incoming Requests	Open the request and review description, area, distance, and offer -> all shown		
3	Incoming Requests	Tap Accept Request -> confirmation appears and the booking appears in the worker bookings list		
4	Incoming Requests	Tap Decline on a request and confirm -> request marked as declined		
5	Incoming Requests	Select a reason for declining -> reason recorded		
6	Incoming Requests	Verify the declined request is removed from active offers -> no longer shown		

UAT#36: Booking Details (Worker)
Objective: To verify that the worker can view the complete job details for an accepted booking.
Preconditions: Signed in as a worker with an accepted booking.
No.	Module	Scenario	Status	Comments
1	Booking Details	Open the accepted booking from the Bookings tab -> booking details open		
2	Booking Details	Verify job number, description, client, location, and schedule -> all shown		
3	Booking Details	Review the estimated earnings -> shown		
4	Booking Details	Review the route summary with the distance to the service location -> shown		

UAT#37: Booking Progress & Completion (Worker)
Objective: To verify that a worker can progress a job through En Route, Arrived, In Progress, and Completed.
Preconditions: Signed in as a worker with an accepted booking, at or traveling to the customer location.
No.	Module	Scenario	Status	Comments
1	Booking Progress & Completion	Tap Start En Route -> status changes to En Route		
2	Booking Progress & Completion	When near the customer location, tap I've Arrived & Start Job -> status changes to Arrived then In Progress		
3	Booking Progress & Completion	If prompted by the arrival distance check, move closer and retry -> status progresses to In Progress		
4	Booking Progress & Completion	Tap Complete Job -> status changes to Completed or Awaiting Confirmation		
5	Booking Progress & Completion	Verify the message that the customer has been notified to confirm completion -> shown		

UAT#38: Payment Confirmation (Worker)
Objective: To verify that a worker can confirm payment received and the 10% commission is recorded.
Preconditions: Signed in as a worker. The booking is Completed and the customer has confirmed payment.
No.	Module	Scenario	Status	Comments
1	Payment Confirmation	Open the completed booking -> summary shows the service amount and 10% platform commission		
2	Payment Confirmation	Tap Confirm Payment - Cash -> payment and commission recorded confirmation appears and the payment status becomes successful		
3	Payment Confirmation	Tap Confirm Payment - Online (Simulated) -> payment and commission recorded confirmation appears		

UAT#39: Wallet (Worker)
Objective: To verify that the wallet shows the balance and activity, and the simulated top-up increases the balance.
Preconditions: Signed in as a worker with a wallet.
No.	Module	Scenario	Status	Comments
1	Wallet	Tap the Wallet tab -> available balance shown		
2	Wallet	Review the daily earnings chart and statistics (gross, net, jobs, commission) -> shown		
3	Wallet	Tap Simulate Top-Up -> top-up dialog opens		
4	Wallet	Enter a top-up amount -> accepted		
5	Wallet	Read the simulation notice (no actual payment) -> notice displayed		
6	Wallet	Tap Simulate Top-Up again to confirm -> success message appears and the balance updates		
7	Wallet	Tap See All next to Transactions -> Transaction History screen opens		
8	Wallet	Use the filters (All, Income, Deductions) -> list updates per filter		
9	Wallet	Open a transaction -> amount and status shown		

UAT#40: Reviews (Worker)
Objective: To verify that the worker can view the customer rating and review as read-only feedback.
Preconditions: Signed in as a worker. A completed, paid booking exists and the customer has submitted a review.
No.	Module	Scenario	Status	Comments
1	Reviews	Open the completed booking or the Reviews section -> Rate & Review modal opens		
2	Reviews	Verify the customer star rating and written review -> displayed		
3	Reviews	Verify the modal is view-only -> no edit or submit controls for the worker		

UAT#41: Messages (Worker)
Objective: To verify that the worker can exchange messages with the customer for the booking.
Preconditions: Signed in as a worker. A conversation exists with the customer for the booking.
No.	Module	Scenario	Status	Comments
1	Messages	Tap the Messages tab -> conversation list opens		
2	Messages	Open the customer conversation -> chat thread opens		
3	Messages	Enter a message and tap Send -> message appears in the thread		
4	Messages	Customer replies -> reply appears in the thread		
5	Messages	From the booking detail, tap Open Full Chat -> same conversation opens		

UAT#42: Cancellation (Worker)
Objective: To verify that a worker can cancel a job with a reason that is shared with the customer.
Preconditions: Signed in as a worker with a cancellable booking. Permission from the QA team to cancel the test booking.
No.	Module	Scenario	Status	Comments
1	Cancellation	Open the booking and tap the three-dot menu -> menu opens		
2	Cancellation	Select Cancel Service -> cancellation flow opens		
3	Cancellation	Select the job stage -> stage selected		
4	Cancellation	Select or type a reason -> reason recorded		
5	Cancellation	Tap Confirm Cancellation -> confirmation appears that the reason was sent to the customer		
6	Cancellation	Verify the booking shows Cancelled status -> appears in the Cancelled filter		

UAT#43: Feedback (Worker)
Objective: To verify that the worker can submit feedback with a rating, compliments, notes, and a proof-of-work photo.
Preconditions: Signed in as a worker. The booking is Completed.
No.	Module	Scenario	Status	Comments
1	Feedback	Open the completed booking and tap Leave Feedback -> feedback form opens		
2	Feedback	Select a star rating for the customer experience -> rating selected		
3	Feedback	Select quick compliments (for example Punctual, Easy Communication) -> selected		
4	Feedback	Write a short note about the experience -> accepted		
5	Feedback	Add a proof-of-work photo (optional) -> photo attaches		
6	Feedback	Tap Submit Feedback -> confirmation appears that the feedback was submitted		

UAT#44: Availability for Matching (Worker)
Objective: To verify that a worker can turn availability for matching on and off and the presence status updates.
Preconditions: Signed in as an approved worker with industry, skills, and service area setup complete.
No.	Module	Scenario	Status	Comments
1	Availability for Matching	Tap the Profile tab -> Profile opens		
2	Availability for Matching	Find the Availability section with the Available for matching switch -> visible		
3	Availability for Matching	Turn the switch on -> presence banner shows the worker is online and receiving requests		
4	Availability for Matching	Return to the Dashboard -> live status shows online		
5	Availability for Matching	Turn the switch off -> status changes to offline		

UAT#45: Logout (Worker)
Objective: To verify that the worker can sign out and return to the Sign In screen.
Preconditions: Signed in as a worker.
No.	Module	Scenario	Status	Comments
1	Logout	Tap the Profile tab -> Profile opens	P	
2	Logout	Tap Log Out -> sign-out confirmation prompt appears	P	
3	Logout	Confirm the sign-out -> returns to the Sign In screen	P	

UAT#46: Sign In & Password Recovery (Admin)
Objective: To verify that the administrator can sign in to the admin portal and request a password reset.
Preconditions: Administrator account exists. Tester is on the A-yos Admin Sign In screen.
No.	Module	Scenario	Status	Comments
1	Sign In & Password Recovery	Enter the administrator email in Email Address -> field accepts input		
2	Sign In & Password Recovery	Enter the administrator password in Password -> input is masked by default and the show/hide toggle works		
3	Sign In & Password Recovery	Verify the System Status indicator -> displays Operational		
4	Sign In & Password Recovery	Tap Sign in to Dashboard -> Dashboard opens with the administrator navigation		
5	Sign In & Password Recovery	Tap Forgot password? -> Forgot Password screen opens		
6	Sign In & Password Recovery	Enter the administrator email in Email Address and tap Send Reset Link -> confirmation that a reset link was sent appears		
7	Sign In & Password Recovery	Verify the Terms of Service and Privacy Policy links -> open the corresponding pages		

UAT#47: Dashboard (Admin)
Objective: To verify that the administrator Dashboard displays the required metrics with their values and that the chart sections load.
Preconditions: Signed in as an administrator with test environment data.
No.	Module	Scenario	Status	Comments
1	Dashboard	Verify the metric cards for Total Commission Revenue, Active Bookings, and Total Users -> shown with values	P	
2	Dashboard	Verify the metric cards for Verified Workers and Support Tickets -> shown with values	P	
3	Dashboard	Review the Revenue Overview chart -> loads and the Daily, Monthly, and Yearly views switch correctly	P	
4	Dashboard	Review the Daily Bookings chart -> shows the last 14 days with Completed, Pending, and Cancelled	P	
5	Dashboard	Review the Recent Activity list -> latest actions appear	P	
6	Dashboard	Review the Pending Worker Approvals list -> pending workers shown with Approve and Reject actions	P	
7	Dashboard	Review the Recent Registrations and System Notifications lists -> load and display	P	

UAT#48: Account Management (Users) (Admin)
Objective: To verify that the administrator can browse and search users, review pending verifications, view details, and suspend or reactivate an account.
Preconditions: Signed in as an administrator with user records.
No.	Module	Scenario	Status	Comments
1	Account Management (Users)	Open Users Management -> Customers list shows name, email, phone, location, registration date, bookings, verification, and status	P	
2	Account Management (Users)	Use the search field to find a specific user -> user found	P	
3	Account Management (Users)	Apply the verification and status filters -> list updates	P	
4	Account Management (Users)	Open the Pending Verification tab -> pending customer verifications listed with ID type and submitted date	P	
5	Account Management (Users)	Select Review for a verification -> ID front and back are viewable and review notes can be added	P	
6	Account Management (Users)	Tap Approve or Reject -> verification status updates	P	
7	Account Management (Users)	Open a user details drawer -> contact information, identity verification, and bookings are shown	P	
8	Account Management (Users)	Tap Edit, update a field, and Save Changes -> change saved	P	
9	Account Management (Users)	Tap Suspend (or Reactivate) -> account status updates	P	
10	Account Management (Users)	Select users and use the bulk actions (Suspend, Reactivate, Verify, Unverify) -> applied to all selected	P	
11	Account Management (Users)	Tap Move to trash -> user moves to the Trash page	P	

UAT#49: Worker Review (Admin)
Objective: To verify that the administrator can approve a worker application, request more documents, or reject a worker, and manage worker accounts.
Preconditions: Signed in as an administrator. A worker application is pending review.
No.	Module	Scenario	Status	Comments
1	Worker Review	Open Workers Management -> All Workers list shows name, category, location, rating, verification, matching readiness, and status	P	
2	Worker Review	Open the Review Queue tab -> pending worker applications listed with count	P	
3	Worker Review	Open the pending worker details -> professional profile, skills and rates, and identity documents viewable	P	
4	Worker Review	Tap Approve Worker -> confirmation shows the worker as Approved		
5	Worker Review	Tap Request Docs, add remarks, and send -> worker is notified and the application returns to a re-submission state		
6	Worker Review	Tap Reject for a worker -> worker is rejected		
7	Worker Review	Tap Edit Worker, adjust skills and rates, and Save Changes -> changes saved		
8	Worker Review	Use Verify / Unverify and Suspend / Reactivate -> worker status updates		
9	Worker Review	Review the Matching column -> shows Ready or Incomplete with missing items		
10	Worker Review	Tap Move to trash -> worker moves to the Trash page		

UAT#50: Bookings (Operations) (Admin)
Objective: To verify that the administrator can search, filter, and open bookings, reassign a worker, and move a booking to trash.
Preconditions: Signed in as an administrator with test bookings.
No.	Module	Scenario	Status	Comments
1	Bookings (Operations)	Open the Bookings Management list -> table shows booking ID, date, service, customer, worker, amount, and status	P	
2	Bookings (Operations)	Use the search field to find a specific booking -> booking found	P	
3	Bookings (Operations)	Apply a status filter (Pending, Ongoing, Completed, Cancelled) -> list updates	P	
4	Bookings (Operations)	Open a booking details drawer -> date and time, total price, service address, people involved, attachments, and timeline shown	F	
5	Bookings (Operations)	Select Reassign Worker, choose a matched worker, enter an admin reason, and confirm -> worker reassigned	F	
6	Bookings (Operations)	Select Move to Trash, enter a reason, and confirm -> booking moves to the Trash page	F	

UAT#51: Financial Management (Admin)
Objective: To verify that the administrator can audit transaction and payment details, view commission configuration, and process payments records.
Preconditions: Signed in as an administrator. A completed, paid booking exists.
No.	Module	Scenario	Status	Comments
1	Financial Management	Open Payments -> All Transactions tab lists transactions with sender, receiver, type, method, amount, fee, status, and date	P	
2	Financial Management	Use the search field and type / Name or ID filters -> transactions filtered	P	
3	Financial Management	Open a transaction details drawer -> type, amount, status, payment method, and related booking shown	P	
4	Financial Management	Verify the Fee Breakdown for a payment -> subtotal, platform commission, and net to worker shown	P	
5	Financial Management	Open the Payment Methods tab -> GCash, Maya, and Credit/Debit Card shown as Disabled and Cash on Delivery as Active	P	
6	Financial Management	Open the Commission & Fee Configuration tab -> worker and customer fee settings load	P	
7	Financial Management	Make a test change to a fee and tap Save -> change saved	P	

UAT#52: Services Management (Admin)
Objective: To verify that the administrator can add, edit, activate, or deactivate industries and skills in the service catalog.
Preconditions: Signed in as an administrator.
No.	Module	Scenario	Status	Comments
1	Services Management	Open Services -> Industries & Skills page shows the Manage Industries and Manage Skills tabs	P	
2	Services Management	Use the Add Industry action and create an industry -> industry created	P	
3	Services Management	Edit an industry and save -> change saved	P	
4	Services Management	Open the Manage Skills tab -> skills list shows name, industry, pricing, active workers, and status	P	
5	Services Management	Use the Add Skill action, set the min and max price, and create the skill -> skill created	P	
6	Services Management	Edit a skill and change its pricing -> change saved	P	
7	Services Management	Use Deactivate / Activate for an industry or skill -> status updates	P	
8	Services Management	Use Duplicate for a skill -> duplicate copy created	P	
9	Services Management	Move an industry or skill to trash -> entry moves to the Trash page	P	

UAT#53: Reviews Moderation (Admin)
Objective: To verify that the administrator can hide or unhide a review and delete (reject) a review.
Preconditions: Signed in as an administrator. A published review exists and permission has been given to moderate the test review.
No.	Module	Scenario	Status	Comments
1	Reviews Moderation	Open Reviews & Moderation -> published reviews listed with customer, worker, service, rating, comment, date, and status	P	
2	Reviews Moderation	Use the search and rating filters -> list updates	P	
3	Reviews Moderation	Select Hide for the test review -> review status changes to hidden	P	
4	Reviews Moderation	Select Unhide -> review returns to published	F	
5	Reviews Moderation	Select Delete and confirm -> review is rejected and removed	F	

UAT#54: Support Tickets (Admin)
Objective: To verify that the administrator can open, respond to, resolve, or escalate a support ticket.
Preconditions: Signed in as an administrator. A support ticket exists in the system.
No.	Module	Scenario	Status	Comments
1	Support Tickets	Open Support -> Support Center shows tickets and the Safety Reports & Disputes section	P	
2	Support Tickets	Use the search field and status filter -> ticket list updates		Nothing to search
3	Support Tickets	Open the test ticket -> subject, status, priority, category, and chat history shown	F	
4	Support Tickets	Type a reply in the composer and tap Send Reply -> reply recorded in the thread	F	
5	Support Tickets	Tap Mark Resolved -> status changes to resolved	F	
6	Support Tickets	Tap Escalate -> escalation option works	F	
7	Support Tickets	For a resolved ticket, tap Reopen Ticket -> ticket reopened	F	
8	Support Tickets	Review the Safety Reports & Disputes table -> read-only list of booking cases shown	F	

UAT#55: Communication & Notifications (Admin)
Objective: To verify that the administrator can create and send an in-app notification campaign to a selected audience.
Preconditions: Signed in as an administrator.
No.	Module	Scenario	Status	Comments
1	Communication & Notifications	Open Notifications Engine -> campaigns list shows title, target audience, channel, status, and date	P	
2	Communication & Notifications	Tap Create Notification -> composer opens	F	
3	Communication & Notifications	Enter a Campaign Title -> accepted	F	
4	Communication & Notifications	Choose the Target Audience (All Users, Workers Only, Customers Only) -> audience selected	F	
5	Communication & Notifications	Select the Channel -> In-App selectable while Push and SMS are unavailable	F	
6	Communication & Notifications	Enter the Message Content -> accepted	F	
7	Communication & Notifications	Tap Save as Draft -> campaign saved as Draft	F	
8	Communication & Notifications	Create a second campaign and tap Send Now -> campaign status changes to Sent	F	

UAT#56: Reports & Analytics (Admin)
Objective: To verify that the reports dashboard displays generated reports and analytics and that reports can be downloaded.
Preconditions: Signed in as an administrator with generated reports.
No.	Module	Scenario	Status	Comments
1	Reports & Analytics	Open Reports -> Reports Center shows report cards for Financial, Workers, Customers, Services, and Reviews	P	
2	Reports & Analytics	Use the type and date-range filters -> report list updates	F	Nothing to search
3	Reports & Analytics	Select Generate Custom Report -> report is generated	F	
4	Reports & Analytics	Tap the CSV button for a report -> CSV file downloads and opens	F	
5	Reports & Analytics	Tap the Excel button for a report -> XLSX file downloads and opens	F	
6	Reports & Analytics	Tap the PDF button for a report -> PDF file downloads and opens	F	
7	Reports & Analytics	Open Analytics -> KPI cards, Revenue Trend, and Top Services charts load	P	
8	Reports & Analytics	Review the Monthly Active Users and Avg. Worker Earnings cards -> values shown	P	

UAT#57: System Settings (Admin)
Objective: To verify that system settings changes are applied on Save and discarded when the administrator chooses not to save.
Preconditions: Signed in as an administrator.
No.	Module	Scenario	Status	Comments
1	System Settings	Open Platform Settings -> General, Booking Rules, AI Assistant, Security & Auth, Payments & Fees, Notifications, and Integrations tabs load	P	
2	System Settings	Open the General tab and make a test change -> change reflected in the form	P	
3	System Settings	Tap Cancel (Discard) -> change is not applied	P	
4	System Settings	Make the test change again and tap Save changes -> confirmation appears and the change is applied	P	
5	System Settings	Open Security & Auth -> Require Two-Factor Auth (2FA) and Session Timeout options shown	F	Not Implemented or doesn’t work 
6	System Settings	Open Payments & Fees and verify Worker Matching Weights -> weights must total 100 percent with validation	P	
7	System Settings	Open the Notifications and Integrations tabs -> channel toggles and connection fields load	P	

UAT#58: Audit Logs (Admin)
Objective: To verify that the audit log records administrator actions with the actor, module, target, and time.
Preconditions: Signed in as an administrator who has performed actions during the session.
No.	Module	Scenario	Status	Comments
1	Audit Logs	Open Audit Logs -> logs show timestamp, admin, module, action and target, IP address, device, and status	P	
2	Audit Logs	Find the action performed earlier (for example an approval) -> entry matches the performed action	F	
3	Audit Logs	Use the search field and module filter -> logs filtered	P	

UAT#59: Trash (Admin)
Objective: To verify that deleted records can be restored from Trash or permanently deleted.
Preconditions: Signed in as an administrator. A record exists in the Trash.
No.	Module	Scenario	Status	Comments
1	Trash	Open Trash & Recovery -> Users, Workers, Bookings, Reviews, Industries, and Skills tabs shown	P	
2	Trash	Open the tab that contains the test record -> deleted record appears	P	
3	Trash	Tap Restore for the test record -> record returns to its normal location	P	
4	Trash	Tap Restore All for a tab -> all items in that tab are restored	P	
5	Trash	Select Delete Permanently and type the required confirmation -> record is removed and no longer appears in Trash	P	
6	Trash	Tap Empty Trash and confirm -> all items in the tab are permanently deleted	P	

UAT#60: Logout (Admin)
Objective: To verify that the administrator can sign out and that protected pages redirect to Sign In.
Preconditions: Signed in as an administrator.
No.	Module	Scenario	Status	Comments
1	Logout	Open the account menu from the top-right avatar -> menu opens	P	
2	Logout	Tap Log out -> returns to the Sign In screen	P	
3	Logout	Try to open a protected page directly -> application redirects to Sign In	P	

Overall UAT Results
Objective: To confirm that the full UAT scope has been executed and to record the final readiness decision.
Preconditions: All applicable UAT sections above have been executed.
No.	Module	Scenario	Status	Comments
1	Overall UAT Results	Confirm all applicable module scenarios have been executed		
2	Overall UAT Results	Count total Passed and Failed scenarios	Passed:  Failed: 	
3	Overall UAT Results	Total Success Rate of the UAT	%	
