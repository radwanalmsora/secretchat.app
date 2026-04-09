import CryptoJS from 'crypto-js';

/**
 * In a real E2EE app, keys would be exchanged via Diffie-Hellman.
 * For this demo, we use a derived key from a "Secret Chat" passphrase 
 * that is shared between participants (simulated).
 */
const DEFAULT_SECRET = 'telegram-secret-chat-key-2024';

export const encryptMessage = (text: string, secret: string = DEFAULT_SECRET): string => {
  if (!text) return '';
  return CryptoJS.AES.encrypt(text, secret).toString();
};

export const decryptMessage = (ciphertext: string, secret: string = DEFAULT_SECRET): string => {
  if (!ciphertext) return '';
  try {
    const bytes = CryptoJS.AES.decrypt(ciphertext, secret);
    const originalText = bytes.toString(CryptoJS.enc.Utf8);
    if (!originalText) return '[Encrypted Message]';
    return originalText;
  } catch (e) {
    return '[Encrypted Message]';
  }
};
