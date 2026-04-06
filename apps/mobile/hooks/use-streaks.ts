import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";

interface StreakRecord {
  category: "JOURNAL" | "CHECKIN" | "HOMEWORK";
  currentStreak: number;
  longestStreak: number;
  lastActiveDate: string | null;
}

export function useMyStreaks() {
  return useQuery<StreakRecord[]>({
    queryKey: ["my-streaks"],
    queryFn: async () => {
      const res = await api.getMyStreaks();
      if (!res.success) throw new Error(res.error);
      return (res.data as StreakRecord[]) || [];
    },
    staleTime: 60000, // 1 minute
  });
}
