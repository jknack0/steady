"use client";

import { useState, useEffect, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { Badge } from "@/components/ui/badge";
import { createPortal } from "react-dom";
import { RNPartContentRenderer } from "@/components/mobile-preview/RNPartRenderers";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Lock,
  Play,
  Loader2,
  FileText,
  Video,
  Layers,
  BookOpen,
  CheckSquare,
  Link as LinkIcon,
  Minus,
  ClipboardList,
  FileQuestion,
  FormInput,
  Target,
  Sparkles,
} from "lucide-react";

// ── Types ──────────────────────────────────────────

interface PreviewPart {
  id: string;
  type: string;
  title: string;
  isRequired: boolean;
  content: any;
  sortOrder: number;
}

interface PreviewModule {
  id: string;
  title: string;
  subtitle: string | null;
  summary: string | null;
  estimatedMinutes: number | null;
  sortOrder: number;
  parts: PreviewPart[];
}

interface PreviewProgram {
  id: string;
  title: string;
  description: string | null;
  cadence: string;
  modules: PreviewModule[];
}

// ── Constants ──────────────────────────────────────

const PART_ICONS: Record<string, React.ElementType> = {
  TEXT: FileText, VIDEO: Video, STRATEGY_CARDS: Layers, JOURNAL_PROMPT: BookOpen,
  CHECKLIST: CheckSquare, RESOURCE_LINK: LinkIcon, DIVIDER: Minus, HOMEWORK: ClipboardList,
  ASSESSMENT: FileQuestion, INTAKE_FORM: FormInput, SMART_GOALS: Target, STYLED_CONTENT: Sparkles,
  PDF: FileText,
};

const PART_LABELS: Record<string, string> = {
  TEXT: "Reading", VIDEO: "Video", STRATEGY_CARDS: "Strategy Cards", JOURNAL_PROMPT: "Journal",
  CHECKLIST: "Checklist", RESOURCE_LINK: "Resource", DIVIDER: "Section Break", HOMEWORK: "Homework",
  ASSESSMENT: "Assessment", INTAKE_FORM: "Intake Form", SMART_GOALS: "SMART Goals", STYLED_CONTENT: "Content",
  PDF: "PDF Document",
};

// ── Helpers ────────────────────────────────────────

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").trim();
}

function getPartPreview(part: PreviewPart): string {
  const c = part.content;
  switch (part.type) {
    case "TEXT": return stripHtml(c.body || "").slice(0, 120) || "No content yet";
    case "STYLED_CONTENT": return stripHtml(c.styledHtml || c.rawContent || "").slice(0, 120) || "No content yet";
    case "VIDEO": return c.url || "No video URL set";
    case "STRATEGY_CARDS": return `${c.cards?.length || 0} cards${c.deckName ? ` — ${c.deckName}` : ""}`;
    case "JOURNAL_PROMPT": return c.prompts?.filter((p: string) => p).join(", ").slice(0, 100) || "No prompts set";
    case "CHECKLIST": return `${c.items?.length || 0} items`;
    case "RESOURCE_LINK": return c.description || c.url || "No link set";
    case "DIVIDER": return c.label || "—";
    case "HOMEWORK": return `${c.items?.length || 0} homework items`;
    case "ASSESSMENT": return `${c.questions?.length || 0} questions`;
    case "INTAKE_FORM": return `${c.fields?.length || 0} fields`;
    case "SMART_GOALS": return `Up to ${c.maxGoals || 3} goals`;
    case "PDF": return c.fileName || "PDF Document";
    default: return "";
  }
}



// ── Phone Screen Components ────────────────────────

function PhoneModuleCard({ module, index, onOpenPart }: { module: PreviewModule; index: number; onOpenPart: (part: PreviewPart) => void }) {
  const [expanded, setExpanded] = useState(index === 0);
  const isCurrent = index === 0;
  const isLocked = index > 1;
  const totalParts = module.parts.length;

  return (
    <div className={`rounded-2xl bg-white shadow-sm mb-3 overflow-hidden ${isCurrent ? "border-[1.5px] border-[#89B4C8]" : "border border-[#F0EDE8]"} ${isLocked ? "opacity-40" : ""}`}>
      <button className="flex w-full items-center gap-3 p-4" onClick={() => !isLocked && setExpanded(!expanded)} disabled={isLocked}>
        <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${isCurrent ? "bg-[#E3EDED]" : "bg-[#F0EDE8]"}`}>
          {isLocked ? <Lock className="h-4 w-4 text-[#8A8A8A]" /> : <Play className="h-4 w-4 text-[#5B8A8A] ml-0.5" />}
        </div>
        <div className="flex-1 text-left">
          <p className="text-sm font-bold text-[#2D2D2D]">{module.title}</p>
          <div className="mt-1 flex items-center gap-2">
            <div className="h-1.5 w-24 rounded-full bg-[#F0EDE8]"><div className="h-full rounded-full bg-[#5B8A8A]" style={{ width: "0%" }} /></div>
            <span className="text-[11px] text-[#8A8A8A]">0/{totalParts}</span>
          </div>
        </div>
        {isCurrent && <Badge className="bg-[#E3EDED] text-[#5B8A8A] text-[11px] font-semibold border-0 hover:bg-[#E3EDED]">Current</Badge>}
        {!isLocked && (expanded ? <ChevronDown className="h-4 w-4 text-[#8A8A8A]" /> : <ChevronRight className="h-4 w-4 text-[#8A8A8A]" />)}
      </button>
      {expanded && !isLocked && (
        <div className="border-t border-[#F0EDE8]">
          {module.parts.map((part) => (
            <PartPreviewRow key={part.id} part={part} onOpen={() => onOpenPart(part)} />
          ))}
        </div>
      )}
    </div>
  );
}

function PartPreviewRow({ part, onOpen }: { part: PreviewPart; onOpen: () => void }) {
  const Icon = PART_ICONS[part.type] || FileText;
  if (part.type === "DIVIDER") return <div className="px-4 py-2"><RNPartContentRenderer part={part} /></div>;

  return (
    <div className="border-b border-[#F0EDE8] last:border-b-0">
      <button className="flex w-full items-center gap-3 px-4 py-3 hover:bg-[#F7F5F2]/50 transition-colors" onClick={onOpen}>
        <div className="h-5 w-5 shrink-0 rounded-md border-2 border-[#D4D0CB]" />
        <Icon className="h-4 w-4 shrink-0 text-[#8A8A8A]" />
        <div className="flex-1 text-left">
          <p className="text-sm font-medium text-[#2D2D2D]">{part.title}</p>
          <p className="text-xs text-[#8A8A8A] truncate mt-0.5">{getPartPreview(part)}</p>
        </div>
        {part.isRequired && <span className="rounded bg-[#F5E6E6] px-1.5 py-0.5 text-[10px] font-medium text-[#D4A0A0]">Required</span>}
        <ChevronRight className="h-3 w-3 text-[#8A8A8A]" />
      </button>
    </div>
  );
}

function PartDetailView({ part, onBack }: { part: PreviewPart; onBack: () => void }) {
  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div className="flex items-center gap-2 bg-white px-4 py-3 border-b border-[#F0EDE8] shrink-0">
        <button onClick={onBack} className="flex items-center gap-1 text-[#5B8A8A]">
          <ChevronLeft className="h-4 w-4" />
          <span className="text-sm font-semibold">Back</span>
        </button>
      </div>
      <div className="bg-white px-4 pt-3 pb-4 shrink-0">
        <h3 className="text-lg font-bold text-[#2D2D2D]">{part.title}</h3>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-[#8A8A8A]">{PART_LABELS[part.type] || part.type}</span>
          {part.isRequired && <span className="text-[10px] font-medium text-[#D4A0A0]">Required</span>}
        </div>
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto bg-white">
        <RNPartContentRenderer part={part} />
      </div>
      <div className="bg-white border-t border-[#F0EDE8] px-4 py-3 shrink-0">
        <div className="w-full rounded-xl bg-[#5B8A8A] py-3 text-center">
          <span className="text-sm font-semibold text-white">Mark as Complete</span>
        </div>
      </div>
    </div>
  );
}

// ── Phone Frame ────────────────────────────────────

const PHONE_W = 430;
const PHONE_H = 932;

function PhoneFrame({ program, initialPartId }: { program: PreviewProgram; initialPartId?: string | null }) {
  const [activePart, setActivePart] = useState<PreviewPart | null>(null);

  useEffect(() => {
    if (initialPartId && program) {
      for (const mod of program.modules) {
        const found = mod.parts.find((p) => p.id === initialPartId);
        if (found) { setActivePart(found); break; }
      }
    }
  }, [initialPartId, program]);

  return (
    <div className="relative" style={{ width: PHONE_W, height: PHONE_H }}>
      {/* Border frame */}
      <div className="absolute inset-0 rounded-[2.5rem] border-[8px] border-[#2D2D2D] shadow-2xl pointer-events-none z-10" />
      {/* Inner content */}
      <div className="absolute inset-[8px] rounded-[calc(2.5rem-8px)] overflow-hidden bg-[#F7F5F2] flex flex-col">
        {/* Status bar */}
        <div className="flex items-center justify-between bg-white px-6 py-2 shrink-0">
          <span className="text-xs font-semibold text-[#2D2D2D]">9:41</span>
          <div className="flex items-center gap-1">
            <div className="h-2.5 w-4 rounded-sm border border-[#2D2D2D]"><div className="h-full w-3/4 rounded-sm bg-[#2D2D2D]" /></div>
          </div>
        </div>

        {activePart ? (
          <PartDetailView part={activePart} onBack={() => setActivePart(null)} />
        ) : (
          <>
            <div className="bg-white px-5 pb-4 pt-2 shrink-0">
              <h2 className="text-lg font-bold text-[#2D2D2D]" style={{ fontFamily: "system-ui" }}>{program.title}</h2>
              {program.description && <p className="text-xs text-[#5A5A5A] mt-1 leading-relaxed">{program.description}</p>}
              <div className="flex items-center gap-1 mt-2">
                <svg className="h-3 w-3 text-[#8A8A8A]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-[11px] text-[#8A8A8A]">
                  {program.cadence === "WEEKLY" ? "Weekly sessions" : program.cadence === "BIWEEKLY" ? "Biweekly sessions" : "Self-paced"}
                </span>
              </div>
            </div>
            <div className="px-4 py-4 flex-1 overflow-y-auto">
              {program.modules.map((module, i) => (
                <PhoneModuleCard key={module.id} module={module} index={i} onOpenPart={setActivePart} />
              ))}
            </div>
          </>
        )}

        <div className="flex justify-center pb-2 pt-1 bg-[#F7F5F2] shrink-0">
          <div className="h-1 w-32 rounded-full bg-[#2D2D2D]/20" />
        </div>
      </div>
    </div>
  );
}

// ── Modal Component ────────────────────────────────

interface PhonePreviewModalProps {
  programId: string;
  partId?: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function ScaledPhone({ program, partId }: { program: PreviewProgram; partId?: string | null }) {
  const containerRef = useCallback((node: HTMLDivElement | null) => {
    if (!node) return;
    const update = () => {
      const vh = window.innerHeight * 0.9;
      const vw = window.innerWidth * 0.9;
      const scaleH = vh / PHONE_H;
      const scaleW = vw / PHONE_W;
      const s = Math.min(scaleH, scaleW);
      node.style.transform = `scale(${s})`;
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  return (
    <div
      ref={containerRef}
      style={{ width: PHONE_W, height: PHONE_H, transformOrigin: "center center" }}
    >
      <PhoneFrame program={program} initialPartId={partId} />
    </div>
  );
}

export function PhonePreviewModal({ programId, partId, open, onOpenChange }: PhonePreviewModalProps) {
  const { data: program, isLoading } = useQuery<PreviewProgram>({
    queryKey: ["programs", programId, "preview"],
    queryFn: () => api.get(`/api/programs/${programId}/preview`),
    enabled: open,
  });

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onOpenChange(false);
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open, onOpenChange]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop — click to close */}
      <div
        className="absolute inset-0 bg-black/80 cursor-pointer"
        onClick={() => onOpenChange(false)}
      />
      {/* Content — cursor:default over the phone */}
      <div className="relative z-10 cursor-default">
        {isLoading || !program ? (
          <Loader2 className="h-8 w-8 animate-spin text-white" />
        ) : (
          <ScaledPhone program={program} partId={partId} />
        )}
      </div>
    </div>,
    document.body
  );
}
