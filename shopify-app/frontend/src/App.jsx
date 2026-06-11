import React, { useState, useEffect } from 'react';
import { AppProvider, Card, Layout, Page, Text, Button, Badge, DataTable, Spinner, Toast, Frame } from '@shopify/polaris';
import { useAppBridge } from '@shopify/app-bridge-react';
import { getSessionToken } from '@shopify/app-bridge-utils';

const MARKETPLACES = [
  { id: 'FLIPKART', name: 'Flipkart', color: '#2874F0', icon: '🛍️' },
  { id: 'AMAZON', name: 'Amazon', color: '#FF9900', icon: '📦' },
  { id: 'NYKAA', name: 'Nykaa', color: '#FC2779', icon: '💄' },
  { id: 'MYNTRA', name: 'Myntra', color: '#FF3F6C', icon: '👗' },
  { id: 'TATACLIQ', name: 'TataCliq', color: '#F43397', icon: '🏷️' },
];

export default function App() {
  const app = useAppBridge();
  const [shop, setShop] = useState('');
  const [loading, setLoading] = useState(true);
  const [configs, setConfigs] = useState([]);
  const [mappings, setMappings] = useState([]);
  const [syncing, setSyncing] = useState('');
  const [toastActive, setToastActive] = useState(false);
  const [toastMsg, setToastMsg] = useState('');

  useEffect(() => {
    if (app) {
      getSessionToken(app).then(token => {
        fetch('/api/shop', { headers: { Authorization: `Bearer ${token}` } })
          .then(r => r.json())
          .then(data => {
            setShop(data.shop);
            setConfigs(data.marketplaces || []);
            setLoading(false);
          })
          .catch(() => setLoading(false));
      });
    }
  }, [app]);

  const showToast = (msg) => {
    setToastMsg(msg);
    setToastActive(true);
  };

  const handleConfigure = async (marketplace) => {
    const apiKey = prompt(`Enter ${marketplace} API Key:`);
    if (!apiKey) return;
    const apiSecret = prompt(`Enter ${marketplace} API Secret:`);
    const sellerId = prompt(`Enter ${marketplace} Seller ID:`);

    await fetch('/api/marketplace/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ shop, marketplace, apiKey, apiSecret, sellerId }),
    });
    showToast(`${marketplace} configured successfully`);
    // Reload configs
    const res = await fetch(`/api/shop?shop=${shop}`);
    const data = await res.json();
    setConfigs(data.marketplaces || []);
  };

  const handleSyncOrders = async (marketplace) => {
    setSyncing(marketplace);
    try {
      const res = await fetch('/api/sync/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shop, marketplace }),
      });
      const data = await res.json();
      showToast(`Synced ${data.synced}/${data.total} orders from ${marketplace}`);
    } catch (err) {
      showToast(`Sync failed: ${err.message}`);
    }
    setSyncing('');
  };

  const handleSyncInventory = async (marketplace) => {
    setSyncing(marketplace);
    try {
      const res = await fetch('/api/sync/inventory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shop, marketplace }),
      });
      const data = await res.json();
      showToast(`Updated ${data.itemsUpdated} inventory items on ${marketplace}`);
    } catch (err) {
      showToast(`Inventory sync failed: ${err.message}`);
    }
    setSyncing('');
  };

  const isConfigured = (mp) => configs.some(c => c.marketplace === mp);

  if (loading) {
    return (
      <AppProvider>
        <Page>
          <Layout>
            <Layout.Section>
              <Card sectioned>
                <Spinner size="large" />
                <Text variant="bodyMd" alignment="center">Loading...</Text>
              </Card>
            </Layout.Section>
          </Layout>
        </Page>
      </AppProvider>
    );
  }

  return (
    <AppProvider>
      <Frame>
        <Page
          title="GlobalSupply Marketplace Sync"
          subtitle={`Sync orders & inventory from Indian marketplaces into ${shop}`}
        >
          <Layout>
            <Layout.Section>
              <Card title="Connected Marketplaces" sectioned>
                <Text variant="bodyMd" color="subdued" spacing="mb4">
                  Configure and sync orders from your sales channels
                </Text>
                <DataTable
                  columnContentTypes={['text', 'text', 'text', 'text']}
                  headings={['Marketplace', 'Status', 'Last Sync', 'Actions']}
                  rows={MARKETPLACES.map(mp => [
                    `${mp.icon} ${mp.name}`,
                    isConfigured(mp.id)
                      ? <Badge status="success">Connected</Badge>
                      : <Badge status="warning">Not configured</Badge>,
                    configs.find(c => c.marketplace === mp.id)?.last_sync_at
                      ? new Date(configs.find(c => c.marketplace === mp.id).last_sync_at).toLocaleString()
                      : 'Never',
                    <div style={{ display: 'flex', gap: '8px' }}>
                      {!isConfigured(mp.id) ? (
                        <Button size="slim" onClick={() => handleConfigure(mp.id)}>
                          Configure
                        </Button>
                      ) : (
                        <>
                          <Button
                            size="slim"
                            primary
                            loading={syncing === mp.id}
                            onClick={() => handleSyncOrders(mp.id)}
                          >
                            {syncing === mp.id ? 'Syncing...' : 'Sync Orders'}
                          </Button>
                          <Button
                            size="slim"
                            loading={syncing === `${mp.id}-inv`}
                            onClick={() => handleSyncInventory(mp.id)}
                          >
                            Sync Inventory
                          </Button>
                        </>
                      )}
                    </div>,
                  ])}
                />
              </Card>
            </Layout.Section>

            <Layout.Section>
              <Card title="Quick Setup" sectioned>
                <Text variant="bodyMd" spacing="mb2">
                  <strong>Step 1:</strong> Click "Configure" next to each marketplace
                </Text>
                <Text variant="bodyMd" spacing="mb2">
                  <strong>Step 2:</strong> Enter your API credentials when prompted
                </Text>
                <Text variant="bodyMd" spacing="mb2">
                  <strong>Step 3:</strong> Click "Sync Orders" to import marketplace orders
                </Text>
                <Text variant="bodyMd" spacing="mb4">
                  <strong>Step 4:</strong> Click "Sync Inventory" to push Shopify stock levels
                </Text>
                <Text variant="bodyMd" color="subdued">
                  Orders will appear as Draft Orders in your Shopify admin. You can review and fulfill them like any other order.
                </Text>
              </Card>
            </Layout.Section>

            <Layout.Section>
              <Card title="Stats" sectioned>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
                  <div style={{ textAlign: 'center', padding: '16px', background: '#f4f6f8', borderRadius: '8px' }}>
                    <Text variant="headingLg">{configs.length}</Text>
                    <Text variant="bodyMd" color="subdued">Connected Channels</Text>
                  </div>
                  <div style={{ textAlign: 'center', padding: '16px', background: '#f4f6f8', borderRadius: '8px' }}>
                    <Text variant="headingLg">{mappings.length}</Text>
                    <Text variant="bodyMd" color="subdued">Orders Synced</Text>
                  </div>
                  <div style={{ textAlign: 'center', padding: '16px', background: '#f4f6f8', borderRadius: '8px' }}>
                    <Text variant="headingLg">Active</Text>
                    <Text variant="bodyMd" color="subdued">Sync Status</Text>
                  </div>
                </div>
              </Card>
            </Layout.Section>
          </Layout>
        </Page>
        {toastActive && <Toast content={toastMsg} onDismiss={() => setToastActive(false)} />}
      </Frame>
    </AppProvider>
  );
}
