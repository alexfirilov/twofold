// Multi-tenant type definitions for Twofold

export type LocketRole = 'admin' | 'participant';
export type InviteStatus = 'pending' | 'accepted' | 'expired' | 'revoked';
export type SessionType = 'firebase' | 'guest' | 'shared';

// Backwards compatibility aliases
export type CornerRole = LocketRole;

// Firebase User interface (from Firebase Auth)
export interface FirebaseUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  emailVerified: boolean;
}

// Locket (couple's private space) - formerly "Corner"
export interface Locket {
  id: string;
  name: string;
  description?: string;
  slug: string; // Human-readable URL identifier
  invite_code: string; // Secure invite code
  is_public: boolean;
  share_password?: string; // Hashed password for shared access
  admin_firebase_uid: string;
  created_at: Date;
  updated_at: Date;

  // Relationship metadata (Twofold features)
  anniversary_date?: Date;
  next_countdown_event_name?: string;
  next_countdown_date?: Date;
  cover_photo_url?: string;
  location_origin?: string;

  // Calculated fields (not in DB)
  member_count?: number;
  media_count?: number;
  is_user_admin?: boolean;
  user_role?: LocketRole;
}

// Backwards compatibility alias
export type Corner = Locket;

export interface CreateLocket {
  name: string;
  description?: string;
  is_public?: boolean;
  share_password?: string;
  admin_firebase_uid: string;
  anniversary_date?: Date | string;
  cover_photo_url?: string;
  location_origin?: string;
}

// Backwards compatibility alias
export type CreateCorner = CreateLocket;

export interface UpdateLocket {
  name?: string;
  description?: string;
  is_public?: boolean;
  share_password?: string;
  anniversary_date?: Date | string | null;
  cover_photo_url?: string | null;
  location_origin?: string | null;
}

// Backwards compatibility alias
export type UpdateCorner = UpdateLocket;

// Locket Users (many-to-many relationship)
export interface LocketUser {
  id: string;
  locket_id: string;
  firebase_uid: string;
  display_name?: string;
  email?: string;
  avatar_url?: string;
  role: LocketRole;
  can_upload: boolean;
  can_edit_others_media: boolean;
  can_manage_locket: boolean;
  joined_at: Date;
  last_active_at: Date;

  // Populated from joins
  locket?: Locket;
}

// Backwards compatibility alias
export type CornerUser = LocketUser;

export interface CreateLocketUser {
  locket_id: string;
  firebase_uid: string;
  display_name?: string;
  email?: string;
  avatar_url?: string;
  role?: LocketRole;
  can_upload?: boolean;
  can_edit_others_media?: boolean;
  can_manage_locket?: boolean;
}

// Backwards compatibility alias
export type CreateCornerUser = CreateLocketUser;

export interface UpdateLocketUser {
  role?: LocketRole;
  can_upload?: boolean;
  can_edit_others_media?: boolean;
  can_manage_locket?: boolean;
  display_name?: string;
  avatar_url?: string;
}

// Backwards compatibility alias
export type UpdateCornerUser = UpdateLocketUser;

// Locket Invites
export interface LocketInvite {
  id: string;
  locket_id: string;
  email: string;
  invite_token: string;
  message?: string;
  role: LocketRole;
  can_upload: boolean;
  can_edit_others_media: boolean;
  status: InviteStatus;
  invited_by_firebase_uid: string;
  expires_at: Date;
  created_at: Date;
  accepted_at?: Date;

  // Populated from joins
  locket?: Locket;
  invited_by?: LocketUser;
}

// Backwards compatibility alias
export type CornerInvite = LocketInvite;

export interface CreateLocketInvite {
  locket_id: string;
  email: string;
  message?: string;
  role?: LocketRole;
  can_upload?: boolean;
  can_edit_others_media?: boolean;
  invited_by_firebase_uid: string;
  expires_at?: Date;
}

// Backwards compatibility alias
export type CreateCornerInvite = CreateLocketInvite;

export interface UpdateLocketInvite {
  status?: InviteStatus;
  accepted_at?: Date;
}

// Backwards compatibility alias
export type UpdateCornerInvite = UpdateLocketInvite;

// Memory Groups - A collection of related memories (e.g., a trip, an event)
export interface MemoryGroup {
  id: string;
  locket_id: string;
  title?: string;
  description?: string;
  date_taken?: Date;
  is_milestone?: boolean;
  cover_media_id?: string;
  created_by_firebase_uid?: string;
  created_at: Date;
  updated_at: Date;
  media_items?: MediaItem[];
  media_count?: number;

  // Populated from joins
  creator_name?: string;
  creator_avatar_url?: string;
  locket?: Locket;
  created_by?: LocketUser;
}

export interface CreateMemoryGroup {
  locket_id: string;
  title?: string;
  description?: string;
  date_taken?: Date;
  is_milestone?: boolean;
  created_by_firebase_uid: string;
}

export interface UpdateMemoryGroup {
  title?: string;
  description?: string;
  date_taken?: Date;
  is_milestone?: boolean;
  cover_media_id?: string;
}

// Bucket List Items
export interface BucketListItem {
  id: string;
  locket_id: string;
  title: string;
  description?: string;
  category: 'travel' | 'food' | 'activity' | 'other';
  status: 'active' | 'completed';
  completed_at?: Date;
  created_by_firebase_uid?: string;
  created_at: Date;
  updated_at: Date;
}

export interface CreateBucketListItem {
  locket_id: string;
  title: string;
  description?: string;
  category?: 'travel' | 'food' | 'activity' | 'other';
  status?: 'active' | 'completed';
  created_by_firebase_uid?: string;
}

export interface UpdateBucketListItem {
  title?: string;
  description?: string;
  category?: 'travel' | 'food' | 'activity' | 'other';
  status?: 'active' | 'completed';
  completed_at?: Date;
}

// Updated Media Items (now locket-aware)
export interface MediaItem {
  id: string;
  locket_id: string;
  memory_group_id?: string;
  filename: string;
  original_name: string;
  storage_key: string;
  storage_url: string;
  file_type: string;
  file_size: number;
  width?: number;
  height?: number;
  duration?: number;
  title?: string;
  note?: string;
  date_taken?: Date;
  sort_order: number;
  uploaded_by_firebase_uid?: string;
  created_at: Date;
  updated_at: Date;

  // Location data
  latitude?: number;
  longitude?: number;
  place_name?: string;

  // Populated from joins
  locket?: Locket;
  memory_group?: MemoryGroup;
  uploaded_by?: LocketUser;
}

export interface CreateMediaItem {
  locket_id: string;
  memory_group_id?: string;
  filename: string;
  original_name?: string;
  storage_key: string;
  storage_url: string;
  file_type: string;
  file_size: number;
  width?: number;
  height?: number;
  duration?: number;
  title?: string;
  note?: string;
  date_taken?: Date;
  sort_order?: number;
  uploaded_by_firebase_uid?: string;
  latitude?: number;
  longitude?: number;
  place_name?: string;
}

export interface UpdateMediaItem {
  title?: string;
  note?: string;
  date_taken?: Date;
  sort_order?: number;
  memory_group_id?: string;

  // File replacement fields
  filename?: string;
  original_name?: string;
  storage_key?: string;
  storage_url?: string;
  file_type?: string;
  file_size?: number;
  width?: number;
  height?: number;
  duration?: number;

  // Location fields
  latitude?: number;
  longitude?: number;
  place_name?: string;
}

// Locket Analytics
export interface LocketAnalytics {
  id: string;
  locket_id: string;
  event_type: string; // 'view', 'upload', 'share', 'invite'
  firebase_uid?: string; // NULL for anonymous/guest views
  metadata: Record<string, any>;
  ip_address?: string;
  user_agent?: string;
  created_at: Date;
}

// Backwards compatibility alias
export type CornerAnalytics = LocketAnalytics;

export interface CreateLocketAnalytics {
  locket_id: string;
  event_type: string;
  firebase_uid?: string;
  metadata?: Record<string, any>;
  ip_address?: string;
  user_agent?: string;
}

// Backwards compatibility alias
export type CreateCornerAnalytics = CreateLocketAnalytics;

// Shared Access Tokens
export interface SharedAccessToken {
  id: string;
  locket_id: string;
  token: string;
  permissions: {
    can_view: boolean;
    can_download: boolean;
    [key: string]: any;
  };
  max_uses?: number;
  current_uses: number;
  last_used_at?: Date;
  expires_at?: Date;
  created_by_firebase_uid: string;
  created_at: Date;

  // Populated from joins
  locket?: Locket;
  created_by?: LocketUser;
}

export interface CreateSharedAccessToken {
  locket_id: string;
  permissions?: {
    can_view: boolean;
    can_download: boolean;
    [key: string]: any;
  };
  max_uses?: number;
  expires_at?: Date;
  created_by_firebase_uid: string;
}

export interface UpdateSharedAccessToken {
  permissions?: {
    can_view: boolean;
    can_download: boolean;
    [key: string]: any;
  };
  max_uses?: number;
  expires_at?: Date;
}

// Updated Session (for guest access)
export interface Session {
  id: string;
  session_token: string;
  locket_id?: string;
  firebase_uid?: string;
  session_type: SessionType;
  expires_at: Date;
  created_at: Date;

  // Populated from joins
  locket?: Locket;
}

// Filter and search types
export interface LocketFilters {
  is_public?: boolean;
  member_count_min?: number;
  member_count_max?: number;
  created_after?: Date;
  created_before?: Date;
}

// Backwards compatibility alias
export type CornerFilters = LocketFilters;

export interface MediaFilters {
  locket_id?: string;
  memory_group_id?: string;
  file_type?: string;
  uploaded_by_firebase_uid?: string;
  date_from?: Date;
  date_to?: Date;
  search_query?: string;
}

export interface MemoryGroupFilters {
  locket_id?: string;
  is_milestone?: boolean;
  created_by_firebase_uid?: string;
  date_from?: Date;
  date_to?: Date;
  search_query?: string;
}

// API Response types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
  error?: string;
}

// Authentication context types
export interface AuthContextType {
  user: FirebaseUser | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signUp: (email: string, password: string, displayName?: string) => Promise<void>;
  signOut: () => Promise<void>;
  updateProfile: (data: { displayName?: string; photoURL?: string }) => Promise<void>;
}

// Locket context types
export interface LocketContextType {
  currentLocket: Locket | null;
  userLockets: Locket[];
  pendingInvites: LocketInvite[];
  userRole: LocketRole | null;
  loading: boolean;
  error: string | null;
  createLocket: (data: CreateLocket) => Promise<Locket>;
  switchLocket: (locketId: string) => Promise<void>;
  updateLocket: (locketId: string, data: UpdateLocket) => Promise<Locket>;
  inviteUser: (data: CreateLocketInvite) => Promise<LocketInvite>;
  removeUser: (locketId: string, userId: string) => Promise<void>;
  refreshLockets: () => Promise<void>;
  clearError: () => void;
}

// Backwards compatibility alias
export type CornerContextType = LocketContextType;

// Sharing types
export interface ShareableLink {
  url: string;
  token?: string;
  password_protected: boolean;
  expires_at?: Date;
  max_uses?: number;
  current_uses?: number;
}

export interface CreateShareableLink {
  locket_id: string;
  password?: string;
  expires_at?: Date;
  max_uses?: number;
  permissions?: {
    can_view: boolean;
    can_download: boolean;
  };
}

// Invite acceptance types
export interface AcceptInviteData {
  invite_token: string;
  firebase_uid: string;
}

// Locket statistics
export interface LocketStats {
  member_count: number;
  media_count: number;
  memory_group_count: number;
  total_storage_bytes: number;
  recent_activity_count: number;
  creation_date: Date;
}

// Backwards compatibility alias
export type CornerStats = LocketStats;

// Error types
export interface AppError {
  code: string;
  message: string;
  details?: any;
}

// Notification types
export interface Notification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
}

// Memory Comments
export type CommentType = 'comment' | 'activity';

export interface MemoryComment {
  id: string;
  memory_group_id: string;
  locket_id: string;
  content: string;
  comment_type: CommentType;
  activity_action?: string; // 'title_changed', 'photo_added', 'photo_removed', etc.
  author_firebase_uid?: string;
  created_at: Date;
  updated_at: Date;

  // Populated from joins
  author?: LocketUser;
}

export interface CreateMemoryComment {
  memory_group_id: string;
  locket_id: string;
  content: string;
  comment_type?: CommentType;
  activity_action?: string;
  author_firebase_uid?: string;
}

export type ActivityAction =
  | 'title_changed'
  | 'description_changed'
  | 'photo_added'
  | 'photo_removed'
  | 'date_changed'
  | 'location_changed'
  | 'memory_created'
  | 'memory_deleted';
