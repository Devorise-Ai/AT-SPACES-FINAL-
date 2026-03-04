/**
 * Mock Email Service for security notifications
 */

export const sendEmail = async (to: string, subject: string, text: string, html: string): Promise<void> => {
    console.log(`\n================== EMAIL MOCK ==================`);
    console.log(`To: ${to}`);
    console.log(`Subject: ${subject}`);
    console.log(`Content:\n${text}`);
    console.log(`================================================\n`);
};
