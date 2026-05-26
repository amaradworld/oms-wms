import { Queue, Worker } from 'bullmq';
import IORedis from 'ioredis';

const connection = new IORedis({ maxRetriesPerRequest: null });
const notificationQueue = new Queue('notifications', { connection });

export const sendWhatsAppAlert = async (phone: string, message: string) => {
  await notificationQueue.add('whatsapp-msg', { phone, message });
};

// Worker to process notifications
const worker = new Worker('notifications', async (job) => {
  const { phone, message } = job.data;
  console.log(`[WhatsApp API] Sending message to ${phone}: ${message}`);
  // Integration with WhatsApp Business API (Meta) would go here
}, { connection });

export { notificationQueue };
