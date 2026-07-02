import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { convertImageToBase64, validateImageUpload } from '../../utils/customSectionUtils';
import ImageSubsectionEditor from './ImageSubsectionEditor';

vi.mock('../../utils/customSectionUtils', () => ({
  convertImageToBase64: vi.fn(),
  validateImageUpload: vi.fn(() => null),
}));

describe('ImageSubsectionEditor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(validateImageUpload).mockReturnValue(null);
  });

  it('appends multiple uploaded images to the subsection', async () => {
    const onChange = vi.fn();
    vi.mocked(convertImageToBase64)
      .mockResolvedValueOnce('data:image/png;base64,first')
      .mockResolvedValueOnce('data:image/jpeg;base64,second');

    render(<ImageSubsectionEditor data={{ images: [] }} onChange={onChange} />);

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const firstFile = new File(['first'], 'diagram-1.png', { type: 'image/png' });
    const secondFile = new File(['second'], 'diagram-2.jpg', { type: 'image/jpeg' });

    fireEvent.change(input, {
      target: {
        files: [firstFile, secondFile],
      },
    });

    await waitFor(() => {
      expect(onChange).toHaveBeenCalledWith({
        images: [
          {
            base64: 'data:image/png;base64,first',
            filename: 'diagram-1.png',
            mimeType: 'image/png',
            caption: 'diagram 1',
          },
          {
            base64: 'data:image/jpeg;base64,second',
            filename: 'diagram-2.jpg',
            mimeType: 'image/jpeg',
            caption: 'diagram 2',
          },
        ],
      });
    });
  });

  it('removes only the selected image from a multi-image subsection', () => {
    const onChange = vi.fn();

    render(
      <ImageSubsectionEditor
        data={{
          images: [
            {
              base64: 'data:image/png;base64,abc123',
              filename: 'diagram-1.png',
              mimeType: 'image/png',
            },
            {
              base64: 'data:image/jpeg;base64,def456',
              filename: 'diagram-2.jpg',
              mimeType: 'image/jpeg',
            },
          ],
        }}
        onChange={onChange}
      />,
    );

    fireEvent.click(screen.getAllByRole('button', { name: 'Remove Image' })[0]);

    expect(onChange).toHaveBeenCalledWith({
      images: [
        {
          base64: 'data:image/jpeg;base64,def456',
          filename: 'diagram-2.jpg',
          mimeType: 'image/jpeg',
        },
      ],
    });
  });
});
