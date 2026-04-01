import React from 'react';
import { AnalysisData } from '../context/BlackboardContext';
import '../styles/AnalysisPanel.css';

const AnalysisPanel: React.FC<{ data: AnalysisData }> = ({ data }) => {
  const renderMetricValue = (key: string, val: any) => {
    // 1. Handle Array of Objects (Common for BigQuery results)
    if (Array.isArray(val) && val.length > 0 && typeof val[0] === 'object') {
      const headers = Object.keys(val[0]);
      return (
        <div className="data-table-container">
          <table className="data-table">
            <thead>
              <tr>
                {headers.map(h => (
                  <th key={h}>{h.replace(/_/g, ' ')}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {val.map((item, i) => (
                <tr key={i}>
                  {headers.map(h => (
                    <td key={h}>
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
          <div className="data-table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Key</th>
                  <th>Value</th>
                </tr>
              </thead>
              <tbody>
                {entries.map(([k, v]) => (
                  <tr key={k}>
                    <td style={{ color: 'var(--google-gray)' }}>{k}</td>
                    <td style={{ fontWeight: 500 }}>
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
            <span key={i} className="simple-metric-tag">
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
    <div className="analysis-container">
      <div>
        <h4 className="section-title">Summary</h4>
        <p className="summary-text">{data.summary}</p>
      </div>
      
      <div>
        <h4 className="section-title">Key Metrics</h4>
        <div className="metrics-list">
          {data.key_metrics && Object.keys(data.key_metrics).length > 0 ? Object.entries(data.key_metrics).map(([key, value]) => (
            <div key={key} className="metric-card">
              <div className="metric-label">
                {key.replace(/_/g, ' ')}
              </div>
              <div className="metric-value">
                {renderMetricValue(key, value)}
              </div>
            </div>
          )) : <span style={{ fontSize: '0.9rem', fontStyle: 'italic', color: 'var(--google-gray)' }}>No specific metrics extracted yet.</span>}
        </div>
      </div>

      {data.trends && data.trends.length > 0 && (
        <div>
          <h4 className="section-title">Trends</h4>
          <ul className="trends-list">
            {data.trends.map((trend, i) => (
              <li key={i} className="trend-item">{trend}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default AnalysisPanel;
