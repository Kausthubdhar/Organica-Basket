import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, DeviceEventEmitter, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeIn, FadeOut, ZoomIn, ZoomOut } from 'react-native-reanimated';

export type AlertType = 'success' | 'error' | 'info' | 'confirm';

interface AlertButton {
  text: string;
  onPress: () => void;
  style?: 'default' | 'cancel' | 'destructive';
}

interface AlertConfig {
  title: string;
  message: string;
  type?: AlertType;
  buttons?: AlertButton[];
  onConfirm?: () => void;
  onCancel?: () => void;
}

export const showModernAlert = (config: AlertConfig) => {
  DeviceEventEmitter.emit('SHOW_MODERN_ALERT', config);
};

export default function ModernAlert() {
  const [visible, setVisible] = useState(false);
  const [config, setConfig] = useState<AlertConfig | null>(null);

  useEffect(() => {
    const sub = DeviceEventEmitter.addListener('SHOW_MODERN_ALERT', (newConfig: AlertConfig) => {
      setConfig(newConfig);
      setVisible(true);
    });
    return () => sub.remove();
  }, []);

  if (!config) return null;

  const handleAction = (onPress?: () => void) => {
    setVisible(false);
    onPress?.();
  };


  const icon = config.type === 'success' ? 'checkmark-circle' : 
               config.type === 'error' ? 'alert-circle' : 
               config.type === 'confirm' ? 'help-circle' : 'information-circle';
  const color = config.type === 'success' ? '#27AE60' : 
                config.type === 'error' ? '#E74C3C' : 
                config.type === 'confirm' ? '#FF8C42' : '#4A6038';

  return (
    <Modal transparent visible={visible} animationType="none">
      <View style={styles.overlay}>
        <Animated.View 
          entering={FadeIn.duration(200)} 
          exiting={FadeOut.duration(200)} 
          style={StyleSheet.absoluteFill}
        >
          <TouchableOpacity 
            activeOpacity={1} 
            onPress={() => handleAction(config.onCancel)} 
            style={styles.backdrop} 
          />
        </Animated.View>

        <Animated.View 
          entering={ZoomIn.springify()} 
          exiting={ZoomOut}
          style={styles.alertBox}
        >
          <BlurView intensity={Platform.OS === 'ios' ? 80 : 100} tint="light" style={styles.blur}>
            <View style={[styles.iconContainer, { backgroundColor: color + '15' }]}>
              <Ionicons name={icon as any} size={32} color={color} />
            </View>
            
            <Text style={styles.title}>{config.title}</Text>
            <Text style={styles.message}>{config.message}</Text>
            
            <View style={[styles.footer, config.buttons && config.buttons.length > 2 ? { flexDirection: 'column' } : null]}>
              {config.buttons ? (
                config.buttons.map((btn, i) => (
                  <TouchableOpacity 
                    key={i}
                    onPress={() => handleAction(btn.onPress)} 
                    style={[
                      styles.btnBase,
                      btn.style === 'cancel' ? styles.cancelBtn : 
                      btn.style === 'destructive' ? { backgroundColor: '#E74C3C' } :
                      { backgroundColor: color }
                    ]}
                  >
                    <Text style={[styles.btnText, btn.style === 'cancel' ? styles.cancelText : { color: '#fff' }]}>
                      {btn.text}
                    </Text>
                  </TouchableOpacity>
                ))
              ) : (
                <>
                  {config.type === 'confirm' && (
                    <TouchableOpacity onPress={() => handleAction(config.onCancel)} style={styles.cancelBtn}>
                      <Text style={styles.cancelText}>Cancel</Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity 
                    onPress={() => handleAction(config.onConfirm)} 
                    style={[styles.btnBase, { backgroundColor: color }]}
                  >
                    <Text style={styles.btnText}>{config.type === 'confirm' ? 'Confirm' : 'OK'}</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          </BlurView>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' },
  alertBox: { width: '85%', borderRadius: 32, overflow: 'hidden', backgroundColor: 'rgba(255, 255, 255, 0.95)' },
  blur: { padding: 32, alignItems: 'center' },
  iconContainer: { width: 64, height: 64, borderRadius: 32, justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  title: { fontSize: 22, fontWeight: '800', color: '#1E261E', marginBottom: 10, textAlign: 'center', fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif' },
  message: { fontSize: 15, color: '#6B7A6B', textAlign: 'center', lineHeight: 22, marginBottom: 30 },
  footer: { flexDirection: 'row', gap: 12, width: '100%' },
  btnBase: { flex: 1, height: 56, borderRadius: 18, justifyContent: 'center', alignItems: 'center', shadowColor: "#000", shadowOpacity: 0.1, shadowRadius: 10, elevation: 2 },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  cancelBtn: { flex: 1, height: 56, borderRadius: 18, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F4F5E6' },
  cancelText: { color: '#8A998A', fontWeight: '700', fontSize: 16 },
});
