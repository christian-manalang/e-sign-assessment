import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_PASS,
  },
});

export const sendSignatureRequest = async (to: string, filename: string, id: string) => {
  const signLink = `${process.env.FRONTEND_URL}/sign/${id}`;

  const mailOptions = {
    from: `"E-Sign Service" <${process.env.GMAIL_USER}>`,
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
  };

  return await transporter.sendMail(mailOptions);
};