import React from 'react';
import { LucideIcon } from 'lucide-react';
import '../styles/Dashboard.css';

interface PlaceholderCardProps {
  title: string;
  icon: LucideIcon;
  color: string;
  message: string;
}

const PlaceholderCard: React.FC<PlaceholderCardProps> = ({ title, icon: Icon, color, message }) => {
  return (
    <div className="placeholder-card">
      <div className="placeholder-icon-box" style={{ color: color }}>
        <Icon size={48} strokeWidth={1.5} />
      </div>
      <h3>{title}</h3>
      <p>{message}</p>
    </div>
  );
};

export default PlaceholderCard;
