export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string | null;
          role: "user" | "admin";
          balance_tnd: number;
          created_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name?: string | null;
          role?: "user" | "admin";
          balance_tnd?: number;
          created_at?: string;
        };
        Update: {
          email?: string;
          full_name?: string | null;
          role?: "user" | "admin";
          balance_tnd?: number;
          created_at?: string;
        };
      };
      requests: {
        Row: {
          id: string;
          request_code: string;
          user_id: string;
          service_name: string;
          plan_name: string;
          account_email: string;
          amount_tnd: number;
          status: "Awaiting Payment" | "Paid" | "Processing" | "Completed" | "Failed";
          notes: string | null;
          admin_notes: string | null;
          payment_method: string | null;
          payment_date: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          request_code?: string;
          user_id: string;
          service_name: string;
          plan_name: string;
          account_email: string;
          amount_tnd: number;
          status?: "Awaiting Payment" | "Paid" | "Processing" | "Completed" | "Failed";
          notes?: string | null;
          admin_notes?: string | null;
          payment_method?: string | null;
          payment_date?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          service_name?: string;
          plan_name?: string;
          account_email?: string;
          amount_tnd?: number;
          status?: "Awaiting Payment" | "Paid" | "Processing" | "Completed" | "Failed";
          notes?: string | null;
          admin_notes?: string | null;
          payment_method?: string | null;
          payment_date?: string | null;
          updated_at?: string;
        };
      };
      payments: {
        Row: {
          id: string;
          request_id: string | null;
          user_id: string;
          amount_tnd: number;
          payment_method: string;
          status: "Completed" | "Failed" | "Pending";
          proof_url: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          request_id?: string | null;
          user_id: string;
          amount_tnd: number;
          payment_method: string;
          status?: "Completed" | "Failed" | "Pending";
          proof_url?: string | null;
          created_at?: string;
        };
        Update: {
          request_id?: string | null;
          amount_tnd?: number;
          payment_method?: string;
          status?: "Completed" | "Failed" | "Pending";
          proof_url?: string | null;
          created_at?: string;
        };
      };
      subscriptions: {
        Row: {
          id: string;
          request_id: string;
          user_id: string;
          service_name: string;
          plan_name: string;
          start_date: string;
          renewal_date: string;
          status: "Active" | "Cancelled";
        };
        Insert: {
          id?: string;
          request_id: string;
          user_id: string;
          service_name: string;
          plan_name: string;
          start_date?: string;
          renewal_date: string;
          status?: "Active" | "Cancelled";
        };
        Update: {
          service_name?: string;
          plan_name?: string;
          renewal_date?: string;
          status?: "Active" | "Cancelled";
        };
      };
      notifications: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          message: string;
          read: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          title: string;
          message: string;
          read?: boolean;
          created_at?: string;
        };
        Update: {
          title?: string;
          message?: string;
          read?: boolean;
          created_at?: string;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      top_up_balance: {
        Args: { p_amount: number; p_method?: string };
        Returns: string;
      };
      withdraw_balance: {
        Args: { p_amount: number };
        Returns: string;
      };
      pay_request: {
        Args: { p_request_code: string; p_method?: string };
        Returns: string;
      };
      admin_update_request_status: {
        Args: {
          p_request_code: string;
          p_status: "Awaiting Payment" | "Paid" | "Processing" | "Completed" | "Failed";
          p_admin_notes?: string;
        };
        Returns: undefined;
      };
      get_user_role: {
        Args: Record<PropertyKey, never>;
        Returns: "user" | "admin";
      };
    };
    Enums: {
      user_role: "user" | "admin";
      request_status: "Awaiting Payment" | "Paid" | "Processing" | "Completed" | "Failed";
      payment_status: "Completed" | "Failed" | "Pending";
      subscription_status: "Active" | "Cancelled";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};
