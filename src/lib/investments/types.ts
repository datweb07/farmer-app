// ============================================
// Investment System Type Definitions
// ============================================

export interface InvestmentProject {
    id: string;
    user_id: string;
    title: string;
    description: string;
    funding_goal: number;
    current_funding: number;
    farmers_impacted: number;
    area: string;
    status: 'pending' | 'active' | 'funded' | 'completed' | 'cancelled';
    image_url?: string;
    start_date?: string;
    end_date?: string;
    created_at: string;
    updated_at: string;
}

export interface InvestmentProjectWithStats extends InvestmentProject {
    creator_username: string;
    investors_count: number;
    progress_percentage: number;
}

export interface ProjectInvestment {
    id: string;
    project_id: string;
    investor_id: string;
    amount: number;
    investor_name: string;
    investor_email: string;
    investor_phone?: string;
    message?: string;
    status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
    created_at: string;
    updated_at: string;
}

export interface ContactRequest {
    id?: string;
    full_name: string;
    phone_number: string;
    email: string;
    partnership_type: 'investor' | 'business' | 'research' | 'other';
    message: string;
    status?: 'pending' | 'contacted' | 'completed';
    created_at?: string;
    updated_at?: string;
}

export interface CreateProjectData {
    title: string;
    description: string;
    funding_goal: number;
    farmers_impacted: number;
    area: string;
    image?: File;
    start_date?: string;
    end_date?: string;
}

export interface CreateInvestmentData {
    project_id: string;
    amount: number;
    investor_name: string;
    investor_email: string;
    investor_phone?: string;
    message?: string;
}

export interface UpdateProjectData {
    title?: string;
    description?: string;
    funding_goal?: number;
    farmers_impacted?: number;
    area?: string;
    image_url?: string;
    start_date?: string;
    end_date?: string;
    status?: 'pending' | 'active' | 'funded' | 'completed' | 'cancelled';
}
