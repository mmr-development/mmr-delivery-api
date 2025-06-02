import nodemailer from 'nodemailer';
import { Config } from '../../config';
import Mustache from 'mustache';
import fs from 'fs';
import path from 'path';

export interface EmailOptions {
    to: string;
    subject: string;
    text: string;
    html?: string;
}

export interface EmailService {
    sendEmail(options: EmailOptions): Promise<void>;
    sendPasswordResetEmail(email: string, resetToken: string): Promise<void>;
    sendPartnerApplicationStatusEmail(
        email: string,
        statusType: 'approved' | 'rejected' | 'received',
        partnerName: string,
        contactName: string,
        options?: {
            setupToken?: string,
            rejectionReason?: string,
            applicationId?: number
        }
    ): Promise<void>;
    sendOrderTrackingEmail(email: string, orderId: number, trackingUrl: string): Promise<void>;
    sendOrderConfirmationEmail(email: string, orderId: number, orderDetails: any): Promise<void>;
    sendCourierApplicationStatusEmail(
        email: string,
        statusType: 'approved' | 'rejected' | 'received',
        courierName: string,
        options?: {
            setupToken?: string,
            rejectionReason?: string,
            applicationId?: number
        }
    ): Promise<void>;
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

    const renderTemplate = (templateName: string, data: any): string => {
        const templatePath = path.join(__dirname, 'templates', `${templateName}.mustache`);
        const template = fs.readFileSync(templatePath, 'utf-8');
        return Mustache.render(template, data);
    };

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
            const resetUrl = `${config.appUrl}/reset-password.html?token=${resetToken}`;

            const html = renderTemplate('password-reset', {
                resetUrl,
                appName: 'MMR Delivery',
                supportEmail: config.email.from
            });

            await this.sendEmail({
                to: email,
                subject: 'Password Reset Request',
                text: `To reset your password, please visit: ${resetUrl}\n\nIf you didn't request this, please ignore this email.`,
                html
            });
        },
        async sendPartnerApplicationStatusEmail(
            email: string,
            statusType: 'approved' | 'rejected' | 'received',
            partnerName: string,
            contactName: string,
            options?: {
                setupToken?: string,
                rejectionReason?: string,
                applicationId?: number
            }
        ): Promise<void> {
            const templateData: any = {
                partnerName,
                contactName,
                status: {
                    approved: statusType === 'approved',
                    rejected: statusType === 'rejected',
                    received: statusType === 'received'
                },
                appName: 'MMR Delivery',
                supportEmail: config.email.from,
                partnerRequirementsUrl: `${config.appUrl}/partner/requirements`
            };

            let subject: string = 'Partner Application Update';
            let text: string = `Dear ${contactName}, thank you for your partner application with MMR Delivery.`;

            if (statusType === 'approved' && options?.setupToken) {
                const token = options.setupToken;
                const setupUrl = `${config.appUrl}/create-password.html?token=${token}`;
                templateData.setupUrl = setupUrl;

                subject = 'Your Partner Application Has Been Approved';
                text = `Congratulations! Your partner application has been approved. Visit: ${setupUrl} to set up your account.`;
            }
            else if (statusType === 'rejected') {
                if (options?.rejectionReason) {
                    templateData.rejectionReason = options.rejectionReason;
                }

                subject = 'Your Partner Application Status Update';
                text = `Dear ${contactName},\n\nWe regret to inform you that your partner application has been rejected.`;
            }
            else if (statusType === 'received') {
                templateData.applicationId = options?.applicationId;

                subject = 'Your Partner Application Has Been Received';
                text = `Dear ${contactName},\n\nThank you for submitting your application to become a partner with MMR Delivery. Your application ID is ${options?.applicationId}.`;
            }

            const html = renderTemplate('partner-application-status', templateData);

            await this.sendEmail({
                to: email,
                subject,
                text,
                html
            });
        },
        async sendCourierApplicationStatusEmail(
            email: string,
            statusType: 'approved' | 'rejected' | 'received',
            courierName: string,
            options?: {
                setupToken?: string,
                rejectionReason?: string,
                applicationId?: number
            }
        ): Promise<void> {
            const templateData: any = {
                courierName,
                status: {
                    approved: statusType === 'approved',
                    rejected: statusType === 'rejected',
                    received: statusType === 'received'
                },
                appName: 'MMR Delivery',
                supportEmail: config.email.from,
                courierRequirementsUrl: `${config.appUrl}/courier/requirements`
            };

            let subject: string = 'Courier Application Update';
            let text: string;

            if (statusType === 'approved' && options?.setupToken) {
                const token = options.setupToken;
                const setupUrl = `${config.appUrl}/create-password.html?token=${token}`;
                templateData.setupUrl = setupUrl;

                subject = 'Your Courier Application Has Been Approved';
                text = `Congratulations! Your courier application has been approved. Visit: ${setupUrl} to set up your account.`;
            }
            else if (statusType === 'rejected') {
                if (options?.rejectionReason) {
                    templateData.rejectionReason = options.rejectionReason;
                }

                subject = 'Your Courier Application Status Update';
                text = `Dear ${courierName},\n\nWe regret to inform you that your courier application has been rejected.`;
            }
            else if (statusType === 'received') {
                templateData.applicationId = options?.applicationId;

                subject = 'Your Courier Application Has Been Received';
                text = `Dear ${courierName},\n\nThank you for submitting your application to become a courier with MMR Delivery. Your application ID is ${options?.applicationId}.`;
            }

            const html = renderTemplate('courier-application-status', templateData);

            await this.sendEmail({
                to: email,
                subject,
                text,
                html
            });
        },
        async sendOrderTrackingEmail(email: string, orderId: number, trackingToken: string): Promise<void> {
            const trackingUrl = `${config.appUrl}/order-tracking.html?token=${trackingToken}`;

            const html = renderTemplate('order-tracking', {
                orderId,
                trackingUrl,
                appName: 'MMR Delivery'
            });

            await this.sendEmail({
                to: email,
                subject: 'Følg din ordre',
                text: `Du kan følge din ordre #${orderId} ved at besøge følgende link: ${trackingUrl}`,
                html
            });
        },
        async sendOrderConfirmationEmail(email: string, orderId: number, orderDetails: any): Promise<void> {
            console.log('order details inside send order', orderDetails)
            const html = renderTemplate('order-confirmation', {
                orderId,
                orderDetails,
                appName: 'MMR Delivery'
            });

            await this.sendEmail({
                to: email,
                subject: `Ordrebekræftelse for ordre #${orderId}`,
                text: `Tak for din ordre #${orderId}. Du kan se dine ordredetaljer i denne e-mail.`,
                html
            });
        }
    };
}
