import { View, Text, ScrollView, ActivityIndicator } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useMyInvoice, type InvoiceStatus } from "../../../hooks/use-invoices";

function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

function formatDate(isoDate: string | null): string {
  if (!isoDate) return "N/A";
  const d = new Date(isoDate);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function statusLabel(status: InvoiceStatus): { label: string; color: string } {
  switch (status) {
    case "SENT":
      return { label: "Sent", color: "#1565C0" };
    case "PAID":
      return { label: "Paid", color: "#2E7D32" };
    case "PARTIALLY_PAID":
      return { label: "Partially Paid", color: "#F57F17" };
    case "OVERDUE":
      return { label: "Overdue", color: "#C62828" };
    default:
      return { label: status, color: "#616161" };
  }
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={{ backgroundColor: "#fff", borderRadius: 12, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: "#E5E2DD" }}>
      <Text style={{ fontSize: 13, fontWeight: "700", color: "#8A8A8A", marginBottom: 10, textTransform: "uppercase", letterSpacing: 0.5 }}>
        {title}
      </Text>
      {children}
    </View>
  );
}

export default function InvoiceDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: invoice, isLoading, error } = useMyInvoice(id);

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#F7F5F2" }}>
        <ActivityIndicator size="large" color="#5B8A8A" />
      </View>
    );
  }

  if (error || !invoice) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#F7F5F2" }}>
        <Text style={{ color: "#D87D7D", fontSize: 14 }}>Unable to load invoice.</Text>
      </View>
    );
  }

  const status = statusLabel(invoice.status);
  const balanceCents = invoice.totalCents - invoice.paidCents;
  const clinicianName = invoice.clinician
    ? `${invoice.clinician.firstName ?? ""} ${invoice.clinician.lastName ?? ""}`.trim()
    : "Your clinician";

  return (
    <ScrollView style={{ flex: 1, backgroundColor: "#F7F5F2" }} contentContainerStyle={{ padding: 16 }}>
      {/* Header */}
      <Section title="Invoice Details">
        <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 8 }}>
          <Text style={{ fontSize: 17, fontWeight: "700", color: "#2D2D2D" }}>{invoice.invoiceNumber}</Text>
          <Text style={{ fontSize: 14, fontWeight: "600", color: status.color }}>{status.label}</Text>
        </View>
        <View style={{ gap: 4 }}>
          <Text style={{ fontSize: 13, color: "#8A8A8A" }}>Issued: {formatDate(invoice.issuedAt)}</Text>
          <Text style={{ fontSize: 13, color: "#8A8A8A" }}>Due: {formatDate(invoice.dueAt)}</Text>
          {clinicianName && (
            <Text style={{ fontSize: 13, color: "#8A8A8A" }}>Provider: {clinicianName}</Text>
          )}
        </View>
      </Section>

      {/* Line Items */}
      <Section title="Line Items">
        {invoice.lineItems.map((item) => (
          <View key={item.id} style={{ marginBottom: 10 }}>
            <Text style={{ fontSize: 14, fontWeight: "600", color: "#2D2D2D" }}>{item.description}</Text>
            <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 2 }}>
              <Text style={{ fontSize: 13, color: "#8A8A8A" }}>
                {item.quantity} x {formatCents(item.unitPriceCents)}
              </Text>
              <Text style={{ fontSize: 13, fontWeight: "600", color: "#2D2D2D" }}>
                {formatCents(item.totalCents)}
              </Text>
            </View>
          </View>
        ))}
      </Section>

      {/* Totals */}
      <Section title="Summary">
        <View style={{ gap: 6 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
            <Text style={{ fontSize: 14, color: "#8A8A8A" }}>Subtotal</Text>
            <Text style={{ fontSize: 14, color: "#2D2D2D" }}>{formatCents(invoice.subtotalCents)}</Text>
          </View>
          {invoice.taxCents > 0 && (
            <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
              <Text style={{ fontSize: 14, color: "#8A8A8A" }}>Tax</Text>
              <Text style={{ fontSize: 14, color: "#2D2D2D" }}>{formatCents(invoice.taxCents)}</Text>
            </View>
          )}
          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
            <Text style={{ fontSize: 14, fontWeight: "700", color: "#2D2D2D" }}>Total</Text>
            <Text style={{ fontSize: 14, fontWeight: "700", color: "#2D2D2D" }}>{formatCents(invoice.totalCents)}</Text>
          </View>
          {invoice.paidCents > 0 && (
            <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
              <Text style={{ fontSize: 14, color: "#2E7D32" }}>Paid</Text>
              <Text style={{ fontSize: 14, color: "#2E7D32" }}>{formatCents(invoice.paidCents)}</Text>
            </View>
          )}
          <View style={{ height: 1, backgroundColor: "#E5E2DD", marginVertical: 4 }} />
          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
            <Text style={{ fontSize: 15, fontWeight: "700", color: balanceCents > 0 ? "#C62828" : "#2E7D32" }}>
              Balance Due
            </Text>
            <Text style={{ fontSize: 15, fontWeight: "700", color: balanceCents > 0 ? "#C62828" : "#2E7D32" }}>
              {formatCents(balanceCents)}
            </Text>
          </View>
        </View>
      </Section>

      {/* Payments */}
      <Section title="Payments">
        {invoice.payments.length === 0 ? (
          <Text style={{ fontSize: 13, color: "#8A8A8A", fontStyle: "italic" }}>No payments recorded</Text>
        ) : (
          invoice.payments.map((payment) => (
            <View key={payment.id} style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 6 }}>
              <Text style={{ fontSize: 13, color: "#2D2D2D" }}>
                {formatDate(payment.receivedAt)} ({payment.method})
              </Text>
              <Text style={{ fontSize: 13, fontWeight: "600", color: "#2E7D32" }}>
                {formatCents(payment.amountCents)}
              </Text>
            </View>
          ))
        )}
      </Section>

      {/* Contact notice */}
      <View style={{ backgroundColor: "#E3F2FD", borderRadius: 12, padding: 16, alignItems: "center" }}>
        <Ionicons name="chatbubble-ellipses-outline" size={24} color="#1565C0" />
        <Text style={{ fontSize: 14, color: "#1565C0", textAlign: "center", marginTop: 8, lineHeight: 20 }}>
          Contact your clinician to arrange payment.
        </Text>
      </View>

      <View style={{ height: 32 }} />
    </ScrollView>
  );
}
