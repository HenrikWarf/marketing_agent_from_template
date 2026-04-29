import React, { useState, useEffect, useRef, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import { useBlackboard } from './hooks/useBlackboard';
import ChatInterface from './components/ChatInterface';
import BlackboardCard from './components/BlackboardCard';
import PlaceholderCard from './components/PlaceholderCard';
import Modal from './components/Modal';
import ActivationModal from './components/ActivationModal';
import BriefPanel from './components/BriefPanel';
import AnalysisPanel from './components/AnalysisPanel';
import SegmentationPanel from './components/SegmentationPanel';
import ContentPanel from './components/ContentPanel';
import ReviewPanel from './components/ReviewPanel';
import RecommendationPanel from './components/RecommendationPanel';
import CampaignPortal from './components/CampaignPortal';
import './styles/Dashboard.css';
import { 
  BarChart3, 
  Users, 
  PenTool, 
  ShieldCheck, 
  Globe, 
  Bot,
  Settings,
  LayoutGrid,
  Sparkles,
  Database,
  ClipboardList,
  Lightbulb,
  Rocket,
  Zap
} from 'lucide-react';

type ViewType = 'analysis' | 'recommendations' | 'brief' | 'content' | 'grid';

const Dashboard: React.FC = () => {
  const { state } = useBlackboard();
  const [activeView, setActiveView] = useState<ViewType>('analysis');
  const [isGridView, setIsGridView] = useState(false);
  
  const seenDataRef = useRef<Record<string, string | null>>({
    analysis: null,
    recommendations: null,
    brief: null,
    content: null
  });

  useEffect(() => {
    const checkUpdate = (key: keyof typeof state, view: ViewType) => {
      const currentData = JSON.stringify(state[key]);
      if (state[key] && currentData !== seenDataRef.current[view]) {
        console.log(`MONITOR: Detected new data for ${view}, switching view...`);
        seenDataRef.current[view] = currentData;
        setActiveView(view);
        setIsGridView(false);
      }
    };

    checkUpdate('analysis_data', 'analysis');
    checkUpdate('recommendations_data', 'recommendations');
    checkUpdate('brief_data', 'brief');
    checkUpdate('content_data', 'content');
    
    if (state.segments_data && JSON.stringify(state.segments_data) !== seenDataRef.current['strategy']) {
        seenDataRef.current['strategy'] = JSON.stringify(state.segments_data);
        setActiveView('brief');
        setIsGridView(false);
    }
    if (state.review_data && JSON.stringify(state.review_data) !== seenDataRef.current['review']) {
        seenDataRef.current['review'] = JSON.stringify(state.review_data);
        setActiveView('content');
        setIsGridView(false);
    }
  }, [state]);

  const VIEWS = [
    { id: 'analysis', title: 'Data Analysis', icon: BarChart3, color: 'var(--analysis-color)', data: state.analysis_data, panel: AnalysisPanel, msg: "Connect to BigQuery to begin your marketing analysis." },
    { id: 'recommendations', title: 'AI Recommendations', icon: Lightbulb, color: 'var(--segment-color)', data: state.recommendations_data, panel: RecommendationPanel, msg: "Get data-driven campaign ideas from our strategy engine." },
    { id: 'brief', title: 'Strategy & Audience', icon: ClipboardList, color: '#1a73e8', data: state.brief_data || state.segments_data, msg: "Define your campaign strategy and identify target segments." },
    { id: 'content', title: 'Content & Review', icon: PenTool, color: 'var(--content-color)', data: state.content_data || state.review_data, msg: "Draft and review your personalized marketing content." },
  ];

  const toggleGrid = () => setIsGridView(!isGridView);

  return (
    <div className="dashboard-workspace">
      <nav className="dashboard-menu-rail">
        <div 
          className={`menu-item ${isGridView ? 'active' : ''}`} 
          onClick={toggleGrid}
          title="Toggle Grid View"
          style={{ '--active-color': 'var(--google-blue)' } as any}
        >
          <LayoutGrid size={20} />
        </div>
        
        <div className="menu-divider" />

        {VIEWS.map(view => (
          <div 
            key={view.id}
            className={`menu-item ${!isGridView && activeView === view.id ? 'active' : ''}`}
            onClick={() => { setActiveView(view.id as ViewType); setIsGridView(false); }}
            title={view.title}
            style={{ '--active-color': view.color } as any}
          >
            <view.icon size={20} />
            {view.data && <div className="menu-data-dot" />}
          </div>
        ))}
      </nav>

      <div className="dashboard-display-area">
        {isGridView ? (
          <div className="dashboard-grid view-transition-container">
            {VIEWS.map(view => (
              <BlackboardCard 
                key={view.id}
                title={view.title} 
                icon={view.icon} 
                color={view.color}
                isEmpty={!view.data}
              >
                {view.id === 'brief' ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        {state.brief_data && <BriefPanel data={state.brief_data} />}
                        {state.segments_data && <SegmentationPanel data={state.segments_data} />}
                    </div>
                ) : view.id === 'content' ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        {state.content_data && <ContentPanel data={state.content_data} />}
                        {state.review_data && <ReviewPanel data={state.review_data} />}
                    </div>
                ) : (
                    view.data ? <view.panel data={view.data as any} /> : <div style={{padding: '20px', textAlign: 'center', opacity: 0.5}}><Sparkles size={24} /></div>
                )}
              </BlackboardCard>
            ))}
          </div>
        ) : (
          <div className="view-transition-container" key={activeView}>
            {activeView === 'brief' ? (
                (state.brief_data || state.segments_data) ? (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '24px' }}>
                        <BlackboardCard title="Campaign Brief" icon={ClipboardList} color="#1a73e8" isEmpty={!state.brief_data}>
                            {state.brief_data && <BriefPanel data={state.brief_data} />}
                        </BlackboardCard>
                        <BlackboardCard title="Target Segments" icon={Users} color="var(--segment-color)" isEmpty={!state.segments_data}>
                            {state.segments_data && <SegmentationPanel data={state.segments_data} />}
                        </BlackboardCard>
                    </div>
                ) : (
                    <PlaceholderCard title="Strategy & Audience" icon={ClipboardList} color="#1a73e8" message="Define your campaign strategy and identify target segments." />
                )
            ) : activeView === 'content' ? (
                (state.content_data || state.review_data) ? (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '24px' }}>
                        <BlackboardCard title="Content Drafts" icon={PenTool} color="var(--content-color)" isEmpty={!state.content_data}>
                            {state.content_data && <ContentPanel data={state.content_data} />}
                        </BlackboardCard>
                        <BlackboardCard title="Brand Review" icon={ShieldCheck} color="var(--review-color)" isEmpty={!state.review_data}>
                            {state.review_data && <ReviewPanel data={state.review_data} />}
                        </BlackboardCard>
                    </div>
                ) : (
                    <PlaceholderCard title="Content & Review" icon={PenTool} color="var(--content-color)" message="Draft and review your personalized marketing content." />
                )
            ) : VIEWS.find(v => v.id === activeView)?.data ? (
              (() => {
                const view = VIEWS.find(v => v.id === activeView)!;
                return (
                  <BlackboardCard 
                    title={view.title} 
                    icon={view.icon} 
                    color={view.color}
                    isEmpty={false}
                  >
                    <view.panel data={view.data as any} />
                  </BlackboardCard>
                );
              })()
            ) : (
              (() => {
                const view = VIEWS.find(v => v.id === activeView)!;
                return (
                  <PlaceholderCard 
                    title={view.title}
                    icon={view.icon}
                    color={view.color}
                    message={view.msg}
                  />
                );
              })()
            )}
          </div>
        )}
      </div>
    </div>
  );
};

const App: React.FC = () => {
  const { state } = useBlackboard();
  const [showPortal, setShowPortal] = useState(false);
  const [environments, setEnvironments] = useState<any[]>([]);
  const [currentEnv, setCurrentEnv] = useState('local');
  const [agents, setAgents] = useState<any[]>([]);
  const [currentAgent, setCurrentAgent] = useState('');
  const [sessionId, setSessionId] = useState('');

  // Modals state
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isDataOpen, setIsDataOpen] = useState(false);
  const [isActivationOpen, setIsActivationOpen] = useState(false);
  const [companyContext, setCompanyContext] = useState('');
  const [brandGuidelines, setBrandGuidelines] = useState('');
  const [customerSchema, setCustomerSchema] = useState<any[]>([]);

  useEffect(() => {
    fetch('/api/environments')
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data) {
          setEnvironments(data.environments || []);
          if (data.environments?.length > 0) setCurrentEnv(data.environments[0].id);
        }
      });

    // Prefetch static data safely
    fetch('/api/context')
      .then(res => res.ok ? res.json() : null)
      .then(data => data && setCompanyContext(data.content || ''))
      .catch(() => {});

    fetch('/api/guidelines')
      .then(res => res.ok ? res.json() : null)
      .then(data => data && setBrandGuidelines(data.content || ''))
      .catch(() => {});

    fetch('/api/schema')
      .then(res => res.ok ? res.json() : null)
      .then(data => data && setCustomerSchema(data.schema || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!currentEnv) return;
    setAgents([]); 
    setCurrentAgent(''); 
    
    fetch(`/api/agents?env=${currentEnv}`)
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data && data.agents && data.agents.length > 0) {
          setAgents(data.agents);
          setCurrentAgent(data.agents[0].id);
        } else {
          setAgents([]);
          setCurrentAgent('');
        }
      });
  }, [currentEnv]);

  const handleNewSession = useCallback(async () => {
    if (!currentAgent) {
      console.warn("UI: No agent selected, skipping session creation.");
      return;
    }
    
    try {
      const res = await fetch(`/api/sessions?env=${currentEnv}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ app_name: currentAgent, user_id: 'user-local' })
      });
      const data = await res.json();
      if (data.session_id) setSessionId(data.session_id);
    } catch (e) {
      console.error("UI: Session creation failed", e);
    }
  }, [currentAgent, currentEnv]);

  useEffect(() => {
    if (currentAgent) handleNewSession();
  }, [currentAgent, handleNewSession]);

  return (
    <div className="app-container">
      {showPortal ? (
        <CampaignPortal onBack={() => setShowPortal(false)} />
      ) : (
        <>
          <aside className="sidebar">
            <ChatInterface 
              currentEnv={currentEnv} 
              agentId={currentAgent} 
              sessionId={sessionId}
              onNewSession={handleNewSession}
              onDataReceived={(type) => {
                console.log("UI: Auto-switching view to", type);
              }}
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
                <button 
                  className="icon-button" 
                  onClick={() => setShowPortal(true)}
                  title="Campaign Portal"
                  style={{ marginRight: '8px' }}
                >
                  <Zap size={20} color="#1e8e3e" />
                </button>
                <button 
                  className="activate-button" 
                  onClick={() => setIsActivationOpen(true)}
                  title="Launch Campaign"
                >
                  <Rocket size={16} />
                  <span>Activate</span>
                </button>
                <div className="action-divider" />
                <button className="icon-button" title="Data Reference" onClick={() => setIsDataOpen(true)}>
                  <Database size={20} />
                </button>
                <button className="icon-button" title="Brand Settings" onClick={() => setIsSettingsOpen(true)}>
                  <Settings size={20} />
                </button>
                <div className="user-avatar">
                  HW
                </div>
              </div>
            </header>

            <Dashboard />
          </main>

          {/* Activation Modal */}
          <ActivationModal 
            isOpen={isActivationOpen}
            onClose={() => setIsActivationOpen(false)}
            strategy={state.brief_data}
            segmentation={state.segments_data}
            content={state.content_data}
          />

          {/* Settings Modal */}
          <Modal 
            isOpen={isSettingsOpen} 
            onClose={() => setIsSettingsOpen(false)} 
            title="Brand Settings & Context"
            icon={<Settings size={20} />}
          >
            <div className="modal-section">
              <h3>Company Profile</h3>
              <div className="markdown-body" style={{ fontSize: '0.9rem' }}>
                <ReactMarkdown>{companyContext}</ReactMarkdown>
              </div>
            </div>
            <div className="modal-section">
              <h3>Brand Guidelines</h3>
              <div className="markdown-body" style={{ fontSize: '0.9rem' }}>
                <ReactMarkdown>{brandGuidelines}</ReactMarkdown>
              </div>
            </div>
          </Modal>

          {/* Data Reference Modal */}
          <Modal 
            isOpen={isDataOpen} 
            onClose={() => setIsDataOpen(false)} 
            title="Data Reference (BigQuery)"
            icon={<Database size={20} />}
          >
            <div className="modal-section">
              <h3>Marketing Data Schema</h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--google-gray)', marginBottom: '16px' }}>
                The Crazy Furnishing Company dataset includes customer, product, and sales history.
              </p>
              <table className="schema-table">
                <thead>
                  <tr>
                    <th>Table</th>
                    <th>Column</th>
                    <th>Type</th>
                    <th>Description</th>
                  </tr>
                </thead>
                <tbody>
                  {customerSchema && (Array.isArray(customerSchema) ? (
                    customerSchema.map(col => (
                      <tr key={col.name}>
                        <td style={{ opacity: 0.6, fontSize: '0.75rem', verticalAlign: 'top', paddingTop: '14px' }}>customer</td>
                        <td style={{ fontWeight: 500 }}>{col.name}</td>
                        <td><span className="type-tag">{col.type}</span></td>
                        <td style={{ color: 'var(--google-gray)' }}>{col.description}</td>
                      </tr>
                    ))
                  ) : (
                    Object.entries(customerSchema).map(([tableName, columns]) => (
                      Array.isArray(columns) && columns.map(col => (
                        <tr key={`${tableName}-${col.name}`}>
                          <td style={{ opacity: 0.6, fontSize: '0.75rem', verticalAlign: 'top', paddingTop: '14px' }}>{tableName}</td>
                          <td style={{ fontWeight: 500 }}>{col.name}</td>
                          <td><span className="type-tag">{col.type}</span></td>
                          <td style={{ color: 'var(--google-gray)' }}>{col.description}</td>
                        </tr>
                      ))
                    ))
                  ))}
                </tbody>
              </table>
            </div>
          </Modal>
        </>
      )}
    </div>
  );
};

export default App;
