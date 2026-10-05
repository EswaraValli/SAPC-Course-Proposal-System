import React, { useState, useEffect, useRef } from 'react';
import {
  FileText, Send, CheckCircle, AlertCircle, Download, ExternalLink,
  BookOpen, HelpCircle, Layers, Award, Info, RefreshCw,
  Save, RotateCcw, Trash2, Clock
} from 'lucide-react';
import {
  COURSE_TYPES, COURSE_LEVELS, COURSE_DURATIONS, OFFERING_FREQUENCIES,
  BTECH_ELECTIVE_BASKETS, BTECH_DISCIPLINE_ELECTIVES, MINORS_LIST,
  MSC_ELECTIVES, MTECH_DISCIPLINES, MDES_ELECTIVES, DISCIPLINE_ABBREVIATIONS
} from '../constants/sapcOptions';
import { api } from '../services/api';
import { DRAFT_STORAGE_KEY, hasUserEnteredData } from '../utils/draftStorage';
import { FORM_SECTIONS } from '../constants/formNavigation';

export default function CourseProposalForm({ deadlineData, onSubmissionSuccess }) {
  const isSubmissionClosed = deadlineData && !deadlineData.is_open;

  // Form State
  const initialFormState = {
    course_title: '',
    potential_instructors: '',
    proposer_name: '',
    faculty_email: '',
    course_type: 'CS',
    course_type_other: '',
    course_level: '3',
    course_level_secondary: '',
    lecture_hours: 3,
    tutorial_hours: 0,
    practical_hours: 0,
    credits: 3,
    course_duration: '4 Quads (Full Semester)',
    expected_frequency: 'Each Year',
    expected_frequency_other: '',
    elective_basket_btech: 'None',
    discipline_elective_btech: 'None',
    discipline_basket_btech: '',
    minors: [],
    minor_basket_thematic_area: '',
    discipline_elective_msc: 'None',
    courses_discipline_mtech: 'None',
    mtech_sub_specialization: '',
    discipline_elective_mdes: 'None',
    is_modification: false,
    existing_course_code: '',
    prior_knowledge: '',
    course_contents: '',
    texts_and_references: '',
    learning_outcomes: '',
    overlap_courses: '',
    other_relevant_info: ''
  };

  const [formData, setFormData] = useState(initialFormState);
  const [isCreditManuallyEdited, setIsCreditManuallyEdited] = useState(false);
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionResult, setSubmissionResult] = useState(null);
  const [showAbbreviations, setShowAbbreviations] = useState(false);

  // Section Navigation & Progress State (Priority 5)
  const [activeSection, setActiveSection] = useState('section-course-info');

  // Track active section on scroll with IntersectionObserver
  useEffect(() => {
    if (typeof window === 'undefined') return;

    if ('IntersectionObserver' in window) {
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach(entry => {
            if (entry.isIntersecting) {
              setActiveSection(entry.target.id);
            }
          });
        },
        {
          rootMargin: '-20% 0px -50% 0px',
          threshold: 0.05
        }
      );

      FORM_SECTIONS.forEach((sec) => {
        const el = document.getElementById(sec.id);
        if (el) observer.observe(el);
      });

      return () => observer.disconnect();
    }
  }, []);

  const scrollToSection = (id) => {
    setActiveSection(id);
    const el = document.getElementById(id);
    if (el) {
      const yOffset = -70;
      const y = el.getBoundingClientRect().top + window.pageYOffset + yOffset;
      window.scrollTo({ top: y, behavior: 'smooth' });
    }
  };

  // Draft auto-save & restore state
  const [savedDraftAvailable, setSavedDraftAvailable] = useState(null);
  const [lastSavedTime, setLastSavedTime] = useState(null);
  const [draftStatusMessage, setDraftStatusMessage] = useState(null);
  const isInitialMount = useRef(true);

  // Check for saved draft on initial mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(DRAFT_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.formData && hasUserEnteredData(parsed.formData)) {
          setSavedDraftAvailable(parsed);
        }
      }
    } catch (e) {
      console.warn('Error checking localStorage draft:', e);
    }
  }, []);

  // Auto-save draft whenever form fields change (skipping initial mount)
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    if (hasUserEnteredData(formData)) {
      try {
        const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify({
          formData,
          isCreditManuallyEdited,
          savedAt: timeStr,
          timestamp: Date.now()
        }));
        setLastSavedTime(timeStr);
        setDraftStatusMessage(`Draft saved at ${timeStr}`);
      } catch (e) {
        console.warn('Could not auto-save draft to localStorage:', e);
      }
    }
  }, [formData, isCreditManuallyEdited]);

  // Restore draft handler
  const handleRestoreDraft = () => {
    if (savedDraftAvailable && savedDraftAvailable.formData) {
      setFormData(savedDraftAvailable.formData);
      if (typeof savedDraftAvailable.isCreditManuallyEdited === 'boolean') {
        setIsCreditManuallyEdited(savedDraftAvailable.isCreditManuallyEdited);
      }
      setDraftStatusMessage(`Draft restored (saved at ${savedDraftAvailable.savedAt || 'earlier'})`);
      setSavedDraftAvailable(null);
    }
  };

  // Discard draft handler
  const handleDiscardDraft = () => {
    try {
      localStorage.removeItem(DRAFT_STORAGE_KEY);
    } catch (e) {}
    setSavedDraftAvailable(null);
    setDraftStatusMessage('Draft discarded');
  };

  // Clear Form handler
  const handleClearForm = () => {
    const confirmed = window.confirm(
      'Are you sure you want to clear the entire form? All entered details and any saved local draft will be removed.'
    );
    if (confirmed) {
      try {
        localStorage.removeItem(DRAFT_STORAGE_KEY);
      } catch (e) {}
      setFormData(initialFormState);
      setIsCreditManuallyEdited(false);
      setErrors({});
      setSavedDraftAvailable(null);
      setLastSavedTime(null);
      setDraftStatusMessage('Form cleared');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // Field change handler
  const handleChange = (field, value) => {
    if (field === 'credits') {
      setIsCreditManuallyEdited(true);
    }

    setFormData(prev => {
      const updated = { ...prev, [field]: value };

      // Auto update credits only if the user has NOT manually entered/overridden the credits
      if (['lecture_hours', 'tutorial_hours', 'practical_hours'].includes(field) && !isCreditManuallyEdited) {
        const l = field === 'lecture_hours' ? Number(value) : Number(prev.lecture_hours);
        const t = field === 'tutorial_hours' ? Number(value) : Number(prev.tutorial_hours);
        const p = field === 'practical_hours' ? Number(value) : Number(prev.practical_hours);
        // Typical IITGN credit structure: L + T + 0.5*P rounded
        const calculatedCredits = l + t + Math.round(p * 0.5);
        updated.credits = Math.max(1, calculatedCredits);
      }

      return updated;
    });

    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }
  };

  // Toggle minor selection
  const handleMinorToggle = (minorCode) => {
    setFormData(prev => {
      const current = prev.minors || [];
      const updated = current.includes(minorCode)
        ? current.filter(m => m !== minorCode)
        : [...current, minorCode];
      return { ...prev, minors: updated };
    });
  };

  // Validate form client-side
  const validateForm = () => {
    const errs = {};
    if (!formData.course_title.trim()) errs.course_title = 'Title of the Course is required.';
    if (!formData.potential_instructors.trim()) errs.potential_instructors = 'Name of Potential Instructor(s) is required.';
    if (!formData.proposer_name.trim()) errs.proposer_name = 'Name of Proposer is required.';
    
    if (!formData.faculty_email.trim()) {
      errs.faculty_email = 'Faculty / Recipient Email is required for notification.';
    } else if (!/^[a-zA-Z0-9_.+-]+@iitgn\.ac\.in$/i.test(formData.faculty_email.trim())) {
      errs.faculty_email = 'Faculty email must be a valid IITGN institutional email address (@iitgn.ac.in).';
    }

    if (formData.course_type === 'Others' && !formData.course_type_other.trim()) {
      errs.course_type_other = 'Please specify other course type.';
    }

    if (formData.expected_frequency === 'Others' && !formData.expected_frequency_other.trim()) {
      errs.expected_frequency_other = 'Please specify offering frequency.';
    }

    if (formData.is_modification && !formData.existing_course_code.trim()) {
      errs.existing_course_code = 'Existing Course Code is required for course modifications.';
    }

    if (!formData.course_contents.trim()) {
      errs.course_contents = 'Course Contents are required (one paragraph separated by semicolons).';
    } else if (formData.course_contents.trim().length < 20) {
      errs.course_contents = 'Course Contents must be detailed (at least 20 characters).';
    }

    if (!formData.texts_and_references.trim()) {
      errs.texts_and_references = 'Texts and References in standard format (MLA, APA etc.) are required.';
    }

    if (!formData.learning_outcomes.trim()) {
      errs.learning_outcomes = 'Learning Outcomes are required.';
    }

    if (formData.credits === '' || Number(formData.credits) <= 0) {
      errs.credits = 'Credits must be greater than 0.';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // Form Submit
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (isSubmissionClosed) {
      alert('Course proposal submissions are currently closed.');
      return;
    }

    if (!validateForm()) {
      const firstError = document.querySelector('.is-invalid');
      if (firstError) firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    setIsSubmitting(true);
    setErrors({});

    try {
      const payload = {
        ...formData,
        course_l_t_p_c: `${formData.lecture_hours}-${formData.tutorial_hours}-${formData.practical_hours}-${formData.credits}`,
        minors: formData.minors.length > 0 ? formData.minors.join(', ') : null,
        elective_basket_btech: formData.elective_basket_btech === 'None' ? null : formData.elective_basket_btech,
        discipline_elective_btech: formData.discipline_elective_btech === 'None' ? null : formData.discipline_elective_btech,
        discipline_elective_msc: formData.discipline_elective_msc === 'None' ? null : formData.discipline_elective_msc,
        courses_discipline_mtech: formData.courses_discipline_mtech === 'None' ? null : formData.courses_discipline_mtech,
        discipline_elective_mdes: formData.discipline_elective_mdes === 'None' ? null : formData.discipline_elective_mdes,
      };

      const res = await api.submitProposal(payload);

      // Successfully submitted: clear local draft and status
      try {
        localStorage.removeItem(DRAFT_STORAGE_KEY);
      } catch (e) {}
      setSavedDraftAvailable(null);
      setLastSavedTime(null);
      setDraftStatusMessage(null);

      setSubmissionResult(res);
      if (onSubmissionSuccess) onSubmissionSuccess(res.proposal);
    } catch (err) {
      if (err.data && err.data.errors) {
        setErrors(err.data.errors);
      } else {
        alert(err.message || 'Submission failed. Please check connection and try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Reset for another proposal
  const handleReset = () => {
    setFormData(initialFormState);
    setIsCreditManuallyEdited(false);
    setSubmissionResult(null);
    setErrors({});
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // If already submitted successfully, display official confirmation screen
  if (submissionResult) {
    const p = submissionResult.proposal;
    const emailStatus = submissionResult.email_notification?.status;

    return (
      <div className="paper-card" style={{ maxWidth: 800, margin: '20px auto', textAlign: 'center' }}>
        <div style={{ display: 'inline-flex', padding: 16, background: '#dcfce7', borderRadius: '50%', color: '#15803d', marginBottom: 16 }}>
          <CheckCircle size={48} />
        </div>
        <h2 style={{ fontSize: 24, fontWeight: 800, color: '#002147', marginBottom: 8 }}>
          Course Proposal Submitted Successfully!
        </h2>
        <p style={{ color: '#475569', fontSize: 15, marginBottom: 20 }}>
          Your proposal has been logged in the SAPC Academic Office database and the official PDF has been generated.
        </p>

        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: 20, textAlign: 'left', margin: '0 auto 24px', maxWidth: 600 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: 10, borderBottom: '1px solid #e2e8f0', marginBottom: 10 }}>
            <span style={{ fontWeight: 600, color: '#475569' }}>Proposal ID:</span>
            <span style={{ fontWeight: 800, color: '#002147', fontFamily: 'monospace', fontSize: 16 }}>{p.proposal_id}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: 10, borderBottom: '1px solid #e2e8f0', marginBottom: 10 }}>
            <span style={{ fontWeight: 600, color: '#475569' }}>Course Title:</span>
            <span style={{ fontWeight: 700 }}>{p.course_title}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: 10, borderBottom: '1px solid #e2e8f0', marginBottom: 10 }}>
            <span style={{ fontWeight: 600, color: '#475569' }}>Proposer:</span>
            <span>{p.proposer_name}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: 10, borderBottom: '1px solid #e2e8f0', marginBottom: 10 }}>
            <span style={{ fontWeight: 600, color: '#475569' }}>Faculty Recipient Email:</span>
            <span>{p.faculty_email}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: 10, borderBottom: '1px solid #e2e8f0', marginBottom: 10 }}>
            <span style={{ fontWeight: 600, color: '#475569' }}>Email Notification:</span>
            <span className={`badge ${emailStatus === 'Sent' ? 'badge-approved' : 'badge-pending'}`}>
              {emailStatus === 'Sent' ? 'Notification Dispatched' : 'Notification Pending/Logged'}
            </span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontWeight: 600, color: '#475569' }}>Initial Status:</span>
            <span className="badge badge-pending">Pending SAPC Review</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <a
            href={api.getPdfDownloadUrl(p.proposal_id)}
            className="btn btn-primary"
            download={`${p.proposal_id}.pdf`}
          >
            <Download size={16} />
            <span>Download Official PDF</span>
          </a>

          <a
            href={api.getPdfViewUrl(p.proposal_id)}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-secondary"
          >
            <ExternalLink size={16} />
            <span>View PDF in New Tab</span>
          </a>

          <button onClick={handleReset} className="btn btn-secondary">
            <RefreshCw size={16} />
            <span>Submit Another Proposal</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <div className="paper-card">
        {/* Academic Header reproduced from ACAD-SAPC-01 */}
        <div className="paper-header">
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#c29b38', textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Indian Institute of Technology Gandhinagar
            </div>
            <h2 className="paper-title">
              Proposal for New Courses / Modification of Existing Courses
            </h2>
            <div className="paper-subtitle">
              Academic Office — Senate Academic Programme Committee (SAPC)
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8 }}>
              {draftStatusMessage && (
                <div className="sapc-draft-status-pill">
                  <CheckCircle size={12} style={{ color: '#16a34a' }} />
                  <span>{draftStatusMessage}</span>
                </div>
              )}
              {!draftStatusMessage && lastSavedTime && (
                <div className="sapc-draft-status-pill">
                  <Clock size={12} />
                  <span>Draft saved {lastSavedTime}</span>
                </div>
              )}
              <div className="paper-code-tag">ACAD-SAPC-01</div>
            </div>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => setShowAbbreviations(!showAbbreviations)}
              style={{ marginTop: 8, fontSize: 11 }}
            >
              <Info size={13} />
              <span>{showAbbreviations ? 'Hide Codes Legend' : 'Discipline Codes Legend'}</span>
            </button>
          </div>
        </div>

        {/* Expandable Discipline Codes Reference Legend */}
        {showAbbreviations && (
          <div style={{ background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: 8, padding: 14, marginBottom: 20, fontSize: 12 }}>
            <div style={{ fontWeight: 700, color: '#002147', marginBottom: 8 }}>
              Official Discipline Abbreviations Legend (from ACAD-SAPC-01 Footnote):
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '4px 12px' }}>
              {Object.entries(DISCIPLINE_ABBREVIATIONS).map(([abbr, name]) => (
                <div key={abbr}>
                  <strong style={{ color: '#0b3c68' }}>{abbr}:</strong> {name}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Draft Restore Banner */}
        {savedDraftAvailable && (
          <div className="sapc-draft-banner">
            <div className="sapc-draft-banner-content">
              <Save size={20} className="sapc-draft-icon" />
              <div>
                <strong>Unsubmitted Draft Found:</strong>
                <span>
                  {' '}Saved course proposal for{' '}
                  <strong>"{savedDraftAvailable.formData?.course_title || 'Untitled Course'}"</strong>
                  {savedDraftAvailable.savedAt ? ` (${savedDraftAvailable.savedAt})` : ''}.
                  Would you like to restore it?
                </span>
              </div>
            </div>
            <div className="sapc-draft-banner-actions">
              <button
                type="button"
                className="btn btn-sm btn-primary"
                onClick={handleRestoreDraft}
              >
                <RotateCcw size={13} />
                <span>Restore Draft</span>
              </button>
              <button
                type="button"
                className="btn btn-sm btn-secondary"
                onClick={handleDiscardDraft}
              >
                <span>Discard</span>
              </button>
            </div>
          </div>
        )}

        {/* Section Progress Navigation Stepper (Priority 5) */}
        <nav className="sapc-nav-stepper" aria-label="Course Proposal Form Sections">
          {FORM_SECTIONS.map((sec, idx) => {
            const isActive = activeSection === sec.id;
            return (
              <React.Fragment key={sec.id}>
                <button
                  type="button"
                  className={`sapc-step-item ${isActive ? 'active' : ''}`}
                  onClick={() => scrollToSection(sec.id)}
                  title={`Jump to ${sec.title}`}
                >
                  <span className="sapc-step-circle">{sec.number}</span>
                  <span className="sapc-step-label">{sec.title}</span>
                </button>
                {idx < FORM_SECTIONS.length - 1 && (
                  <div className={`sapc-step-divider ${isActive ? 'active' : ''}`} />
                )}
              </React.Fragment>
            );
          })}
        </nav>

        {/* Section 1: Course Identification & Proposer */}
        <div className="form-section" id="section-course-info">
          <div className="section-legend">
            <span className="section-legend-number">1</span>
            <span>Course Identification & Proposer Details</span>
          </div>

          <div className="form-group">
            <label className="form-label">
              <span>Title of the Course <span className="req">*</span></span>
            </label>
            <input
              type="text"
              className={`form-control ${errors.course_title ? 'is-invalid' : ''}`}
              placeholder="e.g. Distributed Systems and Cloud Computing"
              value={formData.course_title}
              onChange={e => handleChange('course_title', e.target.value)}
              disabled={isSubmissionClosed}
            />
            {errors.course_title && <div className="invalid-feedback">{errors.course_title}</div>}
          </div>

          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">
                <span>Name of Potential Instructor(s) <span className="req">*</span></span>
              </label>
              <input
                type="text"
                className={`form-control ${errors.potential_instructors ? 'is-invalid' : ''}`}
                placeholder="e.g. Dr. Vikram Sharma; Dr. Ananya Sen"
                value={formData.potential_instructors}
                onChange={e => handleChange('potential_instructors', e.target.value)}
                disabled={isSubmissionClosed}
              />
              {errors.potential_instructors && <div className="invalid-feedback">{errors.potential_instructors}</div>}
            </div>

            <div className="form-group">
              <label className="form-label">
                <span>Name of Proposer <span className="req">*</span></span>
              </label>
              <input
                type="text"
                className={`form-control ${errors.proposer_name ? 'is-invalid' : ''}`}
                placeholder="e.g. Dr. Vikram Sharma"
                value={formData.proposer_name}
                onChange={e => handleChange('proposer_name', e.target.value)}
                disabled={isSubmissionClosed}
              />
              {errors.proposer_name && <div className="invalid-feedback">{errors.proposer_name}</div>}
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">
              <span>Faculty / Recipient Email Address <span className="req">*</span></span>
              <span className="optional">Automated confirmation & review notifications will be sent here</span>
            </label>
            <input
              type="email"
              className={`form-control ${errors.faculty_email ? 'is-invalid' : ''}`}
              placeholder="e.g. faculty.name@iitgn.ac.in"
              value={formData.faculty_email}
              onChange={e => handleChange('faculty_email', e.target.value)}
              disabled={isSubmissionClosed}
            />
            {errors.faculty_email && <div className="invalid-feedback">{errors.faculty_email}</div>}
          </div>

          {/* Modification of Existing Course */}
          <div className="grid-2" style={{ marginTop: 8 }}>
            <div className="form-group">
              <label className="form-label">
                <span>Modification of Existing Course? (✓ One) <span className="req">*</span></span>
              </label>
              <div className="segment-group">
                <button
                  type="button"
                  className={`segment-btn ${!formData.is_modification ? 'active' : ''}`}
                  onClick={() => handleChange('is_modification', false)}
                  disabled={isSubmissionClosed}
                >
                  No (New Course)
                </button>
                <button
                  type="button"
                  className={`segment-btn ${formData.is_modification ? 'active' : ''}`}
                  onClick={() => handleChange('is_modification', true)}
                  disabled={isSubmissionClosed}
                >
                  Yes (Modification)
                </button>
              </div>
            </div>

            {formData.is_modification && (
              <div className="form-group">
                <label className="form-label">
                  <span>If Yes, Existing Course Code <span className="req">*</span></span>
                </label>
                <input
                  type="text"
                  className={`form-control ${errors.existing_course_code ? 'is-invalid' : ''}`}
                  placeholder="e.g. CS301 or EE202"
                  value={formData.existing_course_code}
                  onChange={e => handleChange('existing_course_code', e.target.value)}
                  disabled={isSubmissionClosed}
                />
                {errors.existing_course_code && <div className="invalid-feedback">{errors.existing_course_code}</div>}
              </div>
            )}
          </div>
        </div>

        {/* Section 2: Structure, Level, L-T-P-C & Offering */}
        <div className="form-section" id="section-course-structure">
          <div className="section-legend">
            <span className="section-legend-number">2</span>
            <span>Course Classification, Level, Structure & Duration</span>
          </div>

          {/* Course Type */}
          <div className="form-group">
            <label className="form-label">
              <span>Course Type (✓ One) <span className="req">*</span></span>
              <span className="optional">ACAD-SAPC-01 Disciplinary Classification</span>
            </label>
            <div className="sapc-type-grid">
              {COURSE_TYPES.map(type => {
                const isSelected = formData.course_type === type;
                const fullName = DISCIPLINE_ABBREVIATIONS[type] || (type === 'Others' ? 'Other Discipline' : type);
                return (
                  <div
                    key={type}
                    className={`sapc-type-cell ${isSelected ? 'selected' : ''}`}
                    onClick={() => !isSubmissionClosed && handleChange('course_type', type)}
                    title={`${type} — ${fullName}`}
                    role="radio"
                    aria-checked={isSelected}
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (!isSubmissionClosed && (e.key === ' ' || e.key === 'Enter')) {
                        e.preventDefault();
                        handleChange('course_type', type);
                      }
                    }}
                  >
                    <div className="sapc-cell-top">
                      <span className="sapc-cell-code">{type}</span>
                      <div className="sapc-radio-indicator">
                        {isSelected && <div className="sapc-radio-indicator-dot" />}
                      </div>
                    </div>
                    <div className="sapc-cell-sub" title={fullName}>{fullName}</div>
                  </div>
                );
              })}
            </div>
            {formData.course_type === 'Others' && (
              <div style={{ marginTop: 10 }}>
                <input
                  type="text"
                  className={`form-control ${errors.course_type_other ? 'is-invalid' : ''}`}
                  placeholder="Please specify other course type (e.g. Interdisciplinary Studies)"
                  value={formData.course_type_other}
                  onChange={e => handleChange('course_type_other', e.target.value)}
                  disabled={isSubmissionClosed}
                  autoFocus
                />
                {errors.course_type_other && <div className="invalid-feedback">{errors.course_type_other}</div>}
              </div>
            )}
          </div>

          {/* Course Level with official form notes */}
          <div className="form-group">
            <label className="form-label">
              <span>Course Level (✓ One) <span className="req">*</span></span>
              <span className="optional">Levels 1 to 5: UG | Level 6: PG</span>
            </label>
            <div className="sapc-level-strip">
              {COURSE_LEVELS.map(lvl => {
                const isSelected = formData.course_level === lvl;
                const isUG = Number(lvl) <= 5;
                return (
                  <div
                    key={lvl}
                    className={`sapc-level-cell ${isSelected ? 'selected' : ''}`}
                    onClick={() => !isSubmissionClosed && handleChange('course_level', lvl)}
                    role="radio"
                    aria-checked={isSelected}
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (!isSubmissionClosed && (e.key === ' ' || e.key === 'Enter')) {
                        e.preventDefault();
                        handleChange('course_level', lvl);
                      }
                    }}
                  >
                    <span className="sapc-level-num">Level {lvl}</span>
                    <span className={`sapc-level-tag ${isUG ? 'ug' : 'pg'}`}>
                      {isUG ? 'UG Level' : 'PG Level'}
                    </span>
                  </div>
                );
              })}
            </div>
            <div className="input-hint" style={{ marginTop: 8 }}>
              • Courses at levels 1 to 5 are considered as UG level courses and courses at level 6 are considered as PG level courses.<br />
              • Courses can simultaneously be at two levels (for example at level 3 and at level 6).
            </div>
            <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 10, background: '#f8fafc', padding: '10px 14px', borderRadius: 6, border: '1px solid #e2e8f0' }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: '#334155' }}>Simultaneous Secondary Level (if applicable):</span>
              <select
                className="form-control"
                style={{ width: 180 }}
                value={formData.course_level_secondary}
                onChange={e => handleChange('course_level_secondary', e.target.value)}
                disabled={isSubmissionClosed}
              >
                <option value="">None (Single Level)</option>
                {COURSE_LEVELS.map(lvl => (
                  <option key={lvl} value={lvl} disabled={lvl === formData.course_level}>
                    Level {lvl} ({Number(lvl) <= 5 ? 'UG' : 'PG'})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Course L-T-P-C */}
          <div className="form-group">
            <label className="form-label">
              <span>Course L - T - P - C <span className="req">*</span></span>
              <span className="optional">
                Formatted: <strong>{formData.lecture_hours}-{formData.tutorial_hours}-{formData.practical_hours}-{formData.credits}</strong>
                {isCreditManuallyEdited && (
                  <span style={{ marginLeft: 8, color: '#0b3c68', fontWeight: 600 }}>
                    (Custom Credits)
                  </span>
                )}
              </span>
            </label>
            <div className="grid-4">
              <div>
                <span className="input-hint">L (Lecture Hours)</span>
                <input
                  type="number"
                  min="0"
                  max="10"
                  step="0.5"
                  className="form-control"
                  value={formData.lecture_hours}
                  onChange={e => handleChange('lecture_hours', e.target.value)}
                  disabled={isSubmissionClosed}
                />
              </div>
              <div>
                <span className="input-hint">T (Tutorial Hours)</span>
                <input
                  type="number"
                  min="0"
                  max="10"
                  step="0.5"
                  className="form-control"
                  value={formData.tutorial_hours}
                  onChange={e => handleChange('tutorial_hours', e.target.value)}
                  disabled={isSubmissionClosed}
                />
              </div>
              <div>
                <span className="input-hint">P (Practical Hours)</span>
                <input
                  type="number"
                  min="0"
                  max="10"
                  step="0.5"
                  className="form-control"
                  value={formData.practical_hours}
                  onChange={e => handleChange('practical_hours', e.target.value)}
                  disabled={isSubmissionClosed}
                />
              </div>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span className="input-hint">C (Credits)</span>
                  {isCreditManuallyEdited && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsCreditManuallyEdited(false);
                        const l = Number(formData.lecture_hours) || 0;
                        const t = Number(formData.tutorial_hours) || 0;
                        const p = Number(formData.practical_hours) || 0;
                        const calculatedCredits = l + t + Math.round(p * 0.5);
                        setFormData(prev => ({ ...prev, credits: Math.max(1, calculatedCredits) }));
                      }}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#0b3c68',
                        fontSize: '11px',
                        textDecoration: 'underline',
                        cursor: 'pointer',
                        padding: 0
                      }}
                      title="Reset to default calculated value based on L + T + 0.5*P"
                    >
                      Reset default
                    </button>
                  )}
                </div>
                <input
                  type="number"
                  min="0.5"
                  max="20"
                  step="0.5"
                  className={`form-control ${errors.credits ? 'is-invalid' : ''}`}
                  value={formData.credits}
                  onChange={e => handleChange('credits', e.target.value)}
                  disabled={isSubmissionClosed}
                />
                {errors.credits && <div className="invalid-feedback">{errors.credits}</div>}
              </div>
            </div>
          </div>

          {/* Duration & Offering Frequency */}
          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">
                <span>Course Duration (✓ One) <span className="req">*</span></span>
              </label>
              <select
                className="form-control"
                value={formData.course_duration}
                onChange={e => handleChange('course_duration', e.target.value)}
                disabled={isSubmissionClosed}
              >
                {COURSE_DURATIONS.map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">
                <span>Expected Frequency of Offering (✓ One) <span className="req">*</span></span>
              </label>
              <select
                className="form-control"
                value={formData.expected_frequency}
                onChange={e => handleChange('expected_frequency', e.target.value)}
                disabled={isSubmissionClosed}
              >
                {OFFERING_FREQUENCIES.map(f => (
                  <option key={f} value={f}>{f}</option>
                ))}
              </select>
              {formData.expected_frequency === 'Others' && (
                <input
                  type="text"
                  className={`form-control ${errors.expected_frequency_other ? 'is-invalid' : ''}`}
                  placeholder="Specify frequency"
                  style={{ marginTop: 8 }}
                  value={formData.expected_frequency_other}
                  onChange={e => handleChange('expected_frequency_other', e.target.value)}
                  disabled={isSubmissionClosed}
                />
              )}
            </div>
          </div>
        </div>

        {/* Section 3: Curricular Electives, Baskets & Minors */}
        <div className="form-section" id="section-electives-minors">
          <div className="section-legend">
            <span className="section-legend-number">3</span>
            <span>Curricular Baskets, Electives & Minor Specializations</span>
          </div>

          {/* Elective Basket for BTech */}
          <div className="form-group">
            <label className="form-label">
              <span>Elective Basket for BTech</span>
              <span className="optional">(✓ One, if applicable)</span>
            </label>
            <div className="sapc-basket-grid">
              {BTECH_ELECTIVE_BASKETS.map(b => {
                const isSelected = formData.elective_basket_btech === b;
                const isNone = b === 'None';
                const basketSubtitles = {
                  'None': 'Not Applicable / Regular',
                  'BS': 'Basic Science Elective',
                  'HS': 'Humanities & Social Sciences',
                  'Mathematics': 'Mathematics Elective',
                  'Science': 'Science Basket Elective'
                };
                return (
                  <div
                    key={b}
                    className={`sapc-basket-card ${isNone ? 'none-card' : ''} ${isSelected ? 'selected' : ''}`}
                    onClick={() => !isSubmissionClosed && handleChange('elective_basket_btech', b)}
                    role="radio"
                    aria-checked={isSelected}
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (!isSubmissionClosed && (e.key === ' ' || e.key === 'Enter')) {
                        e.preventDefault();
                        handleChange('elective_basket_btech', b);
                      }
                    }}
                  >
                    <span className="sapc-basket-title">{b}</span>
                    <span className="sapc-basket-sub">{basketSubtitles[b] || ''}</span>
                  </div>
                );
              })}
            </div>
            <div className="input-hint" style={{ marginTop: 8 }}>
              • All Science basket courses are BS electives. However, all BS electives are not part of the Science basket.<br />
              • Courses from Chemistry, Cognitive Science, Earth Science and Physics can be part of the Science basket.<br />
              • Courses from Chemistry, Cognitive Science, Earth Science, Mathematics and Physics can be part of BS electives.
            </div>
          </div>

          {/* Discipline-specific Elective for BTech */}
          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">
                <span>Discipline-specific Elective for BTech</span>
                <span className="optional">(✓ One, if applicable)</span>
              </label>
              <select
                className="form-control"
                value={formData.discipline_elective_btech}
                onChange={e => handleChange('discipline_elective_btech', e.target.value)}
                disabled={isSubmissionClosed}
              >
                {BTECH_DISCIPLINE_ELECTIVES.map(opt => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">
                <span>Discipline-specific Basket</span>
                <span className="optional">(if applicable)</span>
              </label>
              <input
                type="text"
                className="form-control"
                placeholder="e.g. Systems and Networking Basket"
                value={formData.discipline_basket_btech}
                onChange={e => handleChange('discipline_basket_btech', e.target.value)}
                disabled={isSubmissionClosed}
              />
            </div>
          </div>

          {/* Minor(s) in */}
          <div className="form-group">
            <label className="form-label">
              <span>Minor(s) in</span>
              <span className="optional">(✓ all applicable minors — {formData.minors.length} selected)</span>
            </label>
            <div className="sapc-minors-grid">
              {MINORS_LIST.map(m => {
                const isSelected = formData.minors.includes(m);
                const fullName = DISCIPLINE_ABBREVIATIONS[m] || m;
                return (
                  <div
                    key={m}
                    className={`sapc-minor-cell ${isSelected ? 'selected' : ''}`}
                    onClick={() => !isSubmissionClosed && handleMinorToggle(m)}
                    title={`${m} — ${fullName}`}
                    role="checkbox"
                    aria-checked={isSelected}
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (!isSubmissionClosed && (e.key === ' ' || e.key === 'Enter')) {
                        e.preventDefault();
                        handleMinorToggle(m);
                      }
                    }}
                  >
                    <div className="sapc-cell-top">
                      <span className="sapc-cell-code">{m}</span>
                      <div className="sapc-checkbox-indicator">
                        {isSelected && (
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        )}
                      </div>
                    </div>
                    <div className="sapc-cell-sub" title={fullName}>{fullName}</div>
                  </div>
                );
              })}
            </div>
            <div style={{ marginTop: 10 }}>
              <input
                type="text"
                className="form-control"
                placeholder="Basket / Thematic Area for Minor (if applicable, e.g. Intelligent Systems)"
                value={formData.minor_basket_thematic_area}
                onChange={e => handleChange('minor_basket_thematic_area', e.target.value)}
                disabled={isSubmissionClosed}
              />
            </div>
          </div>

          {/* PG Curricular Fields */}
          <div className="grid-3">
            <div className="form-group">
              <label className="form-label">
                <span>Discipline-specific Elective for MSc</span>
                <span className="optional">(✓ One, if applicable)</span>
              </label>
              <select
                className="form-control"
                value={formData.discipline_elective_msc}
                onChange={e => handleChange('discipline_elective_msc', e.target.value)}
                disabled={isSubmissionClosed}
              >
                {MSC_ELECTIVES.map(opt => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">
                <span>Courses Specified for MTech</span>
                <span className="optional">(✓ One, if applicable)</span>
              </label>
              <select
                className="form-control"
                value={formData.courses_discipline_mtech}
                onChange={e => handleChange('courses_discipline_mtech', e.target.value)}
                disabled={isSubmissionClosed}
              >
                {MTECH_DISCIPLINES.map(opt => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
              <input
                type="text"
                className="form-control"
                style={{ marginTop: 6 }}
                placeholder="Sub-specialization (if applicable)"
                value={formData.mtech_sub_specialization}
                onChange={e => handleChange('mtech_sub_specialization', e.target.value)}
                disabled={isSubmissionClosed}
              />
            </div>

            <div className="form-group">
              <label className="form-label">
                <span>Discipline-specific Elective for MDes</span>
                <span className="optional">(✓ One, if applicable)</span>
              </label>
              <select
                className="form-control"
                value={formData.discipline_elective_mdes}
                onChange={e => handleChange('discipline_elective_mdes', e.target.value)}
                disabled={isSubmissionClosed}
              >
                {MDES_ELECTIVES.map(opt => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-group" style={{ marginTop: 6 }}>
            <label className="form-label">
              <span>Prior Knowledge / Expertise Expected from Students</span>
              <span className="optional">(if applicable)</span>
            </label>
            <textarea
              className="form-control"
              rows={3}
              placeholder="e.g. Basic knowledge of Data Structures and Algorithms; familiarity with Linear Algebra and Probability (or equivalent course numbers e.g. CS 201, MA 102)."
              value={formData.prior_knowledge}
              onChange={e => handleChange('prior_knowledge', e.target.value)}
              disabled={isSubmissionClosed}
            />
          </div>
        </div>

        {/* Section 4: Academic Syllabus, Texts & Outcomes */}
        <div className="form-section" id="section-syllabus-references">
          <div className="section-legend">
            <span className="section-legend-number">4</span>
            <span>Course Contents, References & Learning Outcomes</span>
          </div>

          <div className="form-group">
            <label className="form-label">
              <span>Course Contents <span className="req">*</span></span>
              <span className="optional">[Please include one paragraph with relevant details of the contents, separated by semicolons]</span>
            </label>
            <textarea
              className={`form-control ${errors.course_contents ? 'is-invalid' : ''}`}
              rows={4}
              placeholder="e.g. Introduction to system models; Remote procedure calls and network protocols; Distributed consensus protocols including Paxos and Raft; Fault tolerance and replication..."
              value={formData.course_contents}
              onChange={e => handleChange('course_contents', e.target.value)}
              disabled={isSubmissionClosed}
            />
            {errors.course_contents && <div className="invalid-feedback">{errors.course_contents}</div>}
          </div>

          <div className="form-group">
            <label className="form-label">
              <span>Texts and References <span className="req">*</span></span>
              <span className="optional">[Please include texts and references in standard format (MLA, APA etc.)]</span>
            </label>
            <textarea
              className={`form-control ${errors.texts_and_references ? 'is-invalid' : ''}`}
              rows={3}
              placeholder="1. Author, A. (Year). Book Title (Edition). Publisher.; 2. Author, B. (Year). Title of Work. Publisher."
              value={formData.texts_and_references}
              onChange={e => handleChange('texts_and_references', e.target.value)}
              disabled={isSubmissionClosed}
            />
            {errors.texts_and_references && <div className="invalid-feedback">{errors.texts_and_references}</div>}
          </div>

          <div className="form-group">
            <label className="form-label">
              <span>Learning Outcomes <span className="req">*</span></span>
            </label>
            <textarea
              className={`form-control ${errors.learning_outcomes ? 'is-invalid' : ''}`}
              rows={3}
              placeholder="At the end of this course, students will be able to: 1. ... 2. ... 3. ..."
              value={formData.learning_outcomes}
              onChange={e => handleChange('learning_outcomes', e.target.value)}
              disabled={isSubmissionClosed}
            />
            {errors.learning_outcomes && <div className="invalid-feedback">{errors.learning_outcomes}</div>}
          </div>

          <div className="form-group">
            <label className="form-label">
              <span>Overlap with Other Approved Courses</span>
              <span className="optional">if any, provide course titles/codes and estimated percentage</span>
            </label>
            <textarea
              className="form-control"
              rows={2}
              placeholder="State any overlap or note 'None / No significant overlap with existing courses.'"
              value={formData.overlap_courses}
              onChange={e => handleChange('overlap_courses', e.target.value)}
              disabled={isSubmissionClosed}
            />
          </div>

          <div className="form-group">
            <label className="form-label">
              <span>Any Other Relevant Information Not Covered Above</span>
              <span className="optional">[May also include applications of concepts taught in the course for industry sectors/academia etc.]</span>
            </label>
            <textarea
              className="form-control"
              rows={2}
              placeholder="Industrial relevance, lab setup requirements, software tools used, etc."
              value={formData.other_relevant_info}
              onChange={e => handleChange('other_relevant_info', e.target.value)}
              disabled={isSubmissionClosed}
            />
          </div>
        </div>

        {/* Section 5: Review & Institutional Submission */}
        <div className="form-section" id="section-review-submit" style={{ borderBottom: 'none', marginBottom: 0, paddingBottom: 0 }}>
          <div className="section-legend">
            <span className="section-legend-number">5</span>
            <span>Review & Institutional Submission</span>
          </div>

          {/* Institutional Sign-off Footer from ACAD-SAPC-01 */}
          <div style={{ background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: 6, padding: '12px 16px', fontSize: 12, color: '#475569', marginBottom: 24 }}>
            <strong>Institutional Governance Notice:</strong> Course proposals are to be approved by the Chairman, Senate on recommendation of the SAPC.<br />
            Completed proposals are officially routed to <u>ar.ug@iitgn.ac.in</u>, with a copy to <u>doaa@iitgn.ac.in</u>.
          </div>

          {/* Form Action Controls */}
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
            <div>
              <button
                type="button"
                className="btn btn-outline-danger"
                onClick={handleClearForm}
                disabled={isSubmitting}
              >
                <Trash2 size={15} />
                <span>Clear Form</span>
              </button>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              {draftStatusMessage && (
                <div className="sapc-draft-status-pill">
                  <CheckCircle size={13} style={{ color: '#16a34a' }} />
                  <span>{draftStatusMessage}</span>
                </div>
              )}
              {!draftStatusMessage && lastSavedTime && (
                <div className="sapc-draft-status-pill">
                  <Clock size={13} />
                  <span>Draft saved at {lastSavedTime}</span>
                </div>
              )}

              {isSubmissionClosed ? (
                <div style={{ color: '#dc2626', fontWeight: 700, fontSize: 13.5, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <AlertCircle size={16} />
                  <span>Course proposal submissions are currently closed.</span>
                </div>
              ) : (
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={isSubmitting}
                  style={{ minWidth: 220 }}
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw size={16} className="animate-spin" />
                      <span>Processing & Generating PDF...</span>
                    </>
                  ) : (
                    <>
                      <Send size={16} />
                      <span>Submit Course Proposal</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </form>
  );
}
