import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
  Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getAuth, sendPasswordResetEmail } from 'firebase/auth';
import { getDb } from '../firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { Mail } from 'lucide-react-native';

const NAVY = '#203562';
const WHITE = '#fff';

const ForgotPasswordScreen = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSendReset = async () => {
    setError('');
    setSuccess('');
    if (!email.trim()) {
      setError('Please enter your email address.');
      return;
    }
    setLoading(true);
    try {
      const orgId = await AsyncStorage.getItem('selectedOrgId');
      if (!orgId) {
        setError('No organization selected. Please select your organization first.');
        setLoading(false);
        return;
      }
      const emailToCheck = email.trim().toLowerCase();
      const db = getDb();
      const usersRef = collection(db, 'organizations', orgId, 'users');
      const q = query(usersRef, where('email', '==', emailToCheck));
      const snapshot = await getDocs(q);
      if (snapshot.empty) {
        setError('No account found with this email address in your organization.');
        setLoading(false);
        return;
      }
      const auth = getAuth();
      try {
        await sendPasswordResetEmail(auth, emailToCheck);
        setSuccess('A password reset email has been sent. Please check your inbox.');
        setEmail('');
      } catch (error) {
        console.log('Password reset error:', error.code, error.message);
        if (error.code === 'auth/user-not-found') {
          setError('This email is not registered for password reset. Please contact your administrator.');
        } else if (error.code === 'auth/invalid-email') {
          setError('Invalid email address.');
        } else {
          setError('Failed to send reset email. Please try again.');
        }
      }
    } catch (error) {
      console.log('Firestore query error:', error.code, error.message);
      setError('Failed to check email. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <View style={styles.topContent}>
        <View style={styles.iconRow}>
          <Mail color={NAVY} size={32} />
        </View>
        <Text style={styles.title}>Forgot Password?</Text>
        <Text style={styles.subtitle}>Enter your email to receive a password reset link.</Text>
        <View style={styles.inputRow}>
          <Mail color={NAVY} size={20} style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder="Email address"
            placeholderTextColor="#b0b8c1"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            editable={!loading}
          />
        </View>
        {error ? <Text style={styles.errorText}>{error}</Text> : null}
        {success ? <Text style={styles.successText}>{success}</Text> : null}
        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleSendReset}
          activeOpacity={0.85}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Send Reset Email</Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: WHITE,
  },
  topContent: {
    paddingHorizontal: 24,
    paddingTop: 32,
    alignItems: 'flex-start',
    justifyContent: 'flex-start',
  },
  iconRow: {
    marginBottom: 8,
    alignItems: 'flex-start',
    width: '100%',
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: NAVY,
    marginBottom: 6,
    textAlign: 'left',
  },
  subtitle: {
    fontSize: 15,
    color: NAVY,
    opacity: 0.7,
    marginBottom: 18,
    textAlign: 'left',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    backgroundColor: '#f3f6fa',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5eaf2',
    marginBottom: 10,
    paddingHorizontal: 10,
    paddingVertical: Platform.OS === 'ios' ? 6 : 2,
  },
  inputIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: NAVY,
    paddingVertical: 8,
    backgroundColor: 'transparent',
  },
  button: {
    backgroundColor: NAVY,
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    width: '100%',
    marginTop: 10,
    shadowColor: NAVY,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.09,
    shadowRadius: 4,
    elevation: 2,
  },
  buttonDisabled: {
    backgroundColor: '#a0aec0',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  errorText: {
    color: '#D92626',
    fontSize: 15,
    marginBottom: 6,
    marginTop: 2,
    textAlign: 'left',
    fontWeight: '500',
  },
  successText: {
    color: '#10b981',
    fontSize: 15,
    marginBottom: 6,
    marginTop: 2,
    textAlign: 'left',
    fontWeight: '500',
  },
});

export default ForgotPasswordScreen; 