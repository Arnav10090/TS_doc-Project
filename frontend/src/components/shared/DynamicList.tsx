import React from 'react';

interface DynamicListProps {
  items: string[];
  onChange: (items: string[]) => void;
  addButtonLabel?: string;
  minItems?: number;
  itemStyle?: (index: number) => React.CSSProperties | undefined;
}

const DynamicList: React.FC<DynamicListProps> = ({
  items,
  onChange,
  addButtonLabel = 'Add Item',
  minItems = 0,
  itemStyle,
}) => {
  // Show at least one empty input field so the user always sees a text box
  // (important for UX and for AI-imported content visibility)
  const showPlaceholder = items.length === 0;
  const displayItems = showPlaceholder ? [''] : items;

  const handleItemChange = (index: number, value: string) => {
    if (showPlaceholder) {
      // First keystroke into the placeholder — commit it as a real item
      onChange([value]);
      return;
    }
    const updatedItems = [...items];
    updatedItems[index] = value;
    onChange(updatedItems);
  };

  const handleAddItem = () => {
    onChange([...items, '']);
  };

  const handleDeleteItem = (index: number) => {
    if (showPlaceholder) return; // nothing real to delete
    if (items.length > minItems) {
      const updatedItems = items.filter((_, i) => i !== index);
      onChange(updatedItems);
    }
  };

  const effectiveMinItems = Math.max(minItems, showPlaceholder ? 1 : 0);

  return (
    <div className="dynamic-list" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {displayItems.map((item, index) => {
        const customStyle = itemStyle ? itemStyle(index) : undefined;
        return (
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
                ...(customStyle || {}),
              }}
              placeholder={`Item ${index + 1}`}
            />
            <button
              type="button"
              onClick={() => handleDeleteItem(index)}
              disabled={displayItems.length <= effectiveMinItems}
              style={{
                padding: '8px 12px',
                border: 'none',
                backgroundColor: 'transparent',
                color: displayItems.length <= effectiveMinItems ? '#D1D5DB' : '#E60012',
                cursor: displayItems.length <= effectiveMinItems ? 'not-allowed' : 'pointer',
                fontSize: '18px',
              }}
              title="Delete item"
            >
              ✕
            </button>
          </div>
        );
      })}
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
