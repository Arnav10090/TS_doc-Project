import React from 'react';

interface PlaceholderFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

const PlaceholderField: React.FC<PlaceholderFieldProps> = ({
  label,
  value,
  onChange,
  placeholder,
}) => {
  return (
    <div style={{ marginBottom: '16px' }}>
      <label
        style={{
          display: 'block',
          marginBottom: '6px',
          color: '#1A1A2E',
          fontSize: '14px',
          fontWeight: 500,
        }}
      >
        {label}
      </label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          width: '100%',
          padding: '8px 12px',
          border: '1px solid #E5E7EB',
          borderRadius: '4px',
          fontSize: '14px',
          fontFamily: 'IBM Plex Sans, sans-serif',
        }}
      />
    </div>
  );
};

export default PlaceholderField;
