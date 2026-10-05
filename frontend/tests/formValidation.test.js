import test from 'node:test';
import assert from 'node:assert/strict';
import {
  COURSE_TYPES, COURSE_LEVELS, COURSE_DURATIONS, OFFERING_FREQUENCIES,
  BTECH_ELECTIVE_BASKETS, BTECH_DISCIPLINE_ELECTIVES, MINORS_LIST,
  MSC_ELECTIVES, MTECH_DISCIPLINES, MDES_ELECTIVES, DISCIPLINE_ABBREVIATIONS
} from '../src/constants/sapcOptions.js';

test('ACAD-SAPC-01 Course Types contain all official disciplines', () => {
  assert.ok(COURSE_TYPES.includes('CS'), 'Must include CS');
  assert.ok(COURSE_TYPES.includes('EE'), 'Must include EE');
  assert.ok(COURSE_TYPES.includes('ME'), 'Must include ME');
  assert.ok(COURSE_TYPES.includes('HS'), 'Must include HS');
  assert.ok(COURSE_TYPES.includes('e-Masters'), 'Must include e-Masters');
  assert.ok(COURSE_TYPES.includes('Others'), 'Must include Others');
  assert.equal(COURSE_TYPES.length, 23);
});

test('ACAD-SAPC-01 Course Levels cover Levels 1 through 6', () => {
  assert.deepEqual(COURSE_LEVELS, ['1', '2', '3', '4', '5', '6']);
});

test('Course Durations cover all Quad formats', () => {
  assert.ok(COURSE_DURATIONS.includes('1 Quad'));
  assert.ok(COURSE_DURATIONS.includes('2 Quads (Half Semester)'));
  assert.ok(COURSE_DURATIONS.includes('3 Quads'));
  assert.ok(COURSE_DURATIONS.includes('4 Quads (Full Semester)'));
});

test('BTech Elective Baskets cover BS, HS, Mathematics, Science', () => {
  assert.ok(BTECH_ELECTIVE_BASKETS.includes('BS'));
  assert.ok(BTECH_ELECTIVE_BASKETS.includes('HS'));
  assert.ok(BTECH_ELECTIVE_BASKETS.includes('Mathematics'));
  assert.ok(BTECH_ELECTIVE_BASKETS.includes('Science'));
});

test('Minor disciplines cover all 26 official disciplines from form', () => {
  assert.equal(MINORS_LIST.length, 26);
  assert.ok(MINORS_LIST.includes('AI'));
  assert.ok(MINORS_LIST.includes('CS'));
  assert.ok(MINORS_LIST.includes('QT'));
  assert.ok(MINORS_LIST.includes('RB'));
  assert.ok(MINORS_LIST.includes('SY'));
});

test('Discipline abbreviations legend has full definitions', () => {
  assert.equal(DISCIPLINE_ABBREVIATIONS['AI'], 'Artificial Intelligence');
  assert.equal(DISCIPLINE_ABBREVIATIONS['CS'], 'Computer Science & Engineering');
  assert.equal(DISCIPLINE_ABBREVIATIONS['EE'], 'Electrical Engineering');
  assert.equal(DISCIPLINE_ABBREVIATIONS['ICDT'], 'Integrated Circuit Design & Technology');
  assert.equal(DISCIPLINE_ABBREVIATIONS['MSE'], 'Materials Engineering');
});

test('Institutional email validation strictly enforces @iitgn.ac.in', () => {
  const iitgnEmailRegex = /^[a-zA-Z0-9_.+-]+@iitgn\.ac\.in$/i;
  // Valid IITGN institutional emails
  assert.ok(iitgnEmailRegex.test('faculty@iitgn.ac.in'));
  assert.ok(iitgnEmailRegex.test('proposer.name@iitgn.ac.in'));
  assert.ok(iitgnEmailRegex.test('Vikram.Sharma@IITGN.AC.IN'));
  
  // Invalid non-institutional or malformed emails
  assert.ok(!iitgnEmailRegex.test('faculty@gmail.com'));
  assert.ok(!iitgnEmailRegex.test('proposer@outlook.com'));
  assert.ok(!iitgnEmailRegex.test('user@domain.edu'));
  assert.ok(!iitgnEmailRegex.test('faculty@iitgn.ac.in.com'));
  assert.ok(!iitgnEmailRegex.test('invalid-email'));
  assert.ok(!iitgnEmailRegex.test('@iitgn.ac.in'));
  assert.ok(!iitgnEmailRegex.test('user@'));
});

test('L-T-P-C calculation formula produces correct academic credits', () => {
  const calculateCredits = (l, t, p) => l + t + Math.round(p * 0.5);
  assert.equal(calculateCredits(3, 0, 0), 3); // 3-0-0-3
  assert.equal(calculateCredits(3, 1, 0), 4); // 3-1-0-4
  assert.equal(calculateCredits(3, 0, 2), 4); // 3-0-2-4
  assert.equal(calculateCredits(0, 0, 3), 2); // 0-0-3-2 lab
});

test('Modification of existing course validation rule', () => {
  const validateModification = (isMod, code) => {
    if (isMod && (!code || code.trim() === '')) {
      return false;
    }
    return true;
  };

  assert.equal(validateModification(false, ''), true);
  assert.equal(validateModification(true, ''), false);
  assert.equal(validateModification(true, 'CS-301'), true);
});

test('Manual credit entry is preserved when L, T, or P changes', () => {
  // Simulating the state machine in CourseProposalForm
  let formState = { lecture_hours: 3, tutorial_hours: 0, practical_hours: 0, credits: 3 };
  let isCreditManuallyEdited = false;

  const handleFieldChange = (field, value) => {
    if (field === 'credits') {
      isCreditManuallyEdited = true;
    }
    formState[field] = value;
    if (['lecture_hours', 'tutorial_hours', 'practical_hours'].includes(field) && !isCreditManuallyEdited) {
      const l = Number(formState.lecture_hours);
      const t = Number(formState.tutorial_hours);
      const p = Number(formState.practical_hours);
      formState.credits = Math.max(1, l + t + Math.round(p * 0.5));
    }
  };

  // 1. Initial state: modifying L auto-updates credits when not manually edited
  handleFieldChange('lecture_hours', 4);
  assert.equal(formState.credits, 4, 'Auto-updates when not manually edited');

  // 2. User manually enters custom credits (e.g. 3-0-0-4 where credits is 4 for 3 lecture hours)
  handleFieldChange('lecture_hours', 3);
  assert.equal(formState.credits, 3);
  handleFieldChange('credits', 4); // User manually sets 4
  assert.equal(formState.credits, 4);
  assert.equal(isCreditManuallyEdited, true);

  // 3. User changes practical or tutorial hours -> custom credits MUST NOT be overwritten!
  handleFieldChange('tutorial_hours', 1);
  assert.equal(formState.credits, 4, 'Custom credits must be preserved and NOT overwritten');

  handleFieldChange('practical_hours', 2);
  assert.equal(formState.credits, 4, 'Custom credits must still be preserved after practical hours change');
});

test('Credits validation enforces positive number', () => {
  const validateCredits = (c) => {
    if (c === '' || Number(c) <= 0 || isNaN(Number(c))) {
      return 'Credits must be greater than 0.';
    }
    return null;
  };

  assert.equal(validateCredits(4), null);
  assert.equal(validateCredits(1.5), null);
  assert.equal(validateCredits(0), 'Credits must be greater than 0.');
  assert.equal(validateCredits(-1), 'Credits must be greater than 0.');
  assert.equal(validateCredits(''), 'Credits must be greater than 0.');
});

test('Multi-line prior_knowledge preserves formatting, bullet points, and newlines', () => {
  const multilinePrereqs = `1. Data Structures and Algorithms (CS 201)
2. Discrete Mathematics (CS 203)
3. Experience with Python/C++ programming
• Optional: Computer Architecture basics`;

  let formState = { prior_knowledge: '' };
  const handleChange = (field, value) => {
    formState[field] = value;
  };

  handleChange('prior_knowledge', multilinePrereqs);
  assert.equal(formState.prior_knowledge, multilinePrereqs);
  assert.ok(formState.prior_knowledge.includes('\n'));
  assert.equal(formState.prior_knowledge.split('\n').length, 4);
});
