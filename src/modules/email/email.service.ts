import nodemailer from 'nodemailer';
import { Config } from '../../config';

export interface EmailOptions {
    to: string;
    subject: string;
    text: string;
    html?: string;
}

export interface EmailService {
    sendEmail(options: EmailOptions): Promise<void>;
    sendPasswordResetEmail(email: string, resetToken: string): Promise<void>;
}

export function createEmailService(config: Config): EmailService {
    const transporter = nodemailer.createTransport({
        host: config.email.host,
        port: config.email.port,
        auth: {
            user: config.email.user,
            pass: config.email.password,
        }
    });

    return {
        async sendEmail(options: EmailOptions): Promise<void> {
            try {
                await transporter.sendMail({
                    from: config.email.from,
                    to: options.to,
                    subject: options.subject,
                    text: options.text,
                    html: options.html,
                });
            } catch (error) {
                console.error('Failed to send email:', error);
                throw new Error('Email sending failed');
            }
        },
        async sendPasswordResetEmail(email: string, resetToken: string): Promise<void> {
            const resetUrl = `${config.appUrl}/reset-password?token=${resetToken}&email=${encodeURIComponent(email)}`;

            await this.sendEmail({
                to: email,
                subject: 'Password Reset Request',
                text: `To reset your password, please click on the link: ${resetUrl}\n\nIf you didn't request this, please ignore this email.`,
                html: `
                <p>Hello,</p>
                <p>We received a request to reset your password.</p>
                <p>Click the button below to reset your password:</p>
                <p>
                  <a href="${resetUrl}" style="padding: 10px 20px; background-color: #4CAF50; color: white; text-decoration: none; border-radius: 5px;">
                    Reset Password
                  </a>
                </p>
                <p>Or copy and paste this link into your browser:</p>
                <p>${resetUrl}</p>
                <p>If you didn't request this, please ignore this email.</p>
                <p>This link will expire in 1 hour.</p>
              `
            });
        },
    }
}
