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
    <View style={{ flex: 1, backgroundColor: "#fff", padding: 24, justifyContent: "center" }}>
      <TouchableOpacity onPress={() => navigation?.goBack?.()} style={{ position: "absolute", top: 40, left: 20, zIndex: 2 }}>
        <MaterialIcons name="arrow-back" size={28} color="#203562" />
      </TouchableOpacity>
      <Text style={{ fontWeight: "bold", fontSize: 22, marginBottom: 24, color: "#203562", alignSelf: "center" }}>Fine Settings</Text>
      <View style={{ marginBottom: 20 }}>
        <Text style={{ fontSize: 16, marginBottom: 6 }}>Student Fine (₱):</Text>
        <TextInput
          style={{ borderWidth: 1, borderColor: "#e2e8f0", borderRadius: 8, padding: 12, fontSize: 16 }}
          keyboardType="numeric"
          value={studentFine}
          onChangeText={setStudentFine}
          placeholder="e.g. 50"
          editable={!loading}
        />
      </View>
      <View style={{ marginBottom: 20 }}>
        <Text style={{ fontSize: 16, marginBottom: 6 }}>Officer Fine (₱):</Text>
        <TextInput
          style={{ borderWidth: 1, borderColor: "#e2e8f0", borderRadius: 8, padding: 12, fontSize: 16 }}
          keyboardType="numeric"
          value={officerFine}
          onChangeText={setOfficerFine}
          placeholder="e.g. 100"
          editable={!loading}
        />
      </View>
      <TouchableOpacity
        style={{
          backgroundColor: "#007BFF",
          borderRadius: 8,
          paddingVertical: 14,
          alignItems: "center",
          marginTop: 8,
          opacity: loading ? 0.6 : 1,
        }}
        onPress={saveFineSettings}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={{ color: "#fff", fontWeight: "bold", fontSize: 16 }}>Save Fine Settings</Text>
        )}
      </TouchableOpacity>
    </View>
  );
};

export default FineSettingsScreen; 