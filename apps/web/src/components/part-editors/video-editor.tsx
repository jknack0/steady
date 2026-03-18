"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

interface VideoEditorProps {
  content: { type: "VIDEO"; url: string; provider: string; transcriptUrl?: string };
  onChange: (content: any) => void;
}

function detectProvider(url: string): "youtube" | "vimeo" | "loom" | null {
  if (/youtube\.com|youtu\.be/i.test(url)) return "youtube";
  if (/vimeo\.com/i.test(url)) return "vimeo";
  if (/loom\.com/i.test(url)) return "loom";
  return null;
}

function getEmbedUrl(url: string, provider: string): string | null {
  try {
    if (provider === "youtube") {
      const match = url.match(/(?:v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
      return match ? `https://www.youtube.com/embed/${match[1]}` : null;
    }
    if (provider === "vimeo") {
      const match = url.match(/vimeo\.com\/(\d+)/);
      return match ? `https://player.vimeo.com/video/${match[1]}` : null;
    }
    if (provider === "loom") {
      const match = url.match(/loom\.com\/share\/([a-zA-Z0-9]+)/);
      return match ? `https://www.loom.com/embed/${match[1]}` : null;
    }
  } catch {}
  return null;
}

export function VideoPartEditor({ content, onChange }: VideoEditorProps) {
  const handleUrlChange = (url: string) => {
    const provider = detectProvider(url) || content.provider;
    onChange({ ...content, url, provider });
  };

  const embedUrl = getEmbedUrl(content.url, content.provider);

  return (
    <div className="space-y-4">
      <div className="grid gap-2">
        <div className="flex items-center gap-2">
          <Label>Video URL</Label>
          {content.provider && (
            <Badge variant="secondary" className="text-xs">
              {content.provider}
            </Badge>
          )}
        </div>
        <Input
          placeholder="https://youtube.com/watch?v=... or vimeo.com/... or loom.com/share/..."
          value={content.url || ""}
          onChange={(e) => handleUrlChange(e.target.value)}
        />
      </div>

      {embedUrl && (
        <div className="aspect-video w-full overflow-hidden rounded-lg border bg-muted">
          <iframe
            src={embedUrl}
            className="h-full w-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      )}

      <div className="grid gap-2">
        <Label>Transcript URL (optional)</Label>
        <Input
          placeholder="https://..."
          value={content.transcriptUrl || ""}
          onChange={(e) => onChange({ ...content, transcriptUrl: e.target.value || undefined })}
        />
      </div>
    </div>
  );
}
