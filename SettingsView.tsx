import { useState, useEffect } from 'react';
import { Smartphone, Bell, RefreshCw } from 'lucide-react';
import { ProviderVault } from './ProviderVault';
import { ProjectAttacher } from './ProjectAttacher';
import { apiFetch, getApiBase, setApiBase, getPairingToken, setPairingToken } from '../lib/api';

export function SettingsView({
  providers,
  oversight,
  projects,
  mobileInfo,
  alerts,
  onRefresh,
}: any) {
  const [remoteUrl, setRemoteUrl] = useState(getApiBase());
  const [tokenInput, setTokenInput] = useState(getPairingToken());
  const [alertForm, setAlertForm] = useState(alerts || {});
  const [msg, setMsg] = useState('');

  useEffect(() => {
    if (alerts) setAlertForm(alerts);
  }, [alerts]);

  function saveMobileConnection() {
    setApiBase(remoteUrl);
    setPairingToken(tokenInput);
    setMsg('Remote mobile server connection updated. Reloading...');
    setTimeout(() => window.location.reload(), 600);
  }

  async function saveAlerts() {
    await apiFetch('/api/alerts', { method: 'POST', body: JSON.stringify(alertForm) });
    setMsg('Alert webhooks saved.');
    onRefresh();
  }

  async function testAlert() {
    await apiFetch('/api/alerts/test', { method: 'POST' });
    setMsg('Test notification dispatched!');
  }

  async function regeneratePairing() {
    await apiFetch('/api/mobile/auth', { method: 'POST', body: JSON.stringify({ regenerate: true }) });
    onRefresh();
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-6 md:grid-cols-2">
        {providers && <ProviderVault status={providers} onRefresh={onRefresh} />}
        {oversight && (
          <ProjectAttacher activePath={oversight.projectPath} projects={projects} onRefresh={onRefresh} />
        )}
      </div>

      {/* Mobile Connect & PWA Panel */}
      <section className="rounded-2xl border border-[var(--border-hairline)] bg-[var(--bg-card)] p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-semibold tracking-[0.18em] uppercase text-[var(--accent-brown)]">
            <Smartphone size={14} /> Mobile Access & Remote Pairing (Android / iOS / PWA)
          </div>
          <button onClick={regeneratePairing} className="flex items-center gap-1 text-[11px] text-[var(--accent-brown)]">
            <RefreshCw size={12} /> New Token
          </button>
        </div>

        {mobileInfo && (
          <div className="grid gap-3 rounded-xl bg-[var(--bg-subtle)] p-4 text-xs md:grid-cols-2">
            <div>
              <p className="font-semibold">Open on Phone Browser (Same Wi-Fi):</p>
              <p className="mt-1 font-mono text-[11px] text-[var(--accent-brown)]">
                {mobileInfo.mobileWebUrls?.[0] || 'Run npm run dev:mobile to expose LAN URL'}
              </p>
              <p className="mt-1 text-[10px] opacity-75">Then tap "Add to Home Screen" to install as an App.</p>
            </div>
            <div>
              <p className="font-semibold">Mobile Pairing Token:</p>
              <p className="mt-1 font-mono text-base font-bold tracking-widest">{mobileInfo.pairingToken}</p>
            </div>
          </div>
        )}

        <div className="grid gap-2 md:grid-cols-3">
          <input
            value={remoteUrl}
            onChange={(e) => setRemoteUrl(e.target.value)}
            placeholder="Server URL (e.g. http://192.168.1.10:4747)"
            className="rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-matte)] px-3.5 py-2 font-mono text-xs outline-none"
          />
          <input
            value={tokenInput}
            onChange={(e) => setTokenInput(e.target.value)}
            placeholder="Pairing Token (optional on LAN)"
            className="rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-matte)] px-3.5 py-2 font-mono text-xs outline-none"
          />
          <button
            onClick={saveMobileConnection}
            className="rounded-xl bg-[var(--ink-black)] px-4 py-2 text-xs font-semibold uppercase text-[var(--bg-matte)]"
          >
            Connect Phone to Server
          </button>
        </div>
      </section>

      {/* Telegram & Discord Alerts */}
      <section className="rounded-2xl border border-[var(--border-hairline)] bg-[var(--bg-card)] p-5 space-y-3">
        <div className="flex items-center gap-2 text-xs font-semibold tracking-[0.18em] uppercase text-[var(--accent-brown)]">
          <Bell size={14} /> Instant Alerts (Telegram / Discord / Webhook)
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <input
            value={alertForm.telegramBotToken || ''}
            onChange={(e) => setAlertForm({ ...alertForm, telegramBotToken: e.target.value })}
            placeholder="Telegram Bot Token"
            className="rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-matte)] px-3.5 py-2 font-mono text-xs"
          />
          <input
            value={alertForm.telegramChatId || ''}
            onChange={(e) => setAlertForm({ ...alertForm, telegramChatId: e.target.value })}
            placeholder="Telegram Chat ID"
            className="rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-matte)] px-3.5 py-2 font-mono text-xs"
          />
          <input
            value={alertForm.discordWebhookUrl || ''}
            onChange={(e) => setAlertForm({ ...alertForm, discordWebhookUrl: e.target.value })}
            placeholder="Discord Webhook URL"
            className="rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-matte)] px-3.5 py-2 font-mono text-xs"
          />
          <input
            value={alertForm.customWebhookUrl || ''}
            onChange={(e) => setAlertForm({ ...alertForm, customWebhookUrl: e.target.value })}
            placeholder="Custom Webhook URL"
            className="rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-matte)] px-3.5 py-2 font-mono text-xs"
          />
        </div>
        <div className="flex gap-2">
          <button
            onClick={saveAlerts}
            className="rounded-xl bg-[var(--accent-brown)] px-4 py-2 text-xs font-semibold uppercase text-white"
          >
            Save Alerts
          </button>
          <button
            onClick={testAlert}
            className="rounded-xl border border-[var(--border-hairline)] px-4 py-2 text-xs font-semibold uppercase"
          >
            Send Test Alert
          </button>
        </div>
        {msg && <p className="text-xs text-[var(--accent-brown)]">{msg}</p>}
      </section>
    </div>
  );
}
