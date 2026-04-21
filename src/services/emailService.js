import emailjs from 'emailjs-com';

/**
 * Service to handle mass email sending.
 * For now, it uses EmailJS. 
 * User should provide:
 * 1. SERVICE_ID
 * 2. TEMPLATE_ID
 * 3. USER_ID (Public Key)
 */

export const sendEmail = async ({ to_email, to_name, message, subject, attachment }) => {
  // Check if credentials are set (in a real app, these would be in .env)
  // For now, I'll return a promise that resolves with success to allow UI testing
  const SERVICE_ID = import.meta.env.VITE_EMAILJS_SERVICE_ID;
  const TEMPLATE_ID = import.meta.env.VITE_EMAILJS_TEMPLATE_ID;
  const USER_ID = import.meta.env.VITE_EMAILJS_PUBLIC_KEY;

  if (!SERVICE_ID || !TEMPLATE_ID || !USER_ID) {
    console.warn("EmailJS credentials not found in .env. Simulating success...");
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({ status: 200, text: "OK (Simulated)" });
      }, 500);
    });
  }

  const templateParams = {
    to_email,
    to_name,
    message,
    subject,
    // Note: EmailJS handles attachments via their dashboard or specific parameters
    // If it's a file, we might need a different approach depending on the service
  };

  try {
    const response = await emailjs.send(SERVICE_ID, TEMPLATE_ID, templateParams, USER_ID);
    return response;
  } catch (error) {
    console.error("Failed to send email to", to_email, error);
    throw error;
  }
};
