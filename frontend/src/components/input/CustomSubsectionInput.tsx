import React, { useEffect, useState } from 'react';
import {
  CustomSubsection,
  SubsectionContentType,
  TableData,
  ImageData,
  ParagraphData,
} from '../../types/customSections';
import TableSubsectionEditor from './TableSubsectionEditor';
import ImageSubsectionEditor from './ImageSubsectionEditor';
import ParagraphSubsectionEditor from './ParagraphSubsectionEditor';

interface CustomSubsectionInputProps {
  parentSectionKey: string;
  subsection: CustomSubsection;
  onUpdate: (subsection: CustomSubsection) => void;
}

const CustomSubsectionInput: React.FC<CustomSubsectionInputProps> = ({
  subsection,
  onUpdate,
}) => {
  const [name, setName] = useState(subsection.name);

  useEffect(() => {
    setName(subsection.name);
  }, [subsection.name]);

  const containerStyle: React.CSSProperties = {
    padding: '16px',
    borderTop: '1px solid #E5E7EB',
  };

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: '14px',
    fontWeight: 600,
    color: '#1A1A2E',
    marginBottom: '8px',
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '10px 12px',
    border: '1px solid #D1D5DB',
    borderRadius: '4px',
    fontSize: '14px',
    fontFamily: 'inherit',
    marginBottom: '16px',
  };

  const selectStyle: React.CSSProperties = {
    width: '100%',
    padding: '10px 12px',
    border: '1px solid #D1D5DB',
    borderRadius: '4px',
    fontSize: '14px',
    fontFamily: 'inherit',
    marginBottom: '16px',
    backgroundColor: '#FFFFFF',
    cursor: 'pointer',
  };

  const handleNameChange = (newName: string) => {
    setName(newName);
    onUpdate({
      ...subsection,
      name: newName,
    });
  };

  const handleContentTypeChange = (newType: SubsectionContentType) => {
    let newData;
    switch (newType) {
      case 'table':
        newData = {
          tables: [{ columns: ['Column 1'], rows: [{ 'Column 1': '' }] }],
        } as TableData;
        break;
      case 'image':
        newData = { images: [] } as ImageData;
        break;
      case 'paragraph':
        newData = { paragraphs: [{ html: '' }] } as ParagraphData;
        break;
    }

    onUpdate({
      ...subsection,
      contentType: newType,
      data: newData,
    });
  };

  const handleDataChange = (newData: TableData | ImageData | ParagraphData) => {
    onUpdate({
      ...subsection,
      data: newData,
    });
  };

  return (
    <div style={containerStyle}>
      <label style={labelStyle}>Subsection Name</label>
      <input
        type="text"
        style={inputStyle}
        value={name}
        onChange={(e) => handleNameChange(e.target.value)}
        placeholder="Enter subsection name"
        onFocus={(e) => {
          e.currentTarget.style.borderColor = '#E60012';
          e.currentTarget.style.outline = 'none';
        }}
        onBlur={(e) => {
          e.currentTarget.style.borderColor = '#D1D5DB';
        }}
      />

      <label style={labelStyle}>Content Type</label>
      <select
        style={selectStyle}
        value={subsection.contentType}
        onChange={(e) => handleContentTypeChange(e.target.value as SubsectionContentType)}
        onFocus={(e) => {
          e.currentTarget.style.borderColor = '#E60012';
          e.currentTarget.style.outline = 'none';
        }}
        onBlur={(e) => {
          e.currentTarget.style.borderColor = '#D1D5DB';
        }}
      >
        <option value="table">Table</option>
        <option value="image">Image</option>
        <option value="paragraph">Paragraph</option>
      </select>

      <div style={{ marginTop: '16px' }}>
        {subsection.contentType === 'table' && (
          <TableSubsectionEditor
            data={subsection.data as TableData}
            onChange={handleDataChange}
          />
        )}
        {subsection.contentType === 'image' && (
          <ImageSubsectionEditor
            data={subsection.data as ImageData}
            onChange={handleDataChange}
          />
        )}
        {subsection.contentType === 'paragraph' && (
          <ParagraphSubsectionEditor
            data={subsection.data as ParagraphData}
            onChange={handleDataChange}
          />
        )}
      </div>
    </div>
  );
};

export default CustomSubsectionInput;
