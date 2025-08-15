// Multi-tenant type definitions for "Our Little Corner"

export type CornerRole = 'admin' | 'participant';
export type InviteStatus = 'pending' | 'accepted' | 'expired' | 'revoked';
export type SessionType = 'firebase' | 'guest' | 'shared';

// Firebase User interface (from Firebase Auth)
export interface FirebaseUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  emailVerified: boolean;
}

// Corner (couple's private space)
export interface Corner {
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
  
  // Calculated fields (not in DB)
  member_count?: number;
  media_count?: number;
  is_user_admin?: boolean;
  user_role?: CornerRole;
}

export interface CreateCorner {
  name: string;
  description?: string;
  is_public?: boolean;
  share_password?: string;
  admin_firebase_uid: string;
}

export interface UpdateCorner {
  name?: string;
  description?: string;
  is_public?: boolean;
  share_password?: string;
}

// Corner Users (many-to-many relationship)
export interface CornerUser {
  id: string;
  corner_id: string;
  firebase_uid: string;
  display_name?: string;
  email?: string;
  avatar_url?: string;
  role: CornerRole;
  can_upload: boolean;
  can_edit_others_media: boolean;
  can_manage_corner: boolean;
  joined_at: Date;
  last_active_at: Date;
  
  // Populated from joins
  corner?: Corner;
}

export interface CreateCornerUser {
  corner_id: string;
  firebase_uid: string;
  display_name?: string;
  email?: string;
  avatar_url?: string;
  role?: CornerRole;
  can_upload?: boolean;
  can_edit_others_media?: boolean;
  can_manage_corner?: boolean;
}

export interface UpdateCornerUser {
  role?: CornerRole;
  can_upload?: boolean;
  can_edit_others_media?: boolean;
  can_manage_corner?: boolean;
  display_name?: string;
  avatar_url?: string;
}

// Corner Invites
export interface CornerInvite {
  id: string;
  corner_id: string;
  email: string;
  invite_token: string;
  message?: string;
  role: CornerRole;
  can_upload: boolean;
  can_edit_others_media: boolean;
  status: InviteStatus;
  invited_by_firebase_uid: string;
  expires_at: Date;
  created_at: Date;
  accepted_at?: Date;
  
  // Populated from joins
  corner?: Corner;
  invited_by?: CornerUser;
}

export interface CreateCornerInvite {
  corner_id: string;
  email: string;
  message?: string;
  role?: CornerRole;
  can_upload?: boolean;
  can_edit_others_media?: boolean;
  invited_by_firebase_uid: string;
  expires_at?: Date;
}

export interface UpdateCornerInvite {
  status?: InviteStatus;
  accepted_at?: Date;
}

// Updated Memory Groups (now corner-aware)
export interface MemoryGroup {
  id: string;
  corner_id: string;
  title?: string;
  description?: string;
  is_locked: boolean;
  unlock_date?: Date;
  cover_media_id?: string;
  created_by_firebase_uid?: string;
  created_at: Date;
  updated_at: Date;
  media_items?: MediaItem[];
  media_count?: number;
  
  // Advanced locking features
  lock_visibility?: 'public' | 'private';
  show_date_hint?: boolean;
  show_image_preview?: boolean;
  blur_percentage?: number;
  unlock_hint?: string;
  unlock_task?: string;
  unlock_type?: 'scheduled' | 'task_based';
  task_completed?: boolean;
  
  // Public visibility controls
  show_title?: boolean;
  show_description?: boolean;
  show_media_count?: boolean;
  show_creation_date?: boolean;
  
  // Populated from joins
  corner?: Corner;
  created_by?: CornerUser;
}

export interface CreateMemoryGroup {
  corner_id: string;
  title?: string;
  description?: string;
  is_locked?: boolean;
  unlock_date?: Date;
  created_by_firebase_uid?: string;
  
  // Advanced locking features
  lock_visibility?: 'public' | 'private';
  show_date_hint?: boolean;
  show_image_preview?: boolean;
  blur_percentage?: number;
  unlock_hint?: string;
  unlock_task?: string;
  unlock_type?: 'scheduled' | 'task_based';
  task_completed?: boolean;
  
  // Public visibility controls
  show_title?: boolean;
  show_description?: boolean;
  show_media_count?: boolean;
  show_creation_date?: boolean;
}

export interface UpdateMemoryGroup {
  title?: string;
  description?: string;
  is_locked?: boolean;
  unlock_date?: Date | null;
  cover_media_id?: string;
  
  // Advanced locking features
  lock_visibility?: 'public' | 'private';
  show_date_hint?: boolean;
  show_image_preview?: boolean;
  blur_percentage?: number;
  unlock_hint?: string;
  unlock_task?: string;
  unlock_type?: 'scheduled' | 'task_based';
  task_completed?: boolean;
  
  // Public visibility controls
  show_title?: boolean;
  show_description?: boolean;
  show_media_count?: boolean;
  show_creation_date?: boolean;
}

// Updated Media Items (now corner-aware)
export interface MediaItem {
  id: string;
  corner_id: string;
  memory_group_id?: string;
  filename: string;
  original_name: string;
  s3_key: string;
  s3_url: string;
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
  
  // Populated from joins
  corner?: Corner;
  memory_group?: MemoryGroup;
  uploaded_by?: CornerUser;
}

export interface CreateMediaItem {
  corner_id: string;
  memory_group_id?: string;
  filename: string;
  original_name: string;
  s3_key: string;
  s3_url: string;
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
  s3_key?: string;
  s3_url?: string;
  file_type?: string;
  file_size?: number;
  width?: number;
  height?: number;
  duration?: number;
}

// Corner Analytics
export interface CornerAnalytics {
  id: string;
  corner_id: string;
  event_type: string; // 'view', 'upload', 'share', 'invite'
  firebase_uid?: string; // NULL for anonymous/guest views
  metadata: Record<string, any>;
  ip_address?: string;
  user_agent?: string;
  created_at: Date;
}

export interface CreateCornerAnalytics {
  corner_id: string;
  event_type: string;
  firebase_uid?: string;
  metadata?: Record<string, any>;
  ip_address?: string;
  user_agent?: string;
}

// Shared Access Tokens
export interface SharedAccessToken {
  id: string;
  corner_id: string;
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
  corner?: Corner;
  created_by?: CornerUser;
}

export interface CreateSharedAccessToken {
  corner_id: string;
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
  corner_id?: string;
  firebase_uid?: string;
  session_type: SessionType;
  expires_at: Date;
  created_at: Date;
  
  // Populated from joins
  corner?: Corner;
}

// Filter and search types
export interface CornerFilters {
  is_public?: boolean;
  member_count_min?: number;
  member_count_max?: number;
  created_after?: Date;
  created_before?: Date;
}

export interface MediaFilters {
  corner_id?: string;
  memory_group_id?: string;
  file_type?: string;
  uploaded_by_firebase_uid?: string;
  date_from?: Date;
  date_to?: Date;
  search_query?: string;
}

export interface MemoryGroupFilters {
  corner_id?: string;
  is_locked?: boolean;
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
  signUp: (email: string, password: string, displayName?: string) => Promise<void>;
  signOut: () => Promise<void>;
  updateProfile: (data: { displayName?: string; photoURL?: string }) => Promise<void>;
}

// Corner context types
export interface CornerContextType {
  currentCorner: Corner | null;
  userCorners: Corner[];
  pendingInvites: CornerInvite[];
  userRole: CornerRole | null;
  loading: boolean;
  error: string | null;
  createCorner: (data: CreateCorner) => Promise<Corner>;
  switchCorner: (cornerId: string) => Promise<void>;
  updateCorner: (cornerId: string, data: UpdateCorner) => Promise<Corner>;
  inviteUser: (data: CreateCornerInvite) => Promise<CornerInvite>;
  removeUser: (cornerId: string, userId: string) => Promise<void>;
  refreshCorners: () => Promise<void>;
  clearError: () => void;
}

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
  corner_id: string;
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

// Corner statistics
export interface CornerStats {
  member_count: number;
  media_count: number;
  memory_group_count: number;
  total_storage_bytes: number;
  recent_activity_count: number;
  creation_date: Date;
}

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