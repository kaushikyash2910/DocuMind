import { db } from "@/lib/prisma";

export default async function TracesPage() {
  const traces = await db.agentTrace.findMany({ orderBy: { createdAt: "desc" }, take: 20 });

  return (
    <div className="max-w-4xl mx-auto px-6 py-16 space-y-6">
      <h1 className="font-[family-name:var(--font-display)] text-3xl font-semibold">Agent traces</h1>
      <p className="text-[#F7F3E9]/60 text-sm">Exactly what the agent searched for, and why, on its last 20 answers.</p>
      <div className="space-y-4">
        {traces.map((trace: any) => (
          <div key={trace.id} className="rounded-lg bg-[#EAE0C8] p-5 text-[#241F1A]">
            <p className="font-[family-name:var(--font-display)] font-medium">{trace.question}</p>
            <p className="text-xs text-[#241F1A]/50 font-[family-name:var(--font-mono)] mt-1">
              {trace.steps} step{trace.steps !== 1 ? "s" : ""} · {trace.totalDurationMs}ms total
            </p>
            <div className="mt-3 space-y-2">
              {(trace.toolCalls as any[]).map((call: any, i: number) => (
                <div key={i} className="text-xs font-[family-name:var(--font-mono)] bg-[#241F1A]/5 rounded px-3 py-2">
                  <span className="font-semibold">{call.tool}</span>
                  {call.query && <span> — "{call.query}"</span>}
                  <span className="text-[#241F1A]/50"> → {call.resultCount} result{call.resultCount !== 1 ? "s" : ""}, {call.durationMs}ms</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}