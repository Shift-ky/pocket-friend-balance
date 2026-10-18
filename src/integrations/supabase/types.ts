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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      despesas: {
        Row: {
          categoria: string
          created_at: string
          data: string
          descricao: string
          fornecedor: string
          grupo_id: string
          id: string
          valor: number
        }
        Insert: {
          categoria?: string
          created_at?: string
          data?: string
          descricao?: string
          fornecedor?: string
          grupo_id: string
          id?: string
          valor?: number
        }
        Update: {
          categoria?: string
          created_at?: string
          data?: string
          descricao?: string
          fornecedor?: string
          grupo_id?: string
          id?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "despesas_grupo_id_fkey"
            columns: ["grupo_id"]
            isOneToOne: false
            referencedRelation: "grupos"
            referencedColumns: ["id"]
          },
        ]
      }
      estoque: {
        Row: {
          created_at: string
          divisao_id: string | null
          grupo_id: string
          id: string
          nome: string
          ordem: number | null
          padrao: number
          qtd: number
        }
        Insert: {
          created_at?: string
          divisao_id?: string | null
          grupo_id: string
          id?: string
          nome: string
          ordem?: number | null
          padrao?: number
          qtd?: number
        }
        Update: {
          created_at?: string
          divisao_id?: string | null
          grupo_id?: string
          id?: string
          nome?: string
          ordem?: number | null
          padrao?: number
          qtd?: number
        }
        Relationships: [
          {
            foreignKeyName: "estoque_divisao_grupo"
            columns: ["divisao_id", "grupo_id"]
            isOneToOne: false
            referencedRelation: "estoque_divisoes"
            referencedColumns: ["id", "grupo_id"]
          },
          {
            foreignKeyName: "estoque_grupo_id_fkey"
            columns: ["grupo_id"]
            isOneToOne: false
            referencedRelation: "grupos"
            referencedColumns: ["id"]
          },
        ]
      }
      estoque_divisoes: {
        Row: {
          created_at: string
          grupo_id: string
          id: string
          nome: string
        }
        Insert: {
          created_at?: string
          grupo_id: string
          id?: string
          nome: string
        }
        Update: {
          created_at?: string
          grupo_id?: string
          id?: string
          nome?: string
        }
        Relationships: [
          {
            foreignKeyName: "estoque_divisoes_grupo_id_fkey"
            columns: ["grupo_id"]
            isOneToOne: false
            referencedRelation: "grupos"
            referencedColumns: ["id"]
          },
        ]
      }
      feira_historico: {
        Row: {
          created_at: string
          grupo_id: string
          id: string
          itens: Json
          lancamento_id: string | null
          pagamento: string
          total: number
        }
        Insert: {
          created_at?: string
          grupo_id: string
          id?: string
          itens?: Json
          lancamento_id?: string | null
          pagamento?: string
          total?: number
        }
        Update: {
          created_at?: string
          grupo_id?: string
          id?: string
          itens?: Json
          lancamento_id?: string | null
          pagamento?: string
          total?: number
        }
        Relationships: [
          {
            foreignKeyName: "feira_historico_grupo_id_fkey"
            columns: ["grupo_id"]
            isOneToOne: false
            referencedRelation: "grupos"
            referencedColumns: ["id"]
          },
        ]
      }
      feira_itens: {
        Row: {
          created_at: string
          grupo_id: string
          id: string
          nome: string
          pego: boolean
          preco: number
          qtd: number
        }
        Insert: {
          created_at?: string
          grupo_id: string
          id?: string
          nome: string
          pego?: boolean
          preco?: number
          qtd?: number
        }
        Update: {
          created_at?: string
          grupo_id?: string
          id?: string
          nome?: string
          pego?: boolean
          preco?: number
          qtd?: number
        }
        Relationships: [
          {
            foreignKeyName: "feira_itens_grupo_id_fkey"
            columns: ["grupo_id"]
            isOneToOne: false
            referencedRelation: "grupos"
            referencedColumns: ["id"]
          },
        ]
      }
      grupo_membros: {
        Row: {
          email: string | null
          grupo_id: string
          user_id: string
        }
        Insert: {
          email?: string | null
          grupo_id: string
          user_id: string
        }
        Update: {
          email?: string | null
          grupo_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "grupo_membros_grupo_id_fkey"
            columns: ["grupo_id"]
            isOneToOne: false
            referencedRelation: "grupos"
            referencedColumns: ["id"]
          },
        ]
      }
      grupos: {
        Row: {
          codigo: string
          created_at: string
          criado_por: string
          id: string
          nome: string
        }
        Insert: {
          codigo?: string
          created_at?: string
          criado_por?: string
          id?: string
          nome: string
        }
        Update: {
          codigo?: string
          created_at?: string
          criado_por?: string
          id?: string
          nome?: string
        }
        Relationships: []
      }
      lancamentos: {
        Row: {
          conta: string
          created_at: string
          data: string
          descricao: string
          destino: string
          grupo_id: string
          id: string
          origem_modulo: string
          pago: boolean
          tipo: string
          valor: number
        }
        Insert: {
          conta?: string
          created_at?: string
          data?: string
          descricao: string
          destino?: string
          grupo_id: string
          id?: string
          origem_modulo?: string
          pago?: boolean
          tipo: string
          valor: number
        }
        Update: {
          conta?: string
          created_at?: string
          data?: string
          descricao?: string
          destino?: string
          grupo_id?: string
          id?: string
          origem_modulo?: string
          pago?: boolean
          tipo?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "lancamentos_grupo_id_fkey"
            columns: ["grupo_id"]
            isOneToOne: false
            referencedRelation: "grupos"
            referencedColumns: ["id"]
          },
        ]
      }
      moto_despesas: {
        Row: {
          conta: string
          created_at: string
          data: string
          descricao: string
          grupo_id: string
          id: string
          valor: number
        }
        Insert: {
          conta?: string
          created_at?: string
          data?: string
          descricao: string
          grupo_id: string
          id?: string
          valor: number
        }
        Update: {
          conta?: string
          created_at?: string
          data?: string
          descricao?: string
          grupo_id?: string
          id?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "moto_despesas_grupo_id_fkey"
            columns: ["grupo_id"]
            isOneToOne: false
            referencedRelation: "grupos"
            referencedColumns: ["id"]
          },
        ]
      }
      user_access: {
        Row: {
          estoque: boolean
          feira: boolean
          financas: boolean
          moto: boolean
          user_id: string
        }
        Insert: {
          estoque?: boolean
          feira?: boolean
          financas?: boolean
          moto?: boolean
          user_id: string
        }
        Update: {
          estoque?: boolean
          feira?: boolean
          financas?: boolean
          moto?: boolean
          user_id?: string
        }
        Relationships: []
      }
      user_appearance: {
        Row: {
          background_path: string | null
          background_visibility: number
          custom_colors: Json
          custom_enabled: boolean
          theme: string
          user_id: string
        }
        Insert: {
          background_path?: string | null
          background_visibility?: number
          custom_colors?: Json
          custom_enabled?: boolean
          theme?: string
          user_id: string
        }
        Update: {
          background_path?: string | null
          background_visibility?: number
          custom_colors?: Json
          custom_enabled?: boolean
          theme?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      criar_grupo: { Args: { _nome: string }; Returns: string }
      e_membro: { Args: { _grupo: string }; Returns: boolean }
      entrar_grupo: { Args: { _codigo: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      module_access: { Args: { _module: string }; Returns: boolean }
      ordenar_estoque: {
        Args: { _grupo_id: string; _ids: string[] }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "admin" | "user"
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
      app_role: ["admin", "user"],
    },
  },
} as const
