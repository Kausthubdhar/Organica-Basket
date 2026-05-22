import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  useWindowDimensions,
} from "react-native";
import { showModernAlert } from "../components/ModernAlert";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons, FontAwesome5 } from "@expo/vector-icons";
import * as Location from "expo-location";
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { decode } from 'base64-arraybuffer';
import { useRouter } from "expo-router";
import { supabase } from "../lib/supabase";
import Animated, { FadeInDown, SlideInRight, ZoomIn } from "react-native-reanimated";
import { Image } from "expo-image";
import * as Haptics from "expo-haptics";

export default function OnboardingForm() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  
  // Data
  const [role, setRole] = useState<"customer" | "owner" | "">("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [gender, setGender] = useState<"Male" | "Female" | "Other" | "">("");
  const [avatarUrl, setAvatarUrl] = useState("");
  
  // Seller Specific Data
  const [storeName, setStoreName] = useState("");
  const [storeDesc, setStoreDesc] = useState("");
  const [storeImage, setStoreImage] = useState<string | null>(null);
  const [storeCategory, setStoreCategory] = useState("Veggies");
  const [locationData, setLocationData] = useState<any>(null);

  // Customer Specific Address Data
  const [street, setStreet] = useState("");
  const [apartment, setApartment] = useState("");
  const [pincode, setPincode] = useState("");
  const [addressLabel, setAddressLabel] = useState("Home");

  const ACTIVE_ORANGE = "#FF8C42";
  const SOFT_GREEN = "#4A6038";

  const categories = [
    { name: "Veggies", icon: "leaf-outline" },
    { name: "Fruits", icon: "nutrition-outline" },
    { name: "Dairy", icon: "water-outline" },
    { name: "Grains", icon: "grid-outline" },
    { name: "Other", icon: "apps-outline" },
  ];

  // 9 Bulletproof PNG Avatars per category
  const avatarGroups: any = {
    Male: [
      "https://api.dicebear.com/7.x/avataaars/png?seed=Felix", "https://api.dicebear.com/7.x/avataaars/png?seed=Jack", "https://api.dicebear.com/7.x/avataaars/png?seed=Leo",
      "https://api.dicebear.com/7.x/avataaars/png?seed=Max", "https://api.dicebear.com/7.x/avataaars/png?seed=Oliver", "https://api.dicebear.com/7.x/avataaars/png?seed=Charlie",
      "https://api.dicebear.com/7.x/avataaars/png?seed=Harry", "https://api.dicebear.com/7.x/avataaars/png?seed=George", "https://api.dicebear.com/7.x/avataaars/png?seed=Arthur"
    ],
    Female: [
      "https://api.dicebear.com/7.x/avataaars/png?seed=Aria", "https://api.dicebear.com/7.x/avataaars/png?seed=Zoe", "https://api.dicebear.com/7.x/avataaars/png?seed=Luna",
      "https://api.dicebear.com/7.x/avataaars/png?seed=Mia", "https://api.dicebear.com/7.x/avataaars/png?seed=Ava", "https://api.dicebear.com/7.x/avataaars/png?seed=Ivy",
      "https://api.dicebear.com/7.x/avataaars/png?seed=Willow", "https://api.dicebear.com/7.x/avataaars/png?seed=Ruby", "https://api.dicebear.com/7.x/avataaars/png?seed=Grace"
    ],
    Other: [
      "https://api.dicebear.com/7.x/avataaars/png?seed=Spark", "https://api.dicebear.com/7.x/avataaars/png?seed=Cloud", "https://api.dicebear.com/7.x/avataaars/png?seed=Forest",
      "https://api.dicebear.com/7.x/avataaars/png?seed=River", "https://api.dicebear.com/7.x/avataaars/png?seed=Sky", "https://api.dicebear.com/7.x/avataaars/png?seed=Leaf",
      "https://api.dicebear.com/7.x/avataaars/png?seed=Stone", "https://api.dicebear.com/7.x/avataaars/png?seed=Wind", "https://api.dicebear.com/7.x/avataaars/png?seed=Echo"
    ]
  };

  const pickStoreImage = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.8,
    });

    if (!result.canceled) {
      setStoreImage(result.assets[0].uri);
    }
  };

  const selectAvatar = (url: string) => {
    setAvatarUrl(url);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const selectRole = (selectedRole: "customer" | "owner") => {
    setRole(selectedRole);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setStep(2);
  };

  const handleNext = () => {
    if (step === 1 && !role) {
      showModernAlert({ title: "Required", message: "How would you like to use Organica Bucket?", type: "info" });
      return;
    }
    if (step === 2 && (!fullName || !phone || !gender)) {
      showModernAlert({ title: "Required", message: "Please complete your identity details.", type: "info" });
      return;
    }
    if (step === 3) {
      if (role === "customer" && !avatarUrl) {
        showModernAlert({ title: "Required", message: "Please pick an avatar.", type: "info" });
        return;
      }
      if (role === "owner" && !storeImage) {
        showModernAlert({ title: "Required", message: "Please upload a picture of your store/garden.", type: "info" });
        return;
      }
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setStep(step + 1);
  };

  const uploadImage = async (uri: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const base64 = await FileSystem.readAsStringAsync(uri, { encoding: 'base64' });
      const arrayBuffer = decode(base64);
      
      const fileName = `${user.id}/${Date.now()}.jpg`;
      
      const { data, error } = await supabase.storage
        .from('stores')
        .upload(fileName, arrayBuffer, { contentType: 'image/jpeg', upsert: true });

      if (error) throw error;
      
      const { data: { publicUrl } } = supabase.storage
        .from('stores')
        .getPublicUrl(data.path);

      return publicUrl;
    } catch (err) {
      console.error(err);
      // Fallback for demo if bucket doesn't exist
      return "https://images.unsplash.com/photo-1542838132-92c53300491e";
    }
  };

  const handleComplete = async () => {
    setLoading(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      let uploadedStoreImg = null;
      if (storeImage) {
        uploadedStoreImg = await uploadImage(storeImage);
      }

      // Prepare location payload
      const finalLocationData = role === "customer" 
        ? [{ 
            id: Date.now().toString(), 
            label: addressLabel, 
            street, 
            apartment, 
            pincode, 
            city_state: locationData?.city_state || "" 
          }] 
        : locationData;

      // Step 1: UPSERT the profile (not just update).
      // This guarantees the row exists in 'profiles' regardless of trigger timing.
      const { error: profileError } = await supabase
        .from("profiles")
        .upsert({
          id: user.id,  // Critical: include the PK so upsert knows which row to target
          full_name: fullName,
          phone_number: phone,
          gender,
          avatar_url: avatarUrl || `https://api.dicebear.com/7.x/avataaars/png?seed=${fullName}`,
          role,
          location_data: finalLocationData,
          is_onboarded: true,
        }, { onConflict: 'id' });

      if (profileError) throw profileError;

      // Step 2: If owner, insert the store (FK is now guaranteed to resolve)
      if (role === "owner") {
        const storePayload: any = {
          owner_id: user.id,
          name: storeName || `${fullName}'s Organic Store`,
          description: storeDesc,
          location: locationData?.city_state,
          is_accepting_orders: false,
          image_url: uploadedStoreImg,
          category: storeCategory,
        };

        const { error: storeError } = await supabase
          .from("stores")
          .insert(storePayload);

        if (storeError) {
          // If schema cache error for new columns, retry with core columns only
          if (
            storeError.message?.includes('category') ||
            storeError.message?.includes('image_url') ||
            storeError.code === 'PGRST204'
          ) {
            const { error: fallbackError } = await supabase
              .from("stores")
              .insert({
                owner_id: user.id,
                name: storeName || `${fullName}'s Organic Store`,
                description: storeDesc,
                location: locationData?.city_state,
                is_accepting_orders: false,
              });
            if (fallbackError) throw fallbackError;
          } else {
            throw storeError;
          }
        }

        // Owners go to the owner dashboard
        router.replace("/(owner)" as any);
      } else {
        router.replace("/(shopper)" as any);
      }
    } catch (err: any) {
      showModernAlert({ title: "Setup Failed", message: err.message, type: "error" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          
          {/* Step 1: Role Selection */}
          {step === 1 && (
            <Animated.View entering={FadeInDown.duration(600)} style={styles.stepBox}>
              <Text style={styles.title}>Join the Circle</Text>
              <Text style={styles.subtitle}>How would you like to use Organica Bucket?</Text>
              
              <TouchableOpacity 
                onPress={() => selectRole("customer")}
                activeOpacity={0.7}
                style={[styles.roleCard, role === "customer" ? { borderColor: ACTIVE_ORANGE, backgroundColor: "#FFF2EA" } : null]}
              >
                <View style={styles.roleIcon}><Ionicons name="basket" size={30} color={ACTIVE_ORANGE} /></View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.roleTitle}>I want to Shop</Text>
                  <Text style={styles.roleDesc}>Find fresh organic harvest from local stores near you.</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity 
                onPress={() => selectRole("owner")}
                activeOpacity={0.7}
                style={[styles.roleCard, role === "owner" ? { borderColor: SOFT_GREEN, backgroundColor: "#F4F5E6" } : null]}
              >
                <View style={[styles.roleIcon, { backgroundColor: "#E8F5E9" }]}><FontAwesome5 name="store" size={24} color={SOFT_GREEN} /></View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.roleTitle}>I want to Sell</Text>
                  <Text style={styles.roleDesc}>Open your digital store and reach organic lovers everywhere.</Text>
                </View>
              </TouchableOpacity>
            </Animated.View>
          )}

          {/* Step 2: Identity */}
          {step === 2 && (
            <Animated.View entering={SlideInRight} style={styles.stepBox}>
              <TouchableOpacity onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setStep(step - 1); }} style={styles.backButton}>
                <Ionicons name="arrow-back" size={20} color="#1E261E" />
              </TouchableOpacity>
              <Text style={styles.title}>Identity</Text>
              <Text style={styles.subtitle}>Let&apos;s set up your profile</Text>
              <TextInput value={fullName} onChangeText={setFullName} placeholder="Full Name" style={styles.input} />
              <TextInput value={phone} onChangeText={setPhone} keyboardType="phone-pad" placeholder="Phone Number" style={styles.input} />
              <Text style={styles.label}>Gender</Text>
              <View style={styles.genderRow}>
                {["Male", "Female", "Other"].map(g => (
                  <TouchableOpacity key={g} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setGender(g as any); }} style={[styles.genderBtn, gender === g ? { borderColor: ACTIVE_ORANGE, backgroundColor: "#FFF2EA" } : null]}>
                    <Text style={[styles.genderBtnText, gender === g ? { color: ACTIVE_ORANGE } : null]}>{g}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <TouchableOpacity onPress={handleNext} style={[styles.mainBtn, { backgroundColor: ACTIVE_ORANGE, marginTop: 20 }]}>
                <Text style={styles.mainBtnText}>Continue</Text>
              </TouchableOpacity>
            </Animated.View>
          )}

          {/* Step 3: Branched Setup */}
          {step === 3 && (
            <Animated.View entering={SlideInRight} style={styles.stepBox}>
              <TouchableOpacity onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setStep(step - 1); }} style={styles.backButton}>
                <Ionicons name="arrow-back" size={20} color="#1E261E" />
              </TouchableOpacity>
              
              {role === "customer" ? (
                <>
                  <Text style={styles.title}>Pick Your Avatar</Text>
                  <Text style={styles.subtitle}>Selected {gender} avatars for you</Text>
                  <View style={styles.avatarGrid}>
                    {gender && avatarGroups[gender].map((url: string, index: number) => (
                      <Animated.View key={index} entering={ZoomIn.delay(index * 50)}>
                        <TouchableOpacity 
                          onPress={() => selectAvatar(url)} 
                          style={[styles.avatarOption, avatarUrl === url ? { borderColor: ACTIVE_ORANGE, transform: [{scale: 1.05}], width: (width - 120) / 3, height: (width - 120) / 3 } : { width: (width - 120) / 3, height: (width - 120) / 3 }]}
                        >
                          <Image source={{ uri: url }} style={{ width: "100%", height: "100%" }} contentFit="contain" transition={300} />
                        </TouchableOpacity>
                      </Animated.View>
                    ))}
                  </View>
                </>
              ) : (
                <>
                  <Text style={styles.title}>Store Showcase</Text>
                  <Text style={styles.subtitle}>Upload a cover photo & pick your niche</Text>
                  
                  <TouchableOpacity onPress={pickStoreImage} style={styles.imageUploadCard}>
                    {storeImage ? (
                      <View style={{ width: "100%", height: "100%" }}>
                        <Image source={{ uri: storeImage }} style={{ width: "100%", height: "100%", borderRadius: 24 }} />
                        <View style={styles.imageEditBadge}><Ionicons name="camera" size={20} color="#fff" /></View>
                      </View>
                    ) : (
                      <View style={styles.uploadPlaceholder}>
                        <Ionicons name="image-outline" size={48} color={SOFT_GREEN} />
                        <Text style={styles.uploadText}>Upload Store Photo</Text>
                      </View>
                    )}
                  </TouchableOpacity>

                  <Text style={styles.label}>Primary Category</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryRow}>
                    {categories.map(cat => (
                      <TouchableOpacity 
                        key={cat.name} 
                        onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setStoreCategory(cat.name); }}
                        style={[styles.categoryBtn, storeCategory === cat.name ? { backgroundColor: SOFT_GREEN, borderColor: SOFT_GREEN } : null]}
                      >
                        <Ionicons name={cat.icon as any} size={18} color={storeCategory === cat.name ? "#fff" : SOFT_GREEN} />
                        <Text style={[styles.categoryText, storeCategory === cat.name ? { color: "#fff" } : null]}>{cat.name}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </>
              )}
              
              <TouchableOpacity onPress={handleNext} style={[styles.mainBtn, { backgroundColor: ACTIVE_ORANGE, marginTop: 20 }]}>
                <Text style={styles.mainBtnText}>Next</Text>
              </TouchableOpacity>
            </Animated.View>
          )}

          {/* Step 4: Final Details */}
          {step === 4 && (
            <Animated.View entering={SlideInRight} style={styles.stepBox}>
              <TouchableOpacity onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setStep(step - 1); }} style={styles.backButton}>
                <Ionicons name="arrow-back" size={20} color="#1E261E" />
              </TouchableOpacity>
              {role === "owner" ? (
                <>
                  <Text style={styles.title}>Store Details</Text>
                  <Text style={styles.subtitle}>Almost ready to go live!</Text>
                  <TextInput value={storeName} onChangeText={setStoreName} placeholder="Store Name" style={styles.input} />
                  <TextInput value={storeDesc} onChangeText={setStoreDesc} multiline placeholder="Bio..." style={[styles.input, { height: 80, textAlignVertical: "top" }]} />
                  <TouchableOpacity onPress={async () => {
                     Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                     let { status } = await Location.requestForegroundPermissionsAsync();
                     if (status === 'granted') {
                        const loc = await Location.getCurrentPositionAsync({});
                        const rev = await Location.reverseGeocodeAsync(loc.coords);
                        setLocationData({ city_state: `${rev[0].city || rev[0].region}, ${rev[0].region}` });
                     }
                  }} style={styles.permBtn}>
                    <Ionicons name="location" size={24} color={ACTIVE_ORANGE} />
                    <Text style={styles.permText}>{locationData ? "Location Verified ✅" : "Verify Store Location"}</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  <Text style={styles.title}>Delivery Address</Text>
                  <Text style={styles.subtitle}>Where should we deliver your fresh harvest?</Text>
                  
                  <View style={styles.addressLabelRow}>
                    {["Home", "Work", "Other"].map(lbl => (
                      <TouchableOpacity 
                        key={lbl} 
                        onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setAddressLabel(lbl); }}
                        style={[styles.addressLabelBtn, addressLabel === lbl ? { backgroundColor: ACTIVE_ORANGE, borderColor: ACTIVE_ORANGE } : null]}
                      >
                        <Ionicons name={lbl === "Home" ? "home" : lbl === "Work" ? "briefcase" : "location"} size={14} color={addressLabel === lbl ? "#fff" : "#8A998A"} />
                        <Text style={[styles.addressLabelText, addressLabel === lbl ? { color: "#fff" } : null]}>{lbl}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  <TouchableOpacity onPress={async () => {
                     Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                     let { status } = await Location.requestForegroundPermissionsAsync();
                     if (status === 'granted') {
                        const loc = await Location.getCurrentPositionAsync({});
                        const rev = await Location.reverseGeocodeAsync(loc.coords);
                        setLocationData({ city_state: `${rev[0].city || rev[0].region}, ${rev[0].region}` });
                        if(rev[0].street) setStreet(rev[0].street);
                        if(rev[0].postalCode) setPincode(rev[0].postalCode);
                     }
                  }} style={[styles.permBtn, { marginBottom: 16 }]}>
                    <Ionicons name="locate" size={20} color={ACTIVE_ORANGE} />
                    <Text style={styles.permText}>{locationData ? `City: ${locationData.city_state} ✅` : "Auto-fill using GPS"}</Text>
                  </TouchableOpacity>

                  <TextInput value={apartment} onChangeText={setApartment} placeholder="Flat / House No. / Floor / Building" style={styles.input} />
                  <TextInput value={street} onChangeText={setStreet} placeholder="Street Address / Area" style={styles.input} />
                  <TextInput value={pincode} onChangeText={setPincode} keyboardType="number-pad" placeholder="Pincode" style={styles.input} />
                </>
              )}

              <TouchableOpacity onPress={handleComplete} disabled={loading} style={[styles.mainBtn, { backgroundColor: role === "owner" ? SOFT_GREEN : ACTIVE_ORANGE, marginTop: 40 }]}>
                {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.mainBtnText}>Start Journey</Text>}
              </TouchableOpacity>
            </Animated.View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F5F6E9" },
  scrollContent: { padding: 24, paddingTop: 60 },
  stepBox: { backgroundColor: "#fff", borderRadius: 32, padding: 24, shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 20, elevation: 4, paddingTop: 80 },
  backButton: { position: "absolute", top: 20, left: 20, width: 42, height: 42, borderRadius: 21, backgroundColor: "#fff", justifyContent: "center", alignItems: "center", zIndex: 10, borderWidth: 1, borderColor: "#F0F0F0", shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 3 },
  title: { fontSize: 28, fontWeight: "800", color: "#1E261E", marginBottom: 8 },
  subtitle: { fontSize: 16, color: "#8A998A", marginBottom: 32 },
  roleCard: { flexDirection: "row", alignItems: "center", padding: 20, borderRadius: 24, borderWidth: 2, borderColor: "#F4F5E6", marginBottom: 16, gap: 16 },
  roleIcon: { width: 60, height: 60, borderRadius: 20, backgroundColor: "#FFF2EA", justifyContent: "center", alignItems: "center" },
  roleTitle: { fontSize: 18, fontWeight: "800", color: "#1E261E", marginBottom: 4 },
  roleDesc: { fontSize: 13, color: "#8A998A", lineHeight: 18 },
  input: { backgroundColor: "#F4F5E6", borderRadius: 16, padding: 16, fontSize: 16, marginBottom: 16 },
  label: { fontSize: 14, fontWeight: "700", color: "#4A6038", marginBottom: 12 },
  genderRow: { flexDirection: "row", gap: 10, marginBottom: 20 },
  genderBtn: { flex: 1, paddingVertical: 14, borderRadius: 16, borderWidth: 1, borderColor: "#D0D8C0", alignItems: "center" },
  genderBtnText: { fontWeight: "700", color: "#6B7A6B" },
  avatarGrid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", marginBottom: 32, gap: 10 },
  avatarOption: { borderRadius: 100, borderWidth: 3, borderColor: "transparent", overflow: "hidden", backgroundColor: "#F4F5E6" },
  imageUploadCard: { width: "100%", height: 200, borderRadius: 24, borderStyle: "dashed", borderWidth: 2, borderColor: "#D0D8C0", marginBottom: 24, overflow: "hidden" },
  uploadPlaceholder: { flex: 1, justifyContent: "center", alignItems: "center", gap: 12 },
  uploadText: { fontSize: 15, fontWeight: "700", color: "#4A6038" },
  imageEditBadge: { position: "absolute", bottom: 12, right: 12, backgroundColor: "rgba(0,0,0,0.5)", width: 40, height: 40, borderRadius: 20, justifyContent: "center", alignItems: "center" },
  categoryRow: { gap: 10, marginBottom: 24 },
  categoryBtn: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 15, borderWidth: 1, borderColor: "#D0D8C0" },
  categoryText: { fontSize: 14, fontWeight: "700", color: "#4A6038" },
  mainBtn: { paddingVertical: 18, borderRadius: 20, alignItems: "center" },
  mainBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  permBtn: { flexDirection: "row", alignItems: "center", gap: 12, padding: 20, borderRadius: 20, backgroundColor: "#F4F5E6" },
  permText: { fontWeight: "700", color: "#4A6038" },
  addressLabelRow: { flexDirection: "row", gap: 10, marginBottom: 16 },
  addressLabelBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 16, borderWidth: 1, borderColor: "#D0D8C0" },
  addressLabelText: { fontSize: 13, fontWeight: "700", color: "#8A998A" },
});
