export type IssueCategory =
  | 'potholes'
  | 'water_leakage'
  | 'garbage'
  | 'damaged_streetlights'
  | 'road_accidents'
  | 'drainage_problems'
  | 'other';

export type IssueStatus = 'pending' | 'under_review' | 'in_progress' | 'resolved';

export type IssuePriority = 'critical' | 'high' | 'medium' | 'low';

export interface Comment {
  id: string;
  issueId: string;
  userId: string;
  userName: string;
  userPhotoUrl?: string;
  text: string;
  createdAt: string;
}

export interface StatusHistory {
  status: IssueStatus;
  note: string;
  updatedBy: string;
  updatedAt: string;
}

export interface CivicIssue {
  id: string;
  title: string;
  description: string;
  category: IssueCategory;
  status: IssueStatus;
  priority: IssuePriority;
  imageUrl?: string;
  audioUrl?: string;
  reporterName: string;
  reporterEmail: string;
  reporterUid: string;
  latitude: number;
  longitude: number;
  address: string;
  upvotes: string[]; // array of user UIDs
  createdAt: string;
  statusHistory: StatusHistory[];
  aiAnalysis?: {
    categoryExplanation: string;
    priorityExplanation: string;
    summary: string;
  };
}

export interface AppUser {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  isAdmin?: boolean;
  role?: 'citizen' | 'admin';
}

export interface EmergencyIncident {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  source: string;
  destination: string;
  latitude: number;
  longitude: number;
  address: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  status: 'active' | 'responded' | 'resolved';
  createdAt: string;
  updatedAt: string;
  nearbyUsersAlerted: boolean;
  respondersCount: number;
  noResponse?: boolean;
  unconscious?: boolean;
}

