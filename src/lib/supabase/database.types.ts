// ============================================
// Database Types for Supabase
// ============================================
// These types provide type safety for database queries
// Auto-generated from the database schema
// ============================================

export type Json =
    | string
    | number
    | boolean
    | null
    | { [key: string]: Json | undefined }
    | Json[]

export interface Database {
    public: {
        Tables: {
            profiles: {
                Row: {
                    id: string
                    username: string
                    phone_number: string | null
                    role: 'farmer' | 'organization'
                    organization_id: string | null
                    created_at: string
                    updated_at: string
                }
                Insert: {
                    id: string
                    username: string
                    phone_number?: string | null
                    role?: 'farmer' | 'organization'
                    organization_id?: string | null
                    created_at?: string
                    updated_at?: string
                }
                Update: {
                    id?: string
                    username?: string
                    phone_number?: string | null
                    role?: 'farmer' | 'organization'
                    organization_id?: string | null
                    created_at?: string
                    updated_at?: string
                }
            }
            organizations: {
                Row: {
                    id: string
                    name: string
                    description: string | null
                    phone_number: string | null
                    email: string | null
                    created_at: string
                    updated_at: string
                }
                Insert: {
                    id?: string
                    name: string
                    description?: string | null
                    phone_number?: string | null
                    email?: string | null
                    created_at?: string
                    updated_at?: string
                }
                Update: {
                    id?: string
                    name?: string
                    description?: string | null
                    phone_number?: string | null
                    email?: string | null
                    created_at?: string
                    updated_at?: string
                }
            }
            password_reset_codes: {
                Row: {
                    id: string
                    user_id: string
                    code: string
                    phone_number: string
                    expires_at: string
                    used: boolean
                    created_at: string
                }
                Insert: {
                    id?: string
                    user_id: string
                    code: string
                    phone_number: string
                    expires_at: string
                    used?: boolean
                    created_at?: string
                }
                Update: {
                    id?: string
                    user_id?: string
                    code?: string
                    phone_number?: string
                    expires_at?: string
                    used?: boolean
                    created_at?: string
                }
            }
        }
        Views: {
            [_ in never]: never
        }
        Functions: {
            is_username_available: {
                Args: {
                    check_username: string
                }
                Returns: boolean
            }
            request_password_reset: {
                Args: {
                    reset_phone_number: string
                }
                Returns: {
                    user_id: string
                    username: string
                    code: string
                    expires_at: string
                }[]
            }
            verify_password_reset_code: {
                Args: {
                    reset_phone_number: string
                    reset_code: string
                }
                Returns: {
                    user_id: string | null
                    username: string | null
                    valid: boolean
                }[]
            }
            mark_reset_code_used: {
                Args: {
                    reset_phone_number: string
                    reset_code: string
                }
                Returns: boolean
            }
            update_user_password: {
                Args: {
                    p_user_id: string
                    p_new_password: string
                }
                Returns: boolean
            }
        }
        Enums: {
            [_ in never]: never
        }
    }
}
