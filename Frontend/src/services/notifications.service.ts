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
    let query = supabase
      .from("notifications")
      .select("id, user_id, title, message, read, created_at")
      .order("created_at", { ascending: false });

    if (!isAdmin) {
      query = query.eq("user_id", userId);
    }

    const { data, error } = await query;
    return ensureArray(data as NotificationRow[] | null, error).map(mapNotification);
  },

  async create(input: { userId: string; title: string; message: string }) {
    const { error } = await supabase.from("notifications").insert({
      user_id: input.userId,
      title: input.title,
      message: input.message,
      read: false,
    });
    if (error) throw new Error(error.message);
  },

  async markRead(id: string) {
    const { error } = await supabase
      .from("notifications")
      .update({ read: true })
      .eq("id", id);
    if (error) throw new Error(error.message);
  },
};