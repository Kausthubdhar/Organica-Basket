import React, { useState, useEffect } from "react";
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, Dimensions, Platform, ActivityIndicator
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import Animated, { FadeInDown, FadeInUp } from "react-native-reanimated";
import { supabase } from "../../../lib/supabase";

const { width } = Dimensions.get("window");
const SOFT_GREEN = "#4A6038";
const ACTIVE_ORANGE = "#FF8C42";

// Simple bar chart component
function BarChart({ data }: { data: { label: string; value: number; color: string }[] }) {
  const maxVal = Math.max(...data.map(d => d.value), 1);
  return (
    <View style={chart.container}>
      {data.map((item, i) => (
        <View key={i} style={chart.barGroup}>
          <Text style={chart.barValue}>{item.value}</Text>
          <View style={[chart.bar, { height: (item.value / maxVal) * 100, backgroundColor: item.color }]} />
          <Text style={chart.barLabel}>{item.label}</Text>
        </View>
      ))}
    </View>
  );
}

const chart = StyleSheet.create({
  container: { flexDirection: "row", alignItems: "flex-end", gap: 8, height: 130, paddingTop: 20 },
  barGroup: { flex: 1, alignItems: "center", gap: 4 },
  bar: { width: "70%", borderRadius: 8, minHeight: 4 },
  barValue: { fontSize: 10, fontWeight: "800", color: "#1E261E" },
  barLabel: { fontSize: 9, color: "#8A998A", fontWeight: "600" },
});

export default function AnalyticsScreen() {
  const [store, setStore] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalProducts: 0,
    totalOrders: 0,
    totalRevenue: 0,
    weeklyOrders: [0, 0, 0, 0, 0, 0, 0],
  });

  useEffect(() => { fetchAnalytics(); }, []);

  const fetchAnalytics = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: storeData } = await supabase
        .from("stores").select("*").eq("owner_id", user.id).single();
      setStore(storeData);

      if (storeData) {
        const { count: productCount } = await supabase
          .from("products").select("*", { count: "exact", head: true })
          .eq("store_id", storeData.id);
        setStats(prev => ({ ...prev, totalProducts: productCount || 0 }));
      }
    } catch (err) {
    } finally {
      setLoading(false);
    }
  };

  const weekDays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const weeklyData = weekDays.map((label, i) => ({
    label,
    value: stats.weeklyOrders[i] || 0,
    color: i === 5 || i === 6 ? ACTIVE_ORANGE : SOFT_GREEN,
  }));

  if (loading) return <View style={styles.loading}><ActivityIndicator size="large" color={SOFT_GREEN} /></View>;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

        <Animated.View entering={FadeInDown} style={styles.header}>
          <Text style={styles.title}>Analytics</Text>
          <Text style={styles.subtitle}>{store?.name || "Your Store"} · Performance Overview</Text>
        </Animated.View>

        {/* KPI Cards */}
        <View style={styles.kpiRow}>
          {[
            { label: "Products Listed", value: stats.totalProducts, icon: "cube-outline", color: SOFT_GREEN },
            { label: "Total Orders", value: stats.totalOrders, icon: "receipt-outline", color: ACTIVE_ORANGE },
            { label: "Revenue (₹)", value: stats.totalRevenue, icon: "wallet-outline", color: "#8E44AD" },
          ].map((kpi, i) => (
            <Animated.View key={i} entering={FadeInUp.delay(i * 100)} style={styles.kpiCard}>
              <View style={[styles.kpiIconBox, { backgroundColor: kpi.color + "18" }]}>
                <Ionicons name={kpi.icon as any} size={20} color={kpi.color} />
              </View>
              <Text style={styles.kpiValue}>{kpi.value}</Text>
              <Text style={styles.kpiLabel}>{kpi.label}</Text>
            </Animated.View>
          ))}
        </View>

        {/* Weekly Orders Chart */}
        <Animated.View entering={FadeInUp.delay(300)} style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Weekly Orders</Text>
            <View style={styles.liveTag}>
              <View style={styles.liveDot} />
              <Text style={styles.liveText}>LIVE</Text>
            </View>
          </View>
          <BarChart data={weeklyData} />
          <Text style={styles.chartNote}>
            {stats.totalOrders === 0 ? "No orders yet — go live to start receiving orders!" : ""}
          </Text>
        </Animated.View>

        {/* Store Health */}
        <Animated.View entering={FadeInUp.delay(400)} style={styles.card}>
          <Text style={styles.cardTitle}>Store Health</Text>
          <View style={{ gap: 14, marginTop: 16 }}>
            {[
              { label: "Store Photo", done: !!store?.image_url },
              { label: "Category Set", done: !!store?.category },
              { label: "Location Verified", done: !!store?.location },
              { label: "First Product Listed", done: stats.totalProducts > 0 },
              { label: "Accepting Orders", done: store?.is_accepting_orders },
            ].map((item, i) => (
              <View key={i} style={styles.healthRow}>
                <View style={[styles.healthIcon, { backgroundColor: item.done ? "#E8F5E9" : "#F4F5E6" }]}>
                  <Ionicons
                    name={item.done ? "checkmark-circle" : "ellipse-outline"}
                    size={18}
                    color={item.done ? "#27AE60" : "#C0CDB8"}
                  />
                </View>
                <Text style={[styles.healthLabel, !item.done && { color: "#8A998A" }]}>{item.label}</Text>
                {!item.done && <Text style={styles.healthPending}>Pending</Text>}
              </View>
            ))}
          </View>
        </Animated.View>

        {/* Tip */}
        <Animated.View entering={FadeInUp.delay(500)} style={styles.tipCard}>
          <MaterialCommunityIcons name="lightbulb-on-outline" size={28} color="#F1C40F" />
          <View style={{ flex: 1, marginLeft: 14 }}>
            <Text style={styles.tipTitle}>Pro Tip</Text>
            <Text style={styles.tipDesc}>
              Stores that update inventory weekly see 2× more repeat customers. Keep it fresh! 🌿
            </Text>
          </View>
        </Animated.View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F5F6E9" },
  scroll: { padding: 24, paddingBottom: 120 },
  loading: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: { marginBottom: 28 },
  title: { fontSize: 32, fontWeight: "800", color: "#1E261E", fontFamily: Platform.OS === "ios" ? "Georgia" : "serif" },
  subtitle: { fontSize: 14, color: "#8A998A", marginTop: 4 },
  kpiRow: { flexDirection: "row", gap: 12, marginBottom: 24 },
  kpiCard: { flex: 1, backgroundColor: "#fff", borderRadius: 20, padding: 14, alignItems: "center", shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 10, elevation: 2 },
  kpiIconBox: { width: 40, height: 40, borderRadius: 12, justifyContent: "center", alignItems: "center", marginBottom: 8 },
  kpiValue: { fontSize: 22, fontWeight: "900", color: "#1E261E" },
  kpiLabel: { fontSize: 10, color: "#8A998A", fontWeight: "700", textAlign: "center", marginTop: 2 },
  card: { backgroundColor: "#fff", borderRadius: 24, padding: 20, marginBottom: 20, shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 15, elevation: 2 },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  cardTitle: { fontSize: 18, fontWeight: "800", color: "#1E261E" },
  liveTag: { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: "#E8F5E9", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#27AE60" },
  liveText: { fontSize: 10, fontWeight: "900", color: "#27AE60" },
  chartNote: { fontSize: 12, color: "#8A998A", textAlign: "center", marginTop: 12, fontStyle: "italic" },
  healthRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  healthIcon: { width: 32, height: 32, borderRadius: 10, justifyContent: "center", alignItems: "center" },
  healthLabel: { flex: 1, fontSize: 14, fontWeight: "600", color: "#1E261E" },
  healthPending: { fontSize: 11, fontWeight: "700", color: "#FF8C42", backgroundColor: "#FFF2EA", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  tipCard: { flexDirection: "row", backgroundColor: "#2D382D", padding: 20, borderRadius: 24, alignItems: "center" },
  tipTitle: { color: "#fff", fontSize: 15, fontWeight: "800", marginBottom: 4 },
  tipDesc: { color: "rgba(255,255,255,0.65)", fontSize: 13, lineHeight: 18 },
});
