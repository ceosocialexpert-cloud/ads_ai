-- Add language field to projects table
ALTER TABLE projects ADD COLUMN IF NOT EXISTS language TEXT DEFAULT 'uk';

-- Add language field to subprojects table
ALTER TABLE subprojects ADD COLUMN IF NOT EXISTS language TEXT DEFAULT 'uk';

-- Add comment explaining language codes
COMMENT ON COLUMN projects.language IS 'Language code: uk (Ukrainian), ru (Russian), en (English)';
COMMENT ON COLUMN subprojects.language IS 'Language code: uk (Ukrainian), ru (Russian), en (English)';
