# University Document Portal

**NAAC Cycle 3 – Institutional Accreditation Evidence Repository**

A multi-tier institutional web application for managing the complete lifecycle of NAAC Self-Study Report (SSR) evidence — from faculty/student submission through departmental verification, IQAC certification, and final cryptographic locking.

---

## Architecture

```
┌────────────────────────────────────────────────────────────┐
│    Spring Boot 3.3.4 REST API  (port 8080)                 │
│    H2 file DB (dev)  ←→  PostgreSQL/Neon (production)      │
└───────────────────┬────────────────────────────────────────┘
                    │  /api/* (with strict role & department isolation)
       ┌────────────┼─────────────┐
       ▼            ▼             ▼
  Multi-Page     React.js      React Native
  HTML Portals  (Vite / :3000) (Expo mobile)
  (:8080)
```

---

## Standard Project Structure

```text
university-document-portal/
├── backend/                              # Spring Boot 3 + Java 17 Backend
│   ├── src/main/java/com/university/portal/
│   │   ├── config/                       # WebConfig (CORS, file uploads)
│   │   ├── controller/                   # REST controllers (Auth, Document, User, State, etc.)
│   │   ├── dto/                          # API data transfer objects
│   │   ├── entity/                       # JPA entities (portal_users, documents, etc.)
│   │   ├── repository/                   # Spring Data JPA repositories
│   │   ├── service/                      # Business logic & baseline seeders
│   │   └── util/                         # IdGenerator, DocumentMapper
│   ├── src/main/resources/
│   │   ├── application.properties        # Backend configuration
│   │   └── static/                       # Multi-page standalone HTML portals
│   ├── pom.xml                           # Maven dependencies
│   └── mvnw / mvnw.cmd                   # Maven wrapper
│
├── react-frontend/                       # Vite + React 18 Single Page Application
│   ├── src/
│   │   ├── components/                   # Modals, badges, toast, login screen
│   │   ├── constants/                    # System personas, users, NAAC criteria
│   │   ├── hooks/                        # usePortalData, useToast
│   │   ├── services/                     # api.js (REST client with actor headers)
│   │   ├── App.jsx                       # Main application view
│   │   └── styles.css                    # Professional responsive stylesheet
│   ├── package.json
│   └── vite.config.js
│
├── mobile-app/                           # Expo / React Native mobile client
│   ├── App.js                            # Mobile UI
│   └── src/services/api.js               # Mobile API client
│
├── logins.md                             # Official institutional user directory & credentials
├── start-backend.bat / .ps1              # 1-click backend launcher (port 8080)
├── start-frontend.bat / .ps1             # 1-click frontend launcher (port 3000)
├── .env.example                          # Clean environment variable template
└── README.md                             # Documentation
```

---

## Running the Application

### 1. Launch Backend (Port `8080`)
Double-click `start-backend.bat`, or in PowerShell:
```powershell
.\start-backend.ps1
```
*Backend runs on `http://localhost:8080` and H2 database console is accessible at `http://localhost:8080/h2-console`.*

### 2. Launch Frontend (Port `3000`)
Double-click `start-frontend.bat`, or in PowerShell:
```powershell
.\start-frontend.ps1
```
*Frontend runs on `http://localhost:3000`.*

---

## Institutional Provisioning & Department Isolation Policy

| Role | Provisioning Authority | View & Review Scope |
| :--- | :--- | :--- |
| **Central IT Admin** | Can provision any institutional role across any department. | Full institutional access across all departments. |
| **Dean / HOD** | Can ONLY provision **Faculty** and **Students** within assigned department. | Strictly isolated to assigned department records and members. Cross-department queries return `403 Forbidden`. |
| **IQAC Coordinator** | Cannot provision permanent accounts. | Institutional quality records and authorized departmental submissions. |
| **Faculty** | Cannot provision accounts. | Own submissions and assigned department records. |
| **Student** | Cannot provision accounts. | Own submissions and approved public repository. |
| **Inspector (Auditor)** | Read-only. | Only accredited records included in assigned audit cycle. |

---

## Baseline User Accounts

All institutional accounts use:
- **Default Password:** `Password@123`
- **Default OTP:** `1234`

| Role | Name | Department | Official Email |
| :--- | :--- | :--- | :--- |
| **Admin** | Er. Vikram Mehta | Central IT & Governance | `admin@university.edu` |
| **Dean / HOD** | Prof. A. K. Verma | Computer Science & Engineering | `ak.verma@university.edu` |
| **Faculty** | Dr. Rajesh Sharma | Computer Science & Engineering | `rajesh.sharma@university.edu` |
| **IQAC** | Dr. Sunita Rao | Internal Quality Assurance Cell | `sunita.rao@university.edu` |
| **Student** | Aarav Patel | Computer Science & Engineering | `aarav.p@student.university.edu` |
| **Inspector** | Dr. M. S. Swaminathan | NAAC Peer Review Committee | `naac.evaluator@naac.gov.in` |

*Refer to [`logins.md`](logins.md) for the complete list of 12 baseline users.*

---

## REST API Endpoints

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/health` | System health check and database status |
| `POST` | `/api/auth/login` | Authenticate user via password or OTP |
| `GET` | `/api/state` | Full application state in a single call |
| `POST` | `/api/state/reset` | Admin data wipe (protected by admin token) |
| `GET` | `/api/documents` | List documents (enforces department isolation) |
| `POST` | `/api/documents` | Submit new accreditation evidence |
| `GET` | `/api/documents/{id}` | Direct document fetch (verifies department isolation) |
| `POST` | `/api/documents/{id}/verify` | Forward record to next workflow stage |
| `POST` | `/api/documents/{id}/return` | Return record to submitter for revision |
| `POST` | `/api/documents/{id}/lock` | Central IQAC final certification & SSR lock |
| `POST` | `/api/documents/batch-forward`| Batch forward departmental queue to IQAC |
| `GET` | `/api/users` | List users (Dean/HOD only receives assigned department users) |
| `POST` | `/api/users` | Provision user account (enforces role hierarchy and department scope) |
| `DELETE` | `/api/users/{id}` | Delete user account (Admin only) |
| `POST` | `/api/files/upload` | Upload evidence document (PDF, DOCX, XLSX) |
