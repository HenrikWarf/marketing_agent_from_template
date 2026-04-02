import React, { useState, useRef, useEffect } from 'react';
import { Send, User, Bot, Loader2, Sparkles, Activity, ChevronUp, ChevronDown } from 'lucide-react';
import { useChatStream, AgentStep } from '../hooks/useChatStream';
import '../styles/ChatInterface.css';

interface ChatInterfaceProps {
  currentEnv: string;
  agentId: string;
  sessionId: string;
  onNewSession: () => void;
  onDataReceived?: (type: string) => void;
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({ 
  currentEnv, 
  agentId, 
  sessionId, 
  onNewSession,
  onDataReceived 
}) => {
  const [inputValue, setInputValue] = useState('');
  const [isWorkflowExpanded, setIsWorkflowExpanded] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { 
    messages, 
    isStreaming, 
    activeTool, 
    agentHistory, 
    sendMessage, 
    clearMessages 
  } = useChatStream();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, activeTool]);

  // Auto-expand workflow if streaming
  useEffect(() => {
    if (isStreaming) setIsWorkflowExpanded(true);
  }, [isStreaming]);

  const handleSend = async () => {
    if (!inputValue.trim() || isStreaming) return;
    const text = inputValue;
    setInputValue('');
    await sendMessage(text, currentEnv, agentId, sessionId, onDataReceived);
  };

  const handleClear = () => {
    clearMessages();
    onNewSession();
  };

  const renderWorkflowPanel = () => {
    if (agentHistory.length === 0) return null;
    
    return (
      <div className={`workflow-popup ${isWorkflowExpanded ? 'expanded' : 'collapsed'}`}>
        <div className="workflow-popup-header" onClick={() => setIsWorkflowExpanded(!isWorkflowExpanded)}>
          <div className="header-label">
            <Activity size={14} className={isStreaming ? 'pulse-icon' : ''} />
            <span>Agent Handoffs</span>
            <span className="step-count">{agentHistory.length}</span>
          </div>
          {isWorkflowExpanded ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
        </div>
        
        {isWorkflowExpanded && (
          <div className="workflow-steps-list">
            {agentHistory.map((step: AgentStep, idx: number) => (
              <div key={step.id + idx} className={`workflow-step-item ${step.active ? 'active' : ''}`}>
                <div className="step-indicator">
                  <div className="step-line" />
                  <div className="step-dot" />
                </div>
                <div className="step-content">
                  <div className="step-agent-name">{step.name}</div>
                  {step.status && <div className="step-status-text">{step.status}</div>}
                </div>
                {step.active && <Loader2 size={12} className="animate-spin" />}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="chat-container">
      <div className="chat-header">
        <div className="header-left">
          <Sparkles size={18} color="var(--google-blue)" />
          <h3>Campaign Orchestrator</h3>
        </div>
        <button onClick={handleClear} className="clear-btn" title="New Session">
          New Session
        </button>
      </div>

      <div className="messages-area">
        {messages.length === 0 ? (
          <div className="empty-chat">
            <Bot size={48} strokeWidth={1} />
            <p>Welcome! Ask me to recommend a campaign or start building one from scratch.</p>
          </div>
        ) : (
          <>
            {messages.map((m, i) => (
              <div key={i} className={`message-row ${m.role}`}>
                <div className="avatar">
                  {m.role === 'user' ? <User size={16} /> : <Bot size={16} />}
                </div>
                <div className="message-bubble">
                  {m.agentId && m.role === 'model' && (
                    <div className="agent-label">{m.agentId.replace(/_/g, ' ')}</div>
                  )}
                  <div className="message-content">
                    {m.parts[0].text || (isStreaming && i === messages.length - 1 ? <Loader2 className="animate-spin" size={14} /> : '')}
                  </div>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      <div className="chat-footer">
        {renderWorkflowPanel()}
        <div className="input-row">
          <input
            type="text"
            placeholder="Type a message..."
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
            disabled={isStreaming}
          />
          <button 
            onClick={handleSend} 
            disabled={!inputValue.trim() || isStreaming}
            className="send-btn"
          >
            <Send size={18} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatInterface;
