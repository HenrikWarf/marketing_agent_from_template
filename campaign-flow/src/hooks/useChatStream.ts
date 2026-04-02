import { useState, useCallback } from 'react';
import { useBlackboard } from '../context/BlackboardContext';

export interface Message {
  role: 'user' | 'model';
  parts: { text: string }[];
  agentId?: string;
}

export interface AgentStep {
  id: string;
  name: string;
  status?: string;
  active: boolean;
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
  const [agentHistory, setAgentHistory] = useState<AgentStep[]>([]);
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
    setAgentHistory([{ id: agentId, name: agentId.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()), active: true }]);
    
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

      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let fullText = '';
      let lastKnownAgent = agentId;

      const processJsonInText = (text: string) => {
        // Find ALL JSON objects in the text (SequentialAgent might output multiple)
        const jsonMatches = text.match(/\{[\s\S]*?\}(?=\s*\{|\s*$)/g) || [];
        let cleanDisplay = text;
        let matchedSomething = false;

        for (const match of jsonMatches) {
          try {
            const parsed = JSON.parse(match);
            const dataKeys = ['campaign_name', 'summary', 'segments', 'content_drafts', 'status', 'drafts', 'posts'];
            
            if (Object.keys(parsed).some(k => dataKeys.includes(k))) {
              matchedSomething = true;
              console.log("HOOK: Detected JSON in stream", parsed);
              
              if (parsed.campaign_name) { updateState({ brief_data: parsed }); onDataReceived?.('brief'); }
              if (parsed.summary) { updateState({ analysis_data: parsed }); onDataReceived?.('analysis'); }
              if (parsed.segments) { updateState({ segments_data: parsed }); onDataReceived?.('segmentation'); }
              if (parsed.content_drafts || parsed.drafts || parsed.posts) { updateState({ content_data: parsed }); onDataReceived?.('content'); }
              if (parsed.status) { updateState({ review_data: parsed }); onDataReceived?.('content'); }
              
              cleanDisplay = cleanDisplay.replace(match, '').trim();
            }
          } catch (e) {}
        }

        if (matchedSomething && (!cleanDisplay || cleanDisplay === ".")) {
          return { isMatch: true, content: "_Structured data updated. See dashboard for details._" };
        }
        return { isMatch: matchedSomething, content: cleanDisplay };
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
              if (agentName && agentName !== lastKnownAgent) {
                lastKnownAgent = agentName;
                setCurrentAgent(agentName);
                setAgentHistory(prev => {
                  const next = prev.map(s => ({ ...s, active: false }));
                  return [...next, { id: agentName, name: agentName.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()), active: true }];
                });
              }

              if (data.actions && Array.isArray(data.actions)) {
                const lastAction = data.actions[data.actions.length - 1];
                if (lastAction.tool_call) setActiveTool(`Executing ${lastAction.tool_call.name}...`);
                if (lastAction.tool_response) setActiveTool(`Finished ${lastAction.tool_response.name}`);
              }

              if (data.session_state) {
                updateState(data.session_state);
                if (data.session_state.brief_data) onDataReceived?.('brief');
                if (data.session_state.analysis_data) onDataReceived?.('analysis');
                if (data.session_state.segments_data) onDataReceived?.('segmentation');
                if (data.session_state.content_data) onDataReceived?.('content');
                if (data.session_state.review_data) onDataReceived?.('content');
              }

              if (data.content && data.content.parts) {
                const chunkText = data.content.parts.map(p => p.text || '').join('');
                if (chunkText) {
                  if (chunkText.startsWith(fullText)) {
                    fullText = chunkText;
                  } else if (!fullText.endsWith(chunkText)) {
                    fullText += chunkText;
                  }

                  const { isMatch, content } = processJsonInText(fullText);
                  let finalDisplay = content;

                  if (!isMatch && fullText.trim().startsWith('{') && fullText.trim().length > 5) {
                    finalDisplay = "...";
                  }

                  setMessages(prev => {
                    const next = [...prev];
                    const lastIdx = next.length - 1;
                    next[lastIdx] = { ...next[lastIdx], parts: [{ text: finalDisplay }], agentId: lastKnownAgent };
                    return next;
                  });
                }
              }
            } catch (e) {}
          }
        }
      }
      
      const { isMatch } = processJsonInText(fullText);
      if (isMatch) {
        setMessages(prev => {
          const next = [...prev];
          next[next.length - 1].parts = [{ text: "_Structured data updated._" }];
          return next;
        });
      }

    } catch (error: any) {
      console.error(error);
    } finally {
      setIsStreaming(false);
      setActiveTool(null);
      setAgentHistory(prev => prev.map(s => ({ ...s, active: false })));
    }
  }, [updateState]);

  const clearMessages = () => {
    setMessages([]);
    setAgentHistory([]);
  };

  return { messages, isStreaming, currentAgent, activeTool, agentHistory, sendMessage, clearMessages };
};
