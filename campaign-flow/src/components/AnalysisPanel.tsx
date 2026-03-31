import React from 'react';
import { AnalysisData } from '../context/BlackboardContext';

const AnalysisPanel: React.FC<{ data: AnalysisData }> = ({ data }) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div>
        <h4 style={{ margin: '0 0 8px 0', fontSize: '0.9rem', color: 'var(--google-gray)' }}>Summary</h4>
        <p style={{ margin: 0, fontSize: '0.95rem', lineHeight: '1.5' }}>{data.summary}</p>
      </div>
      
      <div>
        <h4 style={{ margin: '0 0 8px 0', fontSize: '0.9rem', color: 'var(--google-gray)' }}>Key Metrics</h4>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          {Object.entries(data.key_metrics).map(([key, value]) => (
            <div key={key} style={{ 
              background: '#f1f3f4', 
              padding: '6px 12px', 
              borderRadius: '8px',
              fontSize: '0.85rem'
            }}>
              <span style={{ fontWeight: 500, marginRight: '4px' }}>{key.replace(/_/g, ' ')}:</span>
              <span>{String(value)}</span>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h4 style={{ margin: '0 0 8px 0', fontSize: '0.9rem', color: 'var(--google-gray)' }}>Trends</h4>
        <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '0.9rem' }}>
          {data.trends.map((trend, i) => (
            <li key={i} style={{ marginBottom: '4px' }}>{trend}</li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default AnalysisPanel;
