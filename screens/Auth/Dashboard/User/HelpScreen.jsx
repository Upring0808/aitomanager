import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

const HelpScreen = ({ navigation }) => {
  const faqData = [
    {
      question: "How do I check my fines?",
      answer: "Go to the Fines tab to view your current fines and payment history."
    },
    {
      question: "How do I attend events?",
      answer: "Use the QR scanner in the Events tab to scan the event QR code when you arrive."
    },
    {
      question: "What if I can't attend an event?",
      answer: "Contact an admin through the chat feature if you have a valid reason for missing an event."
    },
    {
      question: "How do I contact an admin?",
      answer: "Tap the message icon in the header to start a conversation with an admin."
    },
    {
      question: "What are the notification icons for?",
      answer: "The notification icon shows important updates, announcements, and reminders about events and fines."
    }
  ];

  const supportOptions = [
    {
      title: "Chat with Admin",
      description: "Get immediate help from administrators",
      icon: "message",
      action: () => navigation.navigate('Chat'),
    },
    {
      title: "Email Support",
      description: "Send us an email for detailed assistance",
      icon: "email",
      action: () => Linking.openURL('mailto:support@yourorg.com'),
    },
    {
      title: "App Guide",
      description: "Learn how to use all features",
      icon: "book",
      action: () => navigation.navigate('AppGuide'),
    },
  ];

  return (
    <ScrollView style={styles.container}>
      {/* Welcome Section */}
      <View style={styles.welcomeSection}>
        <MaterialIcons name="help" size={48} color="#007BFF" />
        <Text style={styles.welcomeTitle}>Need Help?</Text>
        <Text style={styles.welcomeSubtitle}>
          We're here to help you with any questions or issues you might have.
        </Text>
      </View>

      {/* Support Options */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Get Support</Text>
        {supportOptions.map((option, index) => (
          <TouchableOpacity
            key={index}
            style={styles.supportCard}
            onPress={option.action}
          >
            <MaterialIcons name={option.icon} size={24} color="#007BFF" />
            <View style={styles.supportContent}>
              <Text style={styles.supportTitle}>{option.title}</Text>
              <Text style={styles.supportDescription}>{option.description}</Text>
            </View>
            <MaterialIcons name="chevron-right" size={24} color="#64748b" />
          </TouchableOpacity>
        ))}
      </View>

      {/* FAQ Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Frequently Asked Questions</Text>
        {faqData.map((item, index) => (
          <View key={index} style={styles.faqCard}>
            <Text style={styles.faqQuestion}>{item.question}</Text>
            <Text style={styles.faqAnswer}>{item.answer}</Text>
          </View>
        ))}
      </View>

      {/* Contact Info */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Contact Information</Text>
        <View style={styles.contactCard}>
          <MaterialIcons name="location-on" size={20} color="#64748b" />
          <Text style={styles.contactText}>Main Office: Room 101, Building A</Text>
        </View>
        <View style={styles.contactCard}>
          <MaterialIcons name="phone" size={20} color="#64748b" />
          <Text style={styles.contactText}>Phone: (123) 456-7890</Text>
        </View>
        <View style={styles.contactCard}>
          <MaterialIcons name="schedule" size={20} color="#64748b" />
          <Text style={styles.contactText}>Hours: Mon-Fri 8:00 AM - 5:00 PM</Text>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
  },
  welcomeSection: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 24,
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
  },
  welcomeTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1e293b',
    marginTop: 16,
  },
  welcomeSubtitle: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 22,
  },
  section: {
    marginTop: 24,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 16,
  },
  supportCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  supportContent: {
    flex: 1,
    marginLeft: 12,
  },
  supportTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
  },
  supportDescription: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 2,
  },
  faqCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  faqQuestion: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 8,
  },
  faqAnswer: {
    fontSize: 14,
    color: '#64748b',
    lineHeight: 20,
  },
  contactCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  contactText: {
    fontSize: 14,
    color: '#64748b',
    marginLeft: 12,
  },
});

export default HelpScreen; 