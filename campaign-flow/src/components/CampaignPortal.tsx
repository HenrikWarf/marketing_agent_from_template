import React, { useState, useEffect } from 'react';
import { Rocket, Calendar, ArrowLeft, Mail, MessageSquare, Smartphone, Users, ChevronRight, FileText, Trash2, Globe, Copy, Terminal } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import '../styles/CampaignPortal.css';

const CampaignPortal: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedCampaign, setSelectedCampaign] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchCampaigns();
  }, []);

  const fetchCampaigns = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/activated-campaigns');
      const data = await res.json();
      if (data.campaigns) setCampaigns(data.campaigns);
    } catch (e) {
      console.error("Portal: Failed to fetch campaigns", e);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchCampaignDetails = async (id: string) => {
    try {
      const res = await fetch(`/api/activated-campaigns/${id}`);
      const data = await res.json();
      setSelectedCampaign(data);
      setSelectedId(id);
    } catch (e) {
      console.error("Portal: Failed to fetch campaign details", e);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Are you sure you want to permanently delete this activated campaign?")) return;
    
    try {
      const res = await fetch(`/api/activated-campaigns/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.status === 'success') {
        setSelectedId(null);
        setSelectedCampaign(null);
        fetchCampaigns();
      }
    } catch (e) {
      console.error("Portal: Delete failed", e);
    }
  };

  const getIcon = (channel: string) => {
    const c = channel.toLowerCase();
    if (c.includes('email')) return <Mail size={16} />;
    if (c.includes('sms')) return <Smartphone size={16} />;
    return <MessageSquare size={16} />;
  };

  const getDraftContent = (draft: any) => {
    return draft.text_content || draft.content || draft.copy || draft.body || draft.text || draft.message || '';
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  if (selectedId && selectedCampaign) {
    const baseUrl = `http://localhost:3000/api/activated-campaigns/${selectedId}`;
    
    return (
      <div className="portal-container">
        <header className="portal-header">
          <button className="back-link" onClick={() => { setSelectedId(null); setSelectedCampaign(null); }}>
            <ArrowLeft size={18} />
            <span>Back to Campaigns</span>
          </button>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <button className="btn-delete-campaign" onClick={() => handleDelete(selectedId)}>
              <Trash2 size={16} />
              <span>Delete Campaign</span>
            </button>
            <div className="header-badge live">LIVE</div>
          </div>
        </header>

        <div className="campaign-detail-view">
          <div className="detail-hero">
            <h1>{selectedCampaign.name}</h1>
            <div className="hero-meta">
              <span>ID: {selectedCampaign.id}</span>
              <span className="dot">•</span>
              <span>Activated: {new Date(selectedCampaign.activated_at).toLocaleDateString()}</span>
            </div>
          </div>

          <div className="detail-grid">
            <section className="detail-section">
              <div className="section-title">
                <Globe size={18} />
                <h3>Activation API & JSON Schema</h3>
              </div>
              <div className="api-config-card">
                <div className="api-row">
                  <label>Base Endpoint</label>
                  <div className="copy-box">
                    <code>{baseUrl}</code>
                    <button onClick={() => copyToClipboard(baseUrl)}><Copy size={14} /></button>
                  </div>
                </div>
                <div className="api-schema-grid">
                  <div className="schema-item">
                    <label>Strategy Path</label>
                    <code>$.strategy</code>
                  </div>
                  <div className="schema-item">
                    <label>Segments Path</label>
                    <code>$.segments</code>
                  </div>
                  {selectedCampaign.content.content_drafts.map((d: any) => (
                    <div key={d.channel} className="schema-item">
                      <label>{d.channel} Content</label>
                      <code>$.content.content_drafts[?(@.channel=='{d.channel}')]</code>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            <section className="detail-section">
              <div className="section-title">
                <FileText size={18} />
                <h3>Strategy Brief</h3>
              </div>
              <div className="brief-card">
                <div className="brief-item">
                  <label>Business Opportunity</label>
                  <p>{selectedCampaign.strategy.business_opportunity}</p>
                </div>
                <div className="brief-item">
                  <label>Primary Goal</label>
                  <p>{selectedCampaign.strategy.primary_goal}</p>
                </div>
                <div className="brief-item">
                  <label>Success KPI</label>
                  <span className="kpi-tag">{selectedCampaign.strategy.success_kpi}</span>
                </div>
              </div>
            </section>

            <section className="detail-section">
              <div className="section-title">
                <Users size={18} />
                <h3>Target Segments</h3>
              </div>
              <div className="segments-grid">
                {selectedCampaign.segments.map((s: any) => (
                  <div key={s.name} className="segment-pill">
                    <div className="segment-pill-header">
                        <span className="name">{s.name}</span>
                        <span className="count">{s.count.toLocaleString()} users</span>
                    </div>
                    {s.sql && (
                        <div className="segment-sql-preview">
                            <Terminal size={12} />
                            <code>{s.sql.substring(0, 60)}...</code>
                        </div>
                    )}
                  </div>
                ))}
              </div>
            </section>

            <section className="detail-section full-width">
              <div className="section-title">
                <MessageSquare size={18} />
                <h3>Activated Content</h3>
              </div>
              <div className="portal-content-grid">
                {selectedCampaign.content.content_drafts.map((draft: any) => (
                  <div key={draft.channel} className="portal-draft-card">
                    <div className="draft-card-header">
                      {getIcon(draft.channel)}
                      <span>{draft.channel}</span>
                    </div>
                    {draft.subject && <div className="draft-card-subject">Subject: {draft.subject}</div>}
                    <div className="draft-card-body markdown-body">
                      <ReactMarkdown>{getDraftContent(draft)}</ReactMarkdown>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="portal-container">
      <header className="portal-header">
        <div className="header-title">
          <Rocket size={24} color="#1e8e3e" />
          <h2>Campaign Activation Portal</h2>
        </div>
        <button className="btn-close-portal" onClick={onBack}>
          Exit Portal
        </button>
      </header>

      <div className="portal-content">
        <div className="portal-summary">
          <div className="summary-stat">
            <span className="stat-value">{campaigns.length}</span>
            <span className="stat-label">Active Campaigns</span>
          </div>
        </div>

        {isLoading ? (
          <div className="portal-loading">Loading activated campaigns...</div>
        ) : campaigns.length === 0 ? (
          <div className="portal-empty">
            <Rocket size={48} strokeWidth={1} />
            <h3>No campaigns activated yet</h3>
            <p>Go back to the orchestrator to build and launch your first campaign.</p>
          </div>
        ) : (
          <div className="campaign-list">
            {campaigns.map(c => (
              <div key={c.id} className="campaign-list-item" onClick={() => fetchCampaignDetails(c.id)}>
                <div className="item-main">
                  <h4 className="item-name">{c.name}</h4>
                  <div className="item-meta">
                    <Calendar size={14} />
                    <span>{new Date(c.created_at).toLocaleDateString()}</span>
                    <span className="dot">•</span>
                    <span>ID: {c.id}</span>
                  </div>
                </div>
                <ChevronRight size={20} color="#dadce0" />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default CampaignPortal;
