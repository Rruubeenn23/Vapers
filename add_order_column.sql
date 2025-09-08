-- Add order_id column to ventas table if it doesn't exist
ALTER TABLE ventas 
ADD COLUMN IF NOT EXISTS order_id INTEGER DEFAULT 1;

-- Update existing records to have order_id = 1 (for existing data)
UPDATE ventas 
SET order_id = 1 
WHERE order_id IS NULL;
