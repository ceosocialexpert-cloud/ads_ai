-- Create subprojects table for landing pages, webinars, campaigns
CREATE TABLE IF NOT EXISTS subprojects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    url TEXT NOT NULL,
    description TEXT,
    type TEXT DEFAULT 'webinar', -- webinar, landing, campaign
    analysis_result JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create target_audiences for subprojects
CREATE TABLE IF NOT EXISTS subproject_target_audiences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subproject_id UUID REFERENCES subprojects(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    pain_points JSONB,
    needs JSONB,
    demographics JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_subprojects_project_id ON subprojects(project_id);
CREATE INDEX IF NOT EXISTS idx_subprojects_type ON subprojects(type);
CREATE INDEX IF NOT EXISTS idx_subproject_audiences_subproject_id ON subproject_target_audiences(subproject_id);

-- Add trigger for updated_at
DROP TRIGGER IF EXISTS update_subprojects_updated_at ON subprojects;
CREATE TRIGGER update_subprojects_updated_at 
    BEFORE UPDATE ON subprojects 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_subproject_audiences_updated_at ON subproject_target_audiences;
CREATE TRIGGER update_subproject_audiences_updated_at 
    BEFORE UPDATE ON subproject_target_audiences 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE subprojects ENABLE ROW LEVEL SECURITY;
ALTER TABLE subproject_target_audiences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all operations on subprojects" ON subprojects FOR ALL USING (true);
CREATE POLICY "Allow all operations on subproject_audiences" ON subproject_target_audiences FOR ALL USING (true);
