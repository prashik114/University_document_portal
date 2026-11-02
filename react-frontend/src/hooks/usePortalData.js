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
  const [kpis,             setKpis]             = useState({ total:0, underVerification:0, returned:0, approved:0, draft:0 });
  const [loading,          setLoading]          = useState(false);
  const [backendOnline,    setBackendOnline]     = useState(true);

  // ── Load / reload ──────────────────────────────────────────────────────────

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.getState();
      if (data.documents)        setDocuments(data.documents);
      if (data.auditLogs)        setAuditLogs(data.auditLogs);
      if (data.recentActivities) setRecentActivities(data.recentActivities);
      if (data.revisionRequests) setRevisions(data.revisionRequests);
      if (data.users)            setUsers(data.users);
      if (data.kpis)             setKpis(data.kpis);
      setBackendOnline(true);
    } catch {
      setBackendOnline(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  // ── Document mutations (all persisted to backend) ─────────────────────────

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
    await loadAll(); // reload full state after bulk operation
    return result;
  }, [loadAll]);

  const batchLock = useCallback(async (actorName, actorRole) => {
    const result = await api.batchLock(actorName, actorRole);
    await loadAll();
    return result;
  }, [loadAll]);

  return {
    documents, auditLogs, recentActivities, revisions, users, kpis,
    loading, backendOnline,
    loadAll,
    submitDocument, resubmitDocument, approveDocument, returnDocument, lockDocument,
    batchForward, batchLock,
  };
}
