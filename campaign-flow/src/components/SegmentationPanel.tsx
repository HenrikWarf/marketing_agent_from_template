import React from 'react';
import { SegmentationData } from '../context/BlackboardContext';
import { Users } from 'lucide-react';
import '../styles/SegmentationPanel.css';

const SegmentationPanel: React.FC<{ data: SegmentationData }> = ({ data }) => {
  return (
    <div className="segmentation-container">
      <div className="segments-grid">
        {data.segments ? data.segments.map((segment, i) => (
          <div key={i} className="segment-card">
            <div className="segment-header">
              <Users size={16} color="var(--segment-color)" />
              <span className="segment-name">{segment.name}</span>
              <span className="segment-count-badge">
                {segment.count} users
              </span>
            </div>
            <p className="segment-description">
              {segment.description}
            </p>
          </div>
        )) : <div style={{ textAlign: 'center', color: 'var(--google-gray)' }}>No segments defined.</div>}
      </div>
      
      {data.logic_reasoning && (
        <div className="reasoning-section">
          <h4 className="reasoning-title">Reasoning</h4>
          <p className="reasoning-text">{data.logic_reasoning}</p>
        </div>
      )}
    </div>
  );
};

export default SegmentationPanel;
