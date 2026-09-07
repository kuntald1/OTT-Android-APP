import apiClient from "./apiClient";
import { PageHero } from "./content";

export async function fetchCommunityHero(): Promise<PageHero> {
  const { data } = await apiClient.get<PageHero>("/page-heroes/community");
  return data;
}

export interface Blog {
  id: string;
  title: string;
  excerpt: string;
  author_name: string;
  published_at: string;
  cover_image_url: string | null;
  is_published: boolean;
  likes_count: number;
  liked_by_me: boolean;
  comment_count: number;
}

export interface BlogDetail extends Blog {
  body: string;
}

export interface BlogComment {
  id: string;
  blog_id: string;
  user_id: string | null;
  user_name: string;
  is_admin: boolean;
  content: string;
  created_at: string;
}

// Confirmed: GET /blogs -> array of Blog (list view, no body).
export async function fetchBlogs(): Promise<Blog[]> {
  const { data } = await apiClient.get<Blog[]>("/blogs");
  return data;
}

// Confirmed: GET /blogs/{id} -> BlogDetail (includes body).
export async function fetchBlogDetail(id: string): Promise<BlogDetail> {
  const { data } = await apiClient.get<BlogDetail>(`/blogs/${id}`);
  return data;
}

// Confirmed: GET /blogs/{id}/comments -> array of BlogComment.
export async function fetchBlogComments(id: string): Promise<BlogComment[]> {
  const { data } = await apiClient.get<BlogComment[]>(`/blogs/${id}/comments`);
  return data;
}

// Confirmed: POST /blogs/{id}/like -> { liked, likes_count } (toggle).
export async function toggleBlogLike(
  id: string
): Promise<{ liked: boolean; likes_count: number }> {
  const { data } = await apiClient.post<{ liked: boolean; likes_count: number }>(
    `/blogs/${id}/like`
  );
  return data;
}

// Confirmed: POST /blogs/{id}/comments { content } -> 201 Created, the new BlogComment.
export async function postBlogComment(id: string, content: string): Promise<BlogComment> {
  const { data } = await apiClient.post<BlogComment>(`/blogs/${id}/comments`, { content });
  return data;
}

// Confirmed: DELETE /blogs/{id}/comments/{commentId} -> 204 No Content.
export async function deleteBlogComment(id: string, commentId: string): Promise<void> {
  await apiClient.delete(`/blogs/${id}/comments/${commentId}`);
}

// Confirmed: GET /community/rooms -> array of the shape below.
export interface CommunityRoom {
  id: string;
  title: string;
  created_by_name: string;
  is_admin_created: boolean;
  post_count: number;
  created_at: string;
}

export async function fetchCommunityRooms(): Promise<CommunityRoom[]> {
  const { data } = await apiClient.get<CommunityRoom[]>("/community/rooms");
  return data;
}

// Confirmed: POST /community/rooms { title } -> 201 Created, the new CommunityRoom.
export async function createRoom(title: string): Promise<CommunityRoom> {
  const { data } = await apiClient.post<CommunityRoom>("/community/rooms", { title });
  return data;
}

export interface RoomPost {
  id: string;
  author_user_id: string;
  author_name: string;
  is_admin: boolean;
  text: string;
  image_url: string | null;
  likes_count: number;
  liked_by_me: boolean;
  replies: RoomPost[];
  created_at: string;
}

export interface RoomDetail {
  id: string;
  title: string;
  created_by_name: string;
  is_admin_created: boolean;
  posts: RoomPost[];
  created_at: string;
}

// Confirmed: GET /community/rooms/{id} -> RoomDetail (posts included).
export async function fetchRoomDetail(id: string): Promise<RoomDetail> {
  const { data } = await apiClient.get<RoomDetail>(`/community/rooms/${id}`);
  return data;
}

// Confirmed: POST /community/rooms/{id}/posts { text } -> 201 Created, the new RoomPost.
export async function createRoomPost(roomId: string, text: string): Promise<RoomPost> {
  const { data } = await apiClient.post<RoomPost>(`/community/rooms/${roomId}/posts`, { text });
  return data;
}

// Confirmed: GET /organisers -> array of the shape below.
export interface Organiser {
  id: string;
  name: string;
  profile_photo_url: string | null;
}

export async function fetchOrganisers(): Promise<Organiser[]> {
  const { data } = await apiClient.get<Organiser[]>("/organisers");
  return data;
}
