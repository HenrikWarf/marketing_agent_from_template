import React, { useState, useEffect } from 'react';
import { LucideIcon, ChevronRight } from 'lucide-react';
import '../styles/BlackboardCard.css';

interface BlackboardCardProps {
  title: string;
  icon: LucideIcon;
  color: string;
  isEmpty: boolean;
  children: React.ReactNode;
  description?: string;
}

const BlackboardCard: React.FC<BlackboardCardProps> = ({ title, icon: Icon, color, isEmpty, children, description }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  // Auto-expand when data first arrives
  useEffect(() => {
    if (!isEmpty) {
      if (!isExpanded) setIsExpanded(true);
      setLastUpdated(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    }
  }, [isEmpty, isExpanded]);

  const toggleExpand = () => {
    if (isEmpty) return; // Prevent expanding empty cards in some views
    setIsExpanded(!isExpanded);
  };

  return (
    <div 
      className={`card ${isExpanded ? 'expanded' : 'minimized'} ${isEmpty ? 'empty' : 'populated'}`}
      style={{ '--accent-color': color } as React.CSSProperties}
    >
      <div className="card-header" onClick={toggleExpand} style={{ cursor: isEmpty ? 'default' : 'pointer' }}>
        <div className="header-main">
          <div className="icon-box">
            <Icon size={18} strokeWidth={2.5} />
          </div>
          <div className="title-area">
            <span className="card-title">{title}</span>
            {!isEmpty && lastUpdated && isExpanded && (
              <span className="updated-timestamp">Updated {lastUpdated}</span>
            )}
          </div>
        </div>
        
        <div className="header-right">
          {!isEmpty && (
            <>
              <div className="status-pill">
                <div className="status-dot-inner" />
                <span>Ready</span>
              </div>
              <div className={`chevron-box ${isExpanded ? 'rotated' : ''}`}>
                <ChevronRight size={16} />
              </div>
            </>
          )}
        </div>
      </div>
      
      <div className={`card-content-wrapper ${isExpanded ? 'show' : 'hide'}`}>
        <div className="card-content">
          <div className="content-inner">
            {children}
          </div>
        </div>
      </div>

      {isEmpty && (
        <div className="empty-state-container">
          <div className="empty-icon-ghost">
            <Icon size={40} strokeWidth={1} />
          </div>
          <p className="empty-message">{description || "Awaiting agent task..."}</p>
          <div className="empty-progress-track">
            <div className="empty-progress-dot" />
          </div>
        </div>
      )}
    </div>
  );
};

export default BlackboardCard;
