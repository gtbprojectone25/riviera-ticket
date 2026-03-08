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

type VerificationContext = 'register' | 'password_reset'

class EmailService {
  private transporter: nodemailer.Transporter | null = null

  constructor() {
    // Initialize transporter from environment variables
    const host =
      process.env.SMTP_HOST || process.env.EMAIL_SERVER_HOST || process.env.SMTP_SERVER
    const user =
      process.env.SMTP_USER || process.env.EMAIL_SERVER_USER
    const pass =
      process.env.SMTP_PASS || process.env.EMAIL_SERVER_PASSWORD
    const port =
      parseInt(process.env.SMTP_PORT || process.env.EMAIL_SERVER_PORT || '587')

    if (host && user && pass) {
      this.transporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: {
          user,
          pass,
        },
      } as EmailConfig)
    }
  }

  /**
   * Send verification code email
   */
  async sendVerificationCode(
    email: string,
    code: string,
    context: VerificationContext = 'register',
  ): Promise<boolean> {
    if (!this.transporter) {
      console.warn('Email service not configured. Code:', code)
      return false
    }

    try {
      const { subject, html } = this.getVerificationEmailTemplate(code, context)
      
      await this.transporter.sendMail({
        from:
          process.env.SMTP_FROM ||
          process.env.EMAIL_FROM ||
          process.env.EMAIL_SERVER_USER ||
          process.env.SMTP_USER,
        to: email,
        subject,
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
      console.warn('Email service not configured. Confirmation not sent for:', email)
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

  private getVerificationEmailTemplate(
    code: string,
    context: VerificationContext,
  ): { subject: string; html: string } {
    const isPasswordReset = context === 'password_reset'
    const title = isPasswordReset ? 'Password Reset Verification Code' : 'Account Verification Code'
    const intro = isPasswordReset
      ? 'We received a request to reset your Riviera account password.'
      : 'Use this code to verify your email and finish creating your Riviera account.'
    const action = isPasswordReset ? 'Reset Password' : 'Verify Account'
    const ignoreText = isPasswordReset
      ? "If you didn't request a password change, ignore this email and your password will stay the same."
      : "If you didn't start this account creation, you can safely ignore this email."

    return {
      subject: `Riviera - ${isPasswordReset ? 'Reset your password' : 'Verify your account'}`,
      html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width,initial-scale=1">
          <style>
            body { margin: 0; padding: 0; background: #0b0f19; font-family: Arial, sans-serif; color: #f5f7fb; }
            .wrap { width: 100%; padding: 28px 14px; box-sizing: border-box; }
            .card {
              max-width: 620px; margin: 0 auto; border-radius: 16px; overflow: hidden;
              background: linear-gradient(180deg, #0f1728 0%, #0b1220 100%);
              border: 1px solid rgba(102, 153, 255, 0.28);
            }
            .top {
              padding: 24px 28px 18px 28px;
              border-bottom: 1px solid rgba(255,255,255,0.08);
              background: radial-gradient(120% 140% at 85% -20%, rgba(70,130,255,0.45) 0%, rgba(70,130,255,0) 58%);
            }
            .brand { font-size: 12px; letter-spacing: 1.6px; color: #8fb2ff; text-transform: uppercase; margin-bottom: 8px; font-weight: 700; }
            .title { margin: 0; font-size: 26px; line-height: 1.2; color: #ffffff; }
            .body { padding: 24px 28px 28px 28px; color: #d6def0; }
            .body p { margin: 0 0 14px 0; font-size: 15px; line-height: 1.6; }
            .code-box {
              margin: 20px 0 18px 0; padding: 18px 12px;
              border-radius: 12px;
              background: rgba(24,40,74,0.65);
              border: 1px solid rgba(130,172,255,0.32);
              text-align: center;
            }
            .code {
              margin: 0;
              font-size: 40px;
              letter-spacing: 10px;
              font-weight: 700;
              color: #6ea2ff;
            }
            .meta {
              margin-top: 8px;
              font-size: 12px;
              color: #93a6cf;
              letter-spacing: 0.3px;
            }
            .cta {
              display: inline-block;
              margin-top: 6px;
              padding: 10px 16px;
              border-radius: 10px;
              background: rgba(50,120,255,0.18);
              border: 1px solid rgba(109,165,255,0.44);
              color: #dce8ff;
              font-size: 13px;
              font-weight: 700;
              letter-spacing: 0.3px;
              text-decoration: none;
            }
            .foot {
              margin-top: 18px;
              padding-top: 14px;
              border-top: 1px solid rgba(255,255,255,0.08);
              font-size: 12px;
              color: #8698be;
            }
          </style>
        </head>
        <body>
          <div class="wrap">
            <div class="card">
              <div class="top">
                <div class="brand">Riviera Tickets</div>
                <h1 class="title">${title}</h1>
              </div>
              <div class="body">
                <p>${intro}</p>
                <div class="code-box">
                  <p class="code">${code}</p>
                  <div class="meta">This code expires in 10 minutes</div>
                </div>
                <a class="cta">${action}</a>
                <p style="margin-top: 14px;">${ignoreText}</p>
                <div class="foot">
                  Riviera Tickets • IMAX 70mm Experience
                </div>
              </div>
            </div>
          </div>
        </body>
      </html>
    `,
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private getTicketConfirmationTemplate(details: any): string {
    const safeMovie = details.movieTitle || 'Your Tickets'
    const safeCinema = details.cinemaName || 'Riviera'
    const safeDate = details.date || 'TBD'
    const safeTime = details.time || 'TBD'
    const safeSeats = Array.isArray(details.seats) && details.seats.length
      ? details.seats.join(', ')
      : '-'
    const safeTotal = typeof details.totalAmount === 'number'
      ? details.totalAmount.toLocaleString()
      : '0.00'

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
              <h2>${safeMovie}</h2>
              <p><strong>Order ID:</strong> ${details.orderId}</p>
              <p><strong>Cinema:</strong> ${safeCinema}</p>
              <p><strong>Date:</strong> ${safeDate}</p>
              <p><strong>Time:</strong> ${safeTime}</p>
              <p><strong>Seats:</strong> ${safeSeats}</p>
              <p><strong>Total:</strong> $${safeTotal}</p>
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
