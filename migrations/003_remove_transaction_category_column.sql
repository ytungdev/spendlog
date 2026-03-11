-- Migration: Remove category column from transactions if it exists
DO $$ 
BEGIN 
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='transactions' AND column_name='category') THEN
        ALTER TABLE transactions DROP COLUMN category;
    END IF;
END $$;
