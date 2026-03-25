"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useStyleContent } from "@/hooks/use-style-content";
import { Sparkles, RefreshCw, PenLine, Eye, Code } from "lucide-react";

interface StyledContentEditorProps {
  content: {
    type: "STYLED_CONTENT";
    rawContent: string;
    styledHtml: string;
  };
  onChange: (content: StyledContentEditorProps["content"]) => void;
}

type Tab = "write" | "styled" | "html";

export function StyledContentPartEditor({ content, onChange }: StyledContentEditorProps) {
  const hasRaw = content.rawContent.trim().length > 0;
  const hasStyled = content.styledHtml.trim().length > 0;
  const [activeTab, setActiveTab] = useState<Tab>(hasStyled ? "styled" : "write");
  const styleContent = useStyleContent();
  const editableRef = useRef<HTMLDivElement>(null);
  // Track the last HTML we pushed into the div to avoid re-setting on our own edits
  const lastSetHtml = useRef<string>(content.styledHtml);

  // Sync external changes (e.g. AI restyle) into the contentEditable div
  useEffect(() => {
    if (editableRef.current && content.styledHtml !== lastSetHtml.current) {
      editableRef.current.innerHTML = content.styledHtml;
      lastSetHtml.current = content.styledHtml;
    }
  }, [content.styledHtml]);

  const handleEditableBlur = useCallback(() => {
    if (editableRef.current) {
      const html = editableRef.current.innerHTML;
      lastSetHtml.current = html;
      if (html !== content.styledHtml) {
        onChange({ ...content, styledHtml: html });
      }
    }
  }, [content, onChange]);

  const handleStyle = async () => {
    if (!content.rawContent.trim()) return;
    try {
      const result = await styleContent.mutateAsync({
        rawContent: content.rawContent,
      });
      onChange({ ...content, styledHtml: result.styledHtml });
      setActiveTab("styled");
    } catch {
      // Error handled by mutation state
    }
  };

  return (
    <div className="space-y-0">
      {/* Tab bar */}
      <div className="flex items-center justify-between border-b">
        <div className="flex">
          <button
            type="button"
            onClick={() => setActiveTab("write")}
            className={`flex items-center gap-1.5 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
              activeTab === "write"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <PenLine className="h-3.5 w-3.5" />
            Write
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("styled")}
            className={`flex items-center gap-1.5 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
              activeTab === "styled"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <Eye className="h-3.5 w-3.5" />
            Styled Preview
            {hasStyled && (
              <span className="ml-1 h-1.5 w-1.5 rounded-full bg-emerald-500" />
            )}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("html")}
            className={`flex items-center gap-1.5 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
              activeTab === "html"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <Code className="h-3.5 w-3.5" />
            HTML
          </button>
        </div>

        {/* Style button — always visible */}
        <button
          type="button"
          onClick={handleStyle}
          disabled={styleContent.isPending || !hasRaw}
          className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed mr-1 mb-0.5"
        >
          {styleContent.isPending ? (
            <>
              <RefreshCw className="h-3.5 w-3.5 animate-spin" />
              Styling...
            </>
          ) : hasStyled ? (
            <>
              <RefreshCw className="h-3.5 w-3.5" />
              Restyle
            </>
          ) : (
            <>
              <Sparkles className="h-3.5 w-3.5" />
              Style with AI
            </>
          )}
        </button>
      </div>

      {/* Error */}
      {styleContent.isError && (
        <div className="px-3 py-2 text-sm text-destructive bg-destructive/10 rounded-b-md">
          Failed to style content. Try again.
        </div>
      )}

      {/* Write tab */}
      {activeTab === "write" && (
        <div className="pt-3">
          <textarea
            value={content.rawContent}
            onChange={(e) => onChange({ ...content, rawContent: e.target.value })}
            placeholder="Paste or type your content here... bullet points, notes, instructions — anything. Then hit 'Style with AI' to format it."
            className="min-h-[280px] w-full rounded-md border bg-background p-3 text-sm font-mono placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            rows={12}
          />
          {!hasRaw && hasStyled && (
            <p className="mt-2 text-xs text-muted-foreground">
              This part has styled content but no raw text. Switch to the <strong>Styled Preview</strong> tab to see it, or paste new content here to restyle.
            </p>
          )}
        </div>
      )}

      {/* Styled preview tab */}
      {activeTab === "styled" && (
        <div className="pt-3">
          {hasStyled ? (
            <div className="rounded-md border bg-white">
              <div
                ref={(node) => {
                  editableRef.current = node;
                  // Set initial content on mount
                  if (node && !node.innerHTML) {
                    node.innerHTML = content.styledHtml;
                    lastSetHtml.current = content.styledHtml;
                  }
                }}
                contentEditable
                suppressContentEditableWarning
                className="steady-styled-content prose prose-sm max-w-none p-4 min-h-[200px] focus:outline-none focus:ring-2 focus:ring-ring focus:ring-inset rounded-md"
                onBlur={handleEditableBlur}
              />
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center rounded-md border border-dashed py-12 text-center">
              <Sparkles className="h-8 w-8 text-muted-foreground/40 mb-3" />
              <p className="text-sm text-muted-foreground">No styled content yet</p>
              <p className="text-xs text-muted-foreground/60 mt-1">
                Write your content in the Write tab, then click "Style with AI"
              </p>
            </div>
          )}
        </div>
      )}

      {/* HTML tab */}
      {activeTab === "html" && (
        <div className="pt-3">
          <textarea
            value={content.styledHtml}
            onChange={(e) => onChange({ ...content, styledHtml: e.target.value })}
            placeholder="Styled HTML will appear here after styling. You can also edit it directly."
            className="min-h-[280px] w-full rounded-md border bg-muted/30 p-3 text-xs font-mono text-muted-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:text-foreground"
            rows={12}
          />
        </div>
      )}
    </div>
  );
}
