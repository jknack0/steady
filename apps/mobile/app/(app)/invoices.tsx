import { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import {
  useMyInvoices,
  type ParticipantInvoiceListItem,
  type InvoiceStatus,
} from "../../hooks/use-invoices";

// ── Status visual mapping ────────────

interface StatusVisual {
  bg: string;
  text: string;
  label: string;
}

function statusVisual(status: InvoiceStatus): StatusVisual {
  switch (status) {
    case "SENT":
      return { bg: "#E3F2FD", text: "#1565C0", label: "Sent" };
    case "PAID":
      return { bg: "#E8F5E9", text: "#2E7D32", label: "Paid" };
    case "PARTIALLY_PAID":
      return { bg: "#FFF8E1", text: "#F57F17", label: "Partial" };
    case "OVERDUE":
      return { bg: "#FFEBEE", text: "#C62828", label: "Overdue" };
    default:
      return { bg: "#F5F5F5", text: "#616161", label: status };
  }
}

function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

function formatDate(isoDate: string | null): string {
  if (!isoDate) return "";
  const d = new Date(isoDate);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

// ── Components ──────────────────────

function StatusBadge({ status }: { status: InvoiceStatus }) {
  const visual = statusVisual(status);
  return (
    <View style={{ backgroundColor: visual.bg, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 }}>
      <Text style={{ fontSize: 11, fontWeight: "600", color: visual.text }}>{visual.label}</Text>
    </View>
  );
}

function InvoiceCard({ invoice, onPress }: { invoice: ParticipantInvoiceListItem; onPress: () => void }) {
  const clinicianName = invoice.clinician
    ? `${invoice.clinician.firstName ?? ""} ${invoice.clinician.lastName ?? ""}`.trim()
    : "";

  return (
    <TouchableOpacity
      onPress={onPress}
      style={{
        backgroundColor: "#fff",
        borderRadius: 12,
        padding: 16,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: "#E5E2DD",
      }}
    >
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <Text style={{ fontSize: 15, fontWeight: "700", color: "#2D2D2D" }}>
          {invoice.invoiceNumber}
        </Text>
        <Text style={{ fontSize: 16, fontWeight: "700", color: "#2D2D2D" }}>
          {formatCents(invoice.totalCents)}
        </Text>
      </View>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 6 }}>
        <Text style={{ fontSize: 13, color: "#8A8A8A" }}>
          {formatDate(invoice.issuedAt)}
          {clinicianName ? ` \u00b7 ${clinicianName}` : ""}
        </Text>
        <StatusBadge status={invoice.status} />
      </View>
      {invoice.paidCents > 0 && invoice.paidCents < invoice.totalCents && (
        <Text style={{ fontSize: 12, color: "#F57F17", marginTop: 4 }}>
          Balance: {formatCents(invoice.totalCents - invoice.paidCents)}
        </Text>
      )}
    </TouchableOpacity>
  );
}

// ── Screen ──────────────────────────

type FilterTab = "all" | "unpaid" | "paid";

export default function InvoicesScreen() {
  const router = useRouter();
  const { data, isLoading, error, refetch } = useMyInvoices();
  const [filter, setFilter] = useState<FilterTab>("all");
  const [refreshing, setRefreshing] = useState(false);

  const filteredData = data.filter((inv) => {
    if (filter === "unpaid") return inv.status === "SENT" || inv.status === "OVERDUE" || inv.status === "PARTIALLY_PAID";
    if (filter === "paid") return inv.status === "PAID";
    return true;
  });

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#F7F5F2" }}>
      {/* Filter Chips */}
      <View style={{ flexDirection: "row", padding: 16, paddingBottom: 8, gap: 8 }}>
        {(["all", "unpaid", "paid"] as FilterTab[]).map((tab) => (
          <TouchableOpacity
            key={tab}
            onPress={() => setFilter(tab)}
            style={{
              paddingHorizontal: 14,
              paddingVertical: 6,
              borderRadius: 16,
              backgroundColor: filter === tab ? "#5B8A8A" : "#E5E2DD",
            }}
          >
            <Text
              style={{
                fontSize: 13,
                fontWeight: "600",
                color: filter === tab ? "#fff" : "#5A5A5A",
                textTransform: "capitalize",
              }}
            >
              {tab}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 16, paddingTop: 8 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
      >
        {isLoading && !refreshing && (
          <View style={{ padding: 40, alignItems: "center" }}>
            <ActivityIndicator size="large" color="#5B8A8A" />
          </View>
        )}

        {error && (
          <View style={{ padding: 40, alignItems: "center" }}>
            <Text style={{ color: "#D87D7D", fontSize: 14 }}>Unable to load invoices. Pull to refresh.</Text>
          </View>
        )}

        {!isLoading && !error && filteredData.length === 0 && (
          <View style={{ padding: 40, alignItems: "center" }}>
            <Ionicons name="document-text-outline" size={48} color="#C4C0BB" />
            <Text style={{ color: "#8A8A8A", fontSize: 15, marginTop: 12 }}>No invoices yet</Text>
          </View>
        )}

        {filteredData.map((invoice) => (
          <InvoiceCard
            key={invoice.id}
            invoice={invoice}
            onPress={() => router.push(`/(app)/invoices/${invoice.id}`)}
          />
        ))}
      </ScrollView>
    </View>
  );
}
