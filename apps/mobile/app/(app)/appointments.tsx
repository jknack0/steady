import { useState, useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  useMyAppointments,
  type ParticipantAppointment,
  type ParticipantAppointmentStatus,
} from "../../hooks/use-appointments";

// ── Status visual mapping ────────────

interface StatusVisual {
  dot: string;
  label: string;
}

function statusVisual(status: ParticipantAppointmentStatus): StatusVisual {
  switch (status) {
    case "SCHEDULED":
      return { dot: "#5B8A8A", label: "Scheduled" };
    case "ATTENDED":
      return { dot: "#8FAE8B", label: "Attended" };
    case "NO_SHOW":
      return { dot: "#C75A5A", label: "Missed" };
    case "LATE_CANCELED":
      return { dot: "#B0ACA5", label: "Late canceled" };
    case "CLIENT_CANCELED":
      return { dot: "#B0ACA5", label: "Canceled" };
    case "CLINICIAN_CANCELED":
      return { dot: "#B0ACA5", label: "Canceled by clinician" };
    default:
      return { dot: "#B0ACA5", label: status };
  }
}

// ── Date helpers ────────────

function startOfLocalDay(d: Date): Date {
  const out = new Date(d);
  out.setHours(0, 0, 0, 0);
  return out;
}

function dayKey(d: Date): string {
  // YYYY-MM-DD in local TZ
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function relativeDayLabel(d: Date): string {
  const today = startOfLocalDay(new Date());
  const target = startOfLocalDay(d);
  const diffDays = Math.round(
    (target.getTime() - today.getTime()) / (24 * 60 * 60 * 1000),
  );
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Tomorrow";
  if (diffDays === -1) return "Yesterday";
  if (diffDays > 1 && diffDays < 7) {
    return d.toLocaleDateString(undefined, { weekday: "long" });
  }
  return d.toLocaleDateString(undefined, {
    weekday: "long",
    month: "short",
    day: "numeric",
  });
}

function formatTime(d: Date): string {
  return d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

// ── Appointment card ────────────

function AppointmentCard({ appt }: { appt: ParticipantAppointment }) {
  const start = new Date(appt.startAt);
  const end = new Date(appt.endAt);
  const visual = statusVisual(appt.status);
  const clinicianName = appt.clinician
    ? `Dr. ${appt.clinician.lastName ?? ""}`.trim()
    : "Your clinician";
  const fullClinicianName = appt.clinician
    ? `${appt.clinician.firstName ?? ""} ${appt.clinician.lastName ?? ""}`.trim()
    : "Your clinician";
  const serviceLabel = appt.serviceCode
    ? `${appt.serviceCode.description}`
    : "Session";
  const isVirtual = appt.location?.type === "VIRTUAL";
  const locationLabel = appt.location
    ? isVirtual
      ? "Video visit"
      : appt.location.name
    : "";
  const addressLine =
    !isVirtual && appt.location?.addressLine1
      ? [appt.location.addressLine1, appt.location.city, appt.location.state]
          .filter(Boolean)
          .join(", ")
      : null;

  const a11yLabel = `${visual.label}, ${fullClinicianName}, ${relativeDayLabel(
    start,
  )} at ${formatTime(start)}, ${serviceLabel}, ${locationLabel}`;

  return (
    <View
      accessible
      accessibilityLabel={a11yLabel}
      style={{
        backgroundColor: "#FFFFFF",
        borderRadius: 16,
        padding: 16,
        marginHorizontal: 16,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: "#F0EDE8",
      }}
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          marginBottom: 8,
        }}
      >
        <View
          style={{
            width: 10,
            height: 10,
            borderRadius: 5,
            backgroundColor: visual.dot,
            marginRight: 8,
          }}
        />
        <Text
          style={{
            fontSize: 12,
            fontFamily: "PlusJakartaSans_600SemiBold",
            color: visual.dot,
            textTransform: "uppercase",
            letterSpacing: 0.5,
          }}
        >
          {visual.label}
        </Text>
        <View style={{ flex: 1 }} />
        <Text
          style={{
            fontSize: 13,
            fontFamily: "PlusJakartaSans_600SemiBold",
            color: "#2D2D2D",
          }}
        >
          {formatTime(start)} – {formatTime(end)}
        </Text>
      </View>

      <Text
        style={{
          fontSize: 16,
          fontFamily: "PlusJakartaSans_700Bold",
          color: "#2D2D2D",
          marginBottom: 2,
        }}
      >
        {serviceLabel}
      </Text>

      <Text
        style={{
          fontSize: 13,
          fontFamily: "PlusJakartaSans_500Medium",
          color: "#5A5A5A",
          marginBottom: 8,
        }}
      >
        with {fullClinicianName}
      </Text>

      <View style={{ flexDirection: "row", alignItems: "center" }}>
        <Ionicons
          name={isVirtual ? "videocam-outline" : "location-outline"}
          size={14}
          color="#8A8A8A"
          style={{ marginRight: 6 }}
        />
        <Text
          style={{
            fontSize: 12,
            fontFamily: "PlusJakartaSans_400Regular",
            color: "#8A8A8A",
            flex: 1,
          }}
          numberOfLines={2}
        >
          {locationLabel}
          {addressLine ? ` · ${addressLine}` : ""}
        </Text>
      </View>
    </View>
  );
}

// ── Grouped list ────────────

interface DayGroup {
  key: string;
  label: string;
  items: ParticipantAppointment[];
}

function groupByDay(items: ParticipantAppointment[]): DayGroup[] {
  const map = new Map<string, DayGroup>();
  for (const appt of items) {
    const start = new Date(appt.startAt);
    const key = dayKey(start);
    if (!map.has(key)) {
      map.set(key, { key, label: relativeDayLabel(start), items: [] });
    }
    map.get(key)!.items.push(appt);
  }
  return Array.from(map.values());
}

// ── Screen ────────────

export default function AppointmentsScreen() {
  const [refreshing, setRefreshing] = useState(false);
  const { data, isLoading, error, refetch } = useMyAppointments();

  const groups = useMemo(() => groupByDay(data), [data]);

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  if (isLoading) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: "#F7F5F2",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <ActivityIndicator size="large" color="#5B8A8A" />
      </View>
    );
  }

  if (error) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: "#F7F5F2",
          alignItems: "center",
          justifyContent: "center",
          padding: 24,
        }}
      >
        <Ionicons name="cloud-offline-outline" size={48} color="#B0ACA5" />
        <Text
          style={{
            marginTop: 12,
            fontSize: 15,
            fontFamily: "PlusJakartaSans_600SemiBold",
            color: "#2D2D2D",
            textAlign: "center",
          }}
        >
          Couldn't load your appointments.
        </Text>
        <TouchableOpacity
          onPress={() => refetch()}
          accessibilityLabel="Retry loading appointments"
          style={{
            marginTop: 16,
            backgroundColor: "#5B8A8A",
            borderRadius: 10,
            paddingHorizontal: 20,
            paddingVertical: 10,
          }}
        >
          <Text
            style={{
              color: "white",
              fontFamily: "PlusJakartaSans_600SemiBold",
              fontSize: 14,
            }}
          >
            Tap to retry
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (groups.length === 0) {
    return (
      <ScrollView
        style={{ flex: 1, backgroundColor: "#F7F5F2" }}
        contentContainerStyle={{
          flexGrow: 1,
          alignItems: "center",
          justifyContent: "center",
          padding: 32,
        }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#5B8A8A"
          />
        }
      >
        <View
          style={{
            width: 64,
            height: 64,
            borderRadius: 20,
            backgroundColor: "#E8EEEE",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 16,
          }}
        >
          <Ionicons name="calendar-outline" size={32} color="#5B8A8A" />
        </View>
        <Text
          style={{
            fontSize: 17,
            fontFamily: "PlusJakartaSans_700Bold",
            color: "#2D2D2D",
            marginBottom: 6,
          }}
        >
          No upcoming appointments
        </Text>
        <Text
          style={{
            fontSize: 13,
            fontFamily: "PlusJakartaSans_400Regular",
            color: "#8A8A8A",
            textAlign: "center",
          }}
        >
          Your clinician will schedule with you.
        </Text>
      </ScrollView>
    );
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: "#F7F5F2" }}
      contentContainerStyle={{ paddingVertical: 16 }}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor="#5B8A8A"
        />
      }
    >
      {groups.map((group) => (
        <View key={group.key} style={{ marginBottom: 8 }}>
          <Text
            style={{
              marginHorizontal: 16,
              marginBottom: 8,
              fontSize: 13,
              fontFamily: "PlusJakartaSans_700Bold",
              color: "#5B8A8A",
              textTransform: "uppercase",
              letterSpacing: 0.5,
            }}
          >
            {group.label}
          </Text>
          {group.items.map((appt) => (
            <AppointmentCard key={appt.id} appt={appt} />
          ))}
        </View>
      ))}
      <View style={{ height: 24 }} />
    </ScrollView>
  );
}
