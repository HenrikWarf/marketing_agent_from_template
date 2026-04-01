import React from 'react';
import { LucideIcon } from 'lucide-react';
import '../styles/BlackboardCard.css';

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
        <div 
          className="card-header-icon"
          style={{ 
            backgroundColor: `${color}15`,
            color: color
          }}
        >
          <Icon size={24} />
        </div>
        <span className="card-title">{title}</span>
        {!isEmpty && (
          <div 
            className="status-indicator"
            style={{ 
              backgroundColor: color 
            }} 
          />
        )}
      </div>
      <div className="card-content">
        {isEmpty ? null : children}
      </div>
    </div>
  );
};

export default BlackboardCard;
