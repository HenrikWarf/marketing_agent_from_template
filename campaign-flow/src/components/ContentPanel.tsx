import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { ContentData } from '../context/BlackboardContext';
import { Mail, MessageSquare, Smartphone } from 'lucide-react';
import '../styles/ContentPanel.css';

const ContentPanel: React.FC<{ data: ContentData }> = ({ data }) => {
  const [activeTabIndex, setActiveTabIndex] = useState(0);

  const getDraftContent = (draft: any) => {
    if (!draft) return '';
    // Comprehensive check for common keys used by LLMs for various channels
    return (
      draft.copy || 
      draft.content || 
      draft.text || 
      draft.body || 
      draft.message || 
      draft.caption || 
      draft.post || 
      draft.ad_copy || 
      draft.description || 
      ''
    );
  };

  const getIcon = (channel: string) => {
    const c = (channel || '').toLowerCase();
    if (c.includes('email')) return <Mail size={16} />;
    if (c.includes('sms')) return <Smartphone size={16} />;
    return <MessageSquare size={16} />;
  };

  const drafts = data.content_drafts || (data as any).drafts || (data as any).social_posts || (data as any).posts || [];
  const activeDraft = drafts?.[activeTabIndex];

  return (
    <div className="content-container">
      <div className="channel-tabs">
        {drafts && drafts.length > 0 ? drafts.map((draft: any, i: number) => (
          <button
            key={i}
            onClick={() => setActiveTabIndex(i)}
            className={`tab-button ${activeTabIndex === i ? 'active' : ''}`}
          >
            {getIcon(draft.channel || draft.platform)}
            {draft.channel || draft.platform || 'Channel'}
          </button>
        )) : <span className="empty-state-text">No drafts available.</span>}
      </div>

      {activeDraft && (
        <div className="draft-view">
          {(activeDraft.subject || activeDraft.title) && (
            <div className="subject-banner">
              <span className="banner-label">SUBJECT / TITLE</span>
              <span className="banner-value">{activeDraft.subject || activeDraft.title}</span>
            </div>
          )}
          <div className="content-body markdown-body">
            <ReactMarkdown>{getDraftContent(activeDraft)}</ReactMarkdown>
          </div>
          <div className="content-footer">
            <span>Target: <strong>{data.target_segment}</strong></span>
            <span>CTA: <strong>{data.call_to_action}</strong></span>
          </div>
        </div>
      )}
    </div>
  );
};

export default ContentPanel;
