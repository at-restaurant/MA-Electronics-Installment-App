-- Customers Table
CREATE TABLE customers (
                           id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                           name VARCHAR(255) NOT NULL,
                           email VARCHAR(255),
                           phone VARCHAR(20),
                           address TEXT,
                           created_at TIMESTAMP DEFAULT NOW(),
                           updated_at TIMESTAMP DEFAULT NOW()
);

-- Installments Table
CREATE TABLE installments (
                              id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                              customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
                              product_name VARCHAR(255) NOT NULL,
                              total_amount DECIMAL(10, 2) NOT NULL,
                              installment_count INT NOT NULL,
                              payment_type VARCHAR(50) NOT NULL, -- 'weekly', 'bi-weekly', 'monthly'
                              installment_amount DECIMAL(10, 2) NOT NULL,
                              start_date DATE NOT NULL,
                              due_date DATE NOT NULL,
                              paid_amount DECIMAL(10, 2) DEFAULT 0,
                              status VARCHAR(50) DEFAULT 'active', -- 'active', 'completed', 'overdue', 'pending'
                              created_at TIMESTAMP DEFAULT NOW(),
                              updated_at TIMESTAMP DEFAULT NOW()
);

-- Payments Table
CREATE TABLE payments (
                          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                          installment_id UUID NOT NULL REFERENCES installments(id) ON DELETE CASCADE,
                          customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
                          amount DECIMAL(10, 2) NOT NULL,
                          payment_date DATE NOT NULL,
                          payment_method VARCHAR(50) NOT NULL, -- 'cash', 'card', 'transfer'
                          status VARCHAR(50) DEFAULT 'completed', -- 'completed', 'pending'
                          created_at TIMESTAMP DEFAULT NOW()
);

-- Enable RLS (Row Level Security)
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE installments ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- Create RLS Policies (Allow all for now, restrict later if needed)
CREATE POLICY "Enable read access for all users" ON customers FOR SELECT USING (true);
CREATE POLICY "Enable insert for all users" ON customers FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update for all users" ON customers FOR UPDATE USING (true);
CREATE POLICY "Enable delete for all users" ON customers FOR DELETE USING (true);

CREATE POLICY "Enable read access for all users" ON installments FOR SELECT USING (true);
CREATE POLICY "Enable insert for all users" ON installments FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update for all users" ON installments FOR UPDATE USING (true);
CREATE POLICY "Enable delete for all users" ON installments FOR DELETE USING (true);

CREATE POLICY "Enable read access for all users" ON payments FOR SELECT USING (true);
CREATE POLICY "Enable insert for all users" ON payments FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update for all users" ON payments FOR UPDATE USING (true);
CREATE POLICY "Enable delete for all users" ON payments FOR DELETE USING (true);