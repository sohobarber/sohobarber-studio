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
    PostgrestVersion: "17.1"
  }
  public: {
    Tables: {
      audit_logs: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          details: Json
          id: string
          record_id: string | null
          table_name: string
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          details?: Json
          id?: string
          record_id?: string | null
          table_name: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          details?: Json
          id?: string
          record_id?: string | null
          table_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      barber_schedules: {
        Row: {
          employee_id: string
          end_time: string
          id: string
          is_available: boolean
          start_time: string
          work_date: string
        }
        Insert: {
          employee_id: string
          end_time: string
          id?: string
          is_available?: boolean
          start_time: string
          work_date: string
        }
        Update: {
          employee_id?: string
          end_time?: string
          id?: string
          is_available?: boolean
          start_time?: string
          work_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "barber_schedules_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      bookings: {
        Row: {
          barber_id: string | null
          booking_code: string
          booking_date: string
          booking_source: string
          cancellation_reason: string | null
          created_at: string
          created_by: string | null
          customer_id: string | null
          customer_name: string
          customer_phone: string
          deposit_paid: number
          deposit_required: number
          duration_minutes: number
          end_time: string
          id: string
          service_id: string
          service_price: number
          special_request: string | null
          start_time: string
          status: Database["public"]["Enums"]["booking_status"]
          updated_at: string
          verified_by: string | null
        }
        Insert: {
          barber_id?: string | null
          booking_code: string
          booking_date: string
          booking_source?: string
          cancellation_reason?: string | null
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          customer_name: string
          customer_phone: string
          deposit_paid?: number
          deposit_required?: number
          duration_minutes?: number
          end_time: string
          id?: string
          service_id: string
          service_price: number
          special_request?: string | null
          start_time: string
          status?: Database["public"]["Enums"]["booking_status"]
          updated_at?: string
          verified_by?: string | null
        }
        Update: {
          barber_id?: string | null
          booking_code?: string
          booking_date?: string
          booking_source?: string
          cancellation_reason?: string | null
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          customer_name?: string
          customer_phone?: string
          deposit_paid?: number
          deposit_required?: number
          duration_minutes?: number
          end_time?: string
          id?: string
          service_id?: string
          service_price?: number
          special_request?: string | null
          start_time?: string
          status?: Database["public"]["Enums"]["booking_status"]
          updated_at?: string
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bookings_barber_id_fkey"
            columns: ["barber_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_verified_by_fkey"
            columns: ["verified_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      business_settings: {
        Row: {
          business_name: string
          closing_time: string
          deposit_percent: number
          id: number
          opening_time: string
          slot_duration_minutes: number
          timezone: string
          updated_at: string
        }
        Insert: {
          business_name?: string
          closing_time?: string
          deposit_percent?: number
          id?: number
          opening_time?: string
          slot_duration_minutes?: number
          timezone?: string
          updated_at?: string
        }
        Update: {
          business_name?: string
          closing_time?: string
          deposit_percent?: number
          id?: number
          opening_time?: string
          slot_duration_minutes?: number
          timezone?: string
          updated_at?: string
        }
        Relationships: []
      }
      closed_dates: {
        Row: {
          closed_date: string
          created_at: string
          id: string
          reason: string | null
        }
        Insert: {
          closed_date: string
          created_at?: string
          id?: string
          reason?: string | null
        }
        Update: {
          closed_date?: string
          created_at?: string
          id?: string
          reason?: string | null
        }
        Relationships: []
      }
      customers: {
        Row: {
          created_at: string
          full_name: string
          id: string
          notes: string | null
          phone: string
        }
        Insert: {
          created_at?: string
          full_name: string
          id?: string
          notes?: string | null
          phone: string
        }
        Update: {
          created_at?: string
          full_name?: string
          id?: string
          notes?: string | null
          phone?: string
        }
        Relationships: []
      }
      employees: {
        Row: {
          base_salary: number
          commission_fixed: number
          commission_mode: Database["public"]["Enums"]["commission_type"]
          commission_percent: number
          created_at: string
          employee_code: string | null
          full_name: string
          id: string
          is_active: boolean
          phone: string | null
          profile_id: string | null
          updated_at: string
        }
        Insert: {
          base_salary?: number
          commission_fixed?: number
          commission_mode?: Database["public"]["Enums"]["commission_type"]
          commission_percent?: number
          created_at?: string
          employee_code?: string | null
          full_name: string
          id?: string
          is_active?: boolean
          phone?: string | null
          profile_id?: string | null
          updated_at?: string
        }
        Update: {
          base_salary?: number
          commission_fixed?: number
          commission_mode?: Database["public"]["Enums"]["commission_type"]
          commission_percent?: number
          created_at?: string
          employee_code?: string | null
          full_name?: string
          id?: string
          is_active?: boolean
          phone?: string | null
          profile_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "employees_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      expenses: {
        Row: {
          amount: number
          category: string
          created_at: string
          description: string
          expense_date: string
          id: string
          notes: string | null
          recorded_by: string | null
        }
        Insert: {
          amount: number
          category: string
          created_at?: string
          description: string
          expense_date?: string
          id?: string
          notes?: string | null
          recorded_by?: string | null
        }
        Update: {
          amount?: number
          category?: string
          created_at?: string
          description?: string
          expense_date?: string
          id?: string
          notes?: string | null
          recorded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "expenses_recorded_by_fkey"
            columns: ["recorded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          booking_id: string | null
          created_at: string
          id: string
          payment_method: string
          payment_status: Database["public"]["Enums"]["payment_status"]
          proof_url: string | null
          transaction_id: string | null
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          amount: number
          booking_id?: string | null
          created_at?: string
          id?: string
          payment_method: string
          payment_status?: Database["public"]["Enums"]["payment_status"]
          proof_url?: string | null
          transaction_id?: string | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          amount?: number
          booking_id?: string | null
          created_at?: string
          id?: string
          payment_method?: string
          payment_status?: Database["public"]["Enums"]["payment_status"]
          proof_url?: string | null
          transaction_id?: string | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_transaction_fk"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_verified_by_fkey"
            columns: ["verified_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      payroll_records: {
        Row: {
          adjustments: number
          base_salary: number
          commission_amount: number
          created_at: string
          employee_id: string
          id: string
          is_paid: boolean
          notes: string | null
          payment_date: string | null
          period_end: string
          period_start: string
          total_amount: number
        }
        Insert: {
          adjustments?: number
          base_salary?: number
          commission_amount?: number
          created_at?: string
          employee_id: string
          id?: string
          is_paid?: boolean
          notes?: string | null
          payment_date?: string | null
          period_end: string
          period_start: string
          total_amount?: number
        }
        Update: {
          adjustments?: number
          base_salary?: number
          commission_amount?: number
          created_at?: string
          employee_id?: string
          id?: string
          is_paid?: boolean
          notes?: string | null
          payment_date?: string | null
          period_end?: string
          period_start?: string
          total_amount?: number
        }
        Relationships: [
          {
            foreignKeyName: "payroll_records_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          name: string
          price: number
          sku: string | null
          stock: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          price: number
          sku?: string | null
          stock?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          price?: number
          sku?: string | null
          stock?: number
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          full_name: string
          id: string
          is_active: boolean
          phone: string | null
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          full_name: string
          id: string
          is_active?: boolean
          phone?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          full_name?: string
          id?: string
          is_active?: boolean
          phone?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
        }
        Relationships: []
      }
      services: {
        Row: {
          created_at: string
          description: string | null
          duration_minutes: number
          id: string
          is_active: boolean
          name: string
          price: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          duration_minutes?: number
          id?: string
          is_active?: boolean
          name: string
          price: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          duration_minutes?: number
          id?: string
          is_active?: boolean
          name?: string
          price?: number
          updated_at?: string
        }
        Relationships: []
      }
      transaction_items: {
        Row: {
          id: string
          item_name: string
          line_total: number
          product_id: string | null
          quantity: number
          service_id: string | null
          transaction_id: string
          unit_price: number
        }
        Insert: {
          id?: string
          item_name: string
          line_total: number
          product_id?: string | null
          quantity?: number
          service_id?: string | null
          transaction_id: string
          unit_price: number
        }
        Update: {
          id?: string
          item_name?: string
          line_total?: number
          product_id?: string | null
          quantity?: number
          service_id?: string | null
          transaction_id?: string
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "transaction_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transaction_items_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transaction_items_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          amount_paid: number
          barber_id: string | null
          booking_id: string | null
          cancellation_reason: string | null
          cancelled_by: string | null
          cashier_id: string | null
          created_at: string
          customer_id: string | null
          deposit_applied: number
          discount_amount: number
          discount_reason: string | null
          id: string
          status: Database["public"]["Enums"]["transaction_status"]
          subtotal: number
          total_amount: number
          transaction_code: string
          updated_at: string
        }
        Insert: {
          amount_paid?: number
          barber_id?: string | null
          booking_id?: string | null
          cancellation_reason?: string | null
          cancelled_by?: string | null
          cashier_id?: string | null
          created_at?: string
          customer_id?: string | null
          deposit_applied?: number
          discount_amount?: number
          discount_reason?: string | null
          id?: string
          status?: Database["public"]["Enums"]["transaction_status"]
          subtotal?: number
          total_amount?: number
          transaction_code: string
          updated_at?: string
        }
        Update: {
          amount_paid?: number
          barber_id?: string | null
          booking_id?: string | null
          cancellation_reason?: string | null
          cancelled_by?: string | null
          cashier_id?: string | null
          created_at?: string
          customer_id?: string | null
          deposit_applied?: number
          discount_amount?: number
          discount_reason?: string | null
          id?: string
          status?: Database["public"]["Enums"]["transaction_status"]
          subtotal?: number
          total_amount?: number
          transaction_code?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_barber_id_fkey"
            columns: ["barber_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_cancelled_by_fkey"
            columns: ["cancelled_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_cashier_id_fkey"
            columns: ["cashier_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      is_owner: { Args: never; Returns: boolean }
    }
    Enums: {
      app_role: "owner" | "cashier" | "barber"
      booking_status:
        | "pending_payment"
        | "pending_verification"
        | "confirmed"
        | "checked_in"
        | "in_service"
        | "completed"
        | "cancelled"
        | "no_show"
      commission_type: "percentage" | "fixed" | "both" | "none"
      payment_status:
        | "pending"
        | "waiting_verification"
        | "verified"
        | "rejected"
        | "refunded"
      transaction_status: "completed" | "cancelled"
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
      app_role: ["owner", "cashier", "barber"],
      booking_status: [
        "pending_payment",
        "pending_verification",
        "confirmed",
        "checked_in",
        "in_service",
        "completed",
        "cancelled",
        "no_show",
      ],
      commission_type: ["percentage", "fixed", "both", "none"],
      payment_status: [
        "pending",
        "waiting_verification",
        "verified",
        "rejected",
        "refunded",
      ],
      transaction_status: ["completed", "cancelled"],
    },
  },
} as const
