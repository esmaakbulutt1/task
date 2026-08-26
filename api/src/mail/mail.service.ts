import { Injectable } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private readonly transporter: nodemailer.Transporter;

  constructor() {
    const port = Number(this.getRequiredEnv('SMTP_PORT'));

    this.transporter = nodemailer.createTransport({
      host: this.getRequiredEnv('SMTP_HOST'),
      port,
      secure: this.getRequiredEnv('SMTP_SECURE') === 'true',
      auth: {
        user: this.getRequiredEnv('SMTP_USER'),
        pass: this.getRequiredEnv('SMTP_PASS'),
      },
    });
  }

  async sendPasswordReset(email: string, token: string): Promise<void> {
    const resetUrl = new URL('/reset-password', this.getRequiredEnv('WEB_URL'));

    resetUrl.searchParams.set('token', token);

    await this.transporter.sendMail({
      from: this.getRequiredEnv('SMTP_FROM'),
      to: email,
      subject: 'Şifre sıfırlama',
      text: `Şifrenizi sıfırlamak için bağlantıyı açın: ${resetUrl.toString()}`,
      html: `
        <p>Şifrenizi sıfırlamak için bağlantıya tıklayın:</p>
        <p><a href="${resetUrl.toString()}">Şifremi sıfırla</a></p>
        <p>Bu bağlantı 15 dakika geçerlidir.</p>
      `,
    });
  }

  async sendWorkspaceMemberAdded(
    email: string,
    workspaceName: string,
  ): Promise<void> {
    const safeWorkspaceName = this.escapeHtml(workspaceName);

    await this.transporter.sendMail({
      from: this.getRequiredEnv('SMTP_FROM'),
      to: email,
      subject: 'Çalışma alanına eklendiniz',
      text: `"${workspaceName}" çalışma alanına üye olarak eklendiniz.`,
      html: `<p><strong>${safeWorkspaceName}</strong> çalışma alanına üye olarak eklendiniz.</p>`,
    });
  }

  async sendTaskAssigned(
    email: string,
    workspaceName: string,
    projectName: string,
    taskTitle: string,
  ): Promise<void> {
    const safeWorkspaceName = this.escapeHtml(workspaceName);
    const safeProjectName = this.escapeHtml(projectName);
    const safeTaskTitle = this.escapeHtml(taskTitle);

    await this.transporter.sendMail({
      from: this.getRequiredEnv('SMTP_FROM'),
      to: email,
      subject: 'Yeni görev atandı',
      text: `"${workspaceName}" çalışma alanındaki "${projectName}" projesinde "${taskTitle}" görevi size atandı.`,
      html: `
        <p><strong>${safeWorkspaceName}</strong> çalışma alanındaki</p>
        <p><strong>${safeProjectName}</strong> projesinde</p>
        <p><strong>${safeTaskTitle}</strong> görevi size atandı.</p>
      `,
    });
  }

  async sendTaskDeadlineReminder(
    email: string,
    taskTitle: string,
    dueDate: string,
    overdue: boolean,
  ): Promise<void> {
    const safeTaskTitle = this.escapeHtml(taskTitle);
    const formattedDueDate = this.formatDueDate(dueDate);
    const subject = overdue
      ? 'Görevinizin son tarihi geçti'
      : 'Görevinizin son tarihi yaklaşıyor';
    const statusText = overdue ? 'son tarihi geçti' : 'son tarihi yaklaşıyor';

    await this.transporter.sendMail({
      from: this.getRequiredEnv('SMTP_FROM'),
      to: email,
      subject,
      text: `"${taskTitle}" görevinizin ${statusText}. Son tarih: ${formattedDueDate}.`,
      html: `
        <p><strong>${safeTaskTitle}</strong> görevinizin ${statusText}.</p>
        <p>Son tarih: ${formattedDueDate}</p>
      `,
    });
  }

  private formatDueDate(value: string): string {
    const dueDate = new Date(value);

    if (Number.isNaN(dueDate.getTime())) {
      throw new Error('Invalid task due date in email job.');
    }

    return new Intl.DateTimeFormat('tr-TR', {
      dateStyle: 'long',
      timeStyle: 'short',
      timeZone: 'Europe/Istanbul',
    }).format(dueDate);
  }

  private escapeHtml(value: string): string {
    return value
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }

  private getRequiredEnv(name: string): string {
    const value = process.env[name];

    if (!value) {
      throw new Error(`Eksik ortam değişkeni: ${name}`);
    }

    return value;
  }
}
