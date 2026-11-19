export interface SearXNGResult {
  title: string;
  url: string;
  snippet: string;
  engines: string[];
}

export interface ResearchSource {
  title: string;
  url: string;
  snippet: string;
  engines: string[];
}

export interface ResearchResponse {
  answer: string;
  sources: ResearchSource[];
  confidence: number;
}
