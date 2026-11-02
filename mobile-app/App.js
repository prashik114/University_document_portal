/**
 * University Document Portal — Mobile Client
 * Expo / React Native
 *
 * Requires login before accessing any data.
 */
import React, { useState, useEffect } from 'react';
import {
  StyleSheet, Text, View, FlatList, TouchableOpacity,
  SafeAreaView, ActivityIndicator, Alert, StatusBar,
  TextInput, KeyboardAvoidingView, Platform,
} from 'react-native';
import { mobileApi } from './src/services/api';

// ── Login Screen ──────────────────────────────────────────────────────────────

function LoginScreen({ onLoginSuccess }) {
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      setError('Please enter your email and password.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const resp = await mobileApi.login(email.trim().toLowerCase(), password.trim());
      onLoginSuccess(resp.user);
    } catch (err) {
      setError(err.message || 'Authentication failed. Check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.loginContainer}
    >
      <View style={styles.loginCard}>
        <Text style={styles.loginTitle}>University Repository</Text>
        <Text style={styles.loginSubtitle}>Mobile Verification Desk</Text>

        {!!error && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        <Text style={styles.inputLabel}>Institutional Email</Text>
        <TextInput
          style={styles.textInput}
          placeholder="e.g. your.name@university.edu"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
        />

        <Text style={styles.inputLabel}>Password</Text>
        <TextInput
          style={styles.textInput}
          placeholder="Institutional password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoComplete="password"
        />

        <TouchableOpacity
          style={[styles.loginBtn, loading && { opacity: 0.7 }]}
          onPress={handleLogin}
          disabled={loading}
        >
          <Text style={styles.loginBtnText}>
            {loading ? 'Signing in…' : 'Sign In'}
          </Text>
        </TouchableOpacity>

        <Text style={styles.loginHint}>Demo password: Password@123</Text>
      </View>
    </KeyboardAvoidingView>
  );
}

// ── Main App ──────────────────────────────────────────────────────────────────

export default function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [data,        setData]        = useState(null);
  const [loading,     setLoading]     = useState(false);
  const [activeTab,   setActiveTab]   = useState('all');

  useEffect(() => {
    if (currentUser) fetchState();
  }, [currentUser]);

  const fetchState = async () => {
    setLoading(true);
    try {
      const res = await mobileApi.getState();
      setData(res);
    } catch {
      Alert.alert('Connection Error', 'Unable to reach the server. Check network settings.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = (doc) => {
    Alert.alert(
      'Verify Submission',
      `Advance "${doc.title}" to the next stage?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Verify & Forward',
          onPress: async () => {
            try {
              await mobileApi.verifyDocument(
                doc.id,
                currentUser.name,
                currentUser.role,
                'Verified via mobile desk'
              );
              Alert.alert('Success', 'Record verified and forwarded.');
              fetchState();
            } catch (err) {
              Alert.alert('Error', err.message || 'Verification failed.');
            }
          },
        },
      ]
    );
  };

  // ── Login gate ──────────────────────────────────────────────────────────
  if (!currentUser) {
    return <LoginScreen onLoginSuccess={setCurrentUser} />;
  }

  // ── Filter documents ────────────────────────────────────────────────────
  const docs = (data?.documents || []).filter(d => {
    if (activeTab === 'pending')  return d.status === 'Under Verification';
    if (activeTab === 'approved') return d.status === 'Approved';
    if (activeTab === 'returned') return d.status === 'Returned';
    return true;
  });

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#101828" />

      {/* Header */}
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>University Repository</Text>
          <Text style={styles.headerSubtitle}>Verification Desk — {currentUser.name}</Text>
        </View>
        <TouchableOpacity onPress={() => setCurrentUser(null)} style={styles.logoutBtn}>
          <Text style={styles.logoutText}>Sign Out</Text>
        </TouchableOpacity>
      </View>

      {/* KPI cards */}
      <View style={styles.kpiContainer}>
        {[
          { label: 'Total',    value: data?.kpis?.total             || 0, bg: '#eff6ff', bc: '#bfdbfe', color: '#2563eb' },
          { label: 'Queue',    value: data?.kpis?.underVerification || 0, bg: '#fffbeb', bc: '#fde68a', color: '#d97706' },
          { label: 'Returned', value: data?.kpis?.returned          || 0, bg: '#fef2f2', bc: '#fecaca', color: '#dc2626' },
          { label: 'Approved', value: data?.kpis?.approved          || 0, bg: '#f0fdf4', bc: '#bbf7d0', color: '#16a34a' },
        ].map(({ label, value, bg, bc, color }) => (
          <View key={label} style={[styles.kpiBox, { backgroundColor: bg, borderColor: bc }]}>
            <Text style={[styles.kpiNumber, { color }]}>{value}</Text>
            <Text style={styles.kpiLabel}>{label}</Text>
          </View>
        ))}
      </View>

      {/* Filter tabs */}
      <View style={styles.tabsRow}>
        {['all','pending','returned','approved'].map(tab => (
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

      {/* Document list */}
      {loading ? (
        <ActivityIndicator size="large" color="#2563eb" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={docs}
          keyExtractor={item => item.id}
          contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
          ListEmptyComponent={
            <View style={{ alignItems: 'center', marginTop: 40 }}>
              <Text style={{ color: '#64748b', fontSize: 14 }}>No records found.</Text>
            </View>
          }
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.docId}>{item.id} • {item.category}</Text>
                <View style={[
                  styles.badge,
                  item.status === 'Approved'          ? styles.badgeGreen :
                  item.status === 'Returned'           ? styles.badgeRed   :
                  styles.badgeAmber
                ]}>
                  <Text style={[
                    styles.badgeText,
                    { color: item.status === 'Approved' ? '#15803d' : item.status === 'Returned' ? '#b91c1c' : '#b45309' }
                  ]}>
                    {item.status}
                  </Text>
                </View>
              </View>

              <Text style={styles.docTitle}>{item.title}</Text>
              <Text style={styles.docOwner}>By: {item.ownerName} — {item.department}</Text>
              <Text style={styles.docMeta}>Stage: {item.currentStage} | {item.submittedOn}</Text>

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

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  // Login
  loginContainer: { flex:1, backgroundColor:'#0f172a', justifyContent:'center', alignItems:'center', padding:24 },
  loginCard:      { backgroundColor:'#fff', borderRadius:14, padding:24, width:'100%', maxWidth:400 },
  loginTitle:     { fontSize:22, fontWeight:'800', color:'#0f172a', textAlign:'center', marginBottom:4 },
  loginSubtitle:  { fontSize:13, color:'#64748b', textAlign:'center', marginBottom:20 },
  errorBox:       { backgroundColor:'#fef2f2', borderRadius:8, padding:12, marginBottom:14 },
  errorText:      { color:'#b91c1c', fontSize:13 },
  inputLabel:     { fontSize:12.5, fontWeight:'600', color:'#334155', marginBottom:5 },
  textInput:      { borderWidth:1, borderColor:'#cbd5e1', borderRadius:8, padding:10, marginBottom:14, fontSize:14, color:'#0f172a' },
  loginBtn:       { backgroundColor:'#2563eb', padding:13, borderRadius:8, alignItems:'center', marginTop:4 },
  loginBtnText:   { color:'#fff', fontWeight:'700', fontSize:15 },
  loginHint:      { fontSize:12, color:'#94a3b8', textAlign:'center', marginTop:12 },

  // App
  container:       { flex:1, backgroundColor:'#f8fafc' },
  header:          { padding:16, paddingTop:20, backgroundColor:'#101828', flexDirection:'row', alignItems:'center' },
  headerTitle:     { fontSize:18, fontWeight:'800', color:'#ffffff' },
  headerSubtitle:  { fontSize:11.5, color:'#94a3b8', marginTop:2 },
  logoutBtn:       { paddingHorizontal:12, paddingVertical:6, backgroundColor:'rgba(255,255,255,0.1)', borderRadius:6 },
  logoutText:      { color:'#fff', fontSize:12, fontWeight:'600' },
  kpiContainer:    { flexDirection:'row', padding:12, gap:8 },
  kpiBox:          { flex:1, padding:10, borderRadius:8, borderWidth:1, alignItems:'center' },
  kpiNumber:       { fontSize:20, fontWeight:'800' },
  kpiLabel:        { fontSize:11, color:'#64748b', marginTop:2 },
  tabsRow:         { flexDirection:'row', paddingHorizontal:16, gap:8, marginVertical:6 },
  tabBtn:          { paddingVertical:6, paddingHorizontal:12, borderRadius:6, backgroundColor:'#e2e8f0' },
  tabBtnActive:    { backgroundColor:'#2563eb' },
  tabBtnText:      { fontSize:11, fontWeight:'700', color:'#475569' },
  tabBtnTextActive:{ color:'#ffffff' },
  card:            { backgroundColor:'#ffffff', padding:14, borderRadius:10, marginBottom:12, borderWidth:1, borderColor:'#e2e8f0', shadowColor:'#000', shadowOpacity:0.04, shadowRadius:4, elevation:1 },
  cardHeader:      { flexDirection:'row', justifyContent:'space-between', alignItems:'center', marginBottom:6 },
  docId:           { fontSize:11, fontWeight:'600', color:'#64748b' },
  badge:           { paddingHorizontal:8, paddingVertical:3, borderRadius:9999 },
  badgeGreen:      { backgroundColor:'#dcfce7' },
  badgeAmber:      { backgroundColor:'#fef3c7' },
  badgeRed:        { backgroundColor:'#fee2e2' },
  badgeText:       { fontSize:10.5, fontWeight:'700' },
  docTitle:        { fontSize:15, fontWeight:'700', color:'#0f172a', marginBottom:4 },
  docOwner:        { fontSize:12.5, color:'#334155' },
  docMeta:         { fontSize:11, color:'#64748b', marginTop:4 },
  verifyBtn:       { marginTop:10, backgroundColor:'#2563eb', paddingVertical:9, borderRadius:7, alignItems:'center' },
  verifyBtnText:   { color:'#ffffff', fontWeight:'700', fontSize:13 },
});
