import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { Send, Plus, RefreshCw } from 'lucide-react';
import { useChatStream } from '../hooks/useChatStream';
import '../styles/ChatInterface.css';

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
    <div className="chat-container">
      <header className="chat-header">
        <span className="chat-title">CampaignFlow</span>
        <button 
          onClick={onNewSession}
          className="new-chat-button"
        >
          <Plus size={16} /> New Chat
        </button>
      </header>

      <div className="messages-list">
        {messages.map((msg, i) => {
          // If the last message is from model and empty while streaming, it's the "thinking" placeholder
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

        {activeTool && (
          <div className="tool-activity">
            <RefreshCw size={14} className="animate-spin" />
            {activeTool}
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="chat-input-area">
        <div className="input-pill">
          <input 
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
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
