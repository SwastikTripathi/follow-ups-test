
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
      companies: {
        Row: {
          created_at: string
          id: string
          is_favorite: boolean | null
          linkedin_url: string | null
          name: string
          notes: string | null
          user_id: string
          website: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          is_favorite?: boolean | null
          linkedin_url?: string | null
          name: string
          notes?: string | null
          user_id: string
          website?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          is_favorite?: boolean | null
          linkedin_url?: string | null
          name?: string
          notes?: string | null
          user_id?: string
          website?: string | null
        }
        Relationships: []
      }
      contacts: {
        Row: {
          company_id: string | null
          company_name_cache: string | null
          created_at: string
          email: string
          id: string
          is_favorite: boolean | null
          linkedin_url: string | null
          name: string
          notes: string | null
          phone: string | null
          role: string | null
          tags: Json | null
          user_id: string
        }
        Insert: {
          company_id?: string | null
          company_name_cache?: string | null
          created_at?: string
          email: string
          id?: string
          is_favorite?: boolean | null
          linkedin_url?: string | null
          name: string
          notes?: string | null
          phone?: string | null
          role?: string | null
          tags?: Json | null
          user_id: string
        }
        Update: {
          company_id?: string | null
          company_name_cache?: string | null
          created_at?: string
          email?: string
          id?: string
          is_favorite?: boolean | null
          linkedin_url?: string | null
          name?: string
          notes?: string | null
          phone?: string | null
          role?: string | null
          tags?: Json | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "contacts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      follow_ups: {
        Row: {
          created_at: string
          email_body: string | null
          email_subject: string | null
          follow_up_date: string
          id: string
          job_opening_id: string
          original_due_date: string | null
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email_body?: string | null
          email_subject?: string | null
          follow_up_date: string
          id?: string
          job_opening_id: string
          original_due_date?: string | null
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email_body?: string | null
          email_subject?: string | null
          follow_up_date?: string
          id?: string
          job_opening_id?: string
          original_due_date?: string | null
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "follow_ups_job_opening_id_fkey"
            columns: ["job_opening_id"]
            isOneToOne: false
            referencedRelation: "job_openings"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          amount_paid: number
          created_at: string
          currency: string
          id: string
          invoice_date: string
          invoice_number: string
          plan_id: string
          plan_name: string
          razorpay_order_id: string | null
          razorpay_payment_id: string | null
          user_id: string
        }
        Insert: {
          amount_paid: number
          created_at?: string
          currency?: string
          id?: string
          invoice_date?: string
          invoice_number: string
          plan_id: string
          plan_name: string
          razorpay_order_id?: string | null
          razorpay_payment_id?: string | null
          user_id: string
        }
        Update: {
          amount_paid?: number
          created_at?: string
          currency?: string
          id?: string
          invoice_date?: string
          invoice_number?: string
          plan_id?: string
          plan_name?: string
          razorpay_order_id?: string | null
          razorpay_payment_id?: string | null
          user_id?: string
        }
        Relationships: []
      }
      job_opening_contacts: {
        Row: {
          contact_id: string
          created_at: string
          id: string
          job_opening_id: string
          user_id: string
        }
        Insert: {
          contact_id: string
          created_at?: string
          id?: string
          job_opening_id: string
          user_id: string
        }
        Update: {
          contact_id?: string
          created_at?: string
          id?: string
          job_opening_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_opening_contacts_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_opening_contacts_job_opening_id_fkey"
            columns: ["job_opening_id"]
            isOneToOne: false
            referencedRelation: "job_openings"
            referencedColumns: ["id"]
          },
        ]
      }
      job_openings: {
        Row: {
          company_id: string | null
          company_name_cache: string
          created_at: string
          favorited_at: string | null
          id: string
          initial_email: Json | null
          initial_email_date: string
          is_favorite: boolean | null
          job_description_url: string | null
          notes: string | null
          role_title: string
          status: string
          tags: Json | null
          user_id: string
          updated_at: string | null
        }
        Insert: {
          company_id?: string | null
          company_name_cache: string
          created_at?: string
          favorited_at?: string | null
          id?: string
          initial_email?: Json | null
          initial_email_date: string
          is_favorite?: boolean | null
          job_description_url?: string | null
          notes?: string | null
          role_title: string
          status: string
          tags?: Json | null
          user_id: string
          updated_at?: string | null
        }
        Update: {
          company_id?: string | null
          company_name_cache?: string
          created_at?: string
          favorited_at?: string | null
          id?: string
          initial_email?: Json | null
          initial_email_date?: string
          is_favorite?: boolean | null
          job_description_url?: string | null
          notes?: string | null
          role_title?: string
          status?: string
          tags?: Json | null
          user_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "job_openings_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      posts: {
        Row: {
          author_email_address: string | null
          author_instagram_url: string | null
          author_linkedin_url: string | null
          author_name_cache: string | null
          author_twitter_url: string | null
          author_website_url: string | null
          content: string
          cover_image_url: string | null
          created_at: string
          excerpt: string | null
          id: string
          is_featured: boolean | null
          published_at: string | null
          slug: string
          status: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          author_email_address?: string | null
          author_instagram_url?: string | null
          author_linkedin_url?: string | null
          author_name_cache?: string | null
          author_twitter_url?: string | null
          author_website_url?: string | null
          content: string
          cover_image_url?: string | null
          created_at?: string
          excerpt?: string | null
          id?: string
          is_featured?: boolean | null
          published_at?: string | null
          slug: string
          status?: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          author_email_address?: string | null
          author_instagram_url?: string | null
          author_linkedin_url?: string | null
          author_name_cache?: string | null
          author_twitter_url?: string | null
          author_website_url?: string | null
          content?: string
          cover_image_url?: string | null
          created_at?: string
          excerpt?: string | null
          id?: string
          is_featured?: boolean | null
          published_at?: string | null
          slug?: string
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      privileged_users: {
        Row: {
          email: string
          created_at: string
          notes: string | null
        }
        Insert: {
          email: string
          created_at?: string
          notes?: string | null
        }
        Update: {
          email?: string
          created_at?: string
          notes?: string | null
        }
        Relationships: []
      }
      user_settings: {
        Row: {
          age_range: string | null
          ai_usage_count: number | null
          annual_income: number | null
          country: string | null
          created_at: string
          current_management_method: string[] | null
          current_role: string | null
          default_email_templates: Json | null
          follow_up_cadence_days: Json | null
          full_name: string | null
          gender: string | null
          gender_self_describe: string | null
          how_heard: string
          income_currency: string | null
          is_profile_public: boolean | null
          onboarding_complete: boolean | null
          outreach_volume: string | null
          public_profile_slug: string | null
          resume: Json | null
          usage_preference: string | null
          user_id: string
        }
        Insert: {
          age_range?: string | null
          ai_usage_count?: number | null
          annual_income?: number | null
          country?: string | null
          created_at?: string
          current_management_method?: string[] | null
          current_role?: string | null
          default_email_templates?: Json | null
          follow_up_cadence_days?: Json | null
          full_name?: string | null
          gender?: string | null
          gender_self_describe?: string | null
          how_heard: string
          income_currency?: string | null
          is_profile_public?: boolean | null
          onboarding_complete?: boolean | null
          outreach_volume?: string | null
          public_profile_slug?: string | null
          resume?: Json | null
          usage_preference?: string | null
          user_id: string
        }
        Update: {
          age_range?: string | null
          ai_usage_count?: number | null
          annual_income?: number | null
          country?: string | null
          created_at?: string
          current_management_method?: string[] | null
          current_role?: string | null
          default_email_templates?: Json | null
          follow_up_cadence_days?: Json | null
          full_name?: string | null
          gender?: string | null
          gender_self_describe?: string | null
          how_heard?: string
          income_currency?: string | null
          is_profile_public?: boolean | null
          onboarding_complete?: boolean | null
          outreach_volume?: string | null
          public_profile_slug?: string | null
          resume?: Json | null
          usage_preference?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_subscriptions: {
        Row: {
          created_at: string
          id: string
          plan_expiry_date: string | null
          plan_start_date: string | null
          razorpay_order_id: string | null
          razorpay_payment_id: string | null
          razorpay_subscription_id: string | null
          status: string
          tier: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          plan_expiry_date?: string | null
          plan_start_date?: string | null
          razorpay_order_id?: string | null
          razorpay_payment_id?: string | null
          razorpay_subscription_id?: string | null
          status: string
          tier: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          plan_expiry_date?: string | null
          plan_start_date?: string | null
          razorpay_order_id?: string | null
          razorpay_payment_id?: string | null
          razorpay_subscription_id?: string | null
          status?: string
          tier?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      create_full_job_opening: {
        Args: {
          p_user_id: string
          p_company_name: string
          p_role_title: string
          p_initial_email_date: string
          p_initial_email: Json
          p_job_description_url: string | null
          p_notes: string | null
          p_is_favorite: boolean
          p_contact_inputs: Json
          p_follow_up_inputs: Json
        }
        Returns: string
      }
      create_or_update_company: {
        Args: {
          p_user_id: string
          p_company_id?: string
          p_name: string
          p_website?: string | null
          p_linkedin_url?: string | null
          p_notes?: string | null
          p_is_favorite?: boolean
        }
        Returns: string
      }
      create_or_update_contact_with_company: {
        Args: {
          p_user_id: string
          p_contact_id?: string
          p_name: string
          p_email: string | null
          p_role?: string | null
          p_phone?: string | null
          p_linkedin_url?: string | null
          p_notes?: string | null
          p_company_name?: string | null
          p_company_id?: string | null
          p_is_favorite?: boolean
        }
        Returns: string
      }
      get_all_user_data: {
        Args: {
          p_user_id: string
        }
        Returns: Json
      }
      update_new_job_opening: {
        Args: {
          p_user_id: string
          p_job_opening_id: string
          p_company_name: string
          p_company_id: string | null
          p_role_title: string
          p_initial_email_date: string
          p_initial_email: Json
          p_status: string
          p_job_description_url: string | null
          p_notes: string | null
          p_is_favorite: boolean
          p_contact_inputs: Json
          p_follow_up_inputs: Json
        }
        Returns: string
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
