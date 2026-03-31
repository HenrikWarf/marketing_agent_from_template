import React from 'react';
import { SegmentationData } from '../context/BlackboardContext';
import { Users } from 'lucide-react';

const SegmentationPanel: React.FC<{ data: SegmentationData }> = ({ data }) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{ display: 'grid', gap: '12px' }}>
        {data.segments ? data.segments.map((segment, i) => (
          <div key={i} style={{ 
            border: '1px solid var(--border-color)', 
            borderRadius: '12px', 
            padding: '12px',
            background: '#fafafa'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <Users size={16} color="var(--segment-color)" />
              <span style={{ fontWeight: 500, fontSize: '0.95rem' }}>{segment.name}</span>
              <span style={{ 
                marginLeft: 'auto', 
                fontSize: '0.75rem', 
                background: '#e8f0fe', 
                padding: '2px 8px', 
                borderRadius: '10px' 
              }}>
                {segment.count} users
              </span>
            </div>
            <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              {segment.description}
            </p>
          </div>
        )) : <div style={{ textAlign: 'center', color: 'var(--google-gray)' }}>No segments defined.</div>}
      </div>
      
      {data.logic_reasoning && (
        <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '12px' }}>
          <h4 style={{ margin: '0 0 4px 0', fontSize: '0.8rem', color: 'var(--google-gray)', textTransform: 'uppercase' }}>Reasoning</h4>
          <p style={{ margin: 0, fontSize: '0.85rem', fontStyle: 'italic' }}>{data.logic_reasoning}</p>
        </div>
      )}
    </div>
  );
};

export default SegmentationPanel;
