import { View, Text, ScrollView, ActivityIndicator, Dimensions } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { LineChart, BarChart, ContributionGraph } from "react-native-chart-kit";
import { api } from "../../lib/api";

const screenWidth = Dimensions.get("window").width - 40;

// Earth tone palette
const colors = {
  teal: "#5B8A8A",
  tealLight: "#7BA3A3",
  sage: "#8FAE8B",
  rose: "#D4A0A0",
  cream: "#F5ECD7",
  warm50: "#F7F5F2",
  warm100: "#F0EDE8",
  warm300: "#8A8A8A",
  warm500: "#2D2D2D",
};

const chartConfig = {
  backgroundGradientFrom: "#FFFFFF",
  backgroundGradientTo: "#FFFFFF",
  color: (opacity = 1) => `rgba(91, 138, 138, ${opacity})`,
  labelColor: (opacity = 1) => `rgba(138, 138, 138, ${opacity})`,
  propsForDots: {
    r: "4",
    strokeWidth: "2",
    stroke: "#5B8A8A",
  },
  propsForBackgroundLines: {
    stroke: "#F0EDE8",
  },
  decimalPlaces: 0,
  barPercentage: 0.6,
};

export default function InsightsScreen() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["my-stats"],
    queryFn: async () => {
      const res = await api.getMyStats();
      if (!res.success) throw new Error(res.error);
      return res.data;
    },
  });

  if (isLoading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.warm50 }}>
        <ActivityIndicator size="large" color={colors.teal} />
      </View>
    );
  }

  if (isError || !data) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.warm50, paddingHorizontal: 32 }}>
        <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: "#F5E6E6", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
          <Ionicons name="analytics-outline" size={28} color={colors.rose} />
        </View>
        <Text style={{ fontSize: 18, fontFamily: "PlusJakartaSans_600SemiBold", color: colors.warm500 }}>
          Couldn't load insights
        </Text>
        <Text style={{ fontSize: 14, fontFamily: "PlusJakartaSans_400Regular", color: colors.warm300, textAlign: "center", marginTop: 4 }}>
          Check your connection and try again.
        </Text>
      </View>
    );
  }

  const stats = data as any;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.warm50 }} contentContainerStyle={{ padding: 20, paddingBottom: 100 }}>
      {/* Summary Cards */}
      <View style={{ flexDirection: "row", gap: 12, marginBottom: 20 }}>
        <SummaryCard
          icon="checkmark-circle-outline"
          label="Tasks"
          value={`${Math.round(stats.taskCompletion.rate * 100)}%`}
          color={stats.taskCompletion.rate >= 0.5 ? colors.sage : colors.rose}
        />
        <SummaryCard
          icon="book-outline"
          label="Journal"
          value={`${Math.round(stats.journaling.rate * 100)}%`}
          color={stats.journaling.rate >= 0.4 ? colors.sage : colors.rose}
        />
        <SummaryCard
          icon="heart-outline"
          label="Avg Score"
          value={stats.regulationTrend.average !== null ? `${stats.regulationTrend.average}` : "—"}
          color={stats.regulationTrend.average && stats.regulationTrend.average >= 5 ? colors.sage : colors.rose}
        />
      </View>

      {/* Task Completion Bar Chart */}
      {stats.taskCompletion.weeklyBreakdown.length > 0 && (
        <ChartCard title="Task Completion" subtitle="Weekly breakdown">
          <BarChart
            data={{
              labels: stats.taskCompletion.weeklyBreakdown.map((w: any) => {
                const d = new Date(w.weekStart);
                return `${d.getMonth() + 1}/${d.getDate()}`;
              }),
              datasets: [
                {
                  data: stats.taskCompletion.weeklyBreakdown.map((w: any) => w.completed),
                },
              ],
            }}
            width={screenWidth - 24}
            height={180}
            chartConfig={chartConfig}
            style={{ borderRadius: 12 }}
            fromZero
            showValuesOnTopOfBars
          />
        </ChartCard>
      )}

      {/* Regulation Trend Line Chart */}
      {stats.regulationTrend.points.length > 1 && (
        <ChartCard
          title="Regulation Trend"
          subtitle={stats.regulationTrend.average !== null ? `Average: ${stats.regulationTrend.average}/10` : undefined}
        >
          <LineChart
            data={{
              labels: stats.regulationTrend.points
                .filter((_: any, i: number) => i % Math.max(1, Math.floor(stats.regulationTrend.points.length / 6)) === 0)
                .map((p: any) => {
                  const d = new Date(p.date);
                  return `${d.getMonth() + 1}/${d.getDate()}`;
                }),
              datasets: [
                {
                  data: stats.regulationTrend.points.map((p: any) => p.score),
                },
              ],
            }}
            width={screenWidth - 24}
            height={200}
            chartConfig={{
              ...chartConfig,
              color: (opacity = 1) => `rgba(143, 174, 139, ${opacity})`,
              propsForDots: { r: "3", strokeWidth: "2", stroke: "#8FAE8B" },
            }}
            style={{ borderRadius: 12 }}
            bezier
          />
        </ChartCard>
      )}

      {/* Journaling Consistency */}
      <ChartCard
        title="Journaling Consistency"
        subtitle={`${stats.journaling.journaledDays}/${stats.journaling.totalDays} days${stats.journaling.streak > 0 ? ` · ${stats.journaling.streak}-day streak` : ""}`}
      >
        <JournalHeatmap calendar={stats.journaling.calendar} />
      </ChartCard>

      {/* Homework Progress */}
      {stats.homeworkCompletion.modules.length > 0 && (
        <ChartCard
          title="Homework Progress"
          subtitle={`${stats.homeworkCompletion.overall.completedParts}/${stats.homeworkCompletion.overall.totalParts} completed`}
        >
          <View style={{ gap: 12 }}>
            {stats.homeworkCompletion.modules.map((mod: any) => (
              <View key={mod.moduleId}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 4 }}>
                  <Text style={{ fontSize: 13, fontFamily: "PlusJakartaSans_500Medium", color: colors.warm500 }} numberOfLines={1}>
                    {mod.moduleTitle}
                  </Text>
                  <Text style={{ fontSize: 12, fontFamily: "PlusJakartaSans_400Regular", color: colors.warm300 }}>
                    {mod.completedParts}/{mod.totalParts}
                  </Text>
                </View>
                <View style={{ height: 8, backgroundColor: colors.warm100, borderRadius: 4, overflow: "hidden" }}>
                  <View
                    style={{
                      height: "100%",
                      width: `${Math.round(mod.rate * 100)}%`,
                      backgroundColor: mod.rate >= 0.7 ? colors.sage : mod.rate >= 0.3 ? colors.cream : colors.rose,
                      borderRadius: 4,
                    }}
                  />
                </View>
              </View>
            ))}
          </View>
        </ChartCard>
      )}

      {/* System Check-in */}
      <View style={{
        backgroundColor: "#FFFFFF",
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: colors.warm100,
      }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <View>
            <Text style={{ fontSize: 14, fontFamily: "PlusJakartaSans_600SemiBold", color: colors.warm500 }}>
              System Check-in
            </Text>
            <Text style={{ fontSize: 12, fontFamily: "PlusJakartaSans_400Regular", color: colors.warm300, marginTop: 2 }}>
              {stats.systemCheckin.totalCompleted}/{stats.systemCheckin.totalExpected} days active
            </Text>
          </View>
          <View style={{
            width: 56,
            height: 56,
            borderRadius: 28,
            borderWidth: 4,
            borderColor: stats.systemCheckin.rate >= 0.5 ? colors.sage : colors.rose,
            alignItems: "center",
            justifyContent: "center",
          }}>
            <Text style={{ fontSize: 16, fontFamily: "PlusJakartaSans_700Bold", color: colors.warm500 }}>
              {Math.round(stats.systemCheckin.rate * 100)}%
            </Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

// ── Sub-components ───────────────────────────────────────

function SummaryCard({
  icon,
  label,
  value,
  color,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  color: string;
}) {
  return (
    <View style={{
      flex: 1,
      backgroundColor: "#FFFFFF",
      borderRadius: 16,
      padding: 14,
      borderWidth: 1,
      borderColor: colors.warm100,
      alignItems: "center",
    }}>
      <Ionicons name={icon} size={20} color={color} />
      <Text style={{ fontSize: 20, fontFamily: "PlusJakartaSans_700Bold", color: colors.warm500, marginTop: 4 }}>
        {value}
      </Text>
      <Text style={{ fontSize: 11, fontFamily: "PlusJakartaSans_500Medium", color: colors.warm300 }}>
        {label}
      </Text>
    </View>
  );
}

function ChartCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <View style={{
      backgroundColor: "#FFFFFF",
      borderRadius: 16,
      padding: 16,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: colors.warm100,
    }}>
      <Text style={{ fontSize: 14, fontFamily: "PlusJakartaSans_600SemiBold", color: colors.warm500, marginBottom: 2 }}>
        {title}
      </Text>
      {subtitle && (
        <Text style={{ fontSize: 12, fontFamily: "PlusJakartaSans_400Regular", color: colors.warm300, marginBottom: 12 }}>
          {subtitle}
        </Text>
      )}
      {children}
    </View>
  );
}

function JournalHeatmap({
  calendar,
}: {
  calendar: Array<{ date: string; hasEntry: boolean; regulationScore: number | null }>;
}) {
  const entryMap = new Map(calendar.map((c) => [c.date, c]));
  const weeks: Array<Array<{ date: string; entry: (typeof calendar)[0] | null }>> = [];

  const start = new Date();
  start.setDate(start.getDate() - 27);

  let currentWeek: Array<{ date: string; entry: (typeof calendar)[0] | null }> = [];
  for (let i = 0; i < 28; i++) {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    const dateStr = d.toISOString().split("T")[0];
    currentWeek.push({ date: dateStr, entry: entryMap.get(dateStr) || null });
    if (currentWeek.length === 7) {
      weeks.push(currentWeek);
      currentWeek = [];
    }
  }
  if (currentWeek.length > 0) weeks.push(currentWeek);

  const dayLabels = ["S", "M", "T", "W", "T", "F", "S"];

  return (
    <View>
      <View style={{ flexDirection: "row", gap: 4, marginBottom: 4 }}>
        {dayLabels.map((d, i) => (
          <View key={i} style={{ flex: 1, alignItems: "center" }}>
            <Text style={{ fontSize: 10, fontFamily: "PlusJakartaSans_500Medium", color: colors.warm300 }}>{d}</Text>
          </View>
        ))}
      </View>
      {weeks.map((week, wi) => (
        <View key={wi} style={{ flexDirection: "row", gap: 4, marginBottom: 4 }}>
          {week.map((day) => {
            const hasEntry = !!day.entry;
            const score = day.entry?.regulationScore;
            const bg = !hasEntry
              ? colors.warm100
              : score && score >= 7
                ? colors.sage
                : score && score >= 4
                  ? colors.cream
                  : score
                    ? colors.rose
                    : colors.teal;

            return (
              <View
                key={day.date}
                style={{
                  flex: 1,
                  aspectRatio: 1,
                  borderRadius: 4,
                  backgroundColor: bg,
                  maxHeight: 36,
                }}
              />
            );
          })}
        </View>
      ))}
    </View>
  );
}
