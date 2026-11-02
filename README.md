# University Document Portal

**NAAC Cycle 3 – Institutional Accreditation Evidence Repository**

A multi-tier web application for managing the complete lifecycle of NAAC Self-Study Report (SSR) evidence — from faculty submission through departmental verification, IQAC certification, and final cryptographic locking.

---

## Architecture

```
┌────────────────────────────────────────────────────────────┐
│    Spring Boot 3.3.4 REST API  (port 8080)                 │
│    H2 file DB (dev)  ←→  PostgreSQL/Neon (production)      │
└───────────────────┬────────────────────────────────────────┘
                    │  /api/*
       ┌────────────┼─────────────┐
       ▼            ▼             ▼
  Vanilla JS     React.js      React Native
  (index.html)  (Vite / :3000) (Expo mobile)
```

---

## Project Structure

```
university-document-portal/
├── backend/                        Spring Boot backend
│   └── src/main/java/com/university/portal/
│       ├── config/                 WebConfig (CORS, file serving)
│       ├── controller/             REST controllers
│       ├── dto/                    API data transfer objects
│       ├── entity/                 JPA entities
│       ├── repository/             Spring Data repositories
│       ├── service/                Business logic
│       └── util/                   IdGenerator, DocumentMapper
│
├── react-frontend/                 Vite + React 18 frontend
│   └── src/
│       ├── components/             LoginScreen, UploadModal, modals, etc.
│       ├── constants/              User directory, NAAC criteria
│       ├── hooks/                  usePortalData, useToast
│       ├── services/               api.js (REST client)
│       └── App.jsx                 Root component
│
├── mobile-app/                     Expo / React Native mobile client
│   ├── App.js                      Root component (login + document list)
│   └── src/services/api.js         Mobile API client
│
├── js/                             Vanilla JS frontend (legacy)
├── css/                            Vanilla JS styles (legacy)
├── index.html                      Vanilla JS entry point
└── README.md
```

---

## Running the Project

### Prerequisites
- Java 17+
- Node.js 18+

### 1. Start the backend

```powershell
cd backend
.\mvnw.cmd spring-boot:run
```

Backend runs on `http://localhost:8080`.

### 2. Start the React frontend

```powershell
cd react-frontend
npm install
npm run dev
```

Frontend runs on `http://localhost:3000` and proxies `/api` to the backend.

### 3. Start the mobile app (optional)

```powershell
cd mobile-app
npm install
npx expo start
```

---

## User Accounts (Demo)

All accounts use:
- **Password:** `Password@123`
- **OTP:** `1234`

| Role      | Email                                 | Access Level                       |
|-----------|---------------------------------------|------------------------------------|
| Faculty   | rajesh.sharma@university.edu          | Submit documents, track status     |
| Faculty   | ananya.sen@university.edu             | Submit documents, track status     |
| DeanHOD   | ak.verma@university.edu               | Verify & forward to IQAC           |
| DeanHOD   | rk.mukherjee@university.edu           | Verify & forward to IQAC           |
| IQAC      | sunita.rao@university.edu             | Final approval & SSR lock          |
| Admin     | admin@university.edu                  | Full system access                 |
| Inspector | naac.evaluator@naac.gov.in            | Read-only NAAC review              |
| Student   | aarav.p@student.university.edu        | Submit achievements                |

---

## Document Workflow

```
Faculty / Student submits
       ↓
  Draft  ──→  Under Verification (Dean/HOD stage)
                      ↓  Dean approves
               Under Verification (IQAC stage)
                      ↓  IQAC approves
               Approved + Locked (Finalized for SSR)

  Any stage  ←──  Returned  ←──  Return action (Dean or IQAC)
```

Post-approval revision:
1. Faculty or Dean raises a revision request
2. Admin authorises
3. Document unlocks back to "Returned / Faculty" stage

---

## API Reference

| Method | Endpoint                          | Description                    |
|--------|-----------------------------------|--------------------------------|
| GET    | /api/health                       | System health check            |
| POST   | /api/auth/login                   | Authenticate user              |
| GET    | /api/state                        | Full application state         |
| GET    | /api/documents                    | List documents (with filters)  |
| POST   | /api/documents                    | Submit new document            |
| PUT    | /api/documents/{id}               | Update document                |
| DELETE | /api/documents/{id}               | Delete document                |
| POST   | /api/documents/{id}/verify        | Advance workflow stage         |
| POST   | /api/documents/{id}/return        | Return for correction          |
| POST   | /api/documents/{id}/lock          | IQAC SSR lock                  |
| POST   | /api/documents/batch-forward      | Batch forward Dean queue       |
| POST   | /api/documents/batch-lock         | Batch lock IQAC queue          |
| POST   | /api/files/upload                 | Upload evidence file           |
| GET    | /api/files/{fileName}             | Download / preview file        |
| GET    | /api/audit-logs                   | All audit entries              |
| GET    | /api/revisions                    | Revision requests              |
| POST   | /api/revisions/{id}/authorize     | Admin authorise revision       |

---

## Production Deployment

1. Set `SPRING_DATASOURCE_URL` (and credentials) in the environment.
2. Set `PORTAL_CORS_EXTRA_ORIGINS` to your production frontend URL.
3. Run `npm run build` from the project root to build both apps.
4. Deploy the backend JAR; deploy `react-frontend/dist/` to a CDN.
