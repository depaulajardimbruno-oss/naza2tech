/**
 * Tipos do banco de dados Supabase.
 *
 * GERADO AUTOMATICAMENTE a partir do schema do projeto (ref gxbowilntkmeveejeecg).
 * Não edite à mão. Para regenerar depois de uma migration:
 *   npx supabase gen types typescript --project-id gxbowilntkmeveejeecg > src/types/database.ts
 *
 * Os helpers `Tables`, `TablesInsert`, `TablesUpdate` e `Enums` são atalhos:
 *   Tables<"profiles">        -> linha da tabela profiles
 *   TablesInsert<"ministries"> -> payload para insert
 *   Enums<"schedule_status">  -> "pendente" | "confirmado" | "recusado"
 */
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      events: {
        Row: {
          arrival_time: string | null
          created_at: string
          created_by: string | null
          end_time: string | null
          event_date: string
          id: string
          ministry_id: string | null
          notes: string | null
          start_time: string
          title: string
        }
        Insert: {
          arrival_time?: string | null
          created_at?: string
          created_by?: string | null
          end_time?: string | null
          event_date: string
          id?: string
          ministry_id?: string | null
          notes?: string | null
          start_time: string
          title: string
        }
        Update: {
          arrival_time?: string | null
          created_at?: string
          created_by?: string | null
          end_time?: string | null
          event_date?: string
          id?: string
          ministry_id?: string | null
          notes?: string | null
          start_time?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "events_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_ministry_id_fkey"
            columns: ["ministry_id"]
            isOneToOne: false
            referencedRelation: "ministries"
            referencedColumns: ["id"]
          },
        ]
      }
      ministries: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          scales_enabled: boolean
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          scales_enabled?: boolean
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          scales_enabled?: boolean
        }
        Relationships: []
      }
      ministry_members: {
        Row: {
          created_at: string
          id: string
          is_leader: boolean
          is_vice_leader: boolean
          ministry_id: string
          ministry_role_id: string | null
          profile_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_leader?: boolean
          is_vice_leader?: boolean
          ministry_id: string
          ministry_role_id?: string | null
          profile_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_leader?: boolean
          is_vice_leader?: boolean
          ministry_id?: string
          ministry_role_id?: string | null
          profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ministry_members_ministry_id_fkey"
            columns: ["ministry_id"]
            isOneToOne: false
            referencedRelation: "ministries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ministry_members_ministry_role_id_ministry_id_fkey"
            columns: ["ministry_role_id", "ministry_id"]
            isOneToOne: false
            referencedRelation: "ministry_roles"
            referencedColumns: ["id", "ministry_id"]
          },
          {
            foreignKeyName: "ministry_members_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ministry_roles: {
        Row: {
          created_at: string
          id: string
          ministry_id: string
          name: string
        }
        Insert: {
          created_at?: string
          id?: string
          ministry_id: string
          name: string
        }
        Update: {
          created_at?: string
          id?: string
          ministry_id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "ministry_roles_ministry_id_fkey"
            columns: ["ministry_id"]
            isOneToOne: false
            referencedRelation: "ministries"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_log: {
        Row: {
          channel: string
          created_at: string
          error: string | null
          id: string
          kind: string
          ok: boolean
          schedule_id: string
        }
        Insert: {
          channel?: string
          created_at?: string
          error?: string | null
          id?: string
          kind: string
          ok?: boolean
          schedule_id: string
        }
        Update: {
          channel?: string
          created_at?: string
          error?: string | null
          id?: string
          kind?: string
          ok?: boolean
          schedule_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_log_schedule_id_fkey"
            columns: ["schedule_id"]
            isOneToOne: false
            referencedRelation: "schedules"
            referencedColumns: ["id"]
          },
        ]
      }
      profile_details: {
        Row: {
          address_city: string | null
          address_complement: string | null
          address_district: string | null
          address_number: string | null
          address_state: string | null
          address_street: string | null
          address_zip: string | null
          baptism_date: string | null
          baptized: boolean | null
          birth_date: string | null
          emergency_name: string | null
          emergency_phone: string | null
          gender: string | null
          marital_status: string | null
          member_since: string | null
          profile_id: string
          updated_at: string
        }
        Insert: {
          address_city?: string | null
          address_complement?: string | null
          address_district?: string | null
          address_number?: string | null
          address_state?: string | null
          address_street?: string | null
          address_zip?: string | null
          baptism_date?: string | null
          baptized?: boolean | null
          birth_date?: string | null
          emergency_name?: string | null
          emergency_phone?: string | null
          gender?: string | null
          marital_status?: string | null
          member_since?: string | null
          profile_id: string
          updated_at?: string
        }
        Update: {
          address_city?: string | null
          address_complement?: string | null
          address_district?: string | null
          address_number?: string | null
          address_state?: string | null
          address_street?: string | null
          address_zip?: string | null
          baptism_date?: string | null
          baptized?: boolean | null
          birth_date?: string | null
          emergency_name?: string | null
          emergency_phone?: string | null
          gender?: string | null
          marital_status?: string | null
          member_since?: string | null
          profile_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profile_details_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          active: boolean
          avatar_url: string | null
          created_at: string
          email: string | null
          full_name: string
          id: string
          nickname: string | null
          phone: string | null
          role_global: Database["public"]["Enums"]["global_role"]
          updated_at: string
        }
        Insert: {
          active?: boolean
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string
          id: string
          nickname?: string | null
          phone?: string | null
          role_global?: Database["public"]["Enums"]["global_role"]
          updated_at?: string
        }
        Update: {
          active?: boolean
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          nickname?: string | null
          phone?: string | null
          role_global?: Database["public"]["Enums"]["global_role"]
          updated_at?: string
        }
        Relationships: []
      }
      schedules: {
        Row: {
          created_at: string
          decline_reason: string | null
          event_id: string
          id: string
          ministry_id: string
          ministry_member_id: string
          ministry_role_id: string
          published: boolean
          responded_at: string | null
          status: Database["public"]["Enums"]["schedule_status"]
          swap_requested: boolean
        }
        Insert: {
          created_at?: string
          decline_reason?: string | null
          event_id: string
          id?: string
          ministry_id: string
          ministry_member_id: string
          ministry_role_id: string
          published?: boolean
          responded_at?: string | null
          status?: Database["public"]["Enums"]["schedule_status"]
          swap_requested?: boolean
        }
        Update: {
          created_at?: string
          decline_reason?: string | null
          event_id?: string
          id?: string
          ministry_id?: string
          ministry_member_id?: string
          ministry_role_id?: string
          published?: boolean
          responded_at?: string | null
          status?: Database["public"]["Enums"]["schedule_status"]
          swap_requested?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "schedules_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedules_ministry_id_fkey"
            columns: ["ministry_id"]
            isOneToOne: false
            referencedRelation: "ministries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedules_ministry_member_id_ministry_id_fkey"
            columns: ["ministry_member_id", "ministry_id"]
            isOneToOne: false
            referencedRelation: "ministry_members"
            referencedColumns: ["id", "ministry_id"]
          },
          {
            foreignKeyName: "schedules_ministry_role_id_ministry_id_fkey"
            columns: ["ministry_role_id", "ministry_id"]
            isOneToOne: false
            referencedRelation: "ministry_roles"
            referencedColumns: ["id", "ministry_id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_user_sign_ins: {
        Args: never
        Returns: { created_at: string; id: string; last_sign_in_at: string | null }[]
      }
      delete_blockers: {
        Args: { p_entity: string; p_id: string }
        Returns: { exemplos: string | null; item: string; total: number }[]
      }
      check_schedule_conflicts: {
        Args: { p_event_id: string; p_member_id: string }
        Returns: {
          event_title: string
          ministry_name: string
          schedule_id: string
          starts_at: string
        }[]
      }
      is_admin: { Args: never; Returns: boolean }
      is_any_leader: { Args: never; Returns: boolean }
      is_any_member: { Args: never; Returns: boolean }
      is_leader_of: { Args: { p_ministry: string }; Returns: boolean }
      is_main_leader_of: { Args: { p_ministry: string }; Returns: boolean }
      is_member_of: { Args: { p_ministry: string }; Returns: boolean }
      reminders_due: {
        Args: { p_now?: string }
        Returns: {
          arrival_at: string
          email: string
          event_title: string
          full_name: string
          kind: string
          ministry_name: string
          phone: string
          profile_id: string
          role_name: string
          schedule_id: string
          starts_at: string
          status: Database["public"]["Enums"]["schedule_status"]
        }[]
      }
      respond_to_schedule: {
        Args: {
          p_reason?: string
          p_schedule_id: string
          p_status: Database["public"]["Enums"]["schedule_status"]
          p_swap?: boolean
        }
        Returns: {
          created_at: string
          decline_reason: string | null
          event_id: string
          id: string
          ministry_id: string
          ministry_member_id: string
          ministry_role_id: string
          published: boolean
          responded_at: string | null
          status: Database["public"]["Enums"]["schedule_status"]
          swap_requested: boolean
        }
        SetofOptions: {
          from: "*"
          to: "schedules"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      shares_ministry_with: { Args: { p_profile: string }; Returns: boolean }
    }
    Enums: {
      global_role: "admin" | "user"
      schedule_status: "pendente" | "confirmado" | "recusado"
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

export const Constants = {
  public: {
    Enums: {
      global_role: ["admin", "user"],
      schedule_status: ["pendente", "confirmado", "recusado"],
    },
  },
} as const
