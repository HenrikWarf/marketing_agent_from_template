import { useState, useCallback } from 'react';
import { useBlackboard } from '../context/BlackboardContext';

export interface Message {
  role: 'user' | 'model';
  parts: { text: string }[];
  agentId?: string;
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
    onDataReceived?: (type: string) => void,
    userId: string = 'user-local'
  ) => {
    setIsStreaming(true);
    setActiveTool(null);
    setCurrentAgent(agentId);
    
    setMessages(prev => [
      ...prev, 
      { role: 'user', parts: [{ text }] },
      { role: 'model', parts: [{ text: '' }], agentId: agentId }
    ]);

    try {
      const response = await fetch(`/api/chat?env=${env}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          app_name: agentId,
          user_id: userId,
          session_id: sessionId,
          new_message: { role: 'user', parts: [{ text }] },
          streaming: true
        })
      });

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let fullText = '';
      let lastKnownAgent = agentId;

      if (!reader) return;

      const processJsonInText = (text: string) => {
        const trimmed = text.trim();
        const jsonMatch = trimmed.match(/\{[\s\S]*\}/);
        if (!jsonMatch) return { isMatch: false, content: text };

        try {
          const potentialJson = jsonMatch[0];
          const parsed = JSON.parse(potentialJson);
          const dataKeys = ['summary', 'segments', 'content_drafts', 'status', 'drafts', 'posts'];
          
          if (Object.keys(parsed).some(k => dataKeys.includes(k))) {
            console.log("HOOK: Match found in text stream!", parsed);
            
            // Push to blackboard
            if (parsed.summary) { updateState({ analysis_data: parsed }); onDataReceived?.('analysis'); }
            else if (parsed.segments) { updateState({ segments_data: parsed }); onDataReceived?.('segmentation'); }
            else if (parsed.content_drafts || parsed.drafts || parsed.posts) { updateState({ content_data: parsed }); onDataReceived?.('content'); }
            else if (parsed.status) { updateState({ review_data: parsed }); onDataReceived?.('review'); }
            
            return { isMatch: true, content: "_Structured data updated. See dashboard for details._" };
          }
        } catch (e) {}
        return { isMatch: false, content: text };
      };

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

              const agentName = data.author || data.agent_name;
              if (agentName) {
                lastKnownAgent = agentName;
                setCurrentAgent(agentName);
              }

              if (data.session_state) {
                console.log("HOOK: Received explicit session_state", data.session_state);
                updateState(data.session_state);
                if (data.session_state.analysis_data) onDataReceived?.('analysis');
                if (data.session_state.segments_data) onDataReceived?.('segmentation');
                if (data.session_state.content_data) onDataReceived?.('content');
                if (data.session_state.review_data) onDataReceived?.('review');
              }

              if (data.content && data.content.parts) {
                const chunkText = data.content.parts.map(p => p.text || '').join('');
                if (chunkText) {
                  if (chunkText.length > fullText.length) {
                    fullText = chunkText;
                  } else {
                    fullText += chunkText;
                  }

                  const { isMatch, content } = processJsonInText(fullText);
                  let finalDisplay = content;
                  
                  // If it looks like JSON but isn't valid yet, hide it
                  if (!isMatch && fullText.trim().startsWith('{') && fullText.trim().length > 5) {
                    finalDisplay = "...";
                  }

                  setMessages(prev => {
                    const next = [...prev];
                    const lastIdx = next.length - 1;
                    next[lastIdx] = { 
                      ...next[lastIdx],
                      parts: [{ text: finalDisplay }],
                      agentId: lastKnownAgent
                    };
                    return next;
                  });
                }
              }
            } catch (e) {}
          }
        }
      }
      
      // Final pass after stream finishes to ensure everything was caught
      const { isMatch } = processJsonInText(fullText);
      if (isMatch) {
        setMessages(prev => {
          const next = [...prev];
          next[next.length - 1].parts = [{ text: "_Structured data updated. See dashboard for details._" }];
          return next;
        });
      }

    } catch (error: any) {
      console.error(error);
    } finally {
      setIsStreaming(false);
    }
  }, [updateState]);

  const clearMessages = () => setMessages([]);

  return { messages, isStreaming, currentAgent, activeTool, sendMessage, clearMessages };
};
