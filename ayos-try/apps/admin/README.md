# A-yos Admin Web App

The **A-yos Admin Web App** is a premium, high-performance SaaS dashboard designed to manage the A-yos platform ecosystem. It provides administrators with a centralized hub for monitoring revenue, managing users and workers, and reviewing system analytics.

## 🚀 Tech Stack
- **Framework:** React 18 + Vite
- **Styling:** Tailwind CSS (Vanilla configuration, premium design tokens)
- **Icons:** Lucide React
- **Routing:** React Router v6
- **Data Visualization:** Recharts

## ✨ Premium Features
- **Dynamic Live Dashboard:** Simulated real-time activity feed on the dashboard.
- **Global Command Palette:** Instantly navigate anywhere using `Ctrl + K` (or `Cmd + K`).
- **Toast Notifications:** Sleek, global sliding notifications for success/error feedback.
- **Skeleton Loading:** Shimmering placeholder components provide perceived performance improvements during data fetching.
- **Responsive Navigation:** A collapsible sidebar that gracefully transitions into a sliding drawer on mobile devices.

---

## 🛠️ Admin Workflow Guide

The application follows a structured workflow for administrative tasks, ensuring secure access and efficient management.

### 1. Authentication Flow
- **Access:** All administrative operations are secured behind the `/login` route.
- **State Management:** The `AuthContext` handles session states. Upon successful login, the administrator is redirected to the protected dashboard area via the `ProtectedRoute` wrapper.

### 2. Main Navigation & Organization
The platform is organized into logical groups to prevent visual clutter:
- **Core Operations:** Dashboard, Users, Workers, Bookings.
- **Financial & Quality:** Payments, Reviews, Support.
- **System & Administration:** Reports, Analytics, Notifications, Audit Logs.
- **Settings:** Platform Settings, Profile Management, and Trash.

### 3. Worker Management Workflow
- **Verification:** Admins can view pending worker approvals, inspect their professional profiles, and approve or reject them.
- **Actions:** Using the action menus in the Workers table, admins can view detailed profiles (via a slide-out Drawer), suspend active workers, or permanently delete accounts.

### 4. Global Quick Actions
- Pressing `Ctrl + K` triggers the global search palette, allowing administrators to rapidly jump from any page to another (e.g., from reading Audit Logs straight to modifying Platform Settings).

---

## 💻 Development Setup

### Prerequisites
- Node.js (v18+)
- npm or pnpm

### Running Locally
1. Navigate to the project directory:
   ```bash
   cd admin-webapp
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the development server:
   ```bash
   npm run dev
   ```
4. Build for production:
   ```bash
   npm run build
   ```

*Designed and engineered as a state-of-the-art enterprise administrative tool.*
