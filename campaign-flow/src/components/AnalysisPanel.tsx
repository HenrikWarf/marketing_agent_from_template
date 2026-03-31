import React from 'react';
import { AnalysisData } from '../context/BlackboardContext';

const AnalysisPanel: React.FC<{ data: AnalysisData }> = ({ data }) => {
  const renderMetricValue = (key: string, val: any) => {
    // 1. Handle Array of Objects (Common for BigQuery results)
    if (Array.isArray(val) && val.length > 0 && typeof val[0] === 'object') {
      const headers = Object.keys(val[0]);
      return (
        <div style={{ marginTop: '8px', overflowX: 'auto', width: '100%' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ textAlign: 'left', borderBottom: '2px solid #eee' }}>
                {headers.map(h => (
                  <th key={h} style={{ padding: '6px 8px', textTransform: 'capitalize' }}>{h.replace(/_/g, ' ')}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {val.map((item, i) => (
                <tr key={i} style={{ borderBottom: '1px solid #f0f0f0' }}>
                  {headers.map(h => (
                    <td key={h} style={{ padding: '6px 8px' }}>
                      {typeof item[h] === 'number' ? item[h].toLocaleString(undefined, {maximumFractionDigits: 3}) : String(item[h])}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }

    // 2. Handle Plain Object (Dictionary)
    if (typeof val === 'object' && val !== null && !Array.isArray(val)) {
      const entries = Object.entries(val);
      if (entries.length > 0) {
        return (
          <div style={{ marginTop: '8px', overflowX: 'auto', width: '100%' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ textAlign: 'left', borderBottom: '1px solid #eee' }}>
                  <th style={{ padding: '4px 8px' }}>Key</th>
                  <th style={{ padding: '4px 8px' }}>Value</th>
                </tr>
              </thead>
              <tbody>
                {entries.map(([k, v]) => (
                  <tr key={k} style={{ borderBottom: '1px solid #f9f9f9' }}>
                    <td style={{ padding: '4px 8px', color: 'var(--google-gray)' }}>{k}</td>
                    <td style={{ padding: '4px 8px', fontWeight: 500 }}>
                      {typeof v === 'number' ? v.toFixed(3) : (typeof v === 'object' ? JSON.stringify(v) : String(v))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      }
    }
    
    // 3. Handle Simple Arrays
    if (Array.isArray(val)) {
      return (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '4px' }}>
          {val.map((v, i) => (
            <span key={i} style={{ background: '#f1f3f4', padding: '2px 8px', borderRadius: '4px', fontSize: '0.8rem' }}>
              {String(v)}
            </span>
          ))}
        </div>
      );
    }

    // 4. Handle Primatives
    if (typeof val === 'number') return val.toLocaleString(undefined, { maximumFractionDigits: 3 });
    return String(val);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div>
        <h4 style={{ margin: '0 0 8px 0', fontSize: '0.9rem', color: 'var(--google-gray)' }}>Summary</h4>
        <p style={{ margin: 0, fontSize: '0.95rem', lineHeight: '1.5' }}>{data.summary}</p>
      </div>
      
      <div>
        <h4 style={{ margin: '0 0 8px 0', fontSize: '0.9rem', color: 'var(--google-gray)' }}>Key Metrics</h4>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {data.key_metrics && Object.keys(data.key_metrics).length > 0 ? Object.entries(data.key_metrics).map(([key, value]) => (
            <div key={key} style={{ 
              background: '#f8f9fa', 
              padding: '12px', 
              borderRadius: '12px',
              border: '1px solid #eee'
            }}>
              <div style={{ fontWeight: 600, fontSize: '0.8rem', color: 'var(--google-blue)', textTransform: 'uppercase', marginBottom: '4px' }}>
                {key.replace(/_/g, ' ')}
              </div>
              <div style={{ fontSize: '0.95rem' }}>
                {renderMetricValue(key, value)}
              </div>
            </div>
          )) : <span style={{ fontSize: '0.9rem', fontStyle: 'italic', color: 'var(--google-gray)' }}>No specific metrics extracted yet.</span>}
        </div>
      </div>

      {data.trends && data.trends.length > 0 && (
        <div>
          <h4 style={{ margin: '0 0 8px 0', fontSize: '0.9rem', color: 'var(--google-gray)' }}>Trends</h4>
          <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '0.9rem' }}>
            {data.trends.map((trend, i) => (
              <li key={i} style={{ marginBottom: '4px' }}>{trend}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default AnalysisPanel;
