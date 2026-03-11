-- Migration: Add color column to sub_categories if it doesn't exist
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='sub_categories' AND column_name='color') THEN
        ALTER TABLE sub_categories ADD COLUMN color TEXT;
    END IF;
END $$;
