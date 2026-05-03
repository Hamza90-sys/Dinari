import { supabase } from "@/lib/supabase";
import { ensureArray } from "@/lib/supabase-helpers";
import type { DinariNotification } from "@/types/domain";

type NotificationRow = {
  id: string;
  user_id: string;
  title: string;
  message: string;
  read: boolean;
  created_at: string;
};

const mapNotification = (row: NotificationRow): DinariNotification => ({
  id: row.id,
  userId: row.user_id,
  title: row.title,
  message: row.message,
  read: row.read,
  createdAt: row.created_at,
});

export const notificationsService = {
  async list(userId: string, isAdmin: boolean) {
    console.log("📬 [notifications.service] Fetching notifications - isAdmin:", isAdmin);
    let query = supabase
      .from("notifications")
      .select("id, user_id, title, message, read, created_at")
      .order("created_at", { ascending: false });

    if (!isAdmin) {
      query = query.eq("user_id", userId);
    }

    const { data, error } = await query;
    if (error) console.error("❌ [notifications.service] List error:", error);
    return ensureArray(data as NotificationRow[] | null, error).map(mapNotification);
  },

  async create(input: { userId: string; title: string; message: string }) {
    console.log("🔔 [notifications.service] Creating notification:", {
      userId: input.userId,
      title: input.title,
    });
    try {
      const { error } = await supabase.from("notifications").insert({
        user_id: input.userId,
        title: input.title,
        message: input.message,
        read: false,
      });
      if (error) {
        console.error("❌ [notifications.service] Create error:", {
          message: error.message,
          code: error.code,
          details: error.details,
        });
        throw new Error(`Failed to create notification: ${error.message}`);
      }
      console.log("✅ [notifications.service] Notification created");
    } catch (error) {
      console.error("❌ [notifications.service] Create exception:", error);
      throw error;
    }
  },

  async markRead(id: string) {
    console.log("✔️ [notifications.service] Marking notification as read:", id);
    try {
      const { error } = await supabase
        .from("notifications")
        .update({ read: true })
        .eq("id", id);
      if (error) {
        console.error("❌ [notifications.service] Mark read error:", error);
        throw new Error(error.message);
      }
      console.log("✅ [notifications.service] Marked as read");
    } catch (error) {
      console.error("❌ [notifications.service] Mark read exception:", error);
      throw error;
    }
  },
};