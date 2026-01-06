import { request } from '@playwright/test';
import { SMTP4DEV_URL } from '../constant';

export const getLastEmail = async () => {
  const req = await request.newContext();
  const message = await req.get(`${SMTP4DEV_URL}/api/messages`);
  const data = await message.json();
  const messageId = data.results[0].id;

  const result = await req.get(
    `${SMTP4DEV_URL}/api/messages/${messageId}/source`
  );
  const res = await result.text();
  return res;
};

/**
 * Get the last email sent to a specific address
 */
export const getLastEmailTo = async (email: string) => {
  const req = await request.newContext();
  const messagesRes = await req.get(`${SMTP4DEV_URL}/api/messages`);
  const data = await messagesRes.json();

  // Find the most recent email to the specified address
  const message = data.results.find((m: { to: string[] }) =>
    m.to.some((addr) => addr.toLowerCase().includes(email.toLowerCase()))
  );

  if (!message) {
    throw new Error(`No email found for ${email}`);
  }

  const result = await req.get(
    `${SMTP4DEV_URL}/api/messages/${message.id}/source`
  );
  return await result.text();
};

/**
 * Extract magic link URL from email content
 */
export const extractMagicLinkFromEmail = (emailContent: string): string => {
  // Match href in anchor tags
  const hrefRegex = /<a\s+[^>]*href="([^"]*)"[^>]*>/i;
  const match = emailContent.match(hrefRegex);

  if (match && match[1]) {
    return match[1];
  }

  throw new Error('Could not extract magic link from email');
};

/**
 * Clear all emails in smtp4dev
 */
export const clearAllEmails = async () => {
  const req = await request.newContext();
  await req.delete(`${SMTP4DEV_URL}/api/messages/*`);
};
