import React, { useState, useEffect } from 'react';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, onSnapshot, query, orderBy, doc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { CivicIssue, AppUser, IssueCategory, IssueStatus, IssuePriority } from '../types';
import { 
  Search, Filter, MapPin, ThumbsUp, MessageSquare, ArrowUpRight, 
  Activity, CheckCircle2, Clock, AlertTriangle, ChevronRight, HelpCircle,
  Map, Grid, Columns
} from 'lucide-react';
import IssueDetails from './IssueDetails';
import { useLanguage } from '../lib/LanguageContext';
import DashboardMap from './DashboardMap';

interface DashboardProps {
  user: AppUser | null;
  setActiveTab: (tab: string) => void;
}

export default function Dashboard({ user, setActiveTab }: DashboardProps) {
  const { t } = useLanguage();
  const [issues, setIssues] = useState<CivicIssue[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIssue, setSelectedIssue] = useState<CivicIssue | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'map' | 'split'>('split');

  // Search & Filter state variables
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'recent' | 'popular'>('recent');

  // Load real-time issues feed using onSnapshot for fast local updates
  useEffect(() => {
    const q = query(collection(db, 'issues'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const loadedIssues: CivicIssue[] = [];
      snapshot.forEach((doc) => {
        loadedIssues.push({ id: doc.id, ...doc.data() } as CivicIssue);
      });
      setIssues(loadedIssues);
      setLoading(false);
    }, (error) => {
      console.error("Firestore onSnapshot error:", error);
      setLoading(false);
      handleFirestoreError(error, OperationType.GET, 'issues');
    });

    return () => unsubscribe();
  }, []);

  // Compute stats metrics based on current issues array
  const totalCount = issues.length;
  const resolvedCount = issues.filter(i => i.status === 'resolved').length;
  const inProgressCount = issues.filter(i => i.status === 'in_progress').length;
  const pendingCount = issues.filter(i => i.status === 'pending' || i.status === 'under_review').length;
  const criticalCount = issues.filter(i => i.priority === 'critical' && i.status !== 'resolved').length;

  // Filter and sort logical execution
  const filteredIssues = issues
    .filter((issue) => {
      const matchSearch = 
        issue.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        issue.address.toLowerCase().includes(searchQuery.toLowerCase()) ||
        issue.description.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchCategory = categoryFilter === 'all' || issue.category === categoryFilter;
      const matchStatus = statusFilter === 'all' || issue.status === statusFilter;
      const matchPriority = priorityFilter === 'all' || issue.priority === priorityFilter;

      return matchSearch && matchCategory && matchStatus && matchPriority;
    })
    .sort((a, b) => {
      if (sortBy === 'popular') {
        return b.upvotes.length - a.upvotes.length;
      }
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

  const handleUpvote = async (issueId: string, upvotes: string[], e: React.MouseEvent) => {
    e.stopPropagation(); // Avoid opening details modal when upvoting from card
    if (!user) {
      alert("Please sign in to upvote and verify this civic issue.");
      return;
    }

    const hasUpvoted = upvotes.includes(user.uid);
    const issueRef = doc(db, 'issues', issueId);

    try {
      await updateDoc(issueRef, {
        upvotes: hasUpvoted ? arrayRemove(user.uid) : arrayUnion(user.uid)
      });
    } catch (err) {
      console.error("Upvote modification failed:", err);
      handleFirestoreError(err, OperationType.UPDATE, `issues/${issueId}`);
    }
  };

  const getCategoryTheme = (cat: string) => {
    switch (cat) {
      case 'potholes': return { bg: 'bg-amber-50 text-amber-800 border-amber-200/60', label: 'Pothole', emoji: '🛠️' };
      case 'water_leakage': return { bg: 'bg-blue-50 text-blue-800 border-blue-200/60', label: 'Water Leak', emoji: '💧' };
      case 'garbage': return { bg: 'bg-emerald-50 text-emerald-800 border-emerald-200/60', label: 'Garbage', emoji: '🚮' };
      case 'damaged_streetlights': return { bg: 'bg-purple-50 text-purple-800 border-purple-200/60', label: 'Broken Light', emoji: '💡' };
      case 'road_accidents': return { bg: 'bg-rose-50 text-rose-800 border-rose-200/60', label: 'Accident', emoji: '⚠️' };
      case 'drainage_problems': return { bg: 'bg-cyan-50 text-cyan-800 border-cyan-200/60', label: 'Drainage', emoji: '🌊' };
      default: return { bg: 'bg-slate-50 text-slate-800 border-slate-200/60', label: 'Other', emoji: '❓' };
    }
  };

  const getPriorityTheme = (prio: string) => {
    switch (prio) {
      case 'critical': return 'bg-rose-100 text-rose-800 border-rose-200 font-extrabold';
      case 'high': return 'bg-amber-100 text-amber-800 border-amber-200 font-bold';
      case 'medium': return 'bg-indigo-100 text-indigo-800 border-indigo-200';
      default: return 'bg-slate-100 text-slate-600 border-slate-200';
    }
  };

  const getStatusTheme = (status: string) => {
    switch (status) {
      case 'resolved': return 'bg-emerald-50 text-emerald-700 border-emerald-100';
      case 'in_progress': return 'bg-sky-50 text-sky-700 border-sky-100';
      case 'under_review': return 'bg-indigo-50 text-indigo-700 border-indigo-100';
      default: return 'bg-amber-50 text-amber-700 border-amber-100';
    }
  };

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8" id="dashboard-container">
      
      {/* Bento Grid Analytics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        
        {/* Metric Card: Total */}
        <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm flex items-center justify-between" id="metric-total">
          <div>
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">Total Issues</span>
            <span className="text-3xl font-sans font-black text-slate-800 mt-1 block">{totalCount}</span>
            <p className="text-[10px] text-slate-400 mt-1">Reported by citizens</p>
          </div>
          <div className="p-3 bg-slate-50 text-slate-400 rounded-xl">
            <Activity className="w-6 h-6" />
          </div>
        </div>

        {/* Metric Card: Resolved */}
        <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm flex items-center justify-between" id="metric-resolved">
          <div>
            <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-500 block">Resolved</span>
            <span className="text-3xl font-sans font-black text-emerald-600 mt-1 block">{resolvedCount}</span>
            <p className="text-[10px] text-emerald-500/80 mt-1">Successfully fixed</p>
          </div>
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>

        {/* Metric Card: Unresolved */}
        <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm flex items-center justify-between" id="metric-unresolved">
          <div>
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">In Progress</span>
            <span className="text-3xl font-sans font-black text-sky-600 mt-1 block">{inProgressCount}</span>
            <p className="text-[10px] text-slate-400 mt-1">Active municipal work</p>
          </div>
          <div className="p-3 bg-sky-50 text-sky-600 rounded-xl">
            <Clock className="w-6 h-6 animate-spin" style={{ animationDuration: '4s' }} />
          </div>
        </div>

        {/* Metric Card: Critical Hazards */}
        <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm flex items-center justify-between" id="metric-critical">
          <div>
            <span className="text-[10px] uppercase font-bold tracking-wider text-rose-500 block">Active Critical</span>
            <span className="text-3xl font-sans font-black text-rose-600 mt-1 block">{criticalCount}</span>
            <p className="text-[10px] text-rose-500/80 mt-1">Extreme hazard warnings</p>
          </div>
          <div className="p-3 bg-rose-50 text-rose-600 rounded-xl">
            <AlertTriangle className="w-6 h-6 animate-bounce" />
          </div>
        </div>

      </div>

      {/* Main Container Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left column: Controls, Filters & Sort (3 Cols) */}
        <div className="lg:col-span-3 flex flex-col gap-5">
          
          {/* Welcome Card */}
          <div className="bg-slate-900 text-white rounded-2xl p-5 shadow-sm">
            <span className="text-xs font-semibold text-emerald-400">{t('db_title')}</span>
            <h2 className="text-lg font-sans font-extrabold mt-1">{t('db_subtitle')}</h2>
            <p className="text-xs text-slate-400 mt-2 leading-relaxed">
              Help resolve city problems anywhere. Report potholes, leakages, and hazards using photos and voice memos. Our AI system handles global dispatch!
            </p>
            <button
              id="btn-dash-create-issue"
              onClick={() => setActiveTab('report')}
              className="mt-4 w-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold py-2.5 rounded-xl shadow-sm transition-all flex items-center justify-center space-x-1.5"
            >
              <span>+ {t('btn_report_issue')}</span>
            </button>
          </div>

          {/* Detailed Filters Panel */}
          <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm flex flex-col gap-4">
            <div className="flex items-center space-x-1 border-b border-slate-100 pb-2">
              <Filter className="w-4 h-4 text-slate-500" />
              <span className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">Search Filters</span>
            </div>

            {/* Category selection */}
            <div>
              <label htmlFor="filter-select-category" className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Issue Category</label>
              <select
                id="filter-select-category"
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="w-full text-xs px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
              >
                <option value="all">📁 All Categories</option>
                <option value="potholes">🛠️ Potholes</option>
                <option value="water_leakage">💧 Water Leakage</option>
                <option value="garbage">🚮 Garbage & Waste</option>
                <option value="damaged_streetlights">💡 Broken Light</option>
                <option value="road_accidents">⚠️ Road Accident</option>
                <option value="drainage_problems">🌊 Drainage Problems</option>
                <option value="other">❓ Other Hazards</option>
              </select>
            </div>

            {/* Status Selection */}
            <div>
              <label htmlFor="filter-select-status" className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Incident Status</label>
              <select
                id="filter-select-status"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full text-xs px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
              >
                <option value="all">📊 All Statuses</option>
                <option value="pending">🟡 Pending</option>
                <option value="under_review">🔵 Under Review</option>
                <option value="in_progress">⚙️ In Progress</option>
                <option value="resolved">🟢 Resolved</option>
              </select>
            </div>

            {/* Priority Selection */}
            <div>
              <label htmlFor="filter-select-priority" className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Priority Level</label>
              <select
                id="filter-select-priority"
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                className="w-full text-xs px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
              >
                <option value="all">⚡ All Priorities</option>
                <option value="low">🟢 Low</option>
                <option value="medium">🟡 Medium</option>
                <option value="high">🟠 High</option>
                <option value="critical">🔴 Critical</option>
              </select>
            </div>

            {/* Sort Selection */}
            <div>
              <label htmlFor="filter-select-sort" className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Sort By</label>
              <select
                id="filter-select-sort"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'recent' | 'popular')}
                className="w-full text-xs px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
              >
                <option value="recent">⏱️ Newest Reports</option>
                <option value="popular">🔥 Top Verified (Upvotes)</option>
              </select>
            </div>

            {/* Reset Filters */}
            <button
              id="btn-reset-filters"
              onClick={() => {
                setSearchQuery('');
                setCategoryFilter('all');
                setStatusFilter('all');
                setPriorityFilter('all');
                setSortBy('recent');
              }}
              className="mt-2 text-xs font-semibold text-slate-500 hover:text-slate-800 text-center w-full py-1.5 hover:bg-slate-50 rounded-lg transition-colors border border-slate-100"
            >
              Reset All Filters
            </button>
          </div>

        </div>

        {/* Right column: Search + Incident Feed Grid (9 Cols) */}
        <div className="lg:col-span-9 flex flex-col gap-5">
          
          {/* Controls row with Search bar and View Mode Toggles */}
          <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
            <div className="relative flex-1">
              <input
                id="input-feed-search"
                type="text"
                placeholder="Search reports by keyterms (e.g., street name, 'pothole', neighborhood)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-11 pr-4 py-3 bg-white border border-slate-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-sm text-sm"
              />
              <Search className="w-5 h-5 text-slate-400 absolute left-4 top-3.5" />
            </div>

            {/* View Mode Toggle Controls */}
            <div className="flex items-center self-end sm:self-auto bg-slate-100 p-1 rounded-2xl border border-slate-200/50 shadow-inner shrink-0">
              <button
                type="button"
                id="btn-viewmode-grid"
                onClick={() => setViewMode('grid')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all cursor-pointer ${
                  viewMode === 'grid'
                    ? 'bg-white text-slate-800 shadow-sm'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <Grid className="w-3.5 h-3.5" />
                <span>Card Grid</span>
              </button>
              
              <button
                type="button"
                id="btn-viewmode-map"
                onClick={() => setViewMode('map')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all cursor-pointer ${
                  viewMode === 'map'
                    ? 'bg-white text-slate-800 shadow-sm'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <Map className="w-3.5 h-3.5" />
                <span>Map View</span>
              </button>

              <button
                type="button"
                id="btn-viewmode-split"
                onClick={() => setViewMode('split')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all cursor-pointer ${
                  viewMode === 'split'
                    ? 'bg-white text-slate-800 shadow-sm'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <Columns className="w-3.5 h-3.5" />
                <span>Split View</span>
              </button>
            </div>
          </div>

          {/* Loading feedback */}
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl border border-slate-100">
              <span className="w-8 h-8 border-4 border-slate-200 border-t-emerald-600 rounded-full animate-spin" />
              <p className="text-xs font-semibold text-slate-500 mt-4">Connecting real-time citizen feed...</p>
            </div>
          ) : (
            <>
              {/* Dynamic Leaflet Map Component rendering */}
              {(viewMode === 'map' || viewMode === 'split') && (
                <div className="w-full">
                  <DashboardMap 
                    issues={filteredIssues} 
                    onSelectIssue={(issue) => setSelectedIssue(issue)}
                    selectedIssue={selectedIssue}
                  />
                </div>
              )}

              {/* Incidents Feed (Grid / list) rendering */}
              {(viewMode === 'grid' || viewMode === 'split') && (
                filteredIssues.length === 0 ? (
                  <div className="bg-white border border-dashed border-slate-200 rounded-3xl p-16 text-center">
                    <span className="text-3xl">🏜️</span>
                    <h3 className="text-slate-800 font-sans font-bold text-lg mt-3">No incident reports found</h3>
                    <p className="text-slate-400 text-xs mt-1 max-w-sm mx-auto">
                      No tickets matched your query parameters. Try widening filters, resetting keywords, or register a new local incident!
                    </p>
                    <button
                      id="btn-feed-no-results-report"
                      onClick={() => setActiveTab('report')}
                      className="mt-6 px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-emerald-200"
                    >
                      + Register First Incident
                    </button>
                  </div>
                ) : (
                  /* Active Incidents List */
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5" id="incidents-feed-grid">
                    {filteredIssues.map((issue) => {
                      const catTheme = getCategoryTheme(issue.category);
                      const isUpvotedByMe = user ? issue.upvotes.includes(user.uid) : false;

                      return (
                        <div
                          key={issue.id}
                          onClick={() => setSelectedIssue(issue)}
                          className="bg-white border border-slate-100 rounded-3xl overflow-hidden cursor-pointer hover:shadow-xl hover:shadow-slate-100/60 transition-all duration-300 flex flex-col h-[380px] group border-l-4"
                          style={{ borderLeftColor: issue.priority === 'critical' ? '#e11d48' : issue.priority === 'high' ? '#f59e0b' : '#6366f1' }}
                        >
                          
                          {/* Visual Card Image Cover (If exists) or Category Placeholder Pattern */}
                          {issue.imageUrl ? (
                            <div className="w-full h-36 overflow-hidden relative">
                              <img
                                src={issue.imageUrl}
                                alt={issue.title}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                referrerPolicy="no-referrer"
                              />
                              <div className="absolute top-2 left-2 flex gap-1">
                                <span className={`text-[10px] uppercase tracking-wider font-extrabold px-2.5 py-0.5 rounded-full border bg-white/90 backdrop-blur-sm shadow-sm ${catTheme.bg}`}>
                                  {catTheme.emoji} {catTheme.label}
                                </span>
                              </div>
                              <div className="absolute top-2 right-2 flex gap-1">
                                <span className={`text-[10px] uppercase tracking-wider font-extrabold px-2.5 py-0.5 rounded-full border bg-white/90 backdrop-blur-sm shadow-sm ${getPriorityTheme(issue.priority)}`}>
                                  {issue.priority}
                                </span>
                              </div>
                            </div>
                          ) : (
                            <div className="w-full h-32 bg-slate-50 flex flex-col justify-center items-center relative border-b border-slate-100">
                              <span className="text-3xl">{catTheme.emoji}</span>
                              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mt-1">{catTheme.label}</span>
                              
                              <div className="absolute top-2 left-2 flex gap-1">
                                <span className={`text-[10px] uppercase tracking-wider font-extrabold px-2.5 py-0.5 rounded-full border ${catTheme.bg}`}>
                                  {catTheme.emoji} {catTheme.label}
                                </span>
                              </div>
                              <div className="absolute top-2 right-2 flex gap-1">
                                <span className={`text-[10px] uppercase tracking-wider font-extrabold px-2.5 py-0.5 rounded-full border ${getPriorityTheme(issue.priority)}`}>
                                  {issue.priority}
                                </span>
                              </div>
                            </div>
                          )}

                          {/* Card Content Details */}
                          <div className="p-5 flex-1 flex flex-col justify-between">
                            <div>
                              {/* Title & Status Row */}
                              <div className="flex items-start justify-between gap-2">
                                <h3 className="font-sans font-bold text-sm text-slate-800 leading-snug group-hover:text-emerald-600 transition-colors line-clamp-2">
                                  {issue.title}
                                </h3>
                              </div>

                              {/* Geospatial Address */}
                              <div className="flex items-center space-x-1 text-slate-500 text-[11px] mt-2 font-medium">
                                <MapPin className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                                <span className="truncate" title={issue.address}>{issue.address}</span>
                              </div>

                              {/* AI Summary Preview */}
                              <p className="text-slate-500 text-xs mt-3 line-clamp-2 leading-relaxed font-medium">
                                {issue.aiAnalysis ? issue.aiAnalysis.summary : issue.description}
                              </p>
                            </div>

                            {/* Card Interactive Footer bar */}
                            <div className="border-t border-slate-100 pt-3 flex items-center justify-between mt-4">
                              <div className="flex items-center space-x-1">
                                <button
                                  id={`btn-card-upvote-${issue.id}`}
                                  onClick={(e) => handleUpvote(issue.id, issue.upvotes, e)}
                                  className={`p-1.5 rounded-lg border flex items-center space-x-1 transition-all ${
                                    isUpvotedByMe
                                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm shadow-emerald-50'
                                      : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border-slate-200'
                                  }`}
                                  title="Upvote and Verify this report"
                                >
                                  <ThumbsUp className={`w-3.5 h-3.5 ${isUpvotedByMe ? 'fill-white' : ''}`} />
                                  <span className="text-[10px] font-bold">{issue.upvotes.length}</span>
                                </button>
                              </div>

                              <span className={`text-[10px] uppercase tracking-wider font-extrabold px-2.5 py-1 rounded-full border ${getStatusTheme(issue.status)}`}>
                                ● {issue.status.replace('_', ' ')}
                              </span>

                              <div className="flex items-center space-x-1 text-[11px] font-bold text-slate-800 hover:text-emerald-600 transition-colors">
                                <span>View Details</span>
                                <ChevronRight className="w-3.5 h-3.5" />
                              </div>
                            </div>

                          </div>

                        </div>
                      );
                    })}
                  </div>
                )
              )}
            </>
          )}

        </div>

      </div>

      {/* Modal Detail Overlay */}
      {selectedIssue && (
        <IssueDetails
          issue={selectedIssue}
          user={user}
          onClose={() => setSelectedIssue(null)}
          onUpdateIssue={(updated) => {
            setSelectedIssue(updated);
            // Also locally update state (though onSnapshot handles syncing beautifully, this is a clean optimistic state enhancer)
            setIssues(prev => prev.map(item => item.id === updated.id ? updated : item));
          }}
        />
      )}

    </div>
  );
}
