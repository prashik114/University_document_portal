# University Repository & Accreditation Portal

Enterprise-grade, full-stack multi-platform repository and accreditation system for higher education institutions, compliant with NAAC Cycle 3 SSR standards.

---

## 🌟 Tech Stack

- **Backend**: Spring Boot 3.3.4 (Java 17), Spring Data JPA, Hibernate, Maven, REST API
- **Database**: PostgreSQL (Hosted on Neon DB: `jdbc:postgresql://ep-steep-voice-b48wnr2e-pooler.c-6.us-east-2.aws.neon.tech/neondb?sslmode=require`)
- **Web Frontend (Existing & Zero-Glitch)**: Production HTML5, CSS3, JavaScript (Pixel-perfect replica, zero alterations to UI, integrated with REST backend)
- **Web Frontend (React JS)**: React 18 + Vite in `react-frontend/`
- **Mobile Application**: React Native + Expo in `mobile-app/`

---

## ⚡ Launch Everything at Once (Recommended)

Simply double-click:
👉 **[`launch-all.bat`](./launch-all.bat)**

This single script automatically:
1. **Starts the Spring Boot Backend** connected to your Neon PostgreSQL database on `http://localhost:8080`.
2. **Opens the Main Portal** in your default web browser (`index.html` linked live with the backend).
3. **Starts the React JS Frontend** on `http://localhost:3000`.

---

## 🚀 Quick Start Guide (Individual Services)

### 1. Run the Spring Boot Backend (PostgreSQL Neon DB)
You can start the backend in either of two easy ways:

#### Option A: One-Click Batch Script
Double-click `start-backend.bat` in the root directory.

#### Option B: Terminal Command
```powershell
$env:JAVA_HOME = "C:\Program Files\Java\jdk-17"
cd "d:\PROGRAMS\University document portal\backend"
.\mvnw.cmd spring-boot:run
```
The backend starts at `http://localhost:8080`.
- Health/State API: `http://localhost:8080/api/state`
- Documents API: `http://localhost:8080/api/documents`
- File Uploads: `http://localhost:8080/api/files/{fileName}`
- Pre-seeded with all 14 official records, 12 users, audit trails, and KPIs in PostgreSQL.

---

### 2. Run the Main Portal Frontend (Same UI)
- Open [`index.html`](./index.html) in any browser (Chrome, Edge, Safari, Firefox).
- Automatically connects to the Spring Boot REST backend (`http://localhost:8080/api`).
- All document uploads, stage verifications, return comments, and SSR cryptographic locks are saved directly to Neon PostgreSQL.
- Includes seamless offline fallback to ensure zero downtime or glitches.

---

### 3. Run the React.js Web Frontend
Located in `react-frontend/`:
```bash
cd react-frontend
npm install
npm run dev
```
Access at `http://localhost:3000`.

---

### 4. Run the React Native Mobile App
Located in `mobile-app/`:
```bash
cd mobile-app
npm install
npx expo start
```
Run on Android Emulator, iOS Simulator, or the Expo Go mobile app.

---

## 🏛️ System Features & Persona Workflows

1. **Faculty Persona (`Dr. Rajesh Sharma`)**:
   - Create personal & student capacity development / award records.
   - Attach PDF, DOCX, XLSX evidence files (uploaded to backend storage).
   - Track verification stages and resubmit returned corrections.

2. **Dean / HOD Verifier (`Prof. A. K. Verma`)**:
   - Department Verification Desk for CSE submissions.
   - Approve & forward to IQAC with automated stage advance.
   - Return submissions with mandatory reason requirement.
   - Batch forward all pending submissions.

3. **IQAC Accreditation Reviewer (`Dr. Sunita Rao`)**:
   - Verify records against NAAC Criteria (1.3.2, 3.4.2, 5.3.1, 6.3.3).
   - Apply permanent cryptographic SSR lock (`Approved & Locked`).
   - Batch lock verified dossiers for SSR submission.

4. **Repository Administrator (`Er. Vikram Mehta`)**:
   - Manage user directory and access roles.
   - Post-approval formal revision request governance (unlock locked files).
   - System storage and academic cycle configuration.

5. **NAAC Inspector (`Dr. M. S. Swaminathan`)**:
   - Read-only accredited dossier view with tamper-evident digital seal.

---

## 📁 Repository Directory Structure

```
├── index.html                   # Main Production Portal UI (100% preserved visual design)
├── css/
│   └── styles.css               # Exact pixel-perfect styling
├── js/
│   ├── data.js                  # Data model, personas, and PortalAPI REST client
│   └── app.js                   # Application controller with Spring Boot backend sync
├── start-backend.bat            # One-click Spring Boot server launcher
├── start-react.bat              # One-click React.js launcher
├── backend/                     # Spring Boot 3 + PostgreSQL project
│   ├── src/main/java/com/university/portal/
│   │   ├── PortalBackendApplication.java
│   │   ├── config/WebConfig.java (CORS & static handlers)
│   │   ├── entity/ (User, Document, AuditLog, RecentActivity, Revision, Settings)
│   │   ├── repository/ (Spring Data JPA Repositories)
│   │   ├── service/ (DocumentService, DataSeederService)
│   │   └── controller/ (DocumentController, AuthController, StateController, FileController...)
│   ├── src/main/resources/application.properties (Neon PostgreSQL Connection)
│   ├── pom.xml
│   └── mvnw.cmd
├── react-frontend/              # React.js application
│   ├── package.json
│   ├── vite.config.js
│   ├── src/App.jsx
│   └── src/services/api.js
└── mobile-app/                  # React Native / Expo application
    ├── package.json
    ├── App.js
    └── src/services/api.js
```
