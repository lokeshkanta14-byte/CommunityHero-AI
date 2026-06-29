import React, { useState, useEffect } from 'react';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, onSnapshot, query, doc, updateDoc, arrayUnion, deleteDoc } from 'firebase/firestore';
import { CivicIssue, AppUser, IssueStatus, StatusHistory } from '../types';
import { 
  ShieldAlert, Activity, CheckCircle2, Clock, MapPin, 
  ChevronRight, ArrowDownRight, Edit3, Send, AlertCircle, Loader2, Sparkles, Trash2, CheckCircle
} from 'lucide-react';

interface AdminDashboardProps {
  user: AppUser;
}

export default function AdminDashboard({ user }: AdminDashboardProps) {
  const [issues, setIssues] = useState<CivicIssue[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIssue, setSelectedIssue] = useState<CivicIssue | null>(null);

  // Status adjustment form state variables
  const [newStatus, setNewStatus] = useState<IssueStatus>('under_review');
  const [adminNote, setAdminNote] = useState('');
  const [updating, setUpdating] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Deletion state variables
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDeleteIssue = async (issueId: string) => {
    if (!user?.isAdmin) {
      setErrorMsg("Unauthorized: Only authenticated admin users can delete complaints.");
      return;
    }
    setDeletingId(issueId);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const issueRef = doc(db, 'issues', issueId);
      await deleteDoc(issueRef);
      setSuccessMsg("Complaint was successfully and permanently deleted from the database.");
      if (selectedIssue?.id === issueId) {
        setSelectedIssue(null);
      }
      setDeleteConfirmId(null);
    } catch (err: any) {
      console.error("Failed to delete complaint:", err);
      setErrorMsg(`Failed to delete complaint: ${err?.message || String(err)}`);
      handleFirestoreError(err, OperationType.DELETE, `issues/${issueId}`);
    } finally {
      setDeletingId(null);
    }
  };

  // Load real-time issues
  useEffect(() => {
    const q = query(collection(db, 'issues'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const loadedIssues: CivicIssue[] = [];
      snapshot.forEach((doc) => {
        loadedIssues.push({ id: doc.id, ...doc.data() } as CivicIssue);
      });
      // Sort issues by priority (critical, high, medium, low) and date
      const priorityWeights = { critical: 4, high: 3, medium: 2, low: 1 };
      loadedIssues.sort((a, b) => {
        const weightA = priorityWeights[a.priority] || 0;
        const weightB = priorityWeights[b.priority] || 0;
        if (weightA !== weightB) return weightB - weightA;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
      setIssues(loadedIssues);
      setLoading(false);
    }, (error) => {
      console.error("AdminSnapshot error:", error);
      setLoading(false);
      handleFirestoreError(error, OperationType.GET, 'issues');
    });

    return () => unsubscribe();
  }, []);

  const handleSelectIssue = (issue: CivicIssue) => {
    setSelectedIssue(issue);
    setNewStatus(issue.status);
    setAdminNote('');
    setErrorMsg(null);
  };

  const handleUpdateStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedIssue) return;
    if (!adminNote.trim()) {
      setErrorMsg("Please write an administrative note explaining this status change.");
      return;
    }

    setUpdating(true);
    setErrorMsg(null);

    try {
      const issueRef = doc(db, 'issues', selectedIssue.id);
      const logEntry: StatusHistory = {
        status: newStatus,
        note: adminNote.trim(),
        updatedBy: user.displayName || user.email || 'Admin',
        updatedAt: new Date().toISOString()
      };

      await updateDoc(issueRef, {
        status: newStatus,
        statusHistory: arrayUnion(logEntry)
      });

      // Update selected issue locally
      setSelectedIssue({
        ...selectedIssue,
        status: newStatus,
        statusHistory: [...selectedIssue.statusHistory, logEntry]
      });

      setAdminNote('');
    } catch (err: any) {
      console.error("Status update failed:", err);
      setErrorMsg("Failed to update status in database.");
      handleFirestoreError(err, OperationType.UPDATE, `issues/${selectedIssue.id}`);
    } finally {
      setUpdating(false);
    }
  };

  // Administrative Metrics calculations
  const totalCount = issues.length;
  const criticalPending = issues.filter(i => i.priority === 'critical' && i.status !== 'resolved').length;
  const activeReview = issues.filter(i => i.status === 'under_review').length;
  const activeProgress = issues.filter(i => i.status === 'in_progress').length;
  const resolved = issues.filter(i => i.status === 'resolved').length;

  const getCategoryEmoji = (cat: string) => {
    switch (cat) {
      case 'potholes': return '🛠️';
      case 'water_leakage': return '💧';
      case 'garbage': return '🚮';
      case 'damaged_streetlights': return '💡';
      case 'road_accidents': return '⚠️';
      case 'drainage_problems': return '🌊';
      default: return '❓';
    }
  };

  const getPriorityBadgeColor = (prio: string) => {
    switch (prio) {
      case 'critical': return 'bg-rose-100 text-rose-800 border-rose-200';
      case 'high': return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'medium': return 'bg-indigo-100 text-indigo-800 border-indigo-200';
      default: return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'resolved': return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'in_progress': return 'bg-sky-100 text-sky-800 border-sky-200';
      case 'under_review': return 'bg-indigo-100 text-indigo-800 border-indigo-200';
      default: return 'bg-amber-100 text-amber-800 border-amber-200';
    }
  };

  return (
    <div className="max-w-7xl mx-auto py-8 px-4" id="admin-dashboard-root">
      
      {/* Title Header Banner */}
      <div className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="inline-flex items-center space-x-1 bg-emerald-50 border border-emerald-100 text-emerald-700 px-3 py-1 rounded-full text-xs font-semibold mb-2">
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>Authenticated Municipal Administrator Workspace</span>
          </div>
          <h1 className="font-sans font-extrabold text-3xl text-slate-800 tracking-tight">Superintendent Command Center</h1>
          <p className="text-slate-500 text-sm mt-0.5">Maintain, triage, and log updates to civic incidents registered in the community.</p>
        </div>
      </div>

      {/* Admin metrics Bento Grid */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
        <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm" id="admin-metric-total">
          <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Total Filings</span>
          <span className="text-2xl font-black text-slate-800 mt-1 block">{totalCount}</span>
        </div>
        <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm border-l-4 border-l-rose-500" id="admin-metric-critical">
          <span className="text-[10px] uppercase font-bold tracking-wider text-rose-600">Active Critical</span>
          <span className="text-2xl font-black text-rose-600 mt-1 block">{criticalPending}</span>
        </div>
        <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm border-l-4 border-l-indigo-500" id="admin-metric-review">
          <span className="text-[10px] uppercase font-bold tracking-wider text-indigo-600">Under Review</span>
          <span className="text-2xl font-black text-indigo-600 mt-1 block">{activeReview}</span>
        </div>
        <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm border-l-4 border-l-sky-500" id="admin-metric-progress">
          <span className="text-[10px] uppercase font-bold tracking-wider text-sky-600">In Progress</span>
          <span className="text-2xl font-black text-sky-600 mt-1 block">{activeProgress}</span>
        </div>
        <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm border-l-4 border-l-emerald-500" id="admin-metric-resolved">
          <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-600">Resolved Fixed</span>
          <span className="text-2xl font-black text-emerald-600 mt-1 block">{resolved}</span>
        </div>
      </div>

      {/* Main Grid section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Triage Incident Queue (Left Columns) */}
        <div className="lg:col-span-7 flex flex-col gap-4">
          <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-sm">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-4">Urgent Dispatch Incidents Queue</span>
            
            {successMsg && (
              <div className="mb-4 text-xs text-emerald-700 bg-emerald-50 border border-emerald-100 p-3 rounded-2xl font-bold flex items-center gap-2" id="admin-success-toast">
                <CheckCircle className="w-4 h-4 shrink-0" />
                <span>{successMsg}</span>
              </div>
            )}
            {errorMsg && !selectedIssue && (
              <div className="mb-4 text-xs text-rose-700 bg-rose-50 border border-rose-100 p-3 rounded-2xl font-bold flex items-center gap-2" id="admin-error-toast">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {loading ? (
              <div className="text-center py-20 text-xs text-slate-400 font-semibold">Syncing queue databases...</div>
            ) : issues.length === 0 ? (
              <div className="text-center py-16 text-xs text-slate-400 font-medium">No complaints registered on the portal yet.</div>
            ) : (
              <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2" id="admin-incident-list">
                {issues.map((issue) => (
                  <div
                    key={issue.id}
                    onClick={() => handleSelectIssue(issue)}
                    className={`p-4 border rounded-2xl cursor-pointer transition-all flex items-start justify-between gap-4 ${
                      selectedIssue?.id === issue.id
                        ? 'border-emerald-500 bg-emerald-50/10 shadow-md'
                        : 'border-slate-100 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-start space-x-3 text-xs flex-1 min-w-0">
                      <div className="p-2 bg-slate-50 rounded-xl font-semibold border text-base shrink-0 select-none">
                        {getCategoryEmoji(issue.category)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center space-x-2">
                          <span className={`text-[9px] uppercase tracking-wider font-extrabold px-2 py-0.5 rounded-full border ${getPriorityBadgeColor(issue.priority)}`}>
                            {issue.priority}
                          </span>
                          <span className={`text-[9px] uppercase tracking-wider font-extrabold px-2 py-0.5 rounded-full border ${getStatusBadgeColor(issue.status)}`}>
                            {issue.status.replace('_', ' ')}
                          </span>
                        </div>
                        <h3 className="font-sans font-bold text-slate-800 mt-1.5 truncate text-xs">{issue.title}</h3>
                        <p className="text-slate-400 mt-0.5 text-[11px] truncate flex items-center space-x-1">
                          <MapPin className="w-3 h-3 shrink-0" />
                          <span>{issue.address}</span>
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end shrink-0 text-right justify-between self-stretch">
                      <span className="text-[10px] font-mono text-slate-400">{new Date(issue.createdAt).toLocaleDateString()}</span>
                      <div className="flex items-center space-x-1.5 mt-auto">
                        <span className="text-[10px] font-bold text-slate-500">🔥 {issue.upvotes.length} votes</span>
                        <button
                          id={`btn-delete-${issue.id}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSuccessMsg(null);
                            setErrorMsg(null);
                            setDeleteConfirmId(issue.id);
                          }}
                          className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                          title="Delete complaint"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Dispatch Action Panel (Right Columns) */}
        <div className="lg:col-span-5 flex flex-col gap-5">
          {selectedIssue ? (
            <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm sticky top-24" id="admin-action-box">
              
              <div className="border-b border-slate-100 pb-4 mb-4">
                <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-600 block">Incident Under Dispatch</span>
                <h3 className="font-sans font-extrabold text-lg text-slate-800 leading-snug mt-1">{selectedIssue.title}</h3>
                <p className="text-slate-500 text-xs mt-1 leading-relaxed line-clamp-2 bg-slate-50 p-2.5 rounded-xl border border-slate-100 font-medium">
                  {selectedIssue.description}
                </p>
              </div>

              {/* Status History Update Form */}
              <form onSubmit={handleUpdateStatus} className="flex flex-col gap-4" id="form-admin-dispatch">
                <div>
                  <label htmlFor="select-admin-status" className="text-xs font-bold text-slate-700 block mb-1">Set Administrative Status</label>
                  <select
                    id="select-admin-status"
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value as IssueStatus)}
                    className="w-full text-xs px-3.5 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white font-bold"
                  >
                    <option value="pending">🟡 Pending (Unreviewed)</option>
                    <option value="under_review">🔵 Under Review (Triaged)</option>
                    <option value="in_progress">⚙️ In Progress (Contractor Dispatched)</option>
                    <option value="resolved">🟢 Resolved (Hazard Cleared / Fixed)</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="textarea-admin-note" className="text-xs font-bold text-slate-700 block mb-1">Status Dispatch Log Note</label>
                  <textarea
                    id="textarea-admin-note"
                    rows={4}
                    value={adminNote}
                    onChange={(e) => setAdminNote(e.target.value)}
                    placeholder="e.g. Maintenance Department dispatched to repair leaking water pipe. Estimated completion is June 28."
                    className="w-full text-xs px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                    required
                  />
                  <p className="text-[10px] text-slate-400 mt-1 leading-snug">This log will show up directly on the citizen's complaint timeline tracker.</p>
                </div>

                {errorMsg && (
                  <div className="text-xs text-rose-600 bg-rose-50 border border-rose-100 p-2 rounded-xl font-semibold flex items-center gap-1.5">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{errorMsg}</span>
                  </div>
                )}

                <button
                  id="btn-admin-submit"
                  type="submit"
                  disabled={updating}
                  className="w-full bg-slate-900 hover:bg-slate-800 disabled:bg-slate-500 text-white text-xs font-bold py-2.5 rounded-xl transition-all flex items-center justify-center gap-1.5 shadow-sm"
                >
                  {updating ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Updating Database...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      <span>Commit Status Update</span>
                    </>
                  )}
                </button>
              </form>

              {/* Status history timeline inside selected item */}
              <div className="border-t border-slate-100 pt-5 mt-5">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-3">Status Logs Timeline ({selectedIssue.statusHistory.length})</span>
                <div className="space-y-3 max-h-40 overflow-y-auto pr-1">
                  {selectedIssue.statusHistory.map((item, i) => (
                    <div key={i} className="bg-slate-50 border border-slate-100 p-2.5 rounded-xl text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-800 capitalize">● {item.status}</span>
                        <span className="text-[9px] text-slate-400 font-mono">{new Date(item.updatedAt).toLocaleDateString()}</span>
                      </div>
                      <p className="text-slate-500 mt-1 font-medium">{item.note}</p>
                      <span className="text-[9px] text-slate-400 block mt-0.5">Author: {item.updatedBy}</span>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          ) : (
            <div className="bg-slate-50 border border-dashed border-slate-200 rounded-3xl p-12 text-center sticky top-24">
              <span className="text-3xl">🎯</span>
              <h4 className="font-sans font-bold text-slate-800 text-sm mt-3">Select a ticket to dispatch</h4>
              <p className="text-slate-400 text-xs mt-1 leading-normal max-w-xs mx-auto">
                Review complaints, inspect visual metadata, upvotes, coordinates, and write logs to progress statuses.
              </p>
            </div>
          )}
        </div>

      </div>

      {/* Confirmation Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50" id="delete-confirmation-modal">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 transform transition-all">
            <div className="flex items-center space-x-3 text-rose-600 mb-4">
              <div className="p-3 bg-rose-50 rounded-2xl">
                <Trash2 className="w-6 h-6 animate-pulse" />
              </div>
              <div>
                <h3 className="font-sans font-extrabold text-lg text-slate-800">Delete Complaint?</h3>
                <p className="text-slate-500 text-xs mt-0.5">This action is permanent and cannot be undone.</p>
              </div>
            </div>
            
            <p className="text-slate-600 text-xs leading-relaxed mb-6 bg-slate-50 p-3 rounded-xl border border-slate-100 font-medium">
              Are you sure you want to delete the complaint <span className="font-bold text-slate-800">"{issues.find(i => i.id === deleteConfirmId)?.title || 'Selected Complaint'}"</span>? It will be removed from all citizen feeds, and its history will be lost.
            </p>

            <div className="flex items-center justify-end space-x-3">
              <button
                id="btn-cancel-delete"
                onClick={() => setDeleteConfirmId(null)}
                disabled={deletingId !== null}
                className="px-4 py-2 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all"
              >
                Cancel
              </button>
              <button
                id="btn-confirm-delete"
                onClick={() => handleDeleteIssue(deleteConfirmId)}
                disabled={deletingId !== null}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 disabled:bg-rose-400 rounded-xl transition-all flex items-center space-x-1.5 shadow-sm"
              >
                {deletingId ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete Permanently</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
