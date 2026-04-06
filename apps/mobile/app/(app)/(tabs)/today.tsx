import { useState, createContext, useContext, useEffect } from "react";
import { View, Text, ScrollView, TouchableOpacity, RefreshControl, ActivityIndicator } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { api } from "../../../lib/api";
import { useAuth } from "../../../lib/auth-context";
import { useConfig } from "../../../lib/config-context";
import { DailyTrackerCards } from "../../../components/daily-tracker-card";
import { TodaysHomeworkInstances } from "../../../components/homework-instances";
import { useMyAppointments } from "../../../hooks/use-appointments";
import { useOutstandingInvoiceCount } from "../../../hooks/use-invoices";
import { useMyStreaks } from "../../../hooks/use-streaks";
import { MilestoneCelebration } from "../../../components/completion-animations";
import { useEngagementTracking } from "../../../lib/engagement-tracker";

// ── Shared styles ────────────
const CARD = {
  backgroundColor: "#FFFFFF",
  borderRadius: 16,
  padding: 16,
  borderWidth: 1,
  borderColor: "#F0EDE8",
} as const;

const GREETINGS = [
  "Let's make today count.",
  "Small steps, big progress.",
  "You're building something great.",
  "One thing at a time.",
  "Show up for yourself today.",
];

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function getDailyMotivation(): string {
  const day = Math.floor(Date.now() / 86400000);
  return GREETINGS[day % GREETINGS.length];
}

// ── Centralized data fetching ────────────

interface TodayData {
  trackers: any[];
  tasks: any[];
  events: any[];
  journal: any;
  enrollments: any[];
  upcomingSession: any;
  streakData: { entries: any[]; streak: number } | null;
}

const TodayDataContext = createContext<TodayData>({
  trackers: [], tasks: [], events: [], journal: null,
  enrollments: [], upcomingSession: null, streakData: null,
});

function useTodayData() {
  return useContext(TodayDataContext);
}

function getWeekDays(): { label: string; dateStr: string; isToday: boolean }[] {
  const today = new Date();
  const dayOfWeek = today.getDay();
  const monday = new Date(today);
  monday.setDate(today.getDate() - ((dayOfWeek + 6) % 7));
  monday.setHours(0, 0, 0, 0);
  const DAYS = ["M", "T", "W", "T", "F", "S", "S"];
  return DAYS.map((label, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return {
      label,
      dateStr: d.toISOString().split("T")[0],
      isToday: d.toISOString().split("T")[0] === today.toISOString().split("T")[0],
    };
  });
}

const WEEK_DAYS = getWeekDays();

function useFetchTodayData() {
  const today = new Date();
  const todayStr = today.toISOString().split("T")[0];
  const startOfDay = new Date(today);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(today);
  endOfDay.setHours(23, 59, 59, 999);

  // Single combined query for all today screen data
  const { data, isLoading } = useQuery({
    queryKey: ["today-screen-data", todayStr],
    queryFn: async () => {
      const [trackersRes, tasksRes, eventsRes, journalRes, enrollRes, sessionRes] = await Promise.all([
        api.getDailyTrackers(),
        api.getTasks({ status: "TODO" }),
        api.getCalendarEvents(startOfDay.toISOString(), endOfDay.toISOString()),
        api.getJournalEntry(todayStr),
        api.getEnrollments(),
        api.getUpcomingSession(),
      ]);

      const trackers = trackersRes.success ? trackersRes.data as any[] : [];
      const firstTrackerId = trackers[0]?.id;

      // Fetch streak + history only if we have a tracker
      let streakData = null;
      if (firstTrackerId) {
        const [histRes, streakRes] = await Promise.all([
          api.getTrackerHistory(firstTrackerId, { startDate: WEEK_DAYS[0].dateStr, endDate: WEEK_DAYS[6].dateStr }),
          api.getTrackerStreak(firstTrackerId),
        ]);
        streakData = {
          entries: histRes.success ? (histRes.data as any[]) || [] : [],
          streak: streakRes.success ? (streakRes.data as any)?.streak || 0 : 0,
        };
      }

      return {
        trackers,
        tasks: tasksRes.success ? (tasksRes.data as any[]) || [] : [],
        events: eventsRes.success ? (eventsRes.data as any[]) || [] : [],
        journal: journalRes.success ? journalRes.data : null,
        enrollments: enrollRes.success ? (enrollRes.data as any[]) || [] : [],
        upcomingSession: sessionRes.success ? sessionRes.data : null,
        streakData,
      };
    },
    staleTime: 30000,
  });

  // Also keep individual query keys warm so tab mutations invalidate correctly
  const queryClient = useQueryClient();
  if (data) {
    queryClient.setQueryData(["participant-daily-trackers"], data.trackers);
    queryClient.setQueryData(["tasks"], data.tasks);
    queryClient.setQueryData(["calendar"], data.events);
    queryClient.setQueryData(["journal"], data.journal);
    queryClient.setQueryData(["enrollments"], data.enrollments);
  }

  return { data, isLoading };
}

// ── Weekly Streak Widget ────────────

function WeeklyStreakWidget() {
  const { trackers, streakData } = useTodayData();
  if (!trackers || trackers.length === 0) return null;

  const completedDates = new Set(
    (streakData?.entries || []).map((e: any) =>
      typeof e.date === "string" ? e.date.split("T")[0] : new Date(e.date).toISOString().split("T")[0]
    )
  );
  const streak = streakData?.streak || 0;

  const todayCompleted = trackers.some((t: any) => t.completedToday);
  if (todayCompleted) {
    completedDates.add(new Date().toISOString().split("T")[0]);
  }

  const allDone = trackers.every((t: any) => t.completedToday);

  return (
    <View style={{
      marginHorizontal: 16, marginTop: 12,
      backgroundColor: "#FFFFFF", borderRadius: 16, overflow: "hidden",
      borderWidth: 1, borderColor: allDone ? "#C3DCC3" : "#F0EDE8",
    }}>
      {allDone ? (
        <View style={{ flexDirection: "row", alignItems: "center", padding: 16, paddingBottom: 12 }}>
          <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: "#E8F5E9", alignItems: "center", justifyContent: "center", marginRight: 10 }}>
            <Ionicons name="checkmark-circle" size={20} color="#8FAE8B" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 15, fontFamily: "PlusJakartaSans_700Bold", color: "#2D2D2D" }}>Checked in today</Text>
            <Text style={{ fontSize: 12, fontFamily: "PlusJakartaSans_400Regular", color: "#8A8A8A", marginTop: 1 }}>
              {streak > 1 ? `${streak} days in a row — keep it going!` : "Great start — come back tomorrow!"}
            </Text>
          </View>
          {streak > 1 && (
            <View style={{ flexDirection: "row", alignItems: "center", backgroundColor: streak >= 7 ? "#C4A84D18" : "#E8783A15", borderRadius: 10, paddingHorizontal: 8, paddingVertical: 4 }}>
              <Ionicons name="flame" size={14} color={streak >= 7 ? "#C4A84D" : "#E8783A"} />
              <Text style={{ fontSize: 13, fontFamily: "PlusJakartaSans_700Bold", color: streak >= 7 ? "#C4A84D" : "#E8783A", marginLeft: 3 }}>{streak}</Text>
            </View>
          )}
        </View>
      ) : (
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 16, paddingBottom: 12 }}>
          <Text style={{ fontSize: 14, fontFamily: "PlusJakartaSans_600SemiBold", color: "#2D2D2D" }}>This Week</Text>
          {streak > 0 && (
            <View style={{ flexDirection: "row", alignItems: "center", backgroundColor: streak >= 7 ? "#C4A84D18" : "#E8783A15", borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4 }}>
              <Ionicons name="flame" size={14} color={streak >= 7 ? "#C4A84D" : "#E8783A"} />
              <Text style={{ fontSize: 13, fontFamily: "PlusJakartaSans_700Bold", color: streak >= 7 ? "#C4A84D" : "#E8783A", marginLeft: 4 }}>{streak} day streak</Text>
            </View>
          )}
        </View>
      )}

      <View style={{ flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 16, paddingBottom: 16 }}>
        {WEEK_DAYS.map(({ label, dateStr, isToday }) => {
          const done = completedDates.has(dateStr);
          const isPast = dateStr < new Date().toISOString().split("T")[0];
          const missed = isPast && !done;
          return (
            <View key={dateStr} style={{ alignItems: "center", flex: 1 }}>
              <Text style={{ fontSize: 11, fontFamily: "PlusJakartaSans_500Medium", color: isToday ? "#5B8A8A" : "#B0ACA5", marginBottom: 6 }}>{label}</Text>
              <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: done ? "#8FAE8B" : missed ? "#F0EDE8" : "transparent", borderWidth: isToday && !done ? 2 : 0, borderColor: "#5B8A8A", alignItems: "center", justifyContent: "center" }}>
                {done ? <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                  : missed ? <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: "#D4D0CB" }} />
                  : isToday ? <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: "#5B8A8A" }} />
                  : <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: "#E3E0DB" }} />}
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
}

// ── Streak Badges ────────────

const CATEGORY_LABELS: Record<string, string> = {
  JOURNAL: "Journal",
  CHECKIN: "Check-in",
  HOMEWORK: "Homework",
};

const CATEGORY_ICONS: Record<string, string> = {
  JOURNAL: "book",
  CHECKIN: "pulse",
  HOMEWORK: "clipboard",
};

function StreakBadges() {
  const { data: streaks } = useMyStreaks();
  if (!streaks || streaks.length === 0) return null;

  const activeStreaks = streaks.filter((s) => s.currentStreak > 0);
  if (activeStreaks.length === 0) {
    return (
      <View style={{ marginHorizontal: 16, marginTop: 12, backgroundColor: "#FFFFFF", borderRadius: 16, padding: 16, borderWidth: 1, borderColor: "#F0EDE8" }}>
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <Ionicons name="flame-outline" size={18} color="#D4D0CB" />
          <Text style={{ fontSize: 14, fontFamily: "PlusJakartaSans_500Medium", color: "#8A8A8A", marginLeft: 8 }}>
            Start your streak today!
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={{ flexDirection: "row", marginHorizontal: 16, marginTop: 12, gap: 8 }}>
      {activeStreaks.map((streak) => (
        <View
          key={streak.category}
          style={{
            flex: 1,
            backgroundColor: "#FFFFFF",
            borderRadius: 12,
            paddingVertical: 12,
            paddingHorizontal: 12,
            alignItems: "center",
            borderWidth: 1,
            borderColor: streak.currentStreak >= 7 ? "#C4A84D40" : "#F0EDE8",
          }}
        >
          <Ionicons
            name="flame"
            size={20}
            color={streak.currentStreak >= 7 ? "#C4A84D" : "#E8783A"}
          />
          <Text style={{
            fontSize: 18,
            fontFamily: "PlusJakartaSans_700Bold",
            color: streak.currentStreak >= 7 ? "#C4A84D" : "#E8783A",
            marginTop: 2,
          }}>
            {streak.currentStreak}
          </Text>
          <Text style={{
            fontSize: 11,
            fontFamily: "PlusJakartaSans_500Medium",
            color: "#8A8A8A",
            marginTop: 1,
          }}>
            {CATEGORY_LABELS[streak.category] || streak.category}
          </Text>
        </View>
      ))}
    </View>
  );
}

// ── Daily Progress Summary ────────────

function DailyProgressSummary() {
  const { trackers, tasks, events, journal } = useTodayData();

  const trackersDone = trackers.filter((t: any) => t.completedToday).length;
  const trackersTotal = trackers.length;
  const taskCount = tasks.length;
  const eventCount = events.length;
  const hasJournal = journal && (journal as any).freeformContent;

  const items = [
    { icon: "checkmark-circle" as const, label: trackersTotal > 0 ? `${trackersDone}/${trackersTotal} check-ins` : "No check-ins", done: trackersTotal > 0 && trackersDone === trackersTotal, color: "#8FAE8B", bg: "#E8F5E9" },
    { icon: "list" as const, label: taskCount === 0 ? "All clear" : `${taskCount} task${taskCount !== 1 ? "s" : ""}`, done: taskCount === 0, color: "#8B7EC8", bg: "#EEEBF7" },
    { icon: "calendar" as const, label: eventCount === 0 ? "Free day" : `${eventCount} event${eventCount !== 1 ? "s" : ""}`, done: eventCount === 0, color: "#89B4C8", bg: "#E0EEF5" },
    { icon: "book" as const, label: hasJournal ? "Journaled" : "Journal", done: !!hasJournal, color: "#C4A84D", bg: "#F5ECD7" },
  ];

  return (
    <View style={{ flexDirection: "row", marginHorizontal: 16, marginTop: 12, gap: 8 }}>
      {items.map((item) => (
        <View
          key={item.label}
          style={{
            flex: 1, backgroundColor: item.done ? item.bg : "#FFFFFF",
            borderRadius: 12, paddingVertical: 10, alignItems: "center",
            borderWidth: 1, borderColor: item.done ? item.color + "40" : "#F0EDE8",
          }}
        >
          <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: item.done ? item.color + "25" : item.bg, alignItems: "center", justifyContent: "center" }}>
            <Ionicons name={item.done ? "checkmark-circle" : (item.icon + "-outline") as any} size={16} color={item.done ? item.color : item.color + "90"} />
          </View>
          <Text style={{ fontSize: 10, fontFamily: "PlusJakartaSans_500Medium", color: item.done ? item.color : "#8A8A8A", marginTop: 4, textAlign: "center" }} numberOfLines={1}>
            {item.label}
          </Text>
        </View>
      ))}
    </View>
  );
}

// ── Next Appointment Card ────────────

function NextAppointmentCard() {
  // Query a 7-day window and take the earliest SCHEDULED appointment.
  const now = new Date();
  const sevenDays = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const { data } = useMyAppointments({
    from: now.toISOString(),
    to: sevenDays.toISOString(),
    status: "SCHEDULED",
  });

  const next = data[0];
  if (!next) return null;

  const start = new Date(next.startAt);
  const timeStr = start.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });

  const today0 = new Date();
  today0.setHours(0, 0, 0, 0);
  const target0 = new Date(start);
  target0.setHours(0, 0, 0, 0);
  const diffDays = Math.round(
    (target0.getTime() - today0.getTime()) / (24 * 60 * 60 * 1000),
  );
  let whenLabel: string;
  if (diffDays === 0) whenLabel = `Today at ${timeStr}`;
  else if (diffDays === 1) whenLabel = `Tomorrow at ${timeStr}`;
  else {
    const weekday = start.toLocaleDateString(undefined, { weekday: "long" });
    whenLabel = `${weekday} at ${timeStr}`;
  }

  const clinicianName = next.clinician
    ? `${next.clinician.firstName ?? ""} ${next.clinician.lastName ?? ""}`.trim()
    : "Your clinician";
  const serviceLabel = next.serviceCode?.description ?? "Session";
  const isVirtual = next.location?.type === "VIRTUAL";
  const locationLabel = next.location
    ? isVirtual
      ? "Video visit"
      : next.location.name
    : "";

  return (
    <TouchableOpacity
      onPress={() => router.push("/(app)/appointments")}
      accessibilityLabel={`Next appointment: ${whenLabel}, ${clinicianName}, ${serviceLabel}, ${locationLabel}`}
      style={{ ...CARD, marginHorizontal: 16, marginTop: 12 }}
      activeOpacity={0.7}
    >
      <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 8 }}>
        <View
          style={{
            width: 36,
            height: 36,
            borderRadius: 10,
            backgroundColor: "#5B8A8A",
            alignItems: "center",
            justifyContent: "center",
            marginRight: 12,
          }}
        >
          <Ionicons
            name={isVirtual ? "videocam-outline" : "calendar-outline"}
            size={18}
            color="#FFFFFF"
          />
        </View>
        <View style={{ flex: 1 }}>
          <Text
            style={{
              fontSize: 14,
              fontFamily: "PlusJakartaSans_600SemiBold",
              color: "#2D2D2D",
            }}
          >
            Next appointment
          </Text>
          <Text
            style={{
              fontSize: 12,
              fontFamily: "PlusJakartaSans_400Regular",
              color: "#8A8A8A",
            }}
          >
            {whenLabel}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color="#D4D0CB" />
      </View>
      <Text
        style={{
          fontSize: 13,
          fontFamily: "PlusJakartaSans_500Medium",
          color: "#2D2D2D",
          marginBottom: 2,
        }}
        numberOfLines={1}
      >
        {serviceLabel}
      </Text>
      <Text
        style={{
          fontSize: 12,
          fontFamily: "PlusJakartaSans_400Regular",
          color: "#5A5A5A",
        }}
        numberOfLines={1}
      >
        with {clinicianName}
        {locationLabel ? ` · ${locationLabel}` : ""}
      </Text>
    </TouchableOpacity>
  );
}

// ── Upcoming Session Card ────────────

function UpcomingSessionCard() {
  const { upcomingSession: data } = useTodayData();
  if (!data) return null;

  const date = new Date(data.scheduledAt);
  const timeStr = date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  const dateStr = date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });

  return (
    <View style={{ ...CARD, marginHorizontal: 16, marginTop: 12 }}>
      <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 8 }}>
        <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: "#5B8A8A", alignItems: "center", justifyContent: "center", marginRight: 12 }}>
          <Ionicons name="videocam-outline" size={18} color="#FFFFFF" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 14, fontFamily: "PlusJakartaSans_600SemiBold", color: "#2D2D2D" }}>Upcoming Session</Text>
          <Text style={{ fontSize: 12, fontFamily: "PlusJakartaSans_400Regular", color: "#8A8A8A" }}>{dateStr} at {timeStr}</Text>
        </View>
      </View>
      {data.clinicianName && (
        <Text style={{ fontSize: 12, fontFamily: "PlusJakartaSans_400Regular", color: "#5A5A5A", marginBottom: 8 }}>with {data.clinicianName}</Text>
      )}
      {data.videoCallUrl && (
        <TouchableOpacity onPress={() => {}} style={{ backgroundColor: "#5B8A8A", borderRadius: 10, paddingVertical: 10, alignItems: "center" }} activeOpacity={0.8}>
          <Text style={{ color: "white", fontFamily: "PlusJakartaSans_600SemiBold", fontSize: 14 }}>Join Call</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

// ── Your Day Card (tasks + schedule + journal) ────────────

function YourDayCard() {
  const { tasks, events, journal } = useTodayData();

  const todoTasks = tasks.slice(0, 3);
  const taskRemaining = tasks.length - 3;
  const todayEvents = events.slice(0, 3);
  const eventRemaining = events.length - 3;
  const hasJournal = journal && (journal as any).freeformContent;

  return (
    <View style={{ ...CARD, marginHorizontal: 16, marginTop: 12, padding: 0, overflow: "hidden" }}>

      {/* Tasks */}
      <TouchableOpacity onPress={() => router.push("/(app)/(tabs)/tasks")} style={{ padding: 16, paddingBottom: todoTasks.length === 0 ? 14 : 12 }} activeOpacity={0.7}>
        <View style={{ flexDirection: "row", alignItems: "center", marginBottom: todoTasks.length > 0 ? 10 : 0 }}>
          <Ionicons name="list" size={16} color="#8B7EC8" style={{ marginRight: 8 }} />
          <Text style={{ flex: 1, fontSize: 13, fontFamily: "PlusJakartaSans_600SemiBold", color: "#2D2D2D" }}>Tasks</Text>
          {todoTasks.length > 0 && (
            <View style={{ backgroundColor: "#8B7EC812", borderRadius: 10, paddingHorizontal: 7, paddingVertical: 2 }}>
              <Text style={{ fontSize: 11, fontFamily: "PlusJakartaSans_600SemiBold", color: "#8B7EC8" }}>{tasks.length}</Text>
            </View>
          )}
          <Ionicons name="chevron-forward" size={16} color="#D4D0CB" style={{ marginLeft: 4 }} />
        </View>
        {todoTasks.length === 0 ? (
          <Text style={{ fontSize: 12, fontFamily: "PlusJakartaSans_400Regular", color: "#B0ACA5" }}>No tasks right now</Text>
        ) : (
          <View>
            {todoTasks.map((task: any, i: number) => (
              <View key={task.id} style={{ flexDirection: "row", alignItems: "center", paddingVertical: 5, borderTopWidth: i === 0 ? 0 : 1, borderTopColor: "#F5F3F0" }}>
                <View style={{ width: 3, height: 20, borderRadius: 2, backgroundColor: "#8B7EC8", marginRight: 8 }} />
                <Text style={{ flex: 1, fontSize: 13, fontFamily: "PlusJakartaSans_500Medium", color: "#2D2D2D" }} numberOfLines={1}>{task.title}</Text>
              </View>
            ))}
            {taskRemaining > 0 && <Text style={{ fontSize: 11, fontFamily: "PlusJakartaSans_500Medium", color: "#8B7EC8", marginTop: 2 }}>+{taskRemaining} more</Text>}
          </View>
        )}
      </TouchableOpacity>

      <View style={{ height: 1, backgroundColor: "#F0EDE8", marginHorizontal: 16 }} />

      {/* Schedule */}
      <TouchableOpacity onPress={() => router.push("/(app)/(tabs)/calendar")} style={{ padding: 16, paddingBottom: todayEvents.length === 0 ? 14 : 12 }} activeOpacity={0.7}>
        <View style={{ flexDirection: "row", alignItems: "center", marginBottom: todayEvents.length > 0 ? 10 : 0 }}>
          <Ionicons name="calendar" size={16} color="#89B4C8" style={{ marginRight: 8 }} />
          <Text style={{ flex: 1, fontSize: 13, fontFamily: "PlusJakartaSans_600SemiBold", color: "#2D2D2D" }}>Schedule</Text>
          {todayEvents.length > 0 && (
            <View style={{ backgroundColor: "#89B4C812", borderRadius: 10, paddingHorizontal: 7, paddingVertical: 2 }}>
              <Text style={{ fontSize: 11, fontFamily: "PlusJakartaSans_600SemiBold", color: "#89B4C8" }}>{events.length}</Text>
            </View>
          )}
          <Ionicons name="chevron-forward" size={16} color="#D4D0CB" style={{ marginLeft: 4 }} />
        </View>
        {todayEvents.length === 0 ? (
          <Text style={{ fontSize: 12, fontFamily: "PlusJakartaSans_400Regular", color: "#B0ACA5" }}>Nothing scheduled today</Text>
        ) : (
          <View>
            {todayEvents.map((event: any, i: number) => {
              const start = new Date(event.startTime);
              const timeStr = start.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
              return (
                <View key={event.id} style={{ flexDirection: "row", alignItems: "center", paddingVertical: 5, borderTopWidth: i === 0 ? 0 : 1, borderTopColor: "#F5F3F0" }}>
                  <View style={{ width: 3, height: 20, borderRadius: 2, backgroundColor: event.color || "#89B4C8", marginRight: 8 }} />
                  <Text style={{ flex: 1, fontSize: 13, fontFamily: "PlusJakartaSans_500Medium", color: "#2D2D2D" }} numberOfLines={1}>{event.title}</Text>
                  <Text style={{ fontSize: 11, fontFamily: "PlusJakartaSans_400Regular", color: "#B0ACA5" }}>{timeStr}</Text>
                </View>
              );
            })}
            {eventRemaining > 0 && <Text style={{ fontSize: 11, fontFamily: "PlusJakartaSans_500Medium", color: "#89B4C8", marginTop: 2 }}>+{eventRemaining} more</Text>}
          </View>
        )}
      </TouchableOpacity>

      <View style={{ height: 1, backgroundColor: "#F0EDE8", marginHorizontal: 16 }} />

      {/* Journal */}
      <TouchableOpacity onPress={() => router.push("/(app)/(tabs)/journal")} style={{ padding: 16 }} activeOpacity={0.7}>
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          {hasJournal
            ? <Ionicons name="checkmark-circle" size={16} color="#8FAE8B" style={{ marginRight: 8 }} />
            : <Ionicons name="book" size={16} color="#C4A84D" style={{ marginRight: 8 }} />}
          <Text style={{ flex: 1, fontSize: 13, fontFamily: "PlusJakartaSans_600SemiBold", color: "#2D2D2D" }}>
            {hasJournal ? "Journaled today" : "Journal"}
          </Text>
          {hasJournal ? (
            <Text style={{ fontSize: 11, fontFamily: "PlusJakartaSans_400Regular", color: "#8FAE8B" }}>Done</Text>
          ) : (
            <View style={{ backgroundColor: "#C4A84D", borderRadius: 8, paddingHorizontal: 12, paddingVertical: 5 }}>
              <Text style={{ fontSize: 11, fontFamily: "PlusJakartaSans_600SemiBold", color: "white" }}>Write</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    </View>
  );
}

// ── Program Progress Card ────────────

function ProgramProgressCard() {
  const { enrollments } = useTodayData();
  const active = enrollments?.find((e: any) => e.status === "ACTIVE");

  return (
    <TouchableOpacity onPress={() => router.push("/(app)/(tabs)/program")} style={{ ...CARD, marginHorizontal: 16, marginTop: 12 }} activeOpacity={0.7}>
      <View style={{ flexDirection: "row", alignItems: "center" }}>
        <View style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: "#5B8A8A", alignItems: "center", justifyContent: "center", marginRight: 10 }}>
          <Ionicons name="library-outline" size={16} color="#FFFFFF" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 14, fontFamily: "PlusJakartaSans_600SemiBold", color: "#2D2D2D" }}>{active ? active.program.title : "My Program"}</Text>
          <Text style={{ fontSize: 12, fontFamily: "PlusJakartaSans_400Regular", color: "#8A8A8A", marginTop: 1 }}>{active ? "Continue where you left off" : "No program yet"}</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color="#D4D0CB" />
      </View>
    </TouchableOpacity>
  );
}

// ── Check-in Section ────────────

function CheckInSection() {
  const { trackers } = useTodayData();
  if (!trackers || trackers.length === 0) return null;
  if (trackers.every((t: any) => t.completedToday)) return null;

  return (
    <View style={{ marginHorizontal: 16, marginTop: 12 }}>
      <DailyTrackerCards />
    </View>
  );
}

// ── Portal Cards ────────────

function PendingFormsCard() {
  const { enrollments } = useTodayData();
  // Count incomplete intake form parts across all active enrollments
  // This is a simplified check — intake forms are INTAKE_FORM part types
  // that haven't been completed in the participant's progress
  const pendingCount = 0; // TODO: wire up pending intake form count from API
  if (pendingCount === 0) return null;

  return (
    <TouchableOpacity
      onPress={() => router.push("/(app)/(tabs)/program")}
      style={{
        marginHorizontal: 16,
        marginTop: 12,
        backgroundColor: "#FFF8E1",
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: "#FFE082",
        flexDirection: "row",
        alignItems: "center",
      }}
    >
      <Ionicons name="clipboard-outline" size={22} color="#F57F17" style={{ marginRight: 12 }} />
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 14, fontFamily: "PlusJakartaSans_700Bold", color: "#F57F17" }}>Pending Forms</Text>
        <Text style={{ fontSize: 12, fontFamily: "PlusJakartaSans_400Regular", color: "#8A8A8A", marginTop: 2 }}>
          You have {pendingCount} form{pendingCount > 1 ? "s" : ""} to complete
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color="#F57F17" />
    </TouchableOpacity>
  );
}

function OutstandingInvoicesCard() {
  const { data: invoiceCount } = useOutstandingInvoiceCount();
  if (!invoiceCount || invoiceCount === 0) return null;

  return (
    <TouchableOpacity
      onPress={() => router.push("/(app)/invoices" as any)}
      style={{
        marginHorizontal: 16,
        marginTop: 12,
        backgroundColor: "#E3F2FD",
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: "#90CAF9",
        flexDirection: "row",
        alignItems: "center",
      }}
    >
      <Ionicons name="receipt-outline" size={22} color="#1565C0" style={{ marginRight: 12 }} />
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 14, fontFamily: "PlusJakartaSans_700Bold", color: "#1565C0" }}>Outstanding Invoices</Text>
        <Text style={{ fontSize: 12, fontFamily: "PlusJakartaSans_400Regular", color: "#8A8A8A", marginTop: 2 }}>
          You have {invoiceCount} invoice{invoiceCount > 1 ? "s" : ""} to review
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color="#1565C0" />
    </TouchableOpacity>
  );
}

// ── Today View ────────────

const MILESTONES = [7, 14, 21, 30] as const;

export default function TodayScreen() {
  const { user } = useAuth();
  const { isModuleEnabled } = useConfig();
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);
  const [milestoneVisible, setMilestoneVisible] = useState(false);
  const [milestoneData, setMilestoneData] = useState<{ milestone: 7 | 14 | 21 | 30; category: string } | null>(null);

  const { data, isLoading } = useFetchTodayData();
  const { data: streaks } = useMyStreaks();

  useEngagementTracking();

  // Milestone detection
  useEffect(() => {
    if (!streaks || streaks.length === 0) return;

    (async () => {
      for (const streak of streaks) {
        for (const m of MILESTONES) {
          if (streak.currentStreak === m) {
            const key = `milestone-seen-${streak.category}-${m}`;
            const seen = await AsyncStorage.getItem(key);
            if (!seen) {
              await AsyncStorage.setItem(key, "true");
              setMilestoneData({ milestone: m, category: streak.category });
              setMilestoneVisible(true);
              return; // Show one at a time
            }
          }
        }
      }
    })();
  }, [streaks]);

  const onRefresh = async () => {
    setRefreshing(true);
    await queryClient.invalidateQueries();
    setRefreshing(false);
  };

  if (isLoading || !data) {
    return (
      <View style={{ flex: 1, backgroundColor: "#F7F5F2", alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator size="large" color="#5B8A8A" />
      </View>
    );
  }

  return (
    <TodayDataContext.Provider value={data}>
      <ScrollView
        style={{ flex: 1, backgroundColor: "#F7F5F2" }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#5B8A8A" />}
      >
        {/* Greeting banner */}
        <View style={{ marginHorizontal: 16, marginTop: 12, backgroundColor: "#5B8A8A", borderRadius: 20, padding: 20, paddingBottom: 18 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "baseline" }}>
            <Text style={{ fontSize: 22, fontFamily: "PlusJakartaSans_700Bold", color: "#FFFFFF" }}>
              {getGreeting()}, {user?.firstName || "there"}
            </Text>
            <Text style={{ fontSize: 13, fontFamily: "PlusJakartaSans_500Medium", color: "rgba(255,255,255,0.6)" }}>
              {new Date().toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
            </Text>
          </View>
          <Text style={{ fontSize: 14, fontFamily: "PlusJakartaSans_400Regular", color: "rgba(255,255,255,0.75)", marginTop: 4 }}>
            {getDailyMotivation()}
          </Text>
        </View>

        <WeeklyStreakWidget />
        <StreakBadges />
        <DailyProgressSummary />

        {isModuleEnabled("daily_tracker") && <CheckInSection />}
        <NextAppointmentCard />
        <UpcomingSessionCard />
        {isModuleEnabled("homework") && <TodaysHomeworkInstances />}
        <ProgramProgressCard />
        <YourDayCard />

        <PendingFormsCard />
        <OutstandingInvoicesCard />

        <View style={{ height: 32 }} />
      </ScrollView>

      {milestoneData && (
        <MilestoneCelebration
          milestone={milestoneData.milestone}
          category={milestoneData.category}
          visible={milestoneVisible}
          onDismiss={() => setMilestoneVisible(false)}
        />
      )}
    </TodayDataContext.Provider>
  );
}
