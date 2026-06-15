# Project Brief: Kinetic HR - Post Share Check-in System

## 1. Project Overview
Kinetic HR is a specialized web tool designed to streamline and verify employee engagement with company social media posts. The system allows administrators to schedule "Share Tasks," and provides employees with a structured interface to submit proof of their shares within a strict 24-hour window.

## 2. Core Objectives
- **Increase Social Reach**: Encourage employees to share company content consistently.
- **Verification & Accountability**: Provide a structured "check-in" mechanism with screenshot proof.
- **Data-Driven Insights**: Give HR admins visibility into engagement rates across departments and individuals.
- **Automated Management**: Handle scheduling constraints and expiration logic automatically.

## 3. Target Users
- **Employees (Users)**: Access the dashboard to view active tasks, share content, and upload proof.
- **HR Administrators (Admins)**: Create and schedule posts, manage teams, and export compliance reports.

## 4. Functional Requirements

### 4.1 Post Management (Admin)
- **Create Post**: Admin can input Title, URL/Link, Description, and Thumbnail.
- **Scheduling**: Define Start Date and Start Time (24h clock).
- **Constraints**: Maximum of 2 posts per day to prevent "share fatigue."
- **Targeting**: Assign posts to specific teams (Tech, Sales, Marketing) or "All Employees."
- **Auto-Archive**: Optional setting to archive tasks after their 24h window.

### 4.2 Check-in Workflow (User)
- **Discovery**: Users view tasks in either a **List View** (chronological) or **Calendar View** (visual grid).
- **Submission**: Users must click a specific post to open the **Submission Modal**.
- **Proof of Work**: Users upload a screenshot as evidence of the share.
- **Time Constraint**: Check-ins are only accepted within **24 hours** of the post's start time.
- **Status Tracking**: Visual indicators for "Pending," "Completed," "Expired," and "Locked."

### 4.3 Reporting & Analytics (Admin)
- **KPI Dashboard**: View Total Posts, Company-wide Completion %, and Pending/Missed counts.
- **Visual Trends**: Weekly engagement charts and departmental completion comparisons.
- **User Activity Detail**: A granular table tracking every employee's share rate and missed posts.
- **Exporting**: One-click Excel export with standardized naming convention: `mm.dd.yyyy - Báo Cáo Công Việc Like Share`.

## 5. User Interface Specifications

### 5.1 Design System (Kinetic HR)
- **Theme**: Light Mode standard (SaaS Professional).
- **Primary Color**: Indigo/Blue (#4F46E5) for actions and navigation.
- **Success/Alert Colors**: Emerald for completion, Amber/Red for expiration warnings.
- **Typography**: Geist Sans/Inter for clean, modern readability.

### 5.2 Key Interface Screens
1. **Login**: Split-screen design with brand illustration and secure entry.
2. **Dashboard**: High-level overview of pending shares and latest announcements.
3. **List View**: A scanable list of active and upcoming post tasks.
4. **Calendar View**: A unique grid featuring **diagonal split layouts** for days with 2 posts.
5. **Admin Console**: Centralized form for post creation and team management.
6. **Reports Center**: Comprehensive data visualization and export tools.

## 6. Technical Specifications
- **Framework**: Next.js 14 (App Router).
- **Styling**: Tailwind CSS + Shadcn UI.
- **Database**: 
    - `Posts`: Metadata, targeting, and timestamps.
    - `Checkins`: User ID, Post ID, Image reference, and submission time.
    - `Users`: Roles (Admin/User), department, and profile data.
- **Assets**: Cloud storage for screenshot proof images.
- **Logic**: Server-side countdown validation to enforce the 24h submission lock.

## 7. Success Metrics
- 90%+ Completion Rate across targeted teams.
- Reduction in manual follow-up time for HR staff.
- Centralized audit trail of all company social media engagement.
