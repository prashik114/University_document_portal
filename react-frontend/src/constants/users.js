/**
 * Canonical list of institutional users.
 * This is the single source of truth for the frontend.
 * Passwords are NOT stored here — authentication is delegated to the backend.
 * The OTP default is shown in the UI hint only.
 */
export const USERS_DIRECTORY = [
  { id: "USR-001", name: "Dr. Rajesh Sharma",      email: "rajesh.sharma@university.edu",       role: "Faculty",   designation: "Associate Professor",             department: "Computer Science & Engineering",        employeeId: "FAC-CSE-2048",  avatar: "F" },
  { id: "USR-002", name: "Prof. A. K. Verma",       email: "ak.verma@university.edu",            role: "DeanHOD",   designation: "Head of Department & Professor",  department: "Computer Science & Engineering",        employeeId: "HOD-CSE-1002",  avatar: "D" },
  { id: "USR-003", name: "Dr. Sunita Rao",          email: "sunita.rao@university.edu",          role: "IQAC",      designation: "Director & Central IQAC Coordinator", department: "Internal Quality Assurance Cell",    employeeId: "IQAC-DIR-004",  avatar: "I" },
  { id: "USR-004", name: "Er. Vikram Mehta",        email: "admin@university.edu",               role: "Admin",     designation: "Chief Systems Administrator",      department: "Central IT & Institutional Governance", employeeId: "ADM-SYS-001",   avatar: "A" },
  { id: "USR-005", name: "Dr. M. S. Swaminathan",   email: "naac.evaluator@naac.gov.in",         role: "Inspector", designation: "NAAC Peer Team Lead Assessor",      department: "External Peer Review Committee",        employeeId: "EXT-NAAC-881",  avatar: "E" },
  { id: "USR-006", name: "Dr. Ananya Sen",          email: "ananya.sen@university.edu",          role: "Faculty",   designation: "Assistant Professor",              department: "Computer Science & Engineering",        employeeId: "FAC-CSE-2089",  avatar: "A" },
  { id: "USR-007", name: "Prof. R. K. Mukherjee",   email: "rk.mukherjee@university.edu",        role: "DeanHOD",   designation: "Dean & Professor",                 department: "Electronics & Communication Engineering", employeeId: "HOD-ECE-1005", avatar: "R" },
  { id: "USR-008", name: "Dr. Shalini Verma",       email: "shalini.verma@university.edu",       role: "Faculty",   designation: "Associate Professor",              department: "Management Studies",                    employeeId: "FAC-MGMT-1402", avatar: "S" },
  { id: "USR-009", name: "Prof. Vivek Chawla",      email: "v.chawla@university.edu",            role: "DeanHOD",   designation: "Head of Department",               department: "Mechanical Engineering",                employeeId: "HOD-MECH-1008", avatar: "V" },
  { id: "USR-010", name: "Dr. Kavita Deshmukh",     email: "kavita.d@university.edu",            role: "Faculty",   designation: "Assistant Professor",              department: "Biotechnology & Bioinformatics",         employeeId: "FAC-BIO-1120",  avatar: "K" },
  { id: "USR-011", name: "Aarav Patel",             email: "aarav.p@student.university.edu",     role: "Student",   designation: "Student Representative (B.Tech)", department: "Computer Science & Engineering",        employeeId: "STU-CSE-8842",  avatar: "S" },
  { id: "USR-012", name: "Priya Nair",              email: "priya.n@student.university.edu",     role: "Student",   designation: "Research Scholar (Ph.D)",          department: "Computer Science & Engineering",        employeeId: "STU-CSE-8910",  avatar: "P" },
];

export const NAAC_CRITERIA = [
  { code: "CR-1", name: "Criteria 1: Curricular Aspects",                    focus: "Syllabus enrichment, BOS minutes, academic flexibility",    target: "Metric 1.1–1.4" },
  { code: "CR-2", name: "Criteria 2: Teaching-Learning & Evaluation",         focus: "Faculty awards, mentor-mentee records, pass percentage",    target: "Metric 2.1–2.6" },
  { code: "CR-3", name: "Criteria 3: Research, Innovations & Extension",      focus: "Sponsored grants, Scopus publications, patent filings",     target: "Metric 3.1–3.7" },
  { code: "CR-4", name: "Criteria 4: Infrastructure & Learning Resources",    focus: "Lab stock audit, library automated accession, ICT logs",    target: "Metric 4.1–4.4" },
  { code: "CR-5", name: "Criteria 5: Student Support & Progression",          focus: "Placements, scholarships, competitive exam clearing",       target: "Metric 5.1–5.4" },
  { code: "CR-6", name: "Criteria 6: Governance, Leadership & Management",    focus: "IQAC review minutes, e-governance ERP, FDP support",       target: "Metric 6.1–6.5" },
  { code: "CR-7", name: "Criteria 7: Institutional Values & Best Practices",  focus: "Green audit, energy certifications, gender equity events",  target: "Metric 7.1–7.3" },
];

export const ROLE_COLORS = {
  Faculty:   "#2563eb",
  Student:   "#0284c7",
  DeanHOD:  "#059669",
  IQAC:      "#7c3aed",
  Admin:     "#4f46e5",
  Inspector: "#d97706",
};

export const ROLE_CLEARANCE = {
  Faculty:   "Authorised for Self & Student Submissions",
  Student:   "Authorised for Personal Co-Curricular & Student Achievements",
  DeanHOD:  "Authorised for Departmental Verification & Routing",
  IQAC:      "Authorised for Central NAAC SSR Certification & Locking",
  Admin:     "Institutional Master Governance & Security Administration",
  Inspector: "Official External Peer Review Clearance (Read-Only)",
};
