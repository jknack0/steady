import { useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, RefreshControl } from "react-native";
import { router } from "expo-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { api } from "../../../lib/api";
import { useAuth } from "../../../lib/auth-context";
import { useConfig } from "../../../lib/config-context";
import { DailyTrackerCards } from "../../../components/daily-tracker-card";
import { TodaysHomeworkInstances } from "../../../components/homework-instances";

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
  const day = Math.floor(Date.now() / 86400000); // changes daily
  return GREETINGS[day % GREETINGS.length];
}

// ── Weekly Streak Widget ────────────

function getWeekDays(): { label: string; dateStr: string; isToday: boolean }[] {
  const today = new Date();
  const dayOfWeek = today.getDay(); // 0=Sun
  const monday = new Date(today);
  monday.setDate(today.getDate() - ((dayOfWeek + 6) % 7)); // roll back to Monday
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

function WeeklyStreakWidget() {
  const weekDays = getWeekDays();
  const weekStart = weekDays[0].dateStr;
  const weekEnd = weekDays[6].dateStr;

  const { data: trackers } = useQuery<any[]>({
    queryKey: ["participant-daily-trackers"],
    staleTime: 30000,
  });

  const trackerIds = (trackers || []).map((t: any) => t.id);
  const firstTrackerId = trackerIds[0];

  // Fetch history for the week (use first tracker as primary streak source)
  const { data: historyData } = useQuery({
    queryKey: ["tracker-history-week", firstTrackerId, weekStart],
    queryFn: async () => {
      if (!firstTrackerId) return { entries: [], streak: 0 };
      const [histRes, streakRes] = await Promise.all([
        api.getTrackerHistory(firstTrackerId, { startDate: weekStart, endDate: weekEnd }),
        api.getTrackerStreak(firstTrackerId),
      ]);
      const entries = histRes.success ? (histRes.data as any[]) || [] : [];
      const streak = streakRes.success ? (streakRes.data as any)?.streak || 0 : 0;
      return { entries, streak };
    },
    enabled: !!firstTrackerId,
    staleTime: 30000,
  });

  const completedDates = new Set(
    (historyData?.entries || []).map((e: any) =>
      typeof e.date === "string" ? e.date.split("T")[0] : new Date(e.date).toISOString().split("T")[0]
    )
  );
  const streak = historyData?.streak || 0;

  // Also count today as completed if tracker shows completedToday
  const todayCompleted = (trackers || []).some((t: any) => t.completedToday);
  if (todayCompleted) {
    completedDates.add(new Date().toISOString().split("T")[0]);
  }

  const allDone = trackers && trackers.length > 0 && trackers.every((t: any) => t.completedToday);

  if (!trackers || trackers.length === 0) return null;

  return (
    <View style={{
      marginHorizontal: 16,
      marginTop: 12,
      backgroundColor: "#FFFFFF",
      borderRadius: 16,
      overflow: "hidden",
      borderWidth: 1,
      borderColor: allDone ? "#C3DCC3" : "#F0EDE8",
    }}>
      {/* Header */}
      {allDone ? (
        <View style={{ flexDirection: "row", alignItems: "center", padding: 16, paddingBottom: 12 }}>
          <View style={{
            width: 32, height: 32, borderRadius: 16,
            backgroundColor: "#E8F5E9",
            alignItems: "center", justifyContent: "center",
            marginRight: 10,
          }}>
            <Ionicons name="checkmark-circle" size={20} color="#8FAE8B" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 15, fontFamily: "PlusJakartaSans_700Bold", color: "#2D2D2D" }}>
              Checked in today
            </Text>
            <Text style={{ fontSize: 12, fontFamily: "PlusJakartaSans_400Regular", color: "#8A8A8A", marginTop: 1 }}>
              {streak > 1
                ? `${streak} days in a row — keep it going!`
                : "Great start — come back tomorrow!"}
            </Text>
          </View>
          {streak > 1 && (
            <View style={{
              flexDirection: "row", alignItems: "center",
              backgroundColor: streak >= 7 ? "#C4A84D18" : "#E8783A15",
              borderRadius: 10, paddingHorizontal: 8, paddingVertical: 4,
            }}>
              <Ionicons name="flame" size={14} color={streak >= 7 ? "#C4A84D" : "#E8783A"} />
              <Text style={{ fontSize: 13, fontFamily: "PlusJakartaSans_700Bold", color: streak >= 7 ? "#C4A84D" : "#E8783A", marginLeft: 3 }}>
                {streak}
              </Text>
            </View>
          )}
        </View>
      ) : (
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 16, paddingBottom: 12 }}>
          <Text style={{ fontSize: 14, fontFamily: "PlusJakartaSans_600SemiBold", color: "#2D2D2D" }}>
            This Week
          </Text>
          {streak > 0 && (
            <View style={{
              flexDirection: "row", alignItems: "center",
              backgroundColor: streak >= 7 ? "#C4A84D18" : "#E8783A15",
              borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4,
            }}>
              <Ionicons name="flame" size={14} color={streak >= 7 ? "#C4A84D" : "#E8783A"} />
              <Text style={{
                fontSize: 13, fontFamily: "PlusJakartaSans_700Bold",
                color: streak >= 7 ? "#C4A84D" : "#E8783A", marginLeft: 4,
              }}>
                {streak} day streak
              </Text>
            </View>
          )}
        </View>
      )}

      {/* Day circles */}
      <View style={{ flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 16, paddingBottom: 16 }}>
        {weekDays.map(({ label, dateStr, isToday }) => {
          const done = completedDates.has(dateStr);
          const isPast = dateStr < new Date().toISOString().split("T")[0];
          const missed = isPast && !done;

          return (
            <View key={dateStr} style={{ alignItems: "center", flex: 1 }}>
              <Text style={{
                fontSize: 11,
                fontFamily: "PlusJakartaSans_500Medium",
                color: isToday ? "#5B8A8A" : "#B0ACA5",
                marginBottom: 6,
              }}>
                {label}
              </Text>
              <View style={{
                width: 32,
                height: 32,
                borderRadius: 16,
                backgroundColor: done ? "#8FAE8B" : missed ? "#F0EDE8" : "transparent",
                borderWidth: isToday && !done ? 2 : 0,
                borderColor: "#5B8A8A",
                alignItems: "center",
                justifyContent: "center",
              }}>
                {done ? (
                  <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                ) : missed ? (
                  <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: "#D4D0CB" }} />
                ) : isToday ? (
                  <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: "#5B8A8A" }} />
                ) : (
                  <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: "#E3E0DB" }} />
                )}
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
}

// ── Daily Progress Summary ────────────

function DailyProgressSummary() {
  const todayStr = new Date().toISOString().split("T")[0];
  const today = new Date();
  const startOfDay = new Date(today);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(today);
  endOfDay.setHours(23, 59, 59, 999);

  const { data: trackers } = useQuery({
    queryKey: ["participant-daily-trackers"],
    staleTime: 30000,
  });

  const { data: tasks } = useQuery({
    queryKey: ["tasks"],
    queryFn: async () => {
      const res = await api.getTasks({ status: "TODO" });
      return res.success ? (res.data as any[]) || [] : [];
    },
    staleTime: 60000,
  });

  const { data: journal } = useQuery({
    queryKey: ["journal"],
    queryFn: async () => {
      const res = await api.getJournalEntry(todayStr);
      return res.success ? res.data : null;
    },
    staleTime: 60000,
  });

  const { data: events } = useQuery({
    queryKey: ["calendar"],
    queryFn: async () => {
      const res = await api.getCalendarEvents(startOfDay.toISOString(), endOfDay.toISOString());
      return res.success ? (res.data as any[]) || [] : [];
    },
    staleTime: 60000,
  });

  const trackersDone = Array.isArray(trackers) ? trackers.filter((t: any) => t.completedToday).length : 0;
  const trackersTotal = Array.isArray(trackers) ? trackers.length : 0;
  const taskCount = (tasks || []).length;
  const eventCount = (events || []).length;
  const hasJournal = journal && (journal as any).freeformContent;

  const items = [
    { icon: "checkmark-circle" as const, label: trackersTotal > 0 ? `${trackersDone}/${trackersTotal} check-ins` : "No check-ins", done: trackersTotal > 0 && trackersDone === trackersTotal, color: "#8FAE8B", bg: "#E8F5E9" },
    { icon: "list" as const, label: taskCount === 0 ? "No tasks" : `${taskCount} task${taskCount !== 1 ? "s" : ""}`, done: false, color: "#8B7EC8", bg: "#EEEBF7" },
    { icon: "calendar" as const, label: eventCount === 0 ? "Free day" : `${eventCount} event${eventCount !== 1 ? "s" : ""}`, done: false, color: "#89B4C8", bg: "#E0EEF5" },
    { icon: "book" as const, label: hasJournal ? "Journaled" : "Journal", done: !!hasJournal, color: "#C4A84D", bg: "#F5ECD7" },
  ];

  return (
    <View style={{ flexDirection: "row", marginHorizontal: 16, marginTop: 12, gap: 8 }}>
      {items.map((item) => (
        <View
          key={item.label}
          style={{
            flex: 1,
            backgroundColor: item.done ? item.bg : "#FFFFFF",
            borderRadius: 12,
            paddingVertical: 10,
            alignItems: "center",
            borderWidth: 1,
            borderColor: item.done ? item.color + "40" : "#F0EDE8",
          }}
        >
          <View style={{
            width: 28, height: 28, borderRadius: 14,
            backgroundColor: item.done ? item.color + "25" : item.bg,
            alignItems: "center", justifyContent: "center",
          }}>
            <Ionicons
              name={item.done ? "checkmark-circle" : (item.icon + "-outline") as any}
              size={16}
              color={item.done ? item.color : item.color + "90"}
            />
          </View>
          <Text
            style={{
              fontSize: 10,
              fontFamily: "PlusJakartaSans_500Medium",
              color: item.done ? item.color : "#8A8A8A",
              marginTop: 4,
              textAlign: "center",
            }}
            numberOfLines={1}
          >
            {item.label}
          </Text>
        </View>
      ))}
    </View>
  );
}

// ── Upcoming Session Card ────────────

function UpcomingSessionCard() {
  const { data } = useQuery({
    queryKey: ["upcoming-session"],
    queryFn: async () => {
      const res = await api.getUpcomingSession();
      if (!res.success) return null;
      return res.data;
    },
    staleTime: 60000,
  });

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
          <Text style={{ fontSize: 14, fontFamily: "PlusJakartaSans_600SemiBold", color: "#2D2D2D" }}>
            Upcoming Session
          </Text>
          <Text style={{ fontSize: 12, fontFamily: "PlusJakartaSans_400Regular", color: "#8A8A8A" }}>
            {dateStr} at {timeStr}
          </Text>
        </View>
      </View>
      {data.clinicianName && (
        <Text style={{ fontSize: 12, fontFamily: "PlusJakartaSans_400Regular", color: "#5A5A5A", marginBottom: 8 }}>
          with {data.clinicianName}
        </Text>
      )}
      {data.videoCallUrl && (
        <TouchableOpacity
          onPress={() => {}}
          style={{ backgroundColor: "#5B8A8A", borderRadius: 10, paddingVertical: 10, alignItems: "center" }}
          activeOpacity={0.8}
        >
          <Text style={{ color: "white", fontFamily: "PlusJakartaSans_600SemiBold", fontSize: 14 }}>
            Join Call
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

// ── Tasks + Calendar side-by-side ────────────

function TasksCalendarRow() {
  const today = new Date();
  const startOfDay = new Date(today);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(today);
  endOfDay.setHours(23, 59, 59, 999);

  const { data: tasks } = useQuery({
    queryKey: ["tasks"],
    queryFn: async () => {
      const res = await api.getTasks({ status: "TODO" });
      return res.success ? (res.data as any[]) || [] : [];
    },
    staleTime: 60000,
  });

  const { data: events } = useQuery({
    queryKey: ["calendar"],
    queryFn: async () => {
      const res = await api.getCalendarEvents(startOfDay.toISOString(), endOfDay.toISOString());
      return res.success ? (res.data as any[]) || [] : [];
    },
    staleTime: 60000,
  });

  const todoTasks = (tasks || []).slice(0, 3);
  const taskRemaining = (tasks || []).length - 3;
  const todayEvents = (events || []).slice(0, 3);
  const eventRemaining = (events || []).length - 3;

  return (
    <View style={{ marginHorizontal: 16, marginTop: 12, gap: 10 }}>
      {/* Tasks card */}
      <TouchableOpacity
        onPress={() => router.push("/(app)/(tabs)/tasks")}
        style={CARD}
        activeOpacity={0.7}
      >
        <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 10 }}>
          <View style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: "#8B7EC8", alignItems: "center", justifyContent: "center", marginRight: 10 }}>
            <Ionicons name="list-outline" size={16} color="#FFFFFF" />
          </View>
          <Text style={{ flex: 1, fontSize: 14, fontFamily: "PlusJakartaSans_600SemiBold", color: "#2D2D2D" }}>
            Tasks
          </Text>
          {todoTasks.length > 0 && (
            <View style={{ backgroundColor: "#8B7EC815", borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2 }}>
              <Text style={{ fontSize: 12, fontFamily: "PlusJakartaSans_600SemiBold", color: "#8B7EC8" }}>
                {tasks?.length || 0}
              </Text>
            </View>
          )}
          <Ionicons name="chevron-forward" size={18} color="#D4D0CB" style={{ marginLeft: 6 }} />
        </View>

        {todoTasks.length === 0 ? (
          <TouchableOpacity
            onPress={() => router.push("/(app)/(tabs)/tasks")}
            style={{
              backgroundColor: "#8B7EC810",
              borderWidth: 1,
              borderColor: "#8B7EC830",
              borderStyle: "dashed",
              borderRadius: 10,
              paddingVertical: 12,
              alignItems: "center",
              flexDirection: "row",
              justifyContent: "center",
              gap: 6,
            }}
            activeOpacity={0.6}
          >
            <Ionicons name="add-circle-outline" size={16} color="#8B7EC8" />
            <Text style={{ fontSize: 13, fontFamily: "PlusJakartaSans_500Medium", color: "#8B7EC8" }}>
              Add a task
            </Text>
          </TouchableOpacity>
        ) : (
          <View>
            {todoTasks.map((task: any, i: number) => (
              <View
                key={task.id}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  paddingVertical: 7,
                  borderTopWidth: i === 0 ? 0 : 1,
                  borderTopColor: "#F5F3F0",
                }}
              >
                <View style={{
                  width: 16, height: 16, borderRadius: 8,
                  borderWidth: 1.5, borderColor: "#D4D0CB",
                  marginRight: 10,
                }} />
                <Text
                  style={{ flex: 1, fontSize: 13, fontFamily: "PlusJakartaSans_400Regular", color: "#2D2D2D" }}
                  numberOfLines={1}
                >
                  {task.title}
                </Text>
              </View>
            ))}
            {taskRemaining > 0 && (
              <Text style={{ fontSize: 12, fontFamily: "PlusJakartaSans_500Medium", color: "#8B7EC8", marginTop: 2 }}>
                +{taskRemaining} more
              </Text>
            )}
          </View>
        )}
      </TouchableOpacity>

      {/* Calendar card */}
      <TouchableOpacity
        onPress={() => router.push("/(app)/(tabs)/calendar")}
        style={CARD}
        activeOpacity={0.7}
      >
        <View style={{ flexDirection: "row", alignItems: "center", marginBottom: todayEvents.length > 0 ? 10 : 0 }}>
          <View style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: "#89B4C8", alignItems: "center", justifyContent: "center", marginRight: 10 }}>
            <Ionicons name="calendar-outline" size={16} color="#FFFFFF" />
          </View>
          <Text style={{ flex: 1, fontSize: 14, fontFamily: "PlusJakartaSans_600SemiBold", color: "#2D2D2D" }}>
            Schedule
          </Text>
          {todayEvents.length > 0 && (
            <View style={{ backgroundColor: "#89B4C815", borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2 }}>
              <Text style={{ fontSize: 12, fontFamily: "PlusJakartaSans_600SemiBold", color: "#89B4C8" }}>
                {events?.length || 0}
              </Text>
            </View>
          )}
          <Ionicons name="chevron-forward" size={18} color="#D4D0CB" style={{ marginLeft: 6 }} />
        </View>

        {todayEvents.length === 0 ? (
          <View style={{
            backgroundColor: "#F7F5F2",
            borderRadius: 10,
            paddingVertical: 12,
            paddingHorizontal: 16,
            flexDirection: "row",
            alignItems: "center",
            gap: 8,
          }}>
            <Ionicons name="sunny-outline" size={16} color="#C4A84D" />
            <Text style={{ fontSize: 13, fontFamily: "PlusJakartaSans_400Regular", color: "#8A8A8A" }}>
              Nothing on the calendar today
            </Text>
          </View>
        ) : (
          <View>
            {todayEvents.map((event: any, i: number) => {
              const start = new Date(event.startTime);
              const timeStr = start.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
              return (
                <View
                  key={event.id}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    paddingVertical: 7,
                    borderTopWidth: i === 0 ? 0 : 1,
                    borderTopColor: "#F5F3F0",
                  }}
                >
                  <View style={{
                    width: 3, height: 24, borderRadius: 2,
                    backgroundColor: event.color || "#5B8A8A",
                    marginRight: 10,
                  }} />
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 13, fontFamily: "PlusJakartaSans_500Medium", color: "#2D2D2D" }} numberOfLines={1}>
                      {event.title}
                    </Text>
                    <Text style={{ fontSize: 11, fontFamily: "PlusJakartaSans_400Regular", color: "#8A8A8A" }}>
                      {timeStr}
                    </Text>
                  </View>
                </View>
              );
            })}
            {eventRemaining > 0 && (
              <Text style={{ fontSize: 12, fontFamily: "PlusJakartaSans_500Medium", color: "#89B4C8", marginTop: 2 }}>
                +{eventRemaining} more
              </Text>
            )}
          </View>
        )}
      </TouchableOpacity>
    </View>
  );
}

// ── Journal Prompt Card ────────────

function JournalCard() {
  const todayStr = new Date().toISOString().split("T")[0];

  const { data: entry } = useQuery({
    queryKey: ["journal"],
    queryFn: async () => {
      const res = await api.getJournalEntry(todayStr);
      if (!res.success) return null;
      return res.data;
    },
    staleTime: 60000,
  });

  const hasEntry = entry && (entry as any).freeformContent;

  return (
    <TouchableOpacity
      onPress={() => router.push("/(app)/(tabs)/journal")}
      style={{
        ...CARD,
        marginHorizontal: 16,
        marginTop: 12,
        backgroundColor: hasEntry ? "#FFFFFF" : "#F5ECD7",
        borderColor: hasEntry ? "#C3DCC3" : "#EDE2C0",
      }}
      activeOpacity={0.7}
    >
      <View style={{ flexDirection: "row", alignItems: "center" }}>
        <View style={{
          width: 36, height: 36, borderRadius: 10,
          backgroundColor: hasEntry ? "#E8F5E9" : "#FFFFFF50",
          alignItems: "center", justifyContent: "center", marginRight: 12,
        }}>
          {hasEntry ? (
            <Ionicons name="checkmark-circle" size={20} color="#8FAE8B" />
          ) : (
            <Ionicons name="book-outline" size={18} color="#C4A84D" />
          )}
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 14, fontFamily: "PlusJakartaSans_600SemiBold", color: hasEntry ? "#2D2D2D" : "#6B5B2D" }}>
            {hasEntry ? "Journal" : "How are you feeling today?"}
          </Text>
          <Text style={{ fontSize: 12, fontFamily: "PlusJakartaSans_400Regular", color: hasEntry ? "#8FAE8B" : "#9A8A5A", marginTop: 2 }}>
            {hasEntry ? "You journaled today — nice work" : "Take a moment to check in with yourself"}
          </Text>
        </View>
        {!hasEntry && (
          <View style={{
            backgroundColor: "#C4A84D",
            borderRadius: 10,
            paddingHorizontal: 14,
            paddingVertical: 7,
          }}>
            <Text style={{ fontSize: 12, fontFamily: "PlusJakartaSans_600SemiBold", color: "white" }}>
              Write
            </Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

// ── Program Progress Card ────────────

function ProgramProgressCard() {
  const { data: enrollments } = useQuery({
    queryKey: ["enrollments"],
    queryFn: async () => {
      const res = await api.getEnrollments();
      return res.success ? res.data : [];
    },
    staleTime: 60000,
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const active = enrollments?.find((e: any) => e.status === "ACTIVE");

  return (
    <TouchableOpacity
      onPress={() => router.push("/(app)/(tabs)/program")}
      style={{ ...CARD, marginHorizontal: 16, marginTop: 12 }}
      activeOpacity={0.7}
    >
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <View style={{ flexDirection: "row", alignItems: "center", flex: 1 }}>
          <View style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: "#5B8A8A", alignItems: "center", justifyContent: "center", marginRight: 10 }}>
            <Ionicons name="library-outline" size={16} color="#FFFFFF" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 14, fontFamily: "PlusJakartaSans_600SemiBold", color: "#2D2D2D" }}>
              {active ? active.program.title : "My Program"}
            </Text>
            <Text style={{ fontSize: 12, fontFamily: "PlusJakartaSans_400Regular", color: "#8A8A8A", marginTop: 2 }}>
              {active ? "Continue where you left off" : "No program yet"}
            </Text>
          </View>
        </View>
        <Ionicons name="chevron-forward" size={20} color="#D4D0CB" />
      </View>
    </TouchableOpacity>
  );
}

// ── Check-in Section (hides when all done — celebration is in WeeklyStreakWidget) ────

function CheckInSection() {
  const { data: trackers, isLoading } = useQuery<any[]>({
    queryKey: ["participant-daily-trackers"],
    queryFn: async () => {
      const res = await api.getDailyTrackers();
      if (!res.success) throw new Error(res.error);
      return res.data;
    },
    staleTime: 30000,
  });

  if (isLoading || !trackers || trackers.length === 0) return null;
  if (trackers.every((t: any) => t.completedToday)) return null;

  return (
    <View style={{ marginHorizontal: 16, marginTop: 12 }}>
      <DailyTrackerCards />
    </View>
  );
}

// ── Today View ────────────

export default function TodayScreen() {
  const { user } = useAuth();
  const { isModuleEnabled } = useConfig();
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    await queryClient.invalidateQueries();
    setRefreshing(false);
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: "#F7F5F2" }}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#5B8A8A" />
      }
    >
      {/* Greeting banner */}
      <View style={{
        marginHorizontal: 16,
        marginTop: 12,
        backgroundColor: "#5B8A8A",
        borderRadius: 20,
        padding: 20,
        paddingBottom: 18,
      }}>
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

      {/* Weekly streak */}
      <WeeklyStreakWidget />

      {/* Daily progress pills */}
      <DailyProgressSummary />

      {/* Daily Check-in — hide once all trackers are completed */}
      {isModuleEnabled("daily_tracker") && (
        <CheckInSection />
      )}

      {/* Upcoming Session */}
      <UpcomingSessionCard />

      {/* Due Homework */}
      {isModuleEnabled("homework") && (
        <TodaysHomeworkInstances />
      )}

      {/* Program Progress */}
      <ProgramProgressCard />

      {/* Tasks + Calendar */}
      <TasksCalendarRow />

      {/* Journal */}
      <JournalCard />

      {/* Bottom spacing */}
      <View style={{ height: 32 }} />
    </ScrollView>
  );
}
