import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { ContentData } from '../context/BlackboardContext';
import { Mail, MessageSquare, Smartphone } from 'lucide-react';

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
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ 
        display: 'flex', 
        gap: '8px', 
        marginBottom: '16px', 
        borderBottom: '1px solid var(--border-color)',
        paddingBottom: '8px',
        overflowX: 'auto'
      }}>
        {drafts && drafts.length > 0 ? drafts.map((draft: any, i: number) => (
          <button
            key={i}
            onClick={() => setActiveTabIndex(i)}
            style={{
              display: 'flex',
              alignItems: 'center',
              whiteSpace: 'nowrap',
              gap: '6px',
              padding: '6px 12px',
              borderRadius: '8px',
              border: 'none',
              cursor: 'pointer',
              fontSize: '0.85rem',
              fontWeight: 500,
              backgroundColor: activeTabIndex === i ? 'var(--content-color)' : 'transparent',
              color: activeTabIndex === i ? 'white' : 'var(--text-secondary)',
              transition: 'all 0.2s'
            }}
          >
            {getIcon(draft.channel || draft.platform)}
            {draft.channel || draft.platform || 'Channel'}
          </button>
        )) : <span style={{ fontSize: '0.85rem', fontStyle: 'italic', color: 'var(--google-gray)' }}>No drafts available.</span>}
      </div>

      {activeDraft && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {(activeDraft.subject || activeDraft.title) && (
            <div style={{ background: '#f8f9fa', padding: '10px 12px', borderRadius: '8px', borderLeft: '4px solid var(--content-color)' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--google-gray)', display: 'block', marginBottom: '2px' }}>SUBJECT / TITLE</span>
              <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>{activeDraft.subject || activeDraft.title}</span>
            </div>
          )}
          <div style={{ 
            flex: 1, 
            background: '#ffffff', 
            border: '1px solid var(--border-color)', 
            borderRadius: '12px', 
            padding: '16px',
            fontSize: '0.9rem',
            lineHeight: '1.6',
            overflowY: 'auto'
          }} className="markdown-body">
            <ReactMarkdown>{getDraftContent(activeDraft)}</ReactMarkdown>
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--google-gray)', display: 'flex', justifyContent: 'space-between' }}>
            <span>Target: <strong>{data.target_segment}</strong></span>
            <span>CTA: <strong>{data.call_to_action}</strong></span>
          </div>
        </div>
      )}
    </div>
  );
};

export default ContentPanel;
