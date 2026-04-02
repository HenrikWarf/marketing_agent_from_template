import React from 'react';
import { RecommendationData } from '../types/blackboard';
import { Sparkles, TrendingUp, Target, Lightbulb } from 'lucide-react';
import '../styles/RecommendationPanel.css';

const RecommendationPanel: React.FC<{ data: RecommendationData }> = ({ data }) => {
  return (
    <div className="recommendation-container">
      <div className="recommendation-header">
        <Sparkles size={20} color="var(--google-blue)" />
        <span className="header-text">AI Strategy Recommendations</span>
      </div>

      <div className="ideas-grid">
        {data.recommendations?.map((idea, i) => (
          <div key={i} className="idea-card">
            <div className="idea-card-header">
              <Lightbulb size={18} className="idea-icon" />
              <h4 className="idea-title">{idea.title}</h4>
            </div>
            
            <div className="idea-section">
              <div className="idea-section-label">
                <TrendingUp size={14} />
                <span>Strategic Reasoning</span>
              </div>
              <p className="idea-text">{idea.reasoning}</p>
            </div>

            <div className="idea-section">
              <div className="idea-section-label">
                <Target size={14} />
                <span>Suggested Audience</span>
              </div>
              <p className="idea-text">{idea.suggested_audience}</p>
            </div>

            <div className="impact-badge">
              <strong>Potential Impact:</strong> {idea.potential_impact}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default RecommendationPanel;
