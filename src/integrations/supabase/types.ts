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
      carteiras: {
        Row: {
          cor: string
          created_at: string
          grupo_id: string
          icone: string
          id: string
          legado: string | null
          moeda: string
          na_feira: boolean
          nas_fixas: boolean
          no_painel: boolean
          nome: string
          tipo: string
        }
        Insert: {
          cor?: string
          created_at?: string
          grupo_id: string
          icone?: string
          id?: string
          legado?: string | null
          moeda?: string
          na_feira?: boolean
          nas_fixas?: boolean
          no_painel?: boolean
          nome: string
          tipo?: string
        }
        Update: {
          cor?: string
          created_at?: string
          grupo_id?: string
          icone?: string
          id?: string
          legado?: string | null
          moeda?: string
          na_feira?: boolean
          nas_fixas?: boolean
          no_painel?: boolean
          nome?: string
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "carteiras_grupo_id_fkey"
            columns: ["grupo_id"]
            isOneToOne: false
            referencedRelation: "grupos"
            referencedColumns: ["id"]
          },
        ]
      }
      contas_fixas: {
        Row: {
          ativa: boolean
          carteira_id: string | null
          conta: string
          created_at: string
          criado_por: string
          descricao: string
          dia: number
          fim: string | null
          grupo_id: string
          id: string
          inicio: string
          modalidade: string
          valor: number
        }
        Insert: {
          ativa?: boolean
          carteira_id?: string | null
          conta?: string
          created_at?: string
          criado_por?: string
          descricao: string
          dia: number
          fim?: string | null
          grupo_id: string
          id?: string
          inicio: string
          modalidade: string
          valor: number
        }
        Update: {
          ativa?: boolean
          carteira_id?: string | null
          conta?: string
          created_at?: string
          criado_por?: string
          descricao?: string
          dia?: number
          fim?: string | null
          grupo_id?: string
          id?: string
          inicio?: string
          modalidade?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "contas_fixas_grupo_id_carteira_id_fkey"
            columns: ["grupo_id", "carteira_id"]
            isOneToOne: false
            referencedRelation: "carteiras"
            referencedColumns: ["grupo_id", "id"]
          },
          {
            foreignKeyName: "contas_fixas_grupo_id_fkey"
            columns: ["grupo_id"]
            isOneToOne: false
            referencedRelation: "grupos"
            referencedColumns: ["id"]
          },
        ]
      }
      contas_fixas_ocorrencias: {
        Row: {
          competencia: string
          created_at: string
          fixa_id: string
          lancamento_id: string
        }
        Insert: {
          competencia: string
          created_at?: string
          fixa_id: string
          lancamento_id: string
        }
        Update: {
          competencia?: string
          created_at?: string
          fixa_id?: string
          lancamento_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "contas_fixas_ocorrencias_fixa_id_fkey"
            columns: ["fixa_id"]
            isOneToOne: false
            referencedRelation: "contas_fixas"
            referencedColumns: ["id"]
          },
        ]
      }
      cotacoes: {
        Row: {
          consultado_em: string
          data: string
          moeda: string
          valor_brl: number
        }
        Insert: {
          consultado_em?: string
          data: string
          moeda: string
          valor_brl: number
        }
        Update: {
          consultado_em?: string
          data?: string
          moeda?: string
          valor_brl?: number
        }
        Relationships: []
      }
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
          carteira_id: string | null
          created_at: string
          data_compra: string | null
          grupo_id: string
          id: string
          itens: Json
          lancamento_id: string | null
          local: string
          pagamento: string
          total: number
        }
        Insert: {
          carteira_id?: string | null
          created_at?: string
          data_compra?: string | null
          grupo_id: string
          id?: string
          itens?: Json
          lancamento_id?: string | null
          local?: string
          pagamento?: string
          total?: number
        }
        Update: {
          carteira_id?: string | null
          created_at?: string
          data_compra?: string | null
          grupo_id?: string
          id?: string
          itens?: Json
          lancamento_id?: string | null
          local?: string
          pagamento?: string
          total?: number
        }
        Relationships: [
          {
            foreignKeyName: "feira_historico_grupo_id_carteira_id_fkey"
            columns: ["grupo_id", "carteira_id"]
            isOneToOne: false
            referencedRelation: "carteiras"
            referencedColumns: ["grupo_id", "id"]
          },
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
          ordem: number | null
          pego: boolean
          preco: number
          qtd: number
          qtd_comprada: number
        }
        Insert: {
          created_at?: string
          grupo_id: string
          id?: string
          nome: string
          ordem?: number | null
          pego?: boolean
          preco?: number
          qtd?: number
          qtd_comprada?: number
        }
        Update: {
          created_at?: string
          grupo_id?: string
          id?: string
          nome?: string
          ordem?: number | null
          pego?: boolean
          preco?: number
          qtd?: number
          qtd_comprada?: number
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
          carteira_id: string | null
          categoria: string
          conta: string
          created_at: string
          criado_por: string | null
          data: string
          descricao: string
          destino: string
          fonte: string
          grupo_id: string
          id: string
          origem_modulo: string
          pago: boolean
          tipo: string
          transferencia_id: string | null
          valor: number
        }
        Insert: {
          carteira_id?: string | null
          categoria?: string
          conta?: string
          created_at?: string
          criado_por?: string | null
          data?: string
          descricao: string
          destino?: string
          fonte?: string
          grupo_id: string
          id?: string
          origem_modulo?: string
          pago?: boolean
          tipo: string
          transferencia_id?: string | null
          valor: number
        }
        Update: {
          carteira_id?: string | null
          categoria?: string
          conta?: string
          created_at?: string
          criado_por?: string | null
          data?: string
          descricao?: string
          destino?: string
          fonte?: string
          grupo_id?: string
          id?: string
          origem_modulo?: string
          pago?: boolean
          tipo?: string
          transferencia_id?: string | null
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "lancamentos_grupo_id_carteira_id_fkey"
            columns: ["grupo_id", "carteira_id"]
            isOneToOne: false
            referencedRelation: "carteiras"
            referencedColumns: ["grupo_id", "id"]
          },
          {
            foreignKeyName: "lancamentos_grupo_id_fkey"
            columns: ["grupo_id"]
            isOneToOne: false
            referencedRelation: "grupos"
            referencedColumns: ["id"]
          },
        ]
      }
      metas: {
        Row: {
          ativa: boolean
          carteira_id: string
          created_at: string
          data_limite: string | null
          grupo_id: string
          id: string
          nome: string
          valor_alvo: number
        }
        Insert: {
          ativa?: boolean
          carteira_id: string
          created_at?: string
          data_limite?: string | null
          grupo_id: string
          id?: string
          nome: string
          valor_alvo: number
        }
        Update: {
          ativa?: boolean
          carteira_id?: string
          created_at?: string
          data_limite?: string | null
          grupo_id?: string
          id?: string
          nome?: string
          valor_alvo?: number
        }
        Relationships: [
          {
            foreignKeyName: "metas_grupo_id_carteira_id_fkey"
            columns: ["grupo_id", "carteira_id"]
            isOneToOne: false
            referencedRelation: "carteiras"
            referencedColumns: ["grupo_id", "id"]
          },
          {
            foreignKeyName: "metas_grupo_id_fkey"
            columns: ["grupo_id"]
            isOneToOne: false
            referencedRelation: "grupos"
            referencedColumns: ["id"]
          },
        ]
      }
      moto_despesas: {
        Row: {
          categoria: string
          conta: string
          created_at: string
          criado_por: string | null
          data: string
          descricao: string
          grupo_id: string
          id: string
          valor: number
        }
        Insert: {
          categoria?: string
          conta?: string
          created_at?: string
          criado_por?: string | null
          data?: string
          descricao: string
          grupo_id: string
          id?: string
          valor: number
        }
        Update: {
          categoria?: string
          conta?: string
          created_at?: string
          criado_por?: string | null
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
      offline_operations: {
        Row: {
          created_at: string
          id: string
          payload: Json
          user_id: string
        }
        Insert: {
          created_at?: string
          id: string
          payload: Json
          user_id?: string
        }
        Update: {
          created_at?: string
          id?: string
          payload?: Json
          user_id?: string
        }
        Relationships: []
      }
      telegram_ai_state: {
        Row: {
          id: boolean
          paused: boolean
          reason: string | null
          updated_at: string
        }
        Insert: {
          id?: boolean
          paused?: boolean
          reason?: string | null
          updated_at?: string
        }
        Update: {
          id?: boolean
          paused?: boolean
          reason?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      telegram_links: {
        Row: {
          chat_id: number | null
          code_expires_at: string | null
          code_hash: string | null
          created_at: string
          grupo_id: string
          telegram_user_id: number | null
          user_id: string
        }
        Insert: {
          chat_id?: number | null
          code_expires_at?: string | null
          code_hash?: string | null
          created_at?: string
          grupo_id: string
          telegram_user_id?: number | null
          user_id: string
        }
        Update: {
          chat_id?: number | null
          code_expires_at?: string | null
          code_hash?: string | null
          created_at?: string
          grupo_id?: string
          telegram_user_id?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "telegram_links_grupo_id_fkey"
            columns: ["grupo_id"]
            isOneToOne: false
            referencedRelation: "grupos"
            referencedColumns: ["id"]
          },
        ]
      }
      telegram_product_links: {
        Row: {
          estoque_id: string
          grupo_id: string
          nome_cupom: string
          updated_at: string
        }
        Insert: {
          estoque_id: string
          grupo_id: string
          nome_cupom: string
          updated_at?: string
        }
        Update: {
          estoque_id?: string
          grupo_id?: string
          nome_cupom?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "telegram_product_links_grupo_id_estoque_id_fkey"
            columns: ["grupo_id", "estoque_id"]
            isOneToOne: false
            referencedRelation: "estoque"
            referencedColumns: ["grupo_id", "id"]
          },
          {
            foreignKeyName: "telegram_product_links_grupo_id_fkey"
            columns: ["grupo_id"]
            isOneToOne: false
            referencedRelation: "grupos"
            referencedColumns: ["id"]
          },
        ]
      }
      telegram_reviews: {
        Row: {
          beneficiario: string
          categoria: string
          chat_id: number
          codigo: string | null
          conta: string
          created_at: string
          data: string | null
          descricao: string
          documento: string
          emissao: string | null
          error: string | null
          extraction_status: string
          feira_historico_id: string | null
          file_id: string | null
          file_name: string | null
          file_path: string | null
          grupo_id: string
          id: string
          lancamento_id: string | null
          mime_type: string | null
          moto_despesa_id: string | null
          pago: boolean
          produtos: Json
          produtos_destino: string | null
          produtos_importados_at: string | null
          reviewed_at: string | null
          source_text: string
          status: string
          update_id: number
          user_id: string
          valor: number | null
        }
        Insert: {
          beneficiario?: string
          categoria?: string
          chat_id: number
          codigo?: string | null
          conta?: string
          created_at?: string
          data?: string | null
          descricao?: string
          documento?: string
          emissao?: string | null
          error?: string | null
          extraction_status?: string
          feira_historico_id?: string | null
          file_id?: string | null
          file_name?: string | null
          file_path?: string | null
          grupo_id: string
          id?: string
          lancamento_id?: string | null
          mime_type?: string | null
          moto_despesa_id?: string | null
          pago?: boolean
          produtos?: Json
          produtos_destino?: string | null
          produtos_importados_at?: string | null
          reviewed_at?: string | null
          source_text?: string
          status?: string
          update_id: number
          user_id: string
          valor?: number | null
        }
        Update: {
          beneficiario?: string
          categoria?: string
          chat_id?: number
          codigo?: string | null
          conta?: string
          created_at?: string
          data?: string | null
          descricao?: string
          documento?: string
          emissao?: string | null
          error?: string | null
          extraction_status?: string
          feira_historico_id?: string | null
          file_id?: string | null
          file_name?: string | null
          file_path?: string | null
          grupo_id?: string
          id?: string
          lancamento_id?: string | null
          mime_type?: string | null
          moto_despesa_id?: string | null
          pago?: boolean
          produtos?: Json
          produtos_destino?: string | null
          produtos_importados_at?: string | null
          reviewed_at?: string | null
          source_text?: string
          status?: string
          update_id?: number
          user_id?: string
          valor?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "telegram_reviews_grupo_id_fkey"
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
          dashboard_order: string[]
          dashboard_preferences: Json
          theme: string
          user_id: string
        }
        Insert: {
          background_path?: string | null
          background_visibility?: number
          custom_colors?: Json
          custom_enabled?: boolean
          dashboard_order?: string[]
          dashboard_preferences?: Json
          theme?: string
          user_id: string
        }
        Update: {
          background_path?: string | null
          background_visibility?: number
          custom_colors?: Json
          custom_enabled?: boolean
          dashboard_order?: string[]
          dashboard_preferences?: Json
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
      data_conta_fixa: { Args: { _dia: number; _mes: string }; Returns: string }
      e_membro: { Args: { _grupo: string }; Returns: boolean }
      entrar_grupo: { Args: { _codigo: string }; Returns: string }
      gerar_contas_fixas: { Args: { _id?: string }; Returns: number }
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
      ordenar_feira: {
        Args: { _grupo_id: string; _ids: string[] }
        Returns: undefined
      }
      sync_offline_operation: {
        Args: { _commands: Json; _grupo_id: string; _id: string }
        Returns: Json
      }
      telegram_binding: {
        Args: { _chat: number; _hash: string; _telegram: number }
        Returns: boolean
      }
      telegram_claim: { Args: { _id: string }; Returns: boolean }
      telegram_edit_approved_launch:
        | {
            Args: {
              _categoria: string
              _conta: string
              _data: string
              _descricao: string
              _id: string
              _valor: number
            }
            Returns: string
          }
        | {
            Args: {
              _carteira_id: string
              _categoria: string
              _conta: string
              _data: string
              _descricao: string
              _id: string
              _valor: number
            }
            Returns: string
          }
      telegram_products_action: {
        Args: { _action: string; _id: string; _produtos: Json }
        Returns: string
      }
      telegram_quick_action: {
        Args: { _action: string; _chat: number; _id: string; _telegram: number }
        Returns: Json
      }
      telegram_receipt_action: {
        Args: {
          _action: string
          _categoria: string
          _conta: string
          _data: string
          _descricao: string
          _id: string
          _local: string
          _produtos: Json
          _valor: number
        }
        Returns: string
      }
      telegram_review_action: {
        Args: {
          _action: string
          _categoria?: string
          _conta?: string
          _data?: string
          _descricao?: string
          _id: string
          _pago?: boolean
          _valor?: number
        }
        Returns: string
      }
      telegram_sender_allowed: {
        Args: { _grupo: string; _user: string }
        Returns: boolean
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
