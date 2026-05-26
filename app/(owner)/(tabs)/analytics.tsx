import React, { useState, useEffect, useRef } from "react";
import {
  View, Text, StyleSheet, ScrollView, TextInput,
  TouchableOpacity, Platform, ActivityIndicator, KeyboardAvoidingView,
  StatusBar
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from "@expo/vector-icons";
import Animated, { FadeInDown, FadeInUp, ZoomIn, Layout, LinearTransition } from "react-native-reanimated";
import { supabase } from "../../../lib/supabase";
import * as Haptics from "expo-haptics";
import { BlurView } from "expo-blur";

// Premium Dark Theme Colors
const BG_DARK = "#0C100C";
const SURFACE_DARK = "rgba(255, 255, 255, 0.05)";
const SURFACE_BORDER = "rgba(255, 255, 255, 0.1)";
const NEON_GREEN = "#9DFF50";
const TEXT_PRIMARY = "#FFFFFF";
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
  track: { height: 10, backgroundColor: 'rgba(255, 255, 255, 0.06)', borderRadius: 5, overflow: 'hidden' },
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

export default function AnalyticsScreen() {
  const [store, setStore] = useState<any>(null);
  
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

  useEffect(() => { fetchStore(); }, []);

  const fetchStore = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: storeData } = await supabase.from("stores").select("name").eq("owner_id", user.id).single();
      setStore(storeData);
    } catch (err) {
      console.error(err);
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
        body: JSON.stringify({ prompt: userMessage.content })
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

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={BG_DARK} />
      
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <KeyboardAvoidingView 
          style={{ flex: 1 }} 
          behavior={Platform.OS === 'ios' ? 'padding' : 'padding'} 
          keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
        >
          
          {/* Top Header */}
          <View style={styles.header}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View style={styles.pulseDot} />
              <Text style={styles.headerTitle}>COMMAND CENTER</Text>
            </View>
            <Text style={styles.headerStore}>{store?.name || "Organica Network"}</Text>
          </View>

          {/* Generative UI Feed */}
          <ScrollView 
            style={{ flex: 1 }}
            ref={scrollViewRef}
            showsVerticalScrollIndicator={false} 
            contentContainerStyle={styles.feedScroll}
          >
            {messages.map((msg, index) => {
              if (msg.role === 'user') {
                return (
                  <Animated.View 
                    key={msg.id} 
                    layout={LinearTransition.springify()}
                    entering={FadeInDown} 
                    style={styles.commandPill}
                  >
                    <Ionicons name="terminal" size={14} color={NEON_GREEN} />
                    <Text style={styles.commandText}>{msg.content}</Text>
                  </Animated.View>
                );
              }

              return (
                <Animated.View 
                  key={msg.id} 
                  layout={LinearTransition.springify()}
                  entering={FadeInUp} 
                  style={styles.insightCard}
                >
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
            
            {/* Quick Prompts - Show only if no user messages exist */}
            {messages.length === 1 && !isTyping && (
              <Animated.View entering={FadeInUp.delay(300)} style={styles.quickPromptsGrid}>
                {SUGGESTED_PROMPTS.map((item, i) => (
                  <TouchableOpacity 
                    key={i} 
                    style={styles.quickPromptCard}
                    onPress={() => executePrompt(item.text)}
                    activeOpacity={0.7}
                  >
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

          {/* Floating Command Palette */}
          <View style={styles.paletteContainer}>
            <BlurView intensity={20} tint="dark" style={styles.floatingInputWrapper}>
              <View style={styles.inputGlowBorder}>
                <Ionicons name="chevron-forward" size={20} color={NEON_GREEN} style={{ marginLeft: 16 }} />
                <TextInput
                  value={prompt}
                  onChangeText={setPrompt}
                  placeholder="Enter command query..."
                  placeholderTextColor="rgba(255,255,255,0.4)"
                  style={styles.paletteInput}
                  onSubmitEditing={() => executePrompt(prompt)}
                  returnKeyType="send"
                  keyboardAppearance="dark"
                />
                <TouchableOpacity 
                  onPress={() => executePrompt(prompt)} 
                  style={[styles.paletteSendBtn, !prompt.trim() && { opacity: 0.3 }]} 
                  disabled={!prompt.trim() || isTyping}
                >
                  <Ionicons name="paper-plane" size={16} color={BG_DARK} />
                </TouchableOpacity>
              </View>
            </BlurView>
          </View>

        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG_DARK },
  header: { 
    paddingHorizontal: 24, 
    paddingVertical: 16, 
    borderBottomWidth: 1, 
    borderBottomColor: SURFACE_BORDER,
    backgroundColor: BG_DARK,
    zIndex: 10
  },
  pulseDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: NEON_GREEN, shadowColor: NEON_GREEN, shadowOpacity: 0.8, shadowRadius: 6 },
  headerTitle: { fontSize: 13, fontWeight: "900", color: TEXT_PRIMARY, letterSpacing: 2 },
  headerStore: { fontSize: 12, color: TEXT_SECONDARY, marginTop: 4, fontWeight: '600' },
  
  feedScroll: { padding: 20, paddingBottom: 20, gap: 20 },
  
  // Quick Prompts
  quickPromptsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 20 },
  quickPromptCard: { width: '48%', backgroundColor: SURFACE_DARK, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: SURFACE_BORDER },
  quickPromptText: { fontSize: 13, color: TEXT_PRIMARY, fontWeight: '600', marginTop: 12, lineHeight: 18 },

  // User Command Pill
  commandPill: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: SURFACE_DARK, paddingHorizontal: 16, paddingVertical: 12, borderRadius: 12, alignSelf: 'flex-end', borderWidth: 1, borderColor: SURFACE_BORDER },
  commandText: { fontSize: 14, fontWeight: '600', color: TEXT_PRIMARY, fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' },

  // AI Insight Card
  insightCard: { backgroundColor: SURFACE_DARK, borderRadius: 24, padding: 24, width: '100%', borderWidth: 1, borderColor: SURFACE_BORDER },
  insightHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 20 },
  insightIconBg: { width: 32, height: 32, borderRadius: 10, backgroundColor: NEON_GREEN, justifyContent: 'center', alignItems: 'center', shadowColor: NEON_GREEN, shadowOpacity: 0.4, shadowRadius: 10 },
  insightTitle: { fontSize: 13, fontWeight: '900', color: TEXT_PRIMARY, letterSpacing: 1 },
  insightText: { fontSize: 15, lineHeight: 24, color: '#D0D6D0' },
  chartWrapper: { marginTop: 24, paddingTop: 24, borderTopWidth: 1, borderTopColor: SURFACE_BORDER },
  
  loadingCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: 'transparent', paddingHorizontal: 20, paddingVertical: 16, borderRadius: 20, alignSelf: 'flex-start' },
  loadingText: { fontSize: 13, fontWeight: '700', color: TEXT_SECONDARY, textTransform: 'uppercase', letterSpacing: 1 },
  
  // Floating Command Palette
  paletteContainer: { paddingHorizontal: 20, paddingBottom: 8, paddingTop: 10, backgroundColor: 'transparent' },
  floatingInputWrapper: { borderRadius: 30, overflow: 'hidden', backgroundColor: 'rgba(0,0,0,0.4)' },
  inputGlowBorder: { flexDirection: 'row', height: 60, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(157, 255, 80, 0.3)', borderRadius: 30 },
  paletteInput: { flex: 1, height: '100%', paddingHorizontal: 12, fontSize: 15, fontWeight: '600', color: TEXT_PRIMARY },
  paletteSendBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: NEON_GREEN, justifyContent: 'center', alignItems: 'center', marginRight: 8, shadowColor: NEON_GREEN, shadowOpacity: 0.5, shadowRadius: 10, elevation: 5 }
});
