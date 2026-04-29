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
  sql?: string;
}

export interface SegmentationData {
  segments: Segment[];
  logic_reasoning: string;
}

export interface ContentDraft {
  channel: string;
  subject?: string;
  text_content: string; // Renamed from copy to match strict backend contract
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

export interface BlackboardState {
  recommendations_data: RecommendationData | null;
  brief_data: BriefData | null;
  analysis_data: AnalysisData | null;
  segments_data: SegmentationData | null;
  content_data: ContentData | null;
  review_data: ReviewData | null;
}
