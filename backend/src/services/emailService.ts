import { Resend } from 'resend';

let resendInstance: Resend | null = null;

const getResend = () => {
  if (!resendInstance) {
    resendInstance = new Resend(process.env.RESEND_API_KEY);
  }
  return resendInstance;
};

export const sendSignatureRequest = async (to: string, filename: string, id: string) => {
  const signLink = `${process.env.FRONTEND_URL}/sign/${id}`;
  const resend = getResend();

  try {
    const { data, error } = await resend.emails.send({
      from: 'E-Sign Service <onboarding@resend.dev>',
      to: to,
      subject: `Action Required: Signature Requested for ${filename}`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
          <h2 style="color: #18181b;">Signature Requested</h2>
          <p>You have been requested to sign the following document: <strong>${filename}</strong></p>
          <div style="margin-top: 30px;">
            <a href="${signLink}" style="background-color: #18181b; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
              Sign Document
            </a>
          </div>
          <p style="margin-top: 30px; font-size: 12px; color: #71717a;">
            If the button doesn't work, copy and paste this link: <br/>
            ${signLink}
          </p>
        </div>
      `,
    });

    if (error) {
      console.error('Resend Error:', error);
      throw error;
    }

    return data;
  } catch (err) {
    console.error('Failed to send email:', err);
    throw err;
  }
};

export const sendCompletionNotice = async (to: string, signerEmail: string, filename: string) => {
  const resend = getResend();
  try {
    const { data, error } = await resend.emails.send({
      from: 'E-Sign Service <onboarding@resend.dev>',
      to: to,
      subject: `Document Signed: ${filename}`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
          <h2 style="color: #10b981;">Document Signed</h2>
          <p>Your document <strong>${filename}</strong> has been signed by <strong>${signerEmail}</strong>.</p>
          <p>You can now download the completed version from your dashboard.</p>
          <p style="margin-top: 30px; font-size: 12px; color: #71717a;">
            This is an automated notification from E-Sign Service.
          </p>
        </div>
      `,
    });

    if (error) {
      console.error('Resend Error:', error);
      throw error;
    }

    return data;
  } catch (err) {
    console.error('Failed to send completion notice:', err);
    throw err;
  }
};