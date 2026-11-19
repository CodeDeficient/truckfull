export interface ParsedPost {
  id: string;
  platform: string;
  post_url: string;
  content: string;
  timestamp: string;
  author?: string;
  images?: string[];
  extracted_data?: {
    truck_name?: string;
    location?: {
      address?: string;
      latitude?: number;
      longitude?: number;
    };
    food_items?: string[];
    cuisine_type?: string[];
    time?: {
      start?: string;
      end?: string;
      date?: string;
    };
    contact_info?: {
      phone?: string;
      email?: string;
      website?: string;
    };
  };
  raw_data?: unknown;
}

export interface SpamResult {
  isSpam: boolean;
  confidence: number;
  reasons: string[];
}

export interface Conflict {
  id: string;
  type: 'duplicate' | 'location_conflict' | 'schedule_conflict';
  description: string;
  conflicting_post?: ParsedPost;
  severity: 'low' | 'medium' | 'high';
}

export interface ConflictResult {
  hasConflict: boolean;
  conflicts: Conflict[];
}

export interface FalsePositiveResult {
  isFalsePositive: boolean;
  confidence: number;
  reasons: string[];
}

export interface QualityError {
  field: string;
  message: string;
  severity: 'error' | 'warning';
}

export interface DataQualityResult {
  isValid: boolean;
  errors: QualityError[];
}

export interface QualitySignals {
  spam: SpamResult;
  conflict: ConflictResult;
  falsePositive: FalsePositiveResult;
  dataQuality: DataQualityResult;
}

export interface ConfidenceResult {
  score: number;
  action: 'accept' | 'review' | 'reject';
  breakdown: {
    spamWeight: number;
    conflictWeight: number;
    falsePositiveWeight: number;
    dataQualityWeight: number;
  };
}
