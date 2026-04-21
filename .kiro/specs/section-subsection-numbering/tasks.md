# Implementation Plan: Section and Subsection Numbering

## Overview

This implementation adds automatic hierarchical numbering to sections and subsections in the DocumentPreview component. The approach uses React useRef for counter management during render, with helper functions to format heading text. All existing styles and formatting are preserved while prepending numbers to heading content.

## Tasks

- [x] 1. Implement counter management and helper functions
  - Add `sectionCounter` and `subsectionCounter` refs using `useRef<number>(0)`
  - Create `resetCounters()` function to reset both counters to 0
  - Create `getNextSectionNumber()` function that increments section counter, resets subsection counter, and returns current section number
  - Create `getNextSubsectionNumber()` function that increments and returns subsection counter
  - Create `formatHeadingWithNumber(text: string, number: string): string` function that prepends number to heading text
  - Call `resetCounters()` at the start of the render function (before the return statement)
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 2.1, 2.2, 2.3, 3.2_

- [ ]* 1.1 Write unit tests for counter management and helper functions
  - Test `resetCounters()` sets counters to 0
  - Test `getNextSectionNumber()` increments correctly and resets subsection counter
  - Test `getNextSubsectionNumber()` increments correctly
  - Test `formatHeadingWithNumber()` with various inputs including empty strings
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 2.1, 2.2, 2.3_

- [x] 2. Update section headings (h1) with numbering
  - Update "EXECUTIVE SUMMARY" h1 to use `formatHeadingWithNumber('EXECUTIVE SUMMARY', \`${getNextSectionNumber()}.\`)`
  - Update "GENERAL OVERVIEW" h1 to use `formatHeadingWithNumber('GENERAL OVERVIEW', \`${getNextSectionNumber()}.\`)`
  - Update "OFFERINGS" h1 to use `formatHeadingWithNumber('OFFERINGS', \`${getNextSectionNumber()}.\`)`
  - Update "TECHNOLOGY STACK" h1 to use `formatHeadingWithNumber('TECHNOLOGY STACK', \`${getNextSectionNumber()}.\`)`
  - Update "SCHEDULE" h1 to use `formatHeadingWithNumber('SCHEDULE', \`${getNextSectionNumber()}.\`)`
  - Update "SCOPE OF SUPPLY" h1 to use `formatHeadingWithNumber('SCOPE OF SUPPLY', \`${getNextSectionNumber()}.\`)`
  - Update "DISCLAIMER" h1 to use `formatHeadingWithNumber('DISCLAIMER', \`${getNextSectionNumber()}.\`)`
  - Update "COMPLIMENTARY PROOF OF CONCEPTS" h1 to use `formatHeadingWithNumber('COMPLIMENTARY PROOF OF CONCEPTS', \`${getNextSectionNumber()}.\`)`
  - Ensure cover page, revision history, and table of contents h1 elements are NOT modified
  - _Requirements: 1.1, 1.2, 1.3, 1.5, 3.1, 3.3, 4.1, 4.2, 4.3, 4.4, 4.5, 5.2_

- [x] 3. Update subsection headings (h2) with hierarchical numbering
  - [x] 3.1 Update "GENERAL OVERVIEW" subsections
    - Update "INTRODUCTION" h2 to use `formatHeadingWithNumber('INTRODUCTION', \`${sectionCounter.current}.${getNextSubsectionNumber()}\`)`
    - Update "ABBREVIATIONS USED" h2 to use `formatHeadingWithNumber('ABBREVIATIONS USED', \`${sectionCounter.current}.${getNextSubsectionNumber()}\`)`
    - Update "PROCESS FLOW" h2 to use `formatHeadingWithNumber('PROCESS FLOW', \`${sectionCounter.current}.${getNextSubsectionNumber()}\`)`
    - Update "OVERVIEW OF {SolutionName}" h2 to use `formatHeadingWithNumber(\`OVERVIEW OF \${solutionName || '{SolutionName}'}\`, \`${sectionCounter.current}.${getNextSubsectionNumber()}\`)`
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 3.1, 3.3, 4.1, 4.2, 4.3, 4.4, 4.5_

  - [x] 3.2 Update "OFFERINGS" subsections
    - Update "DESIGN SCOPE OF WORK" h2 to use hierarchical numbering
    - Update "REMOTE SUPPORT SYSTEM" h2 to use hierarchical numbering
    - Update "DOCUMENTATION CONTROL" h2 to use hierarchical numbering
    - Update "CUSTOMER TRAINING" h2 to use hierarchical numbering
    - Update "SYSTEM CONFIGURATION" h2 to use hierarchical numbering
    - Update "FAT CONDITION" h2 to use hierarchical numbering
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 3.1, 3.3, 4.1, 4.2, 4.3, 4.4, 4.5_

  - [x] 3.3 Update "TECHNOLOGY STACK" subsections
    - Update "HARDWARE SPECIFICATIONS" h2 to use hierarchical numbering
    - Update "SOFTWARE SPECIFICATIONS" h2 to use hierarchical numbering
    - Update "THIRD PARTY SOFTWARE" h2 to use hierarchical numbering
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 3.1, 3.3, 4.1, 4.2, 4.3, 4.4, 4.5_

  - [x] 3.4 Update "SCHEDULE" subsections
    - Update "OVERALL GANTT CHART" h2 to use hierarchical numbering
    - Update "SHUTDOWN GANTT CHART" h2 to use hierarchical numbering
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 3.1, 3.3, 4.1, 4.2, 4.3, 4.4, 4.5_

  - [x] 3.5 Update "SCOPE OF SUPPLY" subsections
    - Update "SCOPE OF SUPPLY DEFINITIONS" h2 to use hierarchical numbering
    - Update "DIVISION OF ENGINEERING..." h2 to use hierarchical numbering
    - Update "VALUE ADDITION" h2 to use hierarchical numbering
    - Update "WORK COMPLETION CERTIFICATE" h2 to use hierarchical numbering
    - Update "BUYER OBLIGATIONS" h2 to use hierarchical numbering
    - Update "EXCLUSION LIST" h2 to use hierarchical numbering
    - Update "BUYER PREREQUISITES" h2 to use hierarchical numbering
    - Update "BINDING CONDITIONS" h2 to use hierarchical numbering
    - Update "CYBERSECURITY DISCLAIMER" h2 to use hierarchical numbering
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 3.1, 3.3, 4.1, 4.2, 4.3, 4.4, 4.5_

  - [x] 3.6 Update "DISCLAIMER" subsections (dynamically rendered)
    - Update the dynamic disclaimer subsection rendering to use hierarchical numbering
    - Apply numbering to each disclaimer section h2 element
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 3.1, 3.3, 4.1, 4.2, 4.3, 4.4, 4.5_

- [ ]* 4. Write integration tests for complete numbering sequence
  - Test that first section after table of contents is numbered "1."
  - Test that subsections are numbered correctly (e.g., "2.1", "2.2", "2.3")
  - Test that subsection counter resets when new section begins (e.g., section 3 starts with "3.1")
  - Test that cover page, revision history, and table of contents are not numbered
  - Test that all 8 main sections are numbered sequentially (1-8)
  - Test that numbering persists correctly across component re-renders
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 2.1, 2.2, 2.3, 2.4, 3.1, 3.2, 3.3, 5.1, 5.2_

- [ ] 5. Checkpoint - Verify numbering in browser
  - Run the development server and navigate to a project's editor page
  - Verify all sections are numbered sequentially starting from 1
  - Verify subsections use hierarchical numbering (X.Y format)
  - Verify cover page, revision history, and table of contents have no numbering
  - Verify numbering matches existing heading styles (color, font, size)
  - Verify spacing between number and text is consistent
  - Ensure all tests pass, ask the user if questions arise

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- The implementation preserves all existing heading styles and formatting
- Counter management uses React useRef to avoid triggering unnecessary re-renders
- Numbering is calculated during render to ensure consistency with document order
