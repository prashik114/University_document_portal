import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, FlatList, TouchableOpacity, SafeAreaView, ActivityIndicator, Alert, StatusBar } from 'react-native';
import { mobileApi } from './src/services/api';

export default function App() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');

  useEffect(() => {
    fetchState();
  }, []);

  const fetchState = async () => {
    setLoading(true);
    const res = await mobileApi.getState();
    if (res) setData(res);
    setLoading(false);
  };

  const handleVerify = async (doc) => {
    Alert.alert(
      "Verify Submission",
      `Are you sure you want to verify and forward "${doc.title}"?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Verify & Forward",
          onPress: async () => {
            await mobileApi.verifyDocument(doc.id);
            Alert.alert("Success", "Record verified and forwarded to IQAC.");
            fetchState();
          }
        }
      ]
    );
  };

  const docs = (data?.documents || []).filter(d => {
    if (activeTab === 'pending') return d.status === 'Under Verification';
    if (activeTab === 'approved') return d.status === 'Approved';
    if (activeTab === 'returned') return d.status === 'Returned';
    return true;
  });

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#101828" />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>University Repository</Text>
        <Text style={styles.headerSubtitle}>Accreditation &amp; Evidence Mobile Desk</Text>
      </View>

      {/* KPI Cards */}
      <View style={styles.kpiContainer}>
        <View style={[styles.kpiBox, { backgroundColor: '#eff6ff', borderColor: '#bfdbfe' }]}>
          <Text style={[styles.kpiNumber, { color: '#2563eb' }]}>{data?.kpis?.total || 14}</Text>
          <Text style={styles.kpiLabel}>Total</Text>
        </View>
        <View style={[styles.kpiBox, { backgroundColor: '#fffbeb', borderColor: '#fde68a' }]}>
          <Text style={[styles.kpiNumber, { color: '#d97706' }]}>{data?.kpis?.underVerification || 5}</Text>
          <Text style={styles.kpiLabel}>Queue</Text>
        </View>
        <View style={[styles.kpiBox, { backgroundColor: '#fef2f2', borderColor: '#fecaca' }]}>
          <Text style={[styles.kpiNumber, { color: '#dc2626' }]}>{data?.kpis?.returned || 4}</Text>
          <Text style={styles.kpiLabel}>Returned</Text>
        </View>
        <View style={[styles.kpiBox, { backgroundColor: '#f0fdf4', borderColor: '#bbf7d0' }]}>
          <Text style={[styles.kpiNumber, { color: '#16a34a' }]}>{data?.kpis?.approved || 5}</Text>
          <Text style={styles.kpiLabel}>Approved</Text>
        </View>
      </View>

      {/* Filter Tabs */}
      <View style={styles.tabsRow}>
        {['all', 'pending', 'returned', 'approved'].map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tabBtn, activeTab === tab && styles.tabBtnActive]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabBtnText, activeTab === tab && styles.tabBtnTextActive]}>
              {tab.toUpperCase()}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* List */}
      {loading ? (
        <ActivityIndicator size="large" color="#2563eb" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={docs}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16 }}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.docId}>{item.id} • {item.category}</Text>
                <View style={[
                  styles.badge,
                  item.status === 'Approved' ? styles.badgeGreen :
                  item.status === 'Returned' ? styles.badgeRed : styles.badgeAmber
                ]}>
                  <Text style={styles.badgeText}>{item.status}</Text>
                </View>
              </View>

              <Text style={styles.docTitle}>{item.title}</Text>
              <Text style={styles.docOwner}>By: {item.ownerName} ({item.department})</Text>
              <Text style={styles.docMeta}>Stage: {item.currentStage} | Submitted: {item.submittedOn}</Text>

              {item.status === 'Under Verification' && (
                <TouchableOpacity style={styles.verifyBtn} onPress={() => handleVerify(item)}>
                  <Text style={styles.verifyBtnText}>Verify &amp; Advance Stage</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { padding: 16, backgroundColor: '#101828' },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#ffffff' },
  headerSubtitle: { fontSize: 12, color: '#94a3b8', marginTop: 2 },
  kpiContainer: { flexDirection: 'row', padding: 12, gap: 8 },
  kpiBox: { flex: 1, padding: 10, borderRadius: 8, borderWidth: 1, alignItems: 'center' },
  kpiNumber: { fontSize: 18, fontWeight: '800' },
  kpiLabel: { fontSize: 11, color: '#64748b', marginTop: 2 },
  tabsRow: { flexDirection: 'row', paddingHorizontal: 16, gap: 8, marginVertical: 6 },
  tabBtn: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 6, backgroundColor: '#e2e8f0' },
  tabBtnActive: { backgroundColor: '#2563eb' },
  tabBtnText: { fontSize: 11, fontWeight: '700', color: '#475569' },
  tabBtnTextActive: { color: '#ffffff' },
  card: { backgroundColor: '#ffffff', padding: 14, borderRadius: 10, marginBottom: 12, borderWidth: 1, borderColor: '#e2e8f0' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  docId: { fontSize: 11, fontWeight: '600', color: '#64748b' },
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 9999 },
  badgeGreen: { backgroundColor: '#dcfce7' },
  badgeAmber: { backgroundColor: '#fef3c7' },
  badgeRed: { backgroundColor: '#fee2e2' },
  badgeText: { fontSize: 10.5, fontWeight: '700' },
  docTitle: { fontSize: 15, fontWeight: '700', color: '#0f172a', marginBottom: 4 },
  docOwner: { fontSize: 12.5, color: '#334155' },
  docMeta: { fontSize: 11, color: '#64748b', marginTop: 4 },
  verifyBtn: { marginTop: 10, backgroundColor: '#2563eb', paddingVertical: 8, borderRadius: 6, alignItems: 'center' },
  verifyBtnText: { color: '#ffffff', fontWeight: '700', fontSize: 12 }
});

