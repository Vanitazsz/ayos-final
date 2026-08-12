USER ACCEPTANCE TESTING (UAT)
AYOS SYSTEM
Date: August 11, 2026
Company Name: StartupLab - Business Center & AI Consultant
Legend: P - Passed; F – Failed
UAT#1: Sign In (Homeowner)
Objective: To verify that a homeowner can sign in to the correct workspace and reach the Home screen, and that the Sign In screen secondary actions navigate correctly.
Preconditions: Registered, email-verified homeowner test account exists. Tester is already on the Sign In screen.
No.	Module	Scenario	Status	Comments
1	Sign In	Enter homeowner test email in Email Address -> field accepts input	P	
2	Sign In	Enter homeowner test password in Password -> input is masked by default	P	
3	Sign In	Tap the eye icon -> password visibility toggles	P	
4	Sign In	Check Remember Me, then tap Login -> Home screen loads with greeting and Explore Services categories	P	
5	Sign In	Close and reopen the app -> session persists without re-enter the email/password (Remember Me honored)	P	
6	Sign In	Tap Forgot password? -> navigates to Password Recovery	F	The Reset password from email just redirects it straight to the account and not in the set a new password or the password recovery page
7	Sign In	Tap Create an account -> navigates to Create Account flow	P	
8	Sign In	Tap Continue with Google -> Google auth flow launches	P	

UAT#2: Password Recovery (Homeowner)
Objective: To verify that a homeowner can reset a forgotten password through the reset-link flow and sign in with the new password.
Preconditions: Registered homeowner test account exists and its email inbox (or Mailpit) is accessible. Tester is already on the Sign In screen.
No.	Module	Scenario	Status	Comments
1	Password Recovery	Enter the account email in Email Address -> field accepts input Tap 	P	
2	Password Recovery	Forgot password? -> Password Recovery screen opens with an Email Address field	P	
3	Password Recovery	Open the email and tap the reset link -> password reset page opens	P	
4	Password Recovery	Enter a new password in New Password and confirm it in Confirm Password -> inputs accepted and masked	F	The Reset password from email just redirects it straight to the account and not in the set a new password or the password recovery page
5	Password Recovery	Tap Reset Password -> password updated confirmation appears	F	
6	Password Recovery	Sign in with the new password -> Home screen opens	F	

UAT#3: Create Account (Homeowner)
Objective: To verify that a new homeowner can create an account and reach the email verification step.
Preconditions: A new, unregistered email address is available. Terms and Conditions and Privacy Policy are published. Tester is already on the Sign In screen.
No.	Module	Scenario	Status	Comments
1	Create Account	Tap Create an account -> account type selection opens with I need services and I provide services cards	P	
2	Create Account	Tap the I need services card -> homeowner registration form opens	P	
3	Create Account	Enter full name in Full Name -> field accepts input	P	
4	Create Account	Enter mobile number with country code in Mobile Number -> field accepts input	P	
5	Create Account	Enter the email address in Email Address -> field accepts input	P	
6	Create Account	Enter a password in Password and re-enter it in Confirm Password -> inputs accepted and masked	P	
7	Create Account	Check the Terms and Conditions & Privacy Policy checkbox -> box is selectable	P	
8	Create Account	Tap Send Email Code -> account is created and Email Verification screen opens	P	

UAT#4: Email Verification (Homeowner)
Objective: To verify that a new homeowner account is activated after entering the correct email verification code.
Preconditions: A homeowner registration has been submitted and the Email Verification screen is open. The email inbox (or Mailpit) is accessible.
No.	Module	Scenario	Status	Comments
1	Email Verification	Open the email inbox and read the 6-digit verification code -> code found	P	
2	Email Verification	Enter the code in the code boxes -> digits accepted	P	
3	Email Verification	Tap Verify -> account is verified and the app proceeds to sign-in or account setup	P	

UAT#5: Home Screen (Homeowner)
Objective: To verify that the Home screen loads after sign-in and all main navigation tabs respond correctly.
Preconditions: Signed in as a homeowner. Home screen is open.
No.	Module	Scenario	Status	Comments
1	Home Screen	Verify the greeting shows the homeowner name -> greeting displayed	P	
2	Home Screen	Tap the Activity tab -> My Bookings screen opens	P	
3	Home Screen	Tap the Messages tab -> Messages screen opens	P	
4	Home Screen	Tap the Account tab -> Profile screen opens	P	
5	Home Screen	Tap the Home tab -> returns to Home screen	P	

UAT#6: AI Home Assistant (Homeowner)
Objective: To verify that the AI Home Assistant analyzes an issue and produces an editable service-request draft.
Preconditions: Signed in as a homeowner. AI providers are configured in the test environment. Tester is on the Home screen.
No.	Module	Scenario	Status	Comments
1	AI Home Assistant	Tap the + button -> request screen opens with the A-yos AI instructions	P	
2	AI Home Assistant	Tap a service category in the Select Service section -> service selected	P	
3	AI Home Assistant	Enter an issue description in Describe the problem (at least 10 characters) -> field accepts input	P	
4	AI Home Assistant	Tap Take Photo or Upload Photo (optional) -> photo attaches to the request	P	
5	AI Home Assistant	Tap Record Voice (optional) -> spoken description recorded and converted to text	P	
6	AI Home Assistant	Enter the service address in the Service Location section -> field accepts input	P	
7	AI Home Assistant	Check the AI consent checkbox -> consent accepted	P	
8	AI Home Assistant	Tap Continue -> AI analyzes the issue	P	
9	AI Home Assistant	Review the AI result: detected issue, severity, suggested category, estimated cost range, and safety advice -> all shown	P	
10	AI Home Assistant	Review the editable request draft -> draft can be edited	P	

UAT#7: Worker Matching & Selection (Homeowner)
Objective: To verify that eligible workers are matched, appear with distance and rate, and can be hired to create a booking.
Preconditions: A request has been posted and the matching screen is open. An approved, online worker is available in the test area.
No.	Module	Scenario	Status	Comments
1	Worker Matching & Selection	Review the search radius setting -> current radius shown	P	
2	Worker Matching & Selection	Adjust the search radius with the controls -> radius updates	P	
3	Worker Matching & Selection	Tap Start Matching -> message shows how many workers were notified	P	
4	Worker Matching & Selection	Review the matched worker cards -> each shows name, distance, and rate	P	
5	Worker Matching & Selection	Tap Accept Worker on an accepting worker -> Hire This Worker? confirmation appears	P	
6	Worker Matching & Selection	Tap Hire Worker -> booking is created and opens in the tracking or booking details screen	P	

UAT#8: My Bookings (Activity) (Homeowner)
Objective: To verify that the Activity screen groups bookings into Upcoming, Ongoing, Completed, and Cancelled and opens booking details.
Preconditions: Signed in as a homeowner with bookings in different states. Tester is on the Home screen.
No.	Module	Scenario	Status	Comments
1	My Bookings (Activity)	Tap the Activity tab -> My Bookings screen opens	P	
2	My Bookings (Activity)	Open the Upcoming tab -> upcoming (Pending / Accepted) bookings listed	P	
3	My Bookings (Activity)	Open the Ongoing tab -> active bookings listed	P	
4	My Bookings (Activity)	Open the Completed tab -> completed bookings listed	P	
5	My Bookings (Activity)	Open the Cancelled tab -> cancelled bookings listed	P	
6	My Bookings (Activity)	Tap a booking -> booking details shown (service, provider, date, amount)	P	

UAT#9: Booking Details & Lifecycle (Homeowner)
Objective: To verify that the homeowner can watch the booking progress through its official statuses, use contact options, and confirm job completion.
Preconditions: Signed in as a homeowner with an active booking. The assigned worker is available to change statuses during the session.
No.	Module	Scenario	Status	Comments
1	Booking Details & Lifecycle	Open the active booking -> current status shown (for example Pending or Accepted)	P	
2	Booking Details & Lifecycle	Worker updates the status to En Route -> status changes on the homeowner screen	P	
3	Booking Details & Lifecycle	Worker continues to Arrived, Service Started, In Progress -> each status change appears on the homeowner screen	P	
4	Booking Details & Lifecycle	Review the progress timeline -> booking status history shown	P	
5	Booking Details & Lifecycle	Tap Call (where provided) -> call flow starts	P	
6	Booking Details & Lifecycle	Tap Chat -> conversation opens for the booking	P	
7	Booking Details & Lifecycle	Tap Emergency (where provided) -> emergency action available	P	
8	Booking Details & Lifecycle	Worker marks the job complete -> screen states the job is complete and asks for confirmation	P	
9	Booking Details & Lifecycle	Tap Confirm Job Completion -> confirmation is recorded and the booking moves to the payment step	P	

UAT#10: Live Tracking (Homeowner)
Objective: To verify that the homeowner can track the worker live location and ETA once location access is granted.
Preconditions: The booking is in Worker En Route status and location permission can be granted. Tester is on the tracking flow.
No.	Module	Scenario	Status	Comments
1	Live Tracking	Tap Allow on the location permission prompt -> location permission granted	P	
2	Live Tracking	Open the tracking screen for the active booking -> map appears	P	
3	Live Tracking	Verify the worker location marker on the map -> live position displayed	P	
4	Live Tracking	Verify the ETA on the map -> arrival estimate displayed	P	

UAT#11: Messaging (Homeowner)
Objective: To verify that a homeowner can exchange messages, translate between English and Filipino, and share images and location in chat.
Preconditions: Signed in as a homeowner. A conversation with the worker exists (available after matching).
No.	Module	Scenario	Status	Comments
1	Messaging	Tap the Messages tab -> conversation list opens with the worker conversation	P	
2	Messaging	Tap the worker conversation -> chat thread opens	P	
3	Messaging	Enter a message in the message field -> text appears	P	
4	Messaging	Tap Send -> message appears in the thread	P	
5	Messaging	Worker replies -> reply appears in the thread	P	
6	Messaging	Tap Show translation on a message -> translated message appears with an indicator and the original is preserved	F	Still not translating or implementing
7	Messaging	Tap Show original -> original message displayed again	P	
8	Messaging	Tap the attachment option and choose an image -> image appears in the thread	F	Still not clickable 
9	Messaging	Tap the location share option and share the current location -> shared location appears in the thread	F	Still not clickable 

UAT#12: Payment (Worker)
Objective: To verify that a homeowner can pay a completed booking by cash or simulated GCash.
Preconditions: Signed in as a homeowner. The booking is completed and at the payment step.
No.	Module	Scenario	Status	Comments
1	Payment	Tap Continue to Payment on the completed booking -> Payment screen opens with the total amount due	P	
2	Payment	Verify Cash on Service is available as a payment method -> selectable	P	
3	Payment	Select Cash on Service and confirm the cash payment -> confirmation is recorded and payment awaits the worker confirmation of receipt	P	
4	Payment	Select the GCash (Simulation) method -> clearly labeled as a simulation with a Simulation Only notice	P	
5	Payment	Tap to proceed with the simulated GCash payment -> simulated payment processes	P	
6	Payment	Verify the payment completes -> success screen or Paid status shown	P	

UAT#13: Rate & Review (Homeowner)
Objective: To verify that a homeowner can rate, review, and recommend a worker after a completed, paid booking.
Preconditions: Signed in as a homeowner. The booking is completed and paid.
No.	Module	Scenario	Status	Comments
1	Rate & Review	Open the completed, paid booking and tap the option to leave a review -> Rate Service screen opens	P	
2	Rate & Review	Tap a star rating (for example 5 stars) -> stars highlight	P	
3	Rate & Review	Enter review text in the review field (at least 3 characters) -> accepted	P	
4	Rate & Review	Add up to 3 photos -> photos attach	P	
5	Rate & Review	Set the Recommend Worker switch to Yes -> switch toggles	P	
6	Rate & Review	Tap Submit Review -> feedback-submitted confirmation appears	P	

UAT#14: Notifications (Homeowner)
Objective: To verify that the homeowner can view, mark as read, and act on notifications.
Preconditions: Signed in as a homeowner. At least one notification exists (booking, message, or payment update).
No.	Module	Scenario	Status	Comments
1	Notifications	Tap the bell icon on Home -> Notifications screen opens	P	
2	Notifications	Verify the notification for the recent activity appears -> shown with unread indicator	P	
3	Notifications	Tap Mark all as read -> unread indicators clear	P	
4	Notifications	Tap a notification -> opens the related screen (for example the booking)	P	


UAT#15: Profile & Settings (Homeowner)
Objective: To verify that the homeowner can manage personal information, saved addresses, and the chat language.
Preconditions: Signed in as a homeowner. Tester is on the Home screen.
No.	Module	Scenario	Status	Comments
1	Profile & Settings	Tap the Account tab -> Profile screen shows name, email, and verification status	P	
2	Profile & Settings	Open Personal Information -> form opens	P	
3	Profile & Settings	Change the full name to an updated name -> change accepted	P	
4	Profile & Settings	Tap Save -> confirmation appears and the profile shows the updated name	P	
5	Profile & Settings	Open Saved Addresses -> saved addresses list opens	P	
6	Profile & Settings	Tap Add Address -> address form opens	P	
7	Profile & Settings	Enter the address label (for example Home) -> accepted	P	
8	Profile & Settings	Enter street and building and barangay, city, province -> accepted	P	
9	Profile & Settings	Confirm the address location -> location confirmed	P	
10	Profile & Settings	Tap Save Address -> address appears in the saved addresses list	P	
11	Profile & Settings	Set the address as default -> marked as default	P	
12	Profile & Settings	Open Message Language -> language options shown (English / Filipino)	P	
13	Profile & Settings	Select Filipino and tap Save language -> confirmation appears	P	
14	Profile & Settings	Select English and tap Save language -> confirmation appears	P	

UAT#16: Support & Legal (Homeowner)
Objective: To verify that the Help Center and Privacy Policy pages open and display published content.
Preconditions: Signed in as a homeowner. The content pages are published.
No.	Module	Scenario	Status	Comments
1	Support & Legal	Tap the Account tab -> Profile screen opens	P	
2	Support & Legal	Open Help Center -> help content or frequently asked questions appear	P	
3	Support & Legal	Return to the Account tab and open Privacy Policy -> privacy policy content appears	P	

UAT#17: Customer Support (Homeowner)
Objective: To verify that a homeowner can submit a confidential provider report and receive a ticket reference.
Preconditions: Signed in as a homeowner. A booking exists for which a report can be submitted.
No.	Module	Scenario	Status	Comments
1	Customer Support	Open a booking and tap Report Provider -> report flow opens		
2	Customer Support	Read the confidentiality notice -> message states the report is confidential and reviewed by support		
3	Customer Support	Select a reason (for example Late / No Show) -> reason selected		
4	Customer Support	Enter a description (at least 10 characters) -> accepted		
5	Customer Support	Add up to 3 proof photos (optional) -> photos attach		
6	Customer Support	Tap Submit Report -> confirmation appears with a ticket reference number		

UAT#18: Logout (Homeowner)
Objective: To verify that the homeowner can sign out and that protected screens require sign-in afterwards.
Preconditions: Signed in as a homeowner.
No.	Module	Scenario	Status	Comments
1	Logout	Tap the Account tab -> Profile screen opens		
2	Logout	Tap Log Out -> sign-out confirmation prompt appears		
3	Logout	Confirm the sign-out -> returns to the Sign In screen		
4	Logout	Try to open the Home or Activity screens -> app asks for sign-in instead of showing protected screens		

UAT#19: Registration - Step 1 (Account) (Worker)
Objective: To verify that a new worker can create an account and complete the first registration step.
Preconditions: Terms and Conditions and Privacy Policy are published. A valid email and government ID image are ready. Tester is on the Sign In screen.
No.	Module	Scenario	Status	Comments
1	Registration - Step 1 (Account)	Tap Create an account -> account type selection opens	P	
2	Registration - Step 1 (Account)	Tap the I provide services card -> worker registration Step 1 opens	P	
3	Registration - Step 1 (Account)	Enter first name and last name -> fields accept input	P	
4	Registration - Step 1 (Account)	Enter email -> field accepts input	P	
5	Registration - Step 1 (Account)	Enter mobile number -> field accepts input	P	
6	Registration - Step 1 (Account)	Select birthday -> date selected	P	
7	Registration - Step 1 (Account)	Enter a password and confirm it in Confirm Password -> inputs accepted and masked	P	
8	Registration - Step 1 (Account)	Tap Next Step -> proceeds to Step 2 (Industry & Skills)	P	

UAT#20: Registration - Step 2 (Industry & Skills) (Worker)
Objective: To verify that a worker can select their industry, employment type, and skills.
Preconditions: Worker registration Step 1 is complete and Step 2 is open.
No.	Module	Scenario	Status	Comments
1	Registration - Step 2 (Industry & Skills)	Select a primary industry -> industry selected	F	
2	Registration - Step 2 (Industry & Skills)	Select an employment type -> type selected	F	
3	Registration - Step 2 (Industry & Skills)	Select at least one skill -> skill selected	F	
4	Registration - Step 2 (Industry & Skills)	Tap Next Step -> proceeds to Step 3 (Office Address & Contact)	F	

UAT#21: Registration - Step 3 (Office Address & Identity) (Worker)
Objective: To verify that a worker can enter their address and submit identity documents.
Preconditions: Worker registration Step 2 is complete and Step 3 is open. Government ID images (front and back) are ready.
No.	Module	Scenario	Status	Comments
1	Registration - Step 3 (Office Address & Identity)	Enter the address details -> field accepts input		
2	Registration - Step 3 (Office Address & Identity)	Enter the contact person information -> field accepts input		
3	Registration - Step 3 (Office Address & Identity)	Select the government ID type -> type selected		
4	Registration - Step 3 (Office Address & Identity)	Upload the front of the government ID -> image attaches		
5	Registration - Step 3 (Office Address & Identity)	Upload the back of the government ID -> image attaches		
6	Registration - Step 3 (Office Address & Identity)	Tap Next Step -> proceeds to Step 4 (Review & Submit)		

UAT#22: Registration - Step 4 (Review & Submit) (Worker)
Objective: To verify that a worker can review the application and submit it for administrator review.
Preconditions: Worker registration Steps 1-3 are complete and Step 4 is open.
No.	Module	Scenario	Status	Comments
1	Registration - Step 4 (Review & Submit)	Review the account, industry, and address details -> all match what was entered		
2	Registration - Step 4 (Review & Submit)	Check the accurate information consent box -> box is selectable		
3	Registration - Step 4 (Review & Submit)	Check the privacy policy consent box -> box is selectable		
4	Registration - Step 4 (Review & Submit)	Check the terms of service consent box -> box is selectable		
5	Registration - Step 4 (Review & Submit)	Tap Submit Registration -> success message Registration Submitted! appears		
6	Registration - Step 4 (Review & Submit)	Tap Go to Sign In -> returns to the Sign In screen		

UAT#23: Sign In (Worker)
Objective: To verify that a worker can sign in to the correct workspace and reach the worker Dashboard, and that the Sign In screen secondary actions navigate correctly.
Preconditions: Approved, verified worker test account exists. Tester is already on the Sign In screen.
No.	Module	Scenario	Status	Comments
1	Sign In	Enter worker email in Email Address -> field accepts input	P	
2	Sign In	Enter worker password in Password -> input is masked by default	P	
3	Sign In	Tap the eye icon -> password visibility toggles	P	
4	Sign In	Check Remember Me, then tap Login -> Worker Dashboard loads	P	
5	Sign In	Close and reopen the app -> session persists without re-entering for email/password (Remember Me honored)	P	
6	Sign In	Tap Forgot password? -> navigates to Password Recovery	P	
7	Sign In	Tap Create an account -> navigates to Worker Registration Step 1	P	
8	Sign In	Tap Continue with Google -> Google auth flow launches	P	


UAT#24: Verification Status (Worker)
Objective: To verify that the worker can see their approval status, document statuses, and any administrator feedback.
Preconditions: Signed in as a worker. The account has a verification record.
No.	Module	Scenario	Status	Comments
1	Verification Status	Open Verification from the Dashboard quick actions (or Profile then Verification) -> verification screen opens	P	
2	Verification Status	Verify the application status (Pending, Approved, Rejected, or Needs Review) -> shown	P	
3	Verification Status	Open the Documents tab -> submitted documents listed	P	
4	Verification Status	Verify each document shows a status (Verified, In Review, Rejected, or Missing) -> shown	P	
5	Verification Status	If a document was rejected, verify the administrator feedback -> shown	P	
6	Verification Status	Open the FAQ tab -> frequently asked questions appear	P	

UAT#25: Profile - Industry & Skills (Worker)
Objective: To verify that a worker can define their industries, skills, service rates, and experience.
Preconditions: Signed in as a worker.
No.	Module	Scenario	Status	Comments
1	Profile - Industry & Skills	Tap the Profile tab -> Profile opens	P	
2	Profile - Industry & Skills	Open Industry & Skills -> screen opens	P	
3	Profile - Industry & Skills	Select a primary industry -> industry selected	P	
4	Profile - Industry & Skills	Select at least one skill -> skill selected	P	
5	Profile - Industry & Skills	Enter a service rate for each selected skill -> accepted	P	
6	Profile - Industry & Skills	Select the years of experience -> selected	P	
7	Profile - Industry & Skills	Tap Save Changes -> saved confirmation appears with a summary	P	

UAT#26: Profile - Service Areas & Availability (Worker)
Objective: To verify that a worker can set their service origin and coverage radius and become eligible for matching.
Preconditions: Signed in as a worker. Location permission is available.
No.	Module	Scenario	Status	Comments
1	Profile - Service Areas & Availability	Open Service Areas (Service Setup) -> screen opens with a matching readiness checklist	P	
2	Profile - Service Areas & Availability	Review the matching readiness checklist -> setup status shown	P	
3	Profile - Service Areas & Availability	Use the current location to confirm the service origin -> origin confirmed	P	
4	Profile - Service Areas & Availability	Enter a service area label -> accepted	P	
5	Profile - Service Areas & Availability	Select a coverage radius -> selected	P	
6	Profile - Service Areas & Availability	Tap Save Service Availability -> Service availability saved confirmation appears	P	
7	Profile - Service Areas & Availability	Verify the matching readiness checklist updates -> reflects the new setup	P	



UAT#27: Profile - Personal Information (Worker)
Objective: To verify that a worker can update personal details and bio.
Preconditions: Signed in as a worker.
No.	Module	Scenario	Status	Comments
1	Profile - Personal Information	Open Personal Information -> form opens with full name, email, and phone fields	P	
2	Profile - Personal Information	Review the full name, email, and phone number fields -> pre-filled correctly	P	
3	Profile - Personal Information	Update the bio with a short description -> accepted	P	
4	Profile - Personal Information	Tap Save Changes -> confirmation appears that the information was updated	P	

UAT#28: Dashboard (Worker)
Objective: To verify that the worker Dashboard shows the stats, live status, quick actions, and active bookings.
Preconditions: Signed in as a worker with booking activity.
No.	Module	Scenario	Status	Comments
1	Dashboard	Verify the Today Stats show Active, Pending, Completed, and Earnings -> all four shown	P	
2	Dashboard	Review the Live Status card and presence banner -> online/offline state shown	P	
3	Dashboard	Review the Quick Actions (My Bookings, Earnings, Premium, Verification) -> all present	P	
4	Dashboard	Review the Active Bookings section -> current bookings listed	P	



UAT#29: Incoming Requests (Worker)
Objective: To verify that an approved worker can accept or decline a matching request with a recorded reason.
Preconditions: Signed in as an approved, online worker. A matching request has been offered.
No.	Module	Scenario	Status	Comments
1	Incoming Requests	Wait for a request offer to appear on the Dashboard -> offer appears	P	
2	Incoming Requests	Open the request and review description, area, distance, and offer -> all shown	P	
3	Incoming Requests	Tap Accept Request -> confirmation appears and the booking appears in the worker bookings list	P	
4	Incoming Requests	Tap Decline on a request and confirm -> request marked as declined	P	
5	Incoming Requests	Select a reason for declining -> reason recorded	P	
6	Incoming Requests	Verify the declined request is removed from active offers -> no longer shown	P	

UAT#30: Booking Details (Worker)
Objective: To verify that the worker can view the complete job details for an accepted booking.
Preconditions: Signed in as a worker with an accepted booking.
No.	Module	Scenario	Status	Comments
1	Booking Details	Open the accepted booking from the Bookings tab -> booking details open	P	
2	Booking Details	Verify job number, description, client, location, and schedule -> all shown	P	
3	Booking Details	Review the estimated earnings -> shown	P	
4	Booking Details	Review the route summary with the distance to the service location -> shown	P	

UAT#37: Booking Progress & Completion (Worker)
Objective: To verify that a worker can progress a job through En Route, Arrived, In Progress, and Completed.
Preconditions: Signed in as a worker with an accepted booking, at or traveling to the customer location.
No.	Module	Scenario	Status	Comments
1	Booking Progress & Completion	Tap Start En Route -> status changes to En Route	P	
2	Booking Progress & Completion	When near the customer location, tap I've Arrived & Start Job -> status changes to Arrived then In Progress	P	
3	Booking Progress & Completion	If prompted by the arrival distance check, move closer and retry -> status progresses to In Progress	P	
4	Booking Progress & Completion	Tap Complete Job -> status changes to Completed or Awaiting Confirmation	P	
UAT#31: Payment Confirmation (Worker)
Objective: To verify that a worker can confirm payment received and the 10% commission is recorded.
Preconditions: Signed in as a worker. The booking is Completed and the customer has confirmed payment.
No.	Module	Scenario	Status	Comments
1	Payment Confirmation	Open the completed booking -> summary shows the service amount and 10% platform commission	P	
2	Payment Confirmation	Tap Confirm Payment - Cash -> payment and commission recorded confirmation appears and the payment status becomes successful	P	
3	Payment Confirmation	Tap Confirm Payment - Online (Simulated) -> payment and commission recorded confirmation appears	P	

UAT#32: Wallet (Worker)
Objective: To verify that the wallet shows the balance and activity, and the simulated top-up increases the balance.
Preconditions: Signed in as a worker with a wallet.
No.	Module	Scenario	Status	Comments
1	Wallet	Tap the Wallet tab -> available balance shown	P	
2	Wallet	Review the daily earnings chart and statistics (gross, net, jobs, commission) -> shown	P	
3	Wallet	Tap Simulate Top-Up -> top-up dialog opens	P	
4	Wallet	Enter a top-up amount -> accepted	P	
5	Wallet	Read the simulation notice (no actual payment) -> notice displayed	P	
6	Wallet	Tap Simulate Top-Up again to confirm -> success message appears and the balance updates	P	
7	Wallet	Tap See All next to Transactions -> Transaction History screen opens	P	
8	Wallet	Use the filters (All, Income, Deductions) -> list updates per filter	P	
9	Wallet	Open a transaction -> amount and status shown	P	

UAT#40: Reviews (Worker)
Objective: To verify that the worker can view the customer rating and review as read-only feedback.
Preconditions: Signed in as a worker. A completed, paid booking exists and the customer has submitted a review.
No.	Module	Scenario	Status	Comments
1	Reviews	Open the completed booking or the Reviews section -> Rate & Review modal opens	P	
2	Reviews	Verify the customer star rating and written review -> displayed	P	
3	Reviews	Verify the modal is view-only -> no edit or submit controls for the worker	P	

UAT#41: Messages (Worker)
Objective: To verify that the worker can exchange messages with the customer for the booking.
Preconditions: Signed in as a worker. A conversation exists with the customer for the booking.
No.	Module	Scenario	Status	Comments
1	Messages	Tap the Messages tab -> conversation list opens	P	
2	Messages	Open the customer conversation -> chat thread opens	P	
3	Messages	Enter a message and tap Send -> message appears in the thread	P	
4	Messages	Customer replies -> reply appears in the thread	P	
5	Messages	From the booking detail, tap Open Full Chat -> same conversation opens	P	

UAT#42: Cancellation (Worker)
Objective: To verify that a worker can cancel a job with a reason that is shared with the customer.
Preconditions: Signed in as a worker with a cancellable booking. Permission from the QA team to cancel the test booking.
No.	Module	Scenario	Status	Comments
1	Cancellation	Open the booking and tap the three-dot menu -> menu opens	P	
2	Cancellation	Select Cancel Service -> cancellation flow opens	P	
3	Cancellation	Select the job stage -> stage selected	P	
4	Cancellation	Select or type a reason -> reason recorded	P	
5	Cancellation	Tap Confirm Cancellation -> confirmation appears that the reason was sent to the customer	P	
6	Cancellation	Verify the booking shows Cancelled status -> appears in the Cancelled filter	P	

UAT#43: Feedback (Worker)
Objective: To verify that the worker can submit feedback with a rating, compliments, notes, and a proof-of-work photo.
Preconditions: Signed in as a worker. The booking is Completed.
No.	Module	Scenario	Status	Comments
1	Feedback	Open the completed booking and tap Leave Feedback -> feedback form opens	P	
2	Feedback	Select a star rating for the customer experience -> rating selected	P	
3	Feedback	Select quick compliments (for example Punctual, Easy Communication) -> selected	P	
4	Feedback	Write a short note about the experience -> accepted	P	
5	Feedback	Add a proof-of-work photo (optional) -> photo attaches	P	
6	Feedback	Tap Submit Feedback -> confirmation appears that the feedback was submitted	P	

UAT#44: Availability for Matching (Worker)
Objective: To verify that a worker can turn availability for matching on and off and the presence status updates.
Preconditions: Signed in as an approved worker with industry, skills, and service area setup complete.
No.	Module	Scenario	Status	Comments
1	Availability for Matching	Tap the Profile tab -> Profile opens	P	
2	Availability for Matching	Find the Availability section with the Available for matching switch -> visible	P	
3	Availability for Matching	Turn the switch on -> presence banner shows the worker is online and receiving requests	P	
4	Availability for Matching	Return to the Dashboard -> live status shows online	P	
5	Availability for Matching	Turn the switch off -> status changes to offline	P	

UAT#45: Logout (Worker)
Objective: To verify that the worker can sign out and return to the Sign In screen.
Preconditions: Signed in as a worker.
No.	Module	Scenario	Status	Comments
1	Logout	Tap the Profile tab -> Profile opens	P	
2	Logout	Tap Log Out -> sign-out confirmation prompt appears	P	
3	Logout	Confirm the sign-out -> returns to the Sign In screen	P	

UAT#46: Login & 2FA (Admin)
Objective: To verify that the administrator can sign in and that sensitive commands require a second authentication factor.
Preconditions: Administrator account exists with TOTP MFA configured, and the authenticator app is available. Tester is on the Administrator Sign In screen.
No.	Module	Scenario	Status	Comments
1	Login & 2FA	Enter the administrator email in Email Address -> field accepts input		
2	Login & 2FA	Enter the administrator password in Password -> field accepts input		
3	Login & 2FA	Tap Sign In -> Dashboard opens with the administrator navigation		

UAT#47: Dashboard (Admin)
Objective: To verify that the administrator Dashboard displays the eight required metrics with their values.
Preconditions: Signed in as an administrator with test environment data.
No.	Module	Scenario	Status	Comments
1	Dashboard	Verify the metric cards for total users, total workers, new users this week, and new workers this week -> shown		
2	Dashboard	Verify the cards for new bookings this week, total platform earnings, active bookings, and average response rate -> shown		
3	Dashboard	Review the chart sections on the Dashboard -> load and display		

UAT#48: Account Management (Users) (Admin)
Objective: To verify that the administrator can browse and search users and workers, view details, and suspend or reactivate an account.
Preconditions: Signed in as an administrator with user records.
No.	Module	Scenario	Status	Comments
1	Account Management (Users)	Open Account Management -> Users list shows name, email, and account status		
2	Account Management (Users)	Use the search field to find a specific user -> user found		
3	Account Management (Users)	Open the Workers list -> worker accounts shown with approval status		
4	Account Management (Users)	Select a user -> user details show name, email, phone, verification status, and created date		
5	Account Management (Users)	Tap Suspend User and enter a reason -> user status shows suspended		
6	Account Management (Users)	Tap Activate User (or the equivalent) -> account is active again		

UAT#49: Worker Review (Admin)
Objective: To verify that the administrator can approve a worker application, request more documents, or reject with a reason.
Preconditions: Signed in as an administrator. A worker application is pending review, and a two-factor-authentication session is active.
No.	Module	Scenario	Status	Comments
1	Worker Review	Open Worker Management -> pending worker applications listed		
2	Worker Review	Open the pending application -> details match the worker registration data		
3	Worker Review	Review the submitted identity documents -> documents viewable		
4	Worker Review	Review the identity comparison / face-match result (if shown) -> acceptable		
5	Worker Review	Tap Approve Application and complete two-factor authentication -> confirmation shows the worker as Approved		
6	Worker Review	Tap Request More Documents, add a reason, and confirm -> worker is notified and the application moves to a re-submission state		
7	Worker Review	Tap Reject Application, enter a rejection reason, complete two-factor authentication, and confirm -> worker is notified with the reason		

UAT#50: Bookings (Operations) (Admin)
Objective: To verify that the administrator can search, filter, and open bookings, and record an intervention when needed.
Preconditions: Signed in as an administrator with test bookings.
No.	Module	Scenario	Status	Comments
1	Bookings (Operations)	Open the Bookings List -> table shows booking references, customers, workers, statuses, and amounts		
2	Bookings (Operations)	Use the search field to find a specific booking -> booking found		
3	Bookings (Operations)	Apply a status filter -> list updates		
4	Bookings (Operations)	Open a booking -> booking details appear		
5	Bookings (Operations)	Select the intervention option and record a reason -> intervention recorded against the booking details		
6	Bookings (Operations)	If a follow-up booking is required -> system creates or allocates one		

UAT#51: Financial Management (Admin)
Objective: To verify that the administrator can audit payment details and process a refund.
Preconditions: Signed in as an administrator. A completed, paid booking exists.
No.	Module	Scenario	Status	Comments
1	Financial Management	Open the Transactions section -> transaction for the test booking appears with its status		
2	Financial Management	Open the transaction -> payment method, amount, and booking reference shown		
3	Financial Management	Verify the commission (10%) and worker net amount -> shown		
4	Financial Management	Open the cancelled booking and select the refund option -> enter the refund amount and reason		
5	Financial Management	Complete two-factor authentication and confirm the refund -> refund recorded on the booking and in the financial records		

UAT#52: Services Management (Admin)
Objective: To verify that the administrator can view and update the service catalog and the change is saved.
Preconditions: Signed in as an administrator.
No.	Module	Scenario	Status	Comments
1	Services Management	Open Services Management -> industries and their services listed		
2	Services Management	Open a service -> service details shown		
3	Services Management	Make a safe test update (for example a description change) -> change accepted		
4	Services Management	Tap Save -> change is saved		

UAT#53: Reviews Moderation (Admin)
Objective: To verify that the administrator can remove or hide a review with a recorded reason.
Preconditions: Signed in as an administrator. A published review exists and permission has been given to moderate the test review.
No.	Module	Scenario	Status	Comments
1	Reviews Moderation	Open Reviews Moderation -> published reviews listed with their status		
2	Reviews Moderation	Open the test review -> review details shown		
3	Reviews Moderation	Select the moderation action -> action selected		
4	Reviews Moderation	Record a reason and confirm -> review disappears from the worker profile		

UAT#54: Support Tickets (Admin)
Objective: To verify that the administrator can open, respond to, resolve, or escalate a support ticket.
Preconditions: Signed in as an administrator. A support ticket exists in the system.
No.	Module	Scenario	Status	Comments
1	Support Tickets	Open Support Tickets -> list shows ticket IDs, subjects, statuses, and priorities		
2	Support Tickets	Open the test ticket -> ticket details shown		
3	Support Tickets	Use the reply / resolution actions to respond -> response recorded		
4	Support Tickets	Tap Resolve -> status changes to resolved		
5	Support Tickets	If higher-level handling is needed -> escalation option available and works		

UAT#55: Communication & Notifications (Admin)
Objective: To verify that the administrator can send a notification to a selected recipient group.
Preconditions: Signed in as an administrator.
No.	Module	Scenario	Status	Comments
1	Communication & Notifications	Open Notifications / Communication -> section opens		
2	Communication & Notifications	Select the option to create a new notification -> composer opens		
3	Communication & Notifications	Choose the recipient group -> group selected		
4	Communication & Notifications	Enter a subject and message -> accepted		
5	Communication & Notifications	Tap Send -> notification recorded in the sent notifications list		

UAT#56: Reports & Analytics (Admin)
Objective: To verify that the reports dashboard displays analytics and can be exported and printed.
Preconditions: Signed in as an administrator.
No.	Module	Scenario	Status	Comments
1	Reports & Analytics	Open the Reports and Analytics dashboard -> metrics and charts load		
2	Reports & Analytics	Select the export option (CSV) -> file downloads and opens		
3	Reports & Analytics	Select the print option -> print dialog opens		

UAT#57: System Settings (Admin)
Objective: To verify that system settings changes are applied on Save and discarded when the administrator chooses not to save.
Preconditions: Signed in as an administrator with a two-factor-authentication session.
No.	Module	Scenario	Status	Comments
1	System Settings	Open System Settings -> settings load		
2	System Settings	Make a test change to a safe setting -> change reflected in the form		
3	System Settings	Tap Discard (Go Back without Saving) -> change is not applied		
4	System Settings	Make the test change again and tap Save Changes -> confirmation appears and the change is applied		

UAT#58: Audit Logs (Admin)
Objective: To verify that the audit log records administrator actions with the actor, target, and time.
Preconditions: Signed in as an administrator who has performed actions during the session.
No.	Module	Scenario	Status	Comments
1	Audit Logs	Open Audit Logs -> logs show action, actor, target, and timestamp		
2	Audit Logs	Find the action performed earlier (for example an approval) -> entry matches the performed action		

UAT#59: Trash (Admin)
Objective: To verify that deleted records can be restored from Trash or permanently deleted.
Preconditions: Signed in as an administrator. A record exists in the Trash.
No.	Module	Scenario	Status	Comments
1	Trash	Open Trash -> deleted records appear		
2	Trash	Tap Restore for the test record -> record returns to its normal location		
3	Trash	Select Permanent Deletion for a record -> record is removed and no longer appears in Trash		

UAT#60: Logout (Admin)
Objective: To verify that the administrator can sign out and that protected pages redirect to Sign In.
Preconditions: Signed in as an administrator.
No.	Module	Scenario	Status	Comments
1	Logout	Open the administrator profile or menu -> menu opens		
2	Logout	Tap Logout -> returns to the Sign In screen		
3	Logout	Try to open a protected page directly -> application redirects to Sign In		

Overall UAT Results
Objective: To confirm that the full UAT scope has been executed and to record the final readiness decision.
Preconditions: All applicable UAT sections above have been executed.
No.	Module	Scenario	Status	Comments
1	Overall UAT Results	Confirm all applicable module scenarios have been executed		
2	Overall UAT Results	Count total Passed and Failed scenarios	Passed:  Failed: 	
3	Overall UAT Results	Total Success Rate of the UAT	%	
