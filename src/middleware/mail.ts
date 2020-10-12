import nodemailer from 'nodemailer';
import ejs from 'ejs';

export class Mailer {
  static fromEmail = 'donotreply@zuoyoubycurios.com';

  static transport = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASSWORD
    }
  } as any);

  static sendMail(toEmail: string, subject: string, template: string, data = {}) {
    return ejs.renderFile(__dirname + '/../../src/views/emails/' + template, data)
      .then((html: string) => {
        const message = {
          from: this.fromEmail,
          to: toEmail,
          subject,
          html,
        };
        return this.transport.sendMail(message);
      }).catch(console.error);
  }
}
