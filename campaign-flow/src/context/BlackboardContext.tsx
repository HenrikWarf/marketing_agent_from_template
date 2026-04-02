import React, { createContext, useContext, useState, ReactNode } from 'react';

export interface CampaignIdea {
  title: string;
  reasoning: string;
  suggested_audience: string;
  potential_impact: string;
}

export interface RecommendationData {
  recommendations: CampaignIdea[];
}

export interface BriefData {
  campaign_name: string;
  business_opportunity: string;
  primary_goal: string;
  target_audience_description: string;
  recommended_channels: string[];
  success_kpi: string;
  recommended_products: string[];
}

export interface AnalysisData {
  summary: string;
  key_metrics: Record<string, any>;
  visualizations: any[];
  trends: string[];
  raw_query_used: string;
}

export interface Segment {
  name: string;
  description: string;
  count: number;
  sql?: string; // The BigQuery logic used to identify this segment
}

export interface SegmentationData {
  segments: Segment[];
  logic_reasoning: string;
}

export interface ContentDraft {
  channel: string;
  copy: string;
  subject?: string;
}

export interface ContentData {
  content_drafts: ContentDraft[];
  target_segment: string;
  call_to_action: string;
}

export interface ReviewData {
  status: 'VERIFIED' | 'REJECTED' | 'PENDING';
  feedback: string;
  guideline_check: boolean;
}

interface BlackboardState {
  recommendations_data: RecommendationData | null;
  brief_data: BriefData | null;
  analysis_data: AnalysisData | null;
  segments_data: SegmentationData | null;
  content_data: ContentData | null;
  review_data: ReviewData | null;
}

interface BlackboardContextType {
  state: BlackboardState;
  updateState: (newState: Partial<BlackboardState>) => void;
  resetState: () => void;
}

const BlackboardContext = createContext<BlackboardContextType | undefined>(undefined);

export const BlackboardProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, setState] = useState<BlackboardState>({
    recommendations_data: null,
    brief_data: null,
    analysis_data: null,
    segments_data: null,
    content_data: null,
    review_data: null,
  });

  const updateState = (newState: Partial<BlackboardState>) => {
    setState((prev) => ({ ...prev, ...newState }));
  };

  const resetState = () => {
    setState({
      recommendations_data: null,
      brief_data: null,
      analysis_data: null,
      segments_data: null,
      content_data: null,
      review_data: null,
    });
  };

  return (
    <BlackboardContext.Provider value={{ state, updateState, resetState }}>
      {children}
    </BlackboardContext.Provider>
  );
};

export const useBlackboard = () => {
  const context = useContext(BlackboardContext);
  if (context === undefined) {
    throw new Error('useBlackboard must be used within a BlackboardProvider');
  }
  return context;
};
