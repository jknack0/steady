export const EVENT_COLORS: Record<
  string,
  { bg: string; border: string; text: string; icon: string }
> = {
  TIME_BLOCK: {
    bg: "#E3EDED",
    border: "#5B8A8A",
    text: "#4A7272",
    icon: "time-outline",
  },
  SESSION: {
    bg: "#F5ECD7",
    border: "#C4A84D",
    text: "#9A8340",
    icon: "people-outline",
  },
  CATCH_UP: {
    bg: "#E8F0E7",
    border: "#8FAE8B",
    text: "#729070",
    icon: "chatbubbles-outline",
  },
  EXTERNAL_SYNC: {
    bg: "#E1EBF1",
    border: "#89B4C8",
    text: "#6A97AD",
    icon: "sync-outline",
  },
};

export const HOUR_HEIGHT = 60; // px per hour row in week time grid
export const HOURS = Array.from({ length: 24 }, (_, i) => i); // 0–23
export const MODAL_HOURS = Array.from({ length: 16 }, (_, i) => i + 6); // 6am–9pm for create modal
export const INITIAL_SCROLL_HOUR = 7; // scroll week grid to 7 AM on load
export const DAY_HEADER_HEIGHT = 36;
export const TIME_LABEL_WIDTH = 48;
export const GRID_LINE_COLOR = "#F0EDE8";
export const TEAL = "#5B8A8A";
export const TEAL_LIGHT = "#E3EDED";
export const TEXT_PRIMARY = "#2D2D2D";
export const TEXT_SECONDARY = "#8A8A8A";
export const TEXT_MUTED = "#9CA3AF";
export const OVERFLOW_DAY_COLOR = "#C0C0C0";
export const BG_PAGE = "#F7F5F2";
export const BG_CARD = "#FFFFFF";
