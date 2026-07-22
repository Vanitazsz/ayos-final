# A-yos — Auth Flow

This file documents the registration and sign-in flows for both User and Worker roles, including backend API integration points.

## Screens

| Screen | Route | Presentation |
|--------|-------|--------------|
| Landing | `/` | slide_from_left |
| Sign In | `/sign-in` | default |
| Sign Up (User) | `/sign-up` | slide_from_right |
| Register Worker | `/register-worker` | slide_from_right |

---

## User Registration (3 Steps)

### Mermaid Diagram

```mermaid
flowchart TD
  Start((Landing))
  Choice{Select Role}
  UserReg[Sign Up]
  WorkerReg[Register as Worker]
  SignIn[Sign In]

  %% Step 1 — Personal Info
  S1[Step 1: Personal Information]
  S1Fields[First Name, Middle Name, Last Name, Email, Phone, Birthday, Gender, Password, Confirm Password]
  S1Client[Client-side validation: email regex, phone regex, password strength, match]
  S1API["API: POST /api/auth/register\n{firstName, middleName, lastName, email, phone, birthday, gender, password}"]
  S1Err{201 Created?}

  %% Step 2 — Identity Verification
  S2[Step 2: Identity Verification]
  S2Fields[ID Type, Front ID photo, Back ID photo, Selfie (optional)]
  S2API["API: POST /api/user/verify-identity\nmultipart/form-data: idType, frontId, backId, selfie"]
  S2Err{Upload success?}

  %% Step 3 — Location & Consent
  S3[Step 3: Location & Consent]
  S3Fields[House No, Street, Barangay, City, Province, ZIP Code]
  S3Consent[Checkbox: Info accurate, Privacy Policy, Terms of Service]
  S3API["API: PUT /api/user/location\n{streetNumber, street, district, city, region, postalCode}"]
  S3ConsentAPI["API: POST /api/user/consent\n{infoAccurate, agreePrivacy, agreeTerms}"]
  S3Err{Saved?}

  %% Completion
  Success[Registration Successful Modal]
  SuccessAPI["API: POST /api/user/verify-email\n(either sent automatically or manual resend)"]
  Done[Redirect to Sign In]

  %% Flow
  Start --> Choice
  Choice -->|Customer| UserReg
  Choice -->|Worker| WorkerReg
  Choice -->|Already have account| SignIn

  UserReg --> S1
  S1 --> S1Fields
  S1Fields --> S1Client
  S1Client -->|Pass| S1API
  S1API --> S1Err
  S1Err -->|201| S2
  S1Err -->|Error| S1

  S2 --> S2Fields
  S2Fields --> S2API
  S2API --> S2Err
  S2Err -->|Success| S3
  S2Err -->|Error| S2

  S3 --> S3Fields
  S3Fields --> S3Consent
  S3Consent --> S3API
  S3API --> S3Err
  S3Err -->|Success| S3ConsentAPI
  S3ConsentAPI --> Success
  S3Err -->|Error| S3

  Success --> SuccessAPI
  SuccessAPI --> Done

  classDef screen fill:#f8f9fa,stroke:#333,stroke-width:1px;
  classDef api fill:#e3f2fd,stroke:#1565c0,stroke-width:1px;
  classDef decision fill:#e0f7fa,stroke:#00796b,stroke-width:1px;
  classDef error fill:#ffebee,stroke:#c62828,stroke-width:1px;
  classDef fields fill:#fff8e1,stroke:#f9a825,stroke-width:1px;
  class Start,S1,S2,S3,Success,Done,UserReg,WorkerReg,SignIn screen;
  class S1API,S2API,S3API,S3ConsentAPI,S1Client,SuccessAPI api;
  class Choice,S1Err,S2Err,S3Err decision;
  class S1Fields,S2Fields,S3Fields,S3Consent fields;
```

### Fields per Step

| Step | Field | Validation | API Endpoint |
|------|-------|------------|--------------|
| 1 | First Name | Required | `POST /api/auth/register` |
| 1 | Middle Name | Optional | (same) |
| 1 | Last Name | Required | (same) |
| 1 | Email | Regex: `^[^\s@]+@[^\s@]+\.[^\s@]+$` | (same) |
| 1 | Phone | Regex: `^(09\|\+639)\d{9}$` | (same) |
| 1 | Birthday | Required, formatted `MM/DD/YYYY` | (same) |
| 1 | Gender | Optional (Male/Female/Prefer not to say) | (same) |
| 1 | Password | 8+ chars, 1 uppercase, 1 number, 1 special | (same) |
| 1 | Confirm Password | Must match password | (same) |
| 2 | ID Type | Required (9 options: PhilSys, Driver's License, etc.) | `POST /api/user/verify-identity` |
| 2 | Front ID Photo | Required | (same) |
| 2 | Back ID Photo | Required | (same) |
| 2 | Selfie | Optional | (same) |
| 3 | Address (House, Street, Barangay, City, Province, ZIP) | Street, City, Province required | `PUT /api/user/location` |
| 3 | Consent checkboxes | All 3 required | `POST /api/user/consent` |

---

## Worker Registration (4 Steps)

### Mermaid Diagram

```mermaid
flowchart TD
  Start((Landing))
  Choice{Select Role}
  UserReg[Sign Up]
  WorkerReg[Register as Worker]
  SignIn[Sign In]

  %% Step Labels — clickable navigation
  StepLabels[Account · Industry · Address · Review]
  StepLabels -.->|goToStep| S1
  StepLabels -.->|goToStep| S2
  StepLabels -.->|goToStep| S3
  StepLabels -.->|goToStep| S4

  %% Step 1 — Account
  S1[Step 1: Account for Ayos]
  S1Fields[First Name, Middle Name, Last Name, Email, Phone, Birthday, Gender, Password, Confirm Password]
  S1API["API: POST /api/auth/register-worker\n{firstName, middleName, lastName, email, phone, birthday, gender, password}"]
  S1Err{201 Created?}

  %% Step 2 — Industry & Skills
  S2[Step 2: Industry & Skills]
  S2Fields[Industry (select), Custom Industry (text), Employment Type, Skills (multi-select)]
  S2API["API: GET /api/skills?industry={id}\n(fetch skills for selected industry)"]
  S2Err2{Loaded?}

  %% Step 3 — Address & ID
  S3[Step 3: Address & ID Verification]
  S3Fields[House No, Street, Barangay, City, Province, ZIP, Contact Person, Contact Phone, ID Type, Front ID, Back ID]
  S3API["API: POST /api/worker/verify\nmultipart: address, contactPerson, contactPhone, idType, frontId, backId"]
  S3Err{Uploaded?}

  %% Step 4 — Review
  S4[Step 4: Review & Consent]
  S4Summary[Review all entered information across steps 1–3]
  S4Consent[Checkbox: Info accurate, Privacy Policy, Terms of Service]
  S4API["API: POST /api/worker/complete-registration\n{all step data + consent}"]
  S4Err{Created?}

  %% Edit-back from Review — non-linear cut flow
  EditBack1[Edit Account]
  EditBack2[Edit Industry & Skills]
  EditBack3[Edit Address & ID]
  S4 -->|pencil icon| EditBack1
  S4 -->|pencil icon| EditBack2
  S4 -->|pencil icon| EditBack3
  EditBack1 -->|goToStep 1| S1
  EditBack2 -->|goToStep 2| S2
  EditBack3 -->|goToStep 3| S3

  %% Completion
  Success[Registration Successful Modal]
  SuccessAPI["API: POST /api/worker/verify-email\n(either sent automatically or manual resend)"]
  Done[Redirect to Sign In → Worker Dashboard]

  %% Flow
  Start --> Choice
  Choice -->|Customer| UserReg
  Choice -->|Worker| WorkerReg
  Choice -->|Already have account| SignIn

  WorkerReg --> StepLabels

  S1 --> S1Fields
  S1Fields --> S1API
  S1API --> S1Err
  S1Err -->|201| S2
  S1Err -->|Error| S1

  S2 --> S2Fields
  S2Fields --> S2API
  S2API --> S2Err2
  S2Err2 -->|Loaded| S3
  S2Err2 -->|Error| S2

  S3 --> S3Fields
  S3Fields --> S3API
  S3API --> S3Err
  S3Err -->|Success| S4
  S3Err -->|Error| S3

  S4 --> S4Summary
  S4Summary --> S4Consent
  S4Consent --> S4API
  S4API --> S4Err
  S4Err -->|Success| Success
  S4Err -->|Error| S4

  Success --> SuccessAPI
  SuccessAPI --> Done

  classDef screen fill:#f8f9fa,stroke:#333,stroke-width:1px;
  classDef api fill:#e3f2fd,stroke:#1565c0,stroke-width:1px;
  classDef decision fill:#e0f7fa,stroke:#00796b,stroke-width:1px;
  classDef error fill:#ffebee,stroke:#c62828,stroke-width:1px;
  classDef fields fill:#fff8e1,stroke:#f9a825,stroke-width:1px;
  classDef edit fill:#fce4ec,stroke:#ad1457,stroke-width:1px,stroke-dasharray: 5 5;
  class Start,S1,S2,S3,S4,Success,Done,UserReg,WorkerReg,SignIn,StepLabels screen;
  class S1API,S2API,S3API,S4API,SuccessAPI api;
  class Choice,S1Err,S2Err2,S3Err,S4Err decision;
  class S1Fields,S2Fields,S3Fields,S4Summary,S4Consent fields;
  class EditBack1,EditBack2,EditBack3 edit;
```

### Non-Linear Navigation

Worker registration uses **clickable step labels** and **edit-back buttons** for non-linear navigation:

| Mechanism | Location | Action |
|-----------|----------|--------|
| Step labels | Below progress bar | `goToStep(n)` — jump directly to any step |
| Edit icon (Account) | Step 4 Review card header | `goToStep(1)` — jump to Account step |
| Edit icon (Industry) | Step 4 Review card header | `goToStep(2)` — jump to Industry step |
| Edit icon (Address) | Step 4 Review card header | `goToStep(3)` — jump to Address step |
| Back button | Header left | `handleBack()` — previous step or `router.back()` |

The Next Step button is disabled during edit-back; users must reach Step 4 again to submit.

### Fields per Step

| Step | Field | Validation | API Endpoint |
|------|-------|------------|--------------|
| 1 | First Name, Middle Name, Last Name | — | `POST /api/auth/register-worker` |
| 1 | Email, Phone, Birthday, Gender | Same regex as user | (same) |
| 1 | Password, Confirm Password | Same rules as user | (same) |
| 2 | Industry | Required | `GET /api/skills?industry={id}` |
| 2 | Custom Industry | Text input (fallback) | — |
| 2 | Employment Type | Required (full-time/part-time/freelance) | — |
| 2 | Skills | At least 1, multi-select from industry list | — |
| 3 | Address fields | Street, City, Province required | `POST /api/worker/verify` |
| 3 | Contact Person, Contact Phone | Required, phone regex | (same) |
| 3 | ID Type, Front ID, Back ID | Required | (same) |
| 4 | Review | Summary of all steps | `POST /api/worker/complete-registration` |
| 4 | Consent checkboxes | All 3 required | (same) |

---

## Sign-In (Shared — User & Worker)

### Mermaid Diagram

```mermaid
flowchart TD
  Start((Landing))
  SignIn[Sign In]
  Fields[Email or Phone, Password]
  Forgot[Forgot Password?]
  ForgotAPI["API: POST /api/auth/forgot-password\n{email}"]
  ForgotMsg[Reset link sent email]

  Social[Social Login]
  GoogleAPI["API: POST /api/auth/google\n{oauth_token}"]
  FacebookAPI["API: POST /api/auth/facebook\n{oauth_token}"]

  Submit["API: POST /api/auth/login\n{email, password}"]
  LoginErr{200 OK?}
  Token[Store JWT: accessToken + refreshToken]
  RoleCheck{User role?}
  UserHome[Redirect to /(tabs)]
  WorkerHome[Redirect to /(worker)]

  Error[Show error toast]
  Register[Register Screen]
  Landing[Landing Page]

  %% Flow
  Start --> SignIn
  SignIn --> Fields
  Fields --> Submit
  Submit --> LoginErr
  LoginErr -->|200| Token
  LoginErr -->|401/403| Error
  Error --> SignIn
  Token --> RoleCheck
  RoleCheck -->|User| UserHome
  RoleCheck -->|Worker| WorkerHome

  Fields -.->|Forgot Password?| Forgot
  Forgot --> ForgotAPI --> ForgotMsg

  Start -->|Social| Social
  Social -->|Google| GoogleAPI
  Social -->|Facebook| FacebookAPI
  GoogleAPI --> Token
  FacebookAPI --> Token

  Start -->|Register| Register
  Register --> Landing

  classDef screen fill:#f8f9fa,stroke:#333,stroke-width:1px;
  classDef api fill:#e3f2fd,stroke:#1565c0,stroke-width:1px;
  classDef decision fill:#e0f7fa,stroke:#00796b,stroke-width:1px;
  classDef error fill:#ffebee,stroke:#c62828,stroke-width:1px;
  classDef fields fill:#fff8e1,stroke:#f9a825,stroke-width:1px;
  class Start,SignIn,ForgotMsg,UserHome,WorkerHome,Error,Register,Landing,Token screen;
  class Submit,GoogleAPI,FacebookAPI,ForgotAPI,RoleCheck api;
  class LoginErr,RoleCheck decision;
  class Fields,Social fields;
```

### Sign-In Fields

| Field | Type | Validation | Notes |
|-------|------|------------|-------|
| Email or Phone | Text | Required | Accepts email format or `09XXXXXXXXX` |
| Password | Secure text | Required | Toggle show/hide |

**Social Login (placeholder):**
- Google OAuth → `POST /api/auth/google`
- Facebook OAuth → `POST /api/auth/facebook`

**Role-based redirect:**
- User → `router.replace('/(tabs)')`
- Worker → `router.replace('/(worker)')`

---

## Backend API Summary

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| POST | `/api/auth/register` | No | Create user account |
| POST | `/api/auth/register-worker` | No | Create worker account |
| POST | `/api/auth/login` | No | Sign in, returns JWT |
| POST | `/api/auth/forgot-password` | No | Send password reset email |
| POST | `/api/auth/google` | No | Google OAuth login |
| POST | `/api/auth/facebook` | No | Facebook OAuth login |
| POST | `/api/user/verify-identity` | JWT | Upload ID + selfie for user |
| PUT | `/api/user/location` | JWT | Save user address |
| POST | `/api/user/consent` | JWT | Save user consent checkboxes |
| POST | `/api/user/verify-email` | JWT | Resend/verify email |
| GET | `/api/skills?industry={id}` | JWT | Fetch skills for industry |
| POST | `/api/worker/verify` | JWT | Upload worker ID + address |
| POST | `/api/worker/complete-registration` | JWT | Finalize worker registration |
| POST | `/api/worker/verify-email` | JWT | Resend/verify worker email |

## Notes

- **Step 1 validation is currently commented out** in worker registration (`register-worker.tsx:148–164`). User registration (`sign-up.tsx`) has full client-side validation active.
- **ID types** (shared between user and worker): PhilSys, Driver's License, Passport, UMID, Postal ID, PRC ID, Voter's ID, Senior Citizen ID, Other Government-issued ID.
- **Birthday auto-formatting**: `MM/DD/YYYY` enforced via `keyboardType="number-pad"` with digit-only stripping and auto-slash insertion.
- **Sign-In** is a single screen shared by both roles. Role is determined by the JWT payload (`role: 'user' | 'worker'`).
