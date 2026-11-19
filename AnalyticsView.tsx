import { BarChart3, Cpu, ShieldAlert, TrendingUp } from 'lucide-react';

export function AnalyticsView({ analytics }: { analytics: any }) {
  if (!analytics) return null;
  const { summary, severityCounts, agentCounts, healthTrend, providerStats } = analytics;
  const maxSeverity = Math.max(1, ...Object.values(severityCounts).map(Number));

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          { label: 'Avg Health', val: `${summary.avgHealthScore}/100` },
          { label: 'Total Audits', val: summary.totalAudits },
          { label: 'API Calls', val: summary.totalApiCalls },
          { label: 'Tasks Closed', val: `${summary.completedTasks}/${summary.openTasks + summary.completedTasks}` },
        ].map((card) => (
          <div key={card.label} className="rounded-2xl border border-[var(--border-hairline)] bg-[var(--bg-card)] p-4">
            <p className="text-[11px] uppercase tracking-wider text-[var(--accent-brown-soft)]">{card.label}</p>
            <p className="mt-1 text-2xl font-bold">{card.val}</p>
          </div>
        ))}
      </div>

      {/* Health Score Trend Bar/Sparkline */}
      <section className="rounded-2xl border border-[var(--border-hairline)] bg-[var(--bg-card)] p-5">
        <div className="mb-4 flex items-center gap-2 text-xs font-semibold tracking-[0.18em] uppercase text-[var(--accent-brown)]">
          <TrendingUp size={14} /> Health Score History
        </div>
        {healthTrend.length === 0 ? (
          <p className="text-xs text-[var(--accent-brown-soft)]">Run audits to generate trend analytics.</p>
        ) : (
          <div className="flex h-40 items-end gap-2 pt-4">
            {healthTrend.map((pt: any) => (
              <div key={pt.runId} className="flex flex-1 flex-col items-center gap-1">
                <span className="text-[10px] font-semibold">{pt.score}</span>
                <div
                  className="w-full max-w-[36px] rounded-t-lg bg-[var(--accent-brown)] transition-all"
                  style={{ height: `${Math.max(8, pt.score)}%` }}
                />
                <span className="text-[9px] text-[var(--accent-brown-soft)]">
                  {new Date(pt.date).toLocaleDateString(undefined, { month: 'numeric', day: 'numeric' })}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Severity Breakdown */}
        <section className="rounded-2xl border border-[var(--border-hairline)] bg-[var(--bg-card)] p-5">
          <div className="mb-4 flex items-center gap-2 text-xs font-semibold tracking-[0.18em] uppercase text-[var(--accent-brown)]">
            <ShieldAlert size={14} /> Findings by Severity
          </div>
          <div className="space-y-3">
            {(['critical', 'high', 'medium', 'low'] as const).map((sev) => {
              const count = severityCounts[sev] || 0;
              return (
                <div key={sev}>
                  <div className="mb-1 flex justify-between text-xs uppercase">
                    <span>{sev}</span>
                    <span className="font-semibold">{count}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-[var(--bg-subtle)]">
                    <div
                      className="h-full rounded-full bg-[var(--ink-black)]"
                      style={{ width: `${(count / maxSeverity) * 100}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Provider Latency & Tokens */}
        <section className="rounded-2xl border border-[var(--border-hairline)] bg-[var(--bg-card)] p-5">
          <div className="mb-4 flex items-center gap-2 text-xs font-semibold tracking-[0.18em] uppercase text-[var(--accent-brown)]">
            <Cpu size={14} /> Provider Telemetry
          </div>
          <div className="space-y-2.5 text-xs">
            {Object.keys(providerStats).length === 0 && (
              <p className="text-[var(--accent-brown-soft)]">No API calls logged yet.</p>
            )}
            {Object.entries(providerStats).map(([prov, st]: any) => (
              <div key={prov} className="flex items-center justify-between rounded-xl bg-[var(--bg-subtle)] px-3.5 py-2.5">
                <span className="font-semibold uppercase">{prov}</span>
                <span className="font-mono text-[11px] text-[var(--accent-brown-soft)]">
                  {st.calls} calls • {st.avgLatencyMs}ms avg • ~{st.approxTokens} tok
                </span>
              </div>
            ))}
          </div>

          <div className="mt-4 border-t border-[var(--border-hairline)] pt-3">
            <div className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase text-[var(--accent-brown)]">
              <BarChart3 size={12} /> Findings per Agent
            </div>
            <div className="flex flex-wrap gap-1.5">
              {Object.entries(agentCounts).map(([ag, cnt]: any) => (
                <span key={ag} className="rounded-full bg-[var(--bg-matte)] px-2.5 py-1 text-[10px] font-mono">
                  {ag}: {cnt}
                </span>
              ))}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
