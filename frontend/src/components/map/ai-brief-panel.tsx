import type { ComponentType, ReactNode } from "react";
import { useState } from "react";
import { useBriefs } from "@/hooks/use-briefs";
import { cn } from "@/lib/utils";
import {
  AlertTriangle,
  ChevronDown,
  Clock,
  Cpu,
  Flame,
  Globe2,
  MapPin,
  Radio,
  Shield,
  ShieldAlert,
  ShieldCheck,
  ShieldQuestion,
  Sparkles,
  Zap,
} from "lucide-react";

function safeList(value: unknown): string[] {
  if (Array.isArray(value)) return value.filter((v): v is string => typeof v === "string");
  return [];
}

function safeStr(value: unknown): string {
  if (typeof value === "string") return value;
  return "";
}

function safeDict(value: unknown): Record<string, string> {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return Object.fromEntries(
      Object.entries(value).filter(
        (entry): entry is [string, string] =>
          typeof entry[0] === "string" && typeof entry[1] === "string"
      )
    );
  }
  return {};
}

interface AccordionItemProps {
  title: string;
  children: ReactNode;
  defaultOpen?: boolean;
  icon?: ComponentType<{ className?: string }>;
}

const AccordionItem = ({ title, children, defaultOpen = false, icon: Icon }: AccordionItemProps) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="rounded-xl glass-card overflow-hidden transition-all duration-200 hover:border-white/15">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full p-3 flex items-center justify-between text-left hover:bg-white/5 transition-colors"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          {Icon && (
            <div className="flex items-center justify-center w-6 h-6 rounded-lg glass-button shrink-0">
              <Icon className="w-3.5 h-3.5 text-slate-400" />
            </div>
          )}
          <span className="text-xs font-medium text-slate-200 line-clamp-2">
            {title}
          </span>
        </div>
        <ChevronDown
          className={cn("w-4 h-4 text-slate-500 shrink-0 transition-transform duration-200", isOpen && "rotate-180")}
        />
      </button>
      <div
        className={cn(
          "grid transition-all duration-200",
          isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        )}
      >
        <div className="overflow-hidden">
          <div className="px-3 pb-3 pt-0 border-t border-white/5">
            <p className="text-xs text-slate-400 leading-relaxed pt-2">
              {children}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export function AiBriefPanel() {
  const { data, isLoading, error } = useBriefs();
  const displayError = error;
  const [isExpanded, setIsExpanded] = useState(false);

  const worldBrief = data?.world_brief;
  const techBrief = data?.tech_brief;
  const generatedAt = data?.generated_at;

  const keyDevelopments = worldBrief ? safeList(worldBrief.key_developments) : [];
  const regionalHighlights = worldBrief ? safeDict(worldBrief.regional_highlights) : {};
  const emergingTrends = worldBrief ? safeStr(worldBrief.emerging_trends) : "";
  const majorDevelopments = techBrief ? safeList(techBrief.major_developments) : [];
  const technologySignals = techBrief ? safeList(techBrief.technology_signals) : [];
  const riskOutlookStr = techBrief ? safeStr(techBrief.risk_outlook) : "";

  const parsedRiskOutlook = riskOutlookStr
    .split(";")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((item) => {
      const match = item.match(/^([^:]+):\s*(.*)$/);
      if (match) {
        return { level: match[1].trim(), text: match[2].trim() };
      }
      return { level: "Context", text: item };
    });

  const getRiskColor = (level: string) => {
    const l = level.toLowerCase();
    if (l.includes("high") || l.includes("critical")) return "text-rose-600 bg-rose-50 border-rose-200 dark:text-rose-400 dark:bg-rose-500/10 dark:border-rose-500/20";
    if (l.includes("positive") || l.includes("low")) return "text-emerald-600 bg-emerald-50 border-emerald-200 dark:text-emerald-400 dark:bg-emerald-500/10 dark:border-emerald-500/20";
    if (l.includes("uncertain") || l.includes("medium")) return "text-amber-600 bg-amber-50 border-amber-200 dark:text-amber-400 dark:bg-amber-500/10 dark:border-amber-500/20";
    return "text-slate-600 bg-slate-50 border-slate-200 dark:text-slate-400 dark:bg-slate-500/10 dark:border-slate-500/20";
  };
  
  const getRiskIcon = (level: string) => {
     const l = level.toLowerCase();
    if (l.includes("high") || l.includes("critical")) return ShieldAlert;
    if (l.includes("positive") || l.includes("low")) return ShieldCheck;
    if (l.includes("uncertain") || l.includes("medium")) return AlertTriangle;
    return Shield;
  }

  const hasWorldContent =
    keyDevelopments.length > 0 || Object.keys(regionalHighlights).length > 0 || emergingTrends;
  const hasTechContent =
    majorDevelopments.length > 0 || technologySignals.length > 0 || riskOutlookStr;

  const formattedDate = generatedAt
    ? new Date(generatedAt).toLocaleString(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
      })
    : null;

  return (
    <aside
      className={cn(
        "flex flex-col border-t lg:border-t-0 lg:border-l border-white/5 overflow-hidden shrink-0 transition-all duration-300 h-full",
        "bg-[#0B101A]/80 backdrop-blur-xl",
        isExpanded ? "w-full lg:w-[480px]" : "w-full lg:w-[340px]"
      )}
    >
      <div className="sticky top-0 z-10 p-4 border-b border-white/5 flex flex-col gap-2 glass-dark">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl glass-button">
            <Sparkles className="w-4.5 h-4.5 text-indigo-400" />
          </div>
          <div className="flex-1">
            <h2 className="font-bold text-[15px] tracking-tight text-white">
              AI Brief
            </h2>
            {formattedDate && (
              <div className="flex items-center gap-1.5 mt-0.5 text-[10px] text-slate-500 font-medium tracking-wide">
                <Clock className="w-3 h-3 text-slate-500" />
                <span>{formattedDate}</span>
              </div>
            )}
          </div>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-2.5 rounded-xl glass-button transition-all text-slate-400 hover:text-white"
            title={isExpanded ? "Collapse" : "Expand"}
          >
            <ChevronDown
              className={cn("w-4 h-4 transition-transform duration-200", isExpanded ? "rotate-90" : "-rotate-90")}
            />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 pb-8 space-y-6 custom-scrollbar">
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <div className="h-8 w-8 rounded-full border-2 border-slate-600 border-t-indigo-500 animate-spin" />
            <p className="text-xs font-medium text-slate-500">
              Loading briefs…
            </p>
          </div>
        )}

        {displayError && !isLoading && (
          <div className="rounded-xl glass-card border-rose-500/20 bg-rose-500/10 p-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
              <p className="text-xs font-semibold text-rose-400">
                Failed to load
              </p>
            </div>
            <p className="text-xs text-rose-400/80 leading-relaxed">
              {displayError instanceof Error ? displayError.message : "Unable to load briefs."}
            </p>
          </div>
        )}

        {!isLoading && !displayError && !hasWorldContent && !hasTechContent && (
          <div className="flex flex-col items-center justify-center py-16 text-center px-4">
            <div className="w-12 h-12 rounded-xl glass-button flex items-center justify-center mb-3">
              <ShieldQuestion className="w-6 h-6 text-slate-500" />
            </div>
            <p className="text-sm font-medium text-slate-400">
              No briefs available
            </p>
            <p className="text-xs text-slate-500 mt-1">
              Data will appear once analysis is complete.
            </p>
          </div>
        )}

        {!isLoading && !displayError && hasWorldContent && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Globe2 className="w-4 h-4 text-indigo-400 shrink-0" />
              <h3 className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">
                World Brief
              </h3>
              <div className="h-px flex-1 bg-white/5" />
            </div>

            {emergingTrends && (
              <div className="rounded-xl p-4 glass-card border-indigo-500/20 bg-indigo-500/10">
                <div className="flex items-center gap-2 mb-2">
                  <Flame className="w-3.5 h-3.5 text-indigo-400" />
                  <p className="text-[10px] font-semibold text-indigo-400 uppercase tracking-wider">
                    Emerging Trends
                  </p>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  {emergingTrends}
                </p>
              </div>
            )}

            {keyDevelopments.length > 0 && (
              <div className="space-y-2">
                <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                  Key Developments
                </p>
                <div className={cn(
                  "grid gap-2 transition-all duration-500",
                  isExpanded ? "grid-cols-2" : "grid-cols-1"
                )}>
                  {keyDevelopments.map((item, i) => {
                     const titleSnippet = item.split('.')[0] || item;
                     const displayTitle = titleSnippet.length > 70 ? titleSnippet.substring(0, 67) + '...' : titleSnippet;

                     return (
                      <AccordionItem
                        key={i}
                        title={displayTitle}
                        defaultOpen={i === 0 && !isExpanded}
                        icon={Radio}
                      >
                        {item}
                      </AccordionItem>
                    )
                  })}
                </div>
              </div>
            )}

            {Object.keys(regionalHighlights).length > 0 && (
              <div className="space-y-2 pt-2">
                <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                  Regional Highlights
                </p>
                <div className={cn(
                  "grid gap-2 transition-all duration-500",
                  isExpanded ? "grid-cols-2" : "grid-cols-1"
                )}>
                  {Object.entries(regionalHighlights).map(([region, text]) => (
                    <AccordionItem key={region} title={region} icon={MapPin}>
                      {text}
                    </AccordionItem>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {!isLoading && !displayError && hasTechContent && (
          <div className="space-y-4 pt-2">
            <div className="flex items-center gap-2">
              <Cpu className="w-4 h-4 text-violet-400 shrink-0" />
              <h3 className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">
                Tech Brief
              </h3>
              <div className="h-px flex-1 bg-white/5" />
            </div>

            {parsedRiskOutlook.length > 0 && (
              <div className="space-y-2">
                <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                  Risk Outlook
                </p>
                <div className={cn("grid gap-2", isExpanded ? "grid-cols-2" : "grid-cols-1")}>
                  {parsedRiskOutlook.map((item, i) => {
                    const RiskIcon = getRiskIcon(item.level);
                    return (
                      <div
                        key={i}
                        className={cn(
                          "flex gap-3 p-3 rounded-xl glass-card",
                          getRiskColor(item.level)
                        )}
                      >
                        <RiskIcon className="w-4 h-4 shrink-0 mt-0.5" />
                        <div className="min-w-0">
                          <p className="text-[10px] font-semibold uppercase tracking-wider mb-0.5">
                            {item.level}
                          </p>
                          <p className="text-xs leading-relaxed opacity-90">{item.text}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {majorDevelopments.length > 0 && (
              <div className="space-y-2 pt-2">
                <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                  Major Developments
                </p>
                <div className="space-y-2">
                  {majorDevelopments.map((item, i) => (
                    <div
                      key={i}
                      className="flex gap-2 pl-3 border-l-2 border-violet-500/40"
                    >
                      <p className="text-xs text-slate-300 leading-relaxed">
                        {item}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {technologySignals.length > 0 && (
              <div className="space-y-2 pt-2">
                <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                  Technology Signals
                </p>
                <div className={cn("grid gap-2", isExpanded ? "grid-cols-2" : "grid-cols-1")}>
                  {technologySignals.map((item, i) => (
                    <div
                      key={i}
                      className="flex items-start gap-2 p-3 rounded-xl glass-card"
                    >
                      <Zap className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                      <p className="text-xs text-slate-300 leading-relaxed">
                        {item}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </aside>
  );
}
