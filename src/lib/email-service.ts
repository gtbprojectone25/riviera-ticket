/**
 * Email Service
 * Handles sending verification codes via nodemailer
 */

import nodemailer from 'nodemailer'

interface EmailConfig {
  host: string
  port: number
  secure: boolean
  auth: {
    user: string
    pass: string
  }
}

class EmailService {
  private transporter: nodemailer.Transporter | null = null

  constructor() {
    // Initialize transporter from environment variables
    if (
      process.env.SMTP_HOST &&
      process.env.SMTP_USER &&
      process.env.SMTP_PASS
    ) {
      this.transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: process.env.SMTP_PORT === '465',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      } as EmailConfig)
    }
  }

  /**
   * Send verification code email
   */
  async sendVerificationCode(email: string, code: string): Promise<boolean> {
    if (!this.transporter) {
      console.warn('Email service not configured. Code:', code)
      return false
    }

    try {
      const html = this.getVerificationEmailTemplate(code)
      
      await this.transporter.sendMail({
        from: process.env.SMTP_FROM || process.env.SMTP_USER,
        to: email,
        subject: 'Your Riviera Tickets Verification Code',
        html,
      })

      return true
    } catch (error) {
      console.error('Error sending verification email:', error)
      return false
    }
  }

  /**
   * Send ticket confirmation email
   */
  async sendTicketConfirmation(
    email: string,
    ticketDetails: {
      orderId: string
      movieTitle: string
      cinemaName: string
      date: string
      time: string
      seats: string[]
      totalAmount: number
    }
  ): Promise<boolean> {
    if (!this.transporter) {
      console.warn('Email service not configured')
      return false
    }

    try {
      const html = this.getTicketConfirmationTemplate(ticketDetails)
      
      await this.transporter.sendMail({
        from: process.env.SMTP_FROM || process.env.SMTP_USER,
        to: email,
        subject: `Your Tickets for ${ticketDetails.movieTitle}`,
        html,
      })

      return true
    } catch (error) {
      console.error('Error sending ticket confirmation:', error)
      return false
    }
  }

  private getVerificationEmailTemplate(code: string): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; background-color: #000; color: #fff; padding: 20px; }
            .container { max-width: 600px; margin: 0 auto; background-color: #1c1c1c; padding: 30px; border-radius: 10px; }
            .code { font-size: 32px; font-weight: bold; letter-spacing: 8px; text-align: center; color: #0066FF; margin: 30px 0; }
            .footer { margin-top: 30px; font-size: 12px; color: #666; text-align: center; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1 style="color: #fff;">Verification Code</h1>
            <p>Your verification code is:</p>
            <div class="code">${code}</div>
            <p>This code will expire in 10 minutes.</p>
            <p>If you didn't request this code, please ignore this email.</p>
            <div class="footer">
              <p>Riviera Tickets - IMAX 70mm Experience</p>
            </div>
          </div>
        </body>
      </html>
    `
  }

  private getTicketConfirmationTemplate(details: any): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; background-color: #000; color: #fff; padding: 20px; }
            .container { max-width: 600px; margin: 0 auto; background-color: #1c1c1c; padding: 30px; border-radius: 10px; }
            .ticket-info { margin: 20px 0; }
            .ticket-info h2 { color: #0066FF; }
            .footer { margin-top: 30px; font-size: 12px; color: #666; text-align: center; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>Ticket Confirmation</h1>
            <div class="ticket-info">
              <h2>${details.movieTitle}</h2>
              <p><strong>Order ID:</strong> ${details.orderId}</p>
              <p><strong>Cinema:</strong> ${details.cinemaName}</p>
              <p><strong>Date:</strong> ${details.date}</p>
              <p><strong>Time:</strong> ${details.time}</p>
              <p><strong>Seats:</strong> ${details.seats.join(', ')}</p>
              <p><strong>Total:</strong> $${details.totalAmount.toLocaleString()}</p>
            </div>
            <p>Your tickets will be available in your account. Barcodes will be revealed on the day of the event.</p>
            <div class="footer">
              <p>Riviera Tickets - IMAX 70mm Experience</p>
            </div>
          </div>
        </body>
      </html>
    `
  }
}

export const emailService = new EmailService()

