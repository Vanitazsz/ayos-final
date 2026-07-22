export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never;
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      graphql: {
        Args: {
          extensions?: Json;
          operationName?: string;
          query?: string;
          variables?: Json;
        };
        Returns: Json;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
  public: {
    Tables: {
      account_preferences: {
        Row: {
          account_id: string;
          appearance: string;
          created_at: string;
          locale: string;
          notifications: Json;
          privacy: Json;
          timezone: string;
          updated_at: string;
        };
        Insert: {
          account_id: string;
          appearance?: string;
          created_at?: string;
          locale?: string;
          notifications?: Json;
          privacy?: Json;
          timezone?: string;
          updated_at?: string;
        };
        Update: {
          account_id?: string;
          appearance?: string;
          created_at?: string;
          locale?: string;
          notifications?: Json;
          privacy?: Json;
          timezone?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'account_preferences_account_id_fkey';
            columns: ['account_id'];
            isOneToOne: true;
            referencedRelation: 'accounts';
            referencedColumns: ['id'];
          },
        ];
      };
      account_role_memberships: {
        Row: {
          account_id: string;
          granted_at: string;
          revoked_at: string | null;
          role: Database['public']['Enums']['account_role'];
          status: string;
        };
        Insert: {
          account_id: string;
          granted_at?: string;
          revoked_at?: string | null;
          role: Database['public']['Enums']['account_role'];
          status?: string;
        };
        Update: {
          account_id?: string;
          granted_at?: string;
          revoked_at?: string | null;
          role?: Database['public']['Enums']['account_role'];
          status?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'account_role_memberships_account_id_fkey';
            columns: ['account_id'];
            isOneToOne: false;
            referencedRelation: 'accounts';
            referencedColumns: ['id'];
          },
        ];
      };
      account_session_roles: {
        Row: {
          account_id: string;
          active_role: Database['public']['Enums']['account_role'];
          session_id: string;
          switched_at: string;
        };
        Insert: {
          account_id: string;
          active_role: Database['public']['Enums']['account_role'];
          session_id: string;
          switched_at?: string;
        };
        Update: {
          account_id?: string;
          active_role?: Database['public']['Enums']['account_role'];
          session_id?: string;
          switched_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'account_session_roles_account_id_fkey';
            columns: ['account_id'];
            isOneToOne: false;
            referencedRelation: 'accounts';
            referencedColumns: ['id'];
          },
        ];
      };
      accounts: {
        Row: {
          created_at: string;
          deleted_at: string | null;
          email: string;
          id: string;
          is_protected: boolean;
          mfa_enabled: boolean;
          mobile: string | null;
          password_changed_at: string | null;
          profile_completed_at: string | null;
          role: Database['public']['Enums']['account_role'];
          status: Database['public']['Enums']['account_status'];
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          deleted_at?: string | null;
          email: string;
          id: string;
          is_protected?: boolean;
          mfa_enabled?: boolean;
          mobile?: string | null;
          password_changed_at?: string | null;
          profile_completed_at?: string | null;
          role: Database['public']['Enums']['account_role'];
          status?: Database['public']['Enums']['account_status'];
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          deleted_at?: string | null;
          email?: string;
          id?: string;
          is_protected?: boolean;
          mfa_enabled?: boolean;
          mobile?: string | null;
          password_changed_at?: string | null;
          profile_completed_at?: string | null;
          role?: Database['public']['Enums']['account_role'];
          status?: Database['public']['Enums']['account_status'];
          updated_at?: string;
        };
        Relationships: [];
      };
      addresses: {
        Row: {
          account_id: string;
          archived_at: string | null;
          barangay: string;
          city: string;
          contact_mobile: string | null;
          created_at: string;
          geocoding_confidence: number | null;
          geocoding_payload: Json | null;
          geocoding_provider: string | null;
          geocoding_provider_id: string | null;
          id: string;
          instructions: string | null;
          is_default: boolean;
          label: string;
          latitude: number | null;
          line1: string;
          line2: string | null;
          location: unknown;
          longitude: number | null;
          postal_code: string | null;
          province: string;
          recipient_name: string | null;
          updated_at: string;
        };
        Insert: {
          account_id: string;
          archived_at?: string | null;
          barangay: string;
          city: string;
          contact_mobile?: string | null;
          created_at?: string;
          geocoding_confidence?: number | null;
          geocoding_payload?: Json | null;
          geocoding_provider?: string | null;
          geocoding_provider_id?: string | null;
          id?: string;
          instructions?: string | null;
          is_default?: boolean;
          label: string;
          latitude?: number | null;
          line1: string;
          line2?: string | null;
          location?: unknown;
          longitude?: number | null;
          postal_code?: string | null;
          province: string;
          recipient_name?: string | null;
          updated_at?: string;
        };
        Update: {
          account_id?: string;
          archived_at?: string | null;
          barangay?: string;
          city?: string;
          contact_mobile?: string | null;
          created_at?: string;
          geocoding_confidence?: number | null;
          geocoding_payload?: Json | null;
          geocoding_provider?: string | null;
          geocoding_provider_id?: string | null;
          id?: string;
          instructions?: string | null;
          is_default?: boolean;
          label?: string;
          latitude?: number | null;
          line1?: string;
          line2?: string | null;
          location?: unknown;
          longitude?: number | null;
          postal_code?: string | null;
          province?: string;
          recipient_name?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'addresses_account_id_fkey';
            columns: ['account_id'];
            isOneToOne: false;
            referencedRelation: 'accounts';
            referencedColumns: ['id'];
          },
        ];
      };
      admin_profiles: {
        Row: {
          account_id: string;
          avatar_path: string | null;
          bio: string | null;
          created_at: string;
          display_name: string;
          family_name: string | null;
          given_name: string | null;
          location: string | null;
          updated_at: string;
        };
        Insert: {
          account_id: string;
          avatar_path?: string | null;
          bio?: string | null;
          created_at?: string;
          display_name: string;
          family_name?: string | null;
          given_name?: string | null;
          location?: string | null;
          updated_at?: string;
        };
        Update: {
          account_id?: string;
          avatar_path?: string | null;
          bio?: string | null;
          created_at?: string;
          display_name?: string;
          family_name?: string | null;
          given_name?: string | null;
          location?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'admin_profiles_account_id_fkey';
            columns: ['account_id'];
            isOneToOne: true;
            referencedRelation: 'accounts';
            referencedColumns: ['id'];
          },
        ];
      };
      admin_session_history: {
        Row: {
          admin_account_id: string;
          assurance_level: string;
          id: string;
          last_seen_at: string;
          session_id: string;
          signed_in_at: string;
          signed_out_at: string | null;
          user_agent: string | null;
        };
        Insert: {
          admin_account_id: string;
          assurance_level: string;
          id?: string;
          last_seen_at?: string;
          session_id: string;
          signed_in_at?: string;
          signed_out_at?: string | null;
          user_agent?: string | null;
        };
        Update: {
          admin_account_id?: string;
          assurance_level?: string;
          id?: string;
          last_seen_at?: string;
          session_id?: string;
          signed_in_at?: string;
          signed_out_at?: string | null;
          user_agent?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'admin_session_history_admin_account_id_fkey';
            columns: ['admin_account_id'];
            isOneToOne: false;
            referencedRelation: 'admin_profiles';
            referencedColumns: ['account_id'];
          },
        ];
      };
      ai_analyses: {
        Row: {
          account_id: string;
          created_at: string;
          detected_issue: string | null;
          estimated_cost_maximum: number | null;
          estimated_cost_minimum: number | null;
          id: string;
          idempotency_key: string | null;
          input_storage_path: string | null;
          input_type: string;
          possible_cause: string | null;
          provider: string;
          provider_model: string | null;
          provider_reference: string | null;
          request_draft: string | null;
          safety_advice: string | null;
          saved: boolean;
          severity: string | null;
          suggested_category_name: string | null;
          transcript: string | null;
        };
        Insert: {
          account_id: string;
          created_at?: string;
          detected_issue?: string | null;
          estimated_cost_maximum?: number | null;
          estimated_cost_minimum?: number | null;
          id?: string;
          idempotency_key?: string | null;
          input_storage_path?: string | null;
          input_type: string;
          possible_cause?: string | null;
          provider: string;
          provider_model?: string | null;
          provider_reference?: string | null;
          request_draft?: string | null;
          safety_advice?: string | null;
          saved?: boolean;
          severity?: string | null;
          suggested_category_name?: string | null;
          transcript?: string | null;
        };
        Update: {
          account_id?: string;
          created_at?: string;
          detected_issue?: string | null;
          estimated_cost_maximum?: number | null;
          estimated_cost_minimum?: number | null;
          id?: string;
          idempotency_key?: string | null;
          input_storage_path?: string | null;
          input_type?: string;
          possible_cause?: string | null;
          provider?: string;
          provider_model?: string | null;
          provider_reference?: string | null;
          request_draft?: string | null;
          safety_advice?: string | null;
          saved?: boolean;
          severity?: string | null;
          suggested_category_name?: string | null;
          transcript?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'ai_analyses_account_id_fkey';
            columns: ['account_id'];
            isOneToOne: false;
            referencedRelation: 'accounts';
            referencedColumns: ['id'];
          },
        ];
      };
      ai_analysis_attempts: {
        Row: {
          account_id: string;
          analysis_id: string | null;
          correlation_id: string | null;
          created_at: string;
          error_code: string | null;
          http_status: number | null;
          id: string;
          idempotency_key: string;
          job_id: string | null;
          latency_ms: number;
          model: string;
          outcome: string;
          provider: string;
          retryable: boolean;
          usage_metadata: Json;
        };
        Insert: {
          account_id: string;
          analysis_id?: string | null;
          correlation_id?: string | null;
          created_at?: string;
          error_code?: string | null;
          http_status?: number | null;
          id?: string;
          idempotency_key: string;
          job_id?: string | null;
          latency_ms: number;
          model: string;
          outcome: string;
          provider: string;
          retryable: boolean;
          usage_metadata?: Json;
        };
        Update: {
          account_id?: string;
          analysis_id?: string | null;
          correlation_id?: string | null;
          created_at?: string;
          error_code?: string | null;
          http_status?: number | null;
          id?: string;
          idempotency_key?: string;
          job_id?: string | null;
          latency_ms?: number;
          model?: string;
          outcome?: string;
          provider?: string;
          retryable?: boolean;
          usage_metadata?: Json;
        };
        Relationships: [
          {
            foreignKeyName: 'ai_analysis_attempts_account_id_fkey';
            columns: ['account_id'];
            isOneToOne: false;
            referencedRelation: 'accounts';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'ai_analysis_attempts_analysis_id_fkey';
            columns: ['analysis_id'];
            isOneToOne: false;
            referencedRelation: 'ai_analyses';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'ai_analysis_attempts_job_id_fkey';
            columns: ['job_id'];
            isOneToOne: false;
            referencedRelation: 'ai_analysis_jobs';
            referencedColumns: ['id'];
          },
        ];
      };
      ai_analysis_jobs: {
        Row: {
          account_id: string;
          analysis_id: string | null;
          completed_at: string | null;
          consent_id: string;
          correlation_id: string;
          created_at: string;
          description: string;
          error_code: string | null;
          error_message: string | null;
          id: string;
          idempotency_key: string;
          input_locale: string | null;
          media_paths: Json;
          result: Json | null;
          retryable: boolean;
          service_request_id: string | null;
          started_at: string | null;
          status: string;
          updated_at: string;
        };
        Insert: {
          account_id: string;
          analysis_id?: string | null;
          completed_at?: string | null;
          consent_id: string;
          correlation_id?: string;
          created_at?: string;
          description: string;
          error_code?: string | null;
          error_message?: string | null;
          id?: string;
          idempotency_key: string;
          input_locale?: string | null;
          media_paths?: Json;
          result?: Json | null;
          retryable?: boolean;
          service_request_id?: string | null;
          started_at?: string | null;
          status?: string;
          updated_at?: string;
        };
        Update: {
          account_id?: string;
          analysis_id?: string | null;
          completed_at?: string | null;
          consent_id?: string;
          correlation_id?: string;
          created_at?: string;
          description?: string;
          error_code?: string | null;
          error_message?: string | null;
          id?: string;
          idempotency_key?: string;
          input_locale?: string | null;
          media_paths?: Json;
          result?: Json | null;
          retryable?: boolean;
          service_request_id?: string | null;
          started_at?: string | null;
          status?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'ai_analysis_jobs_account_id_fkey';
            columns: ['account_id'];
            isOneToOne: false;
            referencedRelation: 'accounts';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'ai_analysis_jobs_analysis_id_fkey';
            columns: ['analysis_id'];
            isOneToOne: false;
            referencedRelation: 'ai_analyses';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'ai_analysis_jobs_consent_id_fkey';
            columns: ['consent_id'];
            isOneToOne: false;
            referencedRelation: 'ai_processing_consents';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'ai_analysis_jobs_service_request_id_fkey';
            columns: ['service_request_id'];
            isOneToOne: false;
            referencedRelation: 'service_requests';
            referencedColumns: ['id'];
          },
        ];
      };
      ai_processing_consents: {
        Row: {
          accepted_at: string;
          account_id: string;
          consent_version: string;
          id: string;
          media_processing: boolean;
          providers: string[];
          request_correlation_id: string;
          revoked_at: string | null;
        };
        Insert: {
          accepted_at?: string;
          account_id: string;
          consent_version: string;
          id?: string;
          media_processing?: boolean;
          providers: string[];
          request_correlation_id: string;
          revoked_at?: string | null;
        };
        Update: {
          accepted_at?: string;
          account_id?: string;
          consent_version?: string;
          id?: string;
          media_processing?: boolean;
          providers?: string[];
          request_correlation_id?: string;
          revoked_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'ai_processing_consents_account_id_fkey';
            columns: ['account_id'];
            isOneToOne: false;
            referencedRelation: 'accounts';
            referencedColumns: ['id'];
          },
        ];
      };
      audit_logs: {
        Row: {
          action: string;
          actor_id: string | null;
          correlation_id: string;
          created_at: string;
          entity_id: string | null;
          entity_type: string | null;
          id: string;
          metadata: Json;
        };
        Insert: {
          action: string;
          actor_id?: string | null;
          correlation_id?: string;
          created_at?: string;
          entity_id?: string | null;
          entity_type?: string | null;
          id?: string;
          metadata?: Json;
        };
        Update: {
          action?: string;
          actor_id?: string | null;
          correlation_id?: string;
          created_at?: string;
          entity_id?: string | null;
          entity_type?: string | null;
          id?: string;
          metadata?: Json;
        };
        Relationships: [
          {
            foreignKeyName: 'audit_logs_actor_id_fkey';
            columns: ['actor_id'];
            isOneToOne: false;
            referencedRelation: 'accounts';
            referencedColumns: ['id'];
          },
        ];
      };
      authentication_events: {
        Row: {
          account_id: string;
          created_at: string;
          event_type: string;
          id: string;
          ip_address: unknown;
          session_id_hash: string | null;
          user_agent: string | null;
        };
        Insert: {
          account_id: string;
          created_at?: string;
          event_type: string;
          id?: string;
          ip_address?: unknown;
          session_id_hash?: string | null;
          user_agent?: string | null;
        };
        Update: {
          account_id?: string;
          created_at?: string;
          event_type?: string;
          id?: string;
          ip_address?: unknown;
          session_id_hash?: string | null;
          user_agent?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'authentication_events_account_id_fkey';
            columns: ['account_id'];
            isOneToOne: false;
            referencedRelation: 'accounts';
            referencedColumns: ['id'];
          },
        ];
      };
      booking_status_events: {
        Row: {
          actor_id: string | null;
          booking_id: string;
          created_at: string;
          from_status: Database['public']['Enums']['booking_status'] | null;
          id: string;
          reason: string | null;
          to_status: Database['public']['Enums']['booking_status'];
        };
        Insert: {
          actor_id?: string | null;
          booking_id: string;
          created_at?: string;
          from_status?: Database['public']['Enums']['booking_status'] | null;
          id?: string;
          reason?: string | null;
          to_status: Database['public']['Enums']['booking_status'];
        };
        Update: {
          actor_id?: string | null;
          booking_id?: string;
          created_at?: string;
          from_status?: Database['public']['Enums']['booking_status'] | null;
          id?: string;
          reason?: string | null;
          to_status?: Database['public']['Enums']['booking_status'];
        };
        Relationships: [
          {
            foreignKeyName: 'booking_status_events_actor_id_fkey';
            columns: ['actor_id'];
            isOneToOne: false;
            referencedRelation: 'accounts';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'booking_status_events_booking_id_fkey';
            columns: ['booking_id'];
            isOneToOne: false;
            referencedRelation: 'bookings';
            referencedColumns: ['id'];
          },
        ];
      };
      bookings: {
        Row: {
          accepted_at: string | null;
          accepted_offer_id: string | null;
          agreed_service_amount: number;
          cancelled_at: string | null;
          completed_at: string | null;
          created_at: string;
          currency: string;
          id: string;
          response_due_at: string;
          service_request_id: string;
          status: Database['public']['Enums']['booking_status'];
          updated_at: string;
          user_account_id: string;
          version: number;
          worker_account_id: string;
        };
        Insert: {
          accepted_at?: string | null;
          accepted_offer_id?: string | null;
          agreed_service_amount: number;
          cancelled_at?: string | null;
          completed_at?: string | null;
          created_at?: string;
          currency?: string;
          id?: string;
          response_due_at?: string;
          service_request_id: string;
          status?: Database['public']['Enums']['booking_status'];
          updated_at?: string;
          user_account_id: string;
          version?: number;
          worker_account_id: string;
        };
        Update: {
          accepted_at?: string | null;
          accepted_offer_id?: string | null;
          agreed_service_amount?: number;
          cancelled_at?: string | null;
          completed_at?: string | null;
          created_at?: string;
          currency?: string;
          id?: string;
          response_due_at?: string;
          service_request_id?: string;
          status?: Database['public']['Enums']['booking_status'];
          updated_at?: string;
          user_account_id?: string;
          version?: number;
          worker_account_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'bookings_accepted_offer_id_fkey';
            columns: ['accepted_offer_id'];
            isOneToOne: false;
            referencedRelation: 'service_request_offers';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'bookings_service_request_id_fkey';
            columns: ['service_request_id'];
            isOneToOne: false;
            referencedRelation: 'service_requests';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'bookings_user_account_id_fkey';
            columns: ['user_account_id'];
            isOneToOne: false;
            referencedRelation: 'user_profiles';
            referencedColumns: ['account_id'];
          },
          {
            foreignKeyName: 'bookings_worker_account_id_fkey';
            columns: ['worker_account_id'];
            isOneToOne: false;
            referencedRelation: 'worker_profiles';
            referencedColumns: ['account_id'];
          },
        ];
      };
      cancellation_reasons: {
        Row: {
          applies_to: string;
          code: string;
          is_active: boolean;
          label: string;
          sort_order: number;
        };
        Insert: {
          applies_to: string;
          code: string;
          is_active?: boolean;
          label: string;
          sort_order?: number;
        };
        Update: {
          applies_to?: string;
          code?: string;
          is_active?: boolean;
          label?: string;
          sort_order?: number;
        };
        Relationships: [];
      };
      cancellations: {
        Row: {
          booking_id: string;
          cancelled_by: string;
          confirmed_at: string;
          fee_amount: number;
          id: string;
          initiator_role: Database['public']['Enums']['account_role'] | null;
          job_stage: string | null;
          policy_version: string;
          reason: string;
          reason_code: string | null;
          refund_amount: number;
          resolution_status: string;
        };
        Insert: {
          booking_id: string;
          cancelled_by: string;
          confirmed_at?: string;
          fee_amount?: number;
          id?: string;
          initiator_role?: Database['public']['Enums']['account_role'] | null;
          job_stage?: string | null;
          policy_version: string;
          reason: string;
          reason_code?: string | null;
          refund_amount?: number;
          resolution_status?: string;
        };
        Update: {
          booking_id?: string;
          cancelled_by?: string;
          confirmed_at?: string;
          fee_amount?: number;
          id?: string;
          initiator_role?: Database['public']['Enums']['account_role'] | null;
          job_stage?: string | null;
          policy_version?: string;
          reason?: string;
          reason_code?: string | null;
          refund_amount?: number;
          resolution_status?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'cancellations_booking_id_fkey';
            columns: ['booking_id'];
            isOneToOne: true;
            referencedRelation: 'bookings';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'cancellations_cancelled_by_fkey';
            columns: ['cancelled_by'];
            isOneToOne: false;
            referencedRelation: 'accounts';
            referencedColumns: ['id'];
          },
        ];
      };
      cash_confirmations: {
        Row: {
          account_id: string;
          confirmed_at: string;
          id: string;
          party: Database['public']['Enums']['cash_confirmation_party'];
          payment_id: string;
        };
        Insert: {
          account_id: string;
          confirmed_at?: string;
          id?: string;
          party: Database['public']['Enums']['cash_confirmation_party'];
          payment_id: string;
        };
        Update: {
          account_id?: string;
          confirmed_at?: string;
          id?: string;
          party?: Database['public']['Enums']['cash_confirmation_party'];
          payment_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'cash_confirmations_account_id_fkey';
            columns: ['account_id'];
            isOneToOne: false;
            referencedRelation: 'accounts';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'cash_confirmations_payment_id_fkey';
            columns: ['payment_id'];
            isOneToOne: false;
            referencedRelation: 'payments';
            referencedColumns: ['id'];
          },
        ];
      };
      content_pages: {
        Row: {
          body: string;
          created_at: string;
          id: string;
          key: Database['public']['Enums']['content_key'];
          published_at: string | null;
          title: string;
          updated_at: string;
          updated_by: string | null;
          version: string;
        };
        Insert: {
          body: string;
          created_at?: string;
          id?: string;
          key: Database['public']['Enums']['content_key'];
          published_at?: string | null;
          title: string;
          updated_at?: string;
          updated_by?: string | null;
          version: string;
        };
        Update: {
          body?: string;
          created_at?: string;
          id?: string;
          key?: Database['public']['Enums']['content_key'];
          published_at?: string | null;
          title?: string;
          updated_at?: string;
          updated_by?: string | null;
          version?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'content_pages_updated_by_fkey';
            columns: ['updated_by'];
            isOneToOne: false;
            referencedRelation: 'accounts';
            referencedColumns: ['id'];
          },
        ];
      };
      conversation_participants: {
        Row: {
          account_id: string;
          conversation_id: string;
          joined_at: string;
          last_read_at: string | null;
        };
        Insert: {
          account_id: string;
          conversation_id: string;
          joined_at?: string;
          last_read_at?: string | null;
        };
        Update: {
          account_id?: string;
          conversation_id?: string;
          joined_at?: string;
          last_read_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'conversation_participants_account_id_fkey';
            columns: ['account_id'];
            isOneToOne: false;
            referencedRelation: 'accounts';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'conversation_participants_conversation_id_fkey';
            columns: ['conversation_id'];
            isOneToOne: false;
            referencedRelation: 'conversations';
            referencedColumns: ['id'];
          },
        ];
      };
      conversations: {
        Row: {
          booking_id: string | null;
          created_at: string;
          id: string;
          service_request_id: string | null;
          updated_at: string;
          worker_account_id: string | null;
        };
        Insert: {
          booking_id?: string | null;
          created_at?: string;
          id?: string;
          service_request_id?: string | null;
          updated_at?: string;
          worker_account_id?: string | null;
        };
        Update: {
          booking_id?: string | null;
          created_at?: string;
          id?: string;
          service_request_id?: string | null;
          updated_at?: string;
          worker_account_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'conversations_booking_id_fkey';
            columns: ['booking_id'];
            isOneToOne: true;
            referencedRelation: 'bookings';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'conversations_service_request_id_fkey';
            columns: ['service_request_id'];
            isOneToOne: false;
            referencedRelation: 'service_requests';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'conversations_worker_account_id_fkey';
            columns: ['worker_account_id'];
            isOneToOne: false;
            referencedRelation: 'worker_profiles';
            referencedColumns: ['account_id'];
          },
        ];
      };
      favorites: {
        Row: {
          created_at: string;
          user_account_id: string;
          worker_account_id: string;
        };
        Insert: {
          created_at?: string;
          user_account_id: string;
          worker_account_id: string;
        };
        Update: {
          created_at?: string;
          user_account_id?: string;
          worker_account_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'favorites_user_account_id_fkey';
            columns: ['user_account_id'];
            isOneToOne: false;
            referencedRelation: 'user_profiles';
            referencedColumns: ['account_id'];
          },
          {
            foreignKeyName: 'favorites_worker_account_id_fkey';
            columns: ['worker_account_id'];
            isOneToOne: false;
            referencedRelation: 'worker_profiles';
            referencedColumns: ['account_id'];
          },
        ];
      };
      geocoding_cache: {
        Row: {
          cache_key: string;
          created_at: string;
          expires_at: string;
          normalized_request: Json;
          normalized_response: Json;
          operation: string;
          provider: string;
        };
        Insert: {
          cache_key: string;
          created_at?: string;
          expires_at: string;
          normalized_request: Json;
          normalized_response: Json;
          operation: string;
          provider?: string;
        };
        Update: {
          cache_key?: string;
          created_at?: string;
          expires_at?: string;
          normalized_request?: Json;
          normalized_response?: Json;
          operation?: string;
          provider?: string;
        };
        Relationships: [];
      };
      industries: {
        Row: {
          created_at: string;
          description: string | null;
          id: string;
          is_active: boolean;
          name: string;
          slug: string;
          sort_order: number;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          description?: string | null;
          id?: string;
          is_active?: boolean;
          name: string;
          slug: string;
          sort_order?: number;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          description?: string | null;
          id?: string;
          is_active?: boolean;
          name?: string;
          slug?: string;
          sort_order?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
      job_failures: {
        Row: {
          attempts: number;
          error: string;
          failed_at: string;
          id: string;
          message_id: number | null;
          payload: Json;
          queue_name: string;
          resolved_at: string | null;
          resolved_by: string | null;
        };
        Insert: {
          attempts: number;
          error: string;
          failed_at?: string;
          id?: string;
          message_id?: number | null;
          payload: Json;
          queue_name: string;
          resolved_at?: string | null;
          resolved_by?: string | null;
        };
        Update: {
          attempts?: number;
          error?: string;
          failed_at?: string;
          id?: string;
          message_id?: number | null;
          payload?: Json;
          queue_name?: string;
          resolved_at?: string | null;
          resolved_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'job_failures_resolved_by_fkey';
            columns: ['resolved_by'];
            isOneToOne: false;
            referencedRelation: 'accounts';
            referencedColumns: ['id'];
          },
        ];
      };
      location_updates: {
        Row: {
          account_id: string;
          booking_id: string;
          id: string;
          latitude: number | null;
          location: unknown;
          longitude: number | null;
          recorded_at: string;
        };
        Insert: {
          account_id: string;
          booking_id: string;
          id?: string;
          latitude?: number | null;
          location: unknown;
          longitude?: number | null;
          recorded_at?: string;
        };
        Update: {
          account_id?: string;
          booking_id?: string;
          id?: string;
          latitude?: number | null;
          location?: unknown;
          longitude?: number | null;
          recorded_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'location_updates_account_id_fkey';
            columns: ['account_id'];
            isOneToOne: false;
            referencedRelation: 'accounts';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'location_updates_booking_id_fkey';
            columns: ['booking_id'];
            isOneToOne: false;
            referencedRelation: 'bookings';
            referencedColumns: ['id'];
          },
        ];
      };
      match_candidates: {
        Row: {
          created_at: string;
          eligible: boolean;
          factors: Json;
          id: string;
          rank: number;
          score: number;
          service_request_id: string;
          worker_id: string;
        };
        Insert: {
          created_at?: string;
          eligible: boolean;
          factors?: Json;
          id?: string;
          rank: number;
          score: number;
          service_request_id: string;
          worker_id: string;
        };
        Update: {
          created_at?: string;
          eligible?: boolean;
          factors?: Json;
          id?: string;
          rank?: number;
          score?: number;
          service_request_id?: string;
          worker_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'match_candidates_service_request_id_fkey';
            columns: ['service_request_id'];
            isOneToOne: false;
            referencedRelation: 'service_requests';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'match_candidates_worker_id_fkey';
            columns: ['worker_id'];
            isOneToOne: false;
            referencedRelation: 'worker_profiles';
            referencedColumns: ['account_id'];
          },
        ];
      };
      message_attachments: {
        Row: {
          byte_size: number | null;
          content_type: string | null;
          id: string;
          kind: string;
          location: Json | null;
          message_id: string;
          storage_path: string | null;
        };
        Insert: {
          byte_size?: number | null;
          content_type?: string | null;
          id?: string;
          kind: string;
          location?: Json | null;
          message_id: string;
          storage_path?: string | null;
        };
        Update: {
          byte_size?: number | null;
          content_type?: string | null;
          id?: string;
          kind?: string;
          location?: Json | null;
          message_id?: string;
          storage_path?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'message_attachments_message_id_fkey';
            columns: ['message_id'];
            isOneToOne: false;
            referencedRelation: 'messages';
            referencedColumns: ['id'];
          },
        ];
      };
      message_translations: {
        Row: {
          created_at: string;
          id: string;
          message_id: string;
          provider: string;
          target_locale: string;
          translated: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          message_id: string;
          provider: string;
          target_locale: string;
          translated: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          message_id?: string;
          provider?: string;
          target_locale?: string;
          translated?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'message_translations_message_id_fkey';
            columns: ['message_id'];
            isOneToOne: false;
            referencedRelation: 'messages';
            referencedColumns: ['id'];
          },
        ];
      };
      messages: {
        Row: {
          body: string | null;
          conversation_id: string;
          created_at: string;
          id: string;
          original_locale: string | null;
          sender_id: string;
        };
        Insert: {
          body?: string | null;
          conversation_id: string;
          created_at?: string;
          id?: string;
          original_locale?: string | null;
          sender_id: string;
        };
        Update: {
          body?: string | null;
          conversation_id?: string;
          created_at?: string;
          id?: string;
          original_locale?: string | null;
          sender_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'messages_conversation_id_fkey';
            columns: ['conversation_id'];
            isOneToOne: false;
            referencedRelation: 'conversations';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'messages_sender_id_fkey';
            columns: ['sender_id'];
            isOneToOne: false;
            referencedRelation: 'accounts';
            referencedColumns: ['id'];
          },
        ];
      };
      notification_deliveries: {
        Row: {
          created_at: string;
          delivered_at: string | null;
          failure_reason: string | null;
          id: string;
          notification_id: string;
          read_at: string | null;
          recipient_id: string;
          status: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          delivered_at?: string | null;
          failure_reason?: string | null;
          id?: string;
          notification_id: string;
          read_at?: string | null;
          recipient_id: string;
          status?: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          delivered_at?: string | null;
          failure_reason?: string | null;
          id?: string;
          notification_id?: string;
          read_at?: string | null;
          recipient_id?: string;
          status?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'notification_deliveries_notification_id_fkey';
            columns: ['notification_id'];
            isOneToOne: false;
            referencedRelation: 'notifications';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'notification_deliveries_recipient_id_fkey';
            columns: ['recipient_id'];
            isOneToOne: false;
            referencedRelation: 'accounts';
            referencedColumns: ['id'];
          },
        ];
      };
      notifications: {
        Row: {
          audience: Database['public']['Enums']['notification_audience'] | null;
          body: string;
          category: string;
          created_at: string;
          id: string;
          read_at: string | null;
          recipient_id: string | null;
          scheduled_at: string | null;
          sent_at: string | null;
          source_key: string | null;
          status: Database['public']['Enums']['notification_status'];
          title: string;
          updated_at: string;
        };
        Insert: {
          audience?: Database['public']['Enums']['notification_audience'] | null;
          body: string;
          category: string;
          created_at?: string;
          id?: string;
          read_at?: string | null;
          recipient_id?: string | null;
          scheduled_at?: string | null;
          sent_at?: string | null;
          source_key?: string | null;
          status?: Database['public']['Enums']['notification_status'];
          title: string;
          updated_at?: string;
        };
        Update: {
          audience?: Database['public']['Enums']['notification_audience'] | null;
          body?: string;
          category?: string;
          created_at?: string;
          id?: string;
          read_at?: string | null;
          recipient_id?: string | null;
          scheduled_at?: string | null;
          sent_at?: string | null;
          source_key?: string | null;
          status?: Database['public']['Enums']['notification_status'];
          title?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'notifications_recipient_id_fkey';
            columns: ['recipient_id'];
            isOneToOne: false;
            referencedRelation: 'accounts';
            referencedColumns: ['id'];
          },
        ];
      };
      payment_attempts: {
        Row: {
          amount_centavos: number;
          completed_at: string | null;
          created_at: string;
          currency: string;
          expires_at: string | null;
          failure_code: string | null;
          failure_reason: string | null;
          id: string;
          idempotency_key: string;
          method: Database['public']['Enums']['payment_method'];
          payment_id: string;
          provider: string;
          provider_intent_id: string | null;
          provider_payment_id: string | null;
          provider_payment_method_id: string | null;
          redirect_url: string | null;
          return_url: string | null;
          status: string;
          updated_at: string;
        };
        Insert: {
          amount_centavos: number;
          completed_at?: string | null;
          created_at?: string;
          currency?: string;
          expires_at?: string | null;
          failure_code?: string | null;
          failure_reason?: string | null;
          id?: string;
          idempotency_key: string;
          method: Database['public']['Enums']['payment_method'];
          payment_id: string;
          provider: string;
          provider_intent_id?: string | null;
          provider_payment_id?: string | null;
          provider_payment_method_id?: string | null;
          redirect_url?: string | null;
          return_url?: string | null;
          status?: string;
          updated_at?: string;
        };
        Update: {
          amount_centavos?: number;
          completed_at?: string | null;
          created_at?: string;
          currency?: string;
          expires_at?: string | null;
          failure_code?: string | null;
          failure_reason?: string | null;
          id?: string;
          idempotency_key?: string;
          method?: Database['public']['Enums']['payment_method'];
          payment_id?: string;
          provider?: string;
          provider_intent_id?: string | null;
          provider_payment_id?: string | null;
          provider_payment_method_id?: string | null;
          redirect_url?: string | null;
          return_url?: string | null;
          status?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'payment_attempts_payment_id_fkey';
            columns: ['payment_id'];
            isOneToOne: false;
            referencedRelation: 'payments';
            referencedColumns: ['id'];
          },
        ];
      };
      payment_provider_events: {
        Row: {
          event_type: string;
          failure_reason: string | null;
          id: string;
          livemode: boolean;
          payload_hash: string;
          processed_at: string | null;
          provider: string;
          provider_event_id: string;
          received_at: string;
          status: string;
        };
        Insert: {
          event_type: string;
          failure_reason?: string | null;
          id?: string;
          livemode: boolean;
          payload_hash: string;
          processed_at?: string | null;
          provider: string;
          provider_event_id: string;
          received_at?: string;
          status?: string;
        };
        Update: {
          event_type?: string;
          failure_reason?: string | null;
          id?: string;
          livemode?: boolean;
          payload_hash?: string;
          processed_at?: string | null;
          provider?: string;
          provider_event_id?: string;
          received_at?: string;
          status?: string;
        };
        Relationships: [];
      };
      payments: {
        Row: {
          booking_id: string;
          commission_amount: number;
          commission_rate: number;
          created_at: string;
          currency: string;
          failure_reason: string | null;
          homeowner_platform_charge: number;
          id: string;
          idempotency_key: string;
          method: Database['public']['Enums']['payment_method'];
          paid_at: string | null;
          provider: string | null;
          provider_payment_id: string | null;
          service_amount: number;
          status: Database['public']['Enums']['payment_status'];
          successful_at: string | null;
          updated_at: string;
          worker_net_amount: number;
        };
        Insert: {
          booking_id: string;
          commission_amount: number;
          commission_rate?: number;
          created_at?: string;
          currency?: string;
          failure_reason?: string | null;
          homeowner_platform_charge?: number;
          id?: string;
          idempotency_key: string;
          method: Database['public']['Enums']['payment_method'];
          paid_at?: string | null;
          provider?: string | null;
          provider_payment_id?: string | null;
          service_amount: number;
          status?: Database['public']['Enums']['payment_status'];
          successful_at?: string | null;
          updated_at?: string;
          worker_net_amount: number;
        };
        Update: {
          booking_id?: string;
          commission_amount?: number;
          commission_rate?: number;
          created_at?: string;
          currency?: string;
          failure_reason?: string | null;
          homeowner_platform_charge?: number;
          id?: string;
          idempotency_key?: string;
          method?: Database['public']['Enums']['payment_method'];
          paid_at?: string | null;
          provider?: string | null;
          provider_payment_id?: string | null;
          service_amount?: number;
          status?: Database['public']['Enums']['payment_status'];
          successful_at?: string | null;
          updated_at?: string;
          worker_net_amount?: number;
        };
        Relationships: [
          {
            foreignKeyName: 'payments_booking_id_fkey';
            columns: ['booking_id'];
            isOneToOne: true;
            referencedRelation: 'bookings';
            referencedColumns: ['id'];
          },
        ];
      };
      payout_destinations: {
        Row: {
          account_name: string;
          account_reference: string;
          created_at: string;
          id: string;
          is_default: boolean;
          kind: string;
          label: string;
          status: string;
          updated_at: string;
          worker_id: string;
        };
        Insert: {
          account_name: string;
          account_reference: string;
          created_at?: string;
          id?: string;
          is_default?: boolean;
          kind: string;
          label: string;
          status?: string;
          updated_at?: string;
          worker_id: string;
        };
        Update: {
          account_name?: string;
          account_reference?: string;
          created_at?: string;
          id?: string;
          is_default?: boolean;
          kind?: string;
          label?: string;
          status?: string;
          updated_at?: string;
          worker_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'payout_destinations_worker_id_fkey';
            columns: ['worker_id'];
            isOneToOne: false;
            referencedRelation: 'worker_profiles';
            referencedColumns: ['account_id'];
          },
        ];
      };
      payout_requests: {
        Row: {
          amount: number;
          created_at: string;
          destination_id: string;
          failure_reason: string | null;
          fee_amount: number;
          id: string;
          idempotency_key: string;
          processed_at: string | null;
          provider: string | null;
          provider_reference: string | null;
          status: string;
          updated_at: string;
          wallet_account_id: string;
        };
        Insert: {
          amount: number;
          created_at?: string;
          destination_id: string;
          failure_reason?: string | null;
          fee_amount?: number;
          id?: string;
          idempotency_key: string;
          processed_at?: string | null;
          provider?: string | null;
          provider_reference?: string | null;
          status?: string;
          updated_at?: string;
          wallet_account_id: string;
        };
        Update: {
          amount?: number;
          created_at?: string;
          destination_id?: string;
          failure_reason?: string | null;
          fee_amount?: number;
          id?: string;
          idempotency_key?: string;
          processed_at?: string | null;
          provider?: string | null;
          provider_reference?: string | null;
          status?: string;
          updated_at?: string;
          wallet_account_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'payout_requests_destination_id_fkey';
            columns: ['destination_id'];
            isOneToOne: false;
            referencedRelation: 'payout_destinations';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'payout_requests_wallet_account_id_fkey';
            columns: ['wallet_account_id'];
            isOneToOne: false;
            referencedRelation: 'wallet_accounts';
            referencedColumns: ['id'];
          },
        ];
      };
      promotion_redemptions: {
        Row: {
          booking_id: string | null;
          discount_amount: number;
          id: string;
          promotion_id: string;
          redeemed_at: string | null;
          released_at: string | null;
          reserved_at: string;
          service_request_id: string | null;
          status: string;
          user_account_id: string;
        };
        Insert: {
          booking_id?: string | null;
          discount_amount: number;
          id?: string;
          promotion_id: string;
          redeemed_at?: string | null;
          released_at?: string | null;
          reserved_at?: string;
          service_request_id?: string | null;
          status?: string;
          user_account_id: string;
        };
        Update: {
          booking_id?: string | null;
          discount_amount?: number;
          id?: string;
          promotion_id?: string;
          redeemed_at?: string | null;
          released_at?: string | null;
          reserved_at?: string;
          service_request_id?: string | null;
          status?: string;
          user_account_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'promotion_redemptions_booking_id_fkey';
            columns: ['booking_id'];
            isOneToOne: false;
            referencedRelation: 'bookings';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'promotion_redemptions_promotion_id_fkey';
            columns: ['promotion_id'];
            isOneToOne: false;
            referencedRelation: 'promotions';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'promotion_redemptions_service_request_id_fkey';
            columns: ['service_request_id'];
            isOneToOne: false;
            referencedRelation: 'service_requests';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'promotion_redemptions_user_account_id_fkey';
            columns: ['user_account_id'];
            isOneToOne: false;
            referencedRelation: 'user_profiles';
            referencedColumns: ['account_id'];
          },
        ];
      };
      promotions: {
        Row: {
          code: string;
          created_at: string;
          created_by: string;
          description: string;
          discount_type: string;
          discount_value: number;
          ends_at: string;
          id: string;
          maximum_discount: number | null;
          minimum_spend: number;
          name: string;
          per_user_limit: number;
          starts_at: string;
          status: string;
          total_limit: number | null;
          updated_at: string;
        };
        Insert: {
          code: string;
          created_at?: string;
          created_by: string;
          description: string;
          discount_type: string;
          discount_value: number;
          ends_at: string;
          id?: string;
          maximum_discount?: number | null;
          minimum_spend?: number;
          name: string;
          per_user_limit?: number;
          starts_at: string;
          status?: string;
          total_limit?: number | null;
          updated_at?: string;
        };
        Update: {
          code?: string;
          created_at?: string;
          created_by?: string;
          description?: string;
          discount_type?: string;
          discount_value?: number;
          ends_at?: string;
          id?: string;
          maximum_discount?: number | null;
          minimum_spend?: number;
          name?: string;
          per_user_limit?: number;
          starts_at?: string;
          status?: string;
          total_limit?: number | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'promotions_created_by_fkey';
            columns: ['created_by'];
            isOneToOne: false;
            referencedRelation: 'admin_profiles';
            referencedColumns: ['account_id'];
          },
        ];
      };
      push_delivery_attempts: {
        Row: {
          attempted_at: string;
          failure_reason: string | null;
          id: string;
          notification_id: string;
          provider_reference: string | null;
          status: string;
          subscription_id: string;
        };
        Insert: {
          attempted_at?: string;
          failure_reason?: string | null;
          id?: string;
          notification_id: string;
          provider_reference?: string | null;
          status: string;
          subscription_id: string;
        };
        Update: {
          attempted_at?: string;
          failure_reason?: string | null;
          id?: string;
          notification_id?: string;
          provider_reference?: string | null;
          status?: string;
          subscription_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'push_delivery_attempts_notification_id_fkey';
            columns: ['notification_id'];
            isOneToOne: false;
            referencedRelation: 'notifications';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'push_delivery_attempts_subscription_id_fkey';
            columns: ['subscription_id'];
            isOneToOne: false;
            referencedRelation: 'push_subscriptions';
            referencedColumns: ['id'];
          },
        ];
      };
      push_subscriptions: {
        Row: {
          account_id: string;
          created_at: string;
          device_key: string;
          enabled: boolean;
          expo_push_token: string;
          id: string;
          invalidated_at: string | null;
          last_seen_at: string;
          platform: string;
          updated_at: string;
        };
        Insert: {
          account_id: string;
          created_at?: string;
          device_key: string;
          enabled?: boolean;
          expo_push_token: string;
          id?: string;
          invalidated_at?: string | null;
          last_seen_at?: string;
          platform: string;
          updated_at?: string;
        };
        Update: {
          account_id?: string;
          created_at?: string;
          device_key?: string;
          enabled?: boolean;
          expo_push_token?: string;
          id?: string;
          invalidated_at?: string | null;
          last_seen_at?: string;
          platform?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'push_subscriptions_account_id_fkey';
            columns: ['account_id'];
            isOneToOne: false;
            referencedRelation: 'accounts';
            referencedColumns: ['id'];
          },
        ];
      };
      receipts: {
        Row: {
          commission_amount: number;
          commission_rate: number;
          homeowner_platform_charge: number;
          id: string;
          issued_at: string;
          payment_id: string;
          receipt_number: string;
          service_amount: number;
          worker_net_amount: number;
        };
        Insert: {
          commission_amount: number;
          commission_rate: number;
          homeowner_platform_charge: number;
          id?: string;
          issued_at?: string;
          payment_id: string;
          receipt_number: string;
          service_amount: number;
          worker_net_amount: number;
        };
        Update: {
          commission_amount?: number;
          commission_rate?: number;
          homeowner_platform_charge?: number;
          id?: string;
          issued_at?: string;
          payment_id?: string;
          receipt_number?: string;
          service_amount?: number;
          worker_net_amount?: number;
        };
        Relationships: [
          {
            foreignKeyName: 'receipts_payment_id_fkey';
            columns: ['payment_id'];
            isOneToOne: true;
            referencedRelation: 'payments';
            referencedColumns: ['id'];
          },
        ];
      };
      refunds: {
        Row: {
          created_at: string;
          decided_at: string | null;
          decided_by: string | null;
          id: string;
          payment_id: string;
          reason: string;
          status: Database['public']['Enums']['refund_status'];
        };
        Insert: {
          created_at?: string;
          decided_at?: string | null;
          decided_by?: string | null;
          id?: string;
          payment_id: string;
          reason: string;
          status?: Database['public']['Enums']['refund_status'];
        };
        Update: {
          created_at?: string;
          decided_at?: string | null;
          decided_by?: string | null;
          id?: string;
          payment_id?: string;
          reason?: string;
          status?: Database['public']['Enums']['refund_status'];
        };
        Relationships: [
          {
            foreignKeyName: 'refunds_decided_by_fkey';
            columns: ['decided_by'];
            isOneToOne: false;
            referencedRelation: 'accounts';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'refunds_payment_id_fkey';
            columns: ['payment_id'];
            isOneToOne: true;
            referencedRelation: 'payments';
            referencedColumns: ['id'];
          },
        ];
      };
      report_exports: {
        Row: {
          completed_at: string | null;
          created_at: string;
          failure_reason: string | null;
          filters: Json;
          format: string;
          id: string;
          parameters: Json;
          report_type: string;
          requested_by: string;
          status: string;
          storage_path: string | null;
        };
        Insert: {
          completed_at?: string | null;
          created_at?: string;
          failure_reason?: string | null;
          filters?: Json;
          format?: string;
          id?: string;
          parameters?: Json;
          report_type: string;
          requested_by: string;
          status: string;
          storage_path?: string | null;
        };
        Update: {
          completed_at?: string | null;
          created_at?: string;
          failure_reason?: string | null;
          filters?: Json;
          format?: string;
          id?: string;
          parameters?: Json;
          report_type?: string;
          requested_by?: string;
          status?: string;
          storage_path?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'report_exports_requested_by_fkey';
            columns: ['requested_by'];
            isOneToOne: false;
            referencedRelation: 'accounts';
            referencedColumns: ['id'];
          },
        ];
      };
      request_media: {
        Row: {
          byte_size: number;
          content_type: string;
          created_at: string;
          id: string;
          service_request_id: string;
          storage_path: string;
        };
        Insert: {
          byte_size: number;
          content_type: string;
          created_at?: string;
          id?: string;
          service_request_id: string;
          storage_path: string;
        };
        Update: {
          byte_size?: number;
          content_type?: string;
          created_at?: string;
          id?: string;
          service_request_id?: string;
          storage_path?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'request_media_service_request_id_fkey';
            columns: ['service_request_id'];
            isOneToOne: false;
            referencedRelation: 'service_requests';
            referencedColumns: ['id'];
          },
        ];
      };
      review_media: {
        Row: {
          byte_size: number;
          content_type: string;
          id: string;
          review_id: string;
          storage_path: string;
        };
        Insert: {
          byte_size: number;
          content_type: string;
          id?: string;
          review_id: string;
          storage_path: string;
        };
        Update: {
          byte_size?: number;
          content_type?: string;
          id?: string;
          review_id?: string;
          storage_path?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'review_media_review_id_fkey';
            columns: ['review_id'];
            isOneToOne: false;
            referencedRelation: 'reviews';
            referencedColumns: ['id'];
          },
        ];
      };
      reviews: {
        Row: {
          body: string;
          booking_id: string;
          created_at: string;
          id: string;
          moderated_at: string | null;
          moderated_by: string | null;
          moderation_status: Database['public']['Enums']['review_moderation_status'];
          recommend_worker: boolean;
          stars: number;
          updated_at: string;
          user_account_id: string;
          worker_account_id: string;
        };
        Insert: {
          body: string;
          booking_id: string;
          created_at?: string;
          id?: string;
          moderated_at?: string | null;
          moderated_by?: string | null;
          moderation_status?: Database['public']['Enums']['review_moderation_status'];
          recommend_worker: boolean;
          stars: number;
          updated_at?: string;
          user_account_id: string;
          worker_account_id: string;
        };
        Update: {
          body?: string;
          booking_id?: string;
          created_at?: string;
          id?: string;
          moderated_at?: string | null;
          moderated_by?: string | null;
          moderation_status?: Database['public']['Enums']['review_moderation_status'];
          recommend_worker?: boolean;
          stars?: number;
          updated_at?: string;
          user_account_id?: string;
          worker_account_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'reviews_booking_id_fkey';
            columns: ['booking_id'];
            isOneToOne: true;
            referencedRelation: 'bookings';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'reviews_moderated_by_fkey';
            columns: ['moderated_by'];
            isOneToOne: false;
            referencedRelation: 'accounts';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'reviews_user_account_id_fkey';
            columns: ['user_account_id'];
            isOneToOne: false;
            referencedRelation: 'user_profiles';
            referencedColumns: ['account_id'];
          },
          {
            foreignKeyName: 'reviews_worker_account_id_fkey';
            columns: ['worker_account_id'];
            isOneToOne: false;
            referencedRelation: 'worker_profiles';
            referencedColumns: ['account_id'];
          },
        ];
      };
      route_snapshots: {
        Row: {
          booking_id: string;
          created_at: string;
          destination: unknown;
          distance_meters: number;
          duration_seconds: number;
          id: string;
          requested_by: string;
          route_geojson: Json;
          worker_location: unknown;
        };
        Insert: {
          booking_id: string;
          created_at?: string;
          destination: unknown;
          distance_meters: number;
          duration_seconds: number;
          id?: string;
          requested_by: string;
          route_geojson: Json;
          worker_location: unknown;
        };
        Update: {
          booking_id?: string;
          created_at?: string;
          destination?: unknown;
          distance_meters?: number;
          duration_seconds?: number;
          id?: string;
          requested_by?: string;
          route_geojson?: Json;
          worker_location?: unknown;
        };
        Relationships: [
          {
            foreignKeyName: 'route_snapshots_booking_id_fkey';
            columns: ['booking_id'];
            isOneToOne: false;
            referencedRelation: 'bookings';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'route_snapshots_requested_by_fkey';
            columns: ['requested_by'];
            isOneToOne: false;
            referencedRelation: 'accounts';
            referencedColumns: ['id'];
          },
        ];
      };
      service_categories: {
        Row: {
          created_at: string;
          description: string | null;
          id: string;
          industry_id: string | null;
          is_active: boolean;
          is_safety_critical: boolean;
          maximum_price_minor: number | null;
          minimum_price_minor: number | null;
          name: string;
          slug: string | null;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          description?: string | null;
          id?: string;
          industry_id?: string | null;
          is_active?: boolean;
          is_safety_critical?: boolean;
          maximum_price_minor?: number | null;
          minimum_price_minor?: number | null;
          name: string;
          slug?: string | null;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          description?: string | null;
          id?: string;
          industry_id?: string | null;
          is_active?: boolean;
          is_safety_critical?: boolean;
          maximum_price_minor?: number | null;
          minimum_price_minor?: number | null;
          name?: string;
          slug?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'service_categories_industry_id_fkey';
            columns: ['industry_id'];
            isOneToOne: false;
            referencedRelation: 'industries';
            referencedColumns: ['id'];
          },
        ];
      };
      service_request_offers: {
        Row: {
          amount: number;
          created_at: string;
          estimated_minutes: number | null;
          expires_at: string | null;
          id: string;
          message: string;
          responded_at: string | null;
          service_request_id: string;
          status: string;
          updated_at: string;
          worker_id: string;
        };
        Insert: {
          amount: number;
          created_at?: string;
          estimated_minutes?: number | null;
          expires_at?: string | null;
          id?: string;
          message: string;
          responded_at?: string | null;
          service_request_id: string;
          status?: string;
          updated_at?: string;
          worker_id: string;
        };
        Update: {
          amount?: number;
          created_at?: string;
          estimated_minutes?: number | null;
          expires_at?: string | null;
          id?: string;
          message?: string;
          responded_at?: string | null;
          service_request_id?: string;
          status?: string;
          updated_at?: string;
          worker_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'service_request_offers_service_request_id_fkey';
            columns: ['service_request_id'];
            isOneToOne: false;
            referencedRelation: 'service_requests';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'service_request_offers_worker_id_fkey';
            columns: ['worker_id'];
            isOneToOne: false;
            referencedRelation: 'worker_profiles';
            referencedColumns: ['account_id'];
          },
        ];
      };
      service_requests: {
        Row: {
          address_id: string;
          address_snapshot: Json | null;
          ai_analysis_id: string | null;
          budget: number;
          category_id: string;
          created_at: string;
          description: string;
          id: string;
          notes: string | null;
          notify_on_match: boolean;
          scheduled_at: string;
          selected_worker_id: string | null;
          service_location: unknown;
          status: Database['public']['Enums']['request_status'];
          updated_at: string;
          user_account_id: string;
        };
        Insert: {
          address_id: string;
          address_snapshot?: Json | null;
          ai_analysis_id?: string | null;
          budget: number;
          category_id: string;
          created_at?: string;
          description: string;
          id?: string;
          notes?: string | null;
          notify_on_match?: boolean;
          scheduled_at: string;
          selected_worker_id?: string | null;
          service_location: unknown;
          status?: Database['public']['Enums']['request_status'];
          updated_at?: string;
          user_account_id: string;
        };
        Update: {
          address_id?: string;
          address_snapshot?: Json | null;
          ai_analysis_id?: string | null;
          budget?: number;
          category_id?: string;
          created_at?: string;
          description?: string;
          id?: string;
          notes?: string | null;
          notify_on_match?: boolean;
          scheduled_at?: string;
          selected_worker_id?: string | null;
          service_location?: unknown;
          status?: Database['public']['Enums']['request_status'];
          updated_at?: string;
          user_account_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'service_requests_address_id_fkey';
            columns: ['address_id'];
            isOneToOne: false;
            referencedRelation: 'addresses';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'service_requests_ai_analysis_id_fkey';
            columns: ['ai_analysis_id'];
            isOneToOne: true;
            referencedRelation: 'ai_analyses';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'service_requests_category_id_fkey';
            columns: ['category_id'];
            isOneToOne: false;
            referencedRelation: 'service_categories';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'service_requests_selected_worker_id_fkey';
            columns: ['selected_worker_id'];
            isOneToOne: false;
            referencedRelation: 'worker_profiles';
            referencedColumns: ['account_id'];
          },
          {
            foreignKeyName: 'service_requests_user_account_id_fkey';
            columns: ['user_account_id'];
            isOneToOne: false;
            referencedRelation: 'user_profiles';
            referencedColumns: ['account_id'];
          },
        ];
      };
      service_templates: {
        Row: {
          archived_at: string | null;
          base_price: number;
          category_id: string;
          created_at: string;
          description: string | null;
          estimated_duration_minutes: number;
          id: string;
          is_active: boolean;
          name: string;
          updated_at: string;
        };
        Insert: {
          archived_at?: string | null;
          base_price: number;
          category_id: string;
          created_at?: string;
          description?: string | null;
          estimated_duration_minutes: number;
          id?: string;
          is_active?: boolean;
          name: string;
          updated_at?: string;
        };
        Update: {
          archived_at?: string | null;
          base_price?: number;
          category_id?: string;
          created_at?: string;
          description?: string | null;
          estimated_duration_minutes?: number;
          id?: string;
          is_active?: boolean;
          name?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'service_templates_category_id_fkey';
            columns: ['category_id'];
            isOneToOne: false;
            referencedRelation: 'service_categories';
            referencedColumns: ['id'];
          },
        ];
      };
      support_message_attachments: {
        Row: {
          byte_size: number;
          content_type: string;
          created_at: string;
          id: string;
          storage_path: string;
          support_message_id: string;
        };
        Insert: {
          byte_size: number;
          content_type: string;
          created_at?: string;
          id?: string;
          storage_path: string;
          support_message_id: string;
        };
        Update: {
          byte_size?: number;
          content_type?: string;
          created_at?: string;
          id?: string;
          storage_path?: string;
          support_message_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'support_message_attachments_support_message_id_fkey';
            columns: ['support_message_id'];
            isOneToOne: false;
            referencedRelation: 'support_ticket_messages';
            referencedColumns: ['id'];
          },
        ];
      };
      support_ticket_messages: {
        Row: {
          body: string;
          created_at: string;
          id: string;
          is_internal: boolean;
          sender_id: string;
          ticket_id: string;
        };
        Insert: {
          body: string;
          created_at?: string;
          id?: string;
          is_internal?: boolean;
          sender_id: string;
          ticket_id: string;
        };
        Update: {
          body?: string;
          created_at?: string;
          id?: string;
          is_internal?: boolean;
          sender_id?: string;
          ticket_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'support_ticket_messages_sender_id_fkey';
            columns: ['sender_id'];
            isOneToOne: false;
            referencedRelation: 'accounts';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'support_ticket_messages_ticket_id_fkey';
            columns: ['ticket_id'];
            isOneToOne: false;
            referencedRelation: 'support_tickets';
            referencedColumns: ['id'];
          },
        ];
      };
      support_tickets: {
        Row: {
          assigned_admin_id: string | null;
          booking_id: string | null;
          category: string;
          closed_at: string | null;
          created_at: string;
          description: string;
          escalated_at: string | null;
          id: string;
          last_message_at: string | null;
          owner_id: string;
          priority: string;
          resolution: string | null;
          resolved_at: string | null;
          status: Database['public']['Enums']['ticket_status'];
          subject: string;
          updated_at: string;
        };
        Insert: {
          assigned_admin_id?: string | null;
          booking_id?: string | null;
          category?: string;
          closed_at?: string | null;
          created_at?: string;
          description: string;
          escalated_at?: string | null;
          id?: string;
          last_message_at?: string | null;
          owner_id: string;
          priority?: string;
          resolution?: string | null;
          resolved_at?: string | null;
          status?: Database['public']['Enums']['ticket_status'];
          subject: string;
          updated_at?: string;
        };
        Update: {
          assigned_admin_id?: string | null;
          booking_id?: string | null;
          category?: string;
          closed_at?: string | null;
          created_at?: string;
          description?: string;
          escalated_at?: string | null;
          id?: string;
          last_message_at?: string | null;
          owner_id?: string;
          priority?: string;
          resolution?: string | null;
          resolved_at?: string | null;
          status?: Database['public']['Enums']['ticket_status'];
          subject?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'support_tickets_assigned_admin_id_fkey';
            columns: ['assigned_admin_id'];
            isOneToOne: false;
            referencedRelation: 'admin_profiles';
            referencedColumns: ['account_id'];
          },
          {
            foreignKeyName: 'support_tickets_booking_id_fkey';
            columns: ['booking_id'];
            isOneToOne: false;
            referencedRelation: 'bookings';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'support_tickets_owner_id_fkey';
            columns: ['owner_id'];
            isOneToOne: false;
            referencedRelation: 'accounts';
            referencedColumns: ['id'];
          },
        ];
      };
      system_settings: {
        Row: {
          key: string;
          updated_at: string;
          updated_by: string | null;
          value: Json;
        };
        Insert: {
          key: string;
          updated_at?: string;
          updated_by?: string | null;
          value: Json;
        };
        Update: {
          key?: string;
          updated_at?: string;
          updated_by?: string | null;
          value?: Json;
        };
        Relationships: [
          {
            foreignKeyName: 'system_settings_updated_by_fkey';
            columns: ['updated_by'];
            isOneToOne: false;
            referencedRelation: 'accounts';
            referencedColumns: ['id'];
          },
        ];
      };
      trash_entries: {
        Row: {
          deleted_at: string;
          deleted_by: string;
          entity_id: string;
          entity_type: string;
          id: string;
          restored_at: string | null;
          restored_by: string | null;
          snapshot: Json;
        };
        Insert: {
          deleted_at?: string;
          deleted_by: string;
          entity_id: string;
          entity_type: string;
          id?: string;
          restored_at?: string | null;
          restored_by?: string | null;
          snapshot: Json;
        };
        Update: {
          deleted_at?: string;
          deleted_by?: string;
          entity_id?: string;
          entity_type?: string;
          id?: string;
          restored_at?: string | null;
          restored_by?: string | null;
          snapshot?: Json;
        };
        Relationships: [
          {
            foreignKeyName: 'trash_entries_deleted_by_fkey';
            columns: ['deleted_by'];
            isOneToOne: false;
            referencedRelation: 'accounts';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'trash_entries_restored_by_fkey';
            columns: ['restored_by'];
            isOneToOne: false;
            referencedRelation: 'accounts';
            referencedColumns: ['id'];
          },
        ];
      };
      user_profiles: {
        Row: {
          account_id: string;
          avatar_path: string | null;
          created_at: string;
          display_name: string;
          notification_preferences: Json;
          updated_at: string;
        };
        Insert: {
          account_id: string;
          avatar_path?: string | null;
          created_at?: string;
          display_name: string;
          notification_preferences?: Json;
          updated_at?: string;
        };
        Update: {
          account_id?: string;
          avatar_path?: string | null;
          created_at?: string;
          display_name?: string;
          notification_preferences?: Json;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'user_profiles_account_id_fkey';
            columns: ['account_id'];
            isOneToOne: true;
            referencedRelation: 'accounts';
            referencedColumns: ['id'];
          },
        ];
      };
      wallet_accounts: {
        Row: {
          account_id: string;
          created_at: string;
          currency: string;
          id: string;
          status: string;
          updated_at: string;
        };
        Insert: {
          account_id: string;
          created_at?: string;
          currency?: string;
          id?: string;
          status?: string;
          updated_at?: string;
        };
        Update: {
          account_id?: string;
          created_at?: string;
          currency?: string;
          id?: string;
          status?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'wallet_accounts_account_id_fkey';
            columns: ['account_id'];
            isOneToOne: true;
            referencedRelation: 'worker_profiles';
            referencedColumns: ['account_id'];
          },
        ];
      };
      wallet_topups: {
        Row: {
          amount_centavos: number;
          channel: string | null;
          completed_at: string | null;
          created_at: string;
          currency: string;
          expires_at: string | null;
          failure_reason: string | null;
          id: string;
          idempotency_key: string;
          proof_path: string | null;
          provider: string;
          provider_intent_id: string | null;
          provider_payment_id: string | null;
          provider_payment_method_id: string | null;
          redirect_url: string | null;
          reference_number: string | null;
          return_url: string | null;
          review_notes: string | null;
          reviewed_at: string | null;
          reviewed_by: string | null;
          status: string;
          submitted_at: string | null;
          updated_at: string;
          wallet_account_id: string;
        };
        Insert: {
          amount_centavos: number;
          channel?: string | null;
          completed_at?: string | null;
          created_at?: string;
          currency?: string;
          expires_at?: string | null;
          failure_reason?: string | null;
          id?: string;
          idempotency_key: string;
          proof_path?: string | null;
          provider?: string;
          provider_intent_id?: string | null;
          provider_payment_id?: string | null;
          provider_payment_method_id?: string | null;
          redirect_url?: string | null;
          reference_number?: string | null;
          return_url?: string | null;
          review_notes?: string | null;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          status?: string;
          submitted_at?: string | null;
          updated_at?: string;
          wallet_account_id: string;
        };
        Update: {
          amount_centavos?: number;
          channel?: string | null;
          completed_at?: string | null;
          created_at?: string;
          currency?: string;
          expires_at?: string | null;
          failure_reason?: string | null;
          id?: string;
          idempotency_key?: string;
          proof_path?: string | null;
          provider?: string;
          provider_intent_id?: string | null;
          provider_payment_id?: string | null;
          provider_payment_method_id?: string | null;
          redirect_url?: string | null;
          reference_number?: string | null;
          return_url?: string | null;
          review_notes?: string | null;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          status?: string;
          submitted_at?: string | null;
          updated_at?: string;
          wallet_account_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'wallet_topups_reviewed_by_fkey';
            columns: ['reviewed_by'];
            isOneToOne: false;
            referencedRelation: 'admin_profiles';
            referencedColumns: ['account_id'];
          },
          {
            foreignKeyName: 'wallet_topups_wallet_account_id_fkey';
            columns: ['wallet_account_id'];
            isOneToOne: false;
            referencedRelation: 'wallet_accounts';
            referencedColumns: ['id'];
          },
        ];
      };
      wallet_transactions: {
        Row: {
          amount: number;
          available_at: string | null;
          created_at: string;
          description: string;
          id: string;
          kind: string;
          source_id: string;
          source_type: string;
          status: string;
          updated_at: string;
          wallet_account_id: string;
        };
        Insert: {
          amount: number;
          available_at?: string | null;
          created_at?: string;
          description: string;
          id?: string;
          kind: string;
          source_id: string;
          source_type: string;
          status: string;
          updated_at?: string;
          wallet_account_id: string;
        };
        Update: {
          amount?: number;
          available_at?: string | null;
          created_at?: string;
          description?: string;
          id?: string;
          kind?: string;
          source_id?: string;
          source_type?: string;
          status?: string;
          updated_at?: string;
          wallet_account_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'wallet_transactions_wallet_account_id_fkey';
            columns: ['wallet_account_id'];
            isOneToOne: false;
            referencedRelation: 'wallet_accounts';
            referencedColumns: ['id'];
          },
        ];
      };
      worker_availability: {
        Row: {
          day_of_week: number;
          end_time: string;
          id: string;
          start_time: string;
          timezone: string;
          worker_id: string;
        };
        Insert: {
          day_of_week: number;
          end_time: string;
          id?: string;
          start_time: string;
          timezone?: string;
          worker_id: string;
        };
        Update: {
          day_of_week?: number;
          end_time?: string;
          id?: string;
          start_time?: string;
          timezone?: string;
          worker_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'worker_availability_worker_id_fkey';
            columns: ['worker_id'];
            isOneToOne: false;
            referencedRelation: 'worker_profiles';
            referencedColumns: ['account_id'];
          },
        ];
      };
      worker_portfolio_items: {
        Row: {
          category_id: string | null;
          completed_on: string | null;
          created_at: string;
          description: string;
          id: string;
          is_published: boolean;
          sort_order: number;
          title: string;
          updated_at: string;
          worker_id: string;
        };
        Insert: {
          category_id?: string | null;
          completed_on?: string | null;
          created_at?: string;
          description: string;
          id?: string;
          is_published?: boolean;
          sort_order?: number;
          title: string;
          updated_at?: string;
          worker_id: string;
        };
        Update: {
          category_id?: string | null;
          completed_on?: string | null;
          created_at?: string;
          description?: string;
          id?: string;
          is_published?: boolean;
          sort_order?: number;
          title?: string;
          updated_at?: string;
          worker_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'worker_portfolio_items_category_id_fkey';
            columns: ['category_id'];
            isOneToOne: false;
            referencedRelation: 'service_categories';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'worker_portfolio_items_worker_id_fkey';
            columns: ['worker_id'];
            isOneToOne: false;
            referencedRelation: 'worker_profiles';
            referencedColumns: ['account_id'];
          },
        ];
      };
      worker_portfolio_media: {
        Row: {
          byte_size: number;
          content_type: string;
          created_at: string;
          id: string;
          portfolio_item_id: string;
          sort_order: number;
          storage_path: string;
        };
        Insert: {
          byte_size: number;
          content_type: string;
          created_at?: string;
          id?: string;
          portfolio_item_id: string;
          sort_order?: number;
          storage_path: string;
        };
        Update: {
          byte_size?: number;
          content_type?: string;
          created_at?: string;
          id?: string;
          portfolio_item_id?: string;
          sort_order?: number;
          storage_path?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'worker_portfolio_media_portfolio_item_id_fkey';
            columns: ['portfolio_item_id'];
            isOneToOne: false;
            referencedRelation: 'worker_portfolio_items';
            referencedColumns: ['id'];
          },
        ];
      };
      worker_profiles: {
        Row: {
          account_id: string;
          approval_status: Database['public']['Enums']['worker_approval_status'];
          approved_at: string | null;
          avatar_path: string | null;
          bio: string | null;
          created_at: string;
          display_name: string;
          experience: string | null;
          is_available: boolean;
          latitude: number | null;
          longitude: number | null;
          primary_industry_id: string | null;
          recommendation_priority: boolean;
          service_area: string | null;
          service_origin: unknown;
          service_radius_meters: number | null;
          updated_at: string;
        };
        Insert: {
          account_id: string;
          approval_status?: Database['public']['Enums']['worker_approval_status'];
          approved_at?: string | null;
          avatar_path?: string | null;
          bio?: string | null;
          created_at?: string;
          display_name: string;
          experience?: string | null;
          is_available?: boolean;
          latitude?: number | null;
          longitude?: number | null;
          primary_industry_id?: string | null;
          recommendation_priority?: boolean;
          service_area?: string | null;
          service_origin?: unknown;
          service_radius_meters?: number | null;
          updated_at?: string;
        };
        Update: {
          account_id?: string;
          approval_status?: Database['public']['Enums']['worker_approval_status'];
          approved_at?: string | null;
          avatar_path?: string | null;
          bio?: string | null;
          created_at?: string;
          display_name?: string;
          experience?: string | null;
          is_available?: boolean;
          latitude?: number | null;
          longitude?: number | null;
          primary_industry_id?: string | null;
          recommendation_priority?: boolean;
          service_area?: string | null;
          service_origin?: unknown;
          service_radius_meters?: number | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'worker_profiles_account_id_fkey';
            columns: ['account_id'];
            isOneToOne: true;
            referencedRelation: 'accounts';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'worker_profiles_primary_industry_id_fkey';
            columns: ['primary_industry_id'];
            isOneToOne: false;
            referencedRelation: 'industries';
            referencedColumns: ['id'];
          },
        ];
      };
      worker_skills: {
        Row: {
          category_id: string;
          worker_id: string;
          years: number;
        };
        Insert: {
          category_id: string;
          worker_id: string;
          years?: number;
        };
        Update: {
          category_id?: string;
          worker_id?: string;
          years?: number;
        };
        Relationships: [
          {
            foreignKeyName: 'worker_skills_category_id_fkey';
            columns: ['category_id'];
            isOneToOne: false;
            referencedRelation: 'service_categories';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'worker_skills_worker_id_fkey';
            columns: ['worker_id'];
            isOneToOne: false;
            referencedRelation: 'worker_profiles';
            referencedColumns: ['account_id'];
          },
        ];
      };
      worker_verification_documents: {
        Row: {
          byte_size: number;
          content_type: string;
          document_type: string;
          id: string;
          review_notes: string | null;
          reviewed_at: string | null;
          reviewer_id: string | null;
          revision: number;
          status: string;
          storage_path: string;
          submitted_at: string;
          verification_id: string;
          worker_id: string;
        };
        Insert: {
          byte_size: number;
          content_type: string;
          document_type: string;
          id?: string;
          review_notes?: string | null;
          reviewed_at?: string | null;
          reviewer_id?: string | null;
          revision?: number;
          status?: string;
          storage_path: string;
          submitted_at?: string;
          verification_id: string;
          worker_id: string;
        };
        Update: {
          byte_size?: number;
          content_type?: string;
          document_type?: string;
          id?: string;
          review_notes?: string | null;
          reviewed_at?: string | null;
          reviewer_id?: string | null;
          revision?: number;
          status?: string;
          storage_path?: string;
          submitted_at?: string;
          verification_id?: string;
          worker_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'worker_verification_documents_reviewer_id_fkey';
            columns: ['reviewer_id'];
            isOneToOne: false;
            referencedRelation: 'admin_profiles';
            referencedColumns: ['account_id'];
          },
          {
            foreignKeyName: 'worker_verification_documents_verification_id_fkey';
            columns: ['verification_id'];
            isOneToOne: false;
            referencedRelation: 'worker_verifications';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'worker_verification_documents_worker_id_fkey';
            columns: ['worker_id'];
            isOneToOne: false;
            referencedRelation: 'worker_profiles';
            referencedColumns: ['account_id'];
          },
        ];
      };
      worker_verifications: {
        Row: {
          created_at: string;
          document_paths: string[];
          id: string;
          identity_data: Json;
          requested_notes: string | null;
          reviewed_at: string | null;
          reviewed_by: string | null;
          status: Database['public']['Enums']['worker_approval_status'];
          updated_at: string;
          worker_id: string;
        };
        Insert: {
          created_at?: string;
          document_paths?: string[];
          id?: string;
          identity_data?: Json;
          requested_notes?: string | null;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          status?: Database['public']['Enums']['worker_approval_status'];
          updated_at?: string;
          worker_id: string;
        };
        Update: {
          created_at?: string;
          document_paths?: string[];
          id?: string;
          identity_data?: Json;
          requested_notes?: string | null;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          status?: Database['public']['Enums']['worker_approval_status'];
          updated_at?: string;
          worker_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'worker_verifications_reviewed_by_fkey';
            columns: ['reviewed_by'];
            isOneToOne: false;
            referencedRelation: 'accounts';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'worker_verifications_worker_id_fkey';
            columns: ['worker_id'];
            isOneToOne: true;
            referencedRelation: 'worker_profiles';
            referencedColumns: ['account_id'];
          },
        ];
      };
    };
    Views: {
      services: {
        Row: {
          category_id: string | null;
          created_at: string | null;
          description: string | null;
          estimated_duration_minutes: number | null;
          id: string | null;
          is_active: boolean | null;
          is_safety_critical: boolean | null;
          maximum_price_minor: number | null;
          minimum_price_minor: number | null;
          name: string | null;
          updated_at: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'service_templates_category_id_fkey';
            columns: ['category_id'];
            isOneToOne: false;
            referencedRelation: 'service_categories';
            referencedColumns: ['id'];
          },
        ];
      };
    };
    Functions: {
      accept_service_offer: {
        Args: { p_offer_id: string };
        Returns: {
          accepted_at: string | null;
          accepted_offer_id: string | null;
          agreed_service_amount: number;
          cancelled_at: string | null;
          completed_at: string | null;
          created_at: string;
          currency: string;
          id: string;
          response_due_at: string;
          service_request_id: string;
          status: Database['public']['Enums']['booking_status'];
          updated_at: string;
          user_account_id: string;
          version: number;
          worker_account_id: string;
        };
        SetofOptions: {
          from: '*';
          to: 'bookings';
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      admin_archive_notification: {
        Args: { p_notification_id: string };
        Returns: {
          deleted_at: string;
          deleted_by: string;
          entity_id: string;
          entity_type: string;
          id: string;
          restored_at: string | null;
          restored_by: string | null;
          snapshot: Json;
        };
        SetofOptions: {
          from: '*';
          to: 'trash_entries';
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      admin_archive_service_template: {
        Args: { p_template_id: string };
        Returns: {
          deleted_at: string;
          deleted_by: string;
          entity_id: string;
          entity_type: string;
          id: string;
          restored_at: string | null;
          restored_by: string | null;
          snapshot: Json;
        };
        SetofOptions: {
          from: '*';
          to: 'trash_entries';
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      admin_bootstrap_status: { Args: { email: string }; Returns: Json };
      admin_create_notification: {
        Args: {
          p_audience: Database['public']['Enums']['notification_audience'];
          p_body: string;
          p_category: string;
          p_scheduled_at?: string;
          p_title: string;
        };
        Returns: {
          audience: Database['public']['Enums']['notification_audience'] | null;
          body: string;
          category: string;
          created_at: string;
          id: string;
          read_at: string | null;
          recipient_id: string | null;
          scheduled_at: string | null;
          sent_at: string | null;
          source_key: string | null;
          status: Database['public']['Enums']['notification_status'];
          title: string;
          updated_at: string;
        };
        SetofOptions: {
          from: '*';
          to: 'notifications';
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      admin_create_notification_draft: {
        Args: {
          p_audience: Database['public']['Enums']['notification_audience'];
          p_body: string;
          p_category?: string;
          p_title: string;
        };
        Returns: {
          audience: Database['public']['Enums']['notification_audience'] | null;
          body: string;
          category: string;
          created_at: string;
          id: string;
          read_at: string | null;
          recipient_id: string | null;
          scheduled_at: string | null;
          sent_at: string | null;
          source_key: string | null;
          status: Database['public']['Enums']['notification_status'];
          title: string;
          updated_at: string;
        };
        SetofOptions: {
          from: '*';
          to: 'notifications';
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      admin_dashboard_metrics: { Args: never; Returns: Json };
      admin_decide_payout: {
        Args: {
          p_decision: string;
          p_payout_id: string;
          p_provider_reference?: string;
          p_reason?: string;
        };
        Returns: {
          amount: number;
          created_at: string;
          destination_id: string;
          failure_reason: string | null;
          fee_amount: number;
          id: string;
          idempotency_key: string;
          processed_at: string | null;
          provider: string | null;
          provider_reference: string | null;
          status: string;
          updated_at: string;
          wallet_account_id: string;
        };
        SetofOptions: {
          from: '*';
          to: 'payout_requests';
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      admin_delete_account: {
        Args: { p_account_id: string; p_confirmation_email: string };
        Returns: undefined;
      };
      admin_duplicate_notification: {
        Args: { p_notification_id: string };
        Returns: {
          audience: Database['public']['Enums']['notification_audience'] | null;
          body: string;
          category: string;
          created_at: string;
          id: string;
          read_at: string | null;
          recipient_id: string | null;
          scheduled_at: string | null;
          sent_at: string | null;
          source_key: string | null;
          status: Database['public']['Enums']['notification_status'];
          title: string;
          updated_at: string;
        };
        SetofOptions: {
          from: '*';
          to: 'notifications';
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      admin_duplicate_service_template: {
        Args: { p_template_id: string };
        Returns: {
          archived_at: string | null;
          base_price: number;
          category_id: string;
          created_at: string;
          description: string | null;
          estimated_duration_minutes: number;
          id: string;
          is_active: boolean;
          name: string;
          updated_at: string;
        };
        SetofOptions: {
          from: '*';
          to: 'service_templates';
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      admin_publish_campaign: {
        Args: { p_campaign_id: string };
        Returns: {
          audience: Database['public']['Enums']['notification_audience'] | null;
          body: string;
          category: string;
          created_at: string;
          id: string;
          read_at: string | null;
          recipient_id: string | null;
          scheduled_at: string | null;
          sent_at: string | null;
          source_key: string | null;
          status: Database['public']['Enums']['notification_status'];
          title: string;
          updated_at: string;
        };
        SetofOptions: {
          from: '*';
          to: 'notifications';
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      admin_review_wallet_topup: {
        Args: { p_decision: string; p_notes?: string; p_topup_id: string };
        Returns: {
          amount_centavos: number;
          channel: string | null;
          completed_at: string | null;
          created_at: string;
          currency: string;
          expires_at: string | null;
          failure_reason: string | null;
          id: string;
          idempotency_key: string;
          proof_path: string | null;
          provider: string;
          provider_intent_id: string | null;
          provider_payment_id: string | null;
          provider_payment_method_id: string | null;
          redirect_url: string | null;
          reference_number: string | null;
          return_url: string | null;
          review_notes: string | null;
          reviewed_at: string | null;
          reviewed_by: string | null;
          status: string;
          submitted_at: string | null;
          updated_at: string;
          wallet_account_id: string;
        };
        SetofOptions: {
          from: '*';
          to: 'wallet_topups';
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      admin_send_notification_now: {
        Args: { p_notification_id: string };
        Returns: {
          audience: Database['public']['Enums']['notification_audience'] | null;
          body: string;
          category: string;
          created_at: string;
          id: string;
          read_at: string | null;
          recipient_id: string | null;
          scheduled_at: string | null;
          sent_at: string | null;
          source_key: string | null;
          status: Database['public']['Enums']['notification_status'];
          title: string;
          updated_at: string;
        };
        SetofOptions: {
          from: '*';
          to: 'notifications';
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      admin_set_setting: {
        Args: { setting_key: string; setting_value: Json };
        Returns: {
          key: string;
          updated_at: string;
          updated_by: string | null;
          value: Json;
        };
        SetofOptions: {
          from: '*';
          to: 'system_settings';
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      admin_set_worker_availability: {
        Args: { p_available: boolean; p_worker_id: string };
        Returns: {
          account_id: string;
          approval_status: Database['public']['Enums']['worker_approval_status'];
          approved_at: string | null;
          avatar_path: string | null;
          bio: string | null;
          created_at: string;
          display_name: string;
          experience: string | null;
          is_available: boolean;
          latitude: number | null;
          longitude: number | null;
          primary_industry_id: string | null;
          recommendation_priority: boolean;
          service_area: string | null;
          service_origin: unknown;
          service_radius_meters: number | null;
          updated_at: string;
        };
        SetofOptions: {
          from: '*';
          to: 'worker_profiles';
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      admin_upsert_category: {
        Args: { p_id: string; p_is_active: boolean; p_name: string };
        Returns: {
          created_at: string;
          description: string | null;
          id: string;
          industry_id: string | null;
          is_active: boolean;
          is_safety_critical: boolean;
          maximum_price_minor: number | null;
          minimum_price_minor: number | null;
          name: string;
          slug: string | null;
          updated_at: string;
        };
        SetofOptions: {
          from: '*';
          to: 'service_categories';
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      admin_upsert_content: {
        Args: {
          body: string;
          content_key: Database['public']['Enums']['content_key'];
          publish: boolean;
          title: string;
          version: string;
        };
        Returns: {
          body: string;
          created_at: string;
          id: string;
          key: Database['public']['Enums']['content_key'];
          published_at: string | null;
          title: string;
          updated_at: string;
          updated_by: string | null;
          version: string;
        };
        SetofOptions: {
          from: '*';
          to: 'content_pages';
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      admin_upsert_promotion: {
        Args: {
          p_code: string;
          p_description: string;
          p_discount_type: string;
          p_discount_value: number;
          p_ends_at: string;
          p_id: string;
          p_maximum_discount: number;
          p_minimum_spend: number;
          p_name: string;
          p_per_user_limit: number;
          p_starts_at: string;
          p_status: string;
          p_total_limit: number;
        };
        Returns: {
          code: string;
          created_at: string;
          created_by: string;
          description: string;
          discount_type: string;
          discount_value: number;
          ends_at: string;
          id: string;
          maximum_discount: number | null;
          minimum_spend: number;
          name: string;
          per_user_limit: number;
          starts_at: string;
          status: string;
          total_limit: number | null;
          updated_at: string;
        };
        SetofOptions: {
          from: '*';
          to: 'promotions';
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      admin_upsert_service: {
        Args: {
          p_category_id: string;
          p_duration_minutes: number;
          p_id: string;
          p_is_active: boolean;
          p_maximum_price_minor: number;
          p_minimum_price_minor: number;
          p_name: string;
        };
        Returns: {
          archived_at: string | null;
          base_price: number;
          category_id: string;
          created_at: string;
          description: string | null;
          estimated_duration_minutes: number;
          id: string;
          is_active: boolean;
          name: string;
          updated_at: string;
        };
        SetofOptions: {
          from: '*';
          to: 'service_templates';
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      admin_upsert_service_category: {
        Args: {
          p_category_id: string;
          p_description: string;
          p_is_active: boolean;
          p_name: string;
        };
        Returns: {
          created_at: string;
          description: string | null;
          id: string;
          industry_id: string | null;
          is_active: boolean;
          is_safety_critical: boolean;
          maximum_price_minor: number | null;
          minimum_price_minor: number | null;
          name: string;
          slug: string | null;
          updated_at: string;
        };
        SetofOptions: {
          from: '*';
          to: 'service_categories';
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      admin_upsert_service_template: {
        Args: {
          p_base_price: number;
          p_category_id: string;
          p_description: string;
          p_estimated_duration_minutes: number;
          p_is_active: boolean;
          p_name: string;
          p_template_id: string;
        };
        Returns: {
          archived_at: string | null;
          base_price: number;
          category_id: string;
          created_at: string;
          description: string | null;
          estimated_duration_minutes: number;
          id: string;
          is_active: boolean;
          name: string;
          updated_at: string;
        };
        SetofOptions: {
          from: '*';
          to: 'service_templates';
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      archive_job: {
        Args: { message_id: number; queue_name: string };
        Returns: boolean;
      };
      archive_my_address: { Args: { p_address_id: string }; Returns: boolean };
      attach_portfolio_media: {
        Args: {
          p_byte_size: number;
          p_content_type: string;
          p_portfolio_item_id: string;
          p_storage_path: string;
        };
        Returns: {
          byte_size: number;
          content_type: string;
          created_at: string;
          id: string;
          portfolio_item_id: string;
          sort_order: number;
          storage_path: string;
        };
        SetofOptions: {
          from: '*';
          to: 'worker_portfolio_media';
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      attach_request_media: {
        Args: {
          p_byte_size: number;
          p_content_type: string;
          p_service_request_id: string;
          p_storage_path: string;
        };
        Returns: {
          byte_size: number;
          content_type: string;
          created_at: string;
          id: string;
          service_request_id: string;
          storage_path: string;
        };
        SetofOptions: {
          from: '*';
          to: 'request_media';
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      attach_review_media: {
        Args: {
          p_byte_size: number;
          p_content_type: string;
          p_review_id: string;
          p_storage_path: string;
        };
        Returns: {
          byte_size: number;
          content_type: string;
          id: string;
          review_id: string;
          storage_path: string;
        };
        SetofOptions: {
          from: '*';
          to: 'review_media';
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      attach_support_message_media: {
        Args: {
          p_byte_size: number;
          p_content_type: string;
          p_storage_path: string;
          p_support_message_id: string;
        };
        Returns: {
          byte_size: number;
          content_type: string;
          created_at: string;
          id: string;
          storage_path: string;
          support_message_id: string;
        };
        SetofOptions: {
          from: '*';
          to: 'support_message_attachments';
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      can_read_service_request: {
        Args: { p_request_id: string };
        Returns: boolean;
      };
      cancel_admin_bootstrap: {
        Args: { email: string; token_hash: string };
        Returns: undefined;
      };
      cancel_booking: {
        Args: {
          p_booking_id: string;
          p_details: string;
          p_expected_version: number;
          p_policy_version: string;
          p_reason_code: string;
          p_stage: string;
        };
        Returns: {
          accepted_at: string | null;
          accepted_offer_id: string | null;
          agreed_service_amount: number;
          cancelled_at: string | null;
          completed_at: string | null;
          created_at: string;
          currency: string;
          id: string;
          response_due_at: string;
          service_request_id: string;
          status: Database['public']['Enums']['booking_status'];
          updated_at: string;
          user_account_id: string;
          version: number;
          worker_account_id: string;
        };
        SetofOptions: {
          from: '*';
          to: 'bookings';
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      close_admin_session: { Args: never; Returns: boolean };
      complete_my_profile: {
        Args: {
          p_bio?: string;
          p_display_name: string;
          p_family_name?: string;
          p_given_name?: string;
          p_location?: string;
          p_mobile?: string;
        };
        Returns: Json;
      };
      confirm_cash_payment: {
        Args: { p_booking_id: string; p_idempotency_key: string };
        Returns: {
          booking_id: string;
          commission_amount: number;
          commission_rate: number;
          created_at: string;
          currency: string;
          failure_reason: string | null;
          homeowner_platform_charge: number;
          id: string;
          idempotency_key: string;
          method: Database['public']['Enums']['payment_method'];
          paid_at: string | null;
          provider: string | null;
          provider_payment_id: string | null;
          service_amount: number;
          status: Database['public']['Enums']['payment_status'];
          successful_at: string | null;
          updated_at: string;
          worker_net_amount: number;
        };
        SetofOptions: {
          from: '*';
          to: 'payments';
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      create_review: {
        Args: {
          body: string;
          p_booking_id: string;
          recommend_worker: boolean;
          stars: number;
        };
        Returns: {
          body: string;
          booking_id: string;
          created_at: string;
          id: string;
          moderated_at: string | null;
          moderated_by: string | null;
          moderation_status: Database['public']['Enums']['review_moderation_status'];
          recommend_worker: boolean;
          stars: number;
          updated_at: string;
          user_account_id: string;
          worker_account_id: string;
        };
        SetofOptions: {
          from: '*';
          to: 'reviews';
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      create_service_request: {
        Args: {
          address_id: string;
          ai_analysis_id?: string;
          budget: number;
          category_id: string;
          description: string;
          notes?: string;
          notify_on_match?: boolean;
          scheduled_at: string;
        };
        Returns: {
          address_id: string;
          address_snapshot: Json | null;
          ai_analysis_id: string | null;
          budget: number;
          category_id: string;
          created_at: string;
          description: string;
          id: string;
          notes: string | null;
          notify_on_match: boolean;
          scheduled_at: string;
          selected_worker_id: string | null;
          service_location: unknown;
          status: Database['public']['Enums']['request_status'];
          updated_at: string;
          user_account_id: string;
        };
        SetofOptions: {
          from: '*';
          to: 'service_requests';
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      create_support_ticket: {
        Args: {
          p_booking_id: string;
          p_category: string;
          p_description: string;
          p_priority?: string;
          p_subject: string;
        };
        Returns: {
          assigned_admin_id: string | null;
          booking_id: string | null;
          category: string;
          closed_at: string | null;
          created_at: string;
          description: string;
          escalated_at: string | null;
          id: string;
          last_message_at: string | null;
          owner_id: string;
          priority: string;
          resolution: string | null;
          resolved_at: string | null;
          status: Database['public']['Enums']['ticket_status'];
          subject: string;
          updated_at: string;
        };
        SetofOptions: {
          from: '*';
          to: 'support_tickets';
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      current_role: {
        Args: never;
        Returns: Database['public']['Enums']['account_role'];
      };
      decide_refund: {
        Args: {
          p_decision: Database['public']['Enums']['refund_status'];
          p_reason: string;
          p_refund_id: string;
        };
        Returns: {
          created_at: string;
          decided_at: string | null;
          decided_by: string | null;
          id: string;
          payment_id: string;
          reason: string;
          status: Database['public']['Enums']['refund_status'];
        };
        SetofOptions: {
          from: '*';
          to: 'refunds';
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      empty_trash: { Args: { p_confirmation: string }; Returns: number };
      expire_booking_request: {
        Args: { target_booking: string };
        Returns: boolean;
      };
      generate_matches: {
        Args: { p_service_request_id: string };
        Returns: {
          created_at: string;
          eligible: boolean;
          factors: Json;
          id: string;
          rank: number;
          score: number;
          service_request_id: string;
          worker_id: string;
        }[];
        SetofOptions: {
          from: '*';
          to: 'match_candidates';
          isOneToOne: false;
          isSetofReturn: true;
        };
      };
      get_admin_dashboard_metrics: {
        Args: { p_from?: string; p_to?: string };
        Returns: Json;
      };
      get_booking_payment: {
        Args: { p_booking_id: string };
        Returns: {
          commission_amount: number;
          homeowner_platform_charge: number;
          latest_attempt_status: string;
          method: Database['public']['Enums']['payment_method'];
          paid_at: string;
          payment_id: string;
          provider: string;
          provider_payment_id: string;
          receipt_number: string;
          service_amount: number;
          status: Database['public']['Enums']['payment_status'];
          worker_net_amount: number;
        }[];
      };
      get_booking_tracking: {
        Args: { p_booking_id: string; p_limit?: number };
        Returns: {
          latitude: number;
          longitude: number;
          recorded_at: string;
        }[];
      };
      get_my_profile: { Args: never; Returns: Json };
      get_my_wallet_summary: {
        Args: never;
        Returns: {
          available_balance: number;
          lifetime_earnings: number;
          pending_payout: number;
          wallet_account_id: string;
        }[];
      };
      is_admin: { Args: { require_aal2?: boolean }; Returns: boolean };
      is_booking_party: { Args: { target_booking: string }; Returns: boolean };
      is_conversation_participant: {
        Args: { target_conversation: string };
        Returns: boolean;
      };
      mark_conversation_read: {
        Args: { p_conversation_id: string };
        Returns: boolean;
      };
      mark_notification_read: {
        Args: { p_notification_id: string };
        Returns: boolean;
      };
      moderate_review: {
        Args: {
          decision: Database['public']['Enums']['review_moderation_status'];
          review_id: string;
        };
        Returns: {
          body: string;
          booking_id: string;
          created_at: string;
          id: string;
          moderated_at: string | null;
          moderated_by: string | null;
          moderation_status: Database['public']['Enums']['review_moderation_status'];
          recommend_worker: boolean;
          stars: number;
          updated_at: string;
          user_account_id: string;
          worker_account_id: string;
        };
        SetofOptions: {
          from: '*';
          to: 'reviews';
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      move_to_trash: {
        Args: { entity_id: string; entity_type: string; snapshot: Json };
        Returns: {
          deleted_at: string;
          deleted_by: string;
          entity_id: string;
          entity_type: string;
          id: string;
          restored_at: string | null;
          restored_by: string | null;
          snapshot: Json;
        };
        SetofOptions: {
          from: '*';
          to: 'trash_entries';
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      permanently_delete:
        | {
            Args: { p_confirmation: string; p_trash_id: string };
            Returns: undefined;
          }
        | { Args: { trash_id: string }; Returns: undefined };
      persist_ai_analysis: {
        Args: {
          p_account_id: string;
          p_attempts: Json;
          p_idempotency_key: string;
          p_input_storage_path: string;
          p_input_type: string;
          p_model: string;
          p_provider: string;
          p_provider_reference: string;
          p_result: Json;
          p_transcript: string;
        };
        Returns: {
          account_id: string;
          created_at: string;
          detected_issue: string | null;
          estimated_cost_maximum: number | null;
          estimated_cost_minimum: number | null;
          id: string;
          idempotency_key: string | null;
          input_storage_path: string | null;
          input_type: string;
          possible_cause: string | null;
          provider: string;
          provider_model: string | null;
          provider_reference: string | null;
          request_draft: string | null;
          safety_advice: string | null;
          saved: boolean;
          severity: string | null;
          suggested_category_name: string | null;
          transcript: string | null;
        };
        SetofOptions: {
          from: '*';
          to: 'ai_analyses';
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      prepare_admin_bootstrap: {
        Args: {
          display_name: string;
          email: string;
          expires_at: string;
          token_hash: string;
        };
        Returns: undefined;
      };
      read_job_batch: {
        Args: {
          batch_size?: number;
          queue_name: string;
          visibility_seconds?: number;
        };
        Returns: Json[];
      };
      record_admin_session: {
        Args: { p_user_agent?: string };
        Returns: {
          admin_account_id: string;
          assurance_level: string;
          id: string;
          last_seen_at: string;
          session_id: string;
          signed_in_at: string;
          signed_out_at: string | null;
          user_agent: string | null;
        };
        SetofOptions: {
          from: '*';
          to: 'admin_session_history';
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      record_my_password_change: { Args: never; Returns: string };
      record_worker_location: {
        Args: { booking_id: string; latitude: number; longitude: number };
        Returns: {
          account_id: string;
          booking_id: string;
          id: string;
          latitude: number | null;
          location: unknown;
          longitude: number | null;
          recorded_at: string;
        };
        SetofOptions: {
          from: '*';
          to: 'location_updates';
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      register_push_subscription: {
        Args: {
          p_device_key: string;
          p_expo_push_token: string;
          p_platform: string;
        };
        Returns: {
          account_id: string;
          created_at: string;
          device_key: string;
          enabled: boolean;
          expo_push_token: string;
          id: string;
          invalidated_at: string | null;
          last_seen_at: string;
          platform: string;
          updated_at: string;
        };
        SetofOptions: {
          from: '*';
          to: 'push_subscriptions';
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      remove_push_subscription: {
        Args: { p_device_key: string };
        Returns: boolean;
      };
      request_payout: {
        Args: {
          p_amount: number;
          p_destination_id: string;
          p_idempotency_key: string;
        };
        Returns: {
          amount: number;
          created_at: string;
          destination_id: string;
          failure_reason: string | null;
          fee_amount: number;
          id: string;
          idempotency_key: string;
          processed_at: string | null;
          provider: string | null;
          provider_reference: string | null;
          status: string;
          updated_at: string;
          wallet_account_id: string;
        };
        SetofOptions: {
          from: '*';
          to: 'payout_requests';
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      reserve_promotion: {
        Args: { p_code: string; p_service_request_id: string };
        Returns: {
          booking_id: string | null;
          discount_amount: number;
          id: string;
          promotion_id: string;
          redeemed_at: string | null;
          released_at: string | null;
          reserved_at: string;
          service_request_id: string | null;
          status: string;
          user_account_id: string;
        };
        SetofOptions: {
          from: '*';
          to: 'promotion_redemptions';
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      restore_all_from_trash: { Args: never; Returns: number };
      restore_from_trash: {
        Args: { trash_id: string };
        Returns: {
          deleted_at: string;
          deleted_by: string;
          entity_id: string;
          entity_type: string;
          id: string;
          restored_at: string | null;
          restored_by: string | null;
          snapshot: Json;
        };
        SetofOptions: {
          from: '*';
          to: 'trash_entries';
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      review_verification_document: {
        Args: { p_decision: string; p_document_id: string; p_notes?: string };
        Returns: {
          byte_size: number;
          content_type: string;
          document_type: string;
          id: string;
          review_notes: string | null;
          reviewed_at: string | null;
          reviewer_id: string | null;
          revision: number;
          status: string;
          storage_path: string;
          submitted_at: string;
          verification_id: string;
          worker_id: string;
        };
        SetofOptions: {
          from: '*';
          to: 'worker_verification_documents';
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      review_worker_verification: {
        Args: {
          decision: Database['public']['Enums']['worker_approval_status'];
          notes?: string;
          verification_id: string;
        };
        Returns: {
          created_at: string;
          document_paths: string[];
          id: string;
          identity_data: Json;
          requested_notes: string | null;
          reviewed_at: string | null;
          reviewed_by: string | null;
          status: Database['public']['Enums']['worker_approval_status'];
          updated_at: string;
          worker_id: string;
        };
        SetofOptions: {
          from: '*';
          to: 'worker_verifications';
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      save_ai_analysis: {
        Args: { p_analysis_id: string };
        Returns: {
          account_id: string;
          created_at: string;
          detected_issue: string | null;
          estimated_cost_maximum: number | null;
          estimated_cost_minimum: number | null;
          id: string;
          idempotency_key: string | null;
          input_storage_path: string | null;
          input_type: string;
          possible_cause: string | null;
          provider: string;
          provider_model: string | null;
          provider_reference: string | null;
          request_draft: string | null;
          safety_advice: string | null;
          saved: boolean;
          severity: string | null;
          suggested_category_name: string | null;
          transcript: string | null;
        };
        SetofOptions: {
          from: '*';
          to: 'ai_analyses';
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      save_geocoded_address: {
        Args: {
          p_barangay: string;
          p_city: string;
          p_confidence: number;
          p_is_default?: boolean;
          p_label: string;
          p_latitude: number;
          p_line1: string;
          p_line2: string;
          p_longitude: number;
          p_payload: Json;
          p_postal_code: string;
          p_provider_id: string;
          p_province: string;
        };
        Returns: {
          account_id: string;
          archived_at: string | null;
          barangay: string;
          city: string;
          contact_mobile: string | null;
          created_at: string;
          geocoding_confidence: number | null;
          geocoding_payload: Json | null;
          geocoding_provider: string | null;
          geocoding_provider_id: string | null;
          id: string;
          instructions: string | null;
          is_default: boolean;
          label: string;
          latitude: number | null;
          line1: string;
          line2: string | null;
          location: unknown;
          longitude: number | null;
          postal_code: string | null;
          province: string;
          recipient_name: string | null;
          updated_at: string;
        };
        SetofOptions: {
          from: '*';
          to: 'addresses';
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      select_worker: {
        Args: { p_service_request_id: string; p_worker_id: string };
        Returns: {
          accepted_at: string | null;
          accepted_offer_id: string | null;
          agreed_service_amount: number;
          cancelled_at: string | null;
          completed_at: string | null;
          created_at: string;
          currency: string;
          id: string;
          response_due_at: string;
          service_request_id: string;
          status: Database['public']['Enums']['booking_status'];
          updated_at: string;
          user_account_id: string;
          version: number;
          worker_account_id: string;
        };
        SetofOptions: {
          from: '*';
          to: 'bookings';
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      send_support_message: {
        Args: { p_body: string; p_internal?: boolean; p_ticket_id: string };
        Returns: {
          body: string;
          created_at: string;
          id: string;
          is_internal: boolean;
          sender_id: string;
          ticket_id: string;
        };
        SetofOptions: {
          from: '*';
          to: 'support_ticket_messages';
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      set_account_status: {
        Args: {
          account_id: string;
          next_status: Database['public']['Enums']['account_status'];
        };
        Returns: {
          created_at: string;
          deleted_at: string | null;
          email: string;
          id: string;
          is_protected: boolean;
          mfa_enabled: boolean;
          mobile: string | null;
          password_changed_at: string | null;
          profile_completed_at: string | null;
          role: Database['public']['Enums']['account_role'];
          status: Database['public']['Enums']['account_status'];
          updated_at: string;
        };
        SetofOptions: {
          from: '*';
          to: 'accounts';
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      set_address_location: {
        Args: { p_address_id: string; p_latitude: number; p_longitude: number };
        Returns: {
          account_id: string;
          archived_at: string | null;
          barangay: string;
          city: string;
          contact_mobile: string | null;
          created_at: string;
          geocoding_confidence: number | null;
          geocoding_payload: Json | null;
          geocoding_provider: string | null;
          geocoding_provider_id: string | null;
          id: string;
          instructions: string | null;
          is_default: boolean;
          label: string;
          latitude: number | null;
          line1: string;
          line2: string | null;
          location: unknown;
          longitude: number | null;
          postal_code: string | null;
          province: string;
          recipient_name: string | null;
          updated_at: string;
        };
        SetofOptions: {
          from: '*';
          to: 'addresses';
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      set_admin_mfa_enabled: {
        Args: { enabled: boolean };
        Returns: {
          created_at: string;
          deleted_at: string | null;
          email: string;
          id: string;
          is_protected: boolean;
          mfa_enabled: boolean;
          mobile: string | null;
          password_changed_at: string | null;
          profile_completed_at: string | null;
          role: Database['public']['Enums']['account_role'];
          status: Database['public']['Enums']['account_status'];
          updated_at: string;
        };
        SetofOptions: {
          from: '*';
          to: 'accounts';
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      set_my_avatar: { Args: { p_storage_path: string }; Returns: Json };
      set_recommendation_priority: {
        Args: { enabled: boolean; worker_id: string };
        Returns: {
          account_id: string;
          approval_status: Database['public']['Enums']['worker_approval_status'];
          approved_at: string | null;
          avatar_path: string | null;
          bio: string | null;
          created_at: string;
          display_name: string;
          experience: string | null;
          is_available: boolean;
          latitude: number | null;
          longitude: number | null;
          primary_industry_id: string | null;
          recommendation_priority: boolean;
          service_area: string | null;
          service_origin: unknown;
          service_radius_meters: number | null;
          updated_at: string;
        };
        SetofOptions: {
          from: '*';
          to: 'worker_profiles';
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      set_worker_service_area: {
        Args: {
          p_latitude: number;
          p_longitude: number;
          p_radius_meters: number;
        };
        Returns: {
          account_id: string;
          approval_status: Database['public']['Enums']['worker_approval_status'];
          approved_at: string | null;
          avatar_path: string | null;
          bio: string | null;
          created_at: string;
          display_name: string;
          experience: string | null;
          is_available: boolean;
          latitude: number | null;
          longitude: number | null;
          primary_industry_id: string | null;
          recommendation_priority: boolean;
          service_area: string | null;
          service_origin: unknown;
          service_radius_meters: number | null;
          updated_at: string;
        };
        SetofOptions: {
          from: '*';
          to: 'worker_profiles';
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      start_worker_conversation: {
        Args: { p_service_request_id: string; p_worker_id: string };
        Returns: {
          booking_id: string | null;
          created_at: string;
          id: string;
          service_request_id: string | null;
          updated_at: string;
          worker_account_id: string | null;
        };
        SetofOptions: {
          from: '*';
          to: 'conversations';
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      submit_manual_wallet_topup: {
        Args: {
          p_amount_centavos: number;
          p_channel: string;
          p_idempotency_key: string;
          p_proof_path: string;
          p_reference_number: string;
        };
        Returns: {
          amount_centavos: number;
          channel: string | null;
          completed_at: string | null;
          created_at: string;
          currency: string;
          expires_at: string | null;
          failure_reason: string | null;
          id: string;
          idempotency_key: string;
          proof_path: string | null;
          provider: string;
          provider_intent_id: string | null;
          provider_payment_id: string | null;
          provider_payment_method_id: string | null;
          redirect_url: string | null;
          reference_number: string | null;
          return_url: string | null;
          review_notes: string | null;
          reviewed_at: string | null;
          reviewed_by: string | null;
          status: string;
          submitted_at: string | null;
          updated_at: string;
          wallet_account_id: string;
        };
        SetofOptions: {
          from: '*';
          to: 'wallet_topups';
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      submit_request_bid: {
        Args: {
          p_amount_minor: number;
          p_duration_minutes: number;
          p_message: string;
          p_service_request_id: string;
        };
        Returns: {
          amount: number;
          created_at: string;
          estimated_minutes: number | null;
          expires_at: string | null;
          id: string;
          message: string;
          responded_at: string | null;
          service_request_id: string;
          status: string;
          updated_at: string;
          worker_id: string;
        };
        SetofOptions: {
          from: '*';
          to: 'service_request_offers';
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      submit_service_offer: {
        Args: {
          p_amount: number;
          p_estimated_minutes?: number;
          p_message: string;
          p_service_request_id: string;
        };
        Returns: {
          amount: number;
          created_at: string;
          estimated_minutes: number | null;
          expires_at: string | null;
          id: string;
          message: string;
          responded_at: string | null;
          service_request_id: string;
          status: string;
          updated_at: string;
          worker_id: string;
        };
        SetofOptions: {
          from: '*';
          to: 'service_request_offers';
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      submit_verification_document: {
        Args: {
          p_byte_size: number;
          p_content_type: string;
          p_document_type: string;
          p_storage_path: string;
        };
        Returns: {
          byte_size: number;
          content_type: string;
          document_type: string;
          id: string;
          review_notes: string | null;
          reviewed_at: string | null;
          reviewer_id: string | null;
          revision: number;
          status: string;
          storage_path: string;
          submitted_at: string;
          verification_id: string;
          worker_id: string;
        };
        SetofOptions: {
          from: '*';
          to: 'worker_verification_documents';
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      submit_worker_application: {
        Args: {
          p_bio: string;
          p_document_paths: string[];
          p_experience: string;
          p_identity_data: Json;
        };
        Returns: {
          created_at: string;
          document_paths: string[];
          id: string;
          identity_data: Json;
          requested_notes: string | null;
          reviewed_at: string | null;
          reviewed_by: string | null;
          status: Database['public']['Enums']['worker_approval_status'];
          updated_at: string;
          worker_id: string;
        };
        SetofOptions: {
          from: '*';
          to: 'worker_verifications';
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      submit_worker_onboarding_identity: {
        Args: { p_document_paths: string[]; p_identity_data: Json };
        Returns: {
          created_at: string;
          document_paths: string[];
          id: string;
          identity_data: Json;
          requested_notes: string | null;
          reviewed_at: string | null;
          reviewed_by: string | null;
          status: Database['public']['Enums']['worker_approval_status'];
          updated_at: string;
          worker_id: string;
        };
        SetofOptions: {
          from: '*';
          to: 'worker_verifications';
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      toggle_favorite: { Args: { p_worker_id: string }; Returns: boolean };
      transition_booking: {
        Args: {
          p_booking_id: string;
          p_expected_version: number;
          p_reason?: string;
          p_target_status: Database['public']['Enums']['booking_status'];
        };
        Returns: {
          accepted_at: string | null;
          accepted_offer_id: string | null;
          agreed_service_amount: number;
          cancelled_at: string | null;
          completed_at: string | null;
          created_at: string;
          currency: string;
          id: string;
          response_due_at: string;
          service_request_id: string;
          status: Database['public']['Enums']['booking_status'];
          updated_at: string;
          user_account_id: string;
          version: number;
          worker_account_id: string;
        };
        SetofOptions: {
          from: '*';
          to: 'bookings';
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      update_my_preferences: {
        Args: {
          p_appearance: string;
          p_locale: string;
          p_notifications: Json;
          p_privacy: Json;
          p_timezone: string;
        };
        Returns: {
          account_id: string;
          appearance: string;
          created_at: string;
          locale: string;
          notifications: Json;
          privacy: Json;
          timezone: string;
          updated_at: string;
        };
        SetofOptions: {
          from: '*';
          to: 'account_preferences';
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      update_my_profile:
        | {
            Args: {
              p_bio?: string;
              p_display_name: string;
              p_family_name?: string;
              p_given_name?: string;
              p_location?: string;
              p_mobile?: string;
            };
            Returns: Json;
          }
        | {
            Args: { p_display_name: string; p_notifications?: Json };
            Returns: Json;
          };
      update_support_ticket: {
        Args: {
          p_next_status: Database['public']['Enums']['ticket_status'];
          p_resolution?: string;
          p_ticket_id: string;
        };
        Returns: {
          assigned_admin_id: string | null;
          booking_id: string | null;
          category: string;
          closed_at: string | null;
          created_at: string;
          description: string;
          escalated_at: string | null;
          id: string;
          last_message_at: string | null;
          owner_id: string;
          priority: string;
          resolution: string | null;
          resolved_at: string | null;
          status: Database['public']['Enums']['ticket_status'];
          subject: string;
          updated_at: string;
        };
        SetofOptions: {
          from: '*';
          to: 'support_tickets';
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      upsert_my_address: {
        Args: {
          p_barangay: string;
          p_city: string;
          p_contact_mobile?: string;
          p_id: string;
          p_instructions?: string;
          p_is_default: boolean;
          p_label: string;
          p_latitude: number;
          p_line1: string;
          p_line2: string;
          p_longitude: number;
          p_postal_code: string;
          p_province: string;
          p_recipient_name?: string;
        };
        Returns: {
          account_id: string;
          archived_at: string | null;
          barangay: string;
          city: string;
          contact_mobile: string | null;
          created_at: string;
          geocoding_confidence: number | null;
          geocoding_payload: Json | null;
          geocoding_provider: string | null;
          geocoding_provider_id: string | null;
          id: string;
          instructions: string | null;
          is_default: boolean;
          label: string;
          latitude: number | null;
          line1: string;
          line2: string | null;
          location: unknown;
          longitude: number | null;
          postal_code: string | null;
          province: string;
          recipient_name: string | null;
          updated_at: string;
        };
        SetofOptions: {
          from: '*';
          to: 'addresses';
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      upsert_payout_destination: {
        Args: {
          p_account_name: string;
          p_account_reference: string;
          p_id: string;
          p_is_default?: boolean;
          p_kind: string;
          p_label: string;
        };
        Returns: {
          account_name: string;
          account_reference: string;
          created_at: string;
          id: string;
          is_default: boolean;
          kind: string;
          label: string;
          status: string;
          updated_at: string;
          worker_id: string;
        };
        SetofOptions: {
          from: '*';
          to: 'payout_destinations';
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      upsert_portfolio_item: {
        Args: {
          p_category_id: string;
          p_completed_on: string;
          p_description: string;
          p_id: string;
          p_is_published: boolean;
          p_title: string;
        };
        Returns: {
          category_id: string | null;
          completed_on: string | null;
          created_at: string;
          description: string;
          id: string;
          is_published: boolean;
          sort_order: number;
          title: string;
          updated_at: string;
          worker_id: string;
        };
        SetofOptions: {
          from: '*';
          to: 'worker_portfolio_items';
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      validate_promotion: {
        Args: { p_amount: number; p_code: string };
        Returns: {
          discount_amount: number;
          final_amount: number;
          promotion_id: string;
        }[];
      };
      withdraw_service_offer: {
        Args: { p_offer_id: string };
        Returns: {
          amount: number;
          created_at: string;
          estimated_minutes: number | null;
          expires_at: string | null;
          id: string;
          message: string;
          responded_at: string | null;
          service_request_id: string;
          status: string;
          updated_at: string;
          worker_id: string;
        };
        SetofOptions: {
          from: '*';
          to: 'service_request_offers';
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
    };
    Enums: {
      account_role: 'USER' | 'WORKER' | 'ADMIN';
      account_status: 'PENDING_VERIFICATION' | 'ACTIVE' | 'SUSPENDED';
      booking_status:
        | 'PENDING'
        | 'ACCEPTED'
        | 'WORKER_PREPARING'
        | 'WORKER_EN_ROUTE'
        | 'WORKER_ARRIVED'
        | 'SERVICE_STARTED'
        | 'IN_PROGRESS'
        | 'COMPLETED'
        | 'CANCELLED';
      cash_confirmation_party: 'USER' | 'WORKER';
      content_key: 'TERMS' | 'PRIVACY' | 'REFUND_POLICY' | 'HELP_CENTER';
      notification_audience: 'USERS' | 'WORKERS' | 'EVERYONE';
      notification_status: 'DRAFT' | 'SCHEDULED' | 'SENT' | 'FAILED';
      payment_method: 'CASH' | 'GCASH' | 'MAYA' | 'CREDIT_DEBIT_CARD' | 'WALLET';
      payment_status: 'PENDING' | 'AWAITING_CONFIRMATIONS' | 'SUCCESSFUL' | 'FAILED';
      refund_status: 'PENDING' | 'PROCESSED' | 'REJECTED';
      request_status: 'DRAFT' | 'OPEN' | 'MATCHED' | 'BOOKED' | 'CLOSED' | 'CANCELLED';
      review_moderation_status: 'PENDING' | 'PUBLISHED' | 'REJECTED';
      ticket_status: 'OPEN' | 'ESCALATED' | 'RESOLVED' | 'CLOSED';
      worker_approval_status: 'PENDING' | 'NEEDS_DOCUMENTS' | 'APPROVED' | 'REJECTED';
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
  storage: {
    Tables: {
      buckets: {
        Row: {
          allowed_mime_types: string[] | null;
          avif_autodetection: boolean | null;
          created_at: string | null;
          file_size_limit: number | null;
          id: string;
          name: string;
          owner: string | null;
          owner_id: string | null;
          public: boolean | null;
          type: Database['storage']['Enums']['buckettype'];
          updated_at: string | null;
        };
        Insert: {
          allowed_mime_types?: string[] | null;
          avif_autodetection?: boolean | null;
          created_at?: string | null;
          file_size_limit?: number | null;
          id: string;
          name: string;
          owner?: string | null;
          owner_id?: string | null;
          public?: boolean | null;
          type?: Database['storage']['Enums']['buckettype'];
          updated_at?: string | null;
        };
        Update: {
          allowed_mime_types?: string[] | null;
          avif_autodetection?: boolean | null;
          created_at?: string | null;
          file_size_limit?: number | null;
          id?: string;
          name?: string;
          owner?: string | null;
          owner_id?: string | null;
          public?: boolean | null;
          type?: Database['storage']['Enums']['buckettype'];
          updated_at?: string | null;
        };
        Relationships: [];
      };
      buckets_analytics: {
        Row: {
          created_at: string;
          deleted_at: string | null;
          format: string;
          id: string;
          name: string;
          type: Database['storage']['Enums']['buckettype'];
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          deleted_at?: string | null;
          format?: string;
          id?: string;
          name: string;
          type?: Database['storage']['Enums']['buckettype'];
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          deleted_at?: string | null;
          format?: string;
          id?: string;
          name?: string;
          type?: Database['storage']['Enums']['buckettype'];
          updated_at?: string;
        };
        Relationships: [];
      };
      buckets_vectors: {
        Row: {
          created_at: string;
          id: string;
          type: Database['storage']['Enums']['buckettype'];
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          id: string;
          type?: Database['storage']['Enums']['buckettype'];
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          type?: Database['storage']['Enums']['buckettype'];
          updated_at?: string;
        };
        Relationships: [];
      };
      iceberg_namespaces: {
        Row: {
          bucket_name: string;
          catalog_id: string;
          created_at: string;
          id: string;
          metadata: Json;
          name: string;
          updated_at: string;
        };
        Insert: {
          bucket_name: string;
          catalog_id: string;
          created_at?: string;
          id?: string;
          metadata?: Json;
          name: string;
          updated_at?: string;
        };
        Update: {
          bucket_name?: string;
          catalog_id?: string;
          created_at?: string;
          id?: string;
          metadata?: Json;
          name?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'iceberg_namespaces_catalog_id_fkey';
            columns: ['catalog_id'];
            isOneToOne: false;
            referencedRelation: 'buckets_analytics';
            referencedColumns: ['id'];
          },
        ];
      };
      iceberg_tables: {
        Row: {
          bucket_name: string;
          catalog_id: string;
          created_at: string;
          id: string;
          location: string;
          name: string;
          namespace_id: string;
          remote_table_id: string | null;
          shard_id: string | null;
          shard_key: string | null;
          updated_at: string;
        };
        Insert: {
          bucket_name: string;
          catalog_id: string;
          created_at?: string;
          id?: string;
          location: string;
          name: string;
          namespace_id: string;
          remote_table_id?: string | null;
          shard_id?: string | null;
          shard_key?: string | null;
          updated_at?: string;
        };
        Update: {
          bucket_name?: string;
          catalog_id?: string;
          created_at?: string;
          id?: string;
          location?: string;
          name?: string;
          namespace_id?: string;
          remote_table_id?: string | null;
          shard_id?: string | null;
          shard_key?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'iceberg_tables_catalog_id_fkey';
            columns: ['catalog_id'];
            isOneToOne: false;
            referencedRelation: 'buckets_analytics';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'iceberg_tables_namespace_id_fkey';
            columns: ['namespace_id'];
            isOneToOne: false;
            referencedRelation: 'iceberg_namespaces';
            referencedColumns: ['id'];
          },
        ];
      };
      migrations: {
        Row: {
          executed_at: string | null;
          hash: string;
          id: number;
          name: string;
        };
        Insert: {
          executed_at?: string | null;
          hash: string;
          id: number;
          name: string;
        };
        Update: {
          executed_at?: string | null;
          hash?: string;
          id?: number;
          name?: string;
        };
        Relationships: [];
      };
      objects: {
        Row: {
          bucket_id: string | null;
          created_at: string | null;
          id: string;
          last_accessed_at: string | null;
          metadata: Json | null;
          name: string | null;
          owner: string | null;
          owner_id: string | null;
          path_tokens: string[] | null;
          updated_at: string | null;
          user_metadata: Json | null;
          version: string | null;
        };
        Insert: {
          bucket_id?: string | null;
          created_at?: string | null;
          id?: string;
          last_accessed_at?: string | null;
          metadata?: Json | null;
          name?: string | null;
          owner?: string | null;
          owner_id?: string | null;
          path_tokens?: string[] | null;
          updated_at?: string | null;
          user_metadata?: Json | null;
          version?: string | null;
        };
        Update: {
          bucket_id?: string | null;
          created_at?: string | null;
          id?: string;
          last_accessed_at?: string | null;
          metadata?: Json | null;
          name?: string | null;
          owner?: string | null;
          owner_id?: string | null;
          path_tokens?: string[] | null;
          updated_at?: string | null;
          user_metadata?: Json | null;
          version?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'objects_bucketId_fkey';
            columns: ['bucket_id'];
            isOneToOne: false;
            referencedRelation: 'buckets';
            referencedColumns: ['id'];
          },
        ];
      };
      s3_multipart_uploads: {
        Row: {
          bucket_id: string;
          created_at: string;
          id: string;
          in_progress_size: number;
          key: string;
          metadata: Json | null;
          owner_id: string | null;
          upload_signature: string;
          user_metadata: Json | null;
          version: string;
        };
        Insert: {
          bucket_id: string;
          created_at?: string;
          id: string;
          in_progress_size?: number;
          key: string;
          metadata?: Json | null;
          owner_id?: string | null;
          upload_signature: string;
          user_metadata?: Json | null;
          version: string;
        };
        Update: {
          bucket_id?: string;
          created_at?: string;
          id?: string;
          in_progress_size?: number;
          key?: string;
          metadata?: Json | null;
          owner_id?: string | null;
          upload_signature?: string;
          user_metadata?: Json | null;
          version?: string;
        };
        Relationships: [
          {
            foreignKeyName: 's3_multipart_uploads_bucket_id_fkey';
            columns: ['bucket_id'];
            isOneToOne: false;
            referencedRelation: 'buckets';
            referencedColumns: ['id'];
          },
        ];
      };
      s3_multipart_uploads_parts: {
        Row: {
          bucket_id: string;
          created_at: string;
          etag: string;
          id: string;
          key: string;
          owner_id: string | null;
          part_number: number;
          size: number;
          upload_id: string;
          version: string;
        };
        Insert: {
          bucket_id: string;
          created_at?: string;
          etag: string;
          id?: string;
          key: string;
          owner_id?: string | null;
          part_number: number;
          size?: number;
          upload_id: string;
          version: string;
        };
        Update: {
          bucket_id?: string;
          created_at?: string;
          etag?: string;
          id?: string;
          key?: string;
          owner_id?: string | null;
          part_number?: number;
          size?: number;
          upload_id?: string;
          version?: string;
        };
        Relationships: [
          {
            foreignKeyName: 's3_multipart_uploads_parts_bucket_id_fkey';
            columns: ['bucket_id'];
            isOneToOne: false;
            referencedRelation: 'buckets';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 's3_multipart_uploads_parts_upload_id_fkey';
            columns: ['upload_id'];
            isOneToOne: false;
            referencedRelation: 's3_multipart_uploads';
            referencedColumns: ['id'];
          },
        ];
      };
      vector_indexes: {
        Row: {
          bucket_id: string;
          created_at: string;
          data_type: string;
          dimension: number;
          distance_metric: string;
          id: string;
          metadata_configuration: Json | null;
          name: string;
          updated_at: string;
        };
        Insert: {
          bucket_id: string;
          created_at?: string;
          data_type: string;
          dimension: number;
          distance_metric: string;
          id?: string;
          metadata_configuration?: Json | null;
          name: string;
          updated_at?: string;
        };
        Update: {
          bucket_id?: string;
          created_at?: string;
          data_type?: string;
          dimension?: number;
          distance_metric?: string;
          id?: string;
          metadata_configuration?: Json | null;
          name?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'vector_indexes_bucket_id_fkey';
            columns: ['bucket_id'];
            isOneToOne: false;
            referencedRelation: 'buckets_vectors';
            referencedColumns: ['id'];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      allow_any_operation: {
        Args: { expected_operations: string[] };
        Returns: boolean;
      };
      allow_only_operation: {
        Args: { expected_operation: string };
        Returns: boolean;
      };
      can_insert_object: {
        Args: { bucketid: string; metadata: Json; name: string; owner: string };
        Returns: undefined;
      };
      extension: { Args: { name: string }; Returns: string };
      filename: { Args: { name: string }; Returns: string };
      foldername: { Args: { name: string }; Returns: string[] };
      get_common_prefix: {
        Args: { p_delimiter: string; p_key: string; p_prefix: string };
        Returns: string;
      };
      get_size_by_bucket: {
        Args: never;
        Returns: {
          bucket_id: string;
          size: number;
        }[];
      };
      list_multipart_uploads_with_delimiter: {
        Args: {
          bucket_id: string;
          delimiter_param: string;
          max_keys?: number;
          next_key_token?: string;
          next_upload_token?: string;
          prefix_param: string;
        };
        Returns: {
          created_at: string;
          id: string;
          key: string;
        }[];
      };
      list_objects_with_delimiter: {
        Args: {
          _bucket_id: string;
          delimiter_param: string;
          max_keys?: number;
          next_token?: string;
          prefix_param: string;
          sort_order?: string;
          start_after?: string;
        };
        Returns: {
          created_at: string;
          id: string;
          last_accessed_at: string;
          metadata: Json;
          name: string;
          updated_at: string;
        }[];
      };
      operation: { Args: never; Returns: string };
      search: {
        Args: {
          bucketname: string;
          levels?: number;
          limits?: number;
          offsets?: number;
          prefix: string;
          search?: string;
          sortcolumn?: string;
          sortorder?: string;
        };
        Returns: {
          created_at: string;
          id: string;
          last_accessed_at: string;
          metadata: Json;
          name: string;
          updated_at: string;
        }[];
      };
      search_by_timestamp: {
        Args: {
          p_bucket_id: string;
          p_level: number;
          p_limit: number;
          p_prefix: string;
          p_sort_column: string;
          p_sort_column_after: string;
          p_sort_order: string;
          p_start_after: string;
        };
        Returns: {
          created_at: string;
          id: string;
          key: string;
          last_accessed_at: string;
          metadata: Json;
          name: string;
          updated_at: string;
        }[];
      };
      search_v2: {
        Args: {
          bucket_name: string;
          levels?: number;
          limits?: number;
          prefix: string;
          sort_column?: string;
          sort_column_after?: string;
          sort_order?: string;
          start_after?: string;
        };
        Returns: {
          created_at: string;
          id: string;
          key: string;
          last_accessed_at: string;
          metadata: Json;
          name: string;
          updated_at: string;
        }[];
      };
    };
    Enums: {
      buckettype: 'STANDARD' | 'ANALYTICS' | 'VECTOR';
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, 'public'>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    ? (DefaultSchema['Tables'] & DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema['Enums']
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
    ? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema['CompositeTypes']
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
    ? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      account_role: ['USER', 'WORKER', 'ADMIN'],
      account_status: ['PENDING_VERIFICATION', 'ACTIVE', 'SUSPENDED'],
      booking_status: [
        'PENDING',
        'ACCEPTED',
        'WORKER_PREPARING',
        'WORKER_EN_ROUTE',
        'WORKER_ARRIVED',
        'SERVICE_STARTED',
        'IN_PROGRESS',
        'COMPLETED',
        'CANCELLED',
      ],
      cash_confirmation_party: ['USER', 'WORKER'],
      content_key: ['TERMS', 'PRIVACY', 'REFUND_POLICY', 'HELP_CENTER'],
      notification_audience: ['USERS', 'WORKERS', 'EVERYONE'],
      notification_status: ['DRAFT', 'SCHEDULED', 'SENT', 'FAILED'],
      payment_method: ['CASH', 'GCASH', 'MAYA', 'CREDIT_DEBIT_CARD', 'WALLET'],
      payment_status: ['PENDING', 'AWAITING_CONFIRMATIONS', 'SUCCESSFUL', 'FAILED'],
      refund_status: ['PENDING', 'PROCESSED', 'REJECTED'],
      request_status: ['DRAFT', 'OPEN', 'MATCHED', 'BOOKED', 'CLOSED', 'CANCELLED'],
      review_moderation_status: ['PENDING', 'PUBLISHED', 'REJECTED'],
      ticket_status: ['OPEN', 'ESCALATED', 'RESOLVED', 'CLOSED'],
      worker_approval_status: ['PENDING', 'NEEDS_DOCUMENTS', 'APPROVED', 'REJECTED'],
    },
  },
  storage: {
    Enums: {
      buckettype: ['STANDARD', 'ANALYTICS', 'VECTOR'],
    },
  },
} as const;
