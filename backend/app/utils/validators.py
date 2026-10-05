import re
from datetime import datetime

# Allowed values exactly based on ACAD-SAPC-01 Form
VALID_COURSE_TYPES = [
    'BE', 'CE', 'CG', 'CH', 'CL', 'CS', 'DES', 'EE', 'EH', 'ES', 'FP', 
    'GE', 'HS', 'IN', 'MA', 'ME', 'MS', 'MSE', 'MTE', 'PE', 'PH', 'e-Masters', 'Others'
]

VALID_COURSE_LEVELS = ['1', '2', '3', '4', '5', '6']

VALID_DURATIONS = [
    '1 Quad',
    '2 Quads (Half Semester)',
    '3 Quads',
    '4 Quads (Full Semester)'
]

VALID_FREQUENCIES = [
    'Each Semester',
    'Each Year',
    'Once in Two Years',
    'Others'
]

VALID_BTECH_ELECTIVE_BASKETS = ['BS', 'HS', 'Mathematics', 'Science', 'None', '']

VALID_BTECH_DISCIPLINE_ELECTIVES = ['AI', 'CL', 'CE', 'CS', 'EE', 'ICDT', 'MSE', 'ME', 'None', '']

VALID_MSC_ELECTIVES = ['CG', 'CH', 'MA', 'PH', 'None', '']

VALID_MTECH_DISCIPLINES = ['AI', 'BE', 'CE', 'CL', 'CS', 'EE', 'EH', 'ICDT', 'ME', 'MSE', 'MTE', 'None', '']

VALID_MDES_ELECTIVES = ['IDT', 'None', '']

IITGN_EMAIL_REGEX = re.compile(r'^[a-zA-Z0-9_.+-]+@iitgn\.ac\.in$', re.IGNORECASE)
LTPC_REGEX = re.compile(r'^\d+(\.\d+)?-\d+(\.\d+)?-\d+(\.\d+)?-\d+(\.\d+)?$')

def validate_proposal_payload(data):
    """
    Independent backend validation for incoming Course Proposal data.
    Returns: (is_valid: bool, errors: dict)
    """
    errors = {}

    if not isinstance(data, dict):
        return False, {"_payload": "Payload must be a JSON object."}

    # 1. Course Title
    course_title = (data.get('course_title') or '').strip()
    if not course_title:
        errors['course_title'] = "Title of the Course is mandatory."
    elif len(course_title) < 3:
        errors['course_title'] = "Course title must be at least 3 characters long."

    # 2. Potential Instructors
    potential_instructors = (data.get('potential_instructors') or '').strip()
    if not potential_instructors:
        errors['potential_instructors'] = "Name of Potential Instructor(s) is mandatory."

    # 3. Proposer Name
    proposer_name = (data.get('proposer_name') or '').strip()
    if not proposer_name:
        errors['proposer_name'] = "Name of Proposer is mandatory."

    # 4. Faculty Email (strictly @iitgn.ac.in)
    faculty_email = (data.get('faculty_email') or '').strip()
    if not faculty_email:
        errors['faculty_email'] = "Faculty / Recipient Email is mandatory."
    elif not IITGN_EMAIL_REGEX.match(faculty_email):
        errors['faculty_email'] = "Faculty email must be a valid IITGN institutional email address (@iitgn.ac.in)."

    # 5. Course Type
    course_type = (data.get('course_type') or '').strip()
    if not course_type:
        errors['course_type'] = "Course Type selection is mandatory."
    elif course_type not in VALID_COURSE_TYPES:
        errors['course_type'] = f"Invalid Course Type '{course_type}'."
    elif course_type == 'Others':
        other_type = (data.get('course_type_other') or '').strip()
        if not other_type:
            errors['course_type_other'] = "Please specify the course type when 'Others' is selected."

    # 6. Course Level
    course_level = str(data.get('course_level') or '').strip()
    if not course_level:
        errors['course_level'] = "Course Level is mandatory."
    elif course_level not in VALID_COURSE_LEVELS:
        errors['course_level'] = f"Course Level must be one of {VALID_COURSE_LEVELS}."

    # 7. Course L-T-P-C
    ltpc = (data.get('course_l_t_p_c') or '').strip()
    if not ltpc:
        # Check if individual components provided
        l = data.get('lecture_hours', 0)
        t = data.get('tutorial_hours', 0)
        p = data.get('practical_hours', 0)
        c = data.get('credits', 0)
        ltpc = f"{l}-{t}-{p}-{c}"
        data['course_l_t_p_c'] = ltpc

    if not LTPC_REGEX.match(ltpc):
        errors['course_l_t_p_c'] = "Course L-T-P-C format must be numeric (e.g. 3-0-0-4 or 3-0-2-4)."
    else:
        # Validate that credits is positive
        try:
            parts = ltpc.split('-')
            if len(parts) == 4 and float(parts[3]) <= 0:
                errors['credits'] = "Credits must be a positive number greater than 0."
        except Exception:
            pass

    # 8. Course Duration
    duration = (data.get('course_duration') or '').strip()
    if not duration:
        errors['course_duration'] = "Course Duration selection is mandatory."
    elif duration not in VALID_DURATIONS:
        errors['course_duration'] = f"Invalid duration. Must be one of: {', '.join(VALID_DURATIONS)}."

    # 9. Expected Frequency of Offering
    frequency = (data.get('expected_frequency') or '').strip()
    if not frequency:
        errors['expected_frequency'] = "Expected Frequency of Offering is mandatory."
    elif frequency not in VALID_FREQUENCIES:
        errors['expected_frequency'] = f"Invalid frequency. Must be one of: {', '.join(VALID_FREQUENCIES)}."
    elif frequency == 'Others':
        other_freq = (data.get('expected_frequency_other') or '').strip()
        if not other_freq:
            errors['expected_frequency_other'] = "Please specify the frequency when 'Others' is selected."

    # 10. Modification of Existing Course
    is_mod = data.get('is_modification')
    if is_mod is None:
        errors['is_modification'] = "Please indicate whether this is a modification of an existing course."
    elif is_mod in (True, 'true', 'True', 1, '1'):
        data['is_modification'] = True
        existing_code = (data.get('existing_course_code') or '').strip()
        if not existing_code:
            errors['existing_course_code'] = "Existing Course Code is mandatory for course modifications."
    else:
        data['is_modification'] = False

    # 11. Course Contents
    contents = (data.get('course_contents') or '').strip()
    if not contents:
        errors['course_contents'] = "Course Contents are mandatory."
    elif len(contents) < 20:
        errors['course_contents'] = "Course Contents must be detailed (at least 20 characters)."

    # 12. Texts and References
    refs = (data.get('texts_and_references') or '').strip()
    if not refs:
        errors['texts_and_references'] = "Texts and References are mandatory."

    # 13. Learning Outcomes
    outcomes = (data.get('learning_outcomes') or '').strip()
    if not outcomes:
        errors['learning_outcomes'] = "Learning Outcomes are mandatory."

    return len(errors) == 0, errors

def generate_next_proposal_id(session, ProposalModel):
    """
    Generates human-readable, unique Proposal ID: SAPC-<YEAR>-<0001..N>
    """
    year = datetime.now().year
    prefix = f"SAPC-{year}-"
    
    # Query highest proposal in current year
    highest = (
        session.query(ProposalModel.proposal_id)
        .filter(ProposalModel.proposal_id.like(f"{prefix}%"))
        .order_by(ProposalModel.id.desc())
        .first()
    )

    if highest and highest[0]:
        try:
            curr_num = int(highest[0].split('-')[-1])
            next_num = curr_num + 1
        except Exception:
            next_num = 1
    else:
        next_num = 1

    return f"{prefix}{next_num:04d}"
