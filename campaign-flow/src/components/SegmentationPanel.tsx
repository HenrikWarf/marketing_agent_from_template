import React from 'react';
import { SegmentationData } from '../types/blackboard';
import { Users, Info } from 'lucide-react';
import '../styles/SegmentationPanel.css';

const SegmentationPanel: React.FC<{ data: SegmentationData }> = ({ data }) => {
  const getCount = (s: any) => s.count || s.user_count || s.customer_count || s.size || 0;
  const getName = (s: any) => s.name || s.segment_name || s.label || 'Unnamed Segment';
  const getDesc = (s: any) => s.description || s.characteristics || s.criteria || s.summary || '';
  
  // Logic to handle any additional fields the agent might have added
  const renderAdditionalFields = (s: any) => {
    const standardKeys = ['name', 'segment_name', 'label', 'description', 'characteristics', 'criteria', 'summary', 'count', 'user_count', 'customer_count', 'size'];
    const extraKeys = Object.keys(s).filter(k => !standardKeys.includes(k));
    
    if (extraKeys.length === 0) return null;
    
    return (
      <div style={{ marginTop: '10px', display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
        {extraKeys.map(k => (
          <div key={k} style={{ fontSize: '0.7rem', background: '#eee', padding: '2px 6px', borderRadius: '4px' }}>
            <strong>{k.replace(/_/g, ' ')}:</strong> {String(s[k])}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="segmentation-container">
      <div className="segments-grid">
        {data.segments && data.segments.length > 0 ? data.segments.map((segment, i) => (
          <div key={i} className="segment-card">
            <div className="segment-header">
              <Users size={16} color="var(--segment-color)" />
              <span className="segment-name">{getName(segment)}</span>
              <span className="segment-count-badge">
                {getCount(segment).toLocaleString()} users
              </span>
            </div>
            <p className="segment-description">
              {getDesc(segment)}
            </p>
            {renderAdditionalFields(segment)}
          </div>
        )) : <div style={{ textAlign: 'center', color: 'var(--google-gray)', padding: '20px' }}>No segments defined yet.</div>}
      </div>
      
      {(data.logic_reasoning || (data as any).reasoning || (data as any).logic) && (
        <div className="reasoning-section">
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
            <Info size={14} color="var(--google-gray)" />
            <h4 className="reasoning-title" style={{ marginBottom: 0 }}>Reasoning & Strategy</h4>
          </div>
          <p className="reasoning-text">
            {data.logic_reasoning || (data as any).reasoning || (data as any).logic}
          </p>
        </div>
      )}
    </div>
  );
};

export default SegmentationPanel;
