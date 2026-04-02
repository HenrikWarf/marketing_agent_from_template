import React from 'react';
import { BriefData } from '../context/BlackboardContext';
import { Target, Flag, Zap, Megaphone, ShoppingBag } from 'lucide-react';
import '../styles/BriefPanel.css';

const BriefPanel: React.FC<{ data: BriefData }> = ({ data }) => {
  return (
    <div className="brief-container">
      <div className="campaign-banner">
        <Megaphone size={20} />
        <span className="campaign-name-text">{data.campaign_name}</span>
      </div>

      <div className="brief-section opportunity">
        <div className="brief-section-header">
          <Zap size={16} />
          <h4>Business Opportunity</h4>
        </div>
        <p>{data.business_opportunity}</p>
      </div>

      <div className="brief-grid">
        <div className="brief-section">
          <div className="brief-section-header">
            <Flag size={16} />
            <h4>Primary Goal</h4>
          </div>
          <p className="goal-text">{data.primary_goal}</p>
          <div className="kpi-tag">KPI: {data.success_kpi}</div>
        </div>

        <div className="brief-section">
          <div className="brief-section-header">
            <Target size={16} />
            <h4>Target Audience</h4>
          </div>
          <p>{data.target_audience_description}</p>
        </div>
      </div>

      <div className="brief-section">
        <div className="brief-section-header">
          <ShoppingBag size={16} />
          <h4>Recommended Products</h4>
        </div>
        <div className="tag-cloud">
          {data.recommended_products?.map((p, i) => (
            <span key={i} className="product-tag">{p}</span>
          ))}
        </div>
      </div>

      <div className="brief-section">
        <div className="brief-section-header">
          <Megaphone size={16} />
          <h4>Channel Strategy</h4>
        </div>
        <div className="channel-list">
          {data.recommended_channels?.map((c, i) => (
            <div key={i} className="channel-pill">{c}</div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default BriefPanel;
