import React, { useState } from 'react';
import { Rocket, CheckCircle2, ChevronDown, ChevronUp, Copy, AlertTriangle, Terminal } from 'lucide-react';
import Modal from './Modal';
import { BriefData, SegmentationData, ContentData } from '../context/BlackboardContext';
import '../styles/ActivationModal.css';

interface ActivationModalProps {
  isOpen: boolean;
  onClose: () => void;
  strategy: BriefData | null;
  segmentation: SegmentationData | null;
  content: ContentData | null;
}

const ActivationModal: React.FC<ActivationModalProps> = ({ isOpen, onClose, strategy, segmentation, content }) => {
  const [step, setStep] = useState<'review' | 'confirm' | 'success'>('review');
  const [selectedSegments, setSelectedSegments] = useState<string[]>([]);
  const [selectedDrafts, setSelectedDrafts] = useState<string[]>([]);
  const [expandedSql, setExpandedSql] = useState<string | null>(null);
  const [expandedDraft, setExpandedDraft] = useState<string | null>(null);
  const [activationResult, setActivationResult] = useState<{ id: string, url: string } | null>(null);
  const [isActivating, setIsActivating] = useState(false);

  if (!strategy || !segmentation || !content) {
    return (
      <Modal isOpen={isOpen} onClose={onClose} title="Campaign Activation" icon={<Rocket size={20} />}>
        <div className="activation-error">
          <AlertTriangle size={48} color="#f9ab00" />
          <p>Please complete the Strategy, Segmentation, and Content phases before activating.</p>
          <button className="btn-secondary" onClick={onClose}>Close</button>
        </div>
      </Modal>
    );
  }

  const handleActivate = async () => {
    setIsActivating(true);
    try {
      const payload = {
        name: strategy.campaign_name,
        strategy: strategy,
        segments: segmentation.segments.filter(s => selectedSegments.includes(s.name)),
        content: {
            ...content,
            content_drafts: content.content_drafts.filter(d => selectedDrafts.includes(d.channel))
        }
      };

      const response = await fetch('/api/activate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      const data = await response.json();
      if (data.status === 'success') {
        setActivationResult({ id: data.campaign_id, url: data.url });
        setStep('success');
      }
    } catch (e) {
      console.error("Activation failed", e);
    } finally {
      setIsActivating(false);
    }
  };

  const getDraftContent = (draft: any) => {
    return draft.copy || draft.content || draft.text || draft.body || draft.message || '';
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Campaign Activation" icon={<Rocket size={20} />}>
      {step === 'review' && (
        <div className="activation-flow">
          <p className="flow-intro">Finalize your campaign components before deployment.</p>
          
          {/* 1. Content Selection (MOVED TO TOP) */}
          <section className="activation-section">
            <h3>1. Select Content Drafts</h3>
            <div className="segments-selection-list">
              {content.content_drafts?.map((draft: any) => (
                <div key={draft.channel} className="segment-select-item">
                  <label className="checkbox-container">
                    <input 
                      type="checkbox" 
                      checked={selectedDrafts.includes(draft.channel)}
                      onChange={(e) => {
                        if (e.target.checked) setSelectedDrafts([...selectedDrafts, draft.channel]);
                        else setSelectedDrafts(selectedDrafts.filter(c => c !== draft.channel));
                      }}
                    />
                    <span className="checkmark"></span>
                    <div className="segment-info">
                      <span className="name">{draft.channel}</span>
                      <span className="count">{draft.subject || "Message Draft"}</span>
                    </div>
                  </label>
                  <button className="sql-toggle" onClick={() => setExpandedDraft(expandedDraft === draft.channel ? null : draft.channel)}>
                    {expandedDraft === draft.channel ? <ChevronUp size={14} /> : <ChevronDown size={14} />} View Full Content
                  </button>
                  {expandedDraft === draft.channel && (
                    <div className="content-preview-box">
                      <pre>{getDraftContent(draft)}</pre>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>

          {/* 2. Segment Selection */}
          <section className="activation-section">
            <h3>2. Select Target Segments</h3>
            <div className="segments-selection-list">
              {segmentation.segments.map(s => (
                <div key={s.name} className="segment-select-item">
                  <label className="checkbox-container">
                    <input 
                      type="checkbox" 
                      checked={selectedSegments.includes(s.name)}
                      onChange={(e) => {
                        if (e.target.checked) setSelectedSegments([...selectedSegments, s.name]);
                        else setSelectedSegments(selectedSegments.filter(name => name !== s.name));
                      }}
                    />
                    <span className="checkmark"></span>
                    <div className="segment-info">
                      <span className="name">{s.name}</span>
                      <span className="count">{s.count.toLocaleString()} users</span>
                    </div>
                  </label>
                  <button className="sql-toggle" onClick={() => setExpandedSql(expandedSql === s.name ? null : s.name)}>
                    <Terminal size={12} style={{marginRight: '4px'}} />
                    {expandedSql === s.name ? <ChevronUp size={14} /> : <ChevronDown size={14} />} SQL Logic
                  </button>
                  {expandedSql === s.name && (
                    <div className="sql-panel">
                      <code>{s.sql || "-- No specific SQL logic provided by agent."}</code>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>

          <footer className="activation-footer">
            <button className="btn-secondary" onClick={onClose}>Cancel</button>
            <button 
              className="btn-primary" 
              disabled={selectedSegments.length === 0 || selectedDrafts.length === 0}
              onClick={() => setStep('confirm')}
            >
              Continue to Confirmation
            </button>
          </footer>
        </div>
      )}

      {step === 'confirm' && (
        <div className="activation-confirm">
          <div className="confirm-icon">
            <Rocket size={48} className="rocket-animate" />
          </div>
          <h2>Ready to Launch?</h2>
          <p>You are about to activate <strong>{strategy.campaign_name}</strong>.</p>
          <div className="confirm-details">
            <ul>
              <li><strong>Targeting:</strong> {selectedSegments.join(', ')}</li>
              <li><strong>Channels:</strong> {selectedDrafts.join(', ')}</li>
              <li><strong>Primary Goal:</strong> {strategy.primary_goal}</li>
            </ul>
          </div>
          <div className="activation-footer">
            <button className="btn-secondary" onClick={() => setStep('review')}>Back</button>
            <button className="btn-primary launch" onClick={handleActivate} disabled={isActivating}>
              {isActivating ? "Activating..." : "Confirm & Activate"}
            </button>
          </div>
        </div>
      )}

      {step === 'success' && (
        <div className="activation-success">
          <CheckCircle2 size={64} color="#1e8e3e" />
          <h2>Campaign Activated!</h2>
          <p>Successfully stored campaign <strong>{activationResult?.id}</strong> in the local database.</p>
          
          <div className="api-output-box">
            <label>Activation API Endpoint</label>
            <div className="url-copy-row">
              <input type="text" readOnly value={activationResult?.url} />
              <button onClick={() => navigator.clipboard.writeText(activationResult?.url || '')}>
                <Copy size={16} />
              </button>
            </div>
            <p className="api-note">This endpoint provides structured campaign material for downstream execution tools.</p>
          </div>

          <div className="activation-footer">
            <button className="btn-primary" onClick={onClose}>Done</button>
          </div>
        </div>
      )}
    </Modal>
  );
};

export default ActivationModal;
