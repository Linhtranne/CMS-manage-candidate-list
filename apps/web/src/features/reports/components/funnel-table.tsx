import Link from 'next/link';
import type { Route } from 'next';
import type { components } from '@cms/contracts';

type FunnelStage = components['schemas']['ReportFunnelStage'];

export function FunnelTable({ stages }: { stages: FunnelStage[] }) {
  return <section className="rounded-lg border border-border bg-panel p-5"><div><h2 className="font-bold text-text">Phễu tuyển dụng</h2><p className="mt-1 text-sm text-text-muted">Mỗi bước dùng mẫu số riêng; bấm vào số để mở danh sách nguồn.</p></div><div className="mt-4 overflow-x-auto"><table className="w-full min-w-[38rem] text-left text-sm"><thead><tr className="border-b border-border text-xs uppercase tracking-wide text-text-muted"><th className="px-3 py-3">Giai đoạn</th><th className="px-3 py-3">Số lượng</th><th className="px-3 py-3">Tỷ lệ</th><th className="px-3 py-3">Cập nhật</th></tr></thead><tbody>{stages.map((stage) => <tr key={stage.key} className="border-b border-border last:border-0"><td className="px-3 py-3 font-semibold text-text">{stage.label}</td><td className="px-3 py-3"><Link className="font-semibold text-accent underline" href={stage.drilldownHref as Route}>{stage.numerator}/{stage.denominator}</Link></td><td className="px-3 py-3 text-text-muted">{Math.round(stage.rate * 100)}%</td><td className="px-3 py-3 text-text-muted">Theo bộ lọc hiện tại</td></tr>)}</tbody></table></div></section>;
}
