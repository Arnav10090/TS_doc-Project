import { describe, expect, it } from 'vitest';
import { validateAndFixHeaders, RESPONSIBILITY_MATRIX_ROWS } from './templateContent';

describe('validateAndFixHeaders', () => {
  describe('Valid headers scenario', () => {
    it('should preserve data rows when headers are already valid', () => {
      // Arrange: Matrix with correct headers and some data rows
      const validMatrix = [
        ['No.', 'ITEM', 'Responsibility', 'Responsibility', 'Responsibility', 'Responsibility', 'Responsibility', 'Responsibility'],
        ['No.', 'ITEM', 'BD', 'BE', 'DD', 'SU', 'ER', 'COM'],
        ['(1)', 'Services', '', '', '', '', '', ''],
        ['-1', 'Project Execution', 'B/S', 'B/S', 'B/S', '-', '-', '-'],
        ['-2', 'Overall system design', 'S', 'S/B', 'S/B', '-', '-', '-'],
      ];

      // Act
      const result = validateAndFixHeaders(validMatrix);

      // Assert: Headers should match template
      expect(result[0]).toEqual(RESPONSIBILITY_MATRIX_ROWS[0]);
      expect(result[1]).toEqual(RESPONSIBILITY_MATRIX_ROWS[1]);
      
      // Assert: Data rows should be unchanged
      expect(result[2]).toEqual(['(1)', 'Services', '', '', '', '', '', '']);
      expect(result[3]).toEqual(['-1', 'Project Execution', 'B/S', 'B/S', 'B/S', '-', '-', '-']);
      expect(result[4]).toEqual(['-2', 'Overall system design', 'S', 'S/B', 'S/B', '-', '-', '-']);
      
      // Assert: Total length should be preserved
      expect(result.length).toBe(5);
    });

    it('should not modify the original input array when headers are valid', () => {
      // Arrange
      const originalMatrix = [
        ['No.', 'ITEM', 'Responsibility', 'Responsibility', 'Responsibility', 'Responsibility', 'Responsibility', 'Responsibility'],
        ['No.', 'ITEM', 'BD', 'BE', 'DD', 'SU', 'ER', 'COM'],
        ['1', 'Test', 'X', 'X', 'X', 'X', 'X', 'X'],
      ];
      const originalCopy = JSON.parse(JSON.stringify(originalMatrix));

      // Act
      validateAndFixHeaders(originalMatrix);

      // Assert: Original should be unchanged
      expect(originalMatrix).toEqual(originalCopy);
    });
  });

  describe('Corrupted headers scenario', () => {
    it('should replace corrupted first header row while preserving data', () => {
      // Arrange: Matrix with incorrect first header
      const corruptedMatrix = [
        ['Wrong', 'Header', 'Values', 'Here', 'Invalid', 'Data', 'Bad', 'Headers'],
        ['No.', 'ITEM', 'BD', 'BE', 'DD', 'SU', 'ER', 'COM'],
        ['(1)', 'Services', '', '', '', '', '', ''],
        ['-1', 'Project Execution', 'B/S', 'B/S', 'B/S', '-', '-', '-'],
      ];

      // Act
      const result = validateAndFixHeaders(corruptedMatrix);

      // Assert: First header should be replaced with template
      expect(result[0]).toEqual(RESPONSIBILITY_MATRIX_ROWS[0]);
      expect(result[0]).toEqual(['No.', 'ITEM', 'Responsibility', 'Responsibility', 'Responsibility', 'Responsibility', 'Responsibility', 'Responsibility']);
      
      // Assert: Second header should be replaced with template
      expect(result[1]).toEqual(RESPONSIBILITY_MATRIX_ROWS[1]);
      
      // Assert: Data rows should be preserved
      expect(result[2]).toEqual(['(1)', 'Services', '', '', '', '', '', '']);
      expect(result[3]).toEqual(['-1', 'Project Execution', 'B/S', 'B/S', 'B/S', '-', '-', '-']);
    });

    it('should replace corrupted second header row while preserving data', () => {
      // Arrange: Matrix with incorrect second header
      const corruptedMatrix = [
        ['No.', 'ITEM', 'Responsibility', 'Responsibility', 'Responsibility', 'Responsibility', 'Responsibility', 'Responsibility'],
        ['Bad', 'Second', 'Row', 'With', 'Wrong', 'Column', 'Names', 'Here'],
        ['(1)', 'Services', '', '', '', '', '', ''],
        ['-1', 'Project Execution', 'B/S', 'B/S', 'B/S', '-', '-', '-'],
      ];

      // Act
      const result = validateAndFixHeaders(corruptedMatrix);

      // Assert: Both headers should be replaced with template
      expect(result[0]).toEqual(RESPONSIBILITY_MATRIX_ROWS[0]);
      expect(result[1]).toEqual(RESPONSIBILITY_MATRIX_ROWS[1]);
      expect(result[1]).toEqual(['No.', 'ITEM', 'BD', 'BE', 'DD', 'SU', 'ER', 'COM']);
      
      // Assert: Data rows should be preserved
      expect(result[2]).toEqual(['(1)', 'Services', '', '', '', '', '', '']);
      expect(result[3]).toEqual(['-1', 'Project Execution', 'B/S', 'B/S', 'B/S', '-', '-', '-']);
    });

    it('should replace both corrupted headers while preserving multiple data rows', () => {
      // Arrange: Matrix with both headers corrupted
      const corruptedMatrix = [
        ['X', 'Y', 'Z', 'A', 'B', 'C', 'D', 'E'],
        ['1', '2', '3', '4', '5', '6', '7', '8'],
        ['(1)', 'Services', '', '', '', '', '', ''],
        ['-1', 'Project Execution', 'B/S', 'B/S', 'B/S', '-', '-', '-'],
        ['-2', 'Overall system design', 'S', 'S/B', 'S/B', '-', '-', '-'],
        ['', '', '', '', '', '', '', ''],
        ['(2)', 'SYSTEM Engineering', '', '', '', '', '', ''],
      ];

      // Act
      const result = validateAndFixHeaders(corruptedMatrix);

      // Assert: Headers replaced
      expect(result[0]).toEqual(RESPONSIBILITY_MATRIX_ROWS[0]);
      expect(result[1]).toEqual(RESPONSIBILITY_MATRIX_ROWS[1]);
      
      // Assert: All 5 data rows preserved
      expect(result.length).toBe(7);
      expect(result[2]).toEqual(['(1)', 'Services', '', '', '', '', '', '']);
      expect(result[3]).toEqual(['-1', 'Project Execution', 'B/S', 'B/S', 'B/S', '-', '-', '-']);
      expect(result[4]).toEqual(['-2', 'Overall system design', 'S', 'S/B', 'S/B', '-', '-', '-']);
      expect(result[5]).toEqual(['', '', '', '', '', '', '', '']);
      expect(result[6]).toEqual(['(2)', 'SYSTEM Engineering', '', '', '', '', '', '']);
    });
  });

  describe('Empty matrix scenario', () => {
    it('should return full template when matrix is empty array', () => {
      // Arrange
      const emptyMatrix: string[][] = [];

      // Act
      const result = validateAndFixHeaders(emptyMatrix);

      // Assert: Should return complete template
      expect(result).toEqual(RESPONSIBILITY_MATRIX_ROWS);
      expect(result.length).toBe(RESPONSIBILITY_MATRIX_ROWS.length);
      expect(result[0]).toEqual(RESPONSIBILITY_MATRIX_ROWS[0]);
      expect(result[1]).toEqual(RESPONSIBILITY_MATRIX_ROWS[1]);
    });

    it('should return full template when matrix is null', () => {
      // Act
      const result = validateAndFixHeaders(null as any);

      // Assert: Should return complete template
      expect(result).toEqual(RESPONSIBILITY_MATRIX_ROWS);
      expect(result.length).toBe(RESPONSIBILITY_MATRIX_ROWS.length);
    });

    it('should return full template when matrix is undefined', () => {
      // Act
      const result = validateAndFixHeaders(undefined as any);

      // Assert: Should return complete template
      expect(result).toEqual(RESPONSIBILITY_MATRIX_ROWS);
      expect(result.length).toBe(RESPONSIBILITY_MATRIX_ROWS.length);
    });

    it('should not modify the template constant when returning it', () => {
      // Arrange: Store original template
      const originalTemplate = JSON.parse(JSON.stringify(RESPONSIBILITY_MATRIX_ROWS));

      // Act
      const result = validateAndFixHeaders([]);
      result[2][0] = 'MODIFIED';  // Try to modify the returned array

      // Assert: Template constant should be unchanged
      expect(RESPONSIBILITY_MATRIX_ROWS).toEqual(originalTemplate);
    });
  });

  describe('Matrix with fewer than 2 rows scenario', () => {
    it('should insert template headers when matrix has only 1 row', () => {
      // Arrange: Matrix with single data row
      const singleRowMatrix = [
        ['(1)', 'Services', '', '', '', '', '', ''],
      ];

      // Act
      const result = validateAndFixHeaders(singleRowMatrix);

      // Assert: Should have headers from template plus no data rows
      // (because slice(2) on a 1-element array returns empty)
      expect(result.length).toBe(2);
      expect(result[0]).toEqual(RESPONSIBILITY_MATRIX_ROWS[0]);
      expect(result[1]).toEqual(RESPONSIBILITY_MATRIX_ROWS[1]);
    });

    it('should insert template headers when matrix has exactly 2 rows', () => {
      // Arrange: Matrix with two data rows (should be treated as headers to replace)
      const twoRowMatrix = [
        ['(1)', 'Services', '', '', '', '', '', ''],
        ['-1', 'Project Execution', 'B/S', 'B/S', 'B/S', '-', '-', '-'],
      ];

      // Act
      const result = validateAndFixHeaders(twoRowMatrix);

      // Assert: First two rows replaced, no data rows remain
      expect(result.length).toBe(2);
      expect(result[0]).toEqual(RESPONSIBILITY_MATRIX_ROWS[0]);
      expect(result[1]).toEqual(RESPONSIBILITY_MATRIX_ROWS[1]);
    });

    it('should insert template headers and preserve data when matrix has 3 rows', () => {
      // Arrange: Matrix with 3 rows (2 headers + 1 data)
      const threeRowMatrix = [
        ['Wrong', 'Header', '1', '', '', '', '', ''],
        ['Wrong', 'Header', '2', '', '', '', '', ''],
        ['(1)', 'Services', '', '', '', '', '', ''],
      ];

      // Act
      const result = validateAndFixHeaders(threeRowMatrix);

      // Assert: Headers replaced, third row preserved as data
      expect(result.length).toBe(3);
      expect(result[0]).toEqual(RESPONSIBILITY_MATRIX_ROWS[0]);
      expect(result[1]).toEqual(RESPONSIBILITY_MATRIX_ROWS[1]);
      expect(result[2]).toEqual(['(1)', 'Services', '', '', '', '', '', '']);
    });
  });

  describe('Edge cases', () => {
    it('should handle matrix with only header rows (no data rows)', () => {
      // Arrange: Matrix with exactly 2 rows
      const headersOnly = [
        ['No.', 'ITEM', 'Responsibility', 'Responsibility', 'Responsibility', 'Responsibility', 'Responsibility', 'Responsibility'],
        ['No.', 'ITEM', 'BD', 'BE', 'DD', 'SU', 'ER', 'COM'],
      ];

      // Act
      const result = validateAndFixHeaders(headersOnly);

      // Assert: Should return just the template headers
      expect(result.length).toBe(2);
      expect(result[0]).toEqual(RESPONSIBILITY_MATRIX_ROWS[0]);
      expect(result[1]).toEqual(RESPONSIBILITY_MATRIX_ROWS[1]);
    });

    it('should handle matrix with many data rows', () => {
      // Arrange: Large matrix with many data rows
      const largeMatrix = [
        ['Wrong', 'Headers', 'Here', '', '', '', '', ''],
        ['Wrong', 'Headers', 'Here', '', '', '', '', ''],
        ...Array.from({ length: 100 }, (_, i) => [`${i}`, `Item ${i}`, 'S', 'S', 'S', 'S', 'S', 'S']),
      ];

      // Act
      const result = validateAndFixHeaders(largeMatrix);

      // Assert: Headers replaced, all 100 data rows preserved
      expect(result.length).toBe(102);
      expect(result[0]).toEqual(RESPONSIBILITY_MATRIX_ROWS[0]);
      expect(result[1]).toEqual(RESPONSIBILITY_MATRIX_ROWS[1]);
      expect(result[2]).toEqual(['0', 'Item 0', 'S', 'S', 'S', 'S', 'S', 'S']);
      expect(result[101]).toEqual(['99', 'Item 99', 'S', 'S', 'S', 'S', 'S', 'S']);
    });

    it('should handle matrix with empty string data rows', () => {
      // Arrange: Matrix with empty data rows
      const matrixWithEmptyRows = [
        ['Old', 'Headers', '', '', '', '', '', ''],
        ['Old', 'Headers', '', '', '', '', '', ''],
        ['', '', '', '', '', '', '', ''],
        ['', '', '', '', '', '', '', ''],
        ['-1', 'Some Data', 'X', 'X', 'X', 'X', 'X', 'X'],
      ];

      // Act
      const result = validateAndFixHeaders(matrixWithEmptyRows);

      // Assert: Headers replaced, empty rows preserved
      expect(result.length).toBe(5);
      expect(result[0]).toEqual(RESPONSIBILITY_MATRIX_ROWS[0]);
      expect(result[1]).toEqual(RESPONSIBILITY_MATRIX_ROWS[1]);
      expect(result[2]).toEqual(['', '', '', '', '', '', '', '']);
      expect(result[3]).toEqual(['', '', '', '', '', '', '', '']);
      expect(result[4]).toEqual(['-1', 'Some Data', 'X', 'X', 'X', 'X', 'X', 'X']);
    });

    it('should handle matrix with variable column counts in data rows', () => {
      // Arrange: Matrix with inconsistent column counts
      const inconsistentMatrix = [
        ['Wrong', 'Headers'],
        ['Wrong', 'Headers'],
        ['(1)', 'Short Row'],
        ['-1', 'Normal Row', 'S', 'S', 'S', 'S', 'S', 'S'],
        ['-2', 'Very Long Row', 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'],
      ];

      // Act
      const result = validateAndFixHeaders(inconsistentMatrix);

      // Assert: Headers fixed, data rows preserved as-is (including inconsistencies)
      expect(result.length).toBe(5);
      expect(result[0]).toEqual(RESPONSIBILITY_MATRIX_ROWS[0]);
      expect(result[1]).toEqual(RESPONSIBILITY_MATRIX_ROWS[1]);
      expect(result[2]).toEqual(['(1)', 'Short Row']);
      expect(result[3]).toEqual(['-1', 'Normal Row', 'S', 'S', 'S', 'S', 'S', 'S']);
      expect(result[4]).toEqual(['-2', 'Very Long Row', 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J']);
    });
  });

  describe('Immutability and data integrity', () => {
    it('should return a new array instance, not modify input', () => {
      // Arrange
      const inputMatrix = [
        ['Wrong', 'Headers', 'Here', '', '', '', '', ''],
        ['Wrong', 'Headers', 'Here', '', '', '', '', ''],
        ['(1)', 'Services', '', '', '', '', '', ''],
      ];
      const inputReference = inputMatrix;

      // Act
      const result = validateAndFixHeaders(inputMatrix);

      // Assert: Result should be different instance
      expect(result).not.toBe(inputMatrix);
      expect(inputReference).toBe(inputMatrix); // Original reference unchanged
    });

    it('should create deep copies of header rows, not share references', () => {
      // Arrange
      const inputMatrix = [
        ['Old', 'Headers'],
        ['Old', 'Headers'],
        ['Data', 'Row'],
      ];

      // Act
      const result = validateAndFixHeaders(inputMatrix);
      result[0][0] = 'MODIFIED';

      // Assert: Template should be unchanged
      expect(RESPONSIBILITY_MATRIX_ROWS[0][0]).toBe('No.');
      expect(result[0][0]).toBe('MODIFIED');
    });

    it('should preserve exact data row values including special characters', () => {
      // Arrange: Data with special characters
      const specialCharMatrix = [
        ['Wrong', 'Headers'],
        ['Wrong', 'Headers'],
        ['(1)', 'Services & Support', 'B/S', 'B-S', 'S/B', '-', 'N/A', '✓'],
        ['-2', 'Item with "quotes"', '50%', '<empty>', 'null', 'undefined', '0', ''],
      ];

      // Act
      const result = validateAndFixHeaders(specialCharMatrix);

      // Assert: Special characters preserved exactly
      expect(result[2]).toEqual(['(1)', 'Services & Support', 'B/S', 'B-S', 'S/B', '-', 'N/A', '✓']);
      expect(result[3]).toEqual(['-2', 'Item with "quotes"', '50%', '<empty>', 'null', 'undefined', '0', '']);
    });
  });
});
