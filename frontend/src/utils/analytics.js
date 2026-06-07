const GA4_ID = 'G-DNG7EHNNFX';

const isReady = () => typeof window !== 'undefined' && typeof window.gtag === 'function';

export const track = (eventName, params = {}) => {
  if (!isReady()) return;
  window.gtag('event', eventName, params);
};

export const trackPageView = (path, title) => {
  if (!isReady()) return;
  window.gtag('event', 'page_view', {
    page_path: path,
    page_title: title || document.title,
    page_location: window.location.href,
  });
};

export const setUserId = (userId) => {
  if (!isReady() || !userId) return;
  window.gtag('set', { user_id: userId });
};

export const setUserProperties = (props) => {
  if (!isReady()) return;
  window.gtag('set', { user_properties: props });
};

export const clearUser = () => {
  if (!isReady()) return;
  window.gtag('set', { user_id: null });
};

const FIRST_FLAGS = {
  sku: 'sh_first_sku_created',
  order: 'sh_first_order_imported',
  wave: 'sh_first_wave_picked',
  invoice: 'sh_first_invoice_generated',
  grn: 'sh_first_grn_created',
  warehouse: 'sh_first_warehouse_created',
  pack: 'sh_first_pack_completed',
  return: 'sh_first_return_processed',
};

export const trackFirst = (key, eventName, params = {}) => {
  const flagKey = FIRST_FLAGS[key];
  if (!flagKey) {
    track(eventName, params);
    return false;
  }
  const isFirst = !localStorage.getItem(flagKey);
  track(eventName, { ...params, is_first_time: isFirst });
  if (isFirst) localStorage.setItem(flagKey, '1');
  return isFirst;
};

export const GA_MEASUREMENT_ID = GA4_ID;
