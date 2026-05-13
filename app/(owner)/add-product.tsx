import React, { useState, useEffect } from "react";
import {
  View, Text, StyleSheet, ScrollView, TextInput,
  TouchableOpacity, KeyboardAvoidingView, Platform,
  ActivityIndicator, useWindowDimensions, Modal
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import Animated, { FadeInDown, FadeInUp, ZoomIn } from "react-native-reanimated";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import * as Haptics from "expo-haptics";
import { useRouter, useLocalSearchParams } from "expo-router";
import { supabase } from "../../lib/supabase";
import * as FileSystem from "expo-file-system/legacy";
import { decode } from "base64-arraybuffer";

const SOFT_GREEN = "#4A6038";
const ACTIVE_ORANGE = "#FF8C42";
const BG = "#F5F6E9";

const CATEGORIES = [
  { name: "Veggies",  icon: "leaf-outline",      color: "#27AE60" },
  { name: "Fruits",   icon: "nutrition-outline",  color: "#E67E22" },
  { name: "Dairy",    icon: "water-outline",      color: "#3498DB" },
  { name: "Grains",   icon: "grid-outline",       color: "#8E44AD" },
  { name: "Herbs",    icon: "flower-outline",     color: "#16A085" },
  { name: "Other",    icon: "apps-outline",       color: "#7F8C8D" },
];

const UNITS = ["kg", "gram", "litre", "piece", "dozen", "bundle"];

export default function AddProductScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams(); // Check if we are in Edit Mode
  const { width } = useWindowDimensions();
  
  const isEditMode = !!id;

  const [store, setStore] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  // Form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [unit, setUnit] = useState("kg");
  const [category, setCategory] = useState("Veggies");
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [imageChanged, setImageChanged] = useState(false);
  const [isAvailable, setIsAvailable] = useState(true);
  
  // Status Modal State
  const [statusModal, setStatusModal] = useState({ 
    show: false, 
    type: 'success' as 'success' | 'error', 
    title: "", 
    message: "",
    onDone: () => {}
  });

  useEffect(() => {
    fetchStore();
    if (isEditMode) fetchProductDetails();
  }, []);

  const fetchProductDetails = async () => {
    setLoading(true);
    const { data, error } = await supabase.from("products").select("*").eq("id", id).single();
    if (data && !error) {
      setName(data.name);
      setDescription(data.description || "");
      setPrice(String(data.price));
      setUnit(data.unit);
      setCategory(data.category);
      setIsAvailable(data.is_available);
      setImageUri(data.image_url);
    }
    setLoading(false);
  };

  const fetchStore = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase.from("stores").select("*").eq("owner_id", user.id).single();
    setStore(data);
  };

  const pickImage = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85,
    });
    if (!result.canceled) {
      setImageUri(result.assets[0].uri);
      setImageChanged(true);
    }
  };

  const takePhoto = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") { 
      setStatusModal({
        show: true,
        type: 'error',
        title: "Permission Needed",
        message: "Camera access is required to take product photos.",
        onDone: () => setStatusModal(prev => ({ ...prev, show: false }))
      });
      return; 
    }
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85,
    });
    if (!result.canceled) {
      setImageUri(result.assets[0].uri);
      setImageChanged(true);
    }
  };

  const uploadProductImage = async (uri: string): Promise<string | null> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      // New Robust Method: Base64 -> ArrayBuffer
      const base64 = await FileSystem.readAsStringAsync(uri, { encoding: "base64" });
      const arrayBuffer = decode(base64);

      const path = `${user.id}/${Date.now()}.jpg`;
      const { data, error } = await supabase.storage
        .from("products")
        .upload(path, arrayBuffer, { 
          contentType: "image/jpeg",
          upsert: true 
        });

      if (error) throw error;
      const { data: { publicUrl } } = supabase.storage.from("products").getPublicUrl(data.path);
      return publicUrl;
    } catch (err) {

      return null;
    }
  };

  const handleSubmit = async () => {
    // Validation
    if (!name.trim()) { 
      setStatusModal({ show: true, type: 'error', title: "Missing Name", message: "Please enter a product name to list it.", onDone: () => setStatusModal(prev => ({ ...prev, show: false })) });
      return; 
    }
    if (!price || isNaN(parseFloat(price)) || parseFloat(price) <= 0) {
      setStatusModal({ show: true, type: 'error', title: "Invalid Price", message: "Please enter a valid price for your harvest.", onDone: () => setStatusModal(prev => ({ ...prev, show: false })) });
      return;
    }
    if (!store) { 
      setStatusModal({ show: true, type: 'error', title: "Store Error", message: "We couldn't find your store. Please try restarting the app.", onDone: () => setStatusModal(prev => ({ ...prev, show: false })) });
      return; 
    }

    setLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      let finalImageUrl = imageUri;
      
      // Only upload if it's a new local image (not a web URL)
      if (imageChanged && imageUri && !imageUri.startsWith('http')) {
        const uploadedUrl = await uploadProductImage(imageUri);
        if (uploadedUrl) {
          finalImageUrl = uploadedUrl;
        } else {
          throw new Error("Failed to upload image. Please try again.");
        }
      }

      if (isEditMode) {
        const { error } = await supabase.from("products").update({
          name: name.trim(),
          description: description.trim(),
          price: parseFloat(price),
          unit,
          category,
          image_url: finalImageUrl,
          is_available: isAvailable,
        }).eq("id", id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("products").insert({
          store_id: store.id,
          name: name.trim(),
          description: description.trim(),
          price: parseFloat(price),
          unit,
          category,
          image_url: finalImageUrl,
          is_available: isAvailable,
        });
        if (error) throw error;
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setStatusModal({
        show: true,
        type: 'success',
        title: isEditMode ? "Product Updated!" : "Product Listed!",
        message: isEditMode ? `Changes to "${name}" have been saved.` : `"${name}" is now live in your store.`,
        onDone: () => {
          setStatusModal(prev => ({ ...prev, show: false }));
          router.back();
        }
      });
    } catch (err: any) {
      setStatusModal({
        show: true,
        type: 'error',
        title: "Action Failed",
        message: err.message || "Something went wrong. Please try again.",
        onDone: () => setStatusModal(prev => ({ ...prev, show: false }))
      });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setName(""); setDescription(""); setPrice("");
    setUnit("kg"); setCategory("Veggies");
    setImageUri(null); setIsAvailable(true);
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Premium Status Modal */}
      <Modal transparent visible={statusModal.show} animationType="fade">
        <View style={styles.modalOverlay}>
          <Animated.View entering={FadeInDown} style={styles.modalCard}>
            <View style={[styles.modalIconBg, { backgroundColor: statusModal.type === 'success' ? "#E8F5E9" : "#FDEDEC" }]}>
              <Ionicons 
                name={statusModal.type === 'success' ? "checkmark-circle" : "alert-circle"} 
                size={40} 
                color={statusModal.type === 'success' ? "#27AE60" : "#C0392B"} 
              />
            </View>
            <Text style={styles.modalTitle}>{statusModal.title}</Text>
            <Text style={styles.modalSub}>{statusModal.message}</Text>
            <TouchableOpacity 
              onPress={statusModal.onDone}
              style={[styles.modalDoneBtn, { backgroundColor: statusModal.type === 'success' ? SOFT_GREEN : "#C0392B" }]}
            >
              <Text style={styles.modalDoneText}>Continue</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </Modal>

      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

          {/* Header */}
          <Animated.View entering={FadeInDown} style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
              <Ionicons name="arrow-back" size={20} color="#1E261E" />
            </TouchableOpacity>
            <View style={{ flex: 1, marginLeft: 16 }}>
              <Text style={styles.title}>{isEditMode ? "Edit Product" : "Add Product"}</Text>
              <Text style={styles.subtitle}>{isEditMode ? "Update your harvest details" : "List a fresh harvest item"}</Text>
            </View>
          </Animated.View>

          {/* Image Picker */}
          <Animated.View entering={FadeInUp.delay(100)} style={styles.card}>
            <Text style={styles.sectionLabel}>Product Photo</Text>
            <View style={styles.imageRow}>
              {imageUri ? (
                <TouchableOpacity onPress={pickImage} style={styles.imagePreviewBox}>
                  <Image source={{ uri: imageUri }} style={styles.imagePreview} contentFit="cover" />
                  <View style={styles.imageEditBadge}>
                    <Ionicons name="camera" size={16} color="#fff" />
                  </View>
                </TouchableOpacity>
              ) : (
                <View style={styles.noImageBox}>
                  <Ionicons name="image-outline" size={40} color="#C0CDB8" />
                  <Text style={styles.noImageText}>No photo yet</Text>
                </View>
              )}
              <View style={styles.imageActions}>
                <TouchableOpacity onPress={takePhoto} style={styles.imagePill}>
                  <Ionicons name="camera-outline" size={18} color={SOFT_GREEN} />
                  <Text style={styles.imagePillText}>Camera</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={pickImage} style={styles.imagePill}>
                  <Ionicons name="images-outline" size={18} color={SOFT_GREEN} />
                  <Text style={styles.imagePillText}>Gallery</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Animated.View>

          {/* Core Details */}
          <Animated.View entering={FadeInUp.delay(150)} style={styles.card}>
            <Text style={styles.sectionLabel}>Product Details</Text>
            <TextInput
              value={name} onChangeText={setName}
              placeholder="Product Name  (e.g. Cherry Tomatoes)"
              style={styles.input} placeholderTextColor="#B0BDB0"
            />
            <TextInput
              value={description} onChangeText={setDescription}
              placeholder="Description  (e.g. Sun-ripened, pesticide-free...)"
              style={[styles.input, styles.textArea]}
              multiline placeholderTextColor="#B0BDB0"
              textAlignVertical="top"
            />
            {/* Price + Unit row */}
            <View style={styles.priceRow}>
              <View style={styles.priceInputBox}>
                <Text style={styles.rupeeSymbol}>₹</Text>
                <TextInput
                  value={price} onChangeText={setPrice}
                  placeholder="0.00" keyboardType="decimal-pad"
                  style={styles.priceInput} placeholderTextColor="#B0BDB0"
                />
              </View>
              <Text style={styles.perText}>per</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.unitScroll}>
                {UNITS.map(u => (
                  <TouchableOpacity key={u} onPress={() => { setUnit(u); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                    style={[styles.unitPill, unit === u && { backgroundColor: SOFT_GREEN }]}>
                    <Text style={[styles.unitText, unit === u && { color: "#fff" }]}>{u}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </Animated.View>

          {/* Category */}
          <Animated.View entering={FadeInUp.delay(200)} style={styles.card}>
            <Text style={styles.sectionLabel}>Category</Text>
            <View style={styles.categoryGrid}>
              {CATEGORIES.map((cat, i) => (
                <Animated.View key={cat.name} entering={ZoomIn.delay(i * 40)}>
                  <TouchableOpacity
                    onPress={() => { setCategory(cat.name); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                    style={[styles.categoryBtn, category === cat.name && { backgroundColor: cat.color, borderColor: cat.color }]}
                  >
                    <Ionicons name={cat.icon as any} size={22} color={category === cat.name ? "#fff" : cat.color} />
                    <Text style={[styles.categoryText, category === cat.name && { color: "#fff" }]}>{cat.name}</Text>
                  </TouchableOpacity>
                </Animated.View>
              ))}
            </View>
          </Animated.View>

          {/* Availability */}
          <Animated.View entering={FadeInUp.delay(250)} style={styles.card}>
            <Text style={styles.sectionLabel}>Store Availability</Text>
            <View style={styles.stockRow}>
              <TouchableOpacity
                onPress={() => { setIsAvailable(v => !v); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                style={[styles.availToggle, isAvailable ? { backgroundColor: "#E8F5E9" } : { backgroundColor: "#F4F5E6" }]}
              >
                <Ionicons name={isAvailable ? "checkmark-circle" : "ellipse-outline"} size={22} color={isAvailable ? "#27AE60" : "#8A998A"} />
                <Text style={[styles.availText, isAvailable ? { color: "#27AE60" } : { color: "#8A998A" }]}>
                  {isAvailable ? "Accepting Orders" : "Currently Unavailable"}
                </Text>
              </TouchableOpacity>
              <View style={{ flex: 1 }}>
                <Text style={styles.infoNote}>When active, customers can see and order this item in the app.</Text>
              </View>
            </View>
          </Animated.View>

          {/* Submit */}
          <Animated.View entering={FadeInUp.delay(300)}>
            <TouchableOpacity onPress={handleSubmit} disabled={loading}
              style={[styles.submitBtn, loading && { opacity: 0.7 }]}>
              {loading
                ? <ActivityIndicator color="#fff" />
                : <>
                    <Ionicons name={isEditMode ? "save-outline" : "add-circle-outline"} size={22} color="#fff" />
                    <Text style={styles.submitText}>{isEditMode ? "Save Changes" : "List Product"}</Text>
                  </>}
            </TouchableOpacity>
          </Animated.View>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },
  scroll: { padding: 20, paddingBottom: 60 },
  header: { flexDirection: "row", alignItems: "center", marginBottom: 24 },
  backBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: "#fff", justifyContent: "center", alignItems: "center", shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
  title: { fontSize: 26, fontWeight: "900", color: "#1E261E" },
  subtitle: { fontSize: 13, color: "#8A998A", marginTop: 2 },
  card: { backgroundColor: "#fff", borderRadius: 24, padding: 20, marginBottom: 16, shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 12, elevation: 2 },
  sectionLabel: { fontSize: 13, fontWeight: "800", color: SOFT_GREEN, marginBottom: 14, letterSpacing: 0.5, textTransform: "uppercase" },
  input: { backgroundColor: "#F4F5E6", borderRadius: 14, padding: 14, fontSize: 15, color: "#1E261E", marginBottom: 12 },
  textArea: { height: 80, paddingTop: 14 },
  priceRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  priceInputBox: { flexDirection: "row", alignItems: "center", backgroundColor: "#F4F5E6", borderRadius: 14, paddingHorizontal: 14, height: 52, width: 110 },
  rupeeSymbol: { fontSize: 18, fontWeight: "800", color: SOFT_GREEN, marginRight: 4 },
  priceInput: { flex: 1, fontSize: 18, fontWeight: "700", color: "#1E261E" },
  perText: { fontSize: 14, color: "#8A998A", fontWeight: "600" },
  unitScroll: { gap: 8, paddingRight: 8 },
  unitPill: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, backgroundColor: "#F4F5E6" },
  unitText: { fontSize: 13, fontWeight: "700", color: "#6B7A6B" },
  imageRow: { flexDirection: "row", alignItems: "center", gap: 16 },
  imagePreviewBox: { width: 100, height: 100, borderRadius: 20, overflow: "hidden" },
  imagePreview: { width: "100%", height: "100%", borderRadius: 20 },
  imageEditBadge: { position: "absolute", bottom: 6, right: 6, backgroundColor: "rgba(0,0,0,0.5)", width: 28, height: 28, borderRadius: 14, justifyContent: "center", alignItems: "center" },
  noImageBox: { width: 100, height: 100, borderRadius: 20, backgroundColor: "#F4F5E6", justifyContent: "center", alignItems: "center", borderWidth: 2, borderStyle: "dashed", borderColor: "#C0CDB8" },
  noImageText: { fontSize: 10, color: "#C0CDB8", marginTop: 4, fontWeight: "600" },
  imageActions: { flex: 1, gap: 10 },
  imagePill: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "#F4F5E6", paddingVertical: 12, paddingHorizontal: 16, borderRadius: 14 },
  imagePillText: { fontSize: 14, fontWeight: "700", color: SOFT_GREEN },
  categoryGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  categoryBtn: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 14, borderWidth: 1.5, borderColor: "#E0E8D8", backgroundColor: "#F4F5E6" },
  categoryText: { fontSize: 13, fontWeight: "700", color: "#6B7A6B" },
  stockRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  availToggle: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12 },
  availText: { fontSize: 13, fontWeight: "700" },
  infoNote: { fontSize: 12, color: "#8A998A", lineHeight: 18, marginLeft: 8 },
  submitBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", backgroundColor: SOFT_GREEN, borderRadius: 20, paddingVertical: 18, gap: 10, shadowColor: SOFT_GREEN, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.35, shadowRadius: 16, elevation: 8, marginTop: 8 },
  submitText: { color: "#fff", fontSize: 17, fontWeight: "800" },

  // Modal Styles
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center", padding: 24 },
  modalCard: { backgroundColor: "#fff", width: "100%", borderRadius: 32, padding: 32, alignItems: "center" },
  modalIconBg: { width: 80, height: 80, borderRadius: 40, justifyContent: "center", alignItems: "center", marginBottom: 20 },
  modalTitle: { fontSize: 24, fontWeight: "900", color: "#1E261E", marginBottom: 12 },
  modalSub: { fontSize: 15, color: "#8A998A", textAlign: "center", lineHeight: 22, marginBottom: 32 },
  modalDoneBtn: { width: "100%", height: 60, borderRadius: 20, justifyContent: "center", alignItems: "center", shadowColor: "#000", shadowOpacity: 0.1, shadowRadius: 10, elevation: 4 },
  modalDoneText: { color: "#fff", fontSize: 16, fontWeight: "800" },
});
