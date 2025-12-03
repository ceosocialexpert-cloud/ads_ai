import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Server-side client with service role key
export const getServerSupabase = () => {
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(supabaseUrl, supabaseServiceKey);
};

// Database types
export interface Project {
  id: string;
  session_id: string;
  url?: string;
  description?: string;
  screenshot_url?: string;
  analysis_result?: {
    summary: string;
    key_features: string[];
    brand_voice: string;
  };
  target_audiences?: TargetAudience[];
  created_at: string;
}

export interface TargetAudience {
  id: string;
  name: string;
  description: string;
  pain_points: string[];
  needs: string[];
  demographics?: string;
}

export interface ChatMessage {
  id: string;
  session_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  metadata?: any;
  created_at: string;
}

export interface GeneratedCreative {
  id: string;
  project_id?: string;
  session_id: string;
  target_audience?: string;
  format: string;
  size: string;
  image_url: string;
  prompt_used?: string;
  reference_images?: string[];
  created_at: string;
}
