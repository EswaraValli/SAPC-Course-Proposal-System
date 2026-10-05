import pytest
from app.services.email_service import EmailService
from app.models.proposal import Proposal
from app.models import SessionLocal

def test_email_service_notification_trigger(valid_proposal_payload, monkeypatch):
    from app.config import Config
    monkeypatch.setattr(Config, 'NOTIFICATION_RECIPIENTS', 'pi.project@iitgn.ac.in, hod.cse@iitgn.ac.in')

    p = Proposal(
        proposal_id='SAPC-EMAIL-001',
        course_title='Artificial Intelligence Ethics',
        proposer_name='Dr. Maya Sen',
        faculty_email='maya.sen@iitgn.ac.in',
        course_type='CS',
        course_level='4',
        course_l_t_p_c='3-0-0-3',
        course_duration='4 Quads (Full Semester)',
        expected_frequency='Each Year',
        course_contents='Ethics and AI syllabus content details.',
        texts_and_references='Reference books.',
        learning_outcomes='Outcomes.'
    )
    
    success, error = EmailService.send_proposal_submission_notification(p)
    assert success is True
    assert error is None

    # Check local outbox
    logs = EmailService.get_outbox_logs()
    assert len(logs) > 0
    latest = logs[0]
    assert latest['proposal_id'] == 'SAPC-EMAIL-001'
    assert latest['recipient'] == 'maya.sen@iitgn.ac.in'
    assert 'pi.project@iitgn.ac.in' in latest['cc']
    assert 'hod.cse@iitgn.ac.in' in latest['cc']
    assert 'Artificial Intelligence Ethics' in latest['subject']
    assert 'Dr. Maya Sen' in latest['body']
    assert 'SAPC-EMAIL-001' in latest['body']

def test_email_resilience_on_delivery_failure(client, valid_proposal_payload, monkeypatch):
    """
    Even if email delivery fails, the proposal submission must succeed and not be rolled back.
    The proposal record should record 'email_notification_status' = 'Failed'.
    """
    # Mock EmailService to simulate an external SMTP failure
    monkeypatch.setattr(EmailService, 'send_proposal_submission_notification', lambda proposal, attach_pdf=True: (False, "Simulated SMTP connection timeout"))

    payload = valid_proposal_payload.copy()
    payload['course_title'] = "Resilience Against Email Failure Course"
    
    res = client.post('/api/proposals', json=payload)
    assert res.status_code == 201
    data = res.get_json()
    assert data['success'] is True
    assert 'proposal' in data
    assert data['proposal']['course_title'] == payload['course_title']
    assert data['proposal']['email_notification_status'] == 'Failed'

def test_resend_email_endpoint(client, admin_headers, valid_proposal_payload):
    payload = valid_proposal_payload.copy()
    payload['course_title'] = "Email Retry Test Course"
    res = client.post('/api/proposals', json=payload)
    assert res.status_code == 201
    prop_id = res.get_json()['proposal']['proposal_id']

    # Resend email via admin endpoint
    retry_res = client.post(f'/api/proposals/{prop_id}/resend-email', headers=admin_headers)
    assert retry_res.status_code == 200
    retry_data = retry_res.get_json()
    assert retry_data['success'] is True
    assert retry_data['email_notification_status'] == 'Sent'
