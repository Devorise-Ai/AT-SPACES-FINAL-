import crypto from 'crypto';

export interface VendorNotificationPayload {
    event: string;
    targetId: number;
    details?: any;
}

export const sendVendorNotification = async (webhookUrl: string, payload: VendorNotificationPayload) => {
    const timestamp = Date.now().toString();
    const notification_id = crypto.randomUUID();

    const signedPayload = {
        ...payload,
        notification_id,
        timestamp,
    };

    const payloadString = JSON.stringify(signedPayload);

    // M-17: HMAC-SHA256 signatures on outbound vendor notifications
    const signature = crypto
        .createHmac('sha256', process.env.HMAC_SECRET || 'supersecret')
        .update(payloadString)
        .digest('hex');

    try {
        // Mocking the webhook delivery mechanism for now.
        // In a production environment, you would use fetch() or Axios:
        /*
        await fetch(webhookUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Vendor-Signature': signature,
                'X-Vendor-Timestamp': timestamp
            },
            body: payloadString
        });
        */
        console.log(`[Webhook Mock Base] Delivered to ${webhookUrl}`);
        console.log(`[Webhook HMAC Signature] ${signature}`);

        return { success: true, notification_id, signature };
    } catch (error) {
        console.error('Failed to send vendor notification webhook', error);
        return { success: false, error };
    }
};
