import { useState, useMemo, useEffect, useCallback } from "react";
import { View, TouchableOpacity, ActivityIndicator } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { api } from "../../../lib/api";

import { SegmentedControl } from "../../../components/calendar/segmented-control";
import { NavigationRow } from "../../../components/calendar/navigation-row";
import { DayPills } from "../../../components/calendar/day-pills";
import { MonthView } from "../../../components/calendar/month-view";
import { WeekTimeGrid } from "../../../components/calendar/week-time-grid";
import { DayView } from "../../../components/calendar/day-view";
import { MiniAgendaSheet } from "../../../components/calendar/mini-agenda-sheet";
import { CreateEventModal } from "../../../components/calendar/create-event-modal";
import { TEAL, BG_PAGE, BG_CARD, GRID_LINE_COLOR } from "../../../components/calendar/constants";
import {
  type ViewMode,
  type CalendarEvent,
  getViewDateRange,
  getAdjacentPeriodRange,
  formatPeriodLabel,
  groupEventsByDate,
  getEventsForDay,
  getWeekDates,
  addDays,
  addWeeks,
  addMonths,
} from "../../../components/calendar/helpers";

const STALE_TIME = 5 * 60 * 1000;
const GC_TIME = 30 * 60 * 1000;

export default function CalendarScreen() {
  const queryClient = useQueryClient();
  const { date: dateParam } = useLocalSearchParams<{ date?: string }>();

  const [viewMode, setViewMode] = useState<ViewMode>("week");
  const [anchorDate, setAnchorDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
  const [agendaDate, setAgendaDate] = useState<Date | null>(null);
  const [showAdd, setShowAdd] = useState(false);

  useEffect(() => {
    if (dateParam) {
      const d = new Date(dateParam);
      setAnchorDate(d);
      setSelectedDate(d);
    }
  }, [dateParam]);

  // Date range for current view
  const dateRange = useMemo(
    () => getViewDateRange(viewMode, anchorDate),
    [viewMode, anchorDate.toDateString()],
  );

  // Primary query
  const {
    data: events,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ["calendar", dateRange.start.toISOString(), dateRange.end.toISOString()],
    queryFn: async () => {
      const res = await api.getCalendarEvents(
        dateRange.start.toISOString(),
        dateRange.end.toISOString(),
      );
      if (!res.success) throw new Error(res.error);
      return res.data as CalendarEvent[];
    },
    staleTime: STALE_TIME,
    gcTime: GC_TIME,
  });

  // Prefetch adjacent periods
  useEffect(() => {
    const { prev, next } = getAdjacentPeriodRange(viewMode, anchorDate);
    const fetchRange = (range: { start: Date; end: Date }) =>
      api
        .getCalendarEvents(range.start.toISOString(), range.end.toISOString())
        .then((r) => {
          if (!r.success) throw new Error(r.error);
          return r.data;
        });

    queryClient.prefetchQuery({
      queryKey: ["calendar", prev.start.toISOString(), prev.end.toISOString()],
      queryFn: () => fetchRange(prev),
      staleTime: STALE_TIME,
    });
    queryClient.prefetchQuery({
      queryKey: ["calendar", next.start.toISOString(), next.end.toISOString()],
      queryFn: () => fetchRange(next),
      staleTime: STALE_TIME,
    });
  }, [viewMode, anchorDate.toDateString()]);

  // Group events by date
  const eventsByDate = useMemo(
    () => groupEventsByDate(events || []),
    [events],
  );

  // Day events for day view
  const dayEvents = useMemo(() => {
    if (!events || !selectedDate) return [];
    return getEventsForDay(events, selectedDate);
  }, [events, selectedDate?.toDateString()]);

  // Agenda events
  const agendaEvents = useMemo(() => {
    if (!events || !agendaDate) return [];
    return getEventsForDay(events, agendaDate);
  }, [events, agendaDate?.toDateString()]);

  // Week dates for day pills
  const weekDates = useMemo(
    () => getWeekDates(anchorDate),
    [anchorDate.toDateString()],
  );

  // Navigation
  const navigatePeriod = useCallback(
    (dir: number) => {
      setSelectedDate(null);
      switch (viewMode) {
        case "day":
          setAnchorDate((d) => addDays(d, dir));
          break;
        case "week":
          setAnchorDate((d) => addWeeks(d, dir));
          break;
        case "month":
          setAnchorDate((d) => addMonths(d, dir));
          break;
      }
    },
    [viewMode],
  );

  const goToToday = useCallback(() => {
    const today = new Date();
    setAnchorDate(today);
    setSelectedDate(today);
  }, []);

  const handleViewChange = useCallback((mode: ViewMode) => {
    setViewMode(mode);
    // Anchor stays — view re-renders around the same date
  }, []);

  const handleDayPress = useCallback(
    (date: Date) => {
      if (viewMode === "day") {
        setSelectedDate(date);
        setAnchorDate(date);
      } else {
        // Open mini agenda sheet in week/month views
        setSelectedDate(date);
        setAgendaDate(date);
      }
    },
    [viewMode],
  );

  const handleAgendaEventPress = useCallback((event: CalendarEvent) => {
    const d = new Date(event.startTime);
    setAgendaDate(null);
    setViewMode("day");
    setAnchorDate(d);
    setSelectedDate(d);
  }, []);

  // Mutations
  const createMutation = useMutation({
    mutationFn: async (data: { title: string; startHour: number; durationMinutes: number }) => {
      const date = selectedDate || anchorDate;
      const start = new Date(date);
      start.setHours(data.startHour, 0, 0, 0);
      const end = new Date(start.getTime() + data.durationMinutes * 60000);
      const res = await api.createCalendarEvent({
        title: data.title,
        startTime: start.toISOString(),
        endTime: end.toISOString(),
        eventType: "TIME_BLOCK",
      });
      if (!res.success) throw new Error(res.error);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["calendar"] });
      setShowAdd(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await api.deleteCalendarEvent(id);
      if (!res.success) throw new Error(res.error);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["calendar"] });
    },
  });

  const periodLabel = formatPeriodLabel(viewMode, anchorDate);

  if (isLoading && !events) {
    return (
      <View testID="calendar-loading" style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: BG_PAGE }}>
        <ActivityIndicator size="large" color={TEAL} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: BG_PAGE }}>
      {/* Header */}
      <View
        style={{
          backgroundColor: BG_CARD,
          paddingHorizontal: 16,
          paddingTop: 8,
          paddingBottom: 12,
          borderBottomWidth: 1,
          borderBottomColor: GRID_LINE_COLOR,
        }}
      >
        <SegmentedControl value={viewMode} onChange={handleViewChange} />
        <NavigationRow
          label={periodLabel}
          onPrev={() => navigatePeriod(-1)}
          onNext={() => navigatePeriod(1)}
          onToday={goToToday}
        />
        {viewMode === "day" && (
          <DayPills
            weekDates={weekDates}
            selectedDate={selectedDate}
            onDayPress={(d) => {
              setSelectedDate(d);
              setAnchorDate(d);
            }}
          />
        )}
      </View>

      {/* View content */}
      {viewMode === "month" && (
        <MonthView
          anchorDate={anchorDate}
          selectedDate={selectedDate}
          eventsByDate={eventsByDate}
          onDayPress={handleDayPress}
        />
      )}
      {viewMode === "week" && (
        <WeekTimeGrid
          anchorDate={anchorDate}
          eventsByDate={eventsByDate}
          onDayPress={handleDayPress}
          onEventPress={(e) => handleAgendaEventPress(e)}
        />
      )}
      {viewMode === "day" && (
        <DayView
          selectedDate={selectedDate || anchorDate}
          events={dayEvents}
          isLoading={isLoading}
          onRefresh={() => refetch()}
          onDeleteEvent={(id) => deleteMutation.mutate(id)}
        />
      )}

      {/* FAB — day view only */}
      {viewMode === "day" && (
        <TouchableOpacity
          testID="create-event-fab"
          style={{
            position: "absolute",
            bottom: 24,
            right: 24,
            width: 56,
            height: 56,
            borderRadius: 18,
            backgroundColor: TEAL,
            alignItems: "center",
            justifyContent: "center",
            shadowColor: TEAL,
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 8,
            elevation: 6,
          }}
          onPress={() => setShowAdd(true)}
          activeOpacity={0.8}
        >
          <Ionicons name="add" size={28} color="white" />
        </TouchableOpacity>
      )}

      {/* Mini Agenda Sheet */}
      <MiniAgendaSheet
        visible={agendaDate !== null}
        date={agendaDate}
        events={agendaEvents}
        onEventPress={handleAgendaEventPress}
        onClose={() => setAgendaDate(null)}
      />

      {/* Create Event Modal */}
      <CreateEventModal
        visible={showAdd}
        onClose={() => setShowAdd(false)}
        onSubmit={(data) => createMutation.mutate(data)}
      />
    </View>
  );
}
