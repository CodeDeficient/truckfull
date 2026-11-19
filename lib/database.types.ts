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
    PostgrestVersion: "12.2.3 (519615d)"
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
          viewer_ip: string | null
        }
        Insert: {
          created_at?: string | null
          event_type: string
          id?: string
          metadata?: Json | null
          truck_id?: string | null
          user_agent?: string | null
          user_id?: string | null
          viewer_ip?: string | null
        }
        Update: {
          created_at?: string | null
          event_type?: string
          id?: string
          metadata?: Json | null
          truck_id?: string | null
          user_agent?: string | null
          user_id?: string | null
          viewer_ip?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "analytics_events_truck_id_fkey"
            columns: ["truck_id"]
            isOneToOne: false
            referencedRelation: "food_trucks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "analytics_events_truck_id_fkey"
            columns: ["truck_id"]
            isOneToOne: false
            referencedRelation: "food_trucks_public_v"
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
          {
            foreignKeyName: "claim_verification_codes_food_truck_id_fkey"
            columns: ["food_truck_id"]
            isOneToOne: false
            referencedRelation: "food_trucks_public_v"
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
          {
            foreignKeyName: "data_processing_queue_food_truck_id_fkey"
            columns: ["food_truck_id"]
            isOneToOne: false
            referencedRelation: "food_trucks_public_v"
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
          {
            foreignKeyName: "event_applications_truck_id_fkey"
            columns: ["truck_id"]
            isOneToOne: false
            referencedRelation: "food_trucks_public_v"
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
          {
            foreignKeyName: "events_food_truck_id_fkey"
            columns: ["food_truck_id"]
            isOneToOne: false
            referencedRelation: "food_trucks_public_v"
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
          {
            foreignKeyName: "facebook_posts_truck_id_fkey"
            columns: ["truck_id"]
            isOneToOne: false
            referencedRelation: "food_trucks_public_v"
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
          {
            foreignKeyName: "food_truck_schedules_food_truck_id_fkey"
            columns: ["food_truck_id"]
            isOneToOne: false
            referencedRelation: "food_trucks_public_v"
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
          facebook_page_id: string | null
          id: string
          is_active: boolean
          is_claimed: boolean | null
          last_scraped_at: string | null
          last_synced_at: string | null
          last_updated_at: string | null
          live_gps_accuracy: number | null
          live_gps_lat: number | null
          live_gps_lng: number | null
          live_gps_timestamp: string | null
          live_location: Json | null
          location_geog: unknown
          menu: Json | null
          name: string
          operating_hours: Json | null
          owner_id: string | null
          price_range: string | null
          review_count: number | null
          review_status: string | null
          scheduled_locations: Json | null
          slug: string | null
          social_media: Json | null
          source_urls: string[] | null
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
          facebook_page_id?: string | null
          id?: string
          is_active?: boolean
          is_claimed?: boolean | null
          last_scraped_at?: string | null
          last_synced_at?: string | null
          last_updated_at?: string | null
          live_gps_accuracy?: number | null
          live_gps_lat?: number | null
          live_gps_lng?: number | null
          live_gps_timestamp?: string | null
          live_location?: Json | null
          location_geog?: unknown
          menu?: Json | null
          name: string
          operating_hours?: Json | null
          owner_id?: string | null
          price_range?: string | null
          review_count?: number | null
          review_status?: string | null
          scheduled_locations?: Json | null
          slug?: string | null
          social_media?: Json | null
          source_urls?: string[] | null
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
          facebook_page_id?: string | null
          id?: string
          is_active?: boolean
          is_claimed?: boolean | null
          last_scraped_at?: string | null
          last_synced_at?: string | null
          last_updated_at?: string | null
          live_gps_accuracy?: number | null
          live_gps_lat?: number | null
          live_gps_lng?: number | null
          live_gps_timestamp?: string | null
          live_location?: Json | null
          location_geog?: unknown
          menu?: Json | null
          name?: string
          operating_hours?: Json | null
          owner_id?: string | null
          price_range?: string | null
          review_count?: number | null
          review_status?: string | null
          scheduled_locations?: Json | null
          slug?: string | null
          social_media?: Json | null
          source_urls?: string[] | null
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
          {
            foreignKeyName: "hotspot_reservations_truck_id_fkey"
            columns: ["truck_id"]
            isOneToOne: false
            referencedRelation: "food_trucks_public_v"
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
          location_geog: unknown
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
          {
            foreignKeyName: "location_history_truck_id_fkey"
            columns: ["truck_id"]
            isOneToOne: false
            referencedRelation: "food_trucks_public_v"
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
          {
            foreignKeyName: "orders_food_truck_id_fkey"
            columns: ["food_truck_id"]
            isOneToOne: false
            referencedRelation: "food_trucks_public_v"
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
            isOneToOne: false
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
          {
            foreignKeyName: "pending_invites_truck_id_fkey"
            columns: ["truck_id"]
            isOneToOne: false
            referencedRelation: "food_trucks_public_v"
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
          {
            foreignKeyName: "pending_updates_truck_id_fkey"
            columns: ["truck_id"]
            isOneToOne: false
            referencedRelation: "food_trucks_public_v"
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
          {
            foreignKeyName: "reviews_food_truck_id_fkey"
            columns: ["food_truck_id"]
            isOneToOne: false
            referencedRelation: "food_trucks_public_v"
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
      spatial_ref_sys: {
        Row: {
          auth_name: string | null
          auth_srid: number | null
          proj4text: string | null
          srid: number
          srtext: string | null
        }
        Insert: {
          auth_name?: string | null
          auth_srid?: number | null
          proj4text?: string | null
          srid: number
          srtext?: string | null
        }
        Update: {
          auth_name?: string | null
          auth_srid?: number | null
          proj4text?: string | null
          srid?: number
          srtext?: string | null
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
          location_geog: unknown
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
          {
            foreignKeyName: "user_favorites_food_truck_id_fkey"
            columns: ["food_truck_id"]
            isOneToOne: false
            referencedRelation: "food_trucks_public_v"
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
          {
            foreignKeyName: "user_notification_settings_truck_id_fkey"
            columns: ["truck_id"]
            isOneToOne: false
            referencedRelation: "food_trucks_public_v"
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
          {
            foreignKeyName: "user_favorites_food_truck_id_fkey"
            columns: ["food_truck_id"]
            isOneToOne: false
            referencedRelation: "food_trucks_public_v"
            referencedColumns: ["id"]
          },
        ]
      }
      food_trucks_public_v: {
        Row: {
          average_rating: number | null
          contact_info: Json | null
          created_at: string | null
          cuisine_type: string[] | null
          current_location: Json | null
          data_quality_score: number | null
          description: string | null
          id: string | null
          is_active: boolean | null
          is_claimed: boolean | null
          last_synced_at: string | null
          lat: number | null
          lng: number | null
          location_geog: unknown
          menu: Json | null
          name: string | null
          operating_hours: Json | null
          owner_id: string | null
          price_range: string | null
          review_count: number | null
          slug: string | null
          social_media: Json | null
          specialties: string[] | null
          state: string | null
          status: string | null
          subscription_tier: string | null
          updated_at: string | null
          verification_status: string | null
          view_count: number | null
        }
        Relationships: []
      }
      geography_columns: {
        Row: {
          coord_dimension: number | null
          f_geography_column: unknown
          f_table_catalog: unknown
          f_table_name: unknown
          f_table_schema: unknown
          srid: number | null
          type: string | null
        }
        Relationships: []
      }
      geometry_columns: {
        Row: {
          coord_dimension: number | null
          f_geometry_column: unknown
          f_table_catalog: string | null
          f_table_name: unknown
          f_table_schema: unknown
          srid: number | null
          type: string | null
        }
        Insert: {
          coord_dimension?: number | null
          f_geometry_column?: unknown
          f_table_catalog?: string | null
          f_table_name?: unknown
          f_table_schema?: unknown
          srid?: number | null
          type?: string | null
        }
        Update: {
          coord_dimension?: number | null
          f_geometry_column?: unknown
          f_table_catalog?: string | null
          f_table_name?: unknown
          f_table_schema?: unknown
          srid?: number | null
          type?: string | null
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
      _postgis_deprecate: {
        Args: { newname: string; oldname: string; version: string }
        Returns: undefined
      }
      _postgis_index_extent: {
        Args: { col: string; tbl: unknown }
        Returns: unknown
      }
      _postgis_pgsql_version: { Args: never; Returns: string }
      _postgis_scripts_pgsql_version: { Args: never; Returns: string }
      _postgis_selectivity: {
        Args: { att_name: string; geom: unknown; mode?: string; tbl: unknown }
        Returns: number
      }
      _postgis_stats: {
        Args: { ""?: string; att_name: string; tbl: unknown }
        Returns: string
      }
      _st_3dintersects: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_contains: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_containsproperly: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_coveredby:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      _st_covers:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      _st_crosses: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_dwithin: {
        Args: {
          geog1: unknown
          geog2: unknown
          tolerance: number
          use_spheroid?: boolean
        }
        Returns: boolean
      }
      _st_equals: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      _st_intersects: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_linecrossingdirection: {
        Args: { line1: unknown; line2: unknown }
        Returns: number
      }
      _st_longestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      _st_maxdistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      _st_orderingequals: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_overlaps: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_sortablehash: { Args: { geom: unknown }; Returns: number }
      _st_touches: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_voronoi: {
        Args: {
          clip?: unknown
          g1: unknown
          return_polygons?: boolean
          tolerance?: number
        }
        Returns: unknown
      }
      _st_within: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      addauth: { Args: { "": string }; Returns: boolean }
      addgeometrycolumn:
        | {
            Args: {
              catalog_name: string
              column_name: string
              new_dim: number
              new_srid_in: number
              new_type: string
              schema_name: string
              table_name: string
              use_typmod?: boolean
            }
            Returns: string
          }
        | {
            Args: {
              column_name: string
              new_dim: number
              new_srid: number
              new_type: string
              schema_name: string
              table_name: string
              use_typmod?: boolean
            }
            Returns: string
          }
        | {
            Args: {
              column_name: string
              new_dim: number
              new_srid: number
              new_type: string
              table_name: string
              use_typmod?: boolean
            }
            Returns: string
          }
      backfill_location_geog: { Args: { batch_size?: number }; Returns: number }
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
      disablelongtransactions: { Args: never; Returns: string }
      dropgeometrycolumn:
        | {
            Args: {
              catalog_name: string
              column_name: string
              schema_name: string
              table_name: string
            }
            Returns: string
          }
        | {
            Args: {
              column_name: string
              schema_name: string
              table_name: string
            }
            Returns: string
          }
        | { Args: { column_name: string; table_name: string }; Returns: string }
      dropgeometrytable:
        | {
            Args: {
              catalog_name: string
              schema_name: string
              table_name: string
            }
            Returns: string
          }
        | { Args: { schema_name: string; table_name: string }; Returns: string }
        | { Args: { table_name: string }; Returns: string }
      enablelongtransactions: { Args: never; Returns: string }
      equals: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
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
      find_trucks_within_radius:
        | {
            Args: { latitude: number; longitude: number; radius_miles?: number }
            Returns: {
              cuisine_type: string
              current_location: Json
              description: string
              distance_miles: number
              id: string
              is_active: boolean
              is_claimed: boolean
              location_geog: unknown
              name: string
              profile_image_url: string
              subscription_tier: string
            }[]
          }
        | {
            Args: {
              max_results?: number
              radius_meters: number
              user_lat: number
              user_lng: number
            }
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
              last_scraped_at: string
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
      geometry: { Args: { "": string }; Returns: unknown }
      geometry_above: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_below: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_cmp: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      geometry_contained_3d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_contains: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_contains_3d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_distance_box: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      geometry_distance_centroid: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      geometry_eq: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_ge: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_gt: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_le: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_left: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_lt: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overabove: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overbelow: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overlaps: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overlaps_3d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overleft: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overright: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_right: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_same: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_same_3d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_within: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geomfromewkt: { Args: { "": string }; Returns: unknown }
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
          flagged_count: number
          high_quality_count: number
          low_quality_count: number
          medium_quality_count: number
          pending_count: number
          total_trucks: number
          verified_count: number
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
          contact_info: Json
          created_at: string
          current_location: Json
          data_quality_score: number
          description: string
          distance_km: number
          id: string
          last_scraped_at: string
          menu: Json
          name: string
          operating_hours: Json
          scheduled_locations: Json
          social_media: Json
          source_urls: string[]
          updated_at: string
          verification_status: string
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
      gettransactionid: { Args: never; Returns: unknown }
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
      longtransactionsenabled: { Args: never; Returns: boolean }
      normalize_phone_number: { Args: { phone_input: string }; Returns: string }
      populate_geometry_columns:
        | { Args: { tbl_oid: unknown; use_typmod?: boolean }; Returns: number }
        | { Args: { use_typmod?: boolean }; Returns: string }
      postgis_constraint_dims: {
        Args: { geomcolumn: string; geomschema: string; geomtable: string }
        Returns: number
      }
      postgis_constraint_srid: {
        Args: { geomcolumn: string; geomschema: string; geomtable: string }
        Returns: number
      }
      postgis_constraint_type: {
        Args: { geomcolumn: string; geomschema: string; geomtable: string }
        Returns: string
      }
      postgis_extensions_upgrade: { Args: never; Returns: string }
      postgis_full_version: { Args: never; Returns: string }
      postgis_geos_version: { Args: never; Returns: string }
      postgis_lib_build_date: { Args: never; Returns: string }
      postgis_lib_revision: { Args: never; Returns: string }
      postgis_lib_version: { Args: never; Returns: string }
      postgis_libjson_version: { Args: never; Returns: string }
      postgis_liblwgeom_version: { Args: never; Returns: string }
      postgis_libprotobuf_version: { Args: never; Returns: string }
      postgis_libxml_version: { Args: never; Returns: string }
      postgis_proj_version: { Args: never; Returns: string }
      postgis_scripts_build_date: { Args: never; Returns: string }
      postgis_scripts_installed: { Args: never; Returns: string }
      postgis_scripts_released: { Args: never; Returns: string }
      postgis_svn_version: { Args: never; Returns: string }
      postgis_type_name: {
        Args: {
          coord_dimension: number
          geomname: string
          use_new_name?: boolean
        }
        Returns: string
      }
      postgis_version: { Args: never; Returns: string }
      postgis_wagyu_version: { Args: never; Returns: string }
      refresh_analytics_summary: { Args: never; Returns: undefined }
      st_3dclosestpoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_3ddistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_3dintersects: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_3dlongestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_3dmakebox: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_3dmaxdistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_3dshortestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_addpoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_angle:
        | { Args: { line1: unknown; line2: unknown }; Returns: number }
        | {
            Args: { pt1: unknown; pt2: unknown; pt3: unknown; pt4?: unknown }
            Returns: number
          }
      st_area:
        | { Args: { geog: unknown; use_spheroid?: boolean }; Returns: number }
        | { Args: { "": string }; Returns: number }
      st_asencodedpolyline: {
        Args: { geom: unknown; nprecision?: number }
        Returns: string
      }
      st_asewkt: { Args: { "": string }; Returns: string }
      st_asgeojson:
        | {
            Args: { geog: unknown; maxdecimaldigits?: number; options?: number }
            Returns: string
          }
        | {
            Args: { geom: unknown; maxdecimaldigits?: number; options?: number }
            Returns: string
          }
        | {
            Args: {
              geom_column?: string
              maxdecimaldigits?: number
              pretty_bool?: boolean
              r: Record<string, unknown>
            }
            Returns: string
          }
        | { Args: { "": string }; Returns: string }
      st_asgml:
        | {
            Args: {
              geog: unknown
              id?: string
              maxdecimaldigits?: number
              nprefix?: string
              options?: number
            }
            Returns: string
          }
        | {
            Args: { geom: unknown; maxdecimaldigits?: number; options?: number }
            Returns: string
          }
        | { Args: { "": string }; Returns: string }
        | {
            Args: {
              geog: unknown
              id?: string
              maxdecimaldigits?: number
              nprefix?: string
              options?: number
              version: number
            }
            Returns: string
          }
        | {
            Args: {
              geom: unknown
              id?: string
              maxdecimaldigits?: number
              nprefix?: string
              options?: number
              version: number
            }
            Returns: string
          }
      st_askml:
        | {
            Args: { geog: unknown; maxdecimaldigits?: number; nprefix?: string }
            Returns: string
          }
        | {
            Args: { geom: unknown; maxdecimaldigits?: number; nprefix?: string }
            Returns: string
          }
        | { Args: { "": string }; Returns: string }
      st_aslatlontext: {
        Args: { geom: unknown; tmpl?: string }
        Returns: string
      }
      st_asmarc21: { Args: { format?: string; geom: unknown }; Returns: string }
      st_asmvtgeom: {
        Args: {
          bounds: unknown
          buffer?: number
          clip_geom?: boolean
          extent?: number
          geom: unknown
        }
        Returns: unknown
      }
      st_assvg:
        | {
            Args: { geog: unknown; maxdecimaldigits?: number; rel?: number }
            Returns: string
          }
        | {
            Args: { geom: unknown; maxdecimaldigits?: number; rel?: number }
            Returns: string
          }
        | { Args: { "": string }; Returns: string }
      st_astext: { Args: { "": string }; Returns: string }
      st_astwkb:
        | {
            Args: {
              geom: unknown
              prec?: number
              prec_m?: number
              prec_z?: number
              with_boxes?: boolean
              with_sizes?: boolean
            }
            Returns: string
          }
        | {
            Args: {
              geom: unknown[]
              ids: number[]
              prec?: number
              prec_m?: number
              prec_z?: number
              with_boxes?: boolean
              with_sizes?: boolean
            }
            Returns: string
          }
      st_asx3d: {
        Args: { geom: unknown; maxdecimaldigits?: number; options?: number }
        Returns: string
      }
      st_azimuth:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: number }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: number }
      st_boundingdiagonal: {
        Args: { fits?: boolean; geom: unknown }
        Returns: unknown
      }
      st_buffer:
        | {
            Args: { geom: unknown; options?: string; radius: number }
            Returns: unknown
          }
        | {
            Args: { geom: unknown; quadsegs: number; radius: number }
            Returns: unknown
          }
      st_centroid: { Args: { "": string }; Returns: unknown }
      st_clipbybox2d: {
        Args: { box: unknown; geom: unknown }
        Returns: unknown
      }
      st_closestpoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_collect: { Args: { geom1: unknown; geom2: unknown }; Returns: unknown }
      st_concavehull: {
        Args: {
          param_allow_holes?: boolean
          param_geom: unknown
          param_pctconvex: number
        }
        Returns: unknown
      }
      st_contains: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_containsproperly: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_coorddim: { Args: { geometry: unknown }; Returns: number }
      st_coveredby:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_covers:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_crosses: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_curvetoline: {
        Args: { flags?: number; geom: unknown; tol?: number; toltype?: number }
        Returns: unknown
      }
      st_delaunaytriangles: {
        Args: { flags?: number; g1: unknown; tolerance?: number }
        Returns: unknown
      }
      st_difference: {
        Args: { geom1: unknown; geom2: unknown; gridsize?: number }
        Returns: unknown
      }
      st_disjoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_distance:
        | {
            Args: { geog1: unknown; geog2: unknown; use_spheroid?: boolean }
            Returns: number
          }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: number }
      st_distancesphere:
        | { Args: { geom1: unknown; geom2: unknown }; Returns: number }
        | {
            Args: { geom1: unknown; geom2: unknown; radius: number }
            Returns: number
          }
      st_distancespheroid: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_dwithin: {
        Args: {
          geog1: unknown
          geog2: unknown
          tolerance: number
          use_spheroid?: boolean
        }
        Returns: boolean
      }
      st_equals: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_expand:
        | { Args: { box: unknown; dx: number; dy: number }; Returns: unknown }
        | {
            Args: { box: unknown; dx: number; dy: number; dz?: number }
            Returns: unknown
          }
        | {
            Args: {
              dm?: number
              dx: number
              dy: number
              dz?: number
              geom: unknown
            }
            Returns: unknown
          }
      st_force3d: { Args: { geom: unknown; zvalue?: number }; Returns: unknown }
      st_force3dm: {
        Args: { geom: unknown; mvalue?: number }
        Returns: unknown
      }
      st_force3dz: {
        Args: { geom: unknown; zvalue?: number }
        Returns: unknown
      }
      st_force4d: {
        Args: { geom: unknown; mvalue?: number; zvalue?: number }
        Returns: unknown
      }
      st_generatepoints:
        | { Args: { area: unknown; npoints: number }; Returns: unknown }
        | {
            Args: { area: unknown; npoints: number; seed: number }
            Returns: unknown
          }
      st_geogfromtext: { Args: { "": string }; Returns: unknown }
      st_geographyfromtext: { Args: { "": string }; Returns: unknown }
      st_geohash:
        | { Args: { geog: unknown; maxchars?: number }; Returns: string }
        | { Args: { geom: unknown; maxchars?: number }; Returns: string }
      st_geomcollfromtext: { Args: { "": string }; Returns: unknown }
      st_geometricmedian: {
        Args: {
          fail_if_not_converged?: boolean
          g: unknown
          max_iter?: number
          tolerance?: number
        }
        Returns: unknown
      }
      st_geometryfromtext: { Args: { "": string }; Returns: unknown }
      st_geomfromewkt: { Args: { "": string }; Returns: unknown }
      st_geomfromgeojson:
        | { Args: { "": Json }; Returns: unknown }
        | { Args: { "": Json }; Returns: unknown }
        | { Args: { "": string }; Returns: unknown }
      st_geomfromgml: { Args: { "": string }; Returns: unknown }
      st_geomfromkml: { Args: { "": string }; Returns: unknown }
      st_geomfrommarc21: { Args: { marc21xml: string }; Returns: unknown }
      st_geomfromtext: { Args: { "": string }; Returns: unknown }
      st_gmltosql: { Args: { "": string }; Returns: unknown }
      st_hasarc: { Args: { geometry: unknown }; Returns: boolean }
      st_hausdorffdistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_hexagon: {
        Args: { cell_i: number; cell_j: number; origin?: unknown; size: number }
        Returns: unknown
      }
      st_hexagongrid: {
        Args: { bounds: unknown; size: number }
        Returns: Record<string, unknown>[]
      }
      st_interpolatepoint: {
        Args: { line: unknown; point: unknown }
        Returns: number
      }
      st_intersection: {
        Args: { geom1: unknown; geom2: unknown; gridsize?: number }
        Returns: unknown
      }
      st_intersects:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_isvaliddetail: {
        Args: { flags?: number; geom: unknown }
        Returns: Database["public"]["CompositeTypes"]["valid_detail"]
        SetofOptions: {
          from: "*"
          to: "valid_detail"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      st_length:
        | { Args: { geog: unknown; use_spheroid?: boolean }; Returns: number }
        | { Args: { "": string }; Returns: number }
      st_letters: { Args: { font?: Json; letters: string }; Returns: unknown }
      st_linecrossingdirection: {
        Args: { line1: unknown; line2: unknown }
        Returns: number
      }
      st_linefromencodedpolyline: {
        Args: { nprecision?: number; txtin: string }
        Returns: unknown
      }
      st_linefromtext: { Args: { "": string }; Returns: unknown }
      st_linelocatepoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_linetocurve: { Args: { geometry: unknown }; Returns: unknown }
      st_locatealong: {
        Args: { geometry: unknown; leftrightoffset?: number; measure: number }
        Returns: unknown
      }
      st_locatebetween: {
        Args: {
          frommeasure: number
          geometry: unknown
          leftrightoffset?: number
          tomeasure: number
        }
        Returns: unknown
      }
      st_locatebetweenelevations: {
        Args: { fromelevation: number; geometry: unknown; toelevation: number }
        Returns: unknown
      }
      st_longestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_makebox2d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_makeline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_makevalid: {
        Args: { geom: unknown; params: string }
        Returns: unknown
      }
      st_maxdistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_minimumboundingcircle: {
        Args: { inputgeom: unknown; segs_per_quarter?: number }
        Returns: unknown
      }
      st_mlinefromtext: { Args: { "": string }; Returns: unknown }
      st_mpointfromtext: { Args: { "": string }; Returns: unknown }
      st_mpolyfromtext: { Args: { "": string }; Returns: unknown }
      st_multilinestringfromtext: { Args: { "": string }; Returns: unknown }
      st_multipointfromtext: { Args: { "": string }; Returns: unknown }
      st_multipolygonfromtext: { Args: { "": string }; Returns: unknown }
      st_node: { Args: { g: unknown }; Returns: unknown }
      st_normalize: { Args: { geom: unknown }; Returns: unknown }
      st_offsetcurve: {
        Args: { distance: number; line: unknown; params?: string }
        Returns: unknown
      }
      st_orderingequals: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_overlaps: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_perimeter: {
        Args: { geog: unknown; use_spheroid?: boolean }
        Returns: number
      }
      st_pointfromtext: { Args: { "": string }; Returns: unknown }
      st_pointm: {
        Args: {
          mcoordinate: number
          srid?: number
          xcoordinate: number
          ycoordinate: number
        }
        Returns: unknown
      }
      st_pointz: {
        Args: {
          srid?: number
          xcoordinate: number
          ycoordinate: number
          zcoordinate: number
        }
        Returns: unknown
      }
      st_pointzm: {
        Args: {
          mcoordinate: number
          srid?: number
          xcoordinate: number
          ycoordinate: number
          zcoordinate: number
        }
        Returns: unknown
      }
      st_polyfromtext: { Args: { "": string }; Returns: unknown }
      st_polygonfromtext: { Args: { "": string }; Returns: unknown }
      st_project: {
        Args: { azimuth: number; distance: number; geog: unknown }
        Returns: unknown
      }
      st_quantizecoordinates: {
        Args: {
          g: unknown
          prec_m?: number
          prec_x: number
          prec_y?: number
          prec_z?: number
        }
        Returns: unknown
      }
      st_reduceprecision: {
        Args: { geom: unknown; gridsize: number }
        Returns: unknown
      }
      st_relate: { Args: { geom1: unknown; geom2: unknown }; Returns: string }
      st_removerepeatedpoints: {
        Args: { geom: unknown; tolerance?: number }
        Returns: unknown
      }
      st_segmentize: {
        Args: { geog: unknown; max_segment_length: number }
        Returns: unknown
      }
      st_setsrid:
        | { Args: { geog: unknown; srid: number }; Returns: unknown }
        | { Args: { geom: unknown; srid: number }; Returns: unknown }
      st_sharedpaths: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_shortestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_simplifypolygonhull: {
        Args: { geom: unknown; is_outer?: boolean; vertex_fraction: number }
        Returns: unknown
      }
      st_split: { Args: { geom1: unknown; geom2: unknown }; Returns: unknown }
      st_square: {
        Args: { cell_i: number; cell_j: number; origin?: unknown; size: number }
        Returns: unknown
      }
      st_squaregrid: {
        Args: { bounds: unknown; size: number }
        Returns: Record<string, unknown>[]
      }
      st_srid:
        | { Args: { geog: unknown }; Returns: number }
        | { Args: { geom: unknown }; Returns: number }
      st_subdivide: {
        Args: { geom: unknown; gridsize?: number; maxvertices?: number }
        Returns: unknown[]
      }
      st_swapordinates: {
        Args: { geom: unknown; ords: unknown }
        Returns: unknown
      }
      st_symdifference: {
        Args: { geom1: unknown; geom2: unknown; gridsize?: number }
        Returns: unknown
      }
      st_symmetricdifference: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_tileenvelope: {
        Args: {
          bounds?: unknown
          margin?: number
          x: number
          y: number
          zoom: number
        }
        Returns: unknown
      }
      st_touches: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_transform:
        | {
            Args: { from_proj: string; geom: unknown; to_proj: string }
            Returns: unknown
          }
        | {
            Args: { from_proj: string; geom: unknown; to_srid: number }
            Returns: unknown
          }
        | { Args: { geom: unknown; to_proj: string }; Returns: unknown }
      st_triangulatepolygon: { Args: { g1: unknown }; Returns: unknown }
      st_union:
        | { Args: { geom1: unknown; geom2: unknown }; Returns: unknown }
        | {
            Args: { geom1: unknown; geom2: unknown; gridsize: number }
            Returns: unknown
          }
      st_voronoilines: {
        Args: { extend_to?: unknown; g1: unknown; tolerance?: number }
        Returns: unknown
      }
      st_voronoipolygons: {
        Args: { extend_to?: unknown; g1: unknown; tolerance?: number }
        Returns: unknown
      }
      st_within: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_wkbtosql: { Args: { wkb: string }; Returns: unknown }
      st_wkttosql: { Args: { "": string }; Returns: unknown }
      st_wrapx: {
        Args: { geom: unknown; move: number; wrap: number }
        Returns: unknown
      }
      unlockrows: { Args: { "": string }; Returns: number }
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
      updategeometrysrid: {
        Args: {
          catalogn_name: string
          column_name: string
          new_srid_in: number
          schema_name: string
          table_name: string
        }
        Returns: string
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
      geometry_dump: {
        path: number[] | null
        geom: unknown
      }
      valid_detail: {
        valid: boolean | null
        reason: string | null
        location: unknown
      }
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
