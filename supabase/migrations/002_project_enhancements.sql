-- Create a separate table for target audiences to enable better querying and management
CREATE TABLE IF NOT EXISTS target_audiences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    pain_points JSONB, -- array of strings
    needs JSONB, -- array of strings
    demographics JSONB, -- key-value pairs for demographic info
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_target_audiences_project_id ON target_audiences(project_id);
CREATE INDEX IF NOT EXISTS idx_target_audiences_name ON target_audiences(name);

-- Add a name column to projects table for easier identification
ALTER TABLE projects ADD COLUMN IF NOT EXISTS name TEXT;

-- Add a project_name column to generated_creatives for better tracking
ALTER TABLE generated_creatives ADD COLUMN IF NOT EXISTS project_name TEXT;

-- Create a function to automatically update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for target_audiences table
DROP TRIGGER IF EXISTS update_target_audiences_updated_at ON target_audiences;
CREATE TRIGGER update_target_audiences_updated_at 
    BEFORE UPDATE ON target_audiences 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Update RLS policies to include target_audiences table
ALTER TABLE target_audiences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all operations on target_audiences" ON target_audiences FOR ALL USING (true);