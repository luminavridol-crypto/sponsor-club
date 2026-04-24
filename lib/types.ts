export type Role = "admin" | "member";
export type Tier = "tier_1" | "tier_2" | "tier_3";
export type AccessStatus = "active" | "disabled";
export type PostType = "gallery" | "video" | "text" | "announcement";
export type PostStatus = "draft" | "published";
export type MediaType = "image" | "video";
export type PurchaseRequestStatus = "new" | "in_progress" | "completed";
export type PostReactionType = "heart" | "fire" | "cry" | "sparkles" | "devil";

export interface Profile {
  id: string;
  email: string;
  display_name: string | null;
  nickname: string | null;
  role: Role;
  tier: Tier;
  access_status: AccessStatus;
  bio: string | null;
  avatar_url: string | null;
  birth_date: string | null;
  telegram_contact: string | null;
  tiktok_contact: string | null;
  admin_note: string | null;
  admin_badges: string[];
  total_donations: number | null;
  access_expires_at: string | null;
  last_content_seen_at: string | null;
  created_at: string;
}

export interface DonationEvent {
  id: string;
  profile_id: string;
  amount: number;
  created_by: string | null;
  donation_year: number | null;
  donation_month: number | null;
  created_at: string;
}

export interface MemberChatMessage {
  id: string;
  profile_id: string;
  sender_role: "admin" | "member";
  body: string | null;
  media_path: string | null;
  media_type: MediaType | null;
  media_url?: string | null;
  read_by_admin_at: string | null;
  read_by_member_at: string | null;
  created_at: string;
}

export interface Invite {
  id: string;
  code: string;
  email: string | null;
  assigned_tier: Tier;
  expires_at: string | null;
  used_at: string | null;
  disabled_at: string | null;
  note: string | null;
  created_at: string;
}

export interface Post {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  body: string | null;
  post_type: PostType;
  required_tier: Tier;
  status: PostStatus;
  publish_at: string;
  expires_at: string | null;
  retention_days: number | null;
  thumbnail_path: string | null;
  created_at: string;
}

export interface PostMedia {
  id: string;
  post_id: string;
  storage_path: string;
  media_type: MediaType;
  sort_order: number;
  created_at: string;
}

export interface PostWithMedia extends Post {
  post_media: PostMedia[];
  thumbnail_url?: string | null;
}

export interface PostComment {
  id: string;
  post_id: string;
  profile_id: string;
  body: string;
  created_at: string;
}

export interface PostCommentWithAuthor extends PostComment {
  profiles: Pick<Profile, "display_name" | "nickname" | "email" | "role"> | null;
}

export interface PostReaction {
  id: string;
  post_id: string;
  profile_id: string;
  reaction: PostReactionType;
  created_at: string;
  updated_at: string;
}

export interface PurchaseRequest {
  id: string;
  tier: Tier;
  display_name: string | null;
  email: string;
  country: string;
  contact: string;
  status: PurchaseRequestStatus;
  created_at: string;
  updated_at: string;
}
