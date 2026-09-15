export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      announcement_views: {
        Row: {
          announcement_id: string
          created_at: string
          id: string
          session_id: string | null
          user_id: string | null
          view_source: string
        }
        Insert: {
          announcement_id: string
          created_at?: string
          id?: string
          session_id?: string | null
          user_id?: string | null
          view_source: string
        }
        Update: {
          announcement_id?: string
          created_at?: string
          id?: string
          session_id?: string | null
          user_id?: string | null
          view_source?: string
        }
        Relationships: [
          {
            foreignKeyName: "announcement_views_announcement_id_fkey"
            columns: ["announcement_id"]
            isOneToOne: false
            referencedRelation: "community_announcements"
            referencedColumns: ["id"]
          },
        ]
      }
      api_keys: {
        Row: {
          allowed_origins: string[]
          community_id: string | null
          created_at: string
          created_by: string | null
          expires_at: string | null
          id: string
          key_hash: string
          key_id: string
          key_kind: string
          key_type: string
          last_used_at: string | null
          name: string
          revoked_at: string | null
          scopes: string[]
        }
        Insert: {
          allowed_origins?: string[]
          community_id?: string | null
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          key_hash: string
          key_id: string
          key_kind?: string
          key_type: string
          last_used_at?: string | null
          name: string
          revoked_at?: string | null
          scopes?: string[]
        }
        Update: {
          allowed_origins?: string[]
          community_id?: string | null
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          key_hash?: string
          key_id?: string
          key_kind?: string
          key_type?: string
          last_used_at?: string | null
          name?: string
          revoked_at?: string | null
          scopes?: string[]
        }
        Relationships: [
          {
            foreignKeyName: "api_keys_community_id_fkey"
            columns: ["community_id"]
            isOneToOne: false
            referencedRelation: "communities"
            referencedColumns: ["id"]
          },
        ]
      }
      communities: {
        Row: {
          cover_url: string | null
          created_at: string | null
          created_by: string
          description: string | null
          id: string
          is_show: boolean
          logo_url: string | null
          name: string
          page_config: Json | null
          parent_community_id: string | null
          settings: Json | null
          slug: string
          social_links: Json | null
          stats: Json | null
          tagline: string | null
          tracking_enabled: boolean
          updated_at: string | null
          verified: boolean | null
        }
        Insert: {
          cover_url?: string | null
          created_at?: string | null
          created_by: string
          description?: string | null
          id?: string
          is_show?: boolean
          logo_url?: string | null
          name: string
          page_config?: Json | null
          parent_community_id?: string | null
          settings?: Json | null
          slug: string
          social_links?: Json | null
          stats?: Json | null
          tagline?: string | null
          tracking_enabled?: boolean
          updated_at?: string | null
          verified?: boolean | null
        }
        Update: {
          cover_url?: string | null
          created_at?: string | null
          created_by?: string
          description?: string | null
          id?: string
          is_show?: boolean
          logo_url?: string | null
          name?: string
          page_config?: Json | null
          parent_community_id?: string | null
          settings?: Json | null
          slug?: string
          social_links?: Json | null
          stats?: Json | null
          tagline?: string | null
          tracking_enabled?: boolean
          updated_at?: string | null
          verified?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "communities_parent_community_id_fkey"
            columns: ["parent_community_id"]
            isOneToOne: false
            referencedRelation: "communities"
            referencedColumns: ["id"]
          },
        ]
      }
      community_announcement_images: {
        Row: {
          announcement_id: string
          created_at: string
          id: string
          image_url: string
          sort_order: number
          storage_path: string | null
        }
        Insert: {
          announcement_id: string
          created_at?: string
          id?: string
          image_url: string
          sort_order?: number
          storage_path?: string | null
        }
        Update: {
          announcement_id?: string
          created_at?: string
          id?: string
          image_url?: string
          sort_order?: number
          storage_path?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "community_announcement_images_announcement_id_fkey"
            columns: ["announcement_id"]
            isOneToOne: false
            referencedRelation: "community_announcements"
            referencedColumns: ["id"]
          },
        ]
      }
      community_announcements: {
        Row: {
          community_id: string
          created_at: string
          created_by: string
          description: string
          email_sent_at: string | null
          id: string
          published: boolean
          title: string
          updated_at: string
        }
        Insert: {
          community_id: string
          created_at?: string
          created_by: string
          description: string
          email_sent_at?: string | null
          id?: string
          published?: boolean
          title: string
          updated_at?: string
        }
        Update: {
          community_id?: string
          created_at?: string
          created_by?: string
          description?: string
          email_sent_at?: string | null
          id?: string
          published?: boolean
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_announcements_community_id_fkey"
            columns: ["community_id"]
            isOneToOne: false
            referencedRelation: "communities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_announcements_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      community_members: {
        Row: {
          community_id: string | null
          custom_title: string | null
          email_opt_out: boolean
          id: string
          joined_at: string | null
          metadata: Json | null
          notify_registrations: boolean
          role: string | null
          user_id: string | null
        }
        Insert: {
          community_id?: string | null
          custom_title?: string | null
          email_opt_out?: boolean
          id?: string
          joined_at?: string | null
          metadata?: Json | null
          notify_registrations?: boolean
          role?: string | null
          user_id?: string | null
        }
        Update: {
          community_id?: string | null
          custom_title?: string | null
          email_opt_out?: boolean
          id?: string
          joined_at?: string | null
          metadata?: Json | null
          notify_registrations?: boolean
          role?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "community_members_community_id_fkey"
            columns: ["community_id"]
            isOneToOne: false
            referencedRelation: "communities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_members_user_id_fkey1"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      community_visits: {
        Row: {
          community_id: string | null
          id: string
          metadata: Json | null
          session_id: string
          user_id: string | null
          visited_at: string | null
        }
        Insert: {
          community_id?: string | null
          id?: string
          metadata?: Json | null
          session_id: string
          user_id?: string | null
          visited_at?: string | null
        }
        Update: {
          community_id?: string | null
          id?: string
          metadata?: Json | null
          session_id?: string
          user_id?: string | null
          visited_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "community_visits_community_id_fkey"
            columns: ["community_id"]
            isOneToOne: false
            referencedRelation: "communities"
            referencedColumns: ["id"]
          },
        ]
      }
      event_collaborations: {
        Row: {
          accepted_at: string | null
          community_id: string
          created_at: string | null
          event_id: string
          id: string
          invited_at: string
          invited_by: string
          role: string
          status: string
          updated_at: string | null
        }
        Insert: {
          accepted_at?: string | null
          community_id: string
          created_at?: string | null
          event_id: string
          id?: string
          invited_at?: string
          invited_by: string
          role: string
          status?: string
          updated_at?: string | null
        }
        Update: {
          accepted_at?: string | null
          community_id?: string
          created_at?: string | null
          event_id?: string
          id?: string
          invited_at?: string
          invited_by?: string
          role?: string
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "event_collaborations_community_id_fkey"
            columns: ["community_id"]
            isOneToOne: false
            referencedRelation: "communities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_collaborations_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_collaborations_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      event_registrations: {
        Row: {
          anonymous_email: string | null
          anonymous_name: string | null
          anonymous_phone: string | null
          approval_status:
            | Database["public"]["Enums"]["event_approval_statuses"]
            | null
          attended_at: string | null
          checkin_token: string | null
          custom_answers: Json | null
          event_id: string
          id: string
          invited_by_user_id: string | null
          is_attended: boolean
          is_verified: boolean
          registered_at: string | null
          registration_city: string | null
          registration_country: string | null
          registration_ip: string | null
          registration_session_id: string | null
          registration_source_community_id: string | null
          registration_type: string
          rsvp_status: Database["public"]["Enums"]["rsvp_status"]
          time_to_register_seconds: number | null
          token_expires_at: string | null
          updated_at: string | null
          user_id: string | null
          utm_campaign: string | null
          utm_content: string | null
          utm_medium: string | null
          utm_source: string | null
          utm_term: string | null
          verification_token: string | null
        }
        Insert: {
          anonymous_email?: string | null
          anonymous_name?: string | null
          anonymous_phone?: string | null
          approval_status?:
            | Database["public"]["Enums"]["event_approval_statuses"]
            | null
          attended_at?: string | null
          checkin_token?: string | null
          custom_answers?: Json | null
          event_id: string
          id?: string
          invited_by_user_id?: string | null
          is_attended?: boolean
          is_verified?: boolean
          registered_at?: string | null
          registration_city?: string | null
          registration_country?: string | null
          registration_ip?: string | null
          registration_session_id?: string | null
          registration_source_community_id?: string | null
          registration_type?: string
          rsvp_status?: Database["public"]["Enums"]["rsvp_status"]
          time_to_register_seconds?: number | null
          token_expires_at?: string | null
          updated_at?: string | null
          user_id?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
          verification_token?: string | null
        }
        Update: {
          anonymous_email?: string | null
          anonymous_name?: string | null
          anonymous_phone?: string | null
          approval_status?:
            | Database["public"]["Enums"]["event_approval_statuses"]
            | null
          attended_at?: string | null
          checkin_token?: string | null
          custom_answers?: Json | null
          event_id?: string
          id?: string
          invited_by_user_id?: string | null
          is_attended?: boolean
          is_verified?: boolean
          registered_at?: string | null
          registration_city?: string | null
          registration_country?: string | null
          registration_ip?: string | null
          registration_session_id?: string | null
          registration_source_community_id?: string | null
          registration_type?: string
          rsvp_status?: Database["public"]["Enums"]["rsvp_status"]
          time_to_register_seconds?: number | null
          token_expires_at?: string | null
          updated_at?: string | null
          user_id?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
          verification_token?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "event_registrations_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_registrations_invited_by_user_id_fkey"
            columns: ["invited_by_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_registrations_registration_source_community_id_fkey"
            columns: ["registration_source_community_id"]
            isOneToOne: false
            referencedRelation: "communities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_registrations_user_id_fkey1"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      event_reminders: {
        Row: {
          created_at: string | null
          custom_message: string | null
          event_id: string
          id: string
          reminder_times: Database["public"]["Enums"]["reminder_time"][]
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          custom_message?: string | null
          event_id: string
          id?: string
          reminder_times?: Database["public"]["Enums"]["reminder_time"][]
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          custom_message?: string | null
          event_id?: string
          id?: string
          reminder_times?: Database["public"]["Enums"]["reminder_time"][]
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "event_reminders_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: true
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      event_visits: {
        Row: {
          browser: string | null
          city: string | null
          community_id: string
          country: string | null
          created_at: string
          device_type: string | null
          event_id: string
          id: string
          ip: string | null
          is_mobile: boolean | null
          os: string | null
          referrer_domain: string | null
          referrer_url: string | null
          region: string | null
          session_id: string
          timezone: string | null
          user_id: string | null
          utm_campaign: string | null
          utm_content: string | null
          utm_medium: string | null
          utm_source: string | null
          utm_term: string | null
          visited_at: string
        }
        Insert: {
          browser?: string | null
          city?: string | null
          community_id: string
          country?: string | null
          created_at?: string
          device_type?: string | null
          event_id: string
          id?: string
          ip?: string | null
          is_mobile?: boolean | null
          os?: string | null
          referrer_domain?: string | null
          referrer_url?: string | null
          region?: string | null
          session_id: string
          timezone?: string | null
          user_id?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
          visited_at?: string
        }
        Update: {
          browser?: string | null
          city?: string | null
          community_id?: string
          country?: string | null
          created_at?: string
          device_type?: string | null
          event_id?: string
          id?: string
          ip?: string | null
          is_mobile?: boolean | null
          os?: string | null
          referrer_domain?: string | null
          referrer_url?: string | null
          region?: string | null
          session_id?: string
          timezone?: string | null
          user_id?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
          visited_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_visits_community_id_fkey"
            columns: ["community_id"]
            isOneToOne: false
            referencedRelation: "communities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_visits_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_visits_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          capacity: number | null
          community_id: string
          cover_url: string | null
          created_at: string | null
          created_by: string
          custom_questions: Json | null
          description: string | null
          discussion_link: string | null
          end_time: string | null
          event_type: Database["public"]["Enums"]["event_type"]
          external_platform: string | null
          external_registration_count: number | null
          external_registration_url: string | null
          id: string
          is_approve_required: boolean
          location_address: string | null
          location_lat: number | null
          location_lng: number | null
          location_name: string | null
          location_place_id: string | null
          online_meeting_link: string | null
          registration_deadline: string | null
          registration_type: string | null
          slug: string
          start_time: string
          status: Database["public"]["Enums"]["event_status"]
          timezone: string
          title: string
          updated_at: string | null
        }
        Insert: {
          capacity?: number | null
          community_id: string
          cover_url?: string | null
          created_at?: string | null
          created_by: string
          custom_questions?: Json | null
          description?: string | null
          discussion_link?: string | null
          end_time?: string | null
          event_type: Database["public"]["Enums"]["event_type"]
          external_platform?: string | null
          external_registration_count?: number | null
          external_registration_url?: string | null
          id?: string
          is_approve_required?: boolean
          location_address?: string | null
          location_lat?: number | null
          location_lng?: number | null
          location_name?: string | null
          location_place_id?: string | null
          online_meeting_link?: string | null
          registration_deadline?: string | null
          registration_type?: string | null
          slug: string
          start_time: string
          status?: Database["public"]["Enums"]["event_status"]
          timezone: string
          title: string
          updated_at?: string | null
        }
        Update: {
          capacity?: number | null
          community_id?: string
          cover_url?: string | null
          created_at?: string | null
          created_by?: string
          custom_questions?: Json | null
          description?: string | null
          discussion_link?: string | null
          end_time?: string | null
          event_type?: Database["public"]["Enums"]["event_type"]
          external_platform?: string | null
          external_registration_count?: number | null
          external_registration_url?: string | null
          id?: string
          is_approve_required?: boolean
          location_address?: string | null
          location_lat?: number | null
          location_lng?: number | null
          location_name?: string | null
          location_place_id?: string | null
          online_meeting_link?: string | null
          registration_deadline?: string | null
          registration_type?: string | null
          slug?: string
          start_time?: string
          status?: Database["public"]["Enums"]["event_status"]
          timezone?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "events_community_id_fkey"
            columns: ["community_id"]
            isOneToOne: false
            referencedRelation: "communities"
            referencedColumns: ["id"]
          },
        ]
      }
      google_forms_tokens: {
        Row: {
          access_token: string
          created_at: string | null
          expiry_date: string | null
          id: string
          refresh_token: string | null
          scope: string | null
          token_type: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          access_token: string
          created_at?: string | null
          expiry_date?: string | null
          id?: string
          refresh_token?: string | null
          scope?: string | null
          token_type?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          access_token?: string
          created_at?: string | null
          expiry_date?: string | null
          id?: string
          refresh_token?: string | null
          scope?: string | null
          token_type?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      people: {
        Row: {
          attributes: Json
          community_id: string
          created_at: string
          deleted_at: string | null
          email: string | null
          external_id: string | null
          id: string
          last_seen_at: string | null
          locale: string | null
          name: string | null
          plan: string | null
          subscription_status: string | null
          unsubscribed_at: string | null
        }
        Insert: {
          attributes?: Json
          community_id: string
          created_at?: string
          deleted_at?: string | null
          email?: string | null
          external_id?: string | null
          id?: string
          last_seen_at?: string | null
          locale?: string | null
          name?: string | null
          plan?: string | null
          subscription_status?: string | null
          unsubscribed_at?: string | null
        }
        Update: {
          attributes?: Json
          community_id?: string
          created_at?: string
          deleted_at?: string | null
          email?: string | null
          external_id?: string | null
          id?: string
          last_seen_at?: string | null
          locale?: string | null
          name?: string | null
          plan?: string | null
          subscription_status?: string | null
          unsubscribed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "people_community_id_fkey"
            columns: ["community_id"]
            isOneToOne: false
            referencedRelation: "communities"
            referencedColumns: ["id"]
          },
        ]
      }
      person_events: {
        Row: {
          community_id: string
          id: string
          occurred_at: string
          person_id: string
          properties: Json
          type: string
        }
        Insert: {
          community_id: string
          id?: string
          occurred_at?: string
          person_id: string
          properties?: Json
          type: string
        }
        Update: {
          community_id?: string
          id?: string
          occurred_at?: string
          person_id?: string
          properties?: Json
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "person_events_community_id_fkey"
            columns: ["community_id"]
            isOneToOne: false
            referencedRelation: "communities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "person_events_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string | null
          full_name: string | null
          gamification: Json | null
          id: string
          metadata: Json | null
          settings: Json | null
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string | null
          full_name?: string | null
          gamification?: Json | null
          id: string
          metadata?: Json | null
          settings?: Json | null
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string | null
          full_name?: string | null
          gamification?: Json | null
          id?: string
          metadata?: Json | null
          settings?: Json | null
          updated_at?: string | null
        }
        Relationships: []
      }
      sent_reminders: {
        Row: {
          event_id: string
          id: string
          recipient_email: string
          registration_id: string
          reminder_time: Database["public"]["Enums"]["reminder_time"]
          sent_at: string | null
        }
        Insert: {
          event_id: string
          id?: string
          recipient_email: string
          registration_id: string
          reminder_time: Database["public"]["Enums"]["reminder_time"]
          sent_at?: string | null
        }
        Update: {
          event_id?: string
          id?: string
          recipient_email?: string
          registration_id?: string
          reminder_time?: Database["public"]["Enums"]["reminder_time"]
          sent_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sent_reminders_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sent_reminders_registration_id_fkey"
            columns: ["registration_id"]
            isOneToOne: false
            referencedRelation: "event_registrations"
            referencedColumns: ["id"]
          },
        ]
      }
      telegram_users: {
        Row: {
          chat_id: number
          created_at: string | null
          id: string
          telegram_id: number
          user_id: string
          username: string | null
        }
        Insert: {
          chat_id: number
          created_at?: string | null
          id?: string
          telegram_id: number
          user_id: string
          username?: string | null
        }
        Update: {
          chat_id?: number
          created_at?: string | null
          id?: string
          telegram_id?: number
          user_id?: string
          username?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "telegram_users_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_role: { Args: { p_community_id: string }; Returns: string }
      slugify_event_title: { Args: { title: string }; Returns: string }
    }
    Enums: {
      event_approval_statuses: "pending" | "approved" | "rejected"
      event_status: "draft" | "published" | "cancelled"
      event_type: "in-person" | "online" | "hybrid"
      reminder_time:
        | "1-hour"
        | "3-hours"
        | "1-day"
        | "5-hours"
        | "3-days"
        | "5-days"
      rsvp_status: "going" | "not_going" | "maybe"
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
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
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
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
      event_approval_statuses: ["pending", "approved", "rejected"],
      event_status: ["draft", "published", "cancelled"],
      event_type: ["in-person", "online", "hybrid"],
      reminder_time: [
        "1-hour",
        "3-hours",
        "1-day",
        "5-hours",
        "3-days",
        "5-days",
      ],
      rsvp_status: ["going", "not_going", "maybe"],
    },
  },
} as const

