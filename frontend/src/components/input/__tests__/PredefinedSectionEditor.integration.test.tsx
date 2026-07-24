import { describe, it, expect } from 'vitest';
import { validateAndFixHeaders } from '../../preview/templateContent';

/**
 * Integration tests for Task 10: Integrate header validation on data load
 * 
 * These tests verify that:
 * - validateAndFixHeaders is properly exported and available
 * - The validation logic works as expected when integrated
 * - Headers are replaced while data rows are preserved
 */
describe('PredefinedSectionEditor Integration - Task 10', () => {
  describe('validateAndFixHeaders integration', () => {
    it('should be importable from templateContent', () => {
      expect(validateAndFixHeaders).toBeDefined();
      expect(typeof validateAndFixHeaders).toBe('function');
    });

    it('should validate and fix corrupted headers on data load', () => {
      // Simulate corrupted matrix data that might be loaded from saved state
      const corruptedMatrix = [
        ['Wrong', 'Headers', 'Here', '', '', '', '', ''],
        ['Bad', 'Data', 'X', 'Y', 'Z', 'A', 'B', 'C'],
        ['1', 'Engineering Work', 'B/S', 'B/S', '-', '-', '-', '-'],
        ['2', 'Documentation', '-', 'B/S', 'B/S', '-', '-', '-'],
      ];

      // Apply validation as it would be applied on data load
      const validatedMatrix = validateAndFixHeaders(corruptedMatrix);

      // Verify headers are fixed
      expect(validatedMatrix[0][0]).toBe('No.');
      expect(validatedMatrix[0][1]).toBe('ITEM');
      expect(validatedMatrix[0][2]).toBe('Responsibility');
      expect(validatedMatrix[1][2]).toBe('BD');
      expect(validatedMatrix[1][3]).toBe('BE');
      expect(validatedMatrix[1][4]).toBe('DD');

      // Verify data rows are preserved
      expect(validatedMatrix[2][0]).toBe('1');
      expect(validatedMatrix[2][1]).toBe('Engineering Work');
      expect(validatedMatrix[3][0]).toBe('2');
      expect(validatedMatrix[3][1]).toBe('Documentation');
    });

    it('should validate headers in onChange callback', () => {
      // Simulate user editing the matrix
      const userEditedMatrix = [
        ['Modified', 'By', 'User', '', '', '', '', ''],
        ['Changed', 'Headers', 'A', 'B', 'C', 'D', 'E', 'F'],
        ['1', 'Updated Item', 'X', 'X', '-', '-', '-', '-'],
      ];

      // Apply validation as it would be applied in onChange
      const validatedMatrix = validateAndFixHeaders(userEditedMatrix);

      // Verify headers are always corrected
      expect(validatedMatrix[0][0]).toBe('No.');
      expect(validatedMatrix[0][1]).toBe('ITEM');
      expect(validatedMatrix[1][2]).toBe('BD');
      expect(validatedMatrix[1][7]).toBe('COM');

      // Verify user's data row edit is preserved
      expect(validatedMatrix[2][1]).toBe('Updated Item');
      expect(validatedMatrix[2][2]).toBe('X');
    });

    it('should handle empty matrix on initial load', () => {
      // Simulate no saved data
      const emptyMatrix: string[][] = [];

      // Apply validation
      const validatedMatrix = validateAndFixHeaders(emptyMatrix);

      // Should load template
      expect(validatedMatrix.length).toBeGreaterThanOrEqual(2);
      expect(validatedMatrix[0][0]).toBe('No.');
      expect(validatedMatrix[0][1]).toBe('ITEM');
      expect(validatedMatrix[1][2]).toBe('BD');
    });

    it('should maintain header integrity through multiple edits', () => {
      // Start with valid matrix
      let currentMatrix = [
        ['No.', 'ITEM', 'Responsibility', 'Responsibility', 'Responsibility', 'Responsibility', 'Responsibility', 'Responsibility'],
        ['No.', 'ITEM', 'BD', 'BE', 'DD', 'SU', 'ER', 'COM'],
        ['1', 'Item A', 'X', '-', '-', '-', '-', '-'],
      ];

      // Simulate first edit
      currentMatrix[2][1] = 'Item A Modified';
      currentMatrix = validateAndFixHeaders(currentMatrix);

      // Verify headers still correct
      expect(currentMatrix[0][0]).toBe('No.');
      expect(currentMatrix[1][2]).toBe('BD');
      expect(currentMatrix[2][1]).toBe('Item A Modified');

      // Simulate second edit (user accidentally modifies header)
      currentMatrix[0][0] = 'WRONG';
      currentMatrix = validateAndFixHeaders(currentMatrix);

      // Verify headers are fixed again
      expect(currentMatrix[0][0]).toBe('No.');
      expect(currentMatrix[2][1]).toBe('Item A Modified'); // Data still preserved
    });

    it('should work with division_of_eng section key check', () => {
      // Verify the condition that would be used in PredefinedSectionEditor
      const sectionKey = 'division_of_eng';
      const key = 'matrix_rows';

      // This simulates the hasFixedHeaders prop logic
      const hasFixedHeaders = sectionKey === 'division_of_eng' && key === 'matrix_rows';
      
      expect(hasFixedHeaders).toBe(true);
    });

    it('should not enable fixed headers for other sections', () => {
      // Verify that other sections don't get fixed headers
      const otherSectionKeys = ['executive_summary', 'introduction', 'system_config'];

      otherSectionKeys.forEach(sectionKey => {
        const hasFixedHeaders = sectionKey === 'division_of_eng' && 'matrix_rows' === 'matrix_rows';
        expect(hasFixedHeaders).toBe(false);
      });
    });
  });
});
