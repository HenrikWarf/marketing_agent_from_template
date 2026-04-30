import { useState, useCallback } from 'react';
import { useBlackboard } from './useBlackboard';

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
  content?: {
    parts?: { 
      text?: string;
      functionCall?: any;
      functionResponse?: any;
    }[];
  };
  actions?: {
    stateDelta?: any;
    state_delta?: any;
    transferToAgent?: string;
    transfer_to_agent?: string;
    endOfAgent?: boolean;
    end_of_agent?: boolean;
  };
  session_state?: any; // Legacy support
  state?: any; // Legacy support
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

      if (!reader) return;

      const processJsonInText = (text: string) => {
        let cleanDisplay = text;
        let matchedSomething = false;

        // 1. Try to find JSON in markdown blocks first (safest)
        const mdRegex = /```(?:json)?\s*([\s\S]*?)\s*```/g;
        let mdMatch;
        while ((mdMatch = mdRegex.exec(text)) !== null) {
          try {
            const rawJson = mdMatch[1];
            if (rawJson.length > 100000) continue; 
            const parsed = JSON.parse(rawJson);
            if (updateStateFromParsed(parsed)) {
              matchedSomething = true;
              cleanDisplay = cleanDisplay.replace(mdMatch[0], '').trim();
            }
          } catch (e) {}
        }

        // 2. Fallback: Search for potential JSON blocks starting from the end (most likely to be the final answer)
        if (!matchedSomething) {
          const indicators = ['"recommendations"', '"campaign_name"', '"summary"', '"segments"', '"content_drafts"', '"status"'];
          
          // Find all possible { } pairs
          const firstBrace = text.indexOf('{');
          const lastBrace = text.lastIndexOf('}');
          
          if (firstBrace !== -1 && lastBrace > firstBrace) {
            // Heuristic: try to parse from first brace to last brace
            const block = text.substring(firstBrace, lastBrace + 1);
            if (block.length < 200000 && indicators.some(ind => block.includes(ind))) {
                try {
                    const parsed = JSON.parse(block);
                    if (updateStateFromParsed(parsed)) {
                        matchedSomething = true;
                        cleanDisplay = cleanDisplay.substring(0, firstBrace) + cleanDisplay.substring(lastBrace + 1);
                    }
                } catch (e) {
                    // If parsing the whole block fails, the model might have prepended text
                    // We could try to find the actual start of JSON
                }
            }
          }
        }

        if (matchedSomething && (!cleanDisplay || cleanDisplay === "." || cleanDisplay.length < 5)) {
          return { isMatch: true, content: "_Structured data updated. View dashboard._" };
        }
        return { isMatch: matchedSomething, content: cleanDisplay };
      };

      const updateStateFromParsed = (parsed: any): boolean => {
        const data = parsed.agent_response || parsed;
        let foundKey = false;
        
        if (data.recommendations) { updateState({ recommendations_data: data }); onDataReceived?.('recommendations'); foundKey = true; }
        if (data.campaign_name) { updateState({ brief_data: data }); onDataReceived?.('brief'); foundKey = true; }
        if (data.summary || data.visualizations || data.key_metrics) { updateState({ analysis_data: data }); onDataReceived?.('analysis'); foundKey = true; }
        if (data.segments) { updateState({ segments_data: data }); onDataReceived?.('segmentation'); foundKey = true; }
        if (data.content_drafts || data.drafts) { updateState({ content_data: data }); onDataReceived?.('content'); foundKey = true; }
        if (data.status === 'VERIFIED' || data.status === 'REJECTED') { updateState({ review_data: data }); onDataReceived?.('content'); foundKey = true; }
        
        if (foundKey) {
            console.log("HOOK: State updated from parsed JSON", data);
        }
        return foundKey;
      };

      let reading = true;
      let lineBuffer = '';

      while (reading) {
        const { value, done } = await reader.read();
        if (done) {
          reading = false;
          break;
        }

        const chunk = decoder.decode(value, { stream: true });
        lineBuffer += chunk;
        const lines = lineBuffer.split('\n');
        
        // Keep the last partial line in the buffer
        lineBuffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const rawData = line.slice(6);
              if (rawData === '[DONE]') continue;
              if (!rawData.trim()) continue;

              const data: ChatEvent = JSON.parse(rawData);

              if (data.error) {
                setMessages(prev => {
                  const next = [...prev];
                  const lastIdx = next.length - 1;
                  next[lastIdx] = { 
                    ...next[lastIdx], 
                    parts: [{ text: `Error: ${data.error}` }],
                    agentId: 'System'
                  };
                  return next;
                });
                return;
              }

              const agentName = data.author || data.agent_name;
              if (agentName && agentName !== lastKnownAgent) {
                lastKnownAgent = agentName;
                setCurrentAgent(agentName);
                setAgentHistory(prev => {
                  const next = prev.map(s => ({ ...s, active: false }));
                  return [...next, { id: agentName, name: agentName.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()), active: true }];
                });
              }

              // Handle ADK Event structure (actions object)
              const actions = data.actions;
              if (actions) {
                const stateDelta = actions.stateDelta || actions.state_delta;
                if (stateDelta) {
                  updateState(stateDelta);
                  if (stateDelta.recommendations_data) onDataReceived?.('recommendations');
                  if (stateDelta.brief_data) onDataReceived?.('brief');
                  if (stateDelta.analysis_data) onDataReceived?.('analysis');
                  if (stateDelta.segments_data) onDataReceived?.('segmentation');
                  if (stateDelta.content_data) onDataReceived?.('content');
                  if (stateDelta.review_data) onDataReceived?.('content');
                }
              }

              // Handle direct session_state or state fields (Legacy/Custom)
              const sessionState = data.session_state || data.state;
              if (sessionState) {
                updateState(sessionState);
                if (sessionState.recommendations_data) onDataReceived?.('recommendations');
                if (sessionState.brief_data) onDataReceived?.('brief');
                if (sessionState.analysis_data) onDataReceived?.('analysis');
                if (sessionState.segments_data) onDataReceived?.('segmentation');
                if (sessionState.content_data) onDataReceived?.('content');
                if (sessionState.review_data) onDataReceived?.('content');
              }

              if (data.content && data.content.parts) {
                let chunkText = '';
                for (const part of data.content.parts) {
                  if (part.text) {
                    chunkText += part.text;
                  } else if (part.functionCall) {
                    setActiveTool(`Executing ${part.functionCall.name}...`);
                  } else if (part.functionResponse) {
                    setActiveTool(`Finished ${part.functionResponse.name}`);
                  }
                }

                if (chunkText) {
                  if (chunkText.startsWith(fullText)) {
                    fullText = chunkText;
                  } else if (!fullText.endsWith(chunkText)) {
                    fullText += chunkText;
                  }

                  const { isMatch, content } = processJsonInText(fullText);
                  let finalDisplay = content;

                  // Mask JSON blocks during streaming
                  if (!isMatch && fullText.trim().startsWith('{') && fullText.trim().length > 10) {
                    finalDisplay = "Generating structured data...";
                  }

                  setMessages(prev => {
                    const next = [...prev];
                    const lastIdx = next.length - 1;
                    next[lastIdx] = { ...next[lastIdx], parts: [{ text: finalDisplay }], agentId: lastKnownAgent };
                    return next;
                  });
                }
              }
            } catch (e) {
              console.error("HOOK: Event parse failed", e);
            }
          }
        }
      }
      
      const { isMatch } = processJsonInText(fullText);
      if (isMatch) {
        setMessages(prev => {
          const next = [...prev];
          next[next.length - 1].parts = [{ text: "_Structured data updated. View results in the dashboard._" }];
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
