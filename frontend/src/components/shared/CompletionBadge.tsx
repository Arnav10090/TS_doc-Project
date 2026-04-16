import React from 'react';

interface CompletionBadgeProps {
  status: 'complete' | 'visited' | 'not_started';
}

const CompletionBadge: React.FC<CompletionBadgeProps> = ({ status }) => {
  const getBadgeEmoji = () => {
    switch (status) {
      case 'complete':
        return '✅';
      case 'visited':
        return '🟡';
      case 'not_started':
        return '⚪';
      default:
        return '⚪';
    }
  };

  return (
    <span
      style={{
        fontSize: '16px',
        display: 'inline-block',
      }}
      title={status.replace('_', ' ')}
    >
      {getBadgeEmoji()}
    </span>
  );
};

export default CompletionBadge;
