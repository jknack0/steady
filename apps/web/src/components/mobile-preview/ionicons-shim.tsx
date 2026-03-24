"use client";

import {
  CheckSquare,
  Square,
  Video,
  Music,
  FileText,
  AlertCircle,
  Repeat,
  Flame,
} from "lucide-react";

const ICON_MAP: Record<string, React.ElementType> = {
  checkbox: CheckSquare,
  "square-outline": Square,
  "videocam-outline": Video,
  "musical-notes-outline": Music,
  "document-text-outline": FileText,
  "document-attach-outline": FileText,
  "alert-circle-outline": AlertCircle,
  "repeat-outline": Repeat,
  flame: Flame,
  "link-outline": FileText,
};

interface IoniconsProps {
  name: string;
  size?: number;
  color?: string;
  style?: React.CSSProperties;
}

export function Ionicons({ name, size = 24, color = "#000", style }: IoniconsProps) {
  const Icon = ICON_MAP[name];
  if (!Icon) {
    return <span style={{ width: size, height: size, display: "inline-block", ...style }} />;
  }
  return <Icon size={size} color={color} style={style} />;
}
