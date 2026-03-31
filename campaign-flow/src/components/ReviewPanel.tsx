import React from 'react';
import ReactMarkdown from 'react-markdown';
import { ReviewData } from '../context/BlackboardContext';
import { CheckCircle, XCircle, AlertCircle } from 'lucide-react';

const ReviewPanel: React.FC<{ data: ReviewData }> = ({ data }) => {
  const getStatusDisplay = () => {
    switch (data.status) {
      case 'VERIFIED':
        return { 
          icon: <CheckCircle size={20} />, 
          color: '#1e8e3e', 
          bg: '#e6f4ea', 
          text: 'Verified & Approved' 
        };
      case 'REJECTED':
        return { 
          icon: <XCircle size={20} />, 
          color: '#d93025', 
          bg: '#fce8f3', 
          text: 'Changes Requested' 
        };
      default:
        return { 
          icon: <AlertCircle size={20} />, 
          color: '#f9ab00', 
          bg: '#fef7e0', 
          text: 'Under Review' 
        };
    }
  };

  const status = getStatusDisplay();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: '10px', 
        padding: '12px 16px', 
        borderRadius: '12px', 
        backgroundColor: status.bg,
        color: status.color,
        fontWeight: 500
      }}>
        {status.icon}
        <span>{status.text}</span>
      </div>

      <div style={{ background: '#f8f9fa', padding: '16px', borderRadius: '12px', border: '1px solid var(--border-color)' }} className="markdown-body">
        <h4 style={{ margin: '0 0 8px 0', fontSize: '0.85rem', color: 'var(--google-gray)', fontWeight: 700 }}>FEEDBACK</h4>
        <div style={{ fontSize: '0.95rem', lineHeight: '1.5' }}>
          <ReactMarkdown>{data.feedback}</ReactMarkdown>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem' }}>
        <div style={{ 
          width: '12px', 
          height: '12px', 
          borderRadius: '50%', 
          backgroundColor: data.guideline_check ? '#1e8e3e' : '#dadce0' 
        }} />
        <span>Guideline Compliance Check</span>
      </div>
    </div>
  );
};

export default ReviewPanel;
