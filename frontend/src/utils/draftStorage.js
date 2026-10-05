// Draft storage utilities and key constant for SAPC Course Proposal System

export const DRAFT_STORAGE_KEY = 'sapc_course_proposal_draft_v1';

/**
 * Checks whether the user has entered any substantial data into the form.
 * Used to avoid saving blank or pristine forms.
 */
export const hasUserEnteredData = (data) => {
  if (!data) return false;
  return Boolean(
    (data.course_title && data.course_title.trim() !== '') ||
    (data.potential_instructors && data.potential_instructors.trim() !== '') ||
    (data.proposer_name && data.proposer_name.trim() !== '') ||
    (data.faculty_email && data.faculty_email.trim() !== '') ||
    (data.prior_knowledge && data.prior_knowledge.trim() !== '') ||
    (data.course_contents && data.course_contents.trim() !== '') ||
    (data.texts_and_references && data.texts_and_references.trim() !== '') ||
    (data.learning_outcomes && data.learning_outcomes.trim() !== '') ||
    (data.minors && data.minors.length > 0) ||
    data.is_modification ||
    (data.course_type && data.course_type !== 'CS') ||
    (data.course_level && data.course_level !== '3')
  );
};
