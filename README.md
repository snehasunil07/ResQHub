# 🛡️ ResQHub - Community Emergency Assistance Platform

> **Second Year Track - Software Engineering Capstone Project**  
> A full-stack, responsive, community-driven emergency coordination platform connecting citizens in crisis with verified local volunteers and administrative dispatchers in real time.

---

## 📋 Table of Contents
1. [Project Overview](#-project-overview)
2. [Software Engineering Fundamentals Demonstrated](#-software-engineering-fundamentals-demonstrated)
3. [System Architecture](#-system-architecture)
4. [Role-Based Feature Matrix](#-role-based-feature-matrix)
5. [Tech Stack](#-tech-stack)
6. [Prerequisites & Environment Setup](#-prerequisites--environment-setup)
7. [Installation & Running Locally](#-installation--running-locally)
8. [Database Schema Design](#-database-schema-design)
9. [REST API Documentation](#-rest-api-documentation)
10. [Validation & Security](#-validation--security)
11. [Error Handling Strategy](#-error-handling-strategy)
12. [Repository & Git Guidelines](#-repository--git-guidelines)

---

## 🚀 Project Overview

During emergencies, every second matters. Traditional response channels often experience bottlenecks or lack immediate localized volunteer mobilization. **ResQHub** solves this by establishing a decentralized, real-time emergency response platform:
- **Citizens** report critical incidents (Medical, Blood, Food, Transport, Rescue) with GPS coordinates and contact information.
- **Administrators** verify incidents, monitor platform analytics, and prevent false alarms.
- **Volunteers** view verified missions in their community, accept response tasks atomically, coordinate with callers, and resolve emergencies.

---

## 🎯 Software Engineering Fundamentals Demonstrated

| Rubric Requirement | Implementation in ResQHub | Key Files |
| :--- | :--- | :--- |
| **Functional Full-Stack App** | Seamless React 19 client communicating with Express 5 REST API and MongoDB. | `server/server.js`, `src/App.jsx` |
| **CRUD Operations** | Complete Create, Read, Update, Delete lifecycles across Citizens, Volunteers, and Admins. | `server/controllers/requestController.js`, `src/pages/UserDashboard.jsx` |
| **Authentication & RBAC** | Stateless JWT tokens, role guards (`user`, `volunteer`, `admin`), route protection, 403 screens. | `server/middleware/authMiddleware.js`, `src/components/ProtectedRoute.jsx` |
| **Password Hashing** | One-way password hashing using `bcryptjs` (10 salt rounds) via Mongoose pre-save hooks. | `server/models/User.js` |
| **Database Integration** | Relational document design in MongoDB with Mongoose schemas, indexes, and `.populate()`. | `server/models/EmergencyRequest.js`, `server/config/db.js` |
| **Data Validation** | Dual-layer validation: Client-side forms + Server-side schema enums, lengths, and regexes. | `server/controllers/authController.js`, `server/models/User.js` |
| **Centralized Error Handling** | Unified Express error middleware, custom 404 handler, and structured error responses. | `server/middleware/errorHandler.js` |
| **Responsive UI** | Mobile-first CSS architecture with viewport scaling, backdrop filters, and drawer navigation. | `src/styles/Home.css`, `src/styles/pages.css`, `src/index.css` |
| **Git & GitHub Best Practices** | Clean `.gitignore` (ignoring `.env`, `node_modules`, `dist`), atomic commits, production build. | `.gitignore` |
| **Environment Variables** | Configuration separation (`PORT`, `MONGO_URI`, `JWT_SECRET`) with `.env.example` templates. | `.env.example` |
| **Comprehensive README** | Complete architectural documentation, API specs, and setup instructions. | `README.md` |

---

## 🏛️ System Architecture

```
                                +-----------------------------------+
                                |   Client Layer (React 19 + Vite)  |
                                |  Responsive UI / React Router v7  |
                                +-----------------+-----------------+
                                                  |
                                                  | HTTP / REST (JSON + JWT Bearer)
                                                  v
                                +-----------------+-----------------+
                                |   Backend Layer (Node + Express 5)|
                                |  - CORS & Body Parsers            |
                                |  - authMiddleware (JWT & RBAC)    |
                                |  - requestController (CRUD logic) |
                                |  - errorHandler (Central Error)   |
                                +-----------------+-----------------+
                                                  |
                                                  | Mongoose 9 ODM Driver
                                                  v
                                +-----------------+-----------------+
                                |  Database Layer (MongoDB Atlas)   |
                                |  - Users Collection               |
                                |  - EmergencyRequests Collection   |
                                +-----------------------------------+
```

---

## 👥 Role-Based Feature Matrix

### 1. Citizen / Requester (`role: "user"`)
- **Report Emergency**: Submit incidents with category (`Blood`, `Food`, `Medicine`, `Transport`, `Rescue`), urgency level (`Low`, `Medium`, `High`, `Critical`), and one-click browser GPS coordinates.
- **My Dashboard**:
  - View all personal reported incidents.
  - Edit pending requests via an interactive modal (`PUT /api/requests/:id`).
  - Delete pending requests with confirmation modal (`DELETE /api/requests/:id`).
  - Track live status (`Pending` ➔ `Verified` ➔ `Accepted` ➔ `Completed`).

### 2. Volunteer Responder (`role: "volunteer"`)
- **Available Missions**: Browse verified emergency incidents in real time, filtered by category and urgency.
- **Atomic Mission Acceptance**: One-click "Accept Emergency Response" (`PUT /api/requests/:id/accept`) with concurrency safety.
- **Active Task Management**: View assigned caller contact numbers, dial directly, and mark tasks as `Completed` (`PUT /api/requests/:id/complete`) or release them back to the pool.

### 3. Administrator (`role: "admin"`)
- **Control Center**: Real-time metrics on total incidents, pending verifications, active responder missions, and database connection status.
- **Incident Verification Queue**: Approve pending incidents to push them live to responders, or modify status.
- **Database Cleanup**: Permanently delete fraudulent or duplicate reports (`DELETE /api/requests/:id`).

---

## 💻 Tech Stack

- **Frontend**: React 19, Vite 8, React Router DOM 7, Vanilla CSS3 (Custom Design System, Inter font).
- **Backend**: Node.js (ES Modules), Express 5, Mongoose 9, JWT (`jsonwebtoken`), Bcrypt (`bcryptjs`), CORS.
- **Database**: MongoDB (Local or MongoDB Atlas cloud).
- **Code Quality**: ESLint 10 with separate Node.js and React Browser environments.

---

## ⚙️ Prerequisites & Environment Setup

1. **Node.js**: Ensure Node.js (v18 or higher) is installed.
2. **MongoDB**: Have a local MongoDB instance running or create a free cluster at [MongoDB Atlas](https://www.mongodb.com/cloud/atlas).
3. **Environment File**:
   Copy `.env.example` to `.env` in the project root:
   ```bash
   cp .env.example .env
   ```
4. **Configure Variables in `.env`**:
   ```ini
   PORT=5000
   NODE_ENV=development
   CLIENT_URL=http://localhost:5173
   MONGO_URI=mongodb://127.0.0.1:27017/resqhub
   JWT_SECRET=super_secret_jwt_key_for_resqhub_2026
   ADMIN_NAME=ResQHub Administrator
   ADMIN_EMAIL=admin@resqhub.org
   ADMIN_PASSWORD=Admin@ResQHub2026
   ADMIN_PHONE=9999999999
   ```

---

## 🛠️ Installation & Running Locally

### 1. Install Dependencies
From the project root:
```bash
npm install
```

### 2. Seed Initial Administrator Account (Optional but Recommended)
Run the automated seed script to populate the initial admin account:
```bash
npm run seed:admin
```
*Default credentials:* `admin@resqhub.org` / `Admin@ResQHub2026` (or as configured in `.env`).

### 3. Start the Express Backend Server
In your first terminal:
```bash
npm run server:dev
```
The server will start on `http://localhost:5000` with automatic reloading.

### 4. Start the React Frontend Client
In your second terminal:
```bash
npm run dev
```
Open your browser at `http://localhost:5173`.

---

## 🗄️ Database Schema Design

### 1. `User` Schema
| Field | Type | Rules |
| :--- | :--- | :--- |
| `name` | String | Required, trim, min 2 chars |
| `email` | String | Required, unique, lowercase, regex-validated |
| `phone` | String | Required, trim |
| `password` | String | Required, min 6 chars, hashed via bcrypt before save |
| `role` | String | Enum: `['user', 'volunteer', 'admin']`, default: `'user'` |
| `createdAt` / `updatedAt` | Date | Managed automatically via `timestamps: true` |

### 2. `EmergencyRequest` Schema
| Field | Type | Rules |
| :--- | :--- | :--- |
| `title` | String | Required, trim, max 150 chars |
| `description` | String | Required, trim |
| `category` | String | Enum: `['Blood', 'Food', 'Medicine', 'Transport', 'Rescue']` |
| `location` | String | Required, trim |
| `urgency` | String | Enum: `['Low', 'Medium', 'High', 'Critical']`, default: `'Medium'` |
| `status` | String | Enum: `['Pending', 'Verified', 'Accepted', 'Completed', 'Cancelled']` |
| `createdBy` | ObjectId | Reference to `User` (Requester) |
| `acceptedBy` | ObjectId | Reference to `User` (Assigned Volunteer) |
| `createdAt` / `updatedAt` | Date | Managed automatically via `timestamps: true` |

---

## 📡 REST API Documentation

### Authentication Endpoints (`/api/auth`)
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/register` | Public | Register citizen or volunteer account |
| `POST` | `/api/auth/login` | Public | Authenticate user & return signed JWT token |
| `GET` | `/api/auth/me` | Private | Rehydrate authenticated user session |

### Emergency Request Endpoints (`/api/requests`)
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/requests` | Private | Create an emergency request |
| `GET` | `/api/requests` | Private | List requests based on role (User: own, Admin: all) |
| `GET` | `/api/requests/available`| Volunteer, Admin | List verified emergencies ready for response |
| `GET` | `/api/requests/my-accepted`| Volunteer, Admin | List missions accepted by current volunteer |
| `GET` | `/api/requests/:id` | Private | Get single emergency request details |
| `PUT` | `/api/requests/:id` | Private | Update request details (Citizen) or Status (Admin) |
| `PUT` | `/api/requests/:id/accept` | Volunteer, Admin | Atomically accept an emergency mission |
| `PUT` | `/api/requests/:id/complete`| Volunteer, Admin | Mark assigned emergency as completed |
| `PUT` | `/api/requests/:id/cancel` | Volunteer, Admin | Release assigned emergency mission |
| `DELETE` | `/api/requests/:id` | Private | Delete request (Citizen: pending, Admin: any) |

### Health Endpoint (`/api/health`)
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/health` | Public | Returns API uptime and MongoDB connection state |

---

## 🔒 Validation & Security

1. **Password Security**:
   - Passwords must be at least 6 characters.
   - Salted and hashed using `bcryptjs` prior to insertion in MongoDB.
   - Database queries exclude password hashes using `.select("-password")`.
2. **Role Authorization**:
   - Middleware `protect` verifies bearer token integrity and expiration.
   - Middleware `authorize("volunteer", "admin")` restricts unauthorized role access.
   - Registration endpoint explicitly denies public registration for the `admin` role.
3. **Payload Sanitization & Concurrency**:
   - `EmergencyRequest.findOneAndUpdate({ _id: id, status: "Verified" }, ...)` prevents race conditions where two volunteers click accept simultaneously.

---

## 🚨 Error Handling Strategy

- **Express 404 Middleware**: `notFound` catches unregistered route requests and outputs structured JSON.
- **Centralized Error Handler**: `errorHandler` normalizes server errors, returning user-friendly messages and hiding stack traces in production environments.
- **Frontend Error Boundaries & Banners**: Network and validation errors are rendered in responsive dismissible alert banners with actionable guidance.

---

## 📂 Repository & Git Guidelines

- Keep sensitive environment variables in `.env` (never commit `.env`).
- Maintain code quality with the pre-configured linter:
  ```bash
  npm run lint
  ```
- Build production assets:
  ```bash
  npm run build
  ```

---

## 📝 License & Academic Acknowledgement
Developed as part of the **Second Year Track** Software Engineering curriculum.  
© 2026 ResQHub Team. All rights reserved.
