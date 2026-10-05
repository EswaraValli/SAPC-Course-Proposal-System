import os
from datetime import datetime, timezone, timedelta
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, scoped_session
from .proposal import Base, Proposal
from .deadline import DeadlineSetting
from .user import AdminUser, ProposalStatusHistory

engine = None
_SessionFactory = None

def init_db(app):
    global engine, _SessionFactory
    database_url = app.config['DATABASE_URL']
    
    # Engine configuration
    connect_args = {}
    if database_url.startswith('sqlite'):
        connect_args = {'check_same_thread': False}
        
    engine = create_engine(database_url, connect_args=connect_args)
    _SessionFactory = scoped_session(sessionmaker(autocommit=False, autoflush=False, bind=engine))

    # Create tables
    Base.metadata.create_all(bind=engine)

    # Seed default admin and deadline if not present
    session = _SessionFactory()
    try:
        # Check Admin
        admin_user = session.query(AdminUser).filter_by(username=app.config['ADMIN_USERNAME']).first()
        if not admin_user:
            admin_user = AdminUser(
                username=app.config['ADMIN_USERNAME'],
                role='Academic Office'
            )
            admin_user.set_password(app.config['ADMIN_PASSWORD'])
            session.add(admin_user)

        # Check Deadline
        deadline = session.query(DeadlineSetting).first()
        if not deadline:
            now = datetime.now(timezone.utc)
            deadline = DeadlineSetting(
                submission_start=now - timedelta(days=2),
                submission_deadline=now + timedelta(days=14),
                is_active=True,
                announcement_message='SAPC Course Proposal Submissions for the upcoming Academic Semester are now OPEN. All submissions must be received before the deadline.',
                updated_by='Academic Office Admin'
            )
            session.add(deadline)

        session.commit()
    except Exception as e:
        session.rollback()
        app.logger.error(f"Error seeding initial data: {e}")
    finally:
        session.close()

    return engine, _SessionFactory

def SessionLocal():
    """Returns a new scoped SQLAlchemy session"""
    if _SessionFactory is None:
        raise RuntimeError("Database not initialized. Call init_db(app) first.")
    return _SessionFactory()

def remove_session():
    if _SessionFactory is not None:
        _SessionFactory.remove()
