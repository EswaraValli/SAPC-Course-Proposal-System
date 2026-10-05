import os
from pathlib import Path

# Base directory for backend
BASE_DIR = Path(__file__).resolve().parent.parent
PROJECT_ROOT = BASE_DIR.parent

class Config:
    SECRET_KEY = os.environ.get('SECRET_KEY', 'dev-secret-key-sapc-course-proposal-iitgn-2026')
    
    # Database Configuration
    DATABASE_URL = os.environ.get(
        'DATABASE_URL', 
        f"sqlite:///{BASE_DIR / 'sapc_course_proposals.db'}"
    )
    # Ensure Render/Heroku PostgreSQL URLs use psycopg2 driver explicitly
    if DATABASE_URL.startswith("postgres://"):
        DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql+psycopg2://", 1)
    elif DATABASE_URL.startswith("postgresql://") and not DATABASE_URL.startswith("postgresql+"):
        DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+psycopg2://", 1)
        
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    
    # PDF Storage Configuration
    PDF_STORAGE_DIR = Path(os.environ.get('PDF_STORAGE_DIR', PROJECT_ROOT / 'generated_pdfs')).resolve()
    
    # Admin Credentials
    ADMIN_USERNAME = os.environ.get('ADMIN_USERNAME', 'admin')
    ADMIN_PASSWORD = os.environ.get('ADMIN_PASSWORD', 'Admin@IITGN2026')
    ADMIN_EMAIL = os.environ.get('ADMIN_EMAIL', 'academic.office@iitgn.ac.in')
    
    # Mail / SMTP Configuration
    MAIL_BACKEND = os.environ.get('MAIL_BACKEND', 'local')  # 'smtp' or 'local'
    MAIL_HOST = os.environ.get('MAIL_HOST', 'smtp.gmail.com')
    MAIL_PORT = int(os.environ.get('MAIL_PORT', 587))
    MAIL_USE_TLS = os.environ.get('MAIL_USE_TLS', 'True').lower() in ('true', '1', 't')
    MAIL_USE_SSL = os.environ.get('MAIL_USE_SSL', 'False').lower() in ('true', '1', 't')
    MAIL_USERNAME = os.environ.get('MAIL_USERNAME', '')
    MAIL_PASSWORD = os.environ.get('MAIL_PASSWORD', '')
    MAIL_FROM = os.environ.get('MAIL_FROM', 'sapc-academic@iitgn.ac.in')
    MAIL_SENDER_NAME = os.environ.get('MAIL_SENDER_NAME', 'SAPC Academic Office, IIT Gandhinagar')
    
    # SAPC Institutional CC & Configurable Notification Recipients
    SAPC_UG_OFFICE_EMAIL = os.environ.get('SAPC_UG_OFFICE_EMAIL', 'ar.ug@iitgn.ac.in')
    SAPC_DOAA_EMAIL = os.environ.get('SAPC_DOAA_EMAIL', 'doaa@iitgn.ac.in')
    NOTIFICATION_RECIPIENTS = os.environ.get('NOTIFICATION_RECIPIENTS', '')
    
    # Mailbox log file for development and offline testing
    MAIL_LOG_FILE = BASE_DIR / 'outbox_emails.json'

class TestConfig(Config):
    TESTING = True
    DATABASE_URL = "sqlite:///:memory:"
    MAIL_BACKEND = 'local'
