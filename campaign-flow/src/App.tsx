import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import { BlackboardProvider, useBlackboard } from './context/BlackboardContext';
import ChatInterface from './components/ChatInterface';
import BlackboardCard from './components/BlackboardCard';
import PlaceholderCard from './components/PlaceholderCard';
import Modal from './components/Modal';
import BriefPanel from './components/BriefPanel';
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
  Settings,
  LayoutGrid,
  Sparkles,
  Database,
  ClipboardList
} from 'lucide-react';

type ViewType = 'brief' | 'analysis' | 'segmentation' | 'content' | 'review' | 'grid';

const Dashboard: React.FC = () => {
  const { state } = useBlackboard();
  const [activeView, setActiveView] = useState<ViewType>('brief');
  const [isGridView, setIsGridView] = useState(false);
  
  const seenDataRef = useRef<Record<string, string | null>>({
    brief: null,
    analysis: null,
    segmentation: null,
    content: null,
    review: null
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

    checkUpdate('brief_data', 'brief');
    checkUpdate('analysis_data', 'analysis');
    checkUpdate('segments_data', 'segmentation');
    checkUpdate('content_data', 'content');
    checkUpdate('review_data', 'review');
  }, [state]);

  const VIEWS = [
    { id: 'brief', title: 'Campaign Brief', icon: ClipboardList, color: '#1a73e8', data: state.brief_data, panel: BriefPanel, msg: "Start by defining your campaign strategy and goals." },
    { id: 'analysis', title: 'Data Analysis', icon: BarChart3, color: 'var(--analysis-color)', data: state.analysis_data, panel: AnalysisPanel, msg: "Connect to BigQuery to begin your marketing analysis." },
    { id: 'segmentation', title: 'Segmentation', icon: Users, color: 'var(--segment-color)', data: state.segments_data, panel: SegmentationPanel, msg: "Identify target audience segments based on data insights." },
    { id: 'content', title: 'Content Creation', icon: PenTool, color: 'var(--content-color)', data: state.content_data, panel: ContentPanel, msg: "Generate personalized marketing copy for your segments." },
    { id: 'review', title: 'Brand Review', icon: ShieldCheck, color: 'var(--review-color)', data: state.review_data, panel: ReviewPanel, msg: "Ensure all content aligns with brand and compliance guidelines." },
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
                {view.data ? <view.panel data={view.data as any} /> : <div style={{padding: '20px', textAlign: 'center', opacity: 0.5}}><Sparkles size={24} /></div>}
              </BlackboardCard>
            ))}
          </div>
        ) : (
          <div className="view-transition-container" key={activeView}>
            {VIEWS.find(v => v.id === activeView)?.data ? (
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
  const [environments, setEnvironments] = useState<any[]>([]);
  const [currentEnv, setCurrentEnv] = useState('local');
  const [agents, setAgents] = useState<any[]>([]);
  const [currentAgent, setCurrentAgent] = useState('');
  const [sessionId, setSessionId] = useState('');

  // Modals state
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isDataOpen, setIsDataOpen] = useState(false);
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
    setAgents([]); // Clear agents while loading
    setCurrentAgent(''); // Reset current agent
    
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

  const handleNewSession = async () => {
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
      </div>
    </BlackboardProvider>
  );
};

export default App;
