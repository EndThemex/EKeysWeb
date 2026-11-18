import type { AiStreamStats } from "../../hooks/useAiStream";
import { useI18n } from "../../i18n/useI18n.tsx";

function formatBandwidth(bytesPerSec: number | null): string {
  if (bytesPerSec === null) return "—";
  if (bytesPerSec >= 1024 * 1024) {
    return `${(bytesPerSec / (1024 * 1024)).toFixed(2)} MB/s`;
  }
  return `${(bytesPerSec / 1024).toFixed(1)} KB/s`;
}

/** 推流统计：数据直出固件 ai_ctl，不做客户端估算。 */
export function StreamStats({ stats }: { stats: AiStreamStats }) {
  const { t } = useI18n();

  const rows: { label: string; value: string }[] = [
    {
      label: t("ai.stats.fps"),
      value: stats.fps === null ? "—" : stats.fps.toFixed(1),
    },
    {
      label: t("ai.stats.bandwidth"),
      value: formatBandwidth(stats.bytesPerSec),
    },
    {
      label: t("ai.stats.inflight"),
      value: `${stats.inflight} / 2`,
    },
    {
      label: t("ai.stats.sent"),
      value: String(stats.framesSent),
    },
    {
      label: t("ai.stats.dropped"),
      value: stats.dropped === null ? "—" : String(stats.dropped),
    },
    {
      label: t("ai.stats.slots"),
      value: stats.freeSlots === null ? "—" : String(stats.freeSlots),
    },
  ];

  return (
    <section className="ai-card" aria-label={t("ai.stats.title")}>
      <div className="ai-card__head">
        <span className="eyebrow">{t("ai.stats.title")}</span>
      </div>
      <dl className="ai-stats">
        {rows.map((row) => (
          <div className="ai-stats__row" key={row.label}>
            <dt>{row.label}</dt>
            <dd className="mono">{row.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
