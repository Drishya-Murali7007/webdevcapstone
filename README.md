# University Campus Management System

Backend capstone implementation using **Node.js, Express.js, MongoDB, Mongoose, bcrypt, JWT and Socket.IO**.

> This is a backend-first project. The API is designed for testing with Postman. It follows the supplied assignment's requirements: MVC/layered separation, CRUD, JWT access/refresh tokens, RBAC, at least two aggregation pipelines, indexes, EventEmitter, Socket.IO, validation, error handling and seed data.

## 1. Requirements

- Node.js 18.17+
- npm
- MongoDB running locally or a MongoDB Atlas connection string
- Postman (or another REST client)

## 2. Setup

```bash
npm install
```

Copy `.env.example` to `.env` and update the values:

```bash
# Windows PowerShell
Copy-Item .env.example .env

# macOS / Linux
cp .env.example .env
```

Set a long, random `JWT_ACCESS_SECRET` and a different `JWT_REFRESH_SECRET`. Do not commit `.env`.

## 3. Run

Start MongoDB, then:

```bash
npm run seed
npm run dev
```

Production-style start:

```bash
npm start
```

API base URL: `http://localhost:5000/api`

Health check: `GET http://localhost:5000/api/health`

## 4. Demo accounts

All seeded accounts use `Password123!` (change these credentials before any real deployment).

| Role | Email |
|---|---|
| Admin | admin@campus.test |
| Faculty | faculty@campus.test |
| Student | student@campus.test |

Log in using `POST /api/auth/login` and copy the `accessToken`. For protected endpoints, use:
`Authorization: Bearer <accessToken>`.

## 5. Main API routes

### Authentication and profile

| Method | Endpoint | Access |
|---|---|---|
| POST | `/auth/register` | Public; creates STUDENT only |
| POST | `/admin/users` | ADMIN; creates chosen role |
| POST | `/auth/login` | Public |
| POST | `/auth/refresh` | Refresh token in request body |
| POST | `/auth/logout` | Authenticated |
| GET | `/users/me` | Authenticated |
| PATCH | `/users/me` | Authenticated; name only |

### Academic CRUD

| Method | Endpoint | Access |
|---|---|---|
| GET | `/students` | Authenticated |
| POST/PATCH/DELETE | `/students` and `/students/:id` | ADMIN |
| GET | `/faculty` | Authenticated |
| POST/PATCH/DELETE | `/faculty` and `/faculty/:id` | ADMIN |
| GET | `/courses` | Authenticated |
| POST/PATCH/DELETE | `/courses` and `/courses/:id` | ADMIN |
| GET | `/sections` | Authenticated |
| POST/PATCH/DELETE | `/sections` and `/sections/:id` | ADMIN |
| POST | `/sections/:id/enrollments` | ADMIN |
| GET | `/students/me/courses` | STUDENT |

List endpoints support `page` and `limit`. Courses support `department`; sections support `course`.

### Attendance

| Method | Endpoint | Access |
|---|---|---|
| POST | `/attendance` | Assigned FACULTY |
| PATCH | `/attendance/:id` | ADMIN or assigned FACULTY; correction reason required |
| GET | `/attendance/me` | STUDENT |
| GET | `/attendance/summary/me` | STUDENT |
| GET | `/sections/:sectionId/attendance` | ADMIN or assigned FACULTY |

Example mark-attendance body:

```json
{
  "sectionId": "SECTION_OBJECT_ID",
  "sessionDate": "2026-11-23",
  "sessionCode": "LECTURE-1",
  "records": [
    { "studentId": "STUDENT_PROFILE_OBJECT_ID", "status": "PRESENT" },
    { "studentId": "ANOTHER_STUDENT_PROFILE_ID", "status": "ABSENT" }
  ]
}
```

Attendance is unique per student + section + date + sessionCode. `PRESENT` and `LATE` count as attended in the supplied summary calculation.

### Announcements and reports

| Method | Endpoint | Access |
|---|---|---|
| POST | `/announcements` | ADMIN or FACULTY |
| GET | `/announcements` | Authenticated |
| GET | `/reports/enrollments` | ADMIN |
| GET | `/reports/low-attendance?threshold=75` | ADMIN |

Announcement body examples:

```json
{ "title": "Campus notice", "message": "Classes begin at 9 AM.", "audienceType": "UNIVERSITY" }
```

```json
{ "title": "Section update", "message": "Bring your lab files.", "audienceType": "SECTION", "audienceId": "SECTION_OBJECT_ID" }
```

## 6. Assignment requirements implemented

- **Node.js / Express / REST:** Express app and resource routes.
- **MVC/layered architecture:** routes, controllers, models, middleware, services/events and utilities separated.
- **MongoDB / Mongoose:** User, Student, Faculty, Course, Section, Enrollment, Attendance, Announcement and RefreshToken models.
- **CRUD:** student, faculty, course and section resources.
- **Security:** bcrypt password hashing, JWT access tokens, refresh-token rotation/revocation, protected routes and role checks.
- **Validation / errors / logging:** express-validator, Mongoose validation, centralized error responses and Morgan request logging.
- **Aggregation pipeline 1:** student subject-wise attendance summary.
- **Aggregation pipeline 2:** section-wise enrolment report. A further low-attendance aggregation is included.
- **Indexes:** unique user email; unique enrolment student/section; unique attendance student/section/session; section/date attendance index.
- **EventEmitter:** `attendance:marked` and `announcement:created` internal events.
- **Socket.IO:** authenticated socket connections; role/user rooms; live `announcement:new` and `attendance:updated` events.
- **Seed data:** `npm run seed`.

## 7. Socket.IO client example

Connect using a valid access token:

```js
import { io } from "socket.io-client";

const socket = io("http://localhost:5000", {
  auth: { token: accessToken }
});

socket.on("socket:ready", console.log);
socket.on("announcement:new", console.log);
socket.on("attendance:updated", console.log);
```

The current implementation only joins a user's own room and their role room. Do not add arbitrary section/course room joins without server-side membership checks. REST endpoints remain the source for historical data.

## 8. Postman test sequence

1. `POST /api/auth/login` as admin.
2. Use admin token to create a faculty user (`POST /api/admin/users`, role `FACULTY`).
3. Create a faculty profile using `POST /api/faculty`.
4. Create a student user/profile, a course and a section.
5. Enrol the student using `POST /api/sections/:id/enrollments`.
6. Log in as assigned faculty and mark attendance.
7. Log in as student and call `/api/attendance/summary/me`.
8. As admin, call `/api/reports/enrollments` and `/api/reports/low-attendance`.
9. Test a protected route without a token (401) and an admin route as student (403).
10. Try duplicate enrolment or duplicate attendance to verify conflict handling (409).

A Postman collection is included in `postman/Campus-Management.postman_collection.json`. Set collection variables `baseUrl`, `accessToken`, `sectionId`, `studentProfileId` and `attendanceId` as needed.

## 9. Important implementation notes / known scope

- The sample app creates student accounts publicly through `/auth/register`; elevated roles can only be created by an authenticated admin through `/admin/users`.
- Student and faculty announcement feeds filter university, section and course announcements using their database relationships.
- Faculty announcements are checked against faculty assignments. Admin can publish to all supported audiences.
- Attendance uses `sessionCode` so multiple class sessions on the same date can be recorded separately.
- For production use, add automated tests, audit-history persistence for attendance corrections, stricter rate limits, refresh-token device/session management, database backup policies and a fully membership-filtered announcement feed.
- Seed script clears the project's collections before inserting demo records. Do not run it against a database containing data you need to keep.

## 10. Viva execution flow

Be prepared to explain this request path:

`Route → validation/authentication middleware → controller → Mongoose model → MongoDB → JSON response`

Also be ready to explain why passwords are hashed, why refresh tokens are rotated/revoked, how role checks are enforced, what the aggregation pipelines calculate, why indexes are used, and the difference between EventEmitter (internal process event) and Socket.IO (network real-time event delivery).
