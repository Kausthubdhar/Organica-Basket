import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Platform,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons, FontAwesome5, MaterialCommunityIcons } from "@expo/vector-icons";
import { Image } from "expo-image";
import Animated, { FadeInDown, FadeInRight, FadeInUp } from "react-native-reanimated";
import { BlurView } from "expo-blur";
import { useRouter } from "expo-router";
import { supabase } from "../../lib/supabase";

const { width } = Dimensions.get("window");

export default function StoresScreen() {
  const router = useRouter();
  const [userProfile, setUserProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [stores, setStores] = useState<any[]>([]);

  useEffect(() => {
    fetchProfile();
    fetchStores();
  }, []);

  const fetchStores = async () => {
    const { data } = await supabase.from("stores").select("*");
    if (data) {
      // Map real stores to UI types for the demo aesthetic
      const typedStores = data.map((s, i) => ({
        ...s,
        type: i === 0 ? "featured" : i % 2 === 0 ? "standard" : "high-tech",
        distance: "2.4 km away", // Mock distance
        badge: "LOCAL FARM",
        priceRange: "₹₹"
      }));
      setStores(typedStores);
    }
  };

  const fetchProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .single();
        setUserProfile(data);
      }
    } catch (error) {
    } finally {
      setLoading(false);
    }
  };



  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4A6038" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        
        {/* Header Section */}
        <Animated.View entering={FadeInDown.duration(800)} style={styles.header}>
          <View style={styles.headerTop}>
            <Ionicons name="menu-outline" size={28} color="#4A6038" />
            <Text style={styles.headerTitle}>The Harvest</Text>
            <Image
              source={{ uri: "https://api.dicebear.com/7.x/avataaars/svg?seed=Arjun" }}
              style={styles.profileAvatar}
            />
          </View>
          
          <View style={styles.greetingSection}>
            <Text style={styles.namasteText}>Namaste,</Text>
            <Text style={styles.userNameText}>{userProfile?.full_name?.split(" ")[0] || "Arjun"}</Text>
            <Text style={styles.subtext}>
              Welcome back to your digital greenhouse. Your local harvest partners have stocked fresh arrivals from the morning dew.
            </Text>
          </View>
        </Animated.View>

        {/* Section Title */}
        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionTitle}>Local Organic Stores</Text>
            <View style={styles.titleUnderline} />
          </View>
          <TouchableOpacity>
            <Text style={styles.viewAllText}>View All Partners</Text>
          </TouchableOpacity>
        </View>

        {/* Stores List */}
        <View style={styles.storesList}>
          {stores.map((store, index) => {
            if (store.type === "featured") {
              return (
                <Animated.View 
                  key={store.id} 
                  entering={FadeInUp.delay(index * 200)}
                  style={styles.featuredCard}
                >
                  <TouchableOpacity activeOpacity={0.9} onPress={() => router.push(`/shop/${store.id}` as any)}>
                    <Image source={{ uri: store.image_url ?? undefined }} style={styles.featuredImage} contentFit="cover" />
                    {store.status_message && (
                      <View style={styles.broadcastTag}>
                        <Ionicons name="megaphone" size={12} color="#fff" />
                        <Text style={styles.broadcastTagText}>LIVE UPDATE</Text>
                      </View>
                    )}
                  <View style={styles.badgeContainer}>
                    <Text style={styles.badgeText}>{store.next_delivery_date ? `NEXT DELIVERY: ${store.next_delivery_date}` : store.badge}</Text>
                  </View>
                  <BlurView intensity={80} tint="light" style={styles.featuredLabel}>
                    <View style={styles.labelRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.featuredName}>{store.name}</Text>
                        <View style={styles.locationRow}>
                          <Ionicons name="location" size={14} color="#4A6038" />
                          <Text style={styles.locationText}>{store.location} • {store.distance}</Text>
                        </View>
                      </View>
                      <View style={styles.priceTag}>
                        <Text style={styles.priceRange}>{store.priceRange}</Text>
                        <Text style={styles.priceLabel}>PRICE RANGE</Text>
                      </View>
                    </View>
                  </BlurView>
                  </TouchableOpacity>
                </Animated.View>
              );
            }

            if (store.type === "standard") {
              return (
                <Animated.View 
                  key={store.id} 
                  entering={FadeInUp.delay(index * 200)}
                  style={styles.standardCard}
                >
                  <TouchableOpacity activeOpacity={0.9} onPress={() => router.push(`/shop/${store.id}` as any)}>
                    <Image source={{ uri: store.image_url ?? undefined }} style={styles.standardImage} contentFit="cover" />
                  <View style={styles.standardInfo}>
                    <View style={styles.nameRow}>
                      <Text style={styles.standardName}>{store.name}</Text>
                      <View style={styles.ratingRow}>
                        <Ionicons name="star" size={14} color="#4A6038" />
                        <Text style={styles.ratingText}>{store.rating}</Text>
                      </View>
                    </View>
                    <Text style={styles.taglineText}>{store.tagline}</Text>
                    <View style={styles.tagRow}>
                      {store.tags?.map((tag: string) => (
                        <View key={tag} style={styles.tag}>
                          <Text style={styles.tagText}>{tag}</Text>
                        </View>
                      ))}
                    </View>
                    </View>
                    {store.status_message && (
                      <Text style={styles.statusSnippet} numberOfLines={1}>📢 {store.status_message}</Text>
                    )}
                  </TouchableOpacity>
                </Animated.View>
              );
            }

            if (store.type === "minimal") {
              return (
                <Animated.View 
                  key={store.id} 
                  entering={FadeInUp.delay(index * 200)}
                  style={styles.minimalCard}
                >
                  <View style={styles.leafIconContainer}>
                    <MaterialCommunityIcons name="leaf" size={20} color="#4A6038" />
                  </View>
                  <Text style={styles.minimalName}>{store.name}</Text>
                  <Text style={styles.minimalDesc}>{store.description}</Text>
                  <View style={styles.minimalFooter}>
                    <Text style={styles.priceAvgText}>{store.priceAvg}</Text>
                    <Ionicons name="arrow-forward" size={20} color="#4A6038" />
                  </View>
                </Animated.View>
              );
            }

            if (store.type === "high-tech") {
              return (
                <Animated.View 
                  key={store.id} 
                  entering={FadeInUp.delay(index * 200)}
                  style={styles.techCard}
                >
                  <TouchableOpacity activeOpacity={0.9} onPress={() => router.push(`/shop/${store.id}` as any)}>
                    <Image source={{ uri: store.image_url ?? undefined }} style={styles.techImage} contentFit="cover" />
                  <View style={styles.techInfo}>
                    <Text style={styles.techTag}>{store.tagline?.toUpperCase() || ""}</Text>
                    <Text style={styles.techName}>{store.name}</Text>
                    <Text style={styles.techDesc}>{store.description}</Text>
                    <View style={styles.techStats}>
                      <View style={styles.techStatItem}>
                        <Text style={styles.statLabel}>DELIVERY</Text>
                        <Text style={styles.statValue}>{store.delivery}</Text>
                      </View>
                      <View style={styles.statDivider} />
                      <View style={styles.techStatItem}>
                        <Text style={styles.statLabel}>SOURCING</Text>
                        <Text style={styles.statValue}>{store.sourcing}</Text>
                      </View>
                    </View>
                    </View>
                  </TouchableOpacity>
                </Animated.View>
              );
            }

            return null;
          })}
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F6E9",
  },
  scrollContent: {
    paddingBottom: 100,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F5F6E9",
  },

  // Header
  header: {
    paddingHorizontal: 24,
    paddingTop: 10,
    marginBottom: 30,
  },
  headerTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 40,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#4A6038",
    fontFamily: Platform.OS === "ios" ? "Georgia" : "serif",
    fontStyle: "italic",
  },
  profileAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#DCE1C1",
  },
  greetingSection: {
    marginTop: 10,
  },
  namasteText: {
    fontSize: 48,
    fontFamily: Platform.OS === "ios" ? "Georgia" : "serif",
    color: "#1E261E",
    lineHeight: 52,
  },
  userNameText: {
    fontSize: 48,
    fontFamily: Platform.OS === "ios" ? "Georgia" : "serif",
    color: "#4A6038",
    fontStyle: "italic",
    marginBottom: 16,
  },
  subtext: {
    fontSize: 16,
    color: "#6B7A6B",
    lineHeight: 24,
    maxWidth: "90%",
  },

  // Section Header
  sectionHeader: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    paddingHorizontal: 24,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 24,
    fontFamily: Platform.OS === "ios" ? "Georgia" : "serif",
    color: "#1E261E",
    marginBottom: 6,
  },
  titleUnderline: {
    height: 3,
    width: 40,
    backgroundColor: "#4A6038",
  },
  viewAllText: {
    fontSize: 14,
    color: "#4A6038",
    fontWeight: "600",
    textAlign: "right",
    maxWidth: 80,
  },

  // Stores List
  storesList: {
    paddingHorizontal: 16,
    gap: 20,
  },

  // Featured Card (Prakriti)
  featuredCard: {
    width: "100%",
    height: 400,
    borderRadius: 16,
    overflow: "hidden",
    marginBottom: 10,
  },
  featuredImage: {
    width: "100%",
    height: "100%",
  },
  badgeContainer: {
    position: "absolute",
    top: 16,
    left: 16,
    backgroundColor: "rgba(255,255,255,0.85)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: "900",
    color: "#4A6038",
    letterSpacing: 0.5,
  },
  broadcastTag: { position: "absolute", top: 16, right: 16, backgroundColor: "#FF8C42", flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12 },
  broadcastTagText: { color: "#fff", fontSize: 10, fontWeight: "900" },
  featuredLabel: {
    position: "absolute",
    bottom: 16,
    left: 16,
    right: 16,
    borderRadius: 12,
    padding: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.3)",
  },
  labelRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  featuredName: {
    fontSize: 22,
    fontFamily: Platform.OS === "ios" ? "Georgia" : "serif",
    color: "#1E261E",
    marginBottom: 4,
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  locationText: {
    fontSize: 12,
    color: "#6B7A6B",
  },
  priceTag: {
    alignItems: "center",
    borderLeftWidth: 1,
    borderLeftColor: "rgba(0,0,0,0.1)",
    paddingLeft: 12,
  },
  priceRange: {
    fontSize: 18,
    color: "#4A6038",
    fontWeight: "700",
  },
  priceLabel: {
    fontSize: 8,
    color: "#8A998A",
    fontWeight: "600",
    marginTop: 2,
  },

  // Standard Card (Earth Basket)
  standardCard: {
    backgroundColor: "#1E261E",
    borderRadius: 16,
    overflow: "hidden",
  },
  standardImage: {
    width: "100%",
    height: 250,
  },
  standardInfo: {
    padding: 20,
  },
  nameRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  standardName: {
    fontSize: 20,
    fontFamily: Platform.OS === "ios" ? "Georgia" : "serif",
    color: "#F5F6E9",
  },
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  ratingText: {
    color: "#F5F6E9",
    fontSize: 14,
    fontWeight: "600",
  },
  taglineText: {
    fontSize: 14,
    fontStyle: "italic",
    color: "#8A998A",
    marginBottom: 8,
  },
  statusSnippet: { fontSize: 12, color: "#F5F6E9", opacity: 0.8, marginTop: 8 },
  tagRow: {
    flexDirection: "row",
    gap: 8,
  },
  tag: {
    backgroundColor: "#2D382D",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  tagText: {
    fontSize: 10,
    color: "#F5F6E9",
    fontWeight: "700",
  },

  // Minimal Card (Green Roots)
  minimalCard: {
    backgroundColor: "#F0F2D9",
    borderRadius: 16,
    padding: 24,
  },
  leafIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(74,96,56,0.1)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  minimalName: {
    fontSize: 20,
    fontFamily: Platform.OS === "ios" ? "Georgia" : "serif",
    color: "#1E261E",
    marginBottom: 12,
  },
  minimalDesc: {
    fontSize: 14,
    color: "#6B7A6B",
    lineHeight: 20,
    marginBottom: 20,
  },
  minimalFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.05)",
    paddingTop: 16,
  },
  priceAvgText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1E261E",
  },

  // Tech Card (Urban Harvesters)
  techCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    overflow: "hidden",
  },
  techImage: {
    width: "100%",
    height: 280,
  },
  techInfo: {
    padding: 24,
  },
  techTag: {
    fontSize: 10,
    fontWeight: "700",
    color: "#8A998A",
    letterSpacing: 1,
    marginBottom: 8,
  },
  techName: {
    fontSize: 28,
    fontFamily: Platform.OS === "ios" ? "Georgia" : "serif",
    color: "#1E261E",
    marginBottom: 12,
  },
  techDesc: {
    fontSize: 14,
    color: "#6B7A6B",
    lineHeight: 22,
    marginBottom: 24,
  },
  techStats: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: "#F5F6E9",
    paddingTop: 16,
  },
  techStatItem: {
    flex: 1,
  },
  statLabel: {
    fontSize: 9,
    fontWeight: "700",
    color: "#B0BDB0",
    marginBottom: 4,
  },
  statValue: {
    fontSize: 13,
    fontWeight: "700",
    color: "#4A6038",
  },
  statDivider: {
    width: 1,
    backgroundColor: "#F5F6E9",
    marginHorizontal: 16,
  }
});
