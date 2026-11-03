/**
 * Custom hook that owns all remote data state for the portal.
 * Centralises loading, error handling, and all API mutations so
 * components stay purely presentational.
 */
import { useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';

export function usePortalData() {
  const [documents,        setDocuments]        = useState([]);
  const [auditLogs,        setAuditLogs]        = useState([]);
  const [recentActivities, setRecentActivities] = useState([]);
  const [revisions,        setRevisions]        = useState([]);
  const [users,            setUsers]            = useState([]);
  const [departments,      setDepartments]      = useState([]);
  const [kpis,             setKpis]             = useState({ total:0, underVerification:0, returned:0, approved:0, draft:0 });
  const [loading,          setLoading]          = useState(false);
  const [backendOnline,    setBackendOnline]     = useState(true);

  // ── Load / reload ──────────────────────────────────────────────────────────

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [stateData, deptsData] = await Promise.all([
        api.getState(),
        api.getDepartments().catch(() => []),
      ]);
      if (stateData.documents)        setDocuments(stateData.documents);
      if (stateData.auditLogs)        setAuditLogs(stateData.auditLogs);
      if (stateData.recentActivities) setRecentActivities(stateData.recentActivities);
      if (stateData.revisionRequests) setRevisions(stateData.revisionRequests);
      if (stateData.users)            setUsers(stateData.users);
      if (stateData.kpis)             setKpis(stateData.kpis);
      if (Array.isArray(deptsData))   setDepartments(deptsData);
      setBackendOnline(true);
    } catch {
      setBackendOnline(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  // ── Document mutations ─────────────────────────────────────────────────────

  const submitDocument = useCallback(async (docPayload, actorName, actorRole) => {
    const saved = await api.createDocument(docPayload, actorName, actorRole);
    setDocuments(prev => [saved, ...prev]);
    return saved;
  }, []);

  const resubmitDocument = useCallback(async (docId, actorName, actorRole) => {
    const updated = await api.resubmitDocument(docId, actorName, actorRole);
    setDocuments(prev => prev.map(d => d.id === updated.id ? updated : d));
    return updated;
  }, []);

  const approveDocument = useCallback(async (docId, reviewerName, reviewerRole, comment = '') => {
    const updated = await api.verifyDocument(docId, reviewerName, reviewerRole, comment);
    setDocuments(prev => prev.map(d => d.id === updated.id ? updated : d));
    return updated;
  }, []);

  const returnDocument = useCallback(async (docId, reviewerName, reviewerRole, reason) => {
    const updated = await api.returnDocument(docId, reviewerName, reviewerRole, reason);
    setDocuments(prev => prev.map(d => d.id === updated.id ? updated : d));
    return updated;
  }, []);

  const lockDocument = useCallback(async (docId, reviewerName, reviewerRole) => {
    const updated = await api.lockDocument(docId, reviewerName, reviewerRole);
    setDocuments(prev => prev.map(d => d.id === updated.id ? updated : d));
    return updated;
  }, []);

  const batchForward = useCallback(async (actorName, actorRole) => {
    const result = await api.batchForward(actorName, actorRole);
    await loadAll();
    return result;
  }, [loadAll]);

  const batchLock = useCallback(async (actorName, actorRole) => {
    const result = await api.batchLock(actorName, actorRole);
    await loadAll();
    return result;
  }, [loadAll]);

  // ── User mutations ────────────────────────────────────────────────────────

  const provisionUser = useCallback(async (userData, actor) => {
    const saved = await api.provisionUser(userData, actor);
    setUsers(prev => [...prev, saved]);
    return saved;
  }, []);

  const updateUser = useCallback(async (id, data, actor) => {
    const updated = await api.updateUser(id, data, actor);
    setUsers(prev => prev.map(u => u.id === updated.id ? updated : u));
    return updated;
  }, []);

  const updateUserStatus = useCallback(async (id, status) => {
    const updated = await api.updateUserStatus(id, status);
    setUsers(prev => prev.map(u => u.id === updated.id ? updated : u));
    return updated;
  }, []);

  const updateUserPermissions = useCallback(async (id, perms) => {
    const updated = await api.updateUserPermissions(id, perms);
    setUsers(prev => prev.map(u => u.id === updated.id ? updated : u));
    return updated;
  }, []);

  const deleteUser = useCallback(async (id) => {
    await api.deleteUser(id);
    setUsers(prev => prev.filter(u => u.id !== id));
  }, []);

  return {
    documents, auditLogs, recentActivities, revisions, users, departments, kpis,
    loading, backendOnline,
    loadAll,
    submitDocument, resubmitDocument, approveDocument, returnDocument, lockDocument,
    batchForward, batchLock,
    provisionUser, updateUser, updateUserStatus, updateUserPermissions, deleteUser,
  };
}
