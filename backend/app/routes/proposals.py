import os
from datetime import datetime, timezone
from pathlib import Path
from flask import Blueprint, request, jsonify, send_file, current_app
from sqlalchemy import or_, desc, asc
from ..models import SessionLocal
from ..models.proposal import Proposal
from ..models.deadline import DeadlineSetting
from ..models.user import ProposalStatusHistory
from ..services.pdf_service import PDFGenerator
from ..services.email_service import EmailService
from ..utils.validators import validate_proposal_payload, generate_next_proposal_id
from ..utils.auth_helper import admin_required

proposals_bp = Blueprint('proposals', __name__, url_prefix='/api/proposals')

@proposals_bp.route('', methods=['POST'])
def submit_proposal():
    """
    Submits a new course proposal or modification of existing course.
    1. Enforces server-side deadline
    2. Enforces server-side payload validation
    3. Handles duplicate detection
    4. Persists record in PostgreSQL/DB
    5. Generates official PDF
    6. Triggers automated faculty email notification (with error resilience)
    """
    session = SessionLocal()
    try:
        # Step 1: Deadline Verification
        now = datetime.now(timezone.utc)
        deadline_setting = session.query(DeadlineSetting).order_by(DeadlineSetting.id.desc()).first()
        if deadline_setting:
            is_open, reason = deadline_setting.is_currently_open(now)
            if not is_open:
                return jsonify({
                    'success': False,
                    'error': 'SUBMISSION_CLOSED',
                    'message': reason,
                    'deadline': deadline_setting.to_dict(now)
                }), 403

        # Step 2: Validate Payload
        data = request.get_json() or {}
        is_valid, validation_errors = validate_proposal_payload(data)
        if not is_valid:
            return jsonify({
                'success': False,
                'error': 'VALIDATION_FAILED',
                'message': 'Proposal form contains errors. Please correct the highlighted fields.',
                'errors': validation_errors
            }), 400

        # Step 3: Duplicate Submission Check
        course_title = data['course_title'].strip()
        proposer_name = data['proposer_name'].strip()
        existing = (
            session.query(Proposal)
            .filter(
                Proposal.course_title.ilike(course_title),
                Proposal.proposer_name.ilike(proposer_name)
            )
            .first()
        )
        if existing:
            return jsonify({
                'success': False,
                'error': 'DUPLICATE_PROPOSAL',
                'message': f"A proposal with course title '{course_title}' by '{proposer_name}' has already been submitted (ID: {existing.proposal_id}). If you need to make changes, please contact the Academic Office."
            }), 409

        # Step 4: Generate unique Proposal ID and Create Record
        proposal_id = generate_next_proposal_id(session, Proposal)
        
        # Parse numeric credits
        l = float(data.get('lecture_hours', 0.0) or 0.0)
        t = float(data.get('tutorial_hours', 0.0) or 0.0)
        p = float(data.get('practical_hours', 0.0) or 0.0)
        c = float(data.get('credits', 0.0) or 0.0)

        proposal = Proposal(
            proposal_id=proposal_id,
            submission_date=now,
            status='Pending',
            course_title=course_title,
            potential_instructors=data['potential_instructors'].strip(),
            proposer_name=proposer_name,
            faculty_email=data['faculty_email'].strip().lower(),
            course_type=data['course_type'].strip(),
            course_type_other=(data.get('course_type_other') or '').strip() if data.get('course_type') == 'Others' else None,
            course_level=str(data['course_level']).strip(),
            course_level_secondary=str(data.get('course_level_secondary', '')).strip() or None,
            course_l_t_p_c=data.get('course_l_t_p_c', f"{l}-{t}-{p}-{c}"),
            lecture_hours=l,
            tutorial_hours=t,
            practical_hours=p,
            credits=c,
            course_duration=data['course_duration'].strip(),
            expected_frequency=data['expected_frequency'].strip(),
            expected_frequency_other=(data.get('expected_frequency_other') or '').strip() if data.get('expected_frequency') == 'Others' else None,
            elective_basket_btech=data.get('elective_basket_btech') or None,
            discipline_elective_btech=data.get('discipline_elective_btech') or None,
            discipline_basket_btech=(data.get('discipline_basket_btech') or '').strip() or None,
            minors=data.get('minors') or None,
            minor_basket_thematic_area=(data.get('minor_basket_thematic_area') or '').strip() or None,
            discipline_elective_msc=data.get('discipline_elective_msc') or None,
            courses_discipline_mtech=data.get('courses_discipline_mtech') or None,
            mtech_sub_specialization=(data.get('mtech_sub_specialization') or '').strip() or None,
            discipline_elective_mdes=data.get('discipline_elective_mdes') or None,
            is_modification=bool(data.get('is_modification', False)),
            existing_course_code=(data.get('existing_course_code') or '').strip() or None,
            prior_knowledge=(data.get('prior_knowledge') or '').strip() or None,
            course_contents=data['course_contents'].strip(),
            texts_and_references=data['texts_and_references'].strip(),
            learning_outcomes=data['learning_outcomes'].strip(),
            overlap_courses=(data.get('overlap_courses') or '').strip() or None,
            other_relevant_info=(data.get('other_relevant_info') or '').strip() or None,
            email_notification_status='Pending'
        )

        session.add(proposal)
        session.flush() # assign primary key

        # Step 5: Server-side PDF Generation
        try:
            pdf_path, pdf_filename = PDFGenerator.generate_proposal_pdf(
                proposal.to_dict(),
                output_dir=current_app.config['PDF_STORAGE_DIR']
            )
            proposal.pdf_path = pdf_path
            proposal.pdf_filename = pdf_filename
        except Exception as pdf_err:
            current_app.logger.error(f"Failed to generate PDF for {proposal_id}: {pdf_err}")
            # Note: Do not abort submission; record warning
            proposal.pdf_path = None
            proposal.pdf_filename = None

        # Step 6: Automated Email Notification (Resilient: failure does not rollback proposal)
        email_sent, email_err = EmailService.send_proposal_submission_notification(proposal)
        if email_sent:
            proposal.email_notification_status = 'Sent'
            proposal.email_error_log = None
        else:
            proposal.email_notification_status = 'Failed'
            proposal.email_error_log = email_err

        # Initial Status History Record
        history = ProposalStatusHistory(
            proposal_id=proposal_id,
            previous_status=None,
            new_status='Pending',
            remarks='Course proposal submitted by proposer.',
            changed_by=proposer_name
        )
        session.add(history)

        session.commit()

        return jsonify({
            'success': True,
            'message': 'Course proposal successfully submitted to SAPC Academic Office.',
            'proposal': proposal.to_dict(),
            'email_notification': {
                'status': proposal.email_notification_status,
                'recipient': proposal.faculty_email,
                'error': proposal.email_error_log
            }
        }), 201

    except Exception as e:
        session.rollback()
        current_app.logger.error(f"Unexpected submission error: {e}")
        return jsonify({
            'success': False,
            'error': 'INTERNAL_SERVER_ERROR',
            'message': f"An unexpected error occurred while processing proposal: {str(e)}"
        }), 500
    finally:
        session.close()

@proposals_bp.route('', methods=['GET'])
def list_proposals():
    """
    Structured database-backed proposal listing for Academic Office dashboard.
    Supports search, filter, sort, and pagination directly against database.
    """
    session = SessionLocal()
    try:
        query = session.query(Proposal)

        # Search Query across multiple fields
        q = request.args.get('q', '').strip()
        if q:
            search_pattern = f"%{q}%"
            query = query.filter(
                or_(
                    Proposal.proposal_id.ilike(search_pattern),
                    Proposal.course_title.ilike(search_pattern),
                    Proposal.proposer_name.ilike(search_pattern),
                    Proposal.faculty_email.ilike(search_pattern),
                    Proposal.existing_course_code.ilike(search_pattern)
                )
            )

        # Filters
        status = request.args.get('status')
        if status and status != 'ALL':
            query = query.filter(Proposal.status == status)

        course_type = request.args.get('course_type')
        if course_type and course_type != 'ALL':
            query = query.filter(Proposal.course_type == course_type)

        course_level = request.args.get('course_level')
        if course_level and course_level != 'ALL':
            query = query.filter(Proposal.course_level == course_level)

        nature = request.args.get('nature')
        if nature == 'NEW':
            query = query.filter(Proposal.is_modification == False)
        elif nature == 'MODIFICATION':
            query = query.filter(Proposal.is_modification == True)

        # Sorting
        sort_by = request.args.get('sort_by', 'submission_date')
        order = request.args.get('order', 'desc').lower()

        sort_col = getattr(Proposal, sort_by, Proposal.submission_date)
        if order == 'asc':
            query = query.order_by(asc(sort_col))
        else:
            query = query.order_by(desc(sort_col))

        # Total count before pagination
        total = query.count()

        # Pagination
        page = max(1, int(request.args.get('page', 1)))
        per_page = max(1, min(100, int(request.args.get('per_page', 20))))
        proposals = query.offset((page - 1) * per_page).limit(per_page).all()

        # Summary statistics for dashboard cards/metrics
        stats = {
            'total': session.query(Proposal).count(),
            'pending': session.query(Proposal).filter(Proposal.status == 'Pending').count(),
            'under_review': session.query(Proposal).filter(Proposal.status == 'Under Review').count(),
            'approved': session.query(Proposal).filter(Proposal.status == 'Approved').count(),
            'modification_required': session.query(Proposal).filter(Proposal.status == 'Modification Required').count(),
            'rejected': session.query(Proposal).filter(Proposal.status == 'Rejected').count(),
        }

        return jsonify({
            'success': True,
            'proposals': [p.to_dict() for p in proposals],
            'total': total,
            'page': page,
            'per_page': per_page,
            'total_pages': (total + per_page - 1) // per_page,
            'stats': stats
        }), 200
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500
    finally:
        session.close()

@proposals_bp.route('/<proposal_id>', methods=['GET'])
def get_proposal_detail(proposal_id):
    """
    Returns full details for a single proposal including audit history.
    """
    session = SessionLocal()
    try:
        proposal = session.query(Proposal).filter(Proposal.proposal_id == proposal_id).first()
        if not proposal:
            return jsonify({'success': False, 'error': f"Proposal '{proposal_id}' not found."}), 404

        history = (
            session.query(ProposalStatusHistory)
            .filter(ProposalStatusHistory.proposal_id == proposal_id)
            .order_by(desc(ProposalStatusHistory.changed_at))
            .all()
        )

        p_data = proposal.to_dict()
        p_data['history'] = [h.to_dict() for h in history]

        return jsonify({
            'success': True,
            'proposal': p_data
        }), 200
    finally:
        session.close()

@proposals_bp.route('/<proposal_id>/status', methods=['PATCH'])
@admin_required
def update_proposal_status(proposal_id):
    """
    Admin-only endpoint: Update proposal review status (Pending, Under Review, Approved, Rejected, Modification Required).
    Records change in proposal_status_history.
    """
    data = request.get_json() or {}
    new_status = data.get('status')
    remarks = data.get('remarks', '')

    valid_statuses = ['Pending', 'Under Review', 'Approved', 'Rejected', 'Modification Required']
    if new_status not in valid_statuses:
        return jsonify({
            'success': False,
            'error': f"Invalid status '{new_status}'. Allowed: {', '.join(valid_statuses)}"
        }), 400

    session = SessionLocal()
    try:
        proposal = session.query(Proposal).filter(Proposal.proposal_id == proposal_id).first()
        if not proposal:
            return jsonify({'success': False, 'error': f"Proposal '{proposal_id}' not found."}), 404

        prev_status = proposal.status
        proposal.status = new_status
        proposal.updated_at = datetime.now(timezone.utc)

        # Audit history entry
        changed_by = request.user.get('sub', 'Academic Office Admin')
        history = ProposalStatusHistory(
            proposal_id=proposal_id,
            previous_status=prev_status,
            new_status=new_status,
            remarks=remarks,
            changed_by=changed_by
        )
        session.add(history)

        # Re-generate PDF with updated status
        try:
            pdf_path, pdf_filename = PDFGenerator.generate_proposal_pdf(
                proposal.to_dict(),
                output_dir=current_app.config['PDF_STORAGE_DIR']
            )
            proposal.pdf_path = pdf_path
            proposal.pdf_filename = pdf_filename
        except Exception as e:
            current_app.logger.warning(f"Failed to refresh PDF for {proposal_id}: {e}")

        session.commit()

        return jsonify({
            'success': True,
            'message': f"Status of proposal {proposal_id} updated to '{new_status}'.",
            'proposal': proposal.to_dict()
        }), 200
    except Exception as e:
        session.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500
    finally:
        session.close()

@proposals_bp.route('/<proposal_id>/resend-email', methods=['POST'])
@admin_required
def resend_email_notification(proposal_id):
    """
    Admin-only endpoint: Manually retry sending the automated notification email.
    """
    session = SessionLocal()
    try:
        proposal = session.query(Proposal).filter(Proposal.proposal_id == proposal_id).first()
        if not proposal:
            return jsonify({'success': False, 'error': f"Proposal '{proposal_id}' not found."}), 404

        email_sent, email_err = EmailService.send_proposal_submission_notification(proposal)
        if email_sent:
            proposal.email_notification_status = 'Sent'
            proposal.email_error_log = None
        else:
            proposal.email_notification_status = 'Failed'
            proposal.email_error_log = email_err

        session.commit()

        return jsonify({
            'success': email_sent,
            'message': 'Email notification dispatched successfully.' if email_sent else f"Email sending failed: {email_err}",
            'email_notification_status': proposal.email_notification_status,
            'email_error_log': proposal.email_error_log
        }), 200 if email_sent else 500
    except Exception as e:
        session.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500
    finally:
        session.close()

@proposals_bp.route('/<proposal_id>/pdf', methods=['GET'])
def download_proposal_pdf(proposal_id):
    """
    Downloads the official generated PDF as attachment.
    If PDF does not exist on disk, it is dynamically generated from PostgreSQL record.
    """
    session = SessionLocal()
    try:
        proposal = session.query(Proposal).filter(Proposal.proposal_id == proposal_id).first()
        if not proposal:
            return jsonify({'success': False, 'error': f"Proposal '{proposal_id}' not found."}), 404

        pdf_path = proposal.pdf_path
        if not pdf_path or not Path(pdf_path).exists():
            # Generate on demand
            pdf_path, pdf_filename = PDFGenerator.generate_proposal_pdf(
                proposal.to_dict(),
                output_dir=current_app.config['PDF_STORAGE_DIR']
            )
            proposal.pdf_path = pdf_path
            proposal.pdf_filename = pdf_filename
            session.commit()

        return send_file(
            pdf_path,
            as_attachment=True,
            download_name=f"{proposal_id}.pdf",
            mimetype='application/pdf'
        )
    finally:
        session.close()

@proposals_bp.route('/<proposal_id>/pdf/view', methods=['GET'])
def view_proposal_pdf(proposal_id):
    """
    Renders the official generated PDF inline inside browser tab.
    """
    session = SessionLocal()
    try:
        proposal = session.query(Proposal).filter(Proposal.proposal_id == proposal_id).first()
        if not proposal:
            return jsonify({'success': False, 'error': f"Proposal '{proposal_id}' not found."}), 404

        pdf_path = proposal.pdf_path
        if not pdf_path or not Path(pdf_path).exists():
            pdf_path, pdf_filename = PDFGenerator.generate_proposal_pdf(
                proposal.to_dict(),
                output_dir=current_app.config['PDF_STORAGE_DIR']
            )
            proposal.pdf_path = pdf_path
            proposal.pdf_filename = pdf_filename
            session.commit()

        return send_file(
            pdf_path,
            as_attachment=False,
            download_name=f"{proposal_id}.pdf",
            mimetype='application/pdf'
        )
    finally:
        session.close()
