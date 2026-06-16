-- CreateEnum
CREATE TYPE "ReportType" AS ENUM ('GRN', 'ORDER', 'STOCK_TRANSFER', 'INVENTORY_SNAPSHOT', 'DISPATCH_MANIFEST');

-- CreateTable
CREATE TABLE "tenants" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "address" TEXT,
    "city" TEXT,
    "state" TEXT,
    "pincode" TEXT,
    "gstin" TEXT,
    "logoUrl" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "menuAccess" JSONB,
    "notificationPrefs" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tenants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "fullName" TEXT,
    "role" TEXT NOT NULL,
    "warehouseId" TEXT,
    "mfaSecret" TEXT,
    "mfaEnabled" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "warehouses" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "location" TEXT,
    "address" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "parentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "code" TEXT,
    "type" TEXT DEFAULT 'Warehouse',
    "displayName" TEXT,
    "partyName" TEXT,
    "websiteUrl" TEXT,
    "alternateCode" TEXT,
    "logoUrl" TEXT,
    "signatureUrl" TEXT,
    "posEnabled" BOOLEAN DEFAULT false,
    "processingCapacity" INTEGER,
    "allowMaxLimit" BOOLEAN DEFAULT false,
    "operationalType" TEXT,
    "associatedPosChannel" TEXT,
    "itemSealEnabled" BOOLEAN DEFAULT false,
    "priority" INTEGER DEFAULT 1,
    "contactPerson" TEXT,
    "contactEmail" TEXT,
    "contactPhone" TEXT,
    "openingTime" TEXT,
    "closingTime" TEXT,
    "b2cTaxAddressType" TEXT DEFAULT 'BillingAddress',
    "channelImageProcessing" BOOLEAN DEFAULT false,
    "autoPackageDimensions" BOOLEAN DEFAULT false,
    "pan" TEXT,
    "tin" TEXT,
    "cst" TEXT,
    "serviceTax" TEXT,
    "gstin" TEXT,
    "upiAddress" TEXT,
    "bankName" TEXT,
    "accountNumber" TEXT,
    "ifscCode" TEXT,
    "billingAddress1" TEXT,
    "billingAddress2" TEXT,
    "billingCity" TEXT,
    "billingPinCode" TEXT,
    "billingCountry" TEXT DEFAULT 'India',
    "billingState" TEXT,
    "billingPhone" TEXT,
    "billingLatitude" TEXT,
    "billingLongitude" TEXT,
    "shippingSameAsBilling" BOOLEAN DEFAULT true,
    "shippingAddress1" TEXT,
    "shippingAddress2" TEXT,
    "shippingCity" TEXT,
    "shippingPinCode" TEXT,
    "shippingCountry" TEXT DEFAULT 'India',
    "shippingState" TEXT,
    "shippingPhone" TEXT,
    "shippingLatitude" TEXT,
    "shippingLongitude" TEXT,

    CONSTRAINT "warehouses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "facility_sequences" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "warehouseId" TEXT NOT NULL,
    "sequenceName" TEXT NOT NULL,
    "description" TEXT,
    "prefix" TEXT DEFAULT '',
    "currentValue" INTEGER NOT NULL DEFAULT 1,
    "nextYearPrefix" TEXT DEFAULT '',
    "resetCounterNextYear" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "facility_sequences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "facility_activity_logs" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "warehouseId" TEXT NOT NULL,
    "userId" TEXT,
    "userEmail" TEXT,
    "action" TEXT NOT NULL,
    "field" TEXT,
    "oldValue" TEXT,
    "newValue" TEXT,
    "description" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "facility_activity_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sku_master" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "skuCode" TEXT NOT NULL,
    "epcCode" TEXT,
    "name" TEXT NOT NULL,
    "styleName" TEXT,
    "size" TEXT,
    "color" TEXT,
    "brand" TEXT,
    "category" TEXT,
    "material" TEXT,
    "gender" TEXT,
    "unitType" TEXT,
    "mrp" DECIMAL(65,30),
    "description" TEXT,
    "hsnCode" TEXT,
    "weight" DECIMAL(65,30),
    "dimensions" TEXT,
    "marketplaceSkus" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sku_master_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory" (
    "id" TEXT NOT NULL,
    "warehouseId" TEXT NOT NULL,
    "skuId" TEXT NOT NULL,
    "binLocation" TEXT NOT NULL,
    "reorderPoint" INTEGER NOT NULL DEFAULT 0,
    "quantityOnHand" INTEGER NOT NULL DEFAULT 0,
    "quantityReserved" INTEGER NOT NULL DEFAULT 0,
    "quantityAvailable" INTEGER NOT NULL DEFAULT 0,
    "virtualInventory" INTEGER NOT NULL DEFAULT 0,
    "notFound" INTEGER NOT NULL DEFAULT 0,
    "type" TEXT NOT NULL DEFAULT 'Good',
    "batch" TEXT,
    "batchStatus" TEXT,
    "expiryDate" TIMESTAMP(3),
    "expiryAlertSent" BOOLEAN NOT NULL DEFAULT false,
    "abcClass" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "inventoryAllocation" BOOLEAN NOT NULL DEFAULT true,
    "inventorySync" BOOLEAN NOT NULL DEFAULT true,
    "skuMixing" BOOLEAN NOT NULL DEFAULT true,
    "shelfOnHold" BOOLEAN NOT NULL DEFAULT false,
    "lastUpdated" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "inventory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "orders" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "warehouseId" TEXT,
    "orderNumber" TEXT NOT NULL,
    "displayOrderCode" TEXT,
    "source" TEXT,
    "customerCode" TEXT,
    "customerName" TEXT NOT NULL,
    "customerGstin" TEXT,
    "notificationEmail" TEXT,
    "notificationMobile" TEXT,
    "currency" TEXT DEFAULT 'INR',
    "shippingAddress" TEXT NOT NULL,
    "orderStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "paymentStatus" TEXT,
    "paymentMode" TEXT,
    "slaDeadline" TIMESTAMP(3),
    "slaStatus" TEXT DEFAULT 'ON_TRACK',
    "slaBreachedAt" TIMESTAMP(3),
    "channelProcessingTime" TIMESTAMP(3),
    "deliverMode" TEXT,
    "pdfAttachment" TEXT,
    "priority" TEXT,
    "orderAmount" DECIMAL(65,30),
    "discountAmount" DECIMAL(65,30) DEFAULT 0,
    "giftWrapCharges" DECIMAL(65,30) DEFAULT 0,
    "shippingCharges" DECIMAL(65,30) DEFAULT 0,
    "ewayBillNumber" TEXT,
    "irn" TEXT,
    "firstResponseAt" TIMESTAMP(3),
    "pickedAt" TIMESTAMP(3),
    "packedAt" TIMESTAMP(3),
    "manifestedAt" TIMESTAMP(3),
    "dispatchedAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "billingName" TEXT,
    "billingAddress1" TEXT,
    "billingAddress2" TEXT,
    "billingCountry" TEXT DEFAULT 'India',
    "billingState" TEXT,
    "billingCity" TEXT,
    "billingDistrict" TEXT,
    "billingPinCode" TEXT,
    "billingPhone" TEXT,
    "billingLatitude" TEXT,
    "billingLongitude" TEXT,
    "billingEmail" TEXT,

    CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_items" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "skuId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitPrice" DECIMAL(65,30) NOT NULL,
    "mrp" DECIMAL(65,30) DEFAULT 0,
    "discountAmount" DECIMAL(65,30) DEFAULT 0,
    "totalAmount" DECIMAL(65,30) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "scannedQty" INTEGER NOT NULL DEFAULT 0,
    "batchNo" TEXT,
    "expiryDate" TIMESTAMP(3),

    CONSTRAINT "order_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "courier_tracking" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "courierName" TEXT NOT NULL,
    "awbNumber" TEXT NOT NULL,
    "shipmentStatus" TEXT NOT NULL,
    "courierStatus" TEXT,
    "shippedAt" TIMESTAMP(3),
    "estimatedDelivery" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "picklistNumber" TEXT,
    "shipmentManifest" TEXT,
    "returnManifest" TEXT,
    "invoiceNumber" TEXT,
    "rtoFacility" TEXT,
    "shippingMethod" TEXT,
    "noOfBoxes" INTEGER NOT NULL DEFAULT 1,
    "shippingPackageType" TEXT,
    "shippingPackageCode" TEXT,
    "packageDimensions" TEXT,
    "packageWeight" DECIMAL(65,30),
    "zone" TEXT,
    "ewaybillValidTill" TIMESTAMP(3),
    "ewaybillDate" TIMESTAMP(3),
    "trackingUrl" TEXT,

    CONSTRAINT "courier_tracking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "returns" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "skuId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "reason" TEXT,
    "status" TEXT NOT NULL,
    "receivedAt" TIMESTAMP(3),

    CONSTRAINT "returns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rto" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "rtoReason" TEXT,
    "receivedDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL DEFAULT 'PENDING_QC',

    CONSTRAINT "rto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ndr_cases" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "courierName" TEXT NOT NULL,
    "awbNumber" TEXT,
    "failureReason" TEXT,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "reattemptDate" TIMESTAMP(3),
    "firstResponseAt" TIMESTAMP(3),
    "resolvedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ndr_cases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "oldValue" JSONB,
    "newValue" JSONB,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "picklists" (
    "id" TEXT NOT NULL,
    "warehouseId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "pickerId" TEXT,
    "assignedAt" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "picklists_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "marketplace_configs" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "marketplace" TEXT NOT NULL,
    "apiKey" TEXT,
    "apiSecret" TEXT,
    "sellerId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "safetyStockBuffer" INTEGER NOT NULL DEFAULT 0,
    "lastSyncAt" TIMESTAMP(3),
    "syncStatus" TEXT NOT NULL DEFAULT 'idle',
    "syncMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "marketplace_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "courier_configs" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "courierName" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "priority" INTEGER NOT NULL DEFAULT 10,
    "pincodePrefixes" TEXT,
    "minWeight" DECIMAL(65,30),
    "maxWeight" DECIMAL(65,30),
    "minOrderValue" DECIMAL(65,30),
    "maxOrderValue" DECIMAL(65,30),
    "speedTier" TEXT NOT NULL DEFAULT 'standard',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "courier_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cycle_counts" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "warehouseId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "blindMode" BOOLEAN NOT NULL DEFAULT false,
    "abcFilter" TEXT,
    "startedBy" TEXT,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cycle_counts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cycle_count_items" (
    "id" TEXT NOT NULL,
    "cycleCountId" TEXT NOT NULL,
    "skuId" TEXT NOT NULL,
    "binLocation" TEXT,
    "expectedQty" INTEGER NOT NULL DEFAULT 0,
    "countedQty" INTEGER,
    "variance" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'PENDING',

    CONSTRAINT "cycle_count_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "suppliers" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "code" TEXT,
    "name" TEXT NOT NULL,
    "contactPerson" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "address" TEXT,
    "gstin" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "suppliers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "purchase_orders" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "poNumber" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "warehouseId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "orderDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expectedDate" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "purchase_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bin_locations" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "warehouseId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "zone" TEXT,
    "aisle" TEXT,
    "rack" TEXT,
    "shelf" TEXT,
    "maxCapacity" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bin_locations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "grns" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "poId" TEXT NOT NULL,
    "asnId" TEXT,
    "warehouseId" TEXT NOT NULL,
    "grnNumber" TEXT NOT NULL,
    "vendorInvoiceNo" TEXT,
    "status" TEXT NOT NULL DEFAULT 'RECEIVING',
    "totalQty" INTEGER NOT NULL DEFAULT 0,
    "acceptedQty" INTEGER NOT NULL DEFAULT 0,
    "rejectedQty" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "createdById" TEXT,
    "receivedAt" TIMESTAMP(3),
    "qcStartedAt" TIMESTAMP(3),
    "qcCompletedAt" TIMESTAMP(3),
    "approvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "grns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "grn_items" (
    "id" TEXT NOT NULL,
    "grnId" TEXT NOT NULL,
    "poItemId" TEXT NOT NULL,
    "skuId" TEXT NOT NULL,
    "expectedQty" INTEGER NOT NULL DEFAULT 0,
    "receivedQty" INTEGER NOT NULL DEFAULT 0,
    "acceptedQty" INTEGER NOT NULL DEFAULT 0,
    "rejectedQty" INTEGER NOT NULL DEFAULT 0,
    "qcStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "qcNotes" TEXT,
    "batchNo" TEXT,
    "expiryDate" TIMESTAMP(3),
    "manufacturingDate" TIMESTAMP(3),
    "receivedAt" TIMESTAMP(3),
    "qcAt" TIMESTAMP(3),
    "mrp" DECIMAL(65,30) DEFAULT 0,

    CONSTRAINT "grn_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "putaway_tasks" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "warehouseId" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "sourceId" TEXT,
    "grnId" TEXT,
    "skuId" TEXT NOT NULL,
    "expectedQty" INTEGER NOT NULL DEFAULT 0,
    "completedQty" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "binId" TEXT,
    "createdById" TEXT,
    "assignedTo" TEXT,
    "assignedAt" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "putaway_tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "purchase_order_items" (
    "id" TEXT NOT NULL,
    "poId" TEXT NOT NULL,
    "skuId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitPrice" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "receivedQty" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'PENDING',

    CONSTRAINT "purchase_order_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_transfers" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "fromWarehouseId" TEXT NOT NULL,
    "toWarehouseId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "notes" TEXT,
    "createdBy" TEXT,
    "receivedBy" TEXT,
    "receivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stock_transfers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_transfer_items" (
    "id" TEXT NOT NULL,
    "transferId" TEXT NOT NULL,
    "skuId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "receivedQty" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'PENDING',

    CONSTRAINT "stock_transfer_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pick_waves" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "warehouseId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "assignedTo" TEXT,
    "assignedAt" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "pick_waves_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pick_wave_orders" (
    "id" TEXT NOT NULL,
    "waveId" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',

    CONSTRAINT "pick_wave_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "manifests" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "manifestNumber" TEXT NOT NULL,
    "courierName" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "totalShipments" INTEGER NOT NULL DEFAULT 0,
    "closedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "manifests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "manifest_shipments" (
    "id" TEXT NOT NULL,
    "manifestId" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "awbNumber" TEXT NOT NULL,
    "courierName" TEXT NOT NULL,

    CONSTRAINT "manifest_shipments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "marketplace_order_mappings" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "marketplace" TEXT NOT NULL,
    "marketplaceOrderId" TEXT NOT NULL,
    "localOrderId" TEXT NOT NULL,
    "orderData" JSONB,
    "syncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "marketplace_order_mappings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gatepasses" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "quantity" INTEGER NOT NULL DEFAULT 0,
    "toParty" TEXT,
    "expectedDate" TIMESTAMP(3),
    "notes" TEXT,
    "stockTransferId" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "gatepasses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gatepass_items" (
    "id" TEXT NOT NULL,
    "gatepassId" TEXT NOT NULL,
    "skuId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "scannedQty" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "inventoryType" TEXT NOT NULL DEFAULT 'GOOD_INVENTORY',
    "shelfCode" TEXT,
    "unitPrice" DECIMAL(65,30),
    "batchCode" TEXT,
    "forceAllocate" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "gatepass_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platform_integrations" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "apiBaseUrl" TEXT,
    "apiKey" TEXT,
    "apiSecret" TEXT,
    "accessToken" TEXT,
    "webhookUrl" TEXT,
    "syncInventory" BOOLEAN DEFAULT false,
    "syncOrders" BOOLEAN DEFAULT false,
    "syncProducts" BOOLEAN DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastSyncAt" TIMESTAMP(3),
    "config" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "platform_integrations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "replenishment_tasks" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "warehouseId" TEXT,
    "skuId" TEXT NOT NULL,
    "fromBin" TEXT,
    "toBin" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "priority" TEXT NOT NULL DEFAULT 'MEDIUM',
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "assignedTo" TEXT,
    "assignedAt" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3),
    "notes" TEXT,
    "completedAt" TIMESTAMP(3),
    "completedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "replenishment_tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "asns" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "warehouseId" TEXT,
    "asnNumber" TEXT NOT NULL,
    "supplierId" TEXT,
    "supplierName" TEXT,
    "expectedDate" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "asns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "asn_items" (
    "id" TEXT NOT NULL,
    "asnId" TEXT NOT NULL,
    "skuId" TEXT NOT NULL,
    "expectedQty" INTEGER NOT NULL DEFAULT 0,
    "receivedQty" INTEGER NOT NULL DEFAULT 0,
    "batchNo" TEXT,
    "expiryDate" TIMESTAMP(3),

    CONSTRAINT "asn_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "productivity_logs" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "warehouseId" TEXT,
    "userId" TEXT,
    "activity" TEXT NOT NULL,
    "entityType" TEXT,
    "entityId" TEXT,
    "quantity" INTEGER NOT NULL DEFAULT 0,
    "durationMin" INTEGER,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "productivity_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "leads" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "company" TEXT,
    "phone" TEXT,
    "monthlyOrders" TEXT,
    "plan" TEXT,
    "message" TEXT,
    "source" TEXT,
    "referrer" TEXT,
    "status" TEXT NOT NULL DEFAULT 'NEW',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "leads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoices" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "warehouseId" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "invoiceNumber" TEXT NOT NULL,
    "invoiceDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "totalAmount" DECIMAL(65,30) NOT NULL,
    "taxAmount" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "cgstAmount" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "sgstAmount" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "igstAmount" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "irn" TEXT,
    "irnGeneratedAt" TIMESTAMP(3),
    "ewayBillNumber" TEXT,
    "isCreditNote" BOOLEAN NOT NULL DEFAULT false,
    "creditNoteReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cod_settlements" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "marketplace" TEXT,
    "awbNumber" TEXT,
    "codAmount" DECIMAL(65,30) NOT NULL,
    "settledAmount" DECIMAL(65,30),
    "settlementDate" TIMESTAMP(3),
    "reconciliationStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "discrepancyReason" TEXT,
    "sellerAdjustment" DECIMAL(65,30) DEFAULT 0,
    "tds" DECIMAL(65,30) DEFAULT 0,
    "shippingCharge" DECIMAL(65,30) DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cod_settlements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reports" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "reportType" "ReportType" NOT NULL,
    "period" TIMESTAMP(3) NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileData" BYTEA NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reports_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tenants_slug_key" ON "tenants"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_tenantId_idx" ON "users"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "facility_sequences_warehouseId_sequenceName_key" ON "facility_sequences"("warehouseId", "sequenceName");

-- CreateIndex
CREATE INDEX "facility_activity_logs_warehouseId_timestamp_idx" ON "facility_activity_logs"("warehouseId", "timestamp");

-- CreateIndex
CREATE UNIQUE INDEX "sku_master_skuCode_key" ON "sku_master"("skuCode");

-- CreateIndex
CREATE UNIQUE INDEX "sku_master_epcCode_key" ON "sku_master"("epcCode");

-- CreateIndex
CREATE INDEX "sku_master_tenantId_idx" ON "sku_master"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "inventory_warehouseId_skuId_binLocation_key" ON "inventory"("warehouseId", "skuId", "binLocation");

-- CreateIndex
CREATE UNIQUE INDEX "orders_orderNumber_key" ON "orders"("orderNumber");

-- CreateIndex
CREATE INDEX "orders_tenantId_orderStatus_slaDeadline_idx" ON "orders"("tenantId", "orderStatus", "slaDeadline");

-- CreateIndex
CREATE INDEX "orders_tenantId_source_deliveredAt_idx" ON "orders"("tenantId", "source", "deliveredAt");

-- CreateIndex
CREATE INDEX "orders_tenantId_slaStatus_idx" ON "orders"("tenantId", "slaStatus");

-- CreateIndex
CREATE INDEX "order_items_orderId_idx" ON "order_items"("orderId");

-- CreateIndex
CREATE INDEX "order_items_skuId_idx" ON "order_items"("skuId");

-- CreateIndex
CREATE UNIQUE INDEX "courier_tracking_orderId_key" ON "courier_tracking"("orderId");

-- CreateIndex
CREATE UNIQUE INDEX "courier_tracking_awbNumber_key" ON "courier_tracking"("awbNumber");

-- CreateIndex
CREATE INDEX "returns_orderId_idx" ON "returns"("orderId");

-- CreateIndex
CREATE UNIQUE INDEX "rto_orderId_key" ON "rto"("orderId");

-- CreateIndex
CREATE INDEX "ndr_cases_tenantId_status_idx" ON "ndr_cases"("tenantId", "status");

-- CreateIndex
CREATE INDEX "ndr_cases_tenantId_firstResponseAt_idx" ON "ndr_cases"("tenantId", "firstResponseAt");

-- CreateIndex
CREATE INDEX "audit_logs_tenantId_timestamp_idx" ON "audit_logs"("tenantId", "timestamp");

-- CreateIndex
CREATE INDEX "audit_logs_entityType_entityId_timestamp_idx" ON "audit_logs"("entityType", "entityId", "timestamp");

-- CreateIndex
CREATE INDEX "audit_logs_tenantId_action_timestamp_idx" ON "audit_logs"("tenantId", "action", "timestamp");

-- CreateIndex
CREATE INDEX "picklists_warehouseId_status_idx" ON "picklists"("warehouseId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "marketplace_configs_tenantId_marketplace_key" ON "marketplace_configs"("tenantId", "marketplace");

-- CreateIndex
CREATE UNIQUE INDEX "courier_configs_tenantId_courierName_key" ON "courier_configs"("tenantId", "courierName");

-- CreateIndex
CREATE INDEX "cycle_counts_tenantId_idx" ON "cycle_counts"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "cycle_count_items_cycleCountId_skuId_key" ON "cycle_count_items"("cycleCountId", "skuId");

-- CreateIndex
CREATE UNIQUE INDEX "suppliers_tenantId_code_key" ON "suppliers"("tenantId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "purchase_orders_poNumber_key" ON "purchase_orders"("poNumber");

-- CreateIndex
CREATE INDEX "purchase_orders_tenantId_idx" ON "purchase_orders"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "bin_locations_warehouseId_code_key" ON "bin_locations"("warehouseId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "grns_grnNumber_key" ON "grns"("grnNumber");

-- CreateIndex
CREATE INDEX "grns_tenantId_idx" ON "grns"("tenantId");

-- CreateIndex
CREATE INDEX "grn_items_grnId_idx" ON "grn_items"("grnId");

-- CreateIndex
CREATE INDEX "grn_items_skuId_idx" ON "grn_items"("skuId");

-- CreateIndex
CREATE INDEX "putaway_tasks_tenantId_status_createdAt_idx" ON "putaway_tasks"("tenantId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "putaway_tasks_warehouseId_status_idx" ON "putaway_tasks"("warehouseId", "status");

-- CreateIndex
CREATE INDEX "purchase_order_items_poId_idx" ON "purchase_order_items"("poId");

-- CreateIndex
CREATE INDEX "purchase_order_items_skuId_idx" ON "purchase_order_items"("skuId");

-- CreateIndex
CREATE INDEX "stock_transfers_tenantId_idx" ON "stock_transfers"("tenantId");

-- CreateIndex
CREATE INDEX "stock_transfer_items_transferId_idx" ON "stock_transfer_items"("transferId");

-- CreateIndex
CREATE INDEX "stock_transfer_items_skuId_idx" ON "stock_transfer_items"("skuId");

-- CreateIndex
CREATE INDEX "pick_waves_tenantId_status_idx" ON "pick_waves"("tenantId", "status");

-- CreateIndex
CREATE INDEX "pick_waves_warehouseId_status_idx" ON "pick_waves"("warehouseId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "pick_wave_orders_waveId_orderId_key" ON "pick_wave_orders"("waveId", "orderId");

-- CreateIndex
CREATE UNIQUE INDEX "manifests_manifestNumber_key" ON "manifests"("manifestNumber");

-- CreateIndex
CREATE INDEX "manifests_tenantId_idx" ON "manifests"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "manifest_shipments_manifestId_orderId_key" ON "manifest_shipments"("manifestId", "orderId");

-- CreateIndex
CREATE UNIQUE INDEX "marketplace_order_mappings_marketplaceOrderId_key" ON "marketplace_order_mappings"("marketplaceOrderId");

-- CreateIndex
CREATE UNIQUE INDEX "marketplace_order_mappings_localOrderId_key" ON "marketplace_order_mappings"("localOrderId");

-- CreateIndex
CREATE INDEX "marketplace_order_mappings_tenantId_idx" ON "marketplace_order_mappings"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "gatepasses_code_key" ON "gatepasses"("code");

-- CreateIndex
CREATE INDEX "gatepass_items_gatepassId_idx" ON "gatepass_items"("gatepassId");

-- CreateIndex
CREATE UNIQUE INDEX "gatepass_items_gatepassId_skuId_key" ON "gatepass_items"("gatepassId", "skuId");

-- CreateIndex
CREATE UNIQUE INDEX "platform_integrations_tenantId_name_key" ON "platform_integrations"("tenantId", "name");

-- CreateIndex
CREATE INDEX "replenishment_tasks_tenantId_status_createdAt_idx" ON "replenishment_tasks"("tenantId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "replenishment_tasks_assignedTo_status_idx" ON "replenishment_tasks"("assignedTo", "status");

-- CreateIndex
CREATE UNIQUE INDEX "asns_asnNumber_key" ON "asns"("asnNumber");

-- CreateIndex
CREATE INDEX "asns_tenantId_idx" ON "asns"("tenantId");

-- CreateIndex
CREATE INDEX "asn_items_asnId_idx" ON "asn_items"("asnId");

-- CreateIndex
CREATE INDEX "asn_items_skuId_idx" ON "asn_items"("skuId");

-- CreateIndex
CREATE INDEX "productivity_logs_tenantId_recordedAt_idx" ON "productivity_logs"("tenantId", "recordedAt");

-- CreateIndex
CREATE INDEX "productivity_logs_userId_activity_recordedAt_idx" ON "productivity_logs"("userId", "activity", "recordedAt");

-- CreateIndex
CREATE INDEX "productivity_logs_warehouseId_activity_recordedAt_idx" ON "productivity_logs"("warehouseId", "activity", "recordedAt");

-- CreateIndex
CREATE INDEX "leads_email_idx" ON "leads"("email");

-- CreateIndex
CREATE UNIQUE INDEX "invoices_orderId_key" ON "invoices"("orderId");

-- CreateIndex
CREATE UNIQUE INDEX "invoices_invoiceNumber_key" ON "invoices"("invoiceNumber");

-- CreateIndex
CREATE INDEX "invoices_tenantId_invoiceNumber_idx" ON "invoices"("tenantId", "invoiceNumber");

-- CreateIndex
CREATE INDEX "invoices_tenantId_warehouseId_idx" ON "invoices"("tenantId", "warehouseId");

-- CreateIndex
CREATE INDEX "cod_settlements_tenantId_reconciliationStatus_idx" ON "cod_settlements"("tenantId", "reconciliationStatus");

-- CreateIndex
CREATE INDEX "cod_settlements_tenantId_marketplace_idx" ON "cod_settlements"("tenantId", "marketplace");

-- CreateIndex
CREATE INDEX "reports_tenantId_createdAt_idx" ON "reports"("tenantId", "createdAt");

-- CreateIndex
CREATE INDEX "reports_tenantId_reportType_idx" ON "reports"("tenantId", "reportType");

-- CreateIndex
CREATE UNIQUE INDEX "reports_tenantId_reportType_period_key" ON "reports"("tenantId", "reportType", "period");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "warehouses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "warehouses" ADD CONSTRAINT "warehouses_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "warehouses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "facility_sequences" ADD CONSTRAINT "facility_sequences_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "warehouses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "facility_activity_logs" ADD CONSTRAINT "facility_activity_logs_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "warehouses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory" ADD CONSTRAINT "inventory_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "warehouses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory" ADD CONSTRAINT "inventory_skuId_fkey" FOREIGN KEY ("skuId") REFERENCES "sku_master"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "warehouses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_skuId_fkey" FOREIGN KEY ("skuId") REFERENCES "sku_master"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "courier_tracking" ADD CONSTRAINT "courier_tracking_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "returns" ADD CONSTRAINT "returns_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "returns" ADD CONSTRAINT "returns_skuId_fkey" FOREIGN KEY ("skuId") REFERENCES "sku_master"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rto" ADD CONSTRAINT "rto_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ndr_cases" ADD CONSTRAINT "ndr_cases_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "picklists" ADD CONSTRAINT "picklists_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "warehouses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cycle_counts" ADD CONSTRAINT "cycle_counts_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "warehouses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cycle_count_items" ADD CONSTRAINT "cycle_count_items_cycleCountId_fkey" FOREIGN KEY ("cycleCountId") REFERENCES "cycle_counts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cycle_count_items" ADD CONSTRAINT "cycle_count_items_skuId_fkey" FOREIGN KEY ("skuId") REFERENCES "sku_master"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "suppliers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "warehouses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bin_locations" ADD CONSTRAINT "bin_locations_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "warehouses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "grns" ADD CONSTRAINT "grns_poId_fkey" FOREIGN KEY ("poId") REFERENCES "purchase_orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "grns" ADD CONSTRAINT "grns_asnId_fkey" FOREIGN KEY ("asnId") REFERENCES "asns"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "grns" ADD CONSTRAINT "grns_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "warehouses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "grn_items" ADD CONSTRAINT "grn_items_grnId_fkey" FOREIGN KEY ("grnId") REFERENCES "grns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "grn_items" ADD CONSTRAINT "grn_items_poItemId_fkey" FOREIGN KEY ("poItemId") REFERENCES "purchase_order_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "grn_items" ADD CONSTRAINT "grn_items_skuId_fkey" FOREIGN KEY ("skuId") REFERENCES "sku_master"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "putaway_tasks" ADD CONSTRAINT "putaway_tasks_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "warehouses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "putaway_tasks" ADD CONSTRAINT "putaway_tasks_grnId_fkey" FOREIGN KEY ("grnId") REFERENCES "grns"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "putaway_tasks" ADD CONSTRAINT "putaway_tasks_skuId_fkey" FOREIGN KEY ("skuId") REFERENCES "sku_master"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "putaway_tasks" ADD CONSTRAINT "putaway_tasks_binId_fkey" FOREIGN KEY ("binId") REFERENCES "bin_locations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_order_items" ADD CONSTRAINT "purchase_order_items_poId_fkey" FOREIGN KEY ("poId") REFERENCES "purchase_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_order_items" ADD CONSTRAINT "purchase_order_items_skuId_fkey" FOREIGN KEY ("skuId") REFERENCES "sku_master"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_transfers" ADD CONSTRAINT "stock_transfers_fromWarehouseId_fkey" FOREIGN KEY ("fromWarehouseId") REFERENCES "warehouses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_transfers" ADD CONSTRAINT "stock_transfers_toWarehouseId_fkey" FOREIGN KEY ("toWarehouseId") REFERENCES "warehouses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_transfer_items" ADD CONSTRAINT "stock_transfer_items_transferId_fkey" FOREIGN KEY ("transferId") REFERENCES "stock_transfers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_transfer_items" ADD CONSTRAINT "stock_transfer_items_skuId_fkey" FOREIGN KEY ("skuId") REFERENCES "sku_master"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pick_waves" ADD CONSTRAINT "pick_waves_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "warehouses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pick_wave_orders" ADD CONSTRAINT "pick_wave_orders_waveId_fkey" FOREIGN KEY ("waveId") REFERENCES "pick_waves"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pick_wave_orders" ADD CONSTRAINT "pick_wave_orders_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "manifest_shipments" ADD CONSTRAINT "manifest_shipments_manifestId_fkey" FOREIGN KEY ("manifestId") REFERENCES "manifests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "manifest_shipments" ADD CONSTRAINT "manifest_shipments_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gatepasses" ADD CONSTRAINT "gatepasses_stockTransferId_fkey" FOREIGN KEY ("stockTransferId") REFERENCES "stock_transfers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gatepasses" ADD CONSTRAINT "gatepasses_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gatepass_items" ADD CONSTRAINT "gatepass_items_gatepassId_fkey" FOREIGN KEY ("gatepassId") REFERENCES "gatepasses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gatepass_items" ADD CONSTRAINT "gatepass_items_skuId_fkey" FOREIGN KEY ("skuId") REFERENCES "sku_master"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "replenishment_tasks" ADD CONSTRAINT "replenishment_tasks_skuId_fkey" FOREIGN KEY ("skuId") REFERENCES "sku_master"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asn_items" ADD CONSTRAINT "asn_items_asnId_fkey" FOREIGN KEY ("asnId") REFERENCES "asns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asn_items" ADD CONSTRAINT "asn_items_skuId_fkey" FOREIGN KEY ("skuId") REFERENCES "sku_master"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cod_settlements" ADD CONSTRAINT "cod_settlements_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

