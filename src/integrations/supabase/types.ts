export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      bot_users: {
        Row: {
          approved: boolean
          balance: number
          created_at: string
          first_name: string | null
          id: string
          referral_earned: number
          referred_by: string | null
          rules_accepted: boolean
          state: Json
          telegram_id: number
          username: string | null
        }
        Insert: {
          approved?: boolean
          balance?: number
          created_at?: string
          first_name?: string | null
          id?: string
          referral_earned?: number
          referred_by?: string | null
          rules_accepted?: boolean
          state?: Json
          telegram_id: number
          username?: string | null
        }
        Update: {
          approved?: boolean
          balance?: number
          created_at?: string
          first_name?: string | null
          id?: string
          referral_earned?: number
          referred_by?: string | null
          rules_accepted?: boolean
          state?: Json
          telegram_id?: number
          username?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bot_users_referred_by_fkey"
            columns: ["referred_by"]
            isOneToOne: false
            referencedRelation: "bot_users"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          bot_user_id: string
          created_at: string
          details: string | null
          id: string
          kind: string
          price: number
          proxy_id: string | null
        }
        Insert: {
          bot_user_id: string
          created_at?: string
          details?: string | null
          id?: string
          kind?: string
          price?: number
          proxy_id?: string | null
        }
        Update: {
          bot_user_id?: string
          created_at?: string
          details?: string | null
          id?: string
          kind?: string
          price?: number
          proxy_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_bot_user_id_fkey"
            columns: ["bot_user_id"]
            isOneToOne: false
            referencedRelation: "bot_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_proxy_id_fkey"
            columns: ["proxy_id"]
            isOneToOne: false
            referencedRelation: "proxies"
            referencedColumns: ["id"]
          },
        ]
      }
      proxies: {
        Row: {
          category: string
          city: string
          continent: string
          country: string
          created_at: string
          id: string
          ip: string
          isp: string
          login: string
          password: string
          ping: number
          port: number
          price: number
          region: string
          reveal_price: number
          sold: boolean
          zip: string
        }
        Insert: {
          category: string
          city: string
          continent: string
          country: string
          created_at?: string
          id?: string
          ip: string
          isp: string
          login?: string
          password?: string
          ping?: number
          port?: number
          price?: number
          region: string
          reveal_price?: number
          sold?: boolean
          zip: string
        }
        Update: {
          category?: string
          city?: string
          continent?: string
          country?: string
          created_at?: string
          id?: string
          ip?: string
          isp?: string
          login?: string
          password?: string
          ping?: number
          port?: number
          price?: number
          region?: string
          reveal_price?: number
          sold?: boolean
          zip?: string
        }
        Relationships: []
      }
      settings: {
        Row: {
          key: string
          updated_at: string
          value: string
        }
        Insert: {
          key: string
          updated_at?: string
          value: string
        }
        Update: {
          key?: string
          updated_at?: string
          value?: string
        }
        Relationships: []
      }
      topups: {
        Row: {
          admin_note: string | null
          amount_usd: number
          bot_user_id: string
          created_at: string
          credited_at: string | null
          id: string
          network: string
          pay_address: string | null
          pay_amount: number | null
          pay_currency: string
          provider: string
          provider_id: string | null
          status: string
          tx_hash: string | null
          wallet_id: string | null
        }
        Insert: {
          admin_note?: string | null
          amount_usd: number
          bot_user_id: string
          created_at?: string
          credited_at?: string | null
          id?: string
          network: string
          pay_address?: string | null
          pay_amount?: number | null
          pay_currency: string
          provider?: string
          provider_id?: string | null
          status?: string
          tx_hash?: string | null
          wallet_id?: string | null
        }
        Update: {
          admin_note?: string | null
          amount_usd?: number
          bot_user_id?: string
          created_at?: string
          credited_at?: string | null
          id?: string
          network?: string
          pay_address?: string | null
          pay_amount?: number | null
          pay_currency?: string
          provider?: string
          provider_id?: string | null
          status?: string
          tx_hash?: string | null
          wallet_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "topups_bot_user_id_fkey"
            columns: ["bot_user_id"]
            isOneToOne: false
            referencedRelation: "bot_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "topups_wallet_id_fkey"
            columns: ["wallet_id"]
            isOneToOne: false
            referencedRelation: "wallets"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      wallets: {
        Row: {
          active: boolean
          address: string
          created_at: string
          currency: string
          id: string
          memo: string | null
          min_deposit: number
          network: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          address: string
          created_at?: string
          currency: string
          id?: string
          memo?: string | null
          min_deposit?: number
          network: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          address?: string
          created_at?: string
          currency?: string
          id?: string
          memo?: string | null
          min_deposit?: number
          network?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "user"],
    },
  },
} as const
