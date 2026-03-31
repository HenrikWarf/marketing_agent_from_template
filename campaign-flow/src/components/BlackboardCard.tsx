import React from 'react';
import { LucideIcon } from 'lucide-react';

interface BlackboardCardProps {
  title: string;
  icon: LucideIcon;
  color: string;
  isEmpty: boolean;
  children: React.ReactNode;
}

const BlackboardCard: React.FC<BlackboardCardProps> = ({ title, icon: Icon, color, isEmpty, children }) => {
  return (
    <div className="card">
      <div className="card-header">
        <div style={{ 
          padding: '8px', 
          borderRadius: '12px', 
          backgroundColor: `${color}15`,
          color: color
        }}>
          <Icon size={24} />
        </div>
        <span className="card-title">{title}</span>
        {!isEmpty && (
          <div style={{ 
            marginLeft: 'auto', 
            width: '8px', 
            height: '8px', 
            borderRadius: '50%', 
            backgroundColor: color 
          }} />
        )}
      </div>
      <div className="card-content">
        {isEmpty ? (
          <div style={{ 
            height: '100%', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            color: 'var(--google-gray)',
            fontSize: '0.9rem',
            fontStyle: 'italic'
          }}>
            Waiting for data...
          </div>
        ) : children}
      </div>
    </div>
  );
};

export default BlackboardCard;
