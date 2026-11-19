export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      analytics_events: {
        Row: {
          anonymous_id: string | null
          created_at: string | null
          event_type: string
          id: string
          metadata: Json | null
          truck_id: string
          user_id: string | null
        }
        Insert: {
          anonymous_id?: string | null
          created_at?: string | null
          event_type: string
          id?: string
          metadata?: Json | null
          truck_id: string
          user_id?: string | null
        }
        Update: {
          anonymous_id?: string | null
          created_at?: string | null
          event_type?: string
          id?: string
          metadata?: Json | null
          truck_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "analytics_events_truck_id_fkey"
            columns: ["truck_id"]
            isOneToOne: false
            referencedRelation: "food_trucks"
            referencedColumns: ["id"]
          },
        ]
      }
      api_usage: {
        Row: {
          created_at: string | null
          id: string
          requests_count: number
          service_name: string
          tokens_used: number
          usage_date: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          requests_count?: number
          service_name: string
          tokens_used?: number
          usage_date: string
        }
        Update: {
          created_at?: string | null
          id?: string
          requests_count?: number
          service_name?: string
          tokens_used?: number
          usage_date?: string
        }
        Relationships: []
      }
      api_usage_logs: {
        Row: {
          created_at: string | null
          endpoint: string
          id: string
          ip_address: unknown
          method: string
          response_status: number | null
          response_time_ms: number | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          endpoint: string
          id?: string
          ip_address?: unknown
          method: string
          response_status?: number | null
          response_time_ms?: number | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          endpoint?: string
          id?: string
          ip_address?: unknown
          method?: string
          response_status?: number | null
          response_time_ms?: number | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      app_settings: {
        Row: {
          description: string | null
          key: string
          updated_at: string | null
          updated_by: string | null
          value: string | null
        }
        Insert: {
          description?: string | null
          key: string
          updated_at?: string | null
          updated_by?: string | null
          value?: string | null
        }
        Update: {
          description?: string | null
          key?: string
          updated_at?: string | null
          updated_by?: string | null
          value?: string | null
        }
        Relationships: []
      }
      audit_log: {
        Row: {
          action_type: string
          created_at: string
          entity_id: string
          entity_type: string
          id: string
          metadata: Json | null
          new_value: Json | null
          old_value: Json | null
          reason: string | null
          user_id: string | null
        }
        Insert: {
          action_type: string
          created_at?: string
          entity_id: string
          entity_type: string
          id?: string
          metadata?: Json | null
          new_value?: Json | null
          old_value?: Json | null
          reason?: string | null
          user_id?: string | null
        }
        Update: {
          action_type?: string
          created_at?: string
          entity_id?: string
          entity_type?: string
          id?: string
          metadata?: Json | null
          new_value?: Json | null
          old_value?: Json | null
          reason?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          action: string
          created_at: string
          details: Json | null
          id: string
          resource_id: string | null
          resource_type: string
          severity: string
          timestamp: string
          user_email: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          details?: Json | null
          id?: string
          resource_id?: string | null
          resource_type: string
          severity?: string
          timestamp?: string
          user_email?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          details?: Json | null
          id?: string
          resource_id?: string | null
          resource_type?: string
          severity?: string
          timestamp?: string
          user_email?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      blog_posts: {
        Row: {
          author: string
          body: string
          created_at: string | null
          excerpt: string | null
          id: string
          meta_description: string | null
          meta_keywords: string[] | null
          og_image: string | null
          published_at: string | null
          slug: string
          status: string
          title: string
          updated_at: string | null
        }
        Insert: {
          author?: string
          body?: string
          created_at?: string | null
          excerpt?: string | null
          id?: string
          meta_description?: string | null
          meta_keywords?: string[] | null
          og_image?: string | null
          published_at?: string | null
          slug: string
          status?: string
          title: string
          updated_at?: string | null
        }
        Update: {
          author?: string
          body?: string
          created_at?: string | null
          excerpt?: string | null
          id?: string
          meta_description?: string | null
          meta_keywords?: string[] | null
          og_image?: string | null
          published_at?: string | null
          slug?: string
          status?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      claim_verification_codes: {
        Row: {
          attempts: number
          code: string
          created_at: string
          expires_at: string
          food_truck_id: string
          id: string
          locked_at: string | null
          used: boolean
          used_at: string | null
          used_by: string | null
        }
        Insert: {
          attempts?: number
          code: string
          created_at?: string
          expires_at?: string
          food_truck_id: string
          id?: string
          locked_at?: string | null
          used?: boolean
          used_at?: string | null
          used_by?: string | null
        }
        Update: {
          attempts?: number
          code?: string
          created_at?: string
          expires_at?: string
          food_truck_id?: string
          id?: string
          locked_at?: string | null
          used?: boolean
          used_at?: string | null
          used_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "claim_verification_codes_food_truck_id_fkey"
            columns: ["food_truck_id"]
            isOneToOne: false
            referencedRelation: "food_trucks"
            referencedColumns: ["id"]
          },
        ]
      }
      data_processing_queue: {
        Row: {
          created_at: string
          entity_id: string | null
          entity_type: string | null
          error_message: string | null
          food_truck_id: string | null
          gemini_tokens_used: number | null
          id: string
          metadata: Json | null
          operation: string | null
          priority: number | null
          processed_at: string | null
          status: string
        }
        Insert: {
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          error_message?: string | null
          food_truck_id?: string | null
          gemini_tokens_used?: number | null
          id?: string
          metadata?: Json | null
          operation?: string | null
          priority?: number | null
          processed_at?: string | null
          status?: string
        }
        Update: {
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          error_message?: string | null
          food_truck_id?: string | null
          gemini_tokens_used?: number | null
          id?: string
          metadata?: Json | null
          operation?: string | null
          priority?: number | null
          processed_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "data_processing_queue_food_truck_id_fkey"
            columns: ["food_truck_id"]
            isOneToOne: false
            referencedRelation: "food_trucks"
            referencedColumns: ["id"]
          },
        ]
      }
      data_quality_logs: {
        Row: {
          created_at: string | null
          description: string | null
          field_name: string | null
          id: string
          is_resolved: boolean | null
          issue_type: string
          old_value: string | null
          record_id: string | null
          resolved_at: string | null
          resolved_by: string | null
          severity: string | null
          suggested_value: string | null
          table_name: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          field_name?: string | null
          id?: string
          is_resolved?: boolean | null
          issue_type: string
          old_value?: string | null
          record_id?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string | null
          suggested_value?: string | null
          table_name: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          field_name?: string | null
          id?: string
          is_resolved?: boolean | null
          issue_type?: string
          old_value?: string | null
          record_id?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string | null
          suggested_value?: string | null
          table_name?: string
        }
        Relationships: []
      }
      data_quality_metrics_daily: {
        Row: {
          avg_score: number | null
          created_at: string | null
          critical_issues_count: number | null
          date: string
          entity_type: string
          grade_a_count: number | null
          grade_b_count: number | null
          grade_c_count: number | null
          grade_d_count: number | null
          grade_f_count: number | null
          id: string
          total_entities: number
          warning_issues_count: number | null
        }
        Insert: {
          avg_score?: number | null
          created_at?: string | null
          critical_issues_count?: number | null
          date: string
          entity_type?: string
          grade_a_count?: number | null
          grade_b_count?: number | null
          grade_c_count?: number | null
          grade_d_count?: number | null
          grade_f_count?: number | null
          id?: string
          total_entities?: number
          warning_issues_count?: number | null
        }
        Update: {
          avg_score?: number | null
          created_at?: string | null
          critical_issues_count?: number | null
          date?: string
          entity_type?: string
          grade_a_count?: number | null
          grade_b_count?: number | null
          grade_c_count?: number | null
          grade_d_count?: number | null
          grade_f_count?: number | null
          id?: string
          total_entities?: number
          warning_issues_count?: number | null
        }
        Relationships: []
      }
      data_quality_scores: {
        Row: {
          breakdown: Json | null
          created_at: string | null
          entity_id: string
          entity_type: string
          grade: string
          id: string
          score: number
          updated_at: string | null
          validation_details: Json | null
        }
        Insert: {
          breakdown?: Json | null
          created_at?: string | null
          entity_id: string
          entity_type?: string
          grade: string
          id?: string
          score: number
          updated_at?: string | null
          validation_details?: Json | null
        }
        Update: {
          breakdown?: Json | null
          created_at?: string | null
          entity_id?: string
          entity_type?: string
          grade?: string
          id?: string
          score?: number
          updated_at?: string | null
          validation_details?: Json | null
        }
        Relationships: []
      }
      discovered_directories: {
        Row: {
          added_at: string
          created_at: string
          directory_description: string | null
          id: string
          is_sc_focused: boolean | null
          last_crawled_for_trucks_at: string | null
          last_validated_at: string | null
          name: string | null
          notes: string | null
          relevance_score: number | null
          status: string
          updated_at: string
          url: string
        }
        Insert: {
          added_at?: string
          created_at?: string
          directory_description?: string | null
          id?: string
          is_sc_focused?: boolean | null
          last_crawled_for_trucks_at?: string | null
          last_validated_at?: string | null
          name?: string | null
          notes?: string | null
          relevance_score?: number | null
          status?: string
          updated_at?: string
          url: string
        }
        Update: {
          added_at?: string
          created_at?: string
          directory_description?: string | null
          id?: string
          is_sc_focused?: boolean | null
          last_crawled_for_trucks_at?: string | null
          last_validated_at?: string | null
          name?: string | null
          notes?: string | null
          relevance_score?: number | null
          status?: string
          updated_at?: string
          url?: string
        }
        Relationships: []
      }
      discovered_urls: {
        Row: {
          confidence_score: number | null
          created_at: string | null
          id: string
          metadata: Json | null
          source: string | null
          status: string | null
          updated_at: string | null
          url: string
        }
        Insert: {
          confidence_score?: number | null
          created_at?: string | null
          id?: string
          metadata?: Json | null
          source?: string | null
          status?: string | null
          updated_at?: string | null
          url: string
        }
        Update: {
          confidence_score?: number | null
          created_at?: string | null
          id?: string
          metadata?: Json | null
          source?: string | null
          status?: string | null
          updated_at?: string | null
          url?: string
        }
        Relationships: []
      }
      event_applications: {
        Row: {
          cover_letter: string | null
          created_at: string | null
          event_id: string
          id: string
          is_saved: boolean
          payment_disclaimer_accepted: boolean
          proposed_menu: Json | null
          status: string | null
          truck_id: string
        }
        Insert: {
          cover_letter?: string | null
          created_at?: string | null
          event_id: string
          id?: string
          is_saved?: boolean
          payment_disclaimer_accepted?: boolean
          proposed_menu?: Json | null
          status?: string | null
          truck_id: string
        }
        Update: {
          cover_letter?: string | null
          created_at?: string | null
          event_id?: string
          id?: string
          is_saved?: boolean
          payment_disclaimer_accepted?: boolean
          proposed_menu?: Json | null
          status?: string | null
          truck_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_applications_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "eventfull_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_applications_truck_id_fkey"
            columns: ["truck_id"]
            isOneToOne: false
            referencedRelation: "food_trucks"
            referencedColumns: ["id"]
          },
        ]
      }
      event_documents: {
        Row: {
          document_type: string
          event_id: string
          file_url: string | null
          id: string
          notes: string | null
          uploaded_at: string | null
          verified: boolean | null
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          document_type: string
          event_id: string
          file_url?: string | null
          id?: string
          notes?: string | null
          uploaded_at?: string | null
          verified?: boolean | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          document_type?: string
          event_id?: string
          file_url?: string | null
          id?: string
          notes?: string | null
          uploaded_at?: string | null
          verified?: boolean | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "event_documents_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "eventfull_events"
            referencedColumns: ["id"]
          },
        ]
      }
      event_organizers: {
        Row: {
          business_name: string
          contact_email: string | null
          contact_phone: string | null
          created_at: string | null
          id: string
          rating_avg: number | null
          rating_count: number | null
          user_id: string | null
          verification_status: string | null
          verified_at: string | null
        }
        Insert: {
          business_name: string
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string | null
          id?: string
          rating_avg?: number | null
          rating_count?: number | null
          user_id?: string | null
          verification_status?: string | null
          verified_at?: string | null
        }
        Update: {
          business_name?: string
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string | null
          id?: string
          rating_avg?: number | null
          rating_count?: number | null
          user_id?: string | null
          verification_status?: string | null
          verified_at?: string | null
        }
        Relationships: []
      }
      event_waitlist: {
        Row: {
          created_at: string | null
          email: string
          id: string
          metadata: Json | null
          role: Database["public"]["Enums"]["event_waitlist_role"]
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          id?: string
          metadata?: Json | null
          role: Database["public"]["Enums"]["event_waitlist_role"]
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          id?: string
          metadata?: Json | null
          role?: Database["public"]["Enums"]["event_waitlist_role"]
          user_id?: string | null
        }
        Relationships: []
      }
      eventfull_events: {
        Row: {
          created_at: string | null
          description: string | null
          end_date: string | null
          fraud_flags: Json | null
          id: string
          location_data: Json | null
          max_vendors: number | null
          name: string
          organizer_id: string
          refund_requested_at: string | null
          requirements: string | null
          start_date: string | null
          status: string | null
          vendor_fee: number | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          end_date?: string | null
          fraud_flags?: Json | null
          id?: string
          location_data?: Json | null
          max_vendors?: number | null
          name: string
          organizer_id: string
          refund_requested_at?: string | null
          requirements?: string | null
          start_date?: string | null
          status?: string | null
          vendor_fee?: number | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          end_date?: string | null
          fraud_flags?: Json | null
          id?: string
          location_data?: Json | null
          max_vendors?: number | null
          name?: string
          organizer_id?: string
          refund_requested_at?: string | null
          requirements?: string | null
          start_date?: string | null
          status?: string | null
          vendor_fee?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "eventfull_events_organizer_id_fkey"
            columns: ["organizer_id"]
            isOneToOne: false
            referencedRelation: "event_organizers"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          created_at: string | null
          date: string
          description: string | null
          food_truck_id: string
          id: string
          location: string
          time: string
        }
        Insert: {
          created_at?: string | null
          date: string
          description?: string | null
          food_truck_id: string
          id?: string
          location: string
          time: string
        }
        Update: {
          created_at?: string | null
          date?: string
          description?: string | null
          food_truck_id?: string
          id?: string
          location?: string
          time?: string
        }
        Relationships: [
          {
            foreignKeyName: "events_food_truck_id_fkey"
            columns: ["food_truck_id"]
            isOneToOne: false
            referencedRelation: "food_trucks"
            referencedColumns: ["id"]
          },
        ]
      }
      external_events: {
        Row: {
          category: string | null
          city: string
          city_partition_guid: string | null
          community_shared_at: string | null
          description: string | null
          event_end_date: string | null
          event_end_time: string | null
          event_start_date: string | null
          event_start_time: string | null
          external_id: string
          id: string
          ingested_at: string | null
          is_canonical: boolean
          is_community_submitted: boolean | null
          is_food_truck_relevant: boolean | null
          location_address: string | null
          location_geog: unknown
          location_lat: number | null
          location_lng: number | null
          matched_keywords: string[] | null
          organization: string | null
          permit_end_date: string | null
          permit_end_time: string | null
          permit_start_date: string | null
          permit_start_time: string | null
          permit_status: string
          raw_data: Json | null
          relevance_classified_at: string | null
          relevance_confidence: number | null
          relevance_model: string | null
          relevance_reasoning: string | null
          relevance_review_needed: boolean | null
          relevance_review_decision: string | null
          relevance_reviewed_at: string | null
          relevance_reviewed_by: string | null
          relevance_score: number | null
          source: string
          source_partition: string | null
          source_type: string
          source_updated_at: string | null
          source_url: string | null
          state: string
          submitted_by: string | null
          title: string
          updated_at: string | null
          verification_badge: string | null
          verification_tier: number | null
          vetted_at: string | null
          vetting_location_type: string | null
          vetting_result: Json | null
          vetting_score: number | null
          vetting_version: number | null
          website: string | null
        }
        Insert: {
          category?: string | null
          city?: string
          city_partition_guid?: string | null
          community_shared_at?: string | null
          description?: string | null
          event_end_date?: string | null
          event_end_time?: string | null
          event_start_date?: string | null
          event_start_time?: string | null
          external_id: string
          id?: string
          ingested_at?: string | null
          is_canonical?: boolean
          is_community_submitted?: boolean | null
          is_food_truck_relevant?: boolean | null
          location_address?: string | null
          location_geog?: unknown
          location_lat?: number | null
          location_lng?: number | null
          matched_keywords?: string[] | null
          organization?: string | null
          permit_end_date?: string | null
          permit_end_time?: string | null
          permit_start_date?: string | null
          permit_start_time?: string | null
          permit_status?: string
          raw_data?: Json | null
          relevance_classified_at?: string | null
          relevance_confidence?: number | null
          relevance_model?: string | null
          relevance_reasoning?: string | null
          relevance_review_needed?: boolean | null
          relevance_review_decision?: string | null
          relevance_reviewed_at?: string | null
          relevance_reviewed_by?: string | null
          relevance_score?: number | null
          source: string
          source_partition?: string | null
          source_type: string
          source_updated_at?: string | null
          source_url?: string | null
          state?: string
          submitted_by?: string | null
          title: string
          updated_at?: string | null
          verification_badge?: string | null
          verification_tier?: number | null
          vetted_at?: string | null
          vetting_location_type?: string | null
          vetting_result?: Json | null
          vetting_score?: number | null
          vetting_version?: number | null
          website?: string | null
        }
        Update: {
          category?: string | null
          city?: string
          city_partition_guid?: string | null
          community_shared_at?: string | null
          description?: string | null
          event_end_date?: string | null
          event_end_time?: string | null
          event_start_date?: string | null
          event_start_time?: string | null
          external_id?: string
          id?: string
          ingested_at?: string | null
          is_community_submitted?: boolean | null
          is_food_truck_relevant?: boolean | null
          location_address?: string | null
          location_geog?: unknown
          location_lat?: number | null
          location_lng?: number | null
          matched_keywords?: string[] | null
          organization?: string | null
          permit_end_date?: string | null
          permit_end_time?: string | null
          permit_start_date?: string | null
          permit_start_time?: string | null
          permit_status?: string
          raw_data?: Json | null
          relevance_classified_at?: string | null
          relevance_confidence?: number | null
          relevance_model?: string | null
          relevance_reasoning?: string | null
          relevance_review_needed?: boolean | null
          relevance_review_decision?: string | null
          relevance_reviewed_at?: string | null
          relevance_reviewed_by?: string | null
          relevance_score?: number | null
          source?: string
          source_partition?: string | null
          source_type?: string
          source_updated_at?: string | null
          source_url?: string | null
          state?: string
          submitted_by?: string | null
          title?: string
          updated_at?: string | null
          verification_badge?: string | null
          verification_tier?: number | null
          vetted_at?: string | null
          vetting_location_type?: string | null
          vetting_result?: Json | null
          vetting_score?: number | null
          vetting_version?: number | null
          website?: string | null
        }
        Relationships: []
      }
      external_events_sync_log: {
        Row: {
          last_synced_at: string
          source: string
        }
        Insert: {
          last_synced_at?: string
          source: string
        }
        Update: {
          last_synced_at?: string
          source?: string
        }
        Relationships: []
      }
      facebook_business_tokens: {
        Row: {
          created_at: string
          data_access_expires_at: string | null
          encrypted_access_token: string
          encrypted_refresh_token: string | null
          facebook_app_id: string
          facebook_user_id: string
          granted_scopes: string[]
          id: string
          last_refreshed_at: string | null
          token_expires_at: string | null
          token_type: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          data_access_expires_at?: string | null
          encrypted_access_token: string
          encrypted_refresh_token?: string | null
          facebook_app_id: string
          facebook_user_id: string
          granted_scopes?: string[]
          id?: string
          last_refreshed_at?: string | null
          token_expires_at?: string | null
          token_type?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          data_access_expires_at?: string | null
          encrypted_access_token?: string
          encrypted_refresh_token?: string | null
          facebook_app_id?: string
          facebook_user_id?: string
          granted_scopes?: string[]
          id?: string
          last_refreshed_at?: string | null
          token_expires_at?: string | null
          token_type?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      facebook_pages: {
        Row: {
          cached_at: string
          category: string | null
          cover_url: string | null
          created_at: string
          description: string | null
          expires_at: string
          facebook_page_id: string
          id: string
          is_active: boolean | null
          last_synced_at: string | null
          page_access_token: string
          page_name: string
          picture_url: string | null
          tasks: string[] | null
          updated_at: string
          user_id: string
        }
        Insert: {
          cached_at?: string
          category?: string | null
          cover_url?: string | null
          created_at?: string
          description?: string | null
          expires_at?: string
          facebook_page_id: string
          id?: string
          is_active?: boolean | null
          last_synced_at?: string | null
          page_access_token: string
          page_name: string
          picture_url?: string | null
          tasks?: string[] | null
          updated_at?: string
          user_id: string
        }
        Update: {
          cached_at?: string
          category?: string | null
          cover_url?: string | null
          created_at?: string
          description?: string | null
          expires_at?: string
          facebook_page_id?: string
          id?: string
          is_active?: boolean | null
          last_synced_at?: string | null
          page_access_token?: string
          page_name?: string
          picture_url?: string | null
          tasks?: string[] | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      facebook_post_confirmations: {
        Row: {
          confirmed_at: string | null
          created_at: string
          expires_at: string
          facebook_post_id: string
          id: string
          low_confidence_reason: string | null
          proposed_data: Json
          status: string
          truck_id: string
          update_type: string
          updated_at: string
        }
        Insert: {
          confirmed_at?: string | null
          created_at?: string
          expires_at: string
          facebook_post_id: string
          id?: string
          low_confidence_reason?: string | null
          proposed_data: Json
          status?: string
          truck_id: string
          update_type: string
          updated_at?: string
        }
        Update: {
          confirmed_at?: string | null
          created_at?: string
          expires_at?: string
          facebook_post_id?: string
          id?: string
          low_confidence_reason?: string | null
          proposed_data?: Json
          status?: string
          truck_id?: string
          update_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "facebook_post_confirmations_facebook_post_id_fkey"
            columns: ["facebook_post_id"]
            isOneToOne: false
            referencedRelation: "facebook_posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "facebook_post_confirmations_truck_id_fkey"
            columns: ["truck_id"]
            isOneToOne: false
            referencedRelation: "food_trucks"
            referencedColumns: ["id"]
          },
        ]
      }
      facebook_posts: {
        Row: {
          attachments: Json | null
          confidence: number | null
          created_at: string | null
          created_time: string
          facebook_post_id: string
          id: string
          message: string | null
          processed_at: string | null
          processed_reason: string | null
          processing_started_at: string | null
          raw_payload: string | null
          raw_text: string | null
          repair_metadata: Json | null
          repair_status: string | null
          repaired_payload: Json | null
          source: string | null
          status: string | null
          truck_id: string
          updated_at: string | null
        }
        Insert: {
          attachments?: Json | null
          confidence?: number | null
          created_at?: string | null
          created_time: string
          facebook_post_id: string
          id?: string
          message?: string | null
          processed_at?: string | null
          processed_reason?: string | null
          processing_started_at?: string | null
          raw_payload?: string | null
          raw_text?: string | null
          repair_metadata?: Json | null
          repair_status?: string | null
          repaired_payload?: Json | null
          source?: string | null
          status?: string | null
          truck_id: string
          updated_at?: string | null
        }
        Update: {
          attachments?: Json | null
          confidence?: number | null
          created_at?: string | null
          created_time?: string
          facebook_post_id?: string
          id?: string
          message?: string | null
          processed_at?: string | null
          processed_reason?: string | null
          processing_started_at?: string | null
          raw_payload?: string | null
          raw_text?: string | null
          repair_metadata?: Json | null
          repair_status?: string | null
          repaired_payload?: Json | null
          source?: string | null
          status?: string | null
          truck_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "facebook_posts_truck_id_fkey"
            columns: ["truck_id"]
            isOneToOne: false
            referencedRelation: "food_trucks"
            referencedColumns: ["id"]
          },
        ]
      }
      facebook_webhook_events: {
        Row: {
          created_at: string | null
          event_type: string
          id: string
          payload: Json | null
          processing_time_ms: number | null
          response_body: string | null
          response_status: number | null
          webhook_id: string
        }
        Insert: {
          created_at?: string | null
          event_type: string
          id?: string
          payload?: Json | null
          processing_time_ms?: number | null
          response_body?: string | null
          response_status?: number | null
          webhook_id: string
        }
        Update: {
          created_at?: string | null
          event_type?: string
          id?: string
          payload?: Json | null
          processing_time_ms?: number | null
          response_body?: string | null
          response_status?: number | null
          webhook_id?: string
        }
        Relationships: []
      }
      failed_notifications: {
        Row: {
          attempts: number | null
          created_at: string | null
          error_message: string
          id: string
          processed: boolean | null
          sent_at: string | null
          token_hash: string
        }
        Insert: {
          attempts?: number | null
          created_at?: string | null
          error_message: string
          id?: string
          processed?: boolean | null
          sent_at?: string | null
          token_hash: string
        }
        Update: {
          attempts?: number | null
          created_at?: string | null
          error_message?: string
          id?: string
          processed?: boolean | null
          sent_at?: string | null
          token_hash?: string
        }
        Relationships: []
      }
      fcm_tokens: {
        Row: {
          active: boolean | null
          created_at: string | null
          device_type: string | null
          id: string
          last_seen: string | null
          token: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          active?: boolean | null
          created_at?: string | null
          device_type?: string | null
          id?: string
          last_seen?: string | null
          token: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          active?: boolean | null
          created_at?: string | null
          device_type?: string | null
          id?: string
          last_seen?: string | null
          token?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      food_truck_schedules: {
        Row: {
          created_at: string | null
          day_of_week: string
          end_time: string
          food_truck_id: string
          id: string
          is_recurring: boolean | null
          location: string | null
          start_time: string
        }
        Insert: {
          created_at?: string | null
          day_of_week: string
          end_time: string
          food_truck_id: string
          id?: string
          is_recurring?: boolean | null
          location?: string | null
          start_time: string
        }
        Update: {
          created_at?: string | null
          day_of_week?: string
          end_time?: string
          food_truck_id?: string
          id?: string
          is_recurring?: boolean | null
          location?: string | null
          start_time?: string
        }
        Relationships: [
          {
            foreignKeyName: "food_truck_schedules_food_truck_id_fkey"
            columns: ["food_truck_id"]
            isOneToOne: false
            referencedRelation: "food_trucks"
            referencedColumns: ["id"]
          },
        ]
      }
      food_trucks: {
        Row: {
          admin_notes: string | null
          average_rating: number | null
          city: string | null
          claim_verification_method: string | null
          claimed_at: string | null
          claimed_by: string | null
          contact_info: Json | null
          created_at: string | null
          cuisine_type: string[] | null
          current_location: Json | null
          data_quality_score: number | null
          default_lat: number | null
          default_lng: number | null
          default_location: Json | null
          description: string | null
          facebook_auto_updates_enabled: boolean | null
          facebook_last_sync: string | null
          facebook_page_id: string | null
          facebook_page_name: string | null
          facebook_webhook_enabled: boolean | null
          id: string
          is_active: boolean | null
          is_claimed: boolean | null
          last_synced_at: string | null
          live_gps_accuracy: number | null
          live_gps_lat: number | null
          live_gps_lng: number | null
          live_gps_timestamp: string | null
          live_location: Json | null
          location_geog: unknown
          location_updated_at: string | null
          location_updated_by: string | null
          menu: Json | null
          menu_updated_at: string | null
          menu_updated_by: string | null
          name: string
          operating_hours: Json | null
          owner_id: string | null
          price_range: string | null
          review_count: number | null
          review_status: string | null
          schedule_updated_at: string | null
          schedule_updated_by: string | null
          scheduled_locations: Json | null
          slug: string | null
          social_media: Json | null
          source_url: string | null
          specialties: string[] | null
          state: string | null
          status: string | null
          street_address: string | null
          timezone: string | null
          updated_at: string | null
          verification_documents: Json | null
          verification_notes: string | null
          verification_requested_at: string | null
          verification_status: string | null
          verified_at: string | null
          verified_by: string | null
          view_count: number | null
          zip: string | null
        }
        Insert: {
          admin_notes?: string | null
          average_rating?: number | null
          city?: string | null
          claim_verification_method?: string | null
          claimed_at?: string | null
          claimed_by?: string | null
          contact_info?: Json | null
          created_at?: string | null
          cuisine_type?: string[] | null
          current_location?: Json | null
          data_quality_score?: number | null
          default_lat?: number | null
          default_lng?: number | null
          default_location?: Json | null
          description?: string | null
          facebook_auto_updates_enabled?: boolean | null
          facebook_last_sync?: string | null
          facebook_page_id?: string | null
          facebook_page_name?: string | null
          facebook_webhook_enabled?: boolean | null
          id?: string
          is_active?: boolean | null
          is_claimed?: boolean | null
          last_synced_at?: string | null
          live_gps_accuracy?: number | null
          live_gps_lat?: number | null
          live_gps_lng?: number | null
          live_gps_timestamp?: string | null
          live_location?: Json | null
          location_geog?: unknown
          location_updated_at?: string | null
          location_updated_by?: string | null
          menu?: Json | null
          menu_updated_at?: string | null
          menu_updated_by?: string | null
          name: string
          operating_hours?: Json | null
          owner_id?: string | null
          price_range?: string | null
          review_count?: number | null
          review_status?: string | null
          schedule_updated_at?: string | null
          schedule_updated_by?: string | null
          scheduled_locations?: Json | null
          slug?: string | null
          social_media?: Json | null
          source_url?: string | null
          specialties?: string[] | null
          state?: string | null
          status?: string | null
          street_address?: string | null
          timezone?: string | null
          updated_at?: string | null
          verification_documents?: Json | null
          verification_notes?: string | null
          verification_requested_at?: string | null
          verification_status?: string | null
          verified_at?: string | null
          verified_by?: string | null
          view_count?: number | null
          zip?: string | null
        }
        Update: {
          admin_notes?: string | null
          average_rating?: number | null
          city?: string | null
          claim_verification_method?: string | null
          claimed_at?: string | null
          claimed_by?: string | null
          contact_info?: Json | null
          created_at?: string | null
          cuisine_type?: string[] | null
          current_location?: Json | null
          data_quality_score?: number | null
          default_lat?: number | null
          default_lng?: number | null
          default_location?: Json | null
          description?: string | null
          facebook_auto_updates_enabled?: boolean | null
          facebook_last_sync?: string | null
          facebook_page_id?: string | null
          facebook_page_name?: string | null
          facebook_webhook_enabled?: boolean | null
          id?: string
          is_active?: boolean | null
          is_claimed?: boolean | null
          last_synced_at?: string | null
          live_gps_accuracy?: number | null
          live_gps_lat?: number | null
          live_gps_lng?: number | null
          live_gps_timestamp?: string | null
          live_location?: Json | null
          location_geog?: unknown
          location_updated_at?: string | null
          location_updated_by?: string | null
          menu?: Json | null
          menu_updated_at?: string | null
          menu_updated_by?: string | null
          name?: string
          operating_hours?: Json | null
          owner_id?: string | null
          price_range?: string | null
          review_count?: number | null
          review_status?: string | null
          schedule_updated_at?: string | null
          schedule_updated_by?: string | null
          scheduled_locations?: Json | null
          slug?: string | null
          social_media?: Json | null
          source_url?: string | null
          specialties?: string[] | null
          state?: string | null
          status?: string | null
          street_address?: string | null
          timezone?: string | null
          updated_at?: string | null
          verification_documents?: Json | null
          verification_notes?: string | null
          verification_requested_at?: string | null
          verification_status?: string | null
          verified_at?: string | null
          verified_by?: string | null
          view_count?: number | null
          zip?: string | null
        }
        Relationships: []
      }
      foot_traffic_cache: {
        Row: {
          data: Json
          fetched_at: string | null
          id: string
          place_id: string
          venue_address: string | null
          venue_name: string | null
        }
        Insert: {
          data: Json
          fetched_at?: string | null
          id?: string
          place_id: string
          venue_address?: string | null
          venue_name?: string | null
        }
        Update: {
          data?: Json
          fetched_at?: string | null
          id?: string
          place_id?: string
          venue_address?: string | null
          venue_name?: string | null
        }
        Relationships: []
      }
      founding_members: {
        Row: {
          claimed_at: string
          profile_id: string
        }
        Insert: {
          claimed_at?: string
          profile_id: string
        }
        Update: {
          claimed_at?: string
          profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "founding_members_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      geo_view_analytics: {
        Row: {
          country: string
          id: string
          region: string | null
          view_count: number | null
          view_date: string
        }
        Insert: {
          country: string
          id?: string
          region?: string | null
          view_count?: number | null
          view_date?: string
        }
        Update: {
          country?: string
          id?: string
          region?: string | null
          view_count?: number | null
          view_date?: string
        }
        Relationships: []
      }
      geocoding_failures: {
        Row: {
          address: string
          attempt_count: number | null
          cleaned_address: string | null
          created_at: string | null
          failure_reason: string
          id: string
          last_attempt_at: string | null
          resolution_method: string | null
          resolution_notes: string | null
          resolved_at: string | null
          resolved_lat: number | null
          resolved_lng: number | null
          updated_at: string | null
        }
        Insert: {
          address: string
          attempt_count?: number | null
          cleaned_address?: string | null
          created_at?: string | null
          failure_reason: string
          id?: string
          last_attempt_at?: string | null
          resolution_method?: string | null
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_lat?: number | null
          resolved_lng?: number | null
          updated_at?: string | null
        }
        Update: {
          address?: string
          attempt_count?: number | null
          cleaned_address?: string | null
          created_at?: string | null
          failure_reason?: string
          id?: string
          last_attempt_at?: string | null
          resolution_method?: string | null
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_lat?: number | null
          resolved_lng?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      hotspot_reservations: {
        Row: {
          hotspot_id: string
          id: string
          released_at: string | null
          reserved_at: string
          reserved_until: string
          status: string
          truck_id: string
        }
        Insert: {
          hotspot_id: string
          id?: string
          released_at?: string | null
          reserved_at?: string
          reserved_until: string
          status?: string
          truck_id: string
        }
        Update: {
          hotspot_id?: string
          id?: string
          released_at?: string | null
          reserved_at?: string
          reserved_until?: string
          status?: string
          truck_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "hotspot_reservations_hotspot_id_fkey"
            columns: ["hotspot_id"]
            isOneToOne: false
            referencedRelation: "hotspots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hotspot_reservations_truck_id_fkey"
            columns: ["truck_id"]
            isOneToOne: false
            referencedRelation: "food_trucks"
            referencedColumns: ["id"]
          },
        ]
      }
      hotspots: {
        Row: {
          businesses_nearby: Json | null
          description: string | null
          discovery_time: string
          expires_at: string | null
          id: string
          is_active: boolean | null
          last_updated: string
          lat: number
          lng: number
          location_geog: unknown
          source: string | null
          traffic_score: number
        }
        Insert: {
          businesses_nearby?: Json | null
          description?: string | null
          discovery_time?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          last_updated?: string
          lat: number
          lng: number
          location_geog?: unknown
          source?: string | null
          traffic_score: number
        }
        Update: {
          businesses_nearby?: Json | null
          description?: string | null
          discovery_time?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          last_updated?: string
          lat?: number
          lng?: number
          location_geog?: unknown
          source?: string | null
          traffic_score?: number
        }
        Relationships: []
      }
      known_locations: {
        Row: {
          aliases: string[] | null
          city: string
          created_at: string
          id: string
          lat: number
          lng: number
          name: string
          state: string
          type: string
          updated_at: string
        }
        Insert: {
          aliases?: string[] | null
          city?: string
          created_at?: string
          id?: string
          lat: number
          lng: number
          name: string
          state?: string
          type: string
          updated_at?: string
        }
        Update: {
          aliases?: string[] | null
          city?: string
          created_at?: string
          id?: string
          lat?: number
          lng?: number
          name?: string
          state?: string
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      location_history: {
        Row: {
          confidence: number | null
          created_at: string | null
          id: string
          location_data: Json
          source: string | null
          source_post_id: string | null
          status: string | null
          truck_id: string
          updated_at: string | null
          version: number
        }
        Insert: {
          confidence?: number | null
          created_at?: string | null
          id?: string
          location_data: Json
          source?: string | null
          source_post_id?: string | null
          status?: string | null
          truck_id: string
          updated_at?: string | null
          version: number
        }
        Update: {
          confidence?: number | null
          created_at?: string | null
          id?: string
          location_data?: Json
          source?: string | null
          source_post_id?: string | null
          status?: string | null
          truck_id?: string
          updated_at?: string | null
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "location_history_truck_id_fkey"
            columns: ["truck_id"]
            isOneToOne: false
            referencedRelation: "food_trucks"
            referencedColumns: ["id"]
          },
        ]
      }
      menu_items: {
        Row: {
          category: string | null
          created_at: string | null
          description: string | null
          dietary_info: string[] | null
          food_truck_id: string
          id: string
          is_popular: boolean | null
          name: string
          photo_url: string | null
          price: number | null
          updated_at: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          dietary_info?: string[] | null
          food_truck_id: string
          id?: string
          is_popular?: boolean | null
          name: string
          photo_url?: string | null
          price?: number | null
          updated_at?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          dietary_info?: string[] | null
          food_truck_id?: string
          id?: string
          is_popular?: boolean | null
          name?: string
          photo_url?: string | null
          price?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "menu_items_food_truck_id_fkey"
            columns: ["food_truck_id"]
            isOneToOne: false
            referencedRelation: "food_trucks"
            referencedColumns: ["id"]
          },
        ]
      }
      organizer_reviews: {
        Row: {
          comment: string | null
          created_at: string | null
          event_id: string
          id: string
          organizer_id: string
          rating: number
          reviewer_id: string
        }
        Insert: {
          comment?: string | null
          created_at?: string | null
          event_id: string
          id?: string
          organizer_id: string
          rating: number
          reviewer_id: string
        }
        Update: {
          comment?: string | null
          created_at?: string | null
          event_id?: string
          id?: string
          organizer_id?: string
          rating?: number
          reviewer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "organizer_reviews_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "eventfull_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organizer_reviews_organizer_id_fkey"
            columns: ["organizer_id"]
            isOneToOne: false
            referencedRelation: "event_organizers"
            referencedColumns: ["id"]
          },
        ]
      }
      parsed_facebook_posts: {
        Row: {
          confidence: number
          created_at: string | null
          facebook_post_id: string
          food_items: Json
          id: string
          location_data: Json
          model_used: string
          parsing_time_ms: number | null
          prices: Json | null
          time_data: Json | null
          updated_at: string | null
        }
        Insert: {
          confidence: number
          created_at?: string | null
          facebook_post_id: string
          food_items: Json
          id?: string
          location_data: Json
          model_used: string
          parsing_time_ms?: number | null
          prices?: Json | null
          time_data?: Json | null
          updated_at?: string | null
        }
        Update: {
          confidence?: number
          created_at?: string | null
          facebook_post_id?: string
          food_items?: Json
          id?: string
          location_data?: Json
          model_used?: string
          parsing_time_ms?: number | null
          prices?: Json | null
          time_data?: Json | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "parsed_facebook_posts_facebook_post_id_fkey"
            columns: ["facebook_post_id"]
            isOneToOne: true
            referencedRelation: "facebook_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      pending_invites: {
        Row: {
          accepted_at: string | null
          accepted_by: string | null
          created_at: string | null
          email: string
          expires_at: string
          id: string
          invited_by: string | null
          token: string
          truck_id: string | null
        }
        Insert: {
          accepted_at?: string | null
          accepted_by?: string | null
          created_at?: string | null
          email: string
          expires_at: string
          id?: string
          invited_by?: string | null
          token: string
          truck_id?: string | null
        }
        Update: {
          accepted_at?: string | null
          accepted_by?: string | null
          created_at?: string | null
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string | null
          token?: string
          truck_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pending_invites_truck_id_fkey"
            columns: ["truck_id"]
            isOneToOne: false
            referencedRelation: "food_trucks"
            referencedColumns: ["id"]
          },
        ]
      }
      pending_updates: {
        Row: {
          category: string
          created_at: string
          id: string
          new_value: Json | null
          old_value: Json | null
          reviewed_at: string | null
          reviewed_by: string | null
          risk_level: string | null
          risk_score: number | null
          source: string | null
          status: string
          submitted_by: string | null
          truck_id: string
          updated_at: string | null
        }
        Insert: {
          category: string
          created_at?: string
          id?: string
          new_value?: Json | null
          old_value?: Json | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          risk_level?: string | null
          risk_score?: number | null
          source?: string | null
          status?: string
          submitted_by?: string | null
          truck_id: string
          updated_at?: string | null
        }
        Update: {
          category?: string
          created_at?: string
          id?: string
          new_value?: Json | null
          old_value?: Json | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          risk_level?: string | null
          risk_score?: number | null
          source?: string | null
          status?: string
          submitted_by?: string | null
          truck_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pending_updates_truck_id_fkey"
            columns: ["truck_id"]
            isOneToOne: false
            referencedRelation: "food_trucks"
            referencedColumns: ["id"]
          },
        ]
      }
      pipeline_metadata: {
        Row: {
          created_at: string
          event_name: string
          last_run_at: string | null
          notes: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          event_name: string
          last_run_at?: string | null
          notes?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          event_name?: string
          last_run_at?: string | null
          notes?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      pipeline_metrics: {
        Row: {
          created_at: string | null
          id: string
          job_id: string | null
          metadata: Json | null
          metric_type: string
          metric_value: number | null
          pipeline_stage: string | null
          table_name: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          job_id?: string | null
          metadata?: Json | null
          metric_type: string
          metric_value?: number | null
          pipeline_stage?: string | null
          table_name?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          job_id?: string | null
          metadata?: Json | null
          metric_type?: string
          metric_value?: number | null
          pipeline_stage?: string | null
          table_name?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          email: string | null
          full_name: string | null
          id: string
          location_geog: unknown
          role: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          subscription_ends_at: string | null
          subscription_started_at: string | null
          subscription_tier: string
          updated_at: string | null
          username: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id: string
          location_geog?: unknown
          role?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_ends_at?: string | null
          subscription_started_at?: string | null
          subscription_tier?: string
          updated_at?: string | null
          username?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          location_geog?: unknown
          role?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_ends_at?: string | null
          subscription_started_at?: string | null
          subscription_tier?: string
          updated_at?: string | null
          username?: string | null
        }
        Relationships: []
      }
      quarantine_errors: {
        Row: {
          created_at: string | null
          error_count: number | null
          error_details: Json
          id: string
          is_resolved: boolean | null
          job_id: string | null
          max_retries: number | null
          raw_payload: Json
          record_id: string | null
          resolved_at: string | null
          resolved_by: string | null
          retry_count: number | null
          schema_name: string | null
          source_url: string | null
          table_name: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          error_count?: number | null
          error_details: Json
          id?: string
          is_resolved?: boolean | null
          job_id?: string | null
          max_retries?: number | null
          raw_payload: Json
          record_id?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          retry_count?: number | null
          schema_name?: string | null
          source_url?: string | null
          table_name: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          error_count?: number | null
          error_details?: Json
          id?: string
          is_resolved?: boolean | null
          job_id?: string | null
          max_retries?: number | null
          raw_payload?: Json
          record_id?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          retry_count?: number | null
          schema_name?: string | null
          source_url?: string | null
          table_name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      research_feedback: {
        Row: {
          comment: string | null
          created_at: string | null
          event_id: string
          feedback: string
          id: string
          user_id: string
        }
        Insert: {
          comment?: string | null
          created_at?: string | null
          event_id: string
          feedback: string
          id?: string
          user_id: string
        }
        Update: {
          comment?: string | null
          created_at?: string | null
          event_id?: string
          feedback?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "research_feedback_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "external_events"
            referencedColumns: ["id"]
          },
        ]
      }
      research_jobs: {
        Row: {
          completed_at: string | null
          created_at: string | null
          error_message: string | null
          id: string
          input_text: string
          progress_step: string | null
          result_json: Json | null
          share_with_community: boolean | null
          source_event_id: string | null
          started_at: string | null
          status: string | null
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          input_text: string
          progress_step?: string | null
          result_json?: Json | null
          share_with_community?: boolean | null
          source_event_id?: string | null
          started_at?: string | null
          status?: string | null
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          input_text?: string
          progress_step?: string | null
          result_json?: Json | null
          share_with_community?: boolean | null
          source_event_id?: string | null
          started_at?: string | null
          status?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "research_jobs_source_event_id_fkey"
            columns: ["source_event_id"]
            isOneToOne: false
            referencedRelation: "external_events"
            referencedColumns: ["id"]
          },
        ]
      }
      reviews: {
        Row: {
          created_at: string | null
          food_truck_id: string
          id: string
          is_verified: boolean | null
          rating: number
          review_text: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          food_truck_id: string
          id?: string
          is_verified?: boolean | null
          rating: number
          review_text?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          food_truck_id?: string
          id?: string
          is_verified?: boolean | null
          rating?: number
          review_text?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reviews_food_truck_id_fkey"
            columns: ["food_truck_id"]
            isOneToOne: false
            referencedRelation: "food_trucks"
            referencedColumns: ["id"]
          },
        ]
      }
      saved_external_leads: {
        Row: {
          created_at: string
          event_id: string
          id: string
          truck_id: string
        }
        Insert: {
          created_at?: string
          event_id: string
          id?: string
          truck_id: string
        }
        Update: {
          created_at?: string
          event_id?: string
          id?: string
          truck_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_external_leads_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "external_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "saved_external_leads_truck_id_fkey"
            columns: ["truck_id"]
            isOneToOne: false
            referencedRelation: "food_trucks"
            referencedColumns: ["id"]
          },
        ]
      }
      security_events: {
        Row: {
          created_at: string
          event_type: string
          id: string
          ip_address: unknown
          metadata: Json | null
          resource: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          event_type: string
          id?: string
          ip_address?: unknown
          metadata?: Json | null
          resource?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
          ip_address?: unknown
          metadata?: Json | null
          resource?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      sources: {
        Row: {
          cadence_cron: string | null
          created_at: string
          fallback: string | null
          id: string
          last_run_at: string | null
          name: string | null
          owner: string
          parser_version: string | null
          status: string | null
          tags: string[] | null
          updated_at: string
          url: string
        }
        Insert: {
          cadence_cron?: string | null
          created_at?: string
          fallback?: string | null
          id?: string
          last_run_at?: string | null
          name?: string | null
          owner?: string
          parser_version?: string | null
          status?: string | null
          tags?: string[] | null
          updated_at?: string
          url: string
        }
        Update: {
          cadence_cron?: string | null
          created_at?: string
          fallback?: string | null
          id?: string
          last_run_at?: string | null
          name?: string | null
          owner?: string
          parser_version?: string | null
          status?: string | null
          tags?: string[] | null
          updated_at?: string
          url?: string
        }
        Relationships: []
      }
      stripe_webhook_events: {
        Row: {
          created_at: string
          data: Json
          error_message: string | null
          id: string
          processed_at: string
          processing_duration_ms: number | null
          status: string
          type: string
        }
        Insert: {
          created_at?: string
          data: Json
          error_message?: string | null
          id: string
          processed_at?: string
          processing_duration_ms?: number | null
          status: string
          type: string
        }
        Update: {
          created_at?: string
          data?: Json
          error_message?: string | null
          id?: string
          processed_at?: string
          processing_duration_ms?: number | null
          status?: string
          type?: string
        }
        Relationships: []
      }
      subscription_history: {
        Row: {
          changed_at: string | null
          from_tier: string | null
          id: string
          notes: string | null
          stripe_invoice_id: string | null
          to_tier: string
          user_id: string | null
        }
        Insert: {
          changed_at?: string | null
          from_tier?: string | null
          id?: string
          notes?: string | null
          stripe_invoice_id?: string | null
          to_tier: string
          user_id?: string | null
        }
        Update: {
          changed_at?: string | null
          from_tier?: string | null
          id?: string
          notes?: string | null
          stripe_invoice_id?: string | null
          to_tier?: string
          user_id?: string | null
        }
        Relationships: []
      }
      traffic_nodes: {
        Row: {
          aadt: number
          county_code: number | null
          county_name: string | null
          created_at: string | null
          id: string
          is_accessible: boolean | null
          lat: number
          lng: number
          location_description: string | null
          location_geog: unknown
          route_designation: string | null
          route_number: string | null
          score_percentile: number | null
          source: string | null
          state_code: string
          station_id: string
          updated_at: string | null
          year_count: number | null
        }
        Insert: {
          aadt: number
          county_code?: number | null
          county_name?: string | null
          created_at?: string | null
          id?: string
          is_accessible?: boolean | null
          lat: number
          lng: number
          location_description?: string | null
          location_geog?: unknown
          route_designation?: string | null
          route_number?: string | null
          score_percentile?: number | null
          source?: string | null
          state_code: string
          station_id: string
          updated_at?: string | null
          year_count?: number | null
        }
        Update: {
          aadt?: number
          county_code?: number | null
          county_name?: string | null
          created_at?: string | null
          id?: string
          is_accessible?: boolean | null
          lat?: number
          lng?: number
          location_description?: string | null
          location_geog?: unknown
          route_designation?: string | null
          route_number?: string | null
          score_percentile?: number | null
          source?: string | null
          state_code?: string
          station_id?: string
          updated_at?: string | null
          year_count?: number | null
        }
        Relationships: []
      }
      truck_blocklist: {
        Row: {
          created_at: string | null
          created_by: string | null
          facebook_url: string | null
          id: string
          instagram_handle: string | null
          name_pattern: string | null
          normalized_name: string | null
          notes: string | null
          original_truck_id: string | null
          phone: string | null
          reason: Database["public"]["Enums"]["blocklist_reason"]
          website_url: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          facebook_url?: string | null
          id?: string
          instagram_handle?: string | null
          name_pattern?: string | null
          normalized_name?: string | null
          notes?: string | null
          original_truck_id?: string | null
          phone?: string | null
          reason: Database["public"]["Enums"]["blocklist_reason"]
          website_url?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          facebook_url?: string | null
          id?: string
          instagram_handle?: string | null
          name_pattern?: string | null
          normalized_name?: string | null
          notes?: string | null
          original_truck_id?: string | null
          phone?: string | null
          reason?: Database["public"]["Enums"]["blocklist_reason"]
          website_url?: string | null
        }
        Relationships: []
      }
      user_favorites: {
        Row: {
          created_at: string
          food_truck_id: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          food_truck_id: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          food_truck_id?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_favorites_food_truck_id_fkey"
            columns: ["food_truck_id"]
            isOneToOne: false
            referencedRelation: "food_trucks"
            referencedColumns: ["id"]
          },
        ]
      }
      user_notification_settings: {
        Row: {
          created_at: string | null
          id: string
          notify_me: boolean | null
          notify_when_moving: boolean | null
          notify_when_nearby: boolean | null
          notify_when_opening: boolean | null
          truck_id: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          notify_me?: boolean | null
          notify_when_moving?: boolean | null
          notify_when_nearby?: boolean | null
          notify_when_opening?: boolean | null
          truck_id?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          notify_me?: boolean | null
          notify_when_moving?: boolean | null
          notify_when_nearby?: boolean | null
          notify_when_opening?: boolean | null
          truck_id?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_notification_settings_truck_id_fkey"
            columns: ["truck_id"]
            isOneToOne: false
            referencedRelation: "food_trucks"
            referencedColumns: ["id"]
          },
        ]
      }
      validation_logs: {
        Row: {
          code: string
          context: string | null
          error_id: string
          expires_at: string
          id: string
          message: string
          metadata: Json | null
          path: string[]
          session_id: string | null
          severity: string
          timestamp: string
          user_id: string | null
        }
        Insert: {
          code: string
          context?: string | null
          error_id: string
          expires_at: string
          id?: string
          message: string
          metadata?: Json | null
          path: string[]
          session_id?: string | null
          severity: string
          timestamp?: string
          user_id?: string | null
        }
        Update: {
          code?: string
          context?: string | null
          error_id?: string
          expires_at?: string
          id?: string
          message?: string
          metadata?: Json | null
          path?: string[]
          session_id?: string | null
          severity?: string
          timestamp?: string
          user_id?: string | null
        }
        Relationships: []
      }
      validation_schemas: {
        Row: {
          created_at: string | null
          id: number
          json_schema: Json
          schema_name: string
          updated_at: string | null
          version: string | null
        }
        Insert: {
          created_at?: string | null
          id?: number
          json_schema: Json
          schema_name: string
          updated_at?: string | null
          version?: string | null
        }
        Update: {
          created_at?: string | null
          id?: number
          json_schema?: Json
          schema_name?: string
          updated_at?: string | null
          version?: string | null
        }
        Relationships: []
      }
      venue_location_cache: {
        Row: {
          address: string | null
          city: string
          created_at: string
          hit_count: number
          last_geocoded_at: string
          lat: number
          lng: number
          source: string
          state: string
          venue_key: string
          venue_name: string
        }
        Insert: {
          address?: string | null
          city: string
          created_at?: string
          hit_count?: number
          last_geocoded_at?: string
          lat: number
          lng: number
          source?: string
          state: string
          venue_key: string
          venue_name: string
        }
        Update: {
          address?: string | null
          city?: string
          created_at?: string
          hit_count?: number
          last_geocoded_at?: string
          lat?: number
          lng?: number
          source?: string
          state?: string
          venue_key?: string
          venue_name?: string
        }
        Relationships: []
      }
      waitlist: {
        Row: {
          country: string | null
          created_at: string | null
          email: string
          id: string
          region: string | null
        }
        Insert: {
          country?: string | null
          created_at?: string | null
          email: string
          id?: string
          region?: string | null
        }
        Update: {
          country?: string | null
          created_at?: string | null
          email?: string
          id?: string
          region?: string | null
        }
        Relationships: []
      }
      web_vitals_metrics: {
        Row: {
          id: string
          metric_name: string
          metric_value: number
          page_url: string
          rating: string
          recorded_at: string
          user_agent: string
        }
        Insert: {
          id?: string
          metric_name: string
          metric_value: number
          page_url: string
          rating: string
          recorded_at?: string
          user_agent: string
        }
        Update: {
          id?: string
          metric_name?: string
          metric_value?: number
          page_url?: string
          rating?: string
          recorded_at?: string
          user_agent?: string
        }
        Relationships: []
      }
      slug_redirects: {
        Row: {
          id: string
          from_slug: string
          to_slug: string
          created_at: string
        }
        Insert: {
          id?: string
          from_slug: string
          to_slug: string
          created_at?: string
        }
        Update: {
          id?: string
          from_slug?: string
          to_slug?: string
          created_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      favorite_trucks: {
        Row: {
          average_rating: number | null
          contact_info: Json | null
          created_at: string | null
          cuisine_type: string[] | null
          current_location: Json | null
          data_quality_score: number | null
          food_truck_id: string | null
          id: string | null
          is_claimed: boolean | null
          name: string | null
          review_count: number | null
          subscription_tier: string | null
          updated_at: string | null
          user_id: string | null
          verification_status: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_favorites_food_truck_id_fkey"
            columns: ["food_truck_id"]
            isOneToOne: false
            referencedRelation: "food_trucks"
            referencedColumns: ["id"]
          },
        ]
      }
      latest_quality_scores: {
        Row: {
          breakdown: Json | null
          created_at: string | null
          entity_id: string | null
          entity_type: string | null
          grade: string | null
          id: string | null
          score: number | null
          truck_name: string | null
          updated_at: string | null
          validation_details: Json | null
        }
        Relationships: []
      }
      sources_overview_v1: {
        Row: {
          cadence_cron: string | null
          created_at: string | null
          fallback: string | null
          id: string | null
          last_run_at: string | null
          name: string | null
          owner: string | null
          parser_version: string | null
          status: string | null
          tags: string[] | null
          updated_at: string | null
          url: string | null
        }
        Insert: {
          cadence_cron?: string | null
          created_at?: string | null
          fallback?: string | null
          id?: string | null
          last_run_at?: string | null
          name?: string | null
          owner?: string | null
          parser_version?: string | null
          status?: string | null
          tags?: string[] | null
          updated_at?: string | null
          url?: string | null
        }
        Update: {
          cadence_cron?: string | null
          created_at?: string | null
          fallback?: string | null
          id?: string | null
          last_run_at?: string | null
          name?: string | null
          owner?: string | null
          parser_version?: string | null
          status?: string | null
          tags?: string[] | null
          updated_at?: string | null
          url?: string | null
        }
        Relationships: []
      }
      truck_analytics_summary: {
        Row: {
          directions_clicks: number | null
          event_date: string | null
          favorites: number | null
          menu_clicks: number | null
          shares: number | null
          total_views: number | null
          truck_id: string | null
          unique_directions_clicks: number | null
          unique_menu_clicks: number | null
          unique_shares: number | null
          unique_views: number | null
          unique_website_clicks: number | null
          website_clicks: number | null
        }
        Relationships: []
      }
      canonical_events: {
        Row: {
          category: string | null
          city: string
          city_partition_guid: string | null
          community_shared_at: string | null
          description: string | null
          event_end_date: string | null
          event_end_time: string | null
          event_start_date: string | null
          event_start_time: string | null
          external_id: string
          id: string
          ingested_at: string | null
          is_canonical: boolean
          is_community_submitted: boolean | null
          is_food_truck_relevant: boolean | null
          location_address: string | null
          location_geog: unknown
          location_lat: number | null
          location_lng: number | null
          matched_keywords: string[] | null
          organization: string | null
          permit_end_date: string | null
          permit_end_time: string | null
          permit_start_date: string | null
          permit_start_time: string | null
          permit_status: string
          raw_data: Json | null
          relevance_classified_at: string | null
          relevance_confidence: number | null
          relevance_model: string | null
          relevance_reasoning: string | null
          relevance_review_needed: boolean | null
          relevance_review_decision: string | null
          relevance_reviewed_at: string | null
          relevance_reviewed_by: string | null
          relevance_score: number | null
          source: string
          source_partition: string | null
          source_type: string
          source_updated_at: string | null
          source_url: string | null
          state: string
          submitted_by: string | null
          title: string
          updated_at: string | null
          verification_badge: string | null
          verification_tier: number | null
          vetted_at: string | null
          vetting_location_type: string | null
          vetting_result: Json | null
          vetting_score: number | null
          vetting_version: number | null
          website: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      aggregate_daily_quality_metrics: {
        Args: { target_date?: string }
        Returns: undefined
      }
      backfill_location_geog: { Args: { batch_size?: number }; Returns: number }
      bump_venue_cache: { Args: { p_venue_key: string }; Returns: undefined }
      calculate_food_truck_quality_score: {
        Args: { truck_id: string }
        Returns: {
          breakdown: Json | null
          created_at: string | null
          entity_id: string
          entity_type: string
          grade: string
          id: string
          score: number
          updated_at: string | null
          validation_details: Json | null
        }
        SetofOptions: {
          from: "*"
          to: "data_quality_scores"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      calculate_next_retry: { Args: { attempts: number }; Returns: string }
      claim_next_research_job: {
        Args: never
        Returns: {
          completed_at: string | null
          created_at: string | null
          error_message: string | null
          id: string
          input_text: string
          progress_step: string | null
          result_json: Json | null
          share_with_community: boolean | null
          source_event_id: string | null
          started_at: string | null
          status: string | null
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "research_jobs"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      claim_truck_atomic: {
        Args: { p_contact_email: string; p_truck_id: string; p_user_id: string }
        Returns: {
          error_message: string
          success: boolean
          updated_truck_id: string
        }[]
      }
      cleanup_expired_validation_logs: { Args: never; Returns: undefined }
      cleanup_expired_verification_codes: { Args: never; Returns: undefined }
      cleanup_old_facebook_posts: { Args: never; Returns: undefined }
      cleanup_old_facebook_webhook_events: { Args: never; Returns: undefined }
      cleanup_old_webhook_events: { Args: never; Returns: undefined }
      expire_pending_confirmations: { Args: never; Returns: number }
      set_food_truck_facebook_auto_updates: {
        Args: { p_enabled: boolean; p_owner_id: string; p_truck_id: string }
        Returns: boolean
      }
      find_nearby_events: {
        Args: { p_lat: number; p_lng: number; p_radius_meters?: number }
        Returns: {
          distance_meters: number
          id: string
          name: string
          start_date: string
        }[]
      }
      find_nearby_external_events: {
        Args: { p_lat: number; p_lng: number; p_radius_meters?: number }
        Returns: {
          distance_meters: number
          event_start_date: string
          id: string
          title: string
        }[]
      }
      find_external_events_for_map: {
        Args: {
          p_lat?: number
          p_lng?: number
          p_radius_meters?: number
          p_start_date?: string
          p_end_date?: string
          p_period?: string
          p_min_vetting_score?: number
          p_search?: string
          p_limit?: number
          p_offset?: number
        }
        Returns: {
          id: string
          title: string
          description: string | null
          event_start_date: string | null
          event_end_date: string | null
          location_lat: number | null
          location_lng: number | null
          location_address: string | null
          city: string | null
          state: string | null
          source_type: string
          source: string
          source_url: string | null
          vetting_score: number | null
          verification_badge: string | null
          relevance_score: number | null
          distance_meters: number | null
        }[]
      }
      find_external_events_for_map_json: {
        Args: { p_period?: string }
        Returns: Json
      }
      find_nearby_hotspot:
        | {
            Args: { lat: number; lng: number; radius_meters?: number }
            Returns: {
              distance_meters: number
              id: string
            }[]
          }
        | {
            Args: { p_lat: number; p_lng: number; p_radius_meters?: number }
            Returns: {
              center_lat: number
              center_lng: number
              id: string
              last_updated: string
              radius_meters: number
              traffic_score: number
              truck_count: number
            }[]
          }
      find_nearby_traffic_nodes:
        | {
            Args: { p_lat: number; p_lng: number; p_radius_meters?: number }
            Returns: {
              distance_meters: number
              id: string
              last_updated: string
              lat: number
              lng: number
              location_id: string
              traffic_score: number
            }[]
          }
        | {
            Args: {
              p_lat: number
              p_limit?: number
              p_lng: number
              p_radius_meters?: number
            }
            Returns: {
              aadt: number
              distance_meters: number
              id: string
              lat: number
              lng: number
              location_description: string
              score_percentile: number
              station_id: string
            }[]
          }
      find_traffic_nodes_optimized:
        | {
            Args: { p_bbox: string; p_min_traffic_score?: number }
            Returns: {
              id: string
              last_updated: string
              lat: number
              lng: number
              location_id: string
              traffic_score: number
            }[]
          }
        | {
            Args: {
              p_lat: number
              p_limit?: number
              p_lng: number
              p_radius_miles?: number
            }
            Returns: {
              aadt: number
              distance_meters: number
              id: string
              lat: number
              lng: number
              location_description: string
              score_percentile: number
              station_id: string
            }[]
          }
      find_trucks_within_radius: {
        Args: { radius_meters: number; user_lat: number; user_lng: number }
        Returns: {
          average_rating: number
          contact_info: Json
          created_at: string
          cuisine_type: string[]
          current_location: Json
          data_quality_score: number
          description: string
          distance_meters: number
          distance_miles: number
          id: string
          is_active: boolean
          is_claimed: boolean
          last_synced_at: string
          menu: Json
          name: string
          operating_hours: Json
          owner_id: string
          price_range: string
          review_count: number
          social_media: Json
          specialties: string[]
          updated_at: string
          verification_status: string
        }[]
      }
      find_user_by_facebook_id: {
        Args: { p_facebook_user_id: string }
        Returns: string
      }
      get_cached_foot_traffic:
        | {
            Args: { p_cache_ttl_minutes?: number; p_location_id: string }
            Returns: {
              foot_traffic_count: number
              is_cached: boolean
              last_updated: string
              location_id: string
            }[]
          }
        | { Args: { p_place_id: string; p_ttl_days?: number }; Returns: Json }
      get_columns: {
        Args: { p_table_name: string }
        Returns: {
          column_name: string
          data_type: string
        }[]
      }
      get_data_quality_stats: {
        Args: never
        Returns: {
          avg_quality_score: number
          high_quality_count: number
          low_quality_count: number
          medium_quality_count: number
          total_trucks: number
          unverified_count: number
        }[]
      }
      get_facebook_posts_count_by_status: {
        Args: never
        Returns: {
          count: number
          status: string
        }[]
      }
      get_location_traffic_score: {
        Args: { p_lat: number; p_lng: number; p_radius_meters?: number }
        Returns: {
          avg_aadt: number
          max_aadt: number
          percentile_score: number
          station_count: number
          traffic_level: string
        }[]
      }
      get_postgres_index: {
        Args: { index_name: string; table_name?: string }
        Returns: {
          indexdef: string
          indexname: string
          tablename: string
        }[]
      }
      get_truck_analytics_summary: {
        Args: never
        Returns: {
          directions_clicks: number
          event_date: string
          favorites: number
          menu_clicks: number
          shares: number
          total_views: number
          truck_id: string
          unique_directions_clicks: number
          unique_menu_clicks: number
          unique_shares: number
          unique_views: number
          unique_website_clicks: number
          website_clicks: number
        }[]
      }
      get_trucks_near_location: {
        Args: { radius_km?: number; user_lat: number; user_lng: number }
        Returns: {
          average_rating: number
          cuisine_type: string[]
          current_location: Json
          description: string
          distance_km: number
          id: string
          is_active: boolean
          name: string
          review_count: number
        }[]
      }
      get_users_within_radius: {
        Args: {
          lat_param: number
          lng_param: number
          radius_mi_param: number
          truck_id_param: string
        }
        Returns: {
          fcm_tokens: string[]
          user_id: string
        }[]
      }
      get_venue_cache: {
        Args: { p_venue_key: string }
        Returns: {
          hit_count: number
          lat: number
          lng: number
        }[]
      }
      increment_geo_view: {
        Args: { p_country: string; p_region: string }
        Returns: undefined
      }
      increment_truck_view: { Args: { p_truck_id: string }; Returns: undefined }
      increment_verification_attempts: {
        Args: { p_code_id: string; p_max_attempts: number }
        Returns: {
          is_locked: boolean
          new_attempts: number
          was_updated: boolean
        }[]
      }
      is_truck_blocked: {
        Args: {
          p_facebook?: string
          p_instagram?: string
          p_name?: string
          p_phone?: string
          p_website?: string
        }
        Returns: {
          is_blocked: boolean
          notes: string
          reason: Database["public"]["Enums"]["blocklist_reason"]
        }[]
      }
      record_geocode_failure: {
        Args: {
          p_address: string
          p_cleaned_address: string
          p_failure_reason: string
        }
        Returns: undefined
      }
      supabase_validate: {
        Args: { data: Json; schema_name_param: string }
        Returns: Json
      }
      unlink_identity: {
        Args: { p_identity_id: string; p_provider: string; p_user_id: string }
        Returns: undefined
      }
      update_api_usage: {
        Args: { p_requests?: number; p_service_name: string; p_tokens?: number }
        Returns: undefined
      }
      update_location_geog: {
        Args: { p_lat: number; p_lng: number; p_location_id: string }
        Returns: undefined
      }
      update_organizer_rating: {
        Args: { p_organizer_id: string }
        Returns: undefined
      }
      upsert_validation_schema: {
        Args: {
          json_schema_param: Json
          schema_name_param: string
          version_param?: string
        }
        Returns: Json
      }
      upsert_venue_cache: {
        Args: {
          p_address: string
          p_city: string
          p_lat: number
          p_lng: number
          p_source?: string
          p_state: string
          p_venue_key: string
          p_venue_name: string
        }
        Returns: undefined
      }
      verify_radius_status: { Args: never; Returns: Json }
    }
    Enums: {
      blocklist_reason:
        | "defunct"
        | "duplicate"
        | "takedown_request"
        | "fraud"
        | "wrong_location"
        | "other"
      event_waitlist_role: "foodie" | "truck_owner" | "event_manager"
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      blocklist_reason: [
        "defunct",
        "duplicate",
        "takedown_request",
        "fraud",
        "wrong_location",
        "other",
      ],
      event_waitlist_role: ["foodie", "truck_owner", "event_manager"],
    },
  },
} as const
