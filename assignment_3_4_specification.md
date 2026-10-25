# Assignment 3 & 4: Task & Team Management App
## Real-time Collaboration & Advanced Features

---

## 1. Objective

This assignment extends **Assignment 2**. Continue working in the same GitHub repository and the same Vercel project — **do not start a new project from scratch**. 

Build on your authentication, team, and task features to add real-time collaboration and a more advanced permission system. The project should be built using Next.js on the frontend, with the backend implemented either in Next.js (Route Handlers) or NestJS, focusing on:

*   **Real-time communication** (WebSockets / Realtime subscriptions)
*   **Live task board updates** across multiple users
*   **Team chat** with persisted message history
*   **Advanced role-based permissions**
*   **Notifications**

---

## 2. Functional Requirements

### 2.1. Real-time Team Chat
Each team must have its own dedicated chat room.
*   **Messaging:** Members can send and view text messages within their team's chat.
*   **Persistence:** Messages must be stored in the database (`sender`, `content`, `teamId`, `createdAt`).
*   **Real-time synchronization:** New messages appear instantly for all online team members without refreshing the page.
*   **Delivery Mechanism:** Implement using one of the following:
    *   Supabase Realtime (Postgres Changes / Broadcast)
    *   Socket.io (with a Node.js/NestJS server hosted on Render)
    *   Pusher or Ably (managed WebSocket service)

### 2.2. Real-time Task Board Updates
*   When a task is created, updated, or deleted by one team member, all other members viewing the same team see the changes live.
*   Must use the same real-time mechanism chosen for the chat feature (Supabase Realtime, Socket.io, Pusher, or Ably).

### 2.3. In-App Notifications
*   Trigger an in-app notification when a user is **assigned a task**.
*   Trigger an in-app notification when a user is **added to a team**.
*   Notifications must be stored in the database.
*   Display notifications via a notification bell/dropdown with an unread badge and functionality to mark them as read.

### 2.4. Advanced Role & Permission System
Extend the team role system from Assignment 2 into at least three roles:

| Role | Permissions |
| :--- | :--- |
| **Owner** | Full control: manage members, assign roles, delete the team, delete any task. |
| **Admin** | Manage members and all tasks; **cannot** delete the team. |
| **Member** | Create and manage their own tasks; view all team content. |

*   **Enforcement:** Permission rules must be enforced both on the **UI** (conditionally hiding or disabling actions) and in the **API** (server-side authorization checks, not client-only).

### 2.5. Optional: NestJS Backend
*   You may implement the backend as a standalone NestJS application (REST/GraphQL API, Prisma ORM, WebSocket Gateway for chat/task events) while keeping Next.js purely as the frontend client.
*   *Note: This is optional and recommended for deeper backend architecture practice.*

---

## 3. UI Requirements

*   **Team Chat Panel:** Display message history and provide an input box to send new messages.
*   **Live Task Board:** A Kanban board (e.g., *To Do*, *In Progress*, *Done*) that reflects changes from other users instantly.
*   **Notification Center:** A notification bell icon displaying the unread count and a dropdown listing recent notifications.
*   **Member Management Screen:** Displays each member's role with controls to modify roles (restricted to Owner/Admin).
*   **Role-Based Visuals:** Clear visual distinction between actions permitted for Owners, Admins, and Members.

---

## 4. Optional Features (Bonus Marks)

*   Typing indicators and online/offline presence status in chat.
*   File or image attachments in chat messages.
*   Activity log / audit trail per team (tracking who performed what action and when).
*   Browser Web Push notifications alongside in-app notifications.

---

## 5. Tech Stack & Hosting

*   **Frontend:** Next.js (App Router, TypeScript)
*   **Backend / API:** Next.js Route Handlers OR a separate NestJS application
*   **Database:** PostgreSQL (Supabase)
*   **ORM:** Prisma
*   **Real-time:** Supabase Realtime, Socket.io, Pusher, or Ably
*   **Authentication:** NextAuth.js, JWT, or Supabase Auth (carried over from Assignment 2)
*   **Deployment:** 
    *   Frontend / API: Vercel (continuous deployment on push)
    *   Separate Backend (if NestJS): Render (connected to the same Supabase database)

---

## 6. Submission Information

> **IMPORTANT:** Keep the exact labels below on their own lines. Do not rename, remove, or reorder them, as they are processed via automated grading. Use `N/A` if a field does not apply.

Student ID: __________  
Full Name: __________  
GitHub Repository URL: __________  
Deployed Website URL (Vercel): __________  
Separate Backend URL (NestJS on Render) — write N/A if not used: __________  
Real-time mechanism used (Supabase Realtime / Socket.io / Pusher / Ably): __________  
Test Account 1 Email: __________  
Test Account 1 Password: __________  
Test Account 2 Email (must be on the SAME team as Account 1, to test real-time between two sessions): __________  
Test Account 2 Password: __________  
Both test accounts are already email-verified / ready to log in immediately, with no confirmation link needed (Yes / No): __________  
Demo video link (YouTube/Drive/Loom, 2–3 minutes, showing live chat and live task updates across two sessions): __________  

---

## 7. Deliverables & Submission Guidelines

*   Submit a single document named `QE123456_Ass3.doc` or `QE123456_Ass3.docx` (replace `QE123456` with your student ID).
*   Include the **Submission Information** section filled out completely, along with the **Self-Assessment Checklist** (preserving original ordering and IDs).
*   **Demo Video Link:** Must be 2–3 minutes long demonstrating real-time chat and task updates concurrently across two browser sessions. Submissions lacking this link will receive conservative scores on real-time criteria.
*   Ensure the GitHub repository is public and accessible, and that the deployed application remains live until final grades are published.