import { useState, useCallback } from 'react';
import { useBlackboard } from '../context/BlackboardContext';

export interface Message {
  role: 'user' | 'model';
  parts: { text: string }[];
}

export interface ChatEvent {
  author?: string;
  agent_name?: string;
  tool_call?: any;
  tool_response?: any;
  actions?: any[];
  content?: {
    parts?: { text: string }[];
  };
  session_state?: any;
  session_id?: string;
  error?: string;
}

export const useChatStream = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [currentAgent, setCurrentAgent] = useState<string | null>(null);
  const [activeTool, setActiveTool] = useState<string | null>(null);
  const { updateState } = useBlackboard();

  const sendMessage = useCallback(async (
    text: string, 
    env: string, 
    agentId: string, 
    sessionId: string,
    userId: string = 'user-local'
  ) => {
    setIsStreaming(true);
    setActiveTool(null);
    
    // Add user message immediately
    const userMsg: Message = { role: 'user', parts: [{ text }] };
    setMessages(prev => [...prev, userMsg]);

    // Prepare model message placeholder
    let modelMsg: Message = { role: 'model', parts: [{ text: '' }] };
    setMessages(prev => [...prev, modelMsg]);

    try {
      const response = await fetch(`/api/chat?env=${env}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          app_name: agentId,
          user_id: userId,
          session_id: sessionId,
          new_message: userMsg,
          streaming: true
        })
      });

      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let fullText = '';

      if (!reader) return;

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const rawData = line.slice(6);
              if (rawData === '[DONE]') continue;

              const data: ChatEvent = JSON.parse(rawData);

              if (data.error) throw new Error(data.error);

              // Update Agent & Tool Status
              const agentName = data.author || data.agent_name;
              if (agentName) setCurrentAgent(agentName);

              if (data.actions && Array.isArray(data.actions)) {
                const lastAction = data.actions[data.actions.length - 1];
                if (lastAction.tool_call) setActiveTool(`Executing ${lastAction.tool_call.name}...`);
                if (lastAction.tool_response) setActiveTool(`Finished ${lastAction.tool_response.name}`);
              }

              // Update Blackboard State
              if (data.session_state) {
                updateState(data.session_state);
              }

              // Update Content
              if (data.content && data.content.parts) {
                const chunkText = data.content.parts.map(p => p.text || '').join('');
                if (chunkText) {
                  // ADK sometimes sends full state, sometimes incremental
                  if (chunkText.startsWith(fullText)) {
                    fullText = chunkText;
                  } else {
                    fullText += chunkText;
                  }

                  setMessages(prev => {
                    const newMsgs = [...prev];
                    newMsgs[newMsgs.length - 1] = { 
                      role: 'model', 
                      parts: [{ text: fullText }] 
                    };
                    return newMsgs;
                  });
                }
              }
            } catch (e) {
              console.warn('SSE Parse Error', e);
            }
          }
        }
      }
    } catch (error: any) {
      console.error('Chat Error:', error);
      setMessages(prev => {
        const newMsgs = [...prev];
        newMsgs[newMsgs.length - 1] = { 
          role: 'model', 
          parts: [{ text: `Error: ${error.message}` }] 
        };
        return newMsgs;
      });
    } finally {
      setIsStreaming(false);
      setActiveTool(null);
    }
  }, [updateState]);

  const clearMessages = () => setMessages([]);

  return { messages, isStreaming, currentAgent, activeTool, sendMessage, clearMessages };
};
