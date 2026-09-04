export type RawProduct = Record<string, string>;

export type TenantConfig = {
  shop_name: string;
  tagline: string;
  location: { city: string; state: string };
  specialties: string[];
  target_customers: string[];
  tone: string;
  seo_location_keywords: string[];
};

export type Usage = { input_tokens: number; output_tokens: number; estimated_cost_usd: number };

export type ProductResult = {
  source_id: string;
  raw_input: RawProduct;
  status: 'ready' | 'failed' | 'approved' | 'rejected';
  attempts: number;
  output?: Record<string, unknown>;
  validation_errors?: string[];
  last_response?: string;
  usage: Usage;
  human_note?: string;
};

export type Run = {
  id: string;
  status: 'running' | 'review' | 'complete';
  created_at: string;
  dry_run: boolean;
  products: ProductResult[];
  total_usage: Usage;
};