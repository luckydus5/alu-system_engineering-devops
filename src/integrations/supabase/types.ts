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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      admin_password_resets: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          initiated_by: string
          initiated_by_name: string | null
          is_used: boolean
          token: string
          used_at: string | null
          user_email: string
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at?: string
          id?: string
          initiated_by: string
          initiated_by_name?: string | null
          is_used?: boolean
          token?: string
          used_at?: string | null
          user_email: string
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          initiated_by?: string
          initiated_by_name?: string | null
          is_used?: boolean
          token?: string
          used_at?: string | null
          user_email?: string
          user_id?: string
        }
        Relationships: []
      }
      attendance_file_uploads: {
        Row: {
          company_names: string | null
          date_range_from: string | null
          date_range_to: string | null
          file_name: string
          file_path: string
          file_size: number
          id: string
          import_summary: Json | null
          notes: string | null
          records_imported: number
          records_skipped: number
          records_unmatched: number
          uploaded_at: string
          uploaded_by: string
        }
        Insert: {
          company_names?: string | null
          date_range_from?: string | null
          date_range_to?: string | null
          file_name: string
          file_path: string
          file_size?: number
          id?: string
          import_summary?: Json | null
          notes?: string | null
          records_imported?: number
          records_skipped?: number
          records_unmatched?: number
          uploaded_at?: string
          uploaded_by: string
        }
        Update: {
          company_names?: string | null
          date_range_from?: string | null
          date_range_to?: string | null
          file_name?: string
          file_path?: string
          file_size?: number
          id?: string
          import_summary?: Json | null
          notes?: string | null
          records_imported?: number
          records_skipped?: number
          records_unmatched?: number
          uploaded_at?: string
          uploaded_by?: string
        }
        Relationships: []
      }
      attendance_raw_scans: {
        Row: {
          attendance_record_id: string | null
          created_at: string
          department_text: string | null
          employee_name: string
          file_upload_id: string | null
          fingerprint_number: string | null
          id: string
          is_matched: boolean
          match_method: string | null
          match_score: number | null
          matched_employee_id: string | null
          matched_employee_name: string | null
          row_number: number | null
          scan_date: string
          scan_datetime: string
          scan_status: string | null
          skip_reason: string | null
          source_file: string
          was_imported: boolean
        }
        Insert: {
          attendance_record_id?: string | null
          created_at?: string
          department_text?: string | null
          employee_name: string
          file_upload_id?: string | null
          fingerprint_number?: string | null
          id?: string
          is_matched?: boolean
          match_method?: string | null
          match_score?: number | null
          matched_employee_id?: string | null
          matched_employee_name?: string | null
          row_number?: number | null
          scan_date: string
          scan_datetime: string
          scan_status?: string | null
          skip_reason?: string | null
          source_file: string
          was_imported?: boolean
        }
        Update: {
          attendance_record_id?: string | null
          created_at?: string
          department_text?: string | null
          employee_name?: string
          file_upload_id?: string | null
          fingerprint_number?: string | null
          id?: string
          is_matched?: boolean
          match_method?: string | null
          match_score?: number | null
          matched_employee_id?: string | null
          matched_employee_name?: string | null
          row_number?: number | null
          scan_date?: string
          scan_datetime?: string
          scan_status?: string | null
          skip_reason?: string | null
          source_file?: string
          was_imported?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "attendance_raw_scans_attendance_record_id_fkey"
            columns: ["attendance_record_id"]
            isOneToOne: false
            referencedRelation: "attendance_records"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_raw_scans_file_upload_id_fkey"
            columns: ["file_upload_id"]
            isOneToOne: false
            referencedRelation: "attendance_file_uploads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_raw_scans_matched_employee_id_fkey"
            columns: ["matched_employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      attendance_records: {
        Row: {
          attendance_date: string
          clock_in: string | null
          clock_out: string | null
          created_at: string
          department_id: string
          id: string
          notes: string | null
          overtime_hours: number | null
          regular_hours: number | null
          shift_type: string | null
          status: Database["public"]["Enums"]["attendance_status"]
          total_hours: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          attendance_date: string
          clock_in?: string | null
          clock_out?: string | null
          created_at?: string
          department_id: string
          id?: string
          notes?: string | null
          overtime_hours?: number | null
          regular_hours?: number | null
          shift_type?: string | null
          status?: Database["public"]["Enums"]["attendance_status"]
          total_hours?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          attendance_date?: string
          clock_in?: string | null
          clock_out?: string | null
          created_at?: string
          department_id?: string
          id?: string
          notes?: string | null
          overtime_hours?: number | null
          regular_hours?: number | null
          shift_type?: string | null
          status?: Database["public"]["Enums"]["attendance_status"]
          total_hours?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_records_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          created_at: string
          department_id: string | null
          id: string
          ip_address: string | null
          new_data: Json | null
          old_data: Json | null
          record_id: string | null
          table_name: string
          user_agent: string | null
          user_email: string | null
          user_id: string
          user_name: string | null
        }
        Insert: {
          action: string
          created_at?: string
          department_id?: string | null
          id?: string
          ip_address?: string | null
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string | null
          table_name: string
          user_agent?: string | null
          user_email?: string | null
          user_id: string
          user_name?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          department_id?: string | null
          id?: string
          ip_address?: string | null
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string | null
          table_name?: string
          user_agent?: string | null
          user_email?: string | null
          user_id?: string
          user_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          code: string
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          logo_url: string | null
          name: string
          parent_id: string | null
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          logo_url?: string | null
          name: string
          parent_id?: string | null
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          logo_url?: string | null
          name?: string
          parent_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "companies_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      company_leave_workflows: {
        Row: {
          company_id: string
          created_at: string
          final_approver_role: string
          hr_auto_approve: boolean
          hr_review_enabled: boolean
          id: string
          manager_review_enabled: boolean
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          final_approver_role?: string
          hr_auto_approve?: boolean
          hr_review_enabled?: boolean
          id?: string
          manager_review_enabled?: boolean
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          final_approver_role?: string
          hr_auto_approve?: boolean
          hr_review_enabled?: boolean
          id?: string
          manager_review_enabled?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_leave_workflows_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      company_policies: {
        Row: {
          company_id: string | null
          created_at: string
          description: string | null
          id: string
          policy_category: string
          policy_key: string
          policy_value: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          policy_category: string
          policy_key: string
          policy_value: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          company_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          policy_category?: string
          policy_key?: string
          policy_value?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "company_policies_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      departments: {
        Row: {
          code: string
          color: string | null
          company_id: string | null
          created_at: string
          description: string | null
          icon: string | null
          id: string
          is_hr_only: boolean
          name: string
          updated_at: string
        }
        Insert: {
          code: string
          color?: string | null
          company_id?: string | null
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          is_hr_only?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          code?: string
          color?: string | null
          company_id?: string | null
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          is_hr_only?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "departments_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_leave_entitlements: {
        Row: {
          annual_days: number
          bereavement_days: number
          created_at: string
          created_by: string | null
          id: string
          maternity_days: number
          monthly_accrual: number | null
          notes: string | null
          paternity_days: number
          personal_days: number
          sick_days: number
          unpaid_days: number
          updated_at: string
          user_id: string
        }
        Insert: {
          annual_days?: number
          bereavement_days?: number
          created_at?: string
          created_by?: string | null
          id?: string
          maternity_days?: number
          monthly_accrual?: number | null
          notes?: string | null
          paternity_days?: number
          personal_days?: number
          sick_days?: number
          unpaid_days?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          annual_days?: number
          bereavement_days?: number
          created_at?: string
          created_by?: string | null
          id?: string
          maternity_days?: number
          monthly_accrual?: number | null
          notes?: string | null
          paternity_days?: number
          personal_days?: number
          sick_days?: number
          unpaid_days?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      employees: {
        Row: {
          address: string | null
          avatar_url: string | null
          company_id: string | null
          created_at: string
          created_by: string | null
          date_of_birth: string | null
          department_id: string | null
          email: string | null
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          employee_number: string
          employment_status: string
          employment_type: string
          fingerprint_number: string | null
          full_name: string
          gender: string | null
          hire_date: string
          id: string
          linked_user_id: string | null
          notes: string | null
          phone: string | null
          position_id: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          avatar_url?: string | null
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          date_of_birth?: string | null
          department_id?: string | null
          email?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          employee_number: string
          employment_status?: string
          employment_type?: string
          fingerprint_number?: string | null
          full_name: string
          gender?: string | null
          hire_date?: string
          id?: string
          linked_user_id?: string | null
          notes?: string | null
          phone?: string | null
          position_id?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          avatar_url?: string | null
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          date_of_birth?: string | null
          department_id?: string | null
          email?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          employee_number?: string
          employment_status?: string
          employment_type?: string
          fingerprint_number?: string | null
          full_name?: string
          gender?: string | null
          hire_date?: string
          id?: string
          linked_user_id?: string | null
          notes?: string | null
          phone?: string | null
          position_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "employees_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employees_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employees_position_id_fkey"
            columns: ["position_id"]
            isOneToOne: false
            referencedRelation: "positions"
            referencedColumns: ["id"]
          },
        ]
      }
      fleet_audit_log: {
        Row: {
          action: string
          created_at: string
          field_name: string | null
          fleet_id: string
          id: string
          new_value: string | null
          old_value: string | null
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          field_name?: string | null
          fleet_id: string
          id?: string
          new_value?: string | null
          old_value?: string | null
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          field_name?: string | null
          fleet_id?: string
          id?: string
          new_value?: string | null
          old_value?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fleet_audit_log_fleet_id_fkey"
            columns: ["fleet_id"]
            isOneToOne: false
            referencedRelation: "fleets"
            referencedColumns: ["id"]
          },
        ]
      }
      fleet_issues: {
        Row: {
          created_at: string
          fleet_id: string
          id: string
          is_resolved: boolean | null
          issue_description: string
          resolved_at: string | null
          resolved_by: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          fleet_id: string
          id?: string
          is_resolved?: boolean | null
          issue_description: string
          resolved_at?: string | null
          resolved_by?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          fleet_id?: string
          id?: string
          is_resolved?: boolean | null
          issue_description?: string
          resolved_at?: string | null
          resolved_by?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fleet_issues_fleet_id_fkey"
            columns: ["fleet_id"]
            isOneToOne: false
            referencedRelation: "fleets"
            referencedColumns: ["id"]
          },
        ]
      }
      fleets: {
        Row: {
          checked_by_name: string | null
          condition: string | null
          created_at: string
          current_status: string | null
          delivery_date: string | null
          department_id: string
          fleet_number: string
          id: string
          last_inspection_date: string | null
          machine_hours: number | null
          machine_type: string
          operator_id: string | null
          remarks: string | null
          status: Database["public"]["Enums"]["fleet_status"]
          updated_at: string
        }
        Insert: {
          checked_by_name?: string | null
          condition?: string | null
          created_at?: string
          current_status?: string | null
          delivery_date?: string | null
          department_id: string
          fleet_number: string
          id?: string
          last_inspection_date?: string | null
          machine_hours?: number | null
          machine_type: string
          operator_id?: string | null
          remarks?: string | null
          status?: Database["public"]["Enums"]["fleet_status"]
          updated_at?: string
        }
        Update: {
          checked_by_name?: string | null
          condition?: string | null
          created_at?: string
          current_status?: string | null
          delivery_date?: string | null
          department_id?: string
          fleet_number?: string
          id?: string
          last_inspection_date?: string | null
          machine_hours?: number | null
          machine_type?: string
          operator_id?: string | null
          remarks?: string | null
          status?: Database["public"]["Enums"]["fleet_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fleets_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_items: {
        Row: {
          classification_id: string | null
          created_at: string
          created_by: string | null
          department_id: string
          description: string | null
          id: string
          image_url: string | null
          item_name: string
          item_number: string
          location: string | null
          location_id: string | null
          min_quantity: number | null
          quantity: number
          unit: string | null
          updated_at: string
        }
        Insert: {
          classification_id?: string | null
          created_at?: string
          created_by?: string | null
          department_id: string
          description?: string | null
          id?: string
          image_url?: string | null
          item_name: string
          item_number: string
          location?: string | null
          location_id?: string | null
          min_quantity?: number | null
          quantity?: number
          unit?: string | null
          updated_at?: string
        }
        Update: {
          classification_id?: string | null
          created_at?: string
          created_by?: string | null
          department_id?: string
          description?: string | null
          id?: string
          image_url?: string | null
          item_name?: string
          item_number?: string
          location?: string | null
          location_id?: string | null
          min_quantity?: number | null
          quantity?: number
          unit?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_items_classification_id_fkey"
            columns: ["classification_id"]
            isOneToOne: false
            referencedRelation: "warehouse_classifications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_items_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_items_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "warehouse_locations"
            referencedColumns: ["id"]
          },
        ]
      }
      item_request_approvers: {
        Row: {
          created_at: string
          created_by: string | null
          full_name: string
          id: string
          is_active: boolean
          position: string | null
          signature_url: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          full_name: string
          id?: string
          is_active?: boolean
          position?: string | null
          signature_url?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          full_name?: string
          id?: string
          is_active?: boolean
          position?: string | null
          signature_url?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      item_requests: {
        Row: {
          approval_date: string | null
          approval_proof_url: string | null
          approved_by_id: string | null
          created_at: string
          department_id: string
          id: string
          inventory_item_id: string | null
          item_description: string
          new_quantity: number
          notes: string | null
          previous_quantity: number
          quantity_requested: number
          requested_items: Json | null
          requester_department_id: string | null
          requester_department_text: string | null
          requester_id: string
          requester_name: string
          status: string
          updated_at: string
          usage_purpose: string | null
        }
        Insert: {
          approval_date?: string | null
          approval_proof_url?: string | null
          approved_by_id?: string | null
          created_at?: string
          department_id: string
          id?: string
          inventory_item_id?: string | null
          item_description: string
          new_quantity?: number
          notes?: string | null
          previous_quantity?: number
          quantity_requested?: number
          requested_items?: Json | null
          requester_department_id?: string | null
          requester_department_text?: string | null
          requester_id: string
          requester_name: string
          status?: string
          updated_at?: string
          usage_purpose?: string | null
        }
        Update: {
          approval_date?: string | null
          approval_proof_url?: string | null
          approved_by_id?: string | null
          created_at?: string
          department_id?: string
          id?: string
          inventory_item_id?: string | null
          item_description?: string
          new_quantity?: number
          notes?: string | null
          previous_quantity?: number
          quantity_requested?: number
          requested_items?: Json | null
          requester_department_id?: string | null
          requester_department_text?: string | null
          requester_id?: string
          requester_name?: string
          status?: string
          updated_at?: string
          usage_purpose?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "item_requests_approved_by_id_fkey"
            columns: ["approved_by_id"]
            isOneToOne: false
            referencedRelation: "item_request_approvers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "item_requests_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "item_requests_inventory_item_id_fkey"
            columns: ["inventory_item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "item_requests_requester_department_id_fkey"
            columns: ["requester_department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      leave_approvers: {
        Row: {
          approver_role: Database["public"]["Enums"]["leave_approver_role"]
          company_id: string | null
          created_at: string
          granted_by: string
          id: string
          is_active: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          approver_role: Database["public"]["Enums"]["leave_approver_role"]
          company_id?: string | null
          created_at?: string
          granted_by: string
          id?: string
          is_active?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          approver_role?: Database["public"]["Enums"]["leave_approver_role"]
          company_id?: string | null
          created_at?: string
          granted_by?: string
          id?: string
          is_active?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "leave_approvers_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      leave_balances: {
        Row: {
          created_at: string
          id: string
          leave_type: Database["public"]["Enums"]["leave_type"]
          total_days: number
          updated_at: string
          used_days: number
          user_id: string
          year: number
        }
        Insert: {
          created_at?: string
          id?: string
          leave_type: Database["public"]["Enums"]["leave_type"]
          total_days?: number
          updated_at?: string
          used_days?: number
          user_id: string
          year?: number
        }
        Update: {
          created_at?: string
          id?: string
          leave_type?: Database["public"]["Enums"]["leave_type"]
          total_days?: number
          updated_at?: string
          used_days?: number
          user_id?: string
          year?: number
        }
        Relationships: []
      }
      leave_managers: {
        Row: {
          can_edit_balances: boolean
          can_file_for_others: boolean
          created_at: string
          granted_by: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          can_edit_balances?: boolean
          can_file_for_others?: boolean
          created_at?: string
          granted_by: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          can_edit_balances?: boolean
          can_file_for_others?: boolean
          created_at?: string
          granted_by?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      leave_requests: {
        Row: {
          company_id: string | null
          created_at: string
          department_id: string
          employee_id: string | null
          end_date: string
          gm_action_at: string | null
          gm_comment: string | null
          gm_reviewer_id: string | null
          hr_action_at: string | null
          hr_comment: string | null
          hr_reviewer_id: string | null
          id: string
          leave_type: Database["public"]["Enums"]["leave_type"]
          manager_action_at: string | null
          manager_comment: string | null
          manager_id: string | null
          reason: string | null
          requester_id: string
          start_date: string
          status: Database["public"]["Enums"]["leave_status"]
          submitted_by_id: string | null
          total_days: number
          updated_at: string
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          department_id: string
          employee_id?: string | null
          end_date: string
          gm_action_at?: string | null
          gm_comment?: string | null
          gm_reviewer_id?: string | null
          hr_action_at?: string | null
          hr_comment?: string | null
          hr_reviewer_id?: string | null
          id?: string
          leave_type: Database["public"]["Enums"]["leave_type"]
          manager_action_at?: string | null
          manager_comment?: string | null
          manager_id?: string | null
          reason?: string | null
          requester_id: string
          start_date: string
          status?: Database["public"]["Enums"]["leave_status"]
          submitted_by_id?: string | null
          total_days: number
          updated_at?: string
        }
        Update: {
          company_id?: string | null
          created_at?: string
          department_id?: string
          employee_id?: string | null
          end_date?: string
          gm_action_at?: string | null
          gm_comment?: string | null
          gm_reviewer_id?: string | null
          hr_action_at?: string | null
          hr_comment?: string | null
          hr_reviewer_id?: string | null
          id?: string
          leave_type?: Database["public"]["Enums"]["leave_type"]
          manager_action_at?: string | null
          manager_comment?: string | null
          manager_id?: string | null
          reason?: string | null
          requester_id?: string
          start_date?: string
          status?: Database["public"]["Enums"]["leave_status"]
          submitted_by_id?: string | null
          total_days?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "leave_requests_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_requests_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_requests_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      maintenance_records: {
        Row: {
          checked_by: string | null
          condition_after_service:
            | Database["public"]["Enums"]["condition_type"]
            | null
          created_at: string
          current_status: string | null
          delivery_time_hours: number | null
          department_id: string
          fleet_id: string
          id: string
          machine_hours: number | null
          maintenance_date: string
          next_service_due: string | null
          operator_id: string | null
          remarks: string | null
          service_description: string
          service_type: Database["public"]["Enums"]["service_type"]
          updated_at: string
        }
        Insert: {
          checked_by?: string | null
          condition_after_service?:
            | Database["public"]["Enums"]["condition_type"]
            | null
          created_at?: string
          current_status?: string | null
          delivery_time_hours?: number | null
          department_id: string
          fleet_id: string
          id?: string
          machine_hours?: number | null
          maintenance_date: string
          next_service_due?: string | null
          operator_id?: string | null
          remarks?: string | null
          service_description: string
          service_type?: Database["public"]["Enums"]["service_type"]
          updated_at?: string
        }
        Update: {
          checked_by?: string | null
          condition_after_service?:
            | Database["public"]["Enums"]["condition_type"]
            | null
          created_at?: string
          current_status?: string | null
          delivery_time_hours?: number | null
          department_id?: string
          fleet_id?: string
          id?: string
          machine_hours?: number | null
          maintenance_date?: string
          next_service_due?: string | null
          operator_id?: string | null
          remarks?: string | null
          service_description?: string
          service_type?: Database["public"]["Enums"]["service_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "maintenance_records_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_records_fleet_id_fkey"
            columns: ["fleet_id"]
            isOneToOne: false
            referencedRelation: "fleets"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          link: string | null
          message: string | null
          read: boolean | null
          title: string
          type: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          link?: string | null
          message?: string | null
          read?: boolean | null
          title: string
          type?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          link?: string | null
          message?: string | null
          read?: boolean | null
          title?: string
          type?: string | null
          user_id?: string
        }
        Relationships: []
      }
      office_activities: {
        Row: {
          activity_type: string
          attachments: string[] | null
          attendees: string[] | null
          completed_at: string | null
          created_at: string
          created_by: string
          department_id: string
          description: string | null
          id: string
          is_pinned: boolean
          priority: string
          scheduled_at: string | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          activity_type: string
          attachments?: string[] | null
          attendees?: string[] | null
          completed_at?: string | null
          created_at?: string
          created_by: string
          department_id: string
          description?: string | null
          id?: string
          is_pinned?: boolean
          priority?: string
          scheduled_at?: string | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          activity_type?: string
          attachments?: string[] | null
          attendees?: string[] | null
          completed_at?: string | null
          created_at?: string
          created_by?: string
          department_id?: string
          description?: string | null
          id?: string
          is_pinned?: boolean
          priority?: string
          scheduled_at?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "office_activities_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      onboarding_checklists: {
        Row: {
          category: string
          completed_at: string | null
          completed_by: string | null
          created_at: string
          employee_id: string
          id: string
          is_completed: boolean
          sort_order: number | null
          task_label: string
          updated_at: string
        }
        Insert: {
          category?: string
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          employee_id: string
          id?: string
          is_completed?: boolean
          sort_order?: number | null
          task_label: string
          updated_at?: string
        }
        Update: {
          category?: string
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          employee_id?: string
          id?: string
          is_completed?: boolean
          sort_order?: number | null
          task_label?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "onboarding_checklists_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      performance_goals: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          due_date: string | null
          employee_id: string
          id: string
          priority: string
          progress: number
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          employee_id: string
          id?: string
          priority?: string
          progress?: number
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          employee_id?: string
          id?: string
          priority?: string
          progress?: number
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "performance_goals_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      performance_reviews: {
        Row: {
          comments: string | null
          created_at: string
          employee_id: string
          id: string
          review_period: string
          reviewer_id: string | null
          score: number | null
          status: string
          updated_at: string
        }
        Insert: {
          comments?: string | null
          created_at?: string
          employee_id: string
          id?: string
          review_period: string
          reviewer_id?: string | null
          score?: number | null
          status?: string
          updated_at?: string
        }
        Update: {
          comments?: string | null
          created_at?: string
          employee_id?: string
          id?: string
          review_period?: string
          reviewer_id?: string | null
          score?: number | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "performance_reviews_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      positions: {
        Row: {
          created_at: string
          department_id: string | null
          description: string | null
          id: string
          is_active: boolean | null
          level: number | null
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          department_id?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          level?: number | null
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          department_id?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          level?: number | null
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "positions_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          department_id: string | null
          email: string
          full_name: string | null
          id: string
          phone: string | null
          position_id: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          department_id?: string | null
          email: string
          full_name?: string | null
          id: string
          phone?: string | null
          position_id?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          department_id?: string | null
          email?: string
          full_name?: string | null
          id?: string
          phone?: string | null
          position_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_position_id_fkey"
            columns: ["position_id"]
            isOneToOne: false
            referencedRelation: "positions"
            referencedColumns: ["id"]
          },
        ]
      }
      receiving_records: {
        Row: {
          created_at: string
          created_by: string | null
          department_id: string
          id: string
          items: Json
          notes: string | null
          receiving_date: string
          record_name: string
          status: string
          total_items: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          department_id: string
          id?: string
          items?: Json
          notes?: string | null
          receiving_date?: string
          record_name: string
          status?: string
          total_items?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          department_id?: string
          id?: string
          items?: Json
          notes?: string | null
          receiving_date?: string
          record_name?: string
          status?: string
          total_items?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "receiving_records_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      report_comments: {
        Row: {
          action: string | null
          content: string
          created_at: string
          id: string
          report_id: string
          user_id: string
        }
        Insert: {
          action?: string | null
          content: string
          created_at?: string
          id?: string
          report_id: string
          user_id: string
        }
        Update: {
          action?: string | null
          content?: string
          created_at?: string
          id?: string
          report_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "report_comments_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "reports"
            referencedColumns: ["id"]
          },
        ]
      }
      reports: {
        Row: {
          assigned_to: string | null
          attachments: string[] | null
          created_at: string
          created_by: string
          data: Json | null
          department_id: string
          description: string | null
          id: string
          priority: Database["public"]["Enums"]["report_priority"]
          report_type: Database["public"]["Enums"]["report_type"]
          resolved_at: string | null
          status: Database["public"]["Enums"]["report_status"]
          submitted_at: string | null
          title: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          attachments?: string[] | null
          created_at?: string
          created_by: string
          data?: Json | null
          department_id: string
          description?: string | null
          id?: string
          priority?: Database["public"]["Enums"]["report_priority"]
          report_type?: Database["public"]["Enums"]["report_type"]
          resolved_at?: string | null
          status?: Database["public"]["Enums"]["report_status"]
          submitted_at?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          attachments?: string[] | null
          created_at?: string
          created_by?: string
          data?: Json | null
          department_id?: string
          description?: string | null
          id?: string
          priority?: Database["public"]["Enums"]["report_priority"]
          report_type?: Database["public"]["Enums"]["report_type"]
          resolved_at?: string | null
          status?: Database["public"]["Enums"]["report_status"]
          submitted_at?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reports_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_transactions: {
        Row: {
          created_at: string
          created_by: string | null
          department_id: string
          handed_to_department_id: string | null
          handed_to_user_id: string | null
          id: string
          inventory_item_id: string
          new_quantity: number
          notes: string | null
          previous_quantity: number
          quantity: number
          requested_by_user_id: string | null
          support_ticket_id: string | null
          transaction_type: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          department_id: string
          handed_to_department_id?: string | null
          handed_to_user_id?: string | null
          id?: string
          inventory_item_id: string
          new_quantity: number
          notes?: string | null
          previous_quantity: number
          quantity: number
          requested_by_user_id?: string | null
          support_ticket_id?: string | null
          transaction_type: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          department_id?: string
          handed_to_department_id?: string | null
          handed_to_user_id?: string | null
          id?: string
          inventory_item_id?: string
          new_quantity?: number
          notes?: string | null
          previous_quantity?: number
          quantity?: number
          requested_by_user_id?: string | null
          support_ticket_id?: string | null
          transaction_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "stock_transactions_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_transactions_handed_to_department_id_fkey"
            columns: ["handed_to_department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_transactions_inventory_item_id_fkey"
            columns: ["inventory_item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_transactions_support_ticket_id_fkey"
            columns: ["support_ticket_id"]
            isOneToOne: false
            referencedRelation: "support_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      support_tickets: {
        Row: {
          assigned_to: string | null
          category: string
          created_at: string
          description: string | null
          id: string
          priority: string
          requested_by: string
          requesting_department_id: string
          resolved_at: string | null
          resolved_by: string | null
          status: string
          ticket_number: string
          title: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          priority?: string
          requested_by: string
          requesting_department_id: string
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          ticket_number: string
          title: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          priority?: string
          requested_by?: string
          requesting_department_id?: string
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          ticket_number?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_tickets_requesting_department_id_fkey"
            columns: ["requesting_department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      system_events: {
        Row: {
          created_at: string
          description: string | null
          event_type: string
          id: string
          metadata: Json | null
          resolved: boolean | null
          resolved_at: string | null
          resolved_by: string | null
          severity: string
          title: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          event_type: string
          id?: string
          metadata?: Json | null
          resolved?: boolean | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string
          title: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          event_type?: string
          id?: string
          metadata?: Json | null
          resolved?: boolean | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string
          title?: string
          user_id?: string | null
        }
        Relationships: []
      }
      system_reports: {
        Row: {
          created_at: string
          id: string
          issues_detected: number | null
          report_type: string
          summary: Json
        }
        Insert: {
          created_at?: string
          id?: string
          issues_detected?: number | null
          report_type?: string
          summary?: Json
        }
        Update: {
          created_at?: string
          id?: string
          issues_detected?: number | null
          report_type?: string
          summary?: Json
        }
        Relationships: []
      }
      user_department_access: {
        Row: {
          department_id: string
          granted_at: string
          granted_by: string
          id: string
          user_id: string
        }
        Insert: {
          department_id: string
          granted_at?: string
          granted_by: string
          id?: string
          user_id: string
        }
        Update: {
          department_id?: string
          granted_at?: string
          granted_by?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_department_access_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          department_id: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          department_id?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          department_id?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      user_sessions: {
        Row: {
          current_page: string | null
          id: string
          ip_address: string | null
          is_active: boolean | null
          last_activity: string
          session_started: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          current_page?: string | null
          id?: string
          ip_address?: string | null
          is_active?: boolean | null
          last_activity?: string
          session_started?: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          current_page?: string | null
          id?: string
          ip_address?: string | null
          is_active?: boolean | null
          last_activity?: string
          session_started?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      warehouse_classifications: {
        Row: {
          color: string | null
          created_at: string
          created_by: string | null
          department_id: string
          description: string | null
          icon: string | null
          id: string
          name: string
          sort_order: number | null
          updated_at: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          created_by?: string | null
          department_id: string
          description?: string | null
          icon?: string | null
          id?: string
          name: string
          sort_order?: number | null
          updated_at?: string
        }
        Update: {
          color?: string | null
          created_at?: string
          created_by?: string | null
          department_id?: string
          description?: string | null
          icon?: string | null
          id?: string
          name?: string
          sort_order?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "warehouse_classifications_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      warehouse_locations: {
        Row: {
          classification_id: string
          created_at: string
          created_by: string | null
          department_id: string
          description: string | null
          id: string
          min_items: number | null
          name: string
          parent_id: string | null
          sort_order: number | null
          updated_at: string
        }
        Insert: {
          classification_id: string
          created_at?: string
          created_by?: string | null
          department_id: string
          description?: string | null
          id?: string
          min_items?: number | null
          name: string
          parent_id?: string | null
          sort_order?: number | null
          updated_at?: string
        }
        Update: {
          classification_id?: string
          created_at?: string
          created_by?: string | null
          department_id?: string
          description?: string | null
          id?: string
          min_items?: number | null
          name?: string
          parent_id?: string | null
          sort_order?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "warehouse_locations_classification_id_fkey"
            columns: ["classification_id"]
            isOneToOne: false
            referencedRelation: "warehouse_classifications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "warehouse_locations_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "warehouse_locations_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "warehouse_locations"
            referencedColumns: ["id"]
          },
        ]
      }
      weekend_schedules: {
        Row: {
          assigned_by: string
          created_at: string
          employee_id: string
          id: string
          is_off_duty: boolean
          notes: string | null
          updated_at: string
          week_start_date: string
        }
        Insert: {
          assigned_by: string
          created_at?: string
          employee_id: string
          id?: string
          is_off_duty?: boolean
          notes?: string | null
          updated_at?: string
          week_start_date: string
        }
        Update: {
          assigned_by?: string
          created_at?: string
          employee_id?: string
          id?: string
          is_off_duty?: boolean
          notes?: string | null
          updated_at?: string
          week_start_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "weekend_schedules_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      accrue_monthly_annual_leave: { Args: never; Returns: undefined }
      check_pending_password_reset: {
        Args: { email_to_check: string }
        Returns: boolean
      }
      cleanup_inactive_sessions: { Args: never; Returns: undefined }
      deduct_active_leave_balances: { Args: never; Returns: undefined }
      get_user_department: { Args: { _user_id: string }; Returns: string }
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      initialize_default_leave_balances: { Args: never; Returns: undefined }
      reduce_item_quantity: {
        Args: { p_item_id: string; p_new_quantity: number }
        Returns: boolean
      }
      user_in_department: {
        Args: { _department_id: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role:
        | "staff"
        | "supervisor"
        | "manager"
        | "director"
        | "admin"
        | "super_admin"
      attendance_status:
        | "present"
        | "absent"
        | "late"
        | "half_day"
        | "on_leave"
        | "remote"
      condition_type: "good" | "fair" | "poor"
      fleet_condition:
        | "operational"
        | "good_condition"
        | "grounded"
        | "under_repair"
        | "waiting_parts"
        | "decommissioned"
      fleet_status: "operational" | "under_maintenance" | "out_of_service"
      leave_approver_role:
        | "peat_manager"
        | "hr_reviewer"
        | "gm_approver"
        | "om_approver"
        | "it_manager"
        | "it_officer"
        | "peat_admin"
      leave_status:
        | "pending"
        | "hr_approved"
        | "manager_approved"
        | "approved"
        | "rejected"
        | "cancelled"
        | "gm_pending"
      leave_type:
        | "annual"
        | "sick"
        | "personal"
        | "maternity"
        | "paternity"
        | "bereavement"
        | "unpaid"
      report_priority: "low" | "medium" | "high" | "critical"
      report_status:
        | "draft"
        | "pending"
        | "in_review"
        | "approved"
        | "rejected"
        | "escalated"
      report_type: "incident" | "financial" | "performance" | "general"
      service_type: "preventive" | "corrective" | "breakdown"
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
      app_role: [
        "staff",
        "supervisor",
        "manager",
        "director",
        "admin",
        "super_admin",
      ],
      attendance_status: [
        "present",
        "absent",
        "late",
        "half_day",
        "on_leave",
        "remote",
      ],
      condition_type: ["good", "fair", "poor"],
      fleet_condition: [
        "operational",
        "good_condition",
        "grounded",
        "under_repair",
        "waiting_parts",
        "decommissioned",
      ],
      fleet_status: ["operational", "under_maintenance", "out_of_service"],
      leave_approver_role: [
        "peat_manager",
        "hr_reviewer",
        "gm_approver",
        "om_approver",
        "it_manager",
        "it_officer",
        "peat_admin",
      ],
      leave_status: [
        "pending",
        "hr_approved",
        "manager_approved",
        "approved",
        "rejected",
        "cancelled",
        "gm_pending",
      ],
      leave_type: [
        "annual",
        "sick",
        "personal",
        "maternity",
        "paternity",
        "bereavement",
        "unpaid",
      ],
      report_priority: ["low", "medium", "high", "critical"],
      report_status: [
        "draft",
        "pending",
        "in_review",
        "approved",
        "rejected",
        "escalated",
      ],
      report_type: ["incident", "financial", "performance", "general"],
      service_type: ["preventive", "corrective", "breakdown"],
    },
  },
} as const
