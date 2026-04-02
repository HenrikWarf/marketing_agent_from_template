import React from 'react';
import ReactMarkdown from 'react-markdown';
import { ReviewData } from '../context/BlackboardContext';
import { CheckCircle, XCircle, AlertCircle, Info } from 'lucide-react';
import '../styles/ReviewPanel.css';

const ReviewPanel: React.FC<{ data: ReviewData }> = ({ data }) => {
  const getStatus = (d: any) => d.status || d.review_status || 'PENDING';
  const getFeedback = (d: any) => d.feedback || d.review || d.comments || d.notes || 'No detailed feedback provided.';
  
  const getStatusDisplay = () => {
    const status = getStatus(data).toUpperCase();
    if (status.includes('VERIFIED') || status.includes('PASS') || status.includes('APPROVED')) {
      return { 
        icon: <CheckCircle size={20} />, 
        color: '#1e8e3e', 
        bg: '#e6f4ea', 
        text: 'Verified & Approved' 
      };
    } else if (status.includes('REJECTED') || status.includes('FAIL') || status.includes('FIX')) {
      return { 
        icon: <XCircle size={20} />, 
        color: '#d93025', 
        bg: '#fce8f3', 
        text: 'Changes Requested' 
      };
    } else {
      return { 
        icon: <AlertCircle size={20} />, 
        color: '#f9ab00', 
        bg: '#fef7e0', 
        text: 'Under Review' 
      };
    }
  };

  const status = getStatusDisplay();

  // Handle any additional fields from the agent
  const renderExtraInfo = () => {
    const standardKeys = ['status', 'review_status', 'feedback', 'review', 'comments', 'notes', 'guideline_check'];
    const extras = Object.keys(data).filter(k => !standardKeys.includes(k));
    
    if (extras.length === 0) return null;
    
    return (
      <div style={{ marginTop: '16px', borderTop: '1px solid #eee', paddingTop: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px', color: 'var(--google-gray)' }}>
          <Info size={14} />
          <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase' }}>Additional Audit Data</span>
        </div>
        <div style={{ display: 'grid', gap: '8px' }}>
          {extras.map(k => (
            <div key={k} style={{ fontSize: '0.85rem' }}>
              <strong style={{ color: 'var(--google-gray)' }}>{k.replace(/_/g, ' ')}:</strong> {String((data as any)[k])}
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="review-container">
      <div 
        className="status-banner"
        style={{ 
          backgroundColor: status.bg,
          color: status.color
        }}
      >
        {status.icon}
        <span>{status.text}</span>
      </div>

      <div className="feedback-section">
        <h4 className="feedback-title">FEEDBACK & AUDIT</h4>
        <div className="feedback-content markdown-body">
          <ReactMarkdown>{getFeedback(data)}</ReactMarkdown>
        </div>
        {renderExtraInfo()}
      </div>

      <div className="compliance-check">
        <div 
          className="compliance-dot"
          style={{ 
            backgroundColor: (data.guideline_check || (data as any).passed) ? '#1e8e3e' : '#dadce0' 
          }} 
        />
        <span>Guideline Compliance Check</span>
      </div>
    </div>
  );
};

export default ReviewPanel;
