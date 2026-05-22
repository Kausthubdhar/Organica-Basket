import React, { useEffect } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Platform } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import Animated, { 
  FadeInDown, 
  FadeInUp,
  useAnimatedStyle, 
  useSharedValue,
  withTiming, 
  withSequence,
  withDelay
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";

export default function OrderSuccessScreen() {
  const router = useRouter();
  const scale = useSharedValue(0);
  const opacity = useSharedValue(0);

  useEffect(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    scale.value = withDelay(300, withSequence(
      withTiming(1.2, { duration: 400 }),
      withTiming(1, { duration: 200 })
    ));
    opacity.value = withTiming(1, { duration: 600 });
  }, [opacity, scale]);

  const checkStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value
  }));

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Animated.View style={[styles.successIconBox, checkStyle]}>
          <View style={styles.outerCircle}>
            <View style={styles.innerCircle}>
              <Ionicons name="checkmark" size={60} color="#fff" />
            </View>
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(600)} style={styles.textBox}>
          <Text style={styles.title}>Harvest Confirmed!</Text>
          <Text style={styles.subtitle}>
            Your local store has been notified. They are preparing your fresh organic harvest for delivery.
          </Text>
        </Animated.View>

        <View style={styles.detailsCard}>
          <Animated.View entering={FadeInUp.delay(800)} style={styles.detailRow}>
            <View style={styles.detailIcon}><Ionicons name="time-outline" size={20} color="#FF8C42" /></View>
            <View>
              <Text style={styles.detailLabel}>Estimated Delivery</Text>
              <Text style={styles.detailValue}>Next Harvest Window</Text>
            </View>
          </Animated.View>
          
          <View style={styles.divider} />

          <Animated.View entering={FadeInUp.delay(1000)} style={styles.detailRow}>
            <View style={styles.detailIcon}><Ionicons name="leaf-outline" size={20} color="#4A6038" /></View>
            <View>
              <Text style={styles.detailLabel}>Farming Impact</Text>
              <Text style={styles.detailValue}>100% Organic & Local</Text>
            </View>
          </Animated.View>
        </View>
      </View>

      <View style={styles.footer}>
        <TouchableOpacity 
          style={styles.mainBtn}
          onPress={() => router.replace("/(shopper)" as any)}
        >
          <Text style={styles.mainBtnText}>Back to Home</Text>
          <Ionicons name="arrow-forward" size={20} color="#fff" />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F5F6E9" },
  content: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 40 },
  successIconBox: { marginBottom: 40 },
  outerCircle: { width: 140, height: 140, borderRadius: 70, backgroundColor: "rgba(74, 96, 56, 0.1)", justifyContent: "center", alignItems: "center" },
  innerCircle: { width: 100, height: 100, borderRadius: 50, backgroundColor: "#4A6038", justifyContent: "center", alignItems: "center", shadowColor: "#4A6038", shadowOpacity: 0.3, shadowRadius: 20, elevation: 10 },
  textBox: { alignItems: "center", marginBottom: 40 },
  title: { fontSize: 32, fontWeight: "900", color: "#1E261E", textAlign: "center", marginBottom: 12, fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif' },
  subtitle: { fontSize: 16, color: "#6B7A6B", textAlign: "center", lineHeight: 24 },
  detailsCard: { width: '100%', backgroundColor: "#fff", borderRadius: 32, padding: 24, shadowColor: "#000", shadowOpacity: 0.03, shadowRadius: 20, elevation: 4 },
  detailRow: { flexDirection: "row", alignItems: "center", gap: 16 },
  detailIcon: { width: 44, height: 44, borderRadius: 14, backgroundColor: "#F5F6E9", justifyContent: "center", alignItems: "center" },
  detailLabel: { fontSize: 12, color: "#8A998A", fontWeight: "600", marginBottom: 2 },
  detailValue: { fontSize: 15, fontWeight: "800", color: "#1E261E" },
  divider: { height: 1, backgroundColor: "#F5F6E9", marginVertical: 20 },
  footer: { padding: 20, paddingBottom: Platform.OS === "ios" ? 40 : 20 },
  mainBtn: { backgroundColor: "#1E261E", height: 64, borderRadius: 24, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 12 },
  mainBtnText: { color: "#fff", fontSize: 18, fontWeight: "800" },
});
