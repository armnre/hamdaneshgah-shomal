// Outbound email: SMTP (e.g. the Plesk mail server) when SMTP_HOST is set, otherwise Resend.
import nodemailer from 'nodemailer';

type Mail = { to: string; subject: string; html: string; text: string };
let transport: nodemailer.Transporter | null = null;

const from = () => process.env.MAIL_FROM ?? 'هم‌دانشگاهی <no-reply@localhost>';

export async function sendMail(m: Mail) {
  if (process.env.SMTP_HOST) {
    transport ??= nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT ?? 587),
      secure: process.env.SMTP_SECURE === 'true',
      auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
    });
    await transport.sendMail({ from: from(), ...m });
    return;
  }
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error('No mail transport: set SMTP_HOST (or RESEND_API_KEY)');
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: from(), ...m }),
  });
  if (!res.ok) throw new Error(`Resend failed: ${res.status} ${await res.text()}`);
}
