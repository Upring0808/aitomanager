import React, { useEffect, useState } from "react";
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator } from "react-native";
import { db } from "../../../../config/firebaseconfig";
import { doc, getDoc, setDoc } from "firebase/firestore";
import Toast from "react-native-toast-message";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { MaterialIcons } from "@expo/vector-icons";

const FineSettingsScreen = ({ navigation }) => {
  const [studentFine, setStudentFine] = useState("");
  const [officerFine, setOfficerFine] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchFineSettings = async () => {
      setLoading(true);
      try {
        const orgId = await AsyncStorage.getItem("selectedOrgId");
        if (!orgId) return;
        const fineSettingsRef = doc(db, "organizations", orgId, "settings", "fineSettings");
        const fineSettingsSnap = await getDoc(fineSettingsRef);
        if (fineSettingsSnap.exists()) {
          const data = fineSettingsSnap.data();
          setStudentFine(data.studentFine?.toString() || "");
          setOfficerFine(data.officerFine?.toString() || "");
        }
      } catch (e) {}
      setLoading(false);
    };
    fetchFineSettings();
  }, []);

  const saveFineSettings = async () => {
    setLoading(true);
    try {
      const orgId = await AsyncStorage.getItem("selectedOrgId");
      if (!orgId) return;
      const fineSettingsRef = doc(db, "organizations", orgId, "settings", "fineSettings");
      await setDoc(fineSettingsRef, {
        studentFine: parseFloat(studentFine) || 50,
        officerFine: parseFloat(officerFine) || 100,
      });
      Toast.show({ type: "success", text1: "Fine settings saved!" });
      if (navigation && navigation.goBack) navigation.goBack();
    } catch (error) {
      Toast.show({ type: "error", text1: "Failed to save fine settings" });
    }
    setLoading(false);
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#f8f9fa', justifyContent: 'center', alignItems: 'center', padding: 0 }}>
      <View style={{ backgroundColor: '#fff', width: '92%', borderRadius: 16, padding: 22, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 18 }}>
          <TouchableOpacity onPress={() => navigation?.goBack?.()} style={{ marginRight: 10 }}>
            <MaterialIcons name="arrow-back" size={26} color="#203562" />
          </TouchableOpacity>
          <Text style={{ fontWeight: 'bold', fontSize: 20, color: '#203562' }}>Fine Settings</Text>
        </View>
        <View style={{ marginBottom: 20 }}>
          <Text style={{ fontSize: 15, marginBottom: 6, color: '#203562', fontWeight: '600' }}>Student Fine</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 8, paddingHorizontal: 10 }}>
            <MaterialIcons name="school" size={20} color="#007BFF" style={{ marginRight: 6 }} />
            <Text style={{ fontSize: 16, color: '#64748b', marginRight: 2 }}>₱</Text>
            <TextInput
              style={{ flex: 1, height: 44, fontSize: 16, color: '#1e293b', backgroundColor: 'transparent' }}
              keyboardType="numeric"
              value={studentFine}
              onChangeText={setStudentFine}
              placeholder="e.g. 50"
              editable={!loading}
              placeholderTextColor="#b6c2d1"
            />
          </View>
        </View>
        <View style={{ marginBottom: 20 }}>
          <Text style={{ fontSize: 15, marginBottom: 6, color: '#203562', fontWeight: '600' }}>Officer Fine</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 8, paddingHorizontal: 10 }}>
            <MaterialIcons name="security" size={20} color="#007BFF" style={{ marginRight: 6 }} />
            <Text style={{ fontSize: 16, color: '#64748b', marginRight: 2 }}>₱</Text>
            <TextInput
              style={{ flex: 1, height: 44, fontSize: 16, color: '#1e293b', backgroundColor: 'transparent' }}
              keyboardType="numeric"
              value={officerFine}
              onChangeText={setOfficerFine}
              placeholder="e.g. 100"
              editable={!loading}
              placeholderTextColor="#b6c2d1"
            />
          </View>
        </View>
        <TouchableOpacity
          style={{
            backgroundColor: loading ? '#b6c2d1' : '#007BFF',
            borderRadius: 10,
            paddingVertical: 16,
            alignItems: 'center',
            marginTop: 8,
            shadowColor: '#007BFF',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.12,
            shadowRadius: 6,
            elevation: 2,
            opacity: loading ? 0.7 : 1,
          }}
          onPress={saveFineSettings}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 17, letterSpacing: 0.2 }}>Save Fine Settings</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default FineSettingsScreen; 