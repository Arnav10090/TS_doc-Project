import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import RichTextEditor from './RichTextEditor';

describe('RichTextEditor', () => {
  it('renders all formatting buttons', () => {
    const mockOnChange = () => {};
    render(<RichTextEditor value="" onChange={mockOnChange} />);

    // Check that all buttons are present
    expect(screen.getByTitle('Bold')).toBeInTheDocument();
    expect(screen.getByTitle('Italic')).toBeInTheDocument();
    expect(screen.getByTitle('Underline')).toBeInTheDocument();
    expect(screen.getByTitle('Bullet List')).toBeInTheDocument();
    expect(screen.getByTitle('Numbered List')).toBeInTheDocument();
    expect(screen.getByTitle('Clear Formatting')).toBeInTheDocument();
  });

  it('buttons have correct text content', () => {
    const mockOnChange = () => {};
    render(<RichTextEditor value="" onChange={mockOnChange} />);

    expect(screen.getByText('B')).toBeInTheDocument();
    expect(screen.getByText('I')).toBeInTheDocument();
    expect(screen.getByText('U')).toBeInTheDocument();
    expect(screen.getByText('• List')).toBeInTheDocument();
    expect(screen.getByText('1. List')).toBeInTheDocument();
    expect(screen.getByText('Clear')).toBeInTheDocument();
  });

  it('buttons are clickable', () => {
    const mockOnChange = () => {};
    render(<RichTextEditor value="" onChange={mockOnChange} />);

    const boldButton = screen.getByTitle('Bold');
    const bulletListButton = screen.getByTitle('Bullet List');
    const numberedListButton = screen.getByTitle('Numbered List');
    const clearButton = screen.getByTitle('Clear Formatting');

    // Verify buttons can be clicked without errors
    fireEvent.click(boldButton);
    fireEvent.click(bulletListButton);
    fireEvent.click(numberedListButton);
    fireEvent.click(clearButton);
  });
});
