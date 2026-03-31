import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { Send, Plus, RefreshCw } from 'lucide-react';
import { useChatStream } from '../hooks/useChatStream';

interface ChatInterfaceProps {
  currentEnv: string;
  agentId: string;
  sessionId: string;
  onNewSession: () => void;
}

const TypingIndicator = () => (
  <div className="typing-indicator" style={{ alignSelf: 'flex-start', margin: '8px 0' }}>
    <div className="typing-dot"></div>
    <div className="typing-dot"></div>
    <div className="typing-dot"></div>
  </div>
);

const ChatInterface: React.FC<ChatInterfaceProps> = ({ 
  currentEnv, 
  agentId, 
  sessionId, 
  onNewSession 
}) => {
  const [input, setInput] = useState('');
  const { messages, isStreaming, currentAgent, activeTool, sendMessage } = useChatStream();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, activeTool, isStreaming]);

  // Maintain focus on input field
  useEffect(() => {
    if (!isStreaming) {
      inputRef.current?.focus();
    }
  }, [isStreaming]);

  const handleSend = () => {
    if (!input.trim() || isStreaming) return;
    const text = input;
    setInput('');
    sendMessage(text, currentEnv, agentId, sessionId);
  };

  const getAgentDisplay = (id?: string | null) => {
    if (!id) return null;
    return id.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#fff' }}>
      <header style={{ 
        padding: '16px', 
        borderBottom: '1px solid var(--border-color)', 
        display: 'flex', 
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <span style={{ fontWeight: 700, fontSize: '1.1rem', color: 'var(--google-blue)' }}>CampaignFlow</span>
        <button 
          onClick={onNewSession}
          style={{ 
            background: 'none', 
            border: 'none', 
            color: 'var(--google-gray)', 
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            fontSize: '0.85rem'
          }}
        >
          <Plus size={16} /> New Chat
        </button>
      </header>

      <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {messages.map((msg, i) => {
          // If the last message is from model and empty while streaming, it's the "thinking" placeholder
          if (msg.role === 'model' && i === messages.length - 1 && isStreaming && !msg.parts[0].text) {
            return null; 
          }
          
          if (!msg.parts[0].text && msg.role === 'model') return null;

          return (
            <div 
              key={i} 
              style={{ 
                alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                maxWidth: msg.role === 'user' ? '75%' : '90%',
                padding: msg.role === 'user' ? '6px 14px' : '0',
                borderRadius: '18px 18px 4px 18px',
                backgroundColor: msg.role === 'user' ? '#f1f3f4' : 'transparent',
                fontSize: '0.92rem',
                boxShadow: msg.role === 'user' ? '0 1px 2px rgba(0,0,0,0.05)' : 'none',
                lineHeight: '1.4'
              }}
            >
              {msg.role === 'model' && (
                <div style={{ fontSize: '0.75rem', color: 'var(--google-gray)', marginBottom: '4px', fontWeight: 500 }}>
                  {getAgentDisplay(msg.agentId) || 'Agent'}
                </div>
              )}
              <div style={{ lineHeight: '1.5' }} className="markdown-body">
                <ReactMarkdown>{msg.parts.map(p => p.text).join('')}</ReactMarkdown>
              </div>
            </div>
          );
        })}
        
        {isStreaming && !messages[messages.length-1]?.parts[0]?.text && <TypingIndicator />}

        {activeTool && (
          <div style={{ 
            alignSelf: 'flex-start', 
            fontSize: '0.8rem', 
            fontStyle: 'italic', 
            color: 'var(--google-gray)',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}>
            <RefreshCw size={14} className="animate-spin" />
            {activeTool}
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div style={{ padding: '16px', borderTop: '1px solid var(--border-color)' }}>
        <div style={{ 
          background: '#f1f3f4', 
          borderRadius: '24px', 
          padding: '4px 8px 4px 16px',
          display: 'flex',
          alignItems: 'center'
        }}>
          <input 
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Talk to your marketing team..."
            style={{ 
              flex: 1, 
              background: 'none', 
              border: 'none', 
              outline: 'none', 
              padding: '10px 0',
              fontSize: '0.95rem'
            }}
            disabled={isStreaming}
            autoFocus
          />
          <button 
            onClick={handleSend}
            disabled={isStreaming || !input.trim()}
            style={{ 
              background: input.trim() ? 'var(--google-blue)' : '#dadce0', 
              color: '#fff', 
              border: 'none', 
              borderRadius: '50%', 
              width: '36px', 
              height: '36px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'background 0.2s'
            }}
          >
            <Send size={18} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatInterface;
