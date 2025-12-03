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
  name?: string; // New field for project name
  url?: string;
  description?: string;
  screenshot_url?: string;
  language?: string; // Language code: 'uk', 'ru', 'en'
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
  project_id?: string; // New field to link to project
  name: string;
  description: string;
  pain_points: string[];
  needs: string[];
  demographics?: Record<string, string>; // Changed to key-value pairs
  created_at?: string; // New field
  updated_at?: string; // New field
}

export interface Subproject {
  id: string;
  project_id: string;
  name: string;
  url: string;
  description?: string;
  type: 'webinar' | 'landing' | 'campaign';
  language?: string; // Language code: 'uk', 'ru', 'en'
  analysis_result?: {
    summary: string;
    key_features: string[];
    brand_voice: string;
  };
  target_audiences?: SubprojectTargetAudience[];
  created_at: string;
  updated_at: string;
}

export interface SubprojectTargetAudience {
  id: string;
  subproject_id: string;
  name: string;
  description: string;
  pain_points: string[];
  needs: string[];
  demographics?: Record<string, string>;
  created_at: string;
  updated_at: string;
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
