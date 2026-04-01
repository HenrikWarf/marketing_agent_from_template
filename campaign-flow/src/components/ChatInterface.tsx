import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { Send, Plus, RefreshCw, PenTool, ChevronRight } from 'lucide-react';
import { useChatStream, AgentStep } from '../hooks/useChatStream';
import '../styles/ChatInterface.css';

interface ChatInterfaceProps {
  currentEnv: string;
  agentId: string;
  sessionId: string;
  onNewSession: () => void;
  onDataReceived?: (type: string) => void;
}

const TypingIndicator = () => (
  <div className="typing-indicator" style={{ alignSelf: 'flex-start', margin: '8px 0' }}>
    <div className="typing-dot"></div>
    <div className="typing-dot"></div>
    <div className="typing-dot"></div>
  </div>
);

const WorkflowBreadcrumbs: React.FC<{ steps: AgentStep[] }> = ({ steps }) => {
  if (steps.length === 0) return null;

  return (
    <div className="workflow-container">
      {steps.map((step, i) => (
        <React.Fragment key={i}>
          <div className={`workflow-node node-${step.id} ${step.active ? 'active' : ''}`}>
            <div className="workflow-dot" />
            <div className="workflow-label-area">
              <span className="workflow-name">{step.name}</span>
              {step.active && step.status && (
                <span className="workflow-status">{step.status}</span>
              )}
            </div>
          </div>
          {i < steps.length - 1 && (
            <div className="workflow-arrow">
              <ChevronRight size={14} />
            </div>
          )}
        </React.Fragment>
      ))}
    </div>
  );
};

const ChatInterface: React.FC<ChatInterfaceProps> = ({ 
  currentEnv, 
  agentId, 
  sessionId, 
  onNewSession,
  onDataReceived
}) => {
  const [input, setInput] = useState('');
  const { messages, isStreaming, currentAgent, activeTool, agentHistory, sendMessage } = useChatStream();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, activeTool, isStreaming, agentHistory]);

  // Maintain focus and auto-expand height
  useEffect(() => {
    if (!isStreaming) {
      textareaRef.current?.focus();
    }
  }, [isStreaming]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [input]);

  const handleSend = () => {
    if (!input.trim() || isStreaming) return;
    const text = input;
    setInput('');
    sendMessage(text, currentEnv, agentId, sessionId, onDataReceived);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const getAgentDisplay = (id?: string | null) => {
    if (!id) return null;
    return id.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  return (
    <div className="chat-container">
      <header className="chat-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ 
            backgroundColor: 'var(--google-blue)', 
            color: 'white', 
            borderRadius: '8px', 
            padding: '6px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <PenTool size={18} />
          </div>
          <span className="chat-title">CampaignFlow</span>
        </div>
        <button 
          onClick={onNewSession}
          className="new-chat-button"
        >
          <Plus size={16} /> New Chat
        </button>
      </header>

      <div className="messages-list">
        {messages.map((msg, i) => {
          if (msg.role === 'model' && i === messages.length - 1 && isStreaming && !msg.parts[0].text) {
            return null; 
          }
          
          if (!msg.parts[0].text && msg.role === 'model') return null;

          return (
            <div 
              key={i} 
              className={`message-bubble ${msg.role}`}
            >
              {msg.role === 'model' && (
                <div className="agent-name-label">
                  {getAgentDisplay(msg.agentId) || 'Agent'}
                </div>
              )}
              <div className="markdown-body">
                <ReactMarkdown>{msg.parts.map(p => p.text).join('')}</ReactMarkdown>
              </div>
            </div>
          );
        })}
        
        {isStreaming && !messages[messages.length-1]?.parts[0]?.text && <TypingIndicator />}

        {isStreaming && <WorkflowBreadcrumbs steps={agentHistory} />}

        <div ref={messagesEndRef} />
      </div>

      <div className="chat-input-area">
        <div className="input-pill">
          <textarea 
            ref={textareaRef}
            rows={1}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Talk to your marketing team..."
            className="chat-input"
            disabled={isStreaming}
            autoFocus
          />
          <button 
            onClick={handleSend}
            disabled={isStreaming || !input.trim()}
            className={`send-button ${input.trim() && !isStreaming ? 'active' : 'disabled'}`}
          >
            <Send size={18} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatInterface;
