import { AlertConfig } from '../storage/store.js';
import { AuditRun } from './oversight.js';

export class AlertNotifier {
  async sendTest(config: AlertConfig) {
    const msg = '🦌 GHAZAL v2.0 Test Alert — Notifications are connected and operational.';
    await this.dispatch(config, msg);
  }

  async notifyAudit(config: AlertConfig, run: AuditRun) {
    const matched = run.findings.filter((f) => config.notifyOnSeverity.includes(f.severity));
    if (!config.notifyOnScheduleComplete && matched.length === 0) return;

    const topLines = matched
      .slice(0, 5)
      .map((f) => `• [${f.severity.toUpperCase()}] ${f.title} (${f.file || 'project'})`)
      .join('\n');

    const text = [
      `🦌 GHAZAL Audit Complete`,
      `Project: ${run.projectPath}`,
      `Health Score: ${run.healthScore}/100 | Provider: ${run.provider}`,
      `Findings: ${run.findings.length} total (${matched.length} flagged)`,
      topLines ? `\n${topLines}` : '',
    ].join('\n');

    await this.dispatch(config, text);
  }

  private async dispatch(config: AlertConfig, text: string) {
    const tasks: Promise<unknown>[] = [];

    if (config.telegramBotToken && config.telegramChatId) {
      tasks.push(
        fetch(`https://api.telegram.org/bot${config.telegramBotToken}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: config.telegramChatId,
            text,
          }),
        }).catch(() => {})
      );
    }

    if (config.discordWebhookUrl) {
      tasks.push(
        fetch(config.discordWebhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content: text }),
        }).catch(() => {})
      );
    }

    if (config.customWebhookUrl) {
      tasks.push(
        fetch(config.customWebhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ source: 'ghazal-v2', message: text, timestamp: new Date().toISOString() }),
        }).catch(() => {})
      );
    }

    await Promise.all(tasks);
  }
}
