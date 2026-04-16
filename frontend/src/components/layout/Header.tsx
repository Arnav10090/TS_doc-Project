import React from 'react';
import { Link } from 'react-router-dom';
import { useProjectStore } from '../../store/project.store';

const Header: React.FC = () => {
  const solutionName = useProjectStore((state) => state.solutionName);

  return (
    <header
      style={{
        height: '56px',
        backgroundColor: '#FFFFFF',
        borderBottom: '1px solid #E5E7EB',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 24px',
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 100,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
        <Link
          to="/"
          style={{
            textDecoration: 'none',
            color: '#6B7280',
            fontSize: '14px',
            fontWeight: 500,
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
          }}
        >
          <span>←</span>
          <span>Back to Home</span>
        </Link>
        
        <div
          style={{
            height: '32px',
            width: '1px',
            backgroundColor: '#E5E7EB',
          }}
        />
        
        <h1
          style={{
            fontSize: '24px',
            fontWeight: 700,
            color: '#E60012',
            margin: 0,
            letterSpacing: '0.5px',
          }}
        >
          HITACHI
        </h1>
      </div>

      {solutionName && (
        <div
          style={{
            fontSize: '16px',
            fontWeight: 600,
            color: '#1A1A2E',
          }}
        >
          {solutionName}
        </div>
      )}
    </header>
  );
};

export default Header;
