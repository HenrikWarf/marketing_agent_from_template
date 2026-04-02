import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { ContentData } from '../types/blackboard';
import { Mail, MessageSquare, Smartphone } from 'lucide-react';
import '../styles/ContentPanel.css';

const ContentPanel: React.FC<{ data: ContentData }> = ({ data }) => {
  const [activeTabIndex, setActiveTabIndex] = useState(0);

  if (!data.content_drafts || data.content_drafts.length === 0) {
    return <div className="no-content">No drafts generated yet.</div>;
  }

  const activeDraft = data.content_drafts[activeTabIndex];

  const getIcon = (channel: string) => {
    const c = channel.toLowerCase();
    if (c.includes('email')) return <Mail size={18} />;
    if (c.includes('sms')) return <Smartphone size={18} />;
    return <MessageSquare size={18} />;
  };

  const getDraftContent = (draft: any) => {
    return draft.text_content || draft.body || draft.post_text || draft.text || draft.video_concept || draft.content || '';
  };

  return (
    <div className="content-container">
      <div className="content-tabs">
        {data.content_drafts.map((draft, idx) => (
          <button 
            key={draft.channel} 
            className={`tab-button ${activeTabIndex === idx ? 'active' : ''}`}
            onClick={() => setActiveTabIndex(idx)}
          >
            {getIcon(draft.channel)}
            <span>{draft.channel}</span>
          </button>
        ))}
      </div>

      <div className="draft-preview-card">
        <div className="draft-header">
          <span className="channel-label">{activeDraft.channel}</span>
          {activeDraft.subject && <span className="subject-line">Subject: {activeDraft.subject}</span>}
        </div>
        <div className="draft-body markdown-body">
          <ReactMarkdown>{getDraftContent(activeDraft)}</ReactMarkdown>
        </div>
      </div>

      <div className="content-meta">
        <div className="meta-item">
          <strong>Target:</strong> {data.target_segment}
        </div>
        <div className="meta-item">
          <strong>CTA:</strong> {data.call_to_action}
        </div>
      </div>
    </div>
  );
};

export default ContentPanel;
