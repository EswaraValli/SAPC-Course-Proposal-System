# SAPC Course Proposal System — Phase 1 Production Release
### Course Proposal and Curriculum Platform for the Academic Office
**Indian Institute of Technology Gandhinagar (IITGN)**  
**Course:** CS202 — Project 13 (Group 11)  
**Form Code:** ACAD-SAPC-01 (Senate Academic Programme Committee)

---

## 1. Project Overview

The **SAPC Course Proposal System** is an institutional software platform engineered for the Academic Office at IIT Gandhinagar. It completely digitizes the submission, review, tracking, and archival of proposals for new courses and modifications to existing courses.

This Phase 1 implementation addresses all requirements specified in the authoritative scanned **ACAD-SAPC-01** form and successfully delivers the three critical improvements requested by the Project Instructor (PI) in the Week 1 review:
1. **Configurable Submission Deadline** with strict server-side boundary enforcement.
2. **Structured Database-Backed Submission Dashboard** replacing the card-based view with a searchable, filterable, sortable table connected directly to PostgreSQL.
3. **Automated Faculty Email Notification** upon proposal submission with resilient error logging.
4. **Server-Side PDF Generation & Download** reproducing the official ACAD-SAPC-01 layout.
5. **Excel (.xlsx) and CSV (.csv) Export** from the submission management dashboard.

---

## 2. Technology Stack

- **Frontend**:
  - React.js 18 (Vite build engine)
  - Responsive Component-Based Architecture
  - Institutional IIT Gandhinagar Design System (Navy `#002147`, Gold `#c29b38`, crisp slate tables)
  - Lucide Icons
- **Backend**:
  - Python 3.12 / Flask 3.1 REST API
  - SQLAlchemy 2.0 ORM & Schema Engine
  - ReportLab Platypus Engine (Server-side PDF generation)
  - OpenPyXL (Professional Excel workbook generation)
  - Python smtplib / Email Outbox Logging Service
  - HMAC-SHA256 Token Authentication
- **Database**:
  - PostgreSQL 14+ Relational Database (Primary)
  - Dual-mode automatic SQLite fallback for zero-dependency local evaluation
- **Testing**:
  - Pytest (Backend, Database, Boundary, Email, PDF, and Export testing)
  - Node.js Test Runner (Frontend form validation & options testing)

---

## 3. Project Directory Structure

```
SAPC-Course-Proposal-System/
│
├── frontend/                     # React.js SPA (Vite)
│   ├── src/
│   │   ├── components/
│   │   │   ├── Navbar.jsx               # Header with view switcher and auth pill
│   │   │   ├── CourseProposalForm.jsx   # ACAD-SAPC-01 Digital Proposal Form
│   │   │   ├── AcademicDashboard.jsx    # Structured Database-Backed Table
│   │   │   ├── DeadlineBanner.jsx       # Real-time submission window countdown
│   │   │   ├── DeadlineManagerModal.jsx # Admin deadline configuration modal
│   │   │   ├── ProposalDetailModal.jsx  # Full proposal view & status audit history
│   │   │   ├── AdminLoginModal.jsx      # Admin login with demo auto-fill
│   │   │   └── OutboxModal.jsx          # Email dispatch audit modal
│   │   ├── constants/
│   │   │   └── sapcOptions.js           # Disciplines, levels, and abbreviations
│   │   ├── services/
│   │   │   └── api.js                   # REST API client
│   │   ├── App.jsx                      # Root container & routing
│   │   ├── main.jsx                     # DOM mount
│   │   └── index.css                    # Institutional stylesheet
│   ├── tests/
│   │   └── formValidation.test.js       # Frontend unit test suite
│   ├── index.html
│   ├── package.json
│   └── vite.config.js
│
├── backend/                      # Flask REST API
│   ├── app/
│   │   ├── models/                      # SQLAlchemy Relational Models
│   │   │   ├── proposal.py              # ACAD-SAPC-01 Proposal Model
│   │   │   ├── deadline.py              # Configurable Deadline Model
│   │   │   ├── user.py                  # AdminUser & StatusHistory Models
│   │   │   └── __init__.py              # Database engine & session factory
│   │   ├── routes/                      # REST API Endpoints
│   │   │   ├── proposals.py             # Submission, listing, PDF serving
│   │   │   ├── deadline.py              # Deadline query & management
│   │   │   ├── export.py                # Excel (.xlsx) and CSV export
│   │   │   └── auth.py                  # Login & outbox inspection
│   │   ├── services/
│   │   │   ├── pdf_service.py           # ReportLab ACAD-SAPC-01 PDF Generator
│   │   │   ├── email_service.py         # Notification service (SMTP + Local outbox)
│   │   │   └── export_service.py        # OpenPyXL & CSV export generator
│   │   ├── utils/
│   │   │   ├── validators.py            # Independent server-side validation
│   │   │   └── auth_helper.py           # Token authentication & admin decorator
│   │   ├── config.py                    # Environment and configuration
│   │   └── __init__.py                  # Application factory
│   ├── tests/                           # Pytest Test Suite
│   │   ├── conftest.py                  # Test fixtures & mock payloads
│   │   ├── test_proposals.py            # Proposal submission & listing tests
│   │   ├── test_deadline_boundaries.py  # Comprehensive deadline edge tests
│   │   ├── test_pdf_generation.py       # PDF creation and download tests
│   │   ├── test_email_notification.py   # Email dispatch & resilience tests
│   │   ├── test_exports.py              # Excel & CSV export tests
│   │   └── test_database.py             # Database CRUD & hashing tests
│   ├── requirements.txt
│   └── run.py                           # Backend server entry point
│
├── database/                     # PostgreSQL Database Scripts
│   ├── schema.sql                       # Full DDL (tables, constraints, indexes)
│   ├── seed.sql                         # Demo dataset (labeled DEMO / SAMPLE DATA)
│   └── README.md                        # Database installation & query manual
│
├── generated_pdfs/               # Server-side generated PDF repository
│   └── .gitkeep
│
├── tests/                        # Root-level integration test suite
│   └── test_integration_flow.py        # End-to-end full lifecycle test
│
├── docs/                         # Detailed Technical Documentation
│   ├── architecture.md                  # Three-tier architecture & Mermaid diagrams
│   ├── database.md                      # Schema specification & ER diagram
│   ├── api.md                           # REST API reference manual
│   └── testing.md                       # Test results & QA defect verification
│
├── .env.example                  # Environment variable configuration template
├── .gitignore                    # Git ignore file
└── README.md                     # This documentation file
```

---

## 4. Quick Start: How to Run Locally

### Prerequisites
- **Python**: Version 3.10, 3.11, or 3.12 installed.
- **Node.js**: Version 18+ installed (tested on Node v22.17).
- **PostgreSQL** (optional, recommended for production; system defaults to SQLite if PostgreSQL is not active).

---

### Step 1: Backend Setup and Launch

Open a terminal in the project directory:

```bash
cd backend

# (Optional) Create and activate a Python virtual environment:
# On Windows:
python -m venv venv
.\venv\Scripts\activate
# On Linux/macOS:
# python3 -m venv venv
# source venv/bin/activate

# Install dependencies:
pip install -r requirements.txt

# Run the Flask backend server:
python run.py
```

*The backend starts at `http://localhost:5000`. On first start, it automatically initializes database tables, seeds demonstration course proposals, and pre-renders their initial PDFs in `generated_pdfs/`.*

---

### Step 2: Frontend Setup and Launch

Open a second terminal in the project directory:

```bash
cd frontend

# Install npm dependencies:
npm install

# Start the Vite development server:
npm run dev
```

*Open your browser and navigate to `http://localhost:5173`.*

---

## 5. PostgreSQL Database Setup (Production)

If you wish to run against a dedicated PostgreSQL database instead of the built-in development database:

1. **Create the Database in PostgreSQL**:
   ```sql
   CREATE DATABASE sapc_db;
   CREATE USER sapc_admin WITH ENCRYPTED PASSWORD 'postgres';
   GRANT ALL PRIVILEGES ON DATABASE sapc_db TO sapc_admin;
   ```

2. **Execute Schema and Seed SQL Scripts**:
   ```bash
   cd database
   psql -U postgres -d sapc_db -f schema.sql
   psql -U postgres -d sapc_db -f seed.sql
   ```

3. **Configure Backend Environment**:
   Copy `.env.example` to `.env` in the project root or backend folder and set:
   ```env
   DATABASE_URL=postgresql://sapc_admin:postgres@localhost:5432/sapc_db
   ```

---

## 6. Default Administrative Credentials

The Academic Office dashboard provides administrative privileges (adjusting submission deadlines, changing proposal status, retrying notification emails, and exporting spreadsheets):

- **Username**: `admin`
- **Password**: `Admin@IITGN2026`
- **Role**: `Academic Office`

*(In the web UI, click **Admin Login** in the top navigation bar. An **"Auto-fill demo credentials"** button is provided for convenient evaluation.)*

---

## 7. How to Test Core Features

### 7.1 Testing the Course Proposal Form
1. Click **Course Proposal Form** in the top navigation bar.
2. Fill out the form fields. Notice:
   - Required validation checks (Title, Instructors, Proposer, Valid Email, Course Type, Level, Contents).
   - Dynamic credit calculation from L-T-P-C inputs.
   - Conditional **Existing Course Code** field appearing only when "Yes (Modification)" is selected.
   - Multi-select Minor chips with the complete 26-discipline legend from ACAD-SAPC-01.
3. Click **Submit Course Proposal**.
4. Upon successful submission, a confirmation screen appears showing:
   - Generated Proposal ID (e.g. `SAPC-2026-0005`).
   - Notification email status.
   - Direct buttons to **Download Official PDF** and **View PDF in New Tab**.

---

### 7.2 Testing Server-Side PDF Generation and Download
1. Navigate to the **Academic Office Dashboard**.
2. Locate any proposal row in the structured table.
3. Click the **Download PDF** icon in the "Official PDF" column to save the PDF.
4. Click the **External Link** icon to view the PDF rendered directly in your browser.
5. The generated PDF includes:
   - Official IIT Gandhinagar heading and ACAD-SAPC-01 document code.
   - Structured tabular layout for course metadata and curricular baskets.
   - Word-wrapped course contents and reference lists.
   - Official footer routing instructions (`ar.ug@iitgn.ac.in`, `doaa@iitgn.ac.in`).

---

### 7.3 Testing the Configurable Submission Deadline
1. Log in as Admin using the credentials above.
2. Click **Configure Deadline** in the dashboard toolbar.
3. **Test Open Window**: Ensure the deadline is set in the future. Submit a proposal from the form — the server accepts it.
4. **Test Closed Window**: Change the deadline to a past date/time, or uncheck "Enable Proposal Submissions". Click **Save Configuration**.
5. Observe the red **"Submissions Closed"** banner on the frontend.
6. Try submitting a proposal — the Flask backend intercepts the request and rejects it with `HTTP 403 Forbidden` (`SUBMISSION_CLOSED`).
7. Reset the deadline to a future date to re-enable submissions.

---

### 7.4 Testing the Academic Office Dashboard Table
1. Click **Academic Office Dashboard** in the navigation bar.
2. **Search**: Type a keyword (e.g., `Distributed`, `Sharma`, `EE`, `Ethics`) into the search bar. The table updates in real time.
3. **Filter**: Filter by Status (`Approved`, `Pending`, etc.), Discipline (`CS`, `EE`), Level (`Level 3`, `Level 4`), or Nature (`New Course`, `Modification`).
4. **Sort**: Click any column header (`Proposal ID`, `Course Title`, `Submitted`, `Status`) to sort ascending or descending.
5. **View Details**: Click the **Eye icon** to inspect the full ACAD-SAPC-01 submission details and review history.
6. **Change Status**: As Admin, select a new status from the dropdown (e.g., change `Pending` to `Approved`). The backend persists the change and refreshes the PDF.

---

### 7.5 Testing Excel (.xlsx) and CSV (.csv) Export
1. In the **Academic Office Dashboard**, click **Export Excel** or **Export CSV**.
2. The browser automatically downloads a formatted spreadsheet:
   - **Excel**: Professionally styled `.xlsx` file generated with OpenPyXL, including navy header row, borders, zebra shading, and auto-fitted column widths.
   - **CSV**: Standard comma-separated format compatible with any spreadsheet tool.

---

### 7.6 Testing Automated Email Notifications
- When a proposal is submitted, the system automatically triggers a notification to the email provided in `faculty_email`.
- In development/local mode, notifications are safely recorded in `backend/outbox_emails.json` and logged to stdout.
- To inspect sent emails: Log in as Admin and click **Email Outbox** in the dashboard toolbar to view the exact dispatched message, recipient, subject, and timestamp.
- To enable live SMTP transmission via Gmail, Outlook, or institutional mail, configure `MAIL_BACKEND=smtp`, `MAIL_HOST`, `MAIL_USERNAME`, and `MAIL_PASSWORD` in your `.env` file.

---

## 8. Running Automated Test Suites

### 8.1 Backend & Boundary Tests (Pytest)
```bash
cd backend
python -m pytest -v
```
*(Runs 30 comprehensive tests covering database CRUD, deadline boundaries, PDF generation, email resilience, Excel/CSV exports, and API validation.)*

### 8.2 Frontend Unit Tests (Node.js Test Runner)
```bash
cd frontend
npm test
```
*(Runs 9 tests validating form constraints, email regex, credit calculations, and ACAD-SAPC-01 option arrays.)*

### 8.3 Full End-to-End Integration Test
```bash
# Run from project root
python -m pytest tests/test_integration_flow.py -v
```
*(Exercises the complete lifecycle from submission through PDF rendering, email dispatch, dashboard retrieval, status update, and export.)*

---

## 9. Troubleshooting & Common Questions

1. **Port 5000 is already in use**:
   Set `PORT=5001` in your environment or run `python run.py --port 5001`. In `frontend/vite.config.js`, update the proxy target to match.
2. **PostgreSQL connection fails**:
   The backend automatically falls back to local SQLite (`sapc_course_proposals.db`) so the system remains fully functional without a running PostgreSQL daemon.
3. **Where are generated PDFs stored?**:
   PDF files are stored in `generated_pdfs/` in the project root and are accessible via the `/api/proposals/<id>/pdf` endpoints.

---

## 10. Project Team

**Project Group 11 — CS202, IIT Gandhinagar**
- Killada Eswara Valli (24110165)
- Somireddy Bhavitha (24110350)
- Rishitha Gugulothu (25110123)
- Madas Tanvi Raj (25110181)
- Gurudayal Meena (231101125)
