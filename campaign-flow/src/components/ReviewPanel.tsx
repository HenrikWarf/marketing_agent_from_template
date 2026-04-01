import React from 'react';
import ReactMarkdown from 'react-markdown';
import { ReviewData } from '../context/BlackboardContext';
import { CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import '../styles/ReviewPanel.css';

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
        <h4 className="feedback-title">FEEDBACK</h4>
        <div className="feedback-content markdown-body">
          <ReactMarkdown>{data.feedback}</ReactMarkdown>
        </div>
      </div>

      <div className="compliance-check">
        <div 
          className="compliance-dot"
          style={{ 
            backgroundColor: data.guideline_check ? '#1e8e3e' : '#dadce0' 
          }} 
        />
        <span>Guideline Compliance Check</span>
      </div>
    </div>
  );
};

export default ReviewPanel;
