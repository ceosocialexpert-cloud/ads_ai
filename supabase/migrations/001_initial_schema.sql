-- Create projects table
CREATE TABLE IF NOT EXISTS projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id TEXT NOT NULL,
    url TEXT,
    description TEXT,
    screenshot_url TEXT,
    analysis_result JSONB,
    target_audiences JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create chat_messages table
CREATE TABLE IF NOT EXISTS chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    content TEXT NOT NULL,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create generated_creatives table
CREATE TABLE IF NOT EXISTS generated_creatives (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    session_id TEXT NOT NULL,
    target_audience TEXT,
    format TEXT NOT NULL,
    size TEXT NOT NULL,
    image_url TEXT NOT NULL,
    prompt_used TEXT,
    reference_images JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_projects_session_id ON projects(session_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_session_id ON chat_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON chat_messages(created_at);
CREATE INDEX IF NOT EXISTS idx_generated_creatives_session_id ON generated_creatives(session_id);
CREATE INDEX IF NOT EXISTS idx_generated_creatives_created_at ON generated_creatives(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_generated_creatives_format ON generated_creatives(format);
CREATE INDEX IF NOT EXISTS idx_generated_creatives_size ON generated_creatives(size);

-- Enable Row Level Security (RLS)
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE generated_creatives ENABLE ROW LEVEL SECURITY;

-- Create policies (allow all for now since we're using session-based auth)
CREATE POLICY "Allow all operations on projects" ON projects FOR ALL USING (true);
CREATE POLICY "Allow all operations on chat_messages" ON chat_messages FOR ALL USING (true);
CREATE POLICY "Allow all operations on generated_creatives" ON generated_creatives FOR ALL USING (true);

-- Create storage bucket for images
INSERT INTO storage.buckets (id, name, public)
VALUES ('creatives', 'creatives', true)
ON CONFLICT (id) DO NOTHING;

-- Create storage policy
CREATE POLICY "Allow public read access" ON storage.objects FOR SELECT USING (bucket_id = 'creatives');
CREATE POLICY "Allow authenticated uploads" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'creatives');
