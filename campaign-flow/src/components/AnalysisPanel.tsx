import React, { useState, useMemo } from 'react';
import { AnalysisData } from '../context/BlackboardContext';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  LineChart,
  Line
} from 'recharts';
import { Table, BarChart2, LineChart as LineIcon } from 'lucide-react';
import '../styles/AnalysisPanel.css';

interface MetricViewProps {
  label: string;
  value: any;
}

const MetricView: React.FC<MetricViewProps> = ({ label, value }) => {
  const [viewMode, setViewMode] = useState<'table' | 'bar' | 'line'>('table');

  // Determine if data is chartable
  const chartData = useMemo(() => {
    if (!Array.isArray(value) || value.length === 0 || typeof value[0] !== 'object') {
      return null;
    }

    const headers = Object.keys(value[0]);
    
    // Find keys that are either numbers or numeric strings
    const numericKeys = headers.filter(h => {
      const val = value[0][h];
      return typeof val === 'number' || (!isNaN(parseFloat(val)) && isFinite(val));
    });

    const labelKey = headers.find(h => typeof value[0][h] === 'string') || headers[0];

    console.log(`Analyzing metric "${label}":`, {
      headers,
      numericKeys,
      labelKey,
      isChartable: numericKeys.length > 0
    });

    if (numericKeys.length === 0) return null;

    // Convert data to ensure numeric types for Recharts
    const formattedData = value.map(item => {
      const newItem = { ...item };
      numericKeys.forEach(k => {
        newItem[k] = typeof item[k] === 'number' ? item[k] : parseFloat(item[k]);
      });
      return newItem;
    });

    return {
      data: formattedData,
      labelKey,
      valueKey: numericKeys[0]
    };
  }, [value, label]);

  const renderContent = () => {
    if (chartData) {
      if (viewMode === 'table') {
        const headers = Object.keys(value[0]);
        return (
          <div className="data-table-container">
            <table className="data-table">
              <thead>
                <tr>
                  {headers.map(h => <th key={h}>{h.replace(/_/g, ' ')}</th>)}
                </tr>
              </thead>
              <tbody>
                {value.map((item: any, i: number) => (
                  <tr key={i}>
                    {headers.map(h => (
                      <td key={h}>
                        {typeof item[h] === 'number' ? item[h].toLocaleString(undefined, {maximumFractionDigits: 2}) : String(item[h])}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      }

      return (
        <div style={{ width: '100%', height: 250, marginTop: '16px' }}>
          <ResponsiveContainer width="100%" height="100%">
            {viewMode === 'bar' ? (
              <BarChart data={chartData.data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                <XAxis dataKey={chartData.labelKey} fontSize={10} tickLine={false} axisLine={false} />
                <YAxis fontSize={10} tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                />
                <Bar dataKey={chartData.valueKey} fill="var(--google-blue)" radius={[4, 4, 0, 0]} barSize={30} />
              </BarChart>
            ) : (
              <LineChart data={chartData.data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                <XAxis dataKey={chartData.labelKey} fontSize={10} tickLine={false} axisLine={false} />
                <YAxis fontSize={10} tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                />
                <Line type="monotone" dataKey={chartData.valueKey} stroke="var(--google-blue)" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
              </LineChart>
            )}
          </ResponsiveContainer>
        </div>
      );
    }

    // fallback for objects/arrays... (no change to existing logic below)
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      const entries = Object.entries(value);
      return (
        <div className="data-table-container">
          <table className="data-table">
            <thead><tr><th>Key</th><th>Value</th></tr></thead>
            <tbody>
              {entries.map(([k, v]) => (
                <tr key={k}>
                  <td style={{ color: 'var(--google-gray)' }}>{k}</td>
                  <td style={{ fontWeight: 500 }}>{typeof v === 'number' ? v.toFixed(2) : String(v)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }

    if (Array.isArray(value)) {
      return (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '8px' }}>
          {value.map((v, i) => <span key={i} className="simple-metric-tag">{String(v)}</span>)}
        </div>
      );
    }

    return <div className="primitive-value">{typeof value === 'number' ? value.toLocaleString() : String(value)}</div>;
  };

  return (
    <div className="metric-card">
      <div className="metric-header-row">
        <div className="metric-label">{label.replace(/_/g, ' ')}</div>
        {chartData && (
          <div className="metric-toggles">
            <button 
              className={`toggle-btn ${viewMode === 'table' ? 'active' : ''}`} 
              onClick={() => setViewMode('table')}
              title="Table View"
            >
              <Table size={14} />
            </button>
            <button 
              className={`toggle-btn ${viewMode === 'bar' ? 'active' : ''}`} 
              onClick={() => setViewMode('bar')}
              title="Bar Chart"
            >
              <BarChart2 size={14} />
            </button>
            <button 
              className={`toggle-btn ${viewMode === 'line' ? 'active' : ''}`} 
              onClick={() => setViewMode('line')}
              title="Line Chart"
            >
              <LineIcon size={14} />
            </button>
          </div>
        )}
      </div>
      <div className="metric-value-container">
        {renderContent()}
      </div>
    </div>
  );
};

const AnalysisPanel: React.FC<{ data: AnalysisData }> = ({ data }) => {
  return (
    <div className="analysis-container">
      <div className="analysis-summary-box">
        <h4 className="section-title">Summary</h4>
        <p className="summary-text">{data.summary}</p>
      </div>
      
      <div className="analysis-metrics-box">
        <h4 className="section-title">Key Metrics & Insights</h4>
        <div className="metrics-list">
          {data.key_metrics && Object.keys(data.key_metrics).length > 0 ? (
            Object.entries(data.key_metrics).map(([key, value]) => (
              <MetricView key={key} label={key} value={value} />
            ))
          ) : (
            <span className="empty-metrics">No specific metrics extracted yet.</span>
          )}
        </div>
      </div>

      {data.trends && data.trends.length > 0 && (
        <div className="analysis-trends-box">
          <h4 className="section-title">Identified Trends</h4>
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
