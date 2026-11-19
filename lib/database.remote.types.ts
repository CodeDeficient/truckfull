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
          created_at: string | null
          event_type: string
          id: string
          metadata: Json | null
          truck_id: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          event_type: string
          id?: string
          metadata?: Json | null
          truck_id?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          event_type?: string
          id?: string
          metadata?: Json | null
          truck_id?: string | null
          user_agent?: string | null
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
          requests_count: number | null
          requests_limit: number | null
          service_name: string
          tokens_limit: number | null
          tokens_used: number | null
          usage_date: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          requests_count?: number | null
          requests_limit?: number | null
          service_name: string
          tokens_limit?: number | null
          tokens_used?: number | null
          usage_date?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          requests_count?: number | null
          requests_limit?: number | null
          service_name?: string
          tokens_limit?: number | null
          tokens_used?: number | null
          usage_date?: string | null
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
          created_at: string | null
          entity_id: string | null
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
          created_at?: string | null
          entity_id?: string | null
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
          created_at?: string | null
          entity_id?: string | null
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
          attempts: number | null
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
          attempts?: number | null
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
          attempts?: number | null
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
          created_at: string | null
          food_truck_id: string | null
          gemini_tokens_used: number | null
          id: string
          priority: number | null
          processed_at: string | null
          processed_data: Json | null
          processing_type: string
          raw_data: Json
          status: string | null
        }
        Insert: {
          created_at?: string | null
          food_truck_id?: string | null
          gemini_tokens_used?: number | null
          id?: string
          priority?: number | null
          processed_at?: string | null
          processed_data?: Json | null
          processing_type: string
          raw_data: Json
          status?: string | null
        }
        Update: {
          created_at?: string | null
          food_truck_id?: string | null
          gemini_tokens_used?: number | null
          id?: string
          priority?: number | null
          processed_at?: string | null
          processed_data?: Json | null
          processing_type?: string
          raw_data?: Json
          status?: string | null
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
      dedup_review_queue: {
        Row: {
          accepted_at: string | null
          candidate_row_ids: string[]
          cluster_key: string
          created_at: string
          evidence: Json
          id: string
          merge_recommendation_score: number | null
          proposed_canonical_row_id: string | null
          reasoning: string | null
          reject_reason: string | null
          reviewed_by: string | null
          status: string
        }
        Insert: {
          accepted_at?: string | null
          candidate_row_ids: string[]
          cluster_key: string
          created_at?: string
          evidence?: Json
          id?: string
          merge_recommendation_score?: number | null
          proposed_canonical_row_id?: string | null
          reasoning?: string | null
          reject_reason?: string | null
          reviewed_by?: string | null
          status?: string
        }
        Update: {
          accepted_at?: string | null
          candidate_row_ids?: string[]
          cluster_key?: string
          created_at?: string
          evidence?: Json
          id?: string
          merge_recommendation_score?: number | null
          proposed_canonical_row_id?: string | null
          reasoning?: string | null
          reject_reason?: string | null
          reviewed_by?: string | null
          status?: string
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
          discovered_at: string
          discovery_method: string | null
          id: string
          last_processed_at: string | null
          metadata: Json | null
          notes: string | null
          processing_attempts: number | null
          region: string | null
          source_directory_url: string | null
          status: string | null
          updated_at: string | null
          url: string
        }
        Insert: {
          discovered_at?: string
          discovery_method?: string | null
          id?: string
          last_processed_at?: string | null
          metadata?: Json | null
          notes?: string | null
          processing_attempts?: number | null
          region?: string | null
          source_directory_url?: string | null
          status?: string | null
          updated_at?: string | null
          url: string
        }
        Update: {
          discovered_at?: string
          discovery_method?: string | null
          id?: string
          last_processed_at?: string | null
          metadata?: Json | null
          notes?: string | null
          processing_attempts?: number | null
          region?: string | null
          source_directory_url?: string | null
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
      external_event_cache_invalidation_queue: {
        Row: {
          created_at: string
          dead_letter_reason: string | null
          dead_lettered_at: string | null
          expires_at: string
          id: string
          last_attempt_at: string | null
          last_error: string | null
          last_reconciliation_error: string | null
          max_attempts: number
          next_attempt_at: string | null
          next_reconciliation_at: string | null
          origin: string
          reconciliation_attempt_count: number
          resolved_at: string | null
          retry_count: number
          source_event_id: string | null
          status: string
          target_key: string
          target_payload: Json
          updated_at: string
        }
        Insert: {
          created_at?: string
          dead_letter_reason?: string | null
          dead_lettered_at?: string | null
          expires_at?: string
          id?: string
          last_attempt_at?: string | null
          last_error?: string | null
          last_reconciliation_error?: string | null
          max_attempts?: number
          next_attempt_at?: string | null
          next_reconciliation_at?: string | null
          origin?: string
          reconciliation_attempt_count?: number
          resolved_at?: string | null
          retry_count?: number
          source_event_id?: string | null
          status?: string
          target_key: string
          target_payload: Json
          updated_at?: string
        }
        Update: {
          created_at?: string
          dead_letter_reason?: string | null
          dead_lettered_at?: string | null
          expires_at?: string
          id?: string
          last_attempt_at?: string | null
          last_error?: string | null
          last_reconciliation_error?: string | null
          max_attempts?: number
          next_attempt_at?: string | null
          next_reconciliation_at?: string | null
          origin?: string
          reconciliation_attempt_count?: number
          resolved_at?: string | null
          retry_count?: number
          source_event_id?: string | null
          status?: string
          target_key?: string
          target_payload?: Json
          updated_at?: string
        }
        Relationships: []
      }
      external_events: {
        Row: {
          category: string | null
          city: string
          city_partition_guid: string | null
          community_shared_at: string | null
          content_hash: string | null
          description: string | null
          event_end_date: string | null
          event_end_time: string | null
          event_start_date: string | null
          event_start_time: string | null
          external_id: string
          hidden_reason: string | null
          id: string
          ingested_at: string | null
          is_canonical: boolean
          is_community_submitted: boolean | null
          is_food_truck_relevant: boolean | null
          is_hidden: boolean
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
          relevance_review_decision: string | null
          relevance_review_needed: boolean | null
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
          content_hash?: string | null
          description?: string | null
          event_end_date?: string | null
          event_end_time?: string | null
          event_start_date?: string | null
          event_start_time?: string | null
          external_id: string
          hidden_reason?: string | null
          id?: string
          ingested_at?: string | null
          is_canonical?: boolean
          is_community_submitted?: boolean | null
          is_food_truck_relevant?: boolean | null
          is_hidden?: boolean
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
          relevance_review_decision?: string | null
          relevance_review_needed?: boolean | null
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
          content_hash?: string | null
          description?: string | null
          event_end_date?: string | null
          event_end_time?: string | null
          event_start_date?: string | null
          event_start_time?: string | null
          external_id?: string
          hidden_reason?: string | null
          id?: string
          ingested_at?: string | null
          is_canonical?: boolean
          is_community_submitted?: boolean | null
          is_food_truck_relevant?: boolean | null
          is_hidden?: boolean
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
          relevance_review_decision?: string | null
          relevance_review_needed?: boolean | null
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
          last_synced_event_id: string | null
          pending_cache_invalidation_cursor: string | null
          pending_cache_invalidation_event_ids: string[]
          source: string
        }
        Insert: {
          last_synced_at?: string
          last_synced_event_id?: string | null
          pending_cache_invalidation_cursor?: string | null
          pending_cache_invalidation_event_ids?: string[]
          source: string
        }
        Update: {
          last_synced_at?: string
          last_synced_event_id?: string | null
          pending_cache_invalidation_cursor?: string | null
          pending_cache_invalidation_event_ids?: string[]
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
      food_truck_admin_notes: {
        Row: {
          notes: string
          truck_id: string
          updated_at: string
        }
        Insert: {
          notes: string
          truck_id: string
          updated_at?: string
        }
        Update: {
          notes?: string
          truck_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "food_truck_admin_notes_truck_id_fkey"
            columns: ["truck_id"]
            isOneToOne: true
            referencedRelation: "food_trucks"
            referencedColumns: ["id"]
          },
        ]
      }
      food_truck_commercial_entities: {
        Row: {
          branch_key: string
          created_at: string
          expected_identity_values: Json
          id: string
          identity_quote: string
          identity_reason: string
          identity_source_id: string
          public_business_name: string
          public_city_state: string
          truck_id: string
          verification_status: string
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          branch_key: string
          created_at?: string
          expected_identity_values: Json
          id?: string
          identity_quote: string
          identity_reason: string
          identity_source_id: string
          public_business_name: string
          public_city_state: string
          truck_id: string
          verification_status?: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          branch_key?: string
          created_at?: string
          expected_identity_values?: Json
          id?: string
          identity_quote?: string
          identity_reason?: string
          identity_source_id?: string
          public_business_name?: string
          public_city_state?: string
          truck_id?: string
          verification_status?: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "food_truck_commercial_entities_identity_source_id_fkey"
            columns: ["identity_source_id"]
            isOneToOne: false
            referencedRelation: "food_truck_commercial_sources"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "food_truck_commercial_entities_truck_id_fkey"
            columns: ["truck_id"]
            isOneToOne: false
            referencedRelation: "food_trucks"
            referencedColumns: ["id"]
          },
        ]
      }
      food_truck_commercial_sources: {
        Row: {
          artifact_path: string
          captured_at: string
          content_sha256: string
          content_text: string
          created_at: string
          id: string
          ownership_evidence: string
          redistribution_basis: string
          source_class: string
          source_host: string | null
          source_identifier: string | null
          source_published_at: string | null
          source_url: string
          valid_until: string
          verification_status: string
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          artifact_path: string
          captured_at: string
          content_sha256: string
          content_text: string
          created_at?: string
          id?: string
          ownership_evidence: string
          redistribution_basis: string
          source_class: string
          source_host?: string | null
          source_identifier?: string | null
          source_published_at?: string | null
          source_url: string
          valid_until: string
          verification_status?: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          artifact_path?: string
          captured_at?: string
          content_sha256?: string
          content_text?: string
          created_at?: string
          id?: string
          ownership_evidence?: string
          redistribution_basis?: string
          source_class?: string
          source_host?: string | null
          source_identifier?: string | null
          source_published_at?: string | null
          source_url?: string
          valid_until?: string
          verification_status?: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: []
      }
      food_truck_field_provenance: {
        Row: {
          created_at: string
          field_name: string
          id: string
          redistribution_status: string
          researched_at: string | null
          source_class: string
          source_ref: string | null
          truck_id: string
          verified_at: string | null
        }
        Insert: {
          created_at?: string
          field_name: string
          id?: string
          redistribution_status?: string
          researched_at?: string | null
          source_class: string
          source_ref?: string | null
          truck_id: string
          verified_at?: string | null
        }
        Update: {
          created_at?: string
          field_name?: string
          id?: string
          redistribution_status?: string
          researched_at?: string | null
          source_class?: string
          source_ref?: string | null
          truck_id?: string
          verified_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "food_truck_field_provenance_truck_id_fkey"
            columns: ["truck_id"]
            isOneToOne: false
            referencedRelation: "food_trucks"
            referencedColumns: ["id"]
          },
        ]
      }
      food_truck_field_value_provenance: {
        Row: {
          created_at: string
          entity_id: string
          entity_scope_reason: string
          evidence_quote: string
          evidence_scope: string
          expected_current_value: Json
          field_name: string
          id: string
          legacy_provenance_ids: string[]
          normalized_value: Json
          raw_source_value: Json
          redistribution_status: string
          source_id: string
          transformation_reason: string
          transformation_rule: string
          truck_id: string
          verification_status: string
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          created_at?: string
          entity_id: string
          entity_scope_reason: string
          evidence_quote: string
          evidence_scope: string
          expected_current_value: Json
          field_name: string
          id?: string
          legacy_provenance_ids?: string[]
          normalized_value: Json
          raw_source_value: Json
          redistribution_status?: string
          source_id: string
          transformation_reason: string
          transformation_rule: string
          truck_id: string
          verification_status?: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          created_at?: string
          entity_id?: string
          entity_scope_reason?: string
          evidence_quote?: string
          evidence_scope?: string
          expected_current_value?: Json
          field_name?: string
          id?: string
          legacy_provenance_ids?: string[]
          normalized_value?: Json
          raw_source_value?: Json
          redistribution_status?: string
          source_id?: string
          transformation_reason?: string
          transformation_rule?: string
          truck_id?: string
          verification_status?: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "food_truck_field_value_provenance_entity_id_truck_id_fkey"
            columns: ["entity_id", "truck_id"]
            isOneToOne: false
            referencedRelation: "food_truck_commercial_entities"
            referencedColumns: ["id", "truck_id"]
          },
          {
            foreignKeyName: "food_truck_field_value_provenance_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "food_truck_commercial_sources"
            referencedColumns: ["id"]
          },
        ]
      }
      food_truck_recurrences: {
        Row: {
          created_at: string
          created_by: string | null
          end_time: string
          ends_next_day: boolean
          food_truck_id: string
          frequency: string
          id: string
          location_data: Json | null
          monthly_mode: string | null
          occurrences: number | null
          start_date: string
          start_time: string
          timezone: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          end_time: string
          ends_next_day?: boolean
          food_truck_id: string
          frequency: string
          id?: string
          location_data?: Json | null
          monthly_mode?: string | null
          occurrences?: number | null
          start_date: string
          start_time: string
          timezone: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          end_time?: string
          ends_next_day?: boolean
          food_truck_id?: string
          frequency?: string
          id?: string
          location_data?: Json | null
          monthly_mode?: string | null
          occurrences?: number | null
          start_date?: string
          start_time?: string
          timezone?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "food_truck_recurrences_food_truck_id_fkey"
            columns: ["food_truck_id"]
            isOneToOne: false
            referencedRelation: "food_trucks"
            referencedColumns: ["id"]
          },
        ]
      }
      food_truck_schedule_events: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          end_at: string | null
          external_event_id: string | null
          food_truck_id: string
          id: string
          location_data: Json
          platform_event_id: string | null
          saved_lead_id: string | null
          source: string
          start_at: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          end_at?: string | null
          external_event_id?: string | null
          food_truck_id: string
          id?: string
          location_data?: Json
          platform_event_id?: string | null
          saved_lead_id?: string | null
          source: string
          start_at: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          end_at?: string | null
          external_event_id?: string | null
          food_truck_id?: string
          id?: string
          location_data?: Json
          platform_event_id?: string | null
          saved_lead_id?: string | null
          source?: string
          start_at?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "food_truck_schedule_events_external_event_id_fkey"
            columns: ["external_event_id"]
            isOneToOne: false
            referencedRelation: "canonical_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "food_truck_schedule_events_external_event_id_fkey"
            columns: ["external_event_id"]
            isOneToOne: false
            referencedRelation: "external_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "food_truck_schedule_events_food_truck_id_fkey"
            columns: ["food_truck_id"]
            isOneToOne: false
            referencedRelation: "food_trucks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "food_truck_schedule_events_platform_event_id_fkey"
            columns: ["platform_event_id"]
            isOneToOne: false
            referencedRelation: "eventfull_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "food_truck_schedule_events_saved_lead_id_fkey"
            columns: ["saved_lead_id"]
            isOneToOne: false
            referencedRelation: "saved_external_leads"
            referencedColumns: ["id"]
          },
        ]
      }
      food_truck_schedule_overrides: {
        Row: {
          created_at: string | null
          end_time: string | null
          ends_next_day: boolean
          food_truck_id: string
          id: string
          is_all_day: boolean
          is_closed: boolean
          location_data: Json | null
          service_date: string
          source_post_created_at: string | null
          source_post_id: string | null
          source_type: string
          start_time: string | null
          timezone: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          end_time?: string | null
          ends_next_day?: boolean
          food_truck_id: string
          id?: string
          is_all_day?: boolean
          is_closed?: boolean
          location_data?: Json | null
          service_date: string
          source_post_created_at?: string | null
          source_post_id?: string | null
          source_type: string
          start_time?: string | null
          timezone: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          end_time?: string | null
          ends_next_day?: boolean
          food_truck_id?: string
          id?: string
          is_all_day?: boolean
          is_closed?: boolean
          location_data?: Json | null
          service_date?: string
          source_post_created_at?: string | null
          source_post_id?: string | null
          source_type?: string
          start_time?: string | null
          timezone?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "food_truck_schedule_overrides_food_truck_id_fkey"
            columns: ["food_truck_id"]
            isOneToOne: false
            referencedRelation: "food_trucks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "food_truck_schedule_overrides_source_post_id_fkey"
            columns: ["source_post_id"]
            isOneToOne: false
            referencedRelation: "facebook_posts"
            referencedColumns: ["id"]
          },
        ]
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
          average_rating: number | null
          city: string | null
          city_location: Json | null
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
          exact_location: Json | null
          facebook_auto_updates_enabled: boolean | null
          facebook_last_sync: string | null
          facebook_page_id: string | null
          facebook_page_name: string | null
          facebook_webhook_enabled: boolean | null
          id: string
          is_active: boolean
          is_claimed: boolean | null
          last_synced_at: string | null
          last_updated_at: string | null
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
          specialties: string[] | null
          state: string | null
          status: string | null
          street_address: string | null
          timezone: string | null
          updated_at: string | null
          user_id: string | null
          verification_status: string | null
          view_count: number | null
          zip: string | null
        }
        Insert: {
          average_rating?: number | null
          city?: string | null
          city_location?: Json | null
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
          exact_location?: Json | null
          facebook_auto_updates_enabled?: boolean | null
          facebook_last_sync?: string | null
          facebook_page_id?: string | null
          facebook_page_name?: string | null
          facebook_webhook_enabled?: boolean | null
          id?: string
          is_active?: boolean
          is_claimed?: boolean | null
          last_synced_at?: string | null
          last_updated_at?: string | null
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
          specialties?: string[] | null
          state?: string | null
          status?: string | null
          street_address?: string | null
          timezone?: string | null
          updated_at?: string | null
          user_id?: string | null
          verification_status?: string | null
          view_count?: number | null
          zip?: string | null
        }
        Update: {
          average_rating?: number | null
          city?: string | null
          city_location?: Json | null
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
          exact_location?: Json | null
          facebook_auto_updates_enabled?: boolean | null
          facebook_last_sync?: string | null
          facebook_page_id?: string | null
          facebook_page_name?: string | null
          facebook_webhook_enabled?: boolean | null
          id?: string
          is_active?: boolean
          is_claimed?: boolean | null
          last_synced_at?: string | null
          last_updated_at?: string | null
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
          specialties?: string[] | null
          state?: string | null
          status?: string | null
          street_address?: string | null
          timezone?: string | null
          updated_at?: string | null
          user_id?: string | null
          verification_status?: string | null
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
          activated_at: string | null
          checkout_session_id: string | null
          claimed_at: string | null
          expires_at: string | null
          offer: string | null
          profile_id: string
          reservation_id: string | null
          reserved_at: string | null
          status: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
        }
        Insert: {
          activated_at?: string | null
          checkout_session_id?: string | null
          claimed_at?: string | null
          expires_at?: string | null
          offer?: string | null
          profile_id: string
          reservation_id?: string | null
          reserved_at?: string | null
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
        }
        Update: {
          activated_at?: string | null
          checkout_session_id?: string | null
          claimed_at?: string | null
          expires_at?: string | null
          offer?: string | null
          profile_id?: string
          reservation_id?: string | null
          reserved_at?: string | null
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
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
      orders: {
        Row: {
          actual_delivery: string | null
          created_at: string | null
          customer_email: string | null
          customer_name: string | null
          customer_phone: string | null
          delivery_address: Json | null
          estimated_delivery: string | null
          food_truck_id: string | null
          id: string
          items: Json | null
          order_id: string
          special_instructions: string | null
          status: string | null
          total_amount: number
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          actual_delivery?: string | null
          created_at?: string | null
          customer_email?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          delivery_address?: Json | null
          estimated_delivery?: string | null
          food_truck_id?: string | null
          id?: string
          items?: Json | null
          order_id: string
          special_instructions?: string | null
          status?: string | null
          total_amount: number
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          actual_delivery?: string | null
          created_at?: string | null
          customer_email?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          delivery_address?: Json | null
          estimated_delivery?: string | null
          food_truck_id?: string | null
          id?: string
          items?: Json | null
          order_id?: string
          special_instructions?: string | null
          status?: string | null
          total_amount?: number
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_food_truck_id_fkey"
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
          created_at: string | null
          id: string
          new_value: Json | null
          old_value: Json | null
          review_notes: string | null
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
          created_at?: string | null
          id?: string
          new_value?: Json | null
          old_value?: Json | null
          review_notes?: string | null
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
          created_at?: string | null
          id?: string
          new_value?: Json | null
          old_value?: Json | null
          review_notes?: string | null
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
      profiles: {
        Row: {
          avatar_url: string | null
          complimentary_pro: boolean
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
          complimentary_pro?: boolean
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
          complimentary_pro?: boolean
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
            referencedRelation: "canonical_events"
            referencedColumns: ["id"]
          },
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
            referencedRelation: "canonical_events"
            referencedColumns: ["id"]
          },
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
          comment: string | null
          created_at: string
          food_truck_id: string
          id: string
          rating: number
          updated_at: string
          user_id: string
        }
        Insert: {
          comment?: string | null
          created_at?: string
          food_truck_id: string
          id?: string
          rating: number
          updated_at?: string
          user_id: string
        }
        Update: {
          comment?: string | null
          created_at?: string
          food_truck_id?: string
          id?: string
          rating?: number
          updated_at?: string
          user_id?: string
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
            referencedRelation: "canonical_events"
            referencedColumns: ["id"]
          },
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
          details: Json | null
          event_type: string | null
          id: number
          ip_address: string | null
          severity: string | null
          timestamp: string | null
          user_agent: string | null
          user_email: string | null
          user_id: string | null
        }
        Insert: {
          details?: Json | null
          event_type?: string | null
          id?: number
          ip_address?: string | null
          severity?: string | null
          timestamp?: string | null
          user_agent?: string | null
          user_email?: string | null
          user_id?: string | null
        }
        Update: {
          details?: Json | null
          event_type?: string | null
          id?: number
          ip_address?: string | null
          severity?: string | null
          timestamp?: string | null
          user_agent?: string | null
          user_email?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      slug_redirects: {
        Row: {
          created_at: string
          from_slug: string
          id: string
          to_slug: string
        }
        Insert: {
          created_at?: string
          from_slug: string
          id?: string
          to_slug: string
        }
        Update: {
          created_at?: string
          from_slug?: string
          id?: string
          to_slug?: string
        }
        Relationships: []
      }
      stripe_webhook_events: {
        Row: {
          created_at: string
          data: Json
          error_message: string | null
          id: string
          lease_expires_at: string | null
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
          lease_expires_at?: string | null
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
          lease_expires_at?: string | null
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
      truck_listing_submissions: {
        Row: {
          admin_notes: string | null
          city: string | null
          contact_email: string
          contact_name: string | null
          created_at: string
          facebook_url: string | null
          food_truck_id: string | null
          id: string
          instagram_url: string | null
          ip_address: unknown
          logo_path: string | null
          menu_asset_path: string | null
          menu_text: string | null
          notes: string | null
          phone: string | null
          source: string
          state: string | null
          status: string
          truck_name: string
          updated_at: string
          user_agent: string | null
          website: string | null
        }
        Insert: {
          admin_notes?: string | null
          city?: string | null
          contact_email: string
          contact_name?: string | null
          created_at?: string
          facebook_url?: string | null
          food_truck_id?: string | null
          id?: string
          instagram_url?: string | null
          ip_address?: unknown
          logo_path?: string | null
          menu_asset_path?: string | null
          menu_text?: string | null
          notes?: string | null
          phone?: string | null
          source?: string
          state?: string | null
          status?: string
          truck_name: string
          updated_at?: string
          user_agent?: string | null
          website?: string | null
        }
        Update: {
          admin_notes?: string | null
          city?: string | null
          contact_email?: string
          contact_name?: string | null
          created_at?: string
          facebook_url?: string | null
          food_truck_id?: string | null
          id?: string
          instagram_url?: string | null
          ip_address?: unknown
          logo_path?: string | null
          menu_asset_path?: string | null
          menu_text?: string | null
          notes?: string | null
          phone?: string | null
          source?: string
          state?: string | null
          status?: string
          truck_name?: string
          updated_at?: string
          user_agent?: string | null
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "truck_listing_submissions_food_truck_id_fkey"
            columns: ["food_truck_id"]
            isOneToOne: false
            referencedRelation: "food_trucks"
            referencedColumns: ["id"]
          },
        ]
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
      validation_logs: {
        Row: {
          code: string
          context: string | null
          error_id: string | null
          expires_at: string | null
          id: string
          message: string
          metadata: Json | null
          path: string[] | null
          session_id: string | null
          severity: string | null
          timestamp: string | null
          user_id: string | null
        }
        Insert: {
          code: string
          context?: string | null
          error_id?: string | null
          expires_at?: string | null
          id?: string
          message: string
          metadata?: Json | null
          path?: string[] | null
          session_id?: string | null
          severity?: string | null
          timestamp?: string | null
          user_id?: string | null
        }
        Update: {
          code?: string
          context?: string | null
          error_id?: string | null
          expires_at?: string | null
          id?: string
          message?: string
          metadata?: Json | null
          path?: string[] | null
          session_id?: string | null
          severity?: string | null
          timestamp?: string | null
          user_id?: string | null
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
          recorded_at: string | null
          user_agent: string | null
        }
        Insert: {
          id?: string
          metric_name: string
          metric_value: number
          page_url: string
          rating: string
          recorded_at?: string | null
          user_agent?: string | null
        }
        Update: {
          id?: string
          metric_name?: string
          metric_value?: number
          page_url?: string
          rating?: string
          recorded_at?: string | null
          user_agent?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      canonical_events: {
        Row: {
          category: string | null
          city: string | null
          city_partition_guid: string | null
          community_shared_at: string | null
          description: string | null
          event_end_date: string | null
          event_end_time: string | null
          event_start_date: string | null
          event_start_time: string | null
          external_id: string | null
          hidden_reason: string | null
          id: string | null
          ingested_at: string | null
          is_canonical: boolean | null
          is_community_submitted: boolean | null
          is_food_truck_relevant: boolean | null
          is_hidden: boolean | null
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
          permit_status: string | null
          raw_data: Json | null
          relevance_classified_at: string | null
          relevance_confidence: number | null
          relevance_model: string | null
          relevance_reasoning: string | null
          relevance_review_decision: string | null
          relevance_review_needed: boolean | null
          relevance_reviewed_at: string | null
          relevance_reviewed_by: string | null
          relevance_score: number | null
          source: string | null
          source_partition: string | null
          source_type: string | null
          source_updated_at: string | null
          source_url: string | null
          state: string | null
          submitted_by: string | null
          title: string | null
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
          city?: string | null
          city_partition_guid?: string | null
          community_shared_at?: string | null
          description?: string | null
          event_end_date?: string | null
          event_end_time?: string | null
          event_start_date?: string | null
          event_start_time?: string | null
          external_id?: string | null
          hidden_reason?: string | null
          id?: string | null
          ingested_at?: string | null
          is_canonical?: boolean | null
          is_community_submitted?: boolean | null
          is_food_truck_relevant?: boolean | null
          is_hidden?: boolean | null
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
          permit_status?: string | null
          raw_data?: Json | null
          relevance_classified_at?: string | null
          relevance_confidence?: number | null
          relevance_model?: string | null
          relevance_reasoning?: string | null
          relevance_review_decision?: string | null
          relevance_review_needed?: boolean | null
          relevance_reviewed_at?: string | null
          relevance_reviewed_by?: string | null
          relevance_score?: number | null
          source?: string | null
          source_partition?: string | null
          source_type?: string | null
          source_updated_at?: string | null
          source_url?: string | null
          state?: string | null
          submitted_by?: string | null
          title?: string | null
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
          city?: string | null
          city_partition_guid?: string | null
          community_shared_at?: string | null
          description?: string | null
          event_end_date?: string | null
          event_end_time?: string | null
          event_start_date?: string | null
          event_start_time?: string | null
          external_id?: string | null
          hidden_reason?: string | null
          id?: string | null
          ingested_at?: string | null
          is_canonical?: boolean | null
          is_community_submitted?: boolean | null
          is_food_truck_relevant?: boolean | null
          is_hidden?: boolean | null
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
          permit_status?: string | null
          raw_data?: Json | null
          relevance_classified_at?: string | null
          relevance_confidence?: number | null
          relevance_model?: string | null
          relevance_reasoning?: string | null
          relevance_review_decision?: string | null
          relevance_review_needed?: boolean | null
          relevance_reviewed_at?: string | null
          relevance_reviewed_by?: string | null
          relevance_score?: number | null
          source?: string | null
          source_partition?: string | null
          source_type?: string | null
          source_updated_at?: string | null
          source_url?: string | null
          state?: string | null
          submitted_by?: string | null
          title?: string | null
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
      food_truck_commercial_verified_claims: {
        Row: {
          created_at: string | null
          entity_id: string | null
          entity_scope_reason: string | null
          evidence_quote: string | null
          evidence_scope: string | null
          expected_current_value: Json | null
          field_name: string | null
          id: string | null
          legacy_provenance_ids: string[] | null
          normalized_value: Json | null
          raw_source_value: Json | null
          redistribution_status: string | null
          source_id: string | null
          transformation_reason: string | null
          transformation_rule: string | null
          truck_id: string | null
          verification_status: string | null
          verified_at: string | null
          verified_by: string | null
        }
        Relationships: [
          {
            foreignKeyName: "food_truck_field_value_provenance_entity_id_truck_id_fkey"
            columns: ["entity_id", "truck_id"]
            isOneToOne: false
            referencedRelation: "food_truck_commercial_entities"
            referencedColumns: ["id", "truck_id"]
          },
          {
            foreignKeyName: "food_truck_field_value_provenance_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "food_truck_commercial_sources"
            referencedColumns: ["id"]
          },
        ]
      }
      food_trucks_commercial_export: {
        Row: {
          city_state: string | null
          cuisine_type: string[] | null
          email: string | null
          name: string | null
          phone: string | null
          street_address: string | null
          truck_id: string | null
          website: string | null
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
    }
    Functions: {
      activate_founding_membership: {
        Args: {
          p_checkout_session_id: string
          p_customer_id: string
          p_offer: string
          p_profile_id: string
          p_reservation_id: string
          p_subscription_id: string
        }
        Returns: {
          outcome: string
          reason: string
        }[]
      }
      apply_dedup_merge: {
        Args: { p_canonical_row_id: string; p_component_row_ids: string[] }
        Returns: number
      }
      backfill_location_geog: { Args: { batch_size?: number }; Returns: number }
      bind_founding_reservation: {
        Args: { p_checkout_session_id: string; p_reservation_id: string }
        Returns: boolean
      }
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
      cleanup_old_webhook_events: { Args: never; Returns: undefined }
      commercial_current_field_value: {
        Args: {
          field_name: string
          truck: Database["public"]["Tables"]["food_trucks"]["Row"]
        }
        Returns: Json
      }
      commercial_normalize_value: {
        Args: { raw_value: Json; rule: string }
        Returns: Json
      }
      commercial_raw_value_in_quote: {
        Args: {
          evidence_quote: string
          field_name: string
          raw_value: Json
          source_url: string
        }
        Returns: boolean
      }
      commercial_source_acceptable: {
        Args: { source_class: string; source_url: string }
        Returns: boolean
      }
      commercial_source_host: { Args: { source_url: string }; Returns: string }
      create_test_user_with_identities: {
        Args: { p_email: string; p_identities: Json; p_password: string }
        Returns: string
      }
      dedup_external_events: { Args: never; Returns: number }
      dedup_v2_candidates: { Args: never; Returns: Json }
      delete_test_user: { Args: { p_user_id: string }; Returns: undefined }
      expire_founding_reservation: {
        Args: { p_checkout_session_id?: string; p_reservation_id: string }
        Returns: boolean
      }
      expire_free_trials: { Args: never; Returns: undefined }
      expire_free_trials_dry_run: {
        Args: never
        Returns: {
          email: string
          profile_id: string
          subscription_ends_at: string
        }[]
      }
      expire_pending_confirmations: { Args: never; Returns: number }
      expire_stale_founding_reservations: { Args: never; Returns: number }
      find_external_events_for_map: {
        Args: {
          p_end_date?: string
          p_lat?: number
          p_limit?: number
          p_lng?: number
          p_min_vetting_score?: number
          p_offset?: number
          p_period?: string
          p_radius_meters?: number
          p_search?: string
          p_start_date?: string
        }
        Returns: {
          city: string
          description: string
          distance_meters: number
          event_end_date: string
          event_start_date: string
          id: string
          location_address: string
          location_lat: number
          location_lng: number
          relevance_score: number
          source: string
          source_type: string
          source_url: string
          state: string
          title: string
          verification_badge: string
          vetting_score: number
        }[]
      }
      find_external_events_for_map_json: {
        Args: { p_period?: string }
        Returns: Json
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
      find_previous_external_events: {
        Args: { p_lat: number; p_lng: number; p_radius_meters?: number }
        Returns: {
          event_start_date: string
          title: string
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
          timezone: string
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
      get_enhanced_data_quality_stats: {
        Args: never
        Returns: {
          avg_quality_score: number
          avg_rating: number
          flagged_count: number
          high_quality_count: number
          low_quality_count: number
          medium_quality_count: number
          pending_count: number
          total_reviews: number
          total_trucks: number
          trucks_with_hours: number
          trucks_with_phone: number
          trucks_with_ratings: number
          trucks_with_website: number
          verified_count: number
        }[]
      }
      get_external_event_history_stats: {
        Args: { p_lat: number; p_lng: number; p_radius_meters?: number }
        Returns: {
          average_distance_meters: number
          event_count: number
        }[]
      }
      get_facebook_posts_count_by_status: {
        Args: never
        Returns: {
          count: number
          status: string
        }[]
      }
      get_founding_member_status: {
        Args: never
        Returns: {
          active: number
          remaining: number
          reserved: number
          total: number
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
      get_public_truck_by_identifier: {
        Args: { p_identifier: string }
        Returns: {
          average_rating: number
          city: string
          contact_info: Json
          created_at: string
          cuisine_type: string[]
          current_location: Json
          data_quality_score: number
          description: string
          id: string
          is_active: boolean
          is_claimed: boolean
          last_synced_at: string
          menu: Json
          name: string
          operating_hours: Json
          price_range: string
          review_count: number
          slug: string
          social_media: Json
          specialties: string[]
          state: string
          street_address: string
          timezone: string
          updated_at: string
          verification_status: string
          view_count: number
          zip: string
        }[]
      }
      get_public_truck_catalog_v2: {
        Args: { p_limit?: number }
        Returns: {
          city: string
          cuisine_type: string[]
          current_location: Json
          data_quality_score: number
          description: string
          has_menu: boolean
          has_social: boolean
          id: string
          is_claimed: boolean
          name: string
          operating_hours: Json
          photo_url: string
          price_range: string
          slug: string
          state: string
          view_count: number
        }[]
      }
      get_public_truck_count: {
        Args: {
          p_cities?: string[]
          p_claimed_only?: boolean
          p_require_location?: boolean
        }
        Returns: number
      }
      get_relevance_stats_by_source: {
        Args: never
        Returns: {
          relevant: number
          source: string
          total: number
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
      is_service_role: { Args: never; Returns: boolean }
      is_truck_claimed: { Args: { p_truck_id: string }; Returns: boolean }
      may_write_menu_item_photo: {
        Args: { object_name: string }
        Returns: boolean
      }
      normalize_phone_number: { Args: { phone_input: string }; Returns: string }
      owns_any_truck: { Args: never; Returns: boolean }
      owns_truck: { Args: { p_truck_id: string }; Returns: boolean }
      reconcile_verified_founding_membership: {
        Args: {
          p_checkout_session_id: string
          p_customer_id: string
          p_offer: string
          p_profile_id: string
          p_reservation_id: string
          p_subscription_id: string
        }
        Returns: {
          outcome: string
          reason: string
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
      reserve_founding_member_slot: {
        Args: { p_offer: string; p_profile_id: string }
        Returns: {
          active: number
          expires_at: string
          offer: string
          outcome: string
          remaining: number
          reservation_id: string
          reserved: number
          total: number
        }[]
      }
      set_food_truck_facebook_auto_updates: {
        Args: { p_enabled: boolean; p_owner_id: string; p_truck_id: string }
        Returns: boolean
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
      upsert_dedup_review_queue: {
        Args: { p_payload: Json }
        Returns: undefined
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
      event_waitlist_role:
        | "foodie"
        | "truck_owner"
        | "event_manager"
        | "api_customer"
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      event_waitlist_role: [
        "foodie",
        "truck_owner",
        "event_manager",
        "api_customer",
      ],
    },
  },
} as const
