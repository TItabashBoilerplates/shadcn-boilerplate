export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

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
      __drizzle_migrations: {
        Row: {
          created_at: number | null;
          hash: string;
          id: number;
        };
        Insert: {
          created_at?: number | null;
          hash: string;
          id?: number;
        };
        Update: {
          created_at?: number | null;
          hash?: string;
          id?: number;
        };
        Relationships: [];
      };
      addresses: {
        Row: {
          city: string;
          country: string;
          id: number;
          postal_code: string;
          profile_id: number | null;
          state: string;
          street: string;
        };
        Insert: {
          city: string;
          country: string;
          id?: number;
          postal_code: string;
          profile_id?: number | null;
          state: string;
          street: string;
        };
        Update: {
          city?: string;
          country?: string;
          id?: number;
          postal_code?: string;
          profile_id?: number | null;
          state?: string;
          street?: string;
        };
        Relationships: [
          {
            foreignKeyName: "addresses_profile_id_general_user_profiles_id_fk";
            columns: ["profile_id"];
            isOneToOne: true;
            referencedRelation: "general_user_profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      chat_rooms: {
        Row: {
          created_at: string;
          id: number;
          type: Database["public"]["Enums"]["chat_type"];
        };
        Insert: {
          created_at?: string;
          id?: number;
          type: Database["public"]["Enums"]["chat_type"];
        };
        Update: {
          created_at?: string;
          id?: number;
          type?: Database["public"]["Enums"]["chat_type"];
        };
        Relationships: [];
      };
      corporate_users: {
        Row: {
          created_at: string;
          id: string;
          name: string;
          organization_id: number;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          id: string;
          name?: string;
          organization_id: number;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          name?: string;
          organization_id?: number;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName:
              "corporate_users_organization_id_organizations_id_fk";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      embeddings: {
        Row: {
          content: string;
          created_at: string;
          embedding: string;
          id: string;
          metadata: Json;
          updated_at: string;
        };
        Insert: {
          content: string;
          created_at?: string;
          embedding: string;
          id: string;
          metadata: Json;
          updated_at?: string;
        };
        Update: {
          content?: string;
          created_at?: string;
          embedding?: string;
          id?: string;
          metadata?: Json;
          updated_at?: string;
        };
        Relationships: [];
      };
      general_user_profiles: {
        Row: {
          email: string;
          first_name: string;
          id: number;
          last_name: string;
          phone_number: string | null;
          user_id: string;
        };
        Insert: {
          email: string;
          first_name?: string;
          id?: number;
          last_name?: string;
          phone_number?: string | null;
          user_id: string;
        };
        Update: {
          email?: string;
          first_name?: string;
          id?: number;
          last_name?: string;
          phone_number?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "general_user_profiles_user_id_general_users_id_fk";
            columns: ["user_id"];
            isOneToOne: true;
            referencedRelation: "general_users";
            referencedColumns: ["id"];
          },
        ];
      };
      general_users: {
        Row: {
          account_name: string;
          created_at: string;
          display_name: string;
          id: string;
          updated_at: string;
        };
        Insert: {
          account_name: string;
          created_at?: string;
          display_name?: string;
          id: string;
          updated_at?: string;
        };
        Update: {
          account_name?: string;
          created_at?: string;
          display_name?: string;
          id?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      messages: {
        Row: {
          chat_room_id: number;
          content: string;
          created_at: string;
          id: number;
          sender_id: string | null;
          virtual_user_id: string | null;
        };
        Insert: {
          chat_room_id: number;
          content: string;
          created_at?: string;
          id?: number;
          sender_id?: string | null;
          virtual_user_id?: string | null;
        };
        Update: {
          chat_room_id?: number;
          content?: string;
          created_at?: string;
          id?: number;
          sender_id?: string | null;
          virtual_user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "messages_chat_room_id_chat_rooms_id_fk";
            columns: ["chat_room_id"];
            isOneToOne: false;
            referencedRelation: "chat_rooms";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "messages_sender_id_general_users_id_fk";
            columns: ["sender_id"];
            isOneToOne: false;
            referencedRelation: "general_users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "messages_virtual_user_id_virtual_users_id_fk";
            columns: ["virtual_user_id"];
            isOneToOne: false;
            referencedRelation: "virtual_users";
            referencedColumns: ["id"];
          },
        ];
      };
      organizations: {
        Row: {
          created_at: string;
          id: number;
          name: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          id?: number;
          name: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          id?: number;
          name?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      user_chats: {
        Row: {
          chat_room_id: number;
          id: number;
          user_id: string;
        };
        Insert: {
          chat_room_id: number;
          id?: number;
          user_id: string;
        };
        Update: {
          chat_room_id?: number;
          id?: number;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "user_chats_chat_room_id_chat_rooms_id_fk";
            columns: ["chat_room_id"];
            isOneToOne: false;
            referencedRelation: "chat_rooms";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "user_chats_user_id_general_users_id_fk";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "general_users";
            referencedColumns: ["id"];
          },
        ];
      };
      virtual_user_chats: {
        Row: {
          chat_room_id: number;
          id: number;
          virtual_user_id: string;
        };
        Insert: {
          chat_room_id: number;
          id?: number;
          virtual_user_id: string;
        };
        Update: {
          chat_room_id?: number;
          id?: number;
          virtual_user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "virtual_user_chats_chat_room_id_chat_rooms_id_fk";
            columns: ["chat_room_id"];
            isOneToOne: false;
            referencedRelation: "chat_rooms";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName:
              "virtual_user_chats_virtual_user_id_virtual_users_id_fk";
            columns: ["virtual_user_id"];
            isOneToOne: false;
            referencedRelation: "virtual_users";
            referencedColumns: ["id"];
          },
        ];
      };
      virtual_user_profiles: {
        Row: {
          backstory: string;
          created_at: string;
          id: number;
          knowledge: Json | null;
          knowledge_area: string[];
          personality: string;
          quirks: string | null;
          tone: string;
          updated_at: string;
          virtual_user_id: string;
        };
        Insert: {
          backstory?: string;
          created_at?: string;
          id?: number;
          knowledge?: Json | null;
          knowledge_area: string[];
          personality?: string;
          quirks?: string | null;
          tone?: string;
          updated_at?: string;
          virtual_user_id: string;
        };
        Update: {
          backstory?: string;
          created_at?: string;
          id?: number;
          knowledge?: Json | null;
          knowledge_area?: string[];
          personality?: string;
          quirks?: string | null;
          tone?: string;
          updated_at?: string;
          virtual_user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName:
              "virtual_user_profiles_virtual_user_id_virtual_users_id_fk";
            columns: ["virtual_user_id"];
            isOneToOne: false;
            referencedRelation: "virtual_users";
            referencedColumns: ["id"];
          },
        ];
      };
      virtual_users: {
        Row: {
          created_at: string;
          id: string;
          name: string;
          owner_id: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          id: string;
          name: string;
          owner_id: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          name?: string;
          owner_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "virtual_users_owner_id_general_users_id_fk";
            columns: ["owner_id"];
            isOneToOne: false;
            referencedRelation: "general_users";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      binary_quantize: {
        Args: { "": string } | { "": unknown };
        Returns: unknown;
      };
      halfvec_avg: {
        Args: { "": number[] };
        Returns: unknown;
      };
      halfvec_out: {
        Args: { "": unknown };
        Returns: unknown;
      };
      halfvec_send: {
        Args: { "": unknown };
        Returns: string;
      };
      halfvec_typmod_in: {
        Args: { "": unknown[] };
        Returns: number;
      };
      hnsw_bit_support: {
        Args: { "": unknown };
        Returns: unknown;
      };
      hnsw_halfvec_support: {
        Args: { "": unknown };
        Returns: unknown;
      };
      hnsw_sparsevec_support: {
        Args: { "": unknown };
        Returns: unknown;
      };
      hnswhandler: {
        Args: { "": unknown };
        Returns: unknown;
      };
      ivfflat_bit_support: {
        Args: { "": unknown };
        Returns: unknown;
      };
      ivfflat_halfvec_support: {
        Args: { "": unknown };
        Returns: unknown;
      };
      ivfflathandler: {
        Args: { "": unknown };
        Returns: unknown;
      };
      l2_norm: {
        Args: { "": unknown } | { "": unknown };
        Returns: number;
      };
      l2_normalize: {
        Args: { "": string } | { "": unknown } | { "": unknown };
        Returns: string;
      };
      sparsevec_out: {
        Args: { "": unknown };
        Returns: unknown;
      };
      sparsevec_send: {
        Args: { "": unknown };
        Returns: string;
      };
      sparsevec_typmod_in: {
        Args: { "": unknown[] };
        Returns: number;
      };
      vector_avg: {
        Args: { "": number[] };
        Returns: string;
      };
      vector_dims: {
        Args: { "": string } | { "": unknown };
        Returns: number;
      };
      vector_norm: {
        Args: { "": string };
        Returns: number;
      };
      vector_out: {
        Args: { "": string };
        Returns: unknown;
      };
      vector_send: {
        Args: { "": string };
        Returns: string;
      };
      vector_typmod_in: {
        Args: { "": unknown[] };
        Returns: number;
      };
    };
    Enums: {
      chat_type: "PRIVATE" | "GROUP";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema =
  DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  } ? keyof (
      & DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]][
        "Tables"
      ]
      & DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]][
        "Views"
      ]
    )
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
} ? (
    & DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]][
      "Tables"
    ]
    & DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]][
      "Views"
    ]
  )[TableName] extends {
    Row: infer R;
  } ? R
  : never
  : DefaultSchemaTableNameOrOptions extends keyof (
    & DefaultSchema["Tables"]
    & DefaultSchema["Views"]
  ) ? (
      & DefaultSchema["Tables"]
      & DefaultSchema["Views"]
    )[DefaultSchemaTableNameOrOptions] extends {
      Row: infer R;
    } ? R
    : never
  : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  } ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]][
      "Tables"
    ]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
} ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]][
    "Tables"
  ][TableName] extends {
    Insert: infer I;
  } ? I
  : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Insert: infer I;
    } ? I
    : never
  : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  } ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]][
      "Tables"
    ]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
} ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]][
    "Tables"
  ][TableName] extends {
    Update: infer U;
  } ? U
  : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Update: infer U;
    } ? U
    : never
  : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  } ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]][
      "Enums"
    ]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
} ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][
    EnumName
  ]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
  : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  } ? keyof DatabaseWithoutInternals[
      PublicCompositeTypeNameOrOptions["schema"]
    ]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
} ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]][
    "CompositeTypes"
  ][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never;

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      chat_type: ["PRIVATE", "GROUP"],
    },
  },
} as const;
