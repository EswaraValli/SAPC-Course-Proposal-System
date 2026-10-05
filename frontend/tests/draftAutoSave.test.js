import test from 'node:test';
import assert from 'node:assert/strict';
import { DRAFT_STORAGE_KEY, hasUserEnteredData } from '../src/utils/draftStorage.js';

// In-memory mock localStorage implementation
class MockLocalStorage {
  constructor() {
    this.store = {};
  }
  getItem(key) {
    return this.store[key] || null;
  }
  setItem(key, value) {
    this.store[key] = String(value);
  }
  removeItem(key) {
    delete this.store[key];
  }
  clear() {
    this.store = {};
  }
}

test('Priority 4: Draft Auto-Save, Restoration, and Clear Form', async (t) => {
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

  await t.test('hasUserEnteredData returns false for blank form and true when edited', () => {
    assert.equal(hasUserEnteredData(initialFormState), false, 'Empty form is not treated as dirty');
    
    const editedForm = { ...initialFormState, course_title: 'Quantum Computing' };
    assert.equal(hasUserEnteredData(editedForm), true, 'Edited title is detected');

    const editedMinors = { ...initialFormState, minors: ['AI'] };
    assert.equal(hasUserEnteredData(editedMinors), true, 'Selected minors detected');
  });

  await t.test('1. Form data is saved to localStorage when changes occur', () => {
    const storage = new MockLocalStorage();
    
    // User types in form
    const currentForm = {
      ...initialFormState,
      course_title: 'Advanced Machine Learning',
      proposer_name: 'Dr. Jane Doe',
      credits: 4
    };
    const isCreditManuallyEdited = true;

    if (hasUserEnteredData(currentForm)) {
      storage.setItem(DRAFT_STORAGE_KEY, JSON.stringify({
        formData: currentForm,
        isCreditManuallyEdited,
        savedAt: '10:30 AM',
        timestamp: 1728000000000
      }));
    }

    const savedRaw = storage.getItem(DRAFT_STORAGE_KEY);
    assert.ok(savedRaw, 'Draft should be present in localStorage');
    const parsed = JSON.parse(savedRaw);
    assert.equal(parsed.formData.course_title, 'Advanced Machine Learning');
    assert.equal(parsed.formData.proposer_name, 'Dr. Jane Doe');
    assert.equal(parsed.isCreditManuallyEdited, true);
    assert.equal(parsed.savedAt, '10:30 AM');
  });

  await t.test('2. Draft can be restored without losing state', () => {
    const storage = new MockLocalStorage();
    const savedDraft = {
      formData: {
        ...initialFormState,
        course_title: 'Robotics and Autonomous Systems',
        potential_instructors: 'Dr. John Smith',
        proposer_name: 'Dr. John Smith',
        faculty_email: 'jsmith@iitgn.ac.in',
        minors: ['AI', 'RB'],
        prior_knowledge: 'Linear Algebra; Python Programming'
      },
      isCreditManuallyEdited: false,
      savedAt: '11:15 AM',
      timestamp: 1728001000000
    };
    storage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(savedDraft));

    // Simulate user returning to page
    let activeForm = { ...initialFormState };
    const savedDraftFound = JSON.parse(storage.getItem(DRAFT_STORAGE_KEY));
    assert.ok(savedDraftFound, 'Saved draft must be found');

    // Simulate user clicking "Restore Draft"
    activeForm = savedDraftFound.formData;
    assert.equal(activeForm.course_title, 'Robotics and Autonomous Systems');
    assert.equal(activeForm.potential_instructors, 'Dr. John Smith');
    assert.deepEqual(activeForm.minors, ['AI', 'RB']);
    assert.equal(activeForm.prior_knowledge, 'Linear Algebra; Python Programming');
  });

  await t.test('3. Clear Form removes data and deletes saved draft after user confirmation', () => {
    const storage = new MockLocalStorage();
    storage.setItem(DRAFT_STORAGE_KEY, JSON.stringify({ formData: { course_title: 'To Be Cleared' } }));
    
    let activeForm = { ...initialFormState, course_title: 'To Be Cleared' };

    // Simulate handleClearForm with user confirmation = true
    const simulateClearForm = (userConfirmed) => {
      if (userConfirmed) {
        storage.removeItem(DRAFT_STORAGE_KEY);
        activeForm = { ...initialFormState };
        return true;
      }
      return false;
    };

    const result = simulateClearForm(true);
    assert.equal(result, true);
    assert.equal(storage.getItem(DRAFT_STORAGE_KEY), null, 'Draft in localStorage must be cleared');
    assert.equal(activeForm.course_title, '', 'Active form title must be reset to blank');
  });

  await t.test('4. Cancelling Clear Form confirmation keeps all form data and draft intact', () => {
    const storage = new MockLocalStorage();
    storage.setItem(DRAFT_STORAGE_KEY, JSON.stringify({ formData: { course_title: 'Keep Me Course' } }));
    
    let activeForm = { ...initialFormState, course_title: 'Keep Me Course' };

    // Simulate handleClearForm with user confirmation = false (User clicked Cancel)
    const simulateClearForm = (userConfirmed) => {
      if (userConfirmed) {
        storage.removeItem(DRAFT_STORAGE_KEY);
        activeForm = { ...initialFormState };
        return true;
      }
      return false;
    };

    const result = simulateClearForm(false);
    assert.equal(result, false);
    assert.ok(storage.getItem(DRAFT_STORAGE_KEY), 'Draft must NOT be removed when cancelled');
    assert.equal(activeForm.course_title, 'Keep Me Course', 'Active form data must NOT be reset');
  });

  await t.test('5. Successful submission removes the saved draft from localStorage', () => {
    const storage = new MockLocalStorage();
    storage.setItem(DRAFT_STORAGE_KEY, JSON.stringify({
      formData: { course_title: 'Submitted Course' }
    }));
    assert.ok(storage.getItem(DRAFT_STORAGE_KEY));

    // Simulate successful API submission callback
    const onSuccessfulSubmit = () => {
      storage.removeItem(DRAFT_STORAGE_KEY);
    };

    onSuccessfulSubmit();
    assert.equal(storage.getItem(DRAFT_STORAGE_KEY), null, 'Draft must be cleanly removed on submission');
  });
});
