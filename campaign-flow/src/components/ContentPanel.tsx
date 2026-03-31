import React, { useState } from 'react';
import { ContentData } from '../context/BlackboardContext';
import { Mail, MessageSquare, Smartphone } from 'lucide-react';

const ContentPanel: React.FC<{ data: ContentData }> = ({ data }) => {
  const [activeTabIndex, setActiveTabIndex] = useState(0);
  const activeDraft = data.content_drafts[activeTabIndex];

  const getIcon = (channel: string) => {
    const c = channel.toLowerCase();
    if (c.includes('email')) return <Mail size={16} />;
    if (c.includes('sms')) return <Smartphone size={16} />;
    return <MessageSquare size={16} />;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ 
        display: 'flex', 
        gap: '8px', 
        marginBottom: '16px', 
        borderBottom: '1px solid var(--border-color)',
        paddingBottom: '8px'
      }}>
        {data.content_drafts.map((draft, i) => (
          <button
            key={i}
            onClick={() => setActiveTabIndex(i)}
            style={{
              display: 'flex',
              alignItems: 'center',
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
            {getIcon(draft.channel)}
            {draft.channel}
          </button>
        ))}
      </div>

      {activeDraft && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {activeDraft.subject && (
            <div style={{ background: '#f8f9fa', padding: '10px 12px', borderRadius: '8px', borderLeft: '4px solid var(--content-color)' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--google-gray)', display: 'block', marginBottom: '2px' }}>SUBJECT</span>
              <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>{activeDraft.subject}</span>
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
            whiteSpace: 'pre-wrap',
            overflowY: 'auto'
          }}>
            {activeDraft.copy}
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
