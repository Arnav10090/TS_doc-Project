import React from 'react';

interface DynamicListProps {
  items: string[];
  onChange: (items: string[]) => void;
  addButtonLabel?: string;
  minItems?: number;
}

const DynamicList: React.FC<DynamicListProps> = ({
  items,
  onChange,
  addButtonLabel = 'Add Item',
  minItems = 0,
}) => {
  const handleItemChange = (index: number, value: string) => {
    const updatedItems = [...items];
    updatedItems[index] = value;
    onChange(updatedItems);
  };

  const handleAddItem = () => {
    onChange([...items, '']);
  };

  const handleDeleteItem = (index: number) => {
    if (items.length > minItems) {
      const updatedItems = items.filter((_, i) => i !== index);
      onChange(updatedItems);
    }
  };

  return (
    <div className="dynamic-list" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {items.map((item, index) => (
        <div
          key={index}
          style={{
            display: 'flex',
            gap: '8px',
            alignItems: 'center',
          }}
        >
          <input
            type="text"
            value={item}
            onChange={(e) => handleItemChange(index, e.target.value)}
            style={{
              flex: 1,
              padding: '8px 12px',
              border: '1px solid #E5E7EB',
              borderRadius: '4px',
              fontSize: '14px',
            }}
            placeholder={`Item ${index + 1}`}
          />
          <button
            type="button"
            onClick={() => handleDeleteItem(index)}
            disabled={items.length <= minItems}
            style={{
              padding: '8px 12px',
              border: 'none',
              backgroundColor: 'transparent',
              color: items.length <= minItems ? '#D1D5DB' : '#E60012',
              cursor: items.length <= minItems ? 'not-allowed' : 'pointer',
              fontSize: '18px',
            }}
            title="Delete item"
          >
            ✕
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={handleAddItem}
        style={{
          padding: '8px 16px',
          border: '1px solid #E5E7EB',
          borderRadius: '4px',
          backgroundColor: '#FFFFFF',
          color: '#E60012',
          cursor: 'pointer',
          fontWeight: 500,
          alignSelf: 'flex-start',
        }}
      >
        + {addButtonLabel}
      </button>
    </div>
  );
};

export default DynamicList;
