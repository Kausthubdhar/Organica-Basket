import React, { useState, useEffect, useRef } from "react";
import {
  View, Text, StyleSheet, ScrollView, TextInput,
  TouchableOpacity, Platform, ActivityIndicator, KeyboardAvoidingView,
  StatusBar, Modal, Dimensions
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from "@expo/vector-icons";
import Animated, { FadeInDown, FadeInUp, ZoomIn, Layout, LinearTransition } from "react-native-reanimated";
import { supabase } from "../../../lib/supabase";
import * as Haptics from "expo-haptics";
import { BlurView } from "expo-blur";
import { useFocusEffect } from "expo-router";

// Standard App Theme Colors
const BG_DARK = "#F5F6E9";
const SURFACE_DARK = "#FFFFFF";
const SURFACE_BORDER = "#E0E8D8";
const NEON_GREEN = "#4A6038";
const TEXT_PRIMARY = "#1E261E";
const TEXT_SECONDARY = "#8A998A";
const ACTIVE_ORANGE = "#FF8C42";

// Dynamic Reanimated Horizontal Bar Chart Component
function AiBarChart({ data }: { data: { label: string; value: number; color: string }[] }) {
  if (!data || data.length === 0) return null;
  const maxVal = Math.max(...data.map(d => Number(d.value)), 1);
  
  return (
    <View style={chartStyles.container}>
      {data.map((item, i) => {
        const percentage = Math.max((Number(item.value) / maxVal) * 100, 2); // Minimum 2% width so it's always visible
        const barColor = item.color || NEON_GREEN;

        return (
          <View key={i} style={chartStyles.row}>
            <View style={chartStyles.labelHeader}>
              <Text style={chartStyles.labelText} numberOfLines={1}>{item.label}</Text>
              <Text style={[chartStyles.valueText, { color: barColor }]}>{item.value}</Text>
            </View>
            
            {/* Dark Track Background */}
            <View style={chartStyles.track}>
              {/* Colored Animated Bar */}
              <Animated.View 
                entering={FadeInDown.delay(i * 150).springify().damping(14)} 
                style={[
                  chartStyles.bar, 
                  { 
                    width: `${percentage}%`, 
                    backgroundColor: barColor,
                    shadowColor: barColor,
                  }
                ]} 
              />
            </View>
          </View>
        );
      })}
    </View>
  );
}

const chartStyles = StyleSheet.create({
  container: { gap: 18, marginTop: 10, width: '100%' },
  row: { width: '100%' },
  labelHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  labelText: { fontSize: 13, color: TEXT_PRIMARY, fontWeight: '600', letterSpacing: 0.5, flex: 1, paddingRight: 10 },
  valueText: { fontSize: 14, fontWeight: '900' },
  track: { height: 10, backgroundColor: '#F4F5E6', borderRadius: 5, overflow: 'hidden' },
  bar: { height: '100%', borderRadius: 5, shadowOpacity: 0.9, shadowRadius: 10, elevation: 5 },
});

type Message = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  chart?: {
    type: string;
    data: any[];
  };
};

const SUGGESTED_PROMPTS = [
  { icon: "trending-up", text: "Analyze today's revenue" },
  { icon: "alert-circle", text: "Show low stock products" },
  { icon: "star", text: "What are my best sellers?" },
  { icon: "calendar", text: "Predict next week's demand" }
];

const { width } = Dimensions.get('window');

const parsePgDate = (dateStr: string | null | undefined): Date | null => {
  if (!dateStr) return null;
  
  // 1. Try native Date parsing first
  let parsed = new Date(dateStr);
  if (!isNaN(parsed.getTime())) return parsed;
  
  // 2. Normalize components
  let normalized = dateStr.replace(" ", "T");
  // Strip excess fractional seconds (microseconds)
  normalized = normalized.replace(/(\.\d{3})\d+/, '$1');
  
  // Add :00 to incomplete offsets like +00 or +05
  normalized = normalized.replace(/([+-]\d{2})$/, '$1:00');
  
  parsed = new Date(normalized);
  if (!isNaN(parsed.getTime())) return parsed;
  
  // 3. Fallback manually using regex
  const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})[T\s](\d{2}):(\d{2}):(\d{2})/);
  if (match) {
    const year = parseInt(match[1], 10);
    const month = parseInt(match[2], 10) - 1;
    const day = parseInt(match[3], 10);
    const hour = parseInt(match[4], 10);
    const minute = parseInt(match[5], 10);
    const second = parseInt(match[6], 10);
    
    if (dateStr.includes("+") || dateStr.includes("-") || dateStr.endsWith("Z")) {
      let isoStr = `${match[1]}-${match[2]}-${match[3]}T${match[4]}:${match[5]}:${match[6]}`;
      const msMatch = dateStr.match(/\.(\d{1,3})/);
      isoStr += msMatch ? `.${msMatch[1].padEnd(3, '0')}` : ".000";
      
      if (dateStr.endsWith("Z")) {
        isoStr += "Z";
      } else {
        const offsetMatch = dateStr.match(/([+-]\d{2}):?(\d{2})?$/);
        if (offsetMatch) {
          const sign = offsetMatch[1][0];
          const hours = offsetMatch[1].substring(1);
          const mins = offsetMatch[2] || "00";
          isoStr += `${sign}${hours}:${mins}`;
        } else {
          isoStr += "Z";
        }
      }
      parsed = new Date(isoStr);
      if (!isNaN(parsed.getTime())) return parsed;
    } else {
      return new Date(year, month, day, hour, minute, second);
    }
  }
  
  // 4. Date-only fallback in local time
  const dateMatch = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (dateMatch) {
    const year = parseInt(dateMatch[1], 10);
    const month = parseInt(dateMatch[2], 10) - 1;
    const day = parseInt(dateMatch[3], 10);
    return new Date(year, month, day);
  }
  
  return null;
};

export default function AnalyticsScreen() {
  const [store, setStore] = useState<any>(null);
  const [metrics, setMetrics] = useState({ 
    revenue: 0, orders: 0, products: 0, avgOrderValue: 0, outOfStock: 0, 
    growth: 0, revenueToday: 0, revenueThisWeek: 0, revenueThisMonth: 0 
  });
  const [chartData, setChartData] = useState<{ label: string; value: number; color: string }[]>([]);
  const [actionItems, setActionItems] = useState<{ pendingOrders: number, packedOrders: number, outOfStockItems: any[] }>({ pendingOrders: 0, packedOrders: 0, outOfStockItems: [] });
  const [isRevenueExpanded, setIsRevenueExpanded] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isLoadingMetrics, setIsLoadingMetrics] = useState(true);
  
  // AI Chat State
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: "System initialized. I am Organica Intelligence. How can I optimize your store today?"
    }
  ]);
  const [prompt, setPrompt] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);

  useFocusEffect(
    React.useCallback(() => {
      fetchDashboardData();
    }, [])
  );

  const fetchDashboardData = async () => {
    try {
      setIsLoadingMetrics(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      const { data: storeData } = await supabase.from("stores").select("*").eq("owner_id", user.id).single();
      setStore(storeData);

      if (storeData) {
        const { data: productsData } = await supabase.from("products").select("id, name, is_available").eq("store_id", storeData.id);
        const { data: ordersData } = await supabase.from("orders").select("total_amount, status, created_at, items").eq("store_id", storeData.id);
        
        let revenue = 0;
        let ordersCount = 0;
        let avgOrderValue = 0;
        let productCount = 0;
        let outOfStock = 0;
        let revenueToday = 0;
        let revenueThisWeek = 0;
        let revenueThisMonth = 0;
        let last7DaysRevenue = 0;
        let previous7DaysRevenue = 0;
        let growth = 0;
        let pendingOrdersCount = 0;
        let packedOrdersCount = 0;
        let outOfStockList: any[] = [];

        if (productsData) {
          productCount = productsData.length;
          outOfStockList = productsData.filter(p => !p.is_available);
          outOfStock = outOfStockList.length;
        }

        const last7DaysData: { [key: string]: number } = {};
        for (let i = 6; i >= 0; i--) {
          const d = new Date();
          d.setDate(d.getDate() - i);
          last7DaysData[d.toLocaleDateString('en-US', { weekday: 'short' })] = 0;
        }

        if (ordersData) {
          const isOrderPacked = (order: any) => {
            return order?.items && Array.isArray(order.items) && order.items.length > 0 && order.items.every((i: any) => i.is_packed);
          };

          const completedOrders = ordersData.filter(o => o.status === 'delivered');
          ordersCount = completedOrders.length;
          pendingOrdersCount = ordersData.filter(o => o.status === 'pending' && !isOrderPacked(o)).length;
          packedOrdersCount = ordersData.filter(o => o.status === 'pending' && isOrderPacked(o)).length;
          
          revenue = completedOrders.reduce((sum, order) => sum + (Number(order.total_amount) || 0), 0);
          avgOrderValue = ordersCount > 0 ? revenue / ordersCount : 0;

          const now = new Date();
          const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          const sevenDaysAgo = new Date(now);
          sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
          const fourteenDaysAgo = new Date(now);
          fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);
          const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

          completedOrders.forEach(order => {
            const orderDate = parsePgDate(order.created_at);
            if (!orderDate) return;

            const amt = Number(order.total_amount) || 0;
            
            if (orderDate >= startOfToday) revenueToday += amt;
            if (orderDate >= startOfMonth) revenueThisMonth += amt;

            if (orderDate >= sevenDaysAgo) {
              revenueThisWeek += amt;
              last7DaysRevenue += amt;
              const dayStr = orderDate.toLocaleDateString('en-US', { weekday: 'short' });
              if (last7DaysData[dayStr] !== undefined) {
                last7DaysData[dayStr] += amt;
              }
            } else if (orderDate >= fourteenDaysAgo) {
              previous7DaysRevenue += amt;
            }
          });
          
          if (previous7DaysRevenue > 0) {
            growth = ((last7DaysRevenue - previous7DaysRevenue) / previous7DaysRevenue) * 100;
          } else if (last7DaysRevenue > 0) {
            growth = 100; // 100% growth if there was no revenue in the previous week
          }
        }
        
        const generatedChartData = Object.keys(last7DaysData).map(key => ({
          label: key,
          value: last7DaysData[key],
          color: NEON_GREEN
        }));
        setChartData(generatedChartData);
        setMetrics({ revenue, orders: ordersCount, products: productCount, avgOrderValue, outOfStock, growth, revenueToday, revenueThisWeek, revenueThisMonth });
        setActionItems({ pendingOrders: pendingOrdersCount, packedOrders: packedOrdersCount, outOfStockItems: outOfStockList });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoadingMetrics(false);
    }
  };

  const executePrompt = async (textToSend: string) => {
    if (!textToSend.trim() || isTyping) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    const userMessage: Message = { id: Date.now().toString(), role: 'user', content: textToSend.trim() };
    setMessages(prev => [...prev, userMessage]);
    setPrompt("");
    setIsTyping(true);
    
    setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Session expired.");

      const response = await fetch(`${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/ai-analytics`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ 
          prompt: userMessage.content,
          timezoneOffset: new Date().getTimezoneOffset(),
          localTime: new Date().toISOString()
        })
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Failed to fetch insights');

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: result.insight || "Data processed successfully.",
        chart: result.chart
      };
      
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setMessages(prev => [...prev, aiMessage]);

    } catch (err: any) {
      console.error(err);
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `System Error: ${err.message}`
      }]);
    } finally {
      setIsTyping(false);
      setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);
    }
  };

  // Chart data is now populated dynamically via fetchDashboardData

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={BG_DARK} />
      
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        {/* Dashboard Header */}
        <View style={styles.header}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Ionicons name="analytics" size={20} color={NEON_GREEN} />
            <Text style={styles.headerTitle}>ANALYTICS DASHBOARD</Text>
          </View>
          <Text style={styles.headerStore}>{store?.name || "Organica Network"}</Text>
        </View>

        <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.dashboardScroll}>
          {isLoadingMetrics ? (
            <ActivityIndicator size="large" color={NEON_GREEN} style={{ marginTop: 50 }} />
          ) : (
            <>
              {/* Revenue Card */}
              <TouchableOpacity activeOpacity={0.8} onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setIsRevenueExpanded(!isRevenueExpanded);
              }}>
                <Animated.View entering={FadeInDown.delay(100)} style={styles.revenueCard}>
                  <View style={styles.revenueHeader}>
                    <Text style={styles.revenueLabel}>Total Revenue</Text>
                    {metrics.growth !== 0 && (
                      <View style={[styles.badge, { backgroundColor: metrics.growth >= 0 ? NEON_GREEN : '#C0392B' }]}>
                        <Ionicons name={metrics.growth >= 0 ? "trending-up" : "trending-down"} size={14} color="#fff" />
                        <Text style={styles.badgeText}>{Math.abs(metrics.growth).toFixed(1)}%</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.revenueValue}>₹{metrics.revenue.toFixed(2)}</Text>
                  
                  {isRevenueExpanded && (
                    <Animated.View entering={FadeInUp} style={styles.breakdownContainer}>
                      <View style={styles.breakdownRow}>
                        <Text style={styles.breakdownLabel}>Today</Text>
                        <Text style={styles.breakdownValue}>₹{metrics.revenueToday.toFixed(2)}</Text>
                      </View>
                      <View style={styles.breakdownRow}>
                        <Text style={styles.breakdownLabel}>Last 7 Days</Text>
                        <Text style={styles.breakdownValue}>₹{metrics.revenueThisWeek.toFixed(2)}</Text>
                      </View>
                      <View style={styles.breakdownRow}>
                        <Text style={styles.breakdownLabel}>This Month</Text>
                        <Text style={styles.breakdownValue}>₹{metrics.revenueThisMonth.toFixed(2)}</Text>
                      </View>
                    </Animated.View>
                  )}
                </Animated.View>
              </TouchableOpacity>

              {/* Quick Stats - Row 1 */}
              <View style={styles.statsRow}>
                <Animated.View entering={FadeInDown.delay(200)} style={styles.statCard}>
                  <Ionicons name="cube-outline" size={24} color={ACTIVE_ORANGE} />
                  <Text style={styles.statValue}>{metrics.products}</Text>
                  <Text style={styles.statLabel}>Active Products</Text>
                </Animated.View>

                <Animated.View entering={FadeInDown.delay(300)} style={styles.statCard}>
                  <Ionicons name="receipt-outline" size={24} color={NEON_GREEN} />
                  <Text style={styles.statValue}>{metrics.orders}</Text>
                  <Text style={styles.statLabel}>Total Orders</Text>
                </Animated.View>
              </View>

              {/* Quick Stats - Row 2 */}
              <View style={styles.statsRow}>
                <Animated.View entering={FadeInDown.delay(350)} style={styles.statCard}>
                  <Ionicons name="cash-outline" size={24} color={NEON_GREEN} />
                  <Text style={styles.statValue}>₹{metrics.avgOrderValue.toFixed(0)}</Text>
                  <Text style={styles.statLabel}>Avg Order Value</Text>
                </Animated.View>

                <Animated.View entering={FadeInDown.delay(400)} style={styles.statCard}>
                  <Ionicons name="alert-circle-outline" size={24} color="#C0392B" />
                  <Text style={styles.statValue}>{metrics.outOfStock}</Text>
                  <Text style={styles.statLabel}>Out of Stock</Text>
                </Animated.View>
              </View>

              {/* Action Center */}
              {(actionItems.pendingOrders > 0 || actionItems.packedOrders > 0 || actionItems.outOfStockItems.length > 0) && (
                <Animated.View entering={FadeInDown.delay(420)} style={styles.actionCenter}>
                  <Text style={styles.sectionTitle}>Action Center</Text>
                  
                  {actionItems.pendingOrders > 0 && (
                    <View style={styles.actionCard}>
                      <View style={styles.actionIconBgWarning}>
                        <Ionicons name="time" size={20} color="#E67E22" />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.actionTitle}>{actionItems.pendingOrders} Pending Order{actionItems.pendingOrders > 1 ? 's' : ''}</Text>
                        <Text style={styles.actionSub}>Require packing and fulfillment</Text>
                      </View>
                    </View>
                  )}

                  {actionItems.packedOrders > 0 && (
                    <View style={styles.actionCard}>
                      <View style={[styles.actionIconBgWarning, { backgroundColor: '#E3F2FD' }]}>
                        <Ionicons name="checkmark-done-circle" size={20} color="#1565C0" />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.actionTitle}>{actionItems.packedOrders} Packed Order{actionItems.packedOrders > 1 ? 's' : ''}</Text>
                        <Text style={styles.actionSub}>Ready to be marked as delivered</Text>
                      </View>
                    </View>
                  )}

                  {actionItems.outOfStockItems.length > 0 && (
                    <View style={styles.actionCard}>
                      <View style={styles.actionIconBgDanger}>
                        <Ionicons name="alert-circle" size={20} color="#C0392B" />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.actionTitle}>{actionItems.outOfStockItems.length} Product{actionItems.outOfStockItems.length > 1 ? 's' : ''} Unavailable</Text>
                        <Text style={styles.actionSub}>
                          {actionItems.outOfStockItems.slice(0, 2).map(p => p.name).join(', ')}
                          {actionItems.outOfStockItems.length > 2 ? ` and ${actionItems.outOfStockItems.length - 2} more...` : ' out of stock.'}
                        </Text>
                      </View>
                    </View>
                  )}
                </Animated.View>
              )}

              {/* Chart Section */}
              <Animated.View entering={FadeInDown.delay(450)} style={styles.chartSection}>
                <Text style={styles.sectionTitle}>Weekly Revenue (₹)</Text>
                {chartData.length > 0 ? (
                  <AiBarChart data={chartData} />
                ) : (
                  <Text style={styles.insightText}>No revenue data in the last 7 days.</Text>
                )}
              </Animated.View>
            </>
          )}
        </ScrollView>
      </SafeAreaView>

      {/* Floating Action Button for AI Chat */}
      <Animated.View entering={ZoomIn.delay(500)} style={styles.fabContainer}>
        <TouchableOpacity 
          style={styles.fab} 
          activeOpacity={0.8} 
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setIsChatOpen(true); }}
        >
          <Ionicons name="sparkles" size={24} color={BG_DARK} />
        </TouchableOpacity>
      </Animated.View>

      {/* AI Chat Modal Overlay */}
      <Modal visible={isChatOpen} animationType="slide" transparent={true} onRequestClose={() => setIsChatOpen(false)}>
        <BlurView intensity={80} tint="dark" style={styles.modalBlur}>
          <KeyboardAvoidingView 
            style={styles.modalContainer} 
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          >
            <View style={styles.chatHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View style={styles.pulseDot} />
                <Text style={styles.chatTitle}>ORGANICA INTELLIGENCE</Text>
              </View>
              <TouchableOpacity onPress={() => setIsChatOpen(false)} style={styles.closeBtn}>
                <Ionicons name="close" size={24} color={TEXT_PRIMARY} />
              </TouchableOpacity>
            </View>

            <ScrollView 
              style={{ flex: 1 }}
              ref={scrollViewRef}
              showsVerticalScrollIndicator={false} 
              contentContainerStyle={styles.feedScroll}
            >
              {messages.map((msg, index) => {
                if (msg.role === 'user') {
                  return (
                    <Animated.View key={msg.id} layout={LinearTransition.springify()} entering={FadeInDown} style={styles.commandPill}>
                      <Ionicons name="terminal" size={14} color={NEON_GREEN} />
                      <Text style={styles.commandText}>{msg.content}</Text>
                    </Animated.View>
                  );
                }

                return (
                  <Animated.View key={msg.id} layout={LinearTransition.springify()} entering={FadeInUp} style={styles.insightCard}>
                    <View style={styles.insightHeader}>
                      <View style={styles.insightIconBg}>
                        <Ionicons name="sparkles" size={16} color={BG_DARK} />
                      </View>
                      <Text style={styles.insightTitle}>INTELLIGENCE REPORT</Text>
                    </View>
                    <Text style={styles.insightText}>{msg.content}</Text>
                    {msg.chart && msg.chart.data && msg.chart.data.length > 0 && (
                      <View style={styles.chartWrapper}>
                        <AiBarChart data={msg.chart.data} />
                      </View>
                    )}
                  </Animated.View>
                );
              })}
              
              {messages.length === 1 && !isTyping && (
                <Animated.View entering={FadeInUp.delay(300)} style={styles.quickPromptsGrid}>
                  {SUGGESTED_PROMPTS.map((item, i) => (
                    <TouchableOpacity key={i} style={styles.quickPromptCard} onPress={() => executePrompt(item.text)} activeOpacity={0.7}>
                      <Ionicons name={item.icon as any} size={20} color={NEON_GREEN} />
                      <Text style={styles.quickPromptText}>{item.text}</Text>
                    </TouchableOpacity>
                  ))}
                </Animated.View>
              )}

              {isTyping && (
                <Animated.View entering={ZoomIn} style={styles.loadingCard}>
                  <ActivityIndicator size="small" color={NEON_GREEN} />
                  <Text style={styles.loadingText}>Processing data streams...</Text>
                </Animated.View>
              )}
            </ScrollView>

            <View style={styles.paletteContainer}>
              <View style={styles.floatingInputWrapper}>
                <View style={styles.inputGlowBorder}>
                  <Ionicons name="chevron-forward" size={20} color={NEON_GREEN} style={{ marginLeft: 16 }} />
                  <TextInput
                    value={prompt}
                    onChangeText={setPrompt}
                    placeholder="Enter command query..."
                    placeholderTextColor="#B0BDB0"
                    style={styles.paletteInput}
                    onSubmitEditing={() => executePrompt(prompt)}
                    returnKeyType="send"
                    keyboardAppearance="light"
                  />
                  <TouchableOpacity onPress={() => executePrompt(prompt)} style={[styles.paletteSendBtn, !prompt.trim() && { opacity: 0.3 }]} disabled={!prompt.trim() || isTyping}>
                    <Ionicons name="paper-plane" size={16} color={BG_DARK} />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </KeyboardAvoidingView>
        </BlurView>
      </Modal>

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG_DARK },
  header: { paddingHorizontal: 24, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: SURFACE_BORDER, backgroundColor: BG_DARK, zIndex: 10 },
  headerTitle: { fontSize: 13, fontWeight: "900", color: TEXT_PRIMARY, letterSpacing: 2 },
  headerStore: { fontSize: 12, color: TEXT_SECONDARY, marginTop: 4, fontWeight: '600' },
  
  // Dashboard Styles
  dashboardScroll: { padding: 20, paddingBottom: 100, gap: 20 },
  revenueCard: { backgroundColor: SURFACE_DARK, borderRadius: 24, padding: 24, borderWidth: 1, borderColor: 'rgba(157, 255, 80, 0.2)' },
  revenueHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  revenueLabel: { fontSize: 14, color: TEXT_SECONDARY, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1 },
  badge: { flexDirection: 'row', alignItems: 'center', backgroundColor: NEON_GREEN, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, gap: 4 },
  badgeText: { fontSize: 12, fontWeight: '800', color: '#fff' },
  revenueValue: { fontSize: 42, fontWeight: '900', color: TEXT_PRIMARY, letterSpacing: -1 },
  breakdownContainer: { marginTop: 24, paddingTop: 16, borderTopWidth: 1, borderTopColor: SURFACE_BORDER, gap: 12 },
  breakdownRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  breakdownLabel: { fontSize: 14, color: TEXT_SECONDARY, fontWeight: '600' },
  breakdownValue: { fontSize: 15, color: TEXT_PRIMARY, fontWeight: '800' },
  
  statsRow: { flexDirection: 'row', gap: 16, marginTop: 16 },
  statCard: { flex: 1, backgroundColor: SURFACE_DARK, borderRadius: 20, padding: 20, borderWidth: 1, borderColor: SURFACE_BORDER, alignItems: 'flex-start' },
  statValue: { fontSize: 28, fontWeight: '900', color: TEXT_PRIMARY, marginTop: 12 },
  statLabel: { fontSize: 12, color: TEXT_SECONDARY, fontWeight: '600', marginTop: 4, textTransform: 'uppercase', letterSpacing: 0.5 },

  actionCenter: { marginTop: 24, marginBottom: 4 },
  actionCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: SURFACE_DARK, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: SURFACE_BORDER, marginBottom: 12, gap: 12 },
  actionIconBgWarning: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#FDF2E9', justifyContent: 'center', alignItems: 'center' },
  actionIconBgDanger: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#FDEDEC', justifyContent: 'center', alignItems: 'center' },
  actionTitle: { fontSize: 15, fontWeight: '800', color: TEXT_PRIMARY, marginBottom: 2 },
  actionSub: { fontSize: 13, color: TEXT_SECONDARY, fontWeight: '500' },

  chartSection: { backgroundColor: SURFACE_DARK, borderRadius: 24, padding: 24, borderWidth: 1, borderColor: SURFACE_BORDER, marginTop: 10 },
  sectionTitle: { fontSize: 14, color: TEXT_PRIMARY, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 16 },

  // FAB
  fabContainer: { position: 'absolute', bottom: 30, right: 30, zIndex: 50 },
  fab: { width: 64, height: 64, borderRadius: 32, backgroundColor: NEON_GREEN, justifyContent: 'center', alignItems: 'center', shadowColor: NEON_GREEN, shadowOpacity: 0.5, shadowRadius: 15, elevation: 10 },

  // Modal Styles
  modalBlur: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' },
  modalContainer: { flex: 1, marginTop: 60, backgroundColor: BG_DARK, borderTopLeftRadius: 30, borderTopRightRadius: 30, borderWidth: 1, borderColor: SURFACE_BORDER, overflow: 'hidden' },
  chatHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 24, borderBottomWidth: 1, borderBottomColor: SURFACE_BORDER, backgroundColor: BG_DARK },
  chatTitle: { fontSize: 13, fontWeight: "900", color: TEXT_PRIMARY, letterSpacing: 2 },
  pulseDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: NEON_GREEN, shadowColor: NEON_GREEN, shadowOpacity: 0.8, shadowRadius: 6 },
  closeBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: SURFACE_DARK, justifyContent: 'center', alignItems: 'center' },

  // Chat Feed (reused)
  feedScroll: { padding: 20, paddingBottom: 20, gap: 20 },
  quickPromptsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 20 },
  quickPromptCard: { width: '48%', backgroundColor: SURFACE_DARK, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: SURFACE_BORDER },
  quickPromptText: { fontSize: 13, color: TEXT_PRIMARY, fontWeight: '600', marginTop: 12, lineHeight: 18 },
  commandPill: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: SURFACE_DARK, paddingHorizontal: 16, paddingVertical: 12, borderRadius: 12, alignSelf: 'flex-end', borderWidth: 1, borderColor: SURFACE_BORDER },
  commandText: { fontSize: 14, fontWeight: '600', color: TEXT_PRIMARY, fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' },
  insightCard: { backgroundColor: SURFACE_DARK, borderRadius: 24, padding: 24, width: '100%', borderWidth: 1, borderColor: SURFACE_BORDER },
  insightHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 20 },
  insightIconBg: { width: 32, height: 32, borderRadius: 10, backgroundColor: NEON_GREEN, justifyContent: 'center', alignItems: 'center', shadowColor: NEON_GREEN, shadowOpacity: 0.4, shadowRadius: 10 },
  insightTitle: { fontSize: 13, fontWeight: '900', color: TEXT_PRIMARY, letterSpacing: 1 },
  insightText: { fontSize: 15, lineHeight: 24, color: '#6B7A6B' },
  chartWrapper: { marginTop: 24, paddingTop: 24, borderTopWidth: 1, borderTopColor: SURFACE_BORDER },
  loadingCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: 'transparent', paddingHorizontal: 20, paddingVertical: 16, borderRadius: 20, alignSelf: 'flex-start' },
  loadingText: { fontSize: 13, fontWeight: '700', color: TEXT_SECONDARY, textTransform: 'uppercase', letterSpacing: 1 },
  paletteContainer: { paddingHorizontal: 20, paddingBottom: 24, paddingTop: 10, backgroundColor: BG_DARK },
  floatingInputWrapper: { borderRadius: 30, overflow: 'hidden', backgroundColor: SURFACE_DARK },
  inputGlowBorder: { flexDirection: 'row', height: 60, alignItems: 'center', borderWidth: 1, borderColor: SURFACE_BORDER, borderRadius: 30 },
  paletteInput: { flex: 1, height: '100%', paddingHorizontal: 12, fontSize: 15, fontWeight: '600', color: TEXT_PRIMARY },
  paletteSendBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: NEON_GREEN, justifyContent: 'center', alignItems: 'center', marginRight: 8, shadowColor: NEON_GREEN, shadowOpacity: 0.5, shadowRadius: 10, elevation: 5 }
});
