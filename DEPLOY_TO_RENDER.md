# Deploying SAPC Course Proposal System to Render

This repository is pre-configured for 1-click cloud deployment on **Render** with:
- **Managed PostgreSQL Database**
- **Production Gunicorn WSGI Server**
- **Compiled React SPA Frontend**
- **Automated ACAD-SAPC-01 PDF Generation**
- **IITGN Institutional Email Validation (`@iitgn.ac.in`)**

---

## 1-Click Blueprint Deployment Steps

### 1. Push this repository to GitHub
```bash
git remote add origin https://github.com/<your-github-username>/SAPC-Course-Proposal-System.git
git branch -M main
git push -u origin main
```

### 2. Launch on Render
1. Go to **[dashboard.render.com](https://dashboard.render.com/)**.
2. Click **New +** > **Blueprint**.
3. Select this repository.
4. Render detects `render.yaml` and provisions:
   - Web Service: `sapc-course-proposal-system` (Python / Gunicorn)
   - Database: `sapc-postgres-db` (PostgreSQL)
5. Click **Apply**.

Your service will build and be live at:
`https://sapc-course-proposal-system.onrender.com`

---

## Required Environment Variables on Render

| Key | Example / Default | Note |
| :--- | :--- | :--- |
| `DATABASE_URL` | *(Auto-linked from Render PostgreSQL)* | Managed database connection |
| `SECRET_KEY` | *(Auto-generated)* | Flask session secret |
| `FLASK_ENV` | `production` | Production mode |
| `PDF_STORAGE_DIR` | `./generated_pdfs` | Server PDF storage |
| `ADMIN_USERNAME` | `admin` | Academic Office login |
| `ADMIN_PASSWORD` | `Admin@IITGN2026` | Admin password |
| `ADMIN_EMAIL` | `academic.office@iitgn.ac.in` | Admin contact |
| `MAIL_BACKEND` | `smtp` *(or `local`)* | Email notification mode |
| `MAIL_HOST` | `smtp.gmail.com` | SMTP host |
| `MAIL_PORT` | `587` | SMTP port |
| `MAIL_USE_TLS` | `True` | TLS encryption |
| `MAIL_USERNAME` | `notifications@iitgn.ac.in` | SMTP login account |
| `MAIL_PASSWORD` | `<your-app-password>` | App-specific password |
| `MAIL_FROM` | `sapc-academic@iitgn.ac.in` | Sender address |
| `SAPC_UG_OFFICE_EMAIL` | `ar.ug@iitgn.ac.in` | Official CC recipient |
| `SAPC_DOAA_EMAIL` | `doaa@iitgn.ac.in` | Official CC recipient |
| `NOTIFICATION_RECIPIENTS`| `pi.project@iitgn.ac.in` | Additional notification CCs |
