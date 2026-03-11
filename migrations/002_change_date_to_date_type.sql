-- Migration: Change date column to DATE type if it's still text
DO $$ 
BEGIN 
    IF (SELECT data_type FROM information_schema.columns WHERE table_name='transactions' AND column_name='date') = 'text' THEN
        ALTER TABLE transactions ALTER COLUMN date TYPE DATE USING date::DATE;
    END IF;
END $$;
