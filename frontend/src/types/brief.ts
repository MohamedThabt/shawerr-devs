export interface WorldBrief {
  key_developments: string[];
  regional_highlights: Record<string, string>;
  emerging_trends: string;
}

export interface TechBrief {
  major_developments: string[];
  technology_signals: string[];
  risk_outlook: string;
}

export interface BriefResponse {
  world_brief: WorldBrief | null;
  tech_brief: TechBrief | null;
  generated_at: string | null;
}
