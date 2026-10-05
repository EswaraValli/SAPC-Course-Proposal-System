import os
import json
import logging
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.mime.application import MIMEApplication
from datetime import datetime, timezone
from pathlib import Path
from ..config import Config

logger = logging.getLogger(__name__)

class EmailService:
    @staticmethod
    def send_proposal_submission_notification(proposal, attach_pdf=True):
        """
        Sends an automated notification email to the faculty member whose email
        was provided in the proposal.
        
        Returns: (success: bool, error_message: str or None)
        """
        recipient_email = proposal.faculty_email
        if not recipient_email or "@" not in recipient_email:
            return False, f"Invalid recipient email address: '{recipient_email}'"

        course_title = proposal.course_title
        proposer_name = proposal.proposer_name
        proposal_id = proposal.proposal_id
        
        sub_date = proposal.submission_date
        if isinstance(sub_date, datetime):
            sub_date_str = sub_date.strftime('%d %B %Y, %I:%M %p UTC')
        elif sub_date:
            sub_date_str = str(sub_date)[:19].replace('T', ' ')
        else:
            sub_date_str = datetime.now(timezone.utc).strftime('%d %B %Y, %I:%M %p UTC')

        subject = f"SAPC Course Proposal Submitted — {course_title}"
        
        # Exact requested notification format from prompt
        body_text = f"""Dear {proposer_name},

A course proposal has been successfully submitted through the SAPC Course Proposal System.

Course:
{course_title}

Proposal ID:
{proposal_id}

Submitted By:
{proposer_name}

Submission Date:
{sub_date_str}

The submitted proposal is available in the Academic Office dashboard.

Regards,
SAPC Course Proposal System
IIT Gandhinagar
"""

        body_html = f"""
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body {{ font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #2d3748; margin: 0; padding: 20px; background-color: #f7fafc; }}
    .container {{ max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 8px; border: 1px solid #e2e8f0; overflow: hidden; }}
    .header {{ background-color: #002147; color: #ffffff; padding: 24px; text-align: center; }}
    .header h2 {{ margin: 0; font-size: 18px; text-transform: uppercase; letter-spacing: 0.5px; }}
    .header p {{ margin: 4px 0 0; font-size: 12px; color: #cbd5e0; }}
    .content {{ padding: 28px; }}
    .info-card {{ background: #f8fafc; border-left: 4px solid #002147; padding: 16px; margin: 18px 0; border-radius: 0 6px 6px 0; }}
    .info-row {{ margin-bottom: 8px; }}
    .info-label {{ font-weight: bold; color: #4a5568; font-size: 13px; }}
    .info-val {{ color: #1a202c; font-size: 14px; margin-top: 2px; }}
    .footer {{ background: #edf2f7; padding: 16px; text-align: center; font-size: 12px; color: #718096; border-top: 1px solid #e2e8f0; }}
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h2>IIT Gandhinagar — Academic Office</h2>
      <p>Senate Academic Programme Committee (SAPC) — Form ACAD-SAPC-01</p>
    </div>
    <div class="content">
      <p>Dear <b>{proposer_name}</b>,</p>
      <p>A course proposal has been successfully submitted through the SAPC Course Proposal System.</p>
      
      <div class="info-card">
        <div class="info-row">
          <div class="info-label">Course:</div>
          <div class="info-val"><b>{course_title}</b></div>
        </div>
        <div class="info-row">
          <div class="info-label">Proposal ID:</div>
          <div class="info-val"><code>{proposal_id}</code></div>
        </div>
        <div class="info-row">
          <div class="info-label">Submitted By:</div>
          <div class="info-val">{proposer_name}</div>
        </div>
        <div class="info-row">
          <div class="info-label">Submission Date:</div>
          <div class="info-val">{sub_date_str}</div>
        </div>
      </div>
      
      <p>The submitted proposal is available in the Academic Office dashboard.</p>
      <p>Regards,<br/>
      <strong>SAPC Course Proposal System</strong><br/>
      Indian Institute of Technology Gandhinagar</p>
    </div>
    <div class="footer">
      Official routing: ar.ug@iitgn.ac.in | doaa@iitgn.ac.in<br/>
      This is an automated notification from the SAPC Course Proposal System.
    </div>
  </div>
</body>
</html>
"""

        # Dispatch based on backend setting
        if Config.MAIL_BACKEND == 'smtp' and Config.MAIL_HOST and Config.MAIL_USERNAME:
            return EmailService._send_smtp(
                recipient_email=recipient_email,
                subject=subject,
                body_text=body_text,
                body_html=body_html,
                pdf_path=proposal.pdf_path if attach_pdf else None,
                proposal_id=proposal_id
            )
        else:
            # Local / Simulated outbox logger
            return EmailService._record_local_outbox(
                recipient_email=recipient_email,
                subject=subject,
                body_text=body_text,
                proposal_id=proposal_id,
                course_title=course_title
            )

    @staticmethod
    def _send_smtp(recipient_email, subject, body_text, body_html, pdf_path=None, proposal_id=None):
        try:
            msg = MIMEMultipart('alternative')
            msg['Subject'] = subject
            msg['From'] = f"{Config.MAIL_SENDER_NAME} <{Config.MAIL_FROM}>"
            msg['To'] = recipient_email
            
            # Official CC list + Configured Notification Recipients
            cc_list = []
            if Config.SAPC_UG_OFFICE_EMAIL:
                cc_list.append(Config.SAPC_UG_OFFICE_EMAIL)
            if Config.SAPC_DOAA_EMAIL:
                cc_list.append(Config.SAPC_DOAA_EMAIL)
            if Config.NOTIFICATION_RECIPIENTS:
                for extra in Config.NOTIFICATION_RECIPIENTS.split(','):
                    e = extra.strip()
                    if e and '@' in e and e not in cc_list:
                        cc_list.append(e)
            if cc_list:
                msg['Cc'] = ", ".join(cc_list)

            part1 = MIMEText(body_text, 'plain')
            part2 = MIMEText(body_html, 'html')
            msg.attach(part1)
            msg.attach(part2)

            # Optional attachment
            if pdf_path and Path(pdf_path).exists():
                with open(pdf_path, 'rb') as f:
                    attach = MIMEApplication(f.read(), _subtype="pdf")
                    attach.add_header('Content-Disposition', 'attachment', filename=f"{proposal_id}.pdf")
                    msg.attach(attach)

            all_recipients = [recipient_email] + cc_list

            if Config.MAIL_USE_SSL:
                server = smtplib.SMTP_SSL(Config.MAIL_HOST, Config.MAIL_PORT, timeout=10)
            else:
                server = smtplib.SMTP(Config.MAIL_HOST, Config.MAIL_PORT, timeout=10)
                if Config.MAIL_USE_TLS:
                    server.starttls()

            if Config.MAIL_USERNAME and Config.MAIL_PASSWORD:
                server.login(Config.MAIL_USERNAME, Config.MAIL_PASSWORD)

            server.sendmail(Config.MAIL_FROM, all_recipients, msg.as_string())
            server.quit()
            logger.info(f"Notification email sent successfully via SMTP to {recipient_email} for proposal {proposal_id}")
            return True, None
        except Exception as e:
            err = f"SMTP Transmission failed: {str(e)}"
            logger.error(err)
            return False, err

    @staticmethod
    def _record_local_outbox(recipient_email, subject, body_text, proposal_id, course_title):
        """
        Local development & test outbox recorder.
        Persists email to outbox_emails.json and logs to stdout.
        """
        try:
            cc_list = []
            if Config.SAPC_UG_OFFICE_EMAIL:
                cc_list.append(Config.SAPC_UG_OFFICE_EMAIL)
            if Config.SAPC_DOAA_EMAIL:
                cc_list.append(Config.SAPC_DOAA_EMAIL)
            if Config.NOTIFICATION_RECIPIENTS:
                for extra in Config.NOTIFICATION_RECIPIENTS.split(','):
                    e = extra.strip()
                    if e and '@' in e and e not in cc_list:
                        cc_list.append(e)

            log_entry = {
                'timestamp': datetime.now(timezone.utc).isoformat(),
                'proposal_id': proposal_id,
                'recipient': recipient_email,
                'cc': cc_list,
                'subject': subject,
                'body': body_text,
                'status': 'Simulated Delivered (Local Mailbox)'
            }
            
            # Read existing
            log_file = Path(Config.MAIL_LOG_FILE)
            records = []
            if log_file.exists():
                try:
                    with open(log_file, 'r', encoding='utf-8') as f:
                        records = json.load(f)
                except Exception:
                    records = []
                    
            records.insert(0, log_entry)
            # Keep last 100 entries
            records = records[:100]
            
            with open(log_file, 'w', encoding='utf-8') as f:
                json.dump(records, f, indent=2)

            logger.info(f"[LOCAL OUTBOX] Proposal {proposal_id} notification logged for {recipient_email}")
            return True, None
        except Exception as e:
            err = f"Failed to record local email outbox: {str(e)}"
            logger.error(err)
            return False, err

    @staticmethod
    def get_outbox_logs():
        """Returns the list of dispatched emails from local mailbox"""
        log_file = Path(Config.MAIL_LOG_FILE)
        if log_file.exists():
            try:
                with open(log_file, 'r', encoding='utf-8') as f:
                    return json.load(f)
            except Exception:
                return []
        return []
