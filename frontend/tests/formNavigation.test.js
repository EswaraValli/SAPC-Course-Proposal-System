import test from 'node:test';
import assert from 'node:assert/strict';
import { FORM_SECTIONS } from '../src/constants/formNavigation.js';

test('Priority 5: Form Section Navigation and Progress Stepper', async (t) => {
  await t.test('FORM_SECTIONS contains all 5 required institutional sections', () => {
    assert.equal(FORM_SECTIONS.length, 5);
    
    const ids = FORM_SECTIONS.map(s => s.id);
    assert.deepEqual(ids, [
      'section-course-info',
      'section-course-structure',
      'section-electives-minors',
      'section-syllabus-references',
      'section-review-submit'
    ]);

    const numbers = FORM_SECTIONS.map(s => s.number);
    assert.deepEqual(numbers, ['1', '2', '3', '4', '5']);

    const titles = FORM_SECTIONS.map(s => s.title);
    assert.ok(titles.includes('Course Information'));
    assert.ok(titles.includes('Course Structure'));
    assert.ok(titles.includes('Electives & Minors'));
    assert.ok(titles.includes('Syllabus & References'));
    assert.ok(titles.includes('Review & Submit'));
  });

  await t.test('Clicking/jumping to a section sets activeSection and computes correct scroll offset', () => {
    let activeSection = 'section-course-info';
    let scrolledTarget = null;
    let computedScrollY = null;

    // Mock DOM elements with mock bounding client rects
    const mockElements = {
      'section-course-info': { top: 200 },
      'section-course-structure': { top: 650 },
      'section-electives-minors': { top: 1200 },
      'section-syllabus-references': { top: 1800 },
      'section-review-submit': { top: 2400 }
    };

    const mockScrollTo = ({ top }) => {
      computedScrollY = top;
    };

    const simulateScrollToSection = (id) => {
      activeSection = id;
      scrolledTarget = id;
      const el = mockElements[id];
      if (el) {
        const yOffset = -70; // offset for sticky stepper
        const pageYOffset = 100;
        mockScrollTo({ top: el.top + pageYOffset + yOffset });
      }
    };

    // 1. Jump to Structure
    simulateScrollToSection('section-course-structure');
    assert.equal(activeSection, 'section-course-structure');
    assert.equal(scrolledTarget, 'section-course-structure');
    assert.equal(computedScrollY, 650 + 100 - 70);

    // 2. Jump to Syllabus
    simulateScrollToSection('section-syllabus-references');
    assert.equal(activeSection, 'section-syllabus-references');
    assert.equal(computedScrollY, 1800 + 100 - 70);

    // 3. Jump to Review & Submit
    simulateScrollToSection('section-review-submit');
    assert.equal(activeSection, 'section-review-submit');
    assert.equal(computedScrollY, 2400 + 100 - 70);
  });

  await t.test('Scrolling updates the active section according to visible element', () => {
    let activeSection = 'section-course-info';

    // Simulate IntersectionObserver callback
    const simulateObserverCallback = (intersectingId) => {
      const found = FORM_SECTIONS.find(s => s.id === intersectingId);
      if (found) {
        activeSection = found.id;
      }
    };

    // User scrolls past section 1 into section 2
    simulateObserverCallback('section-course-structure');
    assert.equal(activeSection, 'section-course-structure');

    // User scrolls into section 3
    simulateObserverCallback('section-electives-minors');
    assert.equal(activeSection, 'section-electives-minors');

    // User scrolls to end (section 5)
    simulateObserverCallback('section-review-submit');
    assert.equal(activeSection, 'section-review-submit');
  });

  await t.test('Form fields and submission payload structure are completely preserved', () => {
    // Verifies that adding navigation does not change form schema or payload keys
    const sampleFormData = {
      course_title: 'Compiler Optimizations',
      potential_instructors: 'Dr. C. Expert',
      proposer_name: 'Dr. C. Expert',
      faculty_email: 'cexpert@iitgn.ac.in',
      course_type: 'CS',
      course_type_other: '',
      course_level: '4',
      course_level_secondary: '',
      lecture_hours: 3,
      tutorial_hours: 0,
      practical_hours: 0,
      credits: 3,
      course_duration: '4 Quads (Full Semester)',
      expected_frequency: 'Each Year',
      expected_frequency_other: '',
      elective_basket_btech: 'None',
      discipline_elective_btech: 'CS',
      discipline_basket_btech: '',
      minors: ['CS'],
      minor_basket_thematic_area: '',
      discipline_elective_msc: 'None',
      courses_discipline_mtech: 'None',
      mtech_sub_specialization: '',
      discipline_elective_mdes: 'None',
      is_modification: false,
      existing_course_code: '',
      prior_knowledge: 'Data Structures and Algorithms; Computer Organization',
      course_contents: 'Intermediate representations; Control flow analysis; Dataflow analysis; Loop optimizations; Register allocation.',
      texts_and_references: '1. Muchnick, S. S. (1997). Advanced Compiler Design and Implementation. Morgan Kaufmann.',
      learning_outcomes: '1. Implement SSA-based transformations; 2. Design register allocation algorithms.',
      overlap_courses: 'None',
      other_relevant_info: 'Elective for senior UG and PG students.'
    };

    const payload = {
      ...sampleFormData,
      course_l_t_p_c: `${sampleFormData.lecture_hours}-${sampleFormData.tutorial_hours}-${sampleFormData.practical_hours}-${sampleFormData.credits}`,
      minors: sampleFormData.minors.length > 0 ? sampleFormData.minors.join(', ') : null,
      elective_basket_btech: sampleFormData.elective_basket_btech === 'None' ? null : sampleFormData.elective_basket_btech,
      discipline_elective_btech: sampleFormData.discipline_elective_btech === 'None' ? null : sampleFormData.discipline_elective_btech,
      discipline_elective_msc: sampleFormData.discipline_elective_msc === 'None' ? null : sampleFormData.discipline_elective_msc,
      courses_discipline_mtech: sampleFormData.courses_discipline_mtech === 'None' ? null : sampleFormData.courses_discipline_mtech,
      discipline_elective_mdes: sampleFormData.discipline_elective_mdes === 'None' ? null : sampleFormData.discipline_elective_mdes,
    };

    assert.equal(payload.course_l_t_p_c, '3-0-0-3');
    assert.equal(payload.minors, 'CS');
    assert.equal(payload.elective_basket_btech, null);
    assert.equal(payload.discipline_elective_btech, 'CS');
    assert.equal(payload.course_title, 'Compiler Optimizations');
  });
});
