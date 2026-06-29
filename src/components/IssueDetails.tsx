import React, { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { 
  collection, query, where, orderBy, getDocs, addDoc, updateDoc, doc, arrayUnion, arrayRemove
} from 'firebase/firestore';
import { CivicIssue, Comment, AppUser } from '../types';
import MapComponent from './MapComponent';
import { 
  X, ThumbsUp, MessageSquare, Clock, MapPin, Sparkles, User, Send, Calendar, Play
} from 'lucide-react';

interface IssueDetailsProps {
  issue: CivicIssue;
  user: AppUser | null;
  onClose: () => void;
  onUpdateIssue: (updatedIssue: CivicIssue) => void;
}

export default function IssueDetails({ issue, user, onClose, onUpdateIssue }: IssueDetailsProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loadingComments, setLoadingComments] = useState(false);
  const [submittingComment, setSubmittingComment] = useState(false);

  // Check if current user already upvoted this issue
  const hasUpvoted = user ? issue.upvotes.includes(user.uid) : false;

  // Fetch comments from Firestore on mount
  useEffect(() => {
    fetchComments();
  }, [issue.id]);

  const fetchComments = async () => {
    setLoadingComments(true);
    try {
      const q = query(
        collection(db, 'comments'),
        where('issueId', '==', issue.id),
        orderBy('createdAt', 'asc')
      );
      const querySnapshot = await getDocs(q);
      const commentsList: Comment[] = [];
      querySnapshot.forEach((doc) => {
        commentsList.push({ id: doc.id, ...doc.data() } as Comment);
      });
      setComments(commentsList);
    } catch (err) {
      console.error("Error fetching comments:", err);
    } finally {
      setLoadingComments(false);
    }
  };

  const handleUpvote = async () => {
    if (!user) {
      alert("Please sign in to upvote and verify this civic issue.");
      return;
    }

    const issueRef = doc(db, 'issues', issue.id);
    const updatedUpvotes = hasUpvoted
      ? issue.upvotes.filter(uid => uid !== user.uid)
      : [...issue.upvotes, user.uid];

    try {
      await updateDoc(issueRef, {
        upvotes: hasUpvoted ? arrayRemove(user.uid) : arrayUnion(user.uid)
      });
      onUpdateIssue({ ...issue, upvotes: updatedUpvotes });
    } catch (e) {
      console.error("Upvote failed:", e);
    }
  };

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      alert("Please sign in to post comments.");
      return;
    }
    if (!newComment.trim()) return;

    setSubmittingComment(true);
    try {
      const commentData: Omit<Comment, 'id'> = {
        issueId: issue.id,
        userId: user.uid,
        userName: user.displayName,
        userPhotoUrl: user.photoURL,
        text: newComment.trim(),
        createdAt: new Date().toISOString(),
      };

      const docRef = await addDoc(collection(db, 'comments'), commentData);
      setComments([...comments, { id: docRef.id, ...commentData }]);
      setNewComment('');
    } catch (e) {
      console.error("Post comment failed:", e);
    } finally {
      setSubmittingComment(false);
    }
  };

  // Helper to resolve category emoji and styling
  const getCategoryTheme = (cat: string) => {
    switch (cat) {
      case 'potholes': return { bg: 'bg-amber-50 text-amber-800 border-amber-200', emoji: '🛠️', label: 'Potholes' };
      case 'water_leakage': return { bg: 'bg-blue-50 text-blue-800 border-blue-200', emoji: '💧', label: 'Water Leakage' };
      case 'garbage': return { bg: 'bg-emerald-50 text-emerald-800 border-emerald-200', emoji: '🚮', label: 'Garbage & Waste' };
      case 'damaged_streetlights': return { bg: 'bg-purple-50 text-purple-800 border-purple-200', emoji: '💡', label: 'Broken Streetlight' };
      case 'road_accidents': return { bg: 'bg-rose-50 text-rose-800 border-rose-200', emoji: '⚠️', label: 'Road Accident' };
      case 'drainage_problems': return { bg: 'bg-cyan-50 text-cyan-800 border-cyan-200', emoji: '🌊', label: 'Drainage Problems' };
      default: return { bg: 'bg-slate-50 text-slate-800 border-slate-200', emoji: '❓', label: 'Other Hazard' };
    }
  };

  const getPriorityTheme = (prio: string) => {
    switch (prio) {
      case 'critical': return 'bg-rose-600 text-white shadow-rose-200';
      case 'high': return 'bg-amber-500 text-white shadow-amber-100';
      case 'medium': return 'bg-indigo-500 text-white shadow-indigo-100';
      default: return 'bg-slate-400 text-white shadow-slate-50';
    }
  };

  const getStatusTheme = (status: string) => {
    switch (status) {
      case 'resolved': return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'in_progress': return 'bg-sky-100 text-sky-800 border-sky-200';
      case 'under_review': return 'bg-indigo-100 text-indigo-800 border-indigo-200';
      default: return 'bg-amber-100 text-amber-800 border-amber-200';
    }
  };

  const catTheme = getCategoryTheme(issue.category);

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto" id="modal-issue-details">
      <div className="bg-white rounded-3xl w-full max-w-5xl max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-100 flex flex-col animate-scale-up">
        
        {/* Modal Header */}
        <div className="border-b border-slate-100 px-6 py-4 flex items-center justify-between sticky top-0 bg-white/95 backdrop-blur-md z-10">
          <div className="flex items-center space-x-2">
            <span className={`text-[11px] uppercase tracking-wider font-extrabold px-3 py-1 rounded-full border ${catTheme.bg}`}>
              {catTheme.emoji} {catTheme.label}
            </span>
            <span className={`text-[11px] uppercase tracking-wider font-extrabold px-3 py-1 rounded-full ${getPriorityTheme(issue.priority)}`}>
              {issue.priority}
            </span>
            <span className={`text-[11px] uppercase tracking-wider font-extrabold px-3 py-1 rounded-full border ${getStatusTheme(issue.status)}`}>
              {issue.status.replace('_', ' ')}
            </span>
          </div>
          <button 
            id="btn-close-modal"
            onClick={onClose} 
            className="p-1.5 hover:bg-slate-100 rounded-xl text-slate-400 hover:text-slate-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Main Grid */}
        <div className="p-6 grid grid-cols-1 lg:grid-cols-12 gap-8 overflow-y-auto flex-1">
          
          {/* Left Area: Multimedia & Location (5 cols) */}
          <div className="lg:col-span-5 flex flex-col gap-5">
            {issue.imageUrl && (
              <div className="rounded-2xl overflow-hidden border border-slate-100 shadow-sm">
                <img 
                  id="modal-image"
                  src={issue.imageUrl} 
                  alt={issue.title} 
                  className="w-full h-56 object-cover"
                  referrerPolicy="no-referrer"
                />
              </div>
            )}

            {issue.audioUrl && (
              <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 flex flex-col gap-2 shadow-inner">
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 bg-emerald-100 text-emerald-700 rounded-lg flex items-center justify-center">
                    <Play className="w-4 h-4 fill-emerald-700" />
                  </div>
                  <div>
                    <span className="text-xs font-semibold text-slate-700 block">Voice Complaint Transcript</span>
                    <audio src={issue.audioUrl} controls className="h-6 mt-1 w-full text-xs" />
                  </div>
                </div>
              </div>
            )}

            {/* Read-only Geospatial Map */}
            <MapComponent 
              latitude={issue.latitude} 
              longitude={issue.longitude} 
              address={issue.address} 
              readOnly={true} 
            />

            {/* Reporter Meta Card */}
            <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 flex items-center space-x-3">
              <div className="w-9 h-9 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-sm">
                <User className="w-5 h-5 text-slate-400" />
              </div>
              <div className="text-xs">
                <span className="text-slate-400 uppercase tracking-wider font-bold block text-[9px]">Reported By</span>
                <span className="text-slate-800 font-semibold">{issue.reporterName}</span>
                <p className="text-slate-500 font-mono mt-0.5">{new Date(issue.createdAt).toLocaleDateString()} {new Date(issue.createdAt).toLocaleTimeString()}</p>
              </div>
            </div>
          </div>

          {/* Right Area: Narrative, Comments & Status (7 cols) */}
          <div className="lg:col-span-7 flex flex-col gap-6">
            
            {/* Title & Description */}
            <div>
              <h2 className="font-sans font-extrabold text-2xl text-slate-800 leading-tight">{issue.title}</h2>
              <div className="text-slate-600 text-xs mt-3 leading-relaxed whitespace-pre-line bg-slate-50/50 p-4 border border-slate-100 rounded-2xl">
                {issue.description}
              </div>
            </div>

            {/* AI Executive Summary Block */}
            {issue.aiAnalysis && (
              <div className="bg-emerald-50 border border-emerald-100/80 rounded-2xl p-4 flex items-start space-x-3">
                <div className="p-1.5 bg-emerald-100 text-emerald-700 rounded-lg shrink-0">
                  <Sparkles className="w-4 h-4 animate-spin" style={{ animationDuration: '6s' }} />
                </div>
                <div className="text-xs">
                  <span className="font-bold text-emerald-800 uppercase tracking-wider text-[10px]">AI Executive Dispatch Summary</span>
                  <p className="text-emerald-950 font-medium mt-1 leading-relaxed">
                    {issue.aiAnalysis.summary}
                  </p>
                  <div className="mt-2 text-[10px] text-emerald-700/80 space-y-1 bg-white/50 p-2.5 rounded-lg border border-emerald-100">
                    <p><strong>Category reasoning:</strong> {issue.aiAnalysis.categoryExplanation}</p>
                    <p><strong>Priority rating reasoning:</strong> {issue.aiAnalysis.priorityExplanation}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Verify Ticket Upvote bar */}
            <div className="flex items-center justify-between border-y border-slate-100 py-3">
              <button
                id="btn-upvote-issue"
                onClick={handleUpvote}
                className={`flex items-center space-x-2 px-5 py-2 rounded-xl text-xs font-semibold border transition-all ${
                  hasUpvoted
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-md shadow-emerald-100'
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                }`}
              >
                <ThumbsUp className={`w-4 h-4 ${hasUpvoted ? 'fill-white' : ''}`} />
                <span>{hasUpvoted ? 'Verified (Upvoted)' : 'Verify This Issue'}</span>
              </button>
              <div className="text-xs font-medium text-slate-500">
                Verified by <span className="font-bold text-slate-800">{issue.upvotes.length}</span> citizen{issue.upvotes.length !== 1 && 's'}
              </div>
            </div>

            {/* Status Timeline History */}
            <div className="bg-slate-50/50 border border-slate-100 rounded-2xl p-4">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-3">Administrative Dispatch Timeline</span>
              
              <div className="relative border-l-2 border-slate-200 ml-2.5 pl-5 space-y-4 py-1">
                {issue.statusHistory && issue.statusHistory.map((item, index) => (
                  <div key={index} className="relative">
                    {/* Ring Indicator */}
                    <span className="absolute -left-[27px] top-1 w-3 h-3 bg-white border-2 border-emerald-500 rounded-full" />
                    <div className="text-xs">
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-slate-800 capitalize">{item.status.replace('_', ' ')}</span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {new Date(item.updatedAt).toLocaleDateString()} {new Date(item.updatedAt).toLocaleTimeString()}
                        </span>
                      </div>
                      <p className="text-slate-500 mt-1 leading-relaxed bg-white px-3 py-1.5 rounded-lg border border-slate-100 shadow-sm">{item.note}</p>
                      <span className="text-[10px] text-slate-400 block mt-0.5">Updated by: {item.updatedBy}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Comments Board Segment */}
            <div className="border-t border-slate-100 pt-5">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-3">Community Discussion ({comments.length})</span>

              {/* Comments List */}
              <div className="space-y-3 max-h-56 overflow-y-auto mb-4 pr-1">
                {loadingComments ? (
                  <div className="text-center py-4 text-xs text-slate-400 font-medium">Loading discussion...</div>
                ) : comments.length === 0 ? (
                  <div className="text-center py-4 text-xs text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">No community posts yet. Suggest a correction or update!</div>
                ) : (
                  comments.map((comment) => (
                    <div key={comment.id} className="bg-slate-50 border border-slate-100/70 p-3 rounded-xl flex items-start space-x-2.5">
                      {comment.userPhotoUrl ? (
                        <img 
                          src={comment.userPhotoUrl} 
                          alt={comment.userName} 
                          className="w-6.5 h-6.5 rounded-full border border-slate-200 shrink-0 mt-0.5"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="w-6.5 h-6.5 rounded-full bg-slate-200 flex items-center justify-center font-bold text-xs text-slate-500 shrink-0 mt-0.5">
                          {comment.userName.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div className="text-xs w-full">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-700">{comment.userName}</span>
                          <span className="text-[9px] text-slate-400 font-mono">{new Date(comment.createdAt).toLocaleDateString()}</span>
                        </div>
                        <p className="text-slate-600 mt-0.5 leading-relaxed">{comment.text}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Add Comment Input Form */}
              {user ? (
                <form onSubmit={handleSubmitComment} className="flex gap-2" id="form-add-comment">
                  <input
                    id="input-comment-text"
                    type="text"
                    placeholder="Ask a question or provide site details..."
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    className="flex-1 text-xs px-3.5 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                    required
                  />
                  <button
                    id="btn-post-comment"
                    type="submit"
                    disabled={submittingComment}
                    className="p-2 bg-slate-900 text-white rounded-xl hover:bg-slate-800 disabled:bg-slate-400 shadow-sm transition-all flex items-center justify-center"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </form>
              ) : (
                <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 text-center text-xs text-amber-800 font-medium">
                  Please sign in to join the community feedback stream.
                </div>
              )}
            </div>

          </div>

        </div>

      </div>
    </div>
  );
}
