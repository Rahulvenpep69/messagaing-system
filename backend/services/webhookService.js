const axios = require('axios');
const crypto = require('crypto');
const Webhook = require('../models/Webhook');
const logger = require('../utils/logger');

/**
 * Service to handle outgoing webhooks
 */
class WebhookService {
  /**
   * Trigger webhooks for a specific event
   * @param {string} event - The event name (e.g., 'ticket.created')
   * @param {object} payload - The data to send
   */
  async trigger(event, payload) {
    try {
      // Find active webhooks subscribed to this event
      const webhooks = await Webhook.find({ 
        events: event,
        isActive: true 
      });

      if (webhooks.length === 0) return;

      logger.info(`Triggering ${webhooks.length} webhooks for event: ${event}`);

      const promises = webhooks.map(webhook => this.sendPayload(webhook, event, payload));
      
      // Fire and forget (don't await in the main thread)
      Promise.all(promises).catch(err => {
        logger.error('Error in one or more webhook triggers:', err);
      });

    } catch (error) {
      logger.error('Webhook trigger service error:', error);
    }
  }

  /**
   * Send payload to a specific webhook
   */
  async sendPayload(webhook, event, payload) {
    const timestamp = Date.now();
    const body = JSON.stringify({
      event,
      timestamp,
      data: payload
    });

    // Create signature for verification
    const signature = crypto
      .createHmac('sha256', webhook.secret)
      .update(body)
      .digest('hex');

    try {
      await axios.post(webhook.url, body, {
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Event': event,
          'X-Webhook-Signature': signature,
          'X-Webhook-Timestamp': timestamp
        },
        timeout: 5000 // 5 second timeout
      });
      
      logger.info(`Webhook successfully sent to ${webhook.url} for event ${event}`);
    } catch (error) {
      logger.error(`Failed to send webhook to ${webhook.url}: ${error.message}`);
      // In a real system, you might implement retries here
    }
  }
}

module.exports = new WebhookService();
