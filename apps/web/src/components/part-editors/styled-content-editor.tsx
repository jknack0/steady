"use client";

import { useState } from "react";
import { useStyleContent } from "@/hooks/use-style-content";
import { Sparkles, RefreshCw, Eye, PenLine } from "lucide-react";

interface StyledContentEditorProps {
  content: {
    type: "STYLED_CONTENT";
    rawContent: string;
    styledHtml: string;
  };
  onChange: (content: StyledContentEditorProps["content"]) => void;
}

export function StyledContentPartEditor({ content, onChange }: StyledContentEditorProps) {
  const [showPreview, setShowPreview] = useState(false);
  const styleContent = useStyleContent();

  const handleStyle = async () => {
    if (!content.rawContent.trim()) return;

    try {
      const result = await styleContent.mutateAsync({
        rawContent: content.rawContent,
      });
      onChange({ ...content, styledHtml: result.styledHtml });
    } catch {
      // Error handled by mutation state
    }
  };

  const hasStyledContent = content.styledHtml.length > 0;

  return (
    <div className="space-y-3">
      {/* Raw content input */}
      <div>
        <label className="mb-1 block text-sm font-medium">Content</label>
        <textarea
          value={content.rawContent}
          onChange={(e) => onChange({ ...content, rawContent: e.target.value })}
          placeholder="Paste or type your content here... bullet points, notes, instructions — anything. Claude will format it beautifully."
          className="min-h-[200px] w-full rounded-md border bg-background p-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          rows={10}
        />
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={handleStyle}
          disabled={styleContent.isPending || !content.rawContent.trim()}
          className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {styleContent.isPending ? (
            <>
              <RefreshCw className="h-4 w-4 animate-spin" />
              Styling...
            </>
          ) : hasStyledContent ? (
            <>
              <RefreshCw className="h-4 w-4" />
              Restyle
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4" />
              Style with AI
            </>
          )}
        </button>

        {hasStyledContent && (
          <button
            type="button"
            onClick={() => setShowPreview(!showPreview)}
            className="inline-flex items-center gap-2 rounded-md border px-4 py-2 text-sm font-medium hover:bg-accent"
          >
            {showPreview ? (
              <>
                <PenLine className="h-4 w-4" />
                Hide Preview
              </>
            ) : (
              <>
                <Eye className="h-4 w-4" />
                Preview
              </>
            )}
          </button>
        )}

        {styleContent.isError && (
          <span className="text-sm text-destructive">Failed to style content. Try again.</span>
        )}
      </div>

      {/* Styled HTML preview */}
      {showPreview && hasStyledContent && (
        <div className="rounded-md border">
          <div className="border-b bg-muted/50 px-3 py-2 text-xs font-medium text-muted-foreground">
            Preview (as rendered on mobile)
          </div>
          <div
            className="steady-styled-content prose prose-sm max-w-none p-4"
            style={{
              "--steady-text": "var(--steady-warm-500)",
              "--steady-text-secondary": "var(--steady-warm-400)",
            } as React.CSSProperties}
            dangerouslySetInnerHTML={{ __html: content.styledHtml }}
          />
        </div>
      )}
    </div>
  );
}
