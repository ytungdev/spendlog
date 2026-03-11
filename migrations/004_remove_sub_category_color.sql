-- Migration: Remove color column from sub_categories if it exists
DO $$ 
BEGIN 
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='sub_categories' AND column_name='color') THEN
        ALTER TABLE sub_categories DROP COLUMN color;
    END IF;
END $$;
