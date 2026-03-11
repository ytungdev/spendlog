-- PostgreSQL Database Initialization Script for Family Spend Tracker

-- Create categories table
CREATE TABLE IF NOT EXISTS categories (
    name TEXT PRIMARY KEY,
    color TEXT DEFAULT '#71717A'
);

-- Insert default categories
INSERT INTO categories (name, color) VALUES 
    ('Food', '#EF4444'), 
    ('Rent', '#3B82F6'), 
    ('Utilities', '#F59E0B'), 
    ('Transport', '#10B981'), 
    ('Entertainment', '#8B5CF6'), 
    ('Shopping', '#EC4899'), 
    ('Health', '#06B6D4'), 
    ('Other', '#71717A')
ON CONFLICT (name) DO UPDATE SET color = EXCLUDED.color;

-- Create sub_categories table
CREATE TABLE IF NOT EXISTS sub_categories (
    name TEXT PRIMARY KEY,
    category_name TEXT NOT NULL REFERENCES categories(name) ON DELETE CASCADE
);

-- Insert default sub-categories
INSERT INTO sub_categories (name, category_name) VALUES 
    ('Groceries', 'Food'),
    ('Dining Out', 'Food'),
    ('Coffee', 'Food'),
    ('Monthly Rent', 'Rent'),
    ('Electricity', 'Utilities'),
    ('Water', 'Utilities'),
    ('Internet', 'Utilities'),
    ('Gas', 'Transport'),
    ('Public Transport', 'Transport'),
    ('Movies', 'Entertainment'),
    ('Games', 'Entertainment'),
    ('Clothing', 'Shopping'),
    ('Electronics', 'Shopping'),
    ('Pharmacy', 'Health'),
    ('Doctor', 'Health'),
    ('Miscellaneous', 'Other')
ON CONFLICT (name) DO NOTHING;

-- Create transactions table
CREATE TABLE IF NOT EXISTS transactions (
    id SERIAL PRIMARY KEY,
    date TEXT NOT NULL,
    sub_category TEXT NOT NULL REFERENCES sub_categories(name),
    vendor TEXT,
    description TEXT,
    amount REAL NOT NULL,
    multiplier REAL DEFAULT 1,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Optional: Create an index on date for faster lookups
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date);
