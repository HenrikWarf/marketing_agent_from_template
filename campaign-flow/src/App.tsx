import React, { useState, useEffect } from 'react';
import { BlackboardProvider, useBlackboard } from './context/BlackboardContext';
import ChatInterface from './components/ChatInterface';
import BlackboardCard from './components/BlackboardCard';
import AnalysisPanel from './components/AnalysisPanel';
import SegmentationPanel from './components/SegmentationPanel';
import ContentPanel from './components/ContentPanel';
import ReviewPanel from './components/ReviewPanel';
import './styles/Dashboard.css';
import { 
  BarChart3, 
  Users, 
  PenTool, 
  ShieldCheck, 
  Globe, 
  Bot,
  Settings
} from 'lucide-react';

const Dashboard: React.FC<{ env: string, agentId: string, sessionId: string }> = ({ env, agentId, sessionId }) => {
  const { state } = useBlackboard();

  return (
    <div className="dashboard-grid">
      <BlackboardCard 
        title="Data Analysis" 
        icon={BarChart3} 
        color="var(--analysis-color)"
        isEmpty={!state.analysis_data}
      >
        {state.analysis_data && <AnalysisPanel data={state.analysis_data} />}
      </BlackboardCard>

      <BlackboardCard 
        title="Segmentation" 
        icon={Users} 
        color="var(--segment-color)"
        isEmpty={!state.segments_data}
      >
        {state.segments_data && <SegmentationPanel data={state.segments_data} />}
      </BlackboardCard>

      <BlackboardCard 
        title="Content Creation" 
        icon={PenTool} 
        color="var(--content-color)"
        isEmpty={!state.content_data}
      >
        {state.content_data && <ContentPanel data={state.content_data} />}
      </BlackboardCard>

      <BlackboardCard 
        title="Brand Review" 
        icon={ShieldCheck} 
        color="var(--review-color)"
        isEmpty={!state.review_data}
      >
        {state.review_data && <ReviewPanel data={state.review_data} />}
      </BlackboardCard>
    </div>
  );
};

const App: React.FC = () => {
  const [environments, setEnvironments] = useState<any[]>([]);
  const [currentEnv, setCurrentEnv] = useState('local');
  const [agents, setAgents] = useState<any[]>([]);
  const [currentAgent, setCurrentAgent] = useState('');
  const [sessionId, setSessionId] = useState('');

  useEffect(() => {
    fetch('/api/environments')
      .then(res => {
        if (!res.ok) throw new Error(`Status ${res.status}`);
        return res.json();
      })
      .then(data => {
        setEnvironments(data.environments || []);
        if (data.environments?.length > 0) setCurrentEnv(data.environments[0].id);
      })
      .catch(err => console.error("Failed to load environments:", err));
  }, []);

  useEffect(() => {
    if (!currentEnv) return;
    fetch(`/api/agents?env=${currentEnv}`)
      .then(res => {
        if (!res.ok) throw new Error(`Status ${res.status}`);
        return res.json();
      })
      .then(data => {
        setAgents(data.agents || []);
        if (data.agents?.length > 0) setCurrentAgent(data.agents[0].id);
      })
      .catch(err => console.error("Failed to load agents:", err));
  }, [currentEnv]);

  const handleNewSession = async () => {
    if (!currentAgent) return;
    const res = await fetch(`/api/sessions?env=${currentEnv}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ app_name: currentAgent, user_id: 'user-local' })
    });
    const data = await res.json();
    if (data.session_id) setSessionId(data.session_id);
  };

  useEffect(() => {
    if (currentAgent) handleNewSession();
  }, [currentAgent]);

  return (
    <BlackboardProvider>
      <div className="app-container">
        <aside className="sidebar">
          <ChatInterface 
            currentEnv={currentEnv} 
            agentId={currentAgent} 
            sessionId={sessionId}
            onNewSession={handleNewSession}
          />
        </aside>
        
        <main className="main-content">
          <header className="dashboard-header">
            <div className="header-controls">
              <div className="control-group">
                <Globe size={18} color="var(--google-gray)" />
                <select 
                  className="selector-transparent"
                  value={currentEnv} 
                  onChange={(e) => setCurrentEnv(e.target.value)}
                >
                  {environments.length > 0 ? (
                    environments.map(e => <option key={e.id} value={e.id}>{e.name}</option>)
                  ) : (
                    <option value="">Loading environments...</option>
                  )}
                </select>
              </div>
              
              <div className="control-group">
                <Bot size={18} color="var(--google-gray)" />
                <select 
                  className="selector-transparent"
                  value={currentAgent} 
                  onChange={(e) => setCurrentAgent(e.target.value)}
                >
                  {agents.length > 0 ? (
                    agents.map(a => <option key={a.id} value={a.id}>{a.name}</option>)
                  ) : (
                    <option value="">Loading agents...</option>
                  )}
                </select>
              </div>
            </div>

            <div className="header-actions">
              <button className="icon-button">
                <Settings size={20} />
              </button>
              <div className="user-avatar">
                HW
              </div>
            </div>
          </header>

          <Dashboard env={currentEnv} agentId={currentAgent} sessionId={sessionId} />
        </main>
      </div>
    </BlackboardProvider>
  );
};

export default App;
