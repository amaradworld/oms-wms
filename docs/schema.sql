-- Users and Authentication
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    full_name VARCHAR(255),
    role VARCHAR(50) CHECK (role IN ('SUPER_ADMIN', 'WAREHOUSE_MGR', 'PICKER', 'PACKER')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Multi-Tenant Warehouse Management
CREATE TABLE warehouses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    name VARCHAR(255) NOT NULL,
    location TEXT,
    address TEXT,
    timezone VARCHAR(50),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- SKU Master (Product Catalog)
CREATE TABLE sku_master (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    sku_code VARCHAR(100) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100),
    hsn_code VARCHAR(20),
    weight DECIMAL(10,2),
    dimensions VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Inventory Management (Multi-Warehouse)
CREATE TABLE inventory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    warehouse_id UUID REFERENCES warehouses(id),
    sku_id UUID REFERENCES sku_master(id),
    bin_location VARCHAR(100),
    quantity_on_hand INTEGER DEFAULT 0,
    quantity_reserved INTEGER DEFAULT 0,
    quantity_available INTEGER DEFAULT 0,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(warehouse_id, sku_id, bin_location)
);

-- Order Management
CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    order_number VARCHAR(100) UNIQUE NOT NULL,
    source VARCHAR(50), -- Shopify, Amazon, etc.
    source_order_id VARCHAR(100),
    customer_name VARCHAR(255),
    customer_email VARCHAR(255),
    customer_phone VARCHAR(20),
    shipping_address TEXT,
    order_status VARCHAR(50) DEFAULT 'PENDING', -- PENDING, PROCESSING, SHIPPED, DELIVERED, CANCELLED, RETURNED
    payment_status VARCHAR(50),
    order_date TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
    sku_id UUID REFERENCES sku_master(id),
    quantity INTEGER NOT NULL,
    unit_price DECIMAL(10,2),
    tax_amount DECIMAL(10,2),
    total_amount DECIMAL(10,2),
    status VARCHAR(50) DEFAULT 'PENDING'
);

-- Warehouse Operations (Pick-Pack-Ship)
CREATE TABLE picklists (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    warehouse_id UUID REFERENCES warehouses(id),
    status VARCHAR(50) DEFAULT 'PENDING', -- PENDING, PICKING, COMPLETED
    picker_id UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE picklist_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    picklist_id UUID REFERENCES picklists(id) ON DELETE CASCADE,
    order_item_id UUID REFERENCES order_items(id),
    sku_id UUID REFERENCES sku_master(id),
    bin_location VARCHAR(100),
    required_qty INTEGER,
    picked_qty INTEGER DEFAULT 0,
    is_picked BOOLEAN DEFAULT false
);

-- Courier and Tracking
CREATE TABLE courier_tracking (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES orders(id),
    courier_name VARCHAR(100),
    awb_number VARCHAR(100) UNIQUE,
    tracking_url TEXT,
    shipment_status VARCHAR(50),
    shipped_at TIMESTAMP WITH TIME ZONE,
    delivered_at TIMESTAMP WITH TIME ZONE
);

-- Returns and RTO
CREATE TABLE returns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES orders(id),
    sku_id UUID REFERENCES sku_master(id),
    quantity INTEGER,
    reason TEXT,
    status VARCHAR(50), -- REQUESTED, RECEIVED, QC_FAILED, QC_PASSED
    received_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE rto (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES orders(id),
    tracking_id UUID REFERENCES courier_tracking(id),
    rto_reason TEXT,
    received_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(50) DEFAULT 'PENDING_QC'
);

-- WMS Specialized Logs
CREATE TABLE barcode_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    warehouse_id UUID REFERENCES warehouses(id),
    sku_id UUID REFERENCES sku_master(id),
    scan_type VARCHAR(50), -- GRN, PICK, PACK, QC
    scan_value TEXT,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE stock_transfer (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    from_warehouse_id UUID REFERENCES warehouses(id),
    to_warehouse_id UUID REFERENCES warehouses(id),
    sku_id UUID REFERENCES sku_master(id),
    quantity INTEGER,
    status VARCHAR(50), -- IN_TRANSIT, RECEIVED
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE grn (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    warehouse_id UUID REFERENCES warehouses(id),
    vendor_name VARCHAR(255),
    invoice_number VARCHAR(100),
    received_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    user_id UUID REFERENCES users(id),
    action TEXT NOT NULL,
    entity_type VARCHAR(50),
    entity_id UUID,
    old_value JSONB,
    new_value JSONB,
    ip_address VARCHAR(45),
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for Performance
CREATE INDEX idx_orders_tenant ON orders(tenant_id);
CREATE INDEX idx_inventory_sku_wh ON inventory(sku_id, warehouse_id);
CREATE INDEX idx_sku_code ON sku_master(sku_code);
CREATE INDEX idx_order_number ON orders(order_number);
CREATE INDEX idx_tracking_awb ON courier_tracking(awb_number);
