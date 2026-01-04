// @ts-nocheck - Types will be fully available after running SQL schema in Supabase
// ============================================
// Investments Service
// ============================================
// Handles all investment-related operations
// ============================================

import { supabase } from '../supabase/supabase';
import { uploadImage } from '../community/image-upload';
import type {
    CreateProjectData,
    CreateInvestmentData,
    UpdateProjectData,
    InvestmentProjectWithStats,
    ProjectInvestment,
} from './types';

/**
 * Create a new investment project
 */
export async function createProject(data: CreateProjectData): Promise<{
    success: boolean;
    project?: InvestmentProjectWithStats;
    error?: string;
}> {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            return { success: false, error: 'Chưa đăng nhập' };
        }

        console.log('🔵 [Investments] Creating project...');

        // Upload image if provided
        let imageUrl: string | undefined;
        if (data.image) {
            const { url, error } = await uploadImage(data.image, 'project-images', user.id);
            if (error) {
                return { success: false, error };
            }
            imageUrl = url || undefined;
        }

        // Insert project
        const { data: project, error: insertError } = await supabase
            .from('investment_projects')
            .insert({
                user_id: user.id,
                title: data.title,
                description: data.description,
                funding_goal: data.funding_goal,
                farmers_impacted: data.farmers_impacted,
                area: data.area,
                image_url: imageUrl,
                start_date: data.start_date,
                end_date: data.end_date,
                status: 'active', // Projects start as pending
            })
            .select()
            .single();

        if (insertError || !project) {
            console.error('🔴 [Investments] Insert error:', insertError);
            return { success: false, error: 'Không thể tạo dự án' };
        }

        // Fetch full project with stats
        const fullProject = await getProjectById(project.id);
        if (!fullProject) {
            return { success: false, error: 'Dự án đã tạo nhưng không thể tải lại' };
        }

        console.log('✅ [Investments] Project created:', project.id);
        return { success: true, project: fullProject };
    } catch (err) {
        console.error('🔴 [Investments] Unexpected error:', err);
        return { success: false, error: 'Đã xảy ra lỗi không mong muốn' };
    }
}

/**
 * Get investment projects with stats
 */
export async function getProjects(params?: {
    status?: string;
    limit?: number;
    offset?: number;
}): Promise<{
    projects: InvestmentProjectWithStats[];
    error?: string;
}> {
    try {
        console.log('🔵 [Investments] Fetching projects...');

        const { data, error } = await supabase.rpc('get_investment_projects_with_stats', {
            status_filter: params?.status || null,
            limit_count: params?.limit || 20,
            offset_count: params?.offset || 0,
        });

        if (error) {
            console.error('🔴 [Investments] Fetch error:', error);
            return { projects: [], error: 'Không thể tải dự án' };
        }

        console.log('✅ [Investments] Fetched', data?.length || 0, 'projects');
        return { projects: (data as InvestmentProjectWithStats[]) || [] };
    } catch (err) {
        console.error('🔴 [Investments] Unexpected error:', err);
        return { projects: [], error: 'Đã xảy ra lỗi không mong muốn' };
    }
}

/**
 * Get single project by ID
 */
export async function getProjectById(projectId: string): Promise<InvestmentProjectWithStats | null> {
    try {
        const { data, error } = await supabase.rpc('get_investment_projects_with_stats', {
            status_filter: null,
            limit_count: 1000,
            offset_count: 0,
        });

        if (error || !data) {
            console.error('🔴 [Investments] Fetch error:', error);
            return null;
        }

        const project = (data as InvestmentProjectWithStats[]).find(p => p.id === projectId);
        return project || null;
    } catch (err) {
        console.error('🔴 [Investments] Unexpected error:', err);
        return null;
    }
}

/**
 * Update project
 */
export async function updateProject(
    projectId: string,
    updates: UpdateProjectData
): Promise<{ success: boolean; error?: string }> {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            return { success: false, error: 'Chưa đăng nhập' };
        }

        const { error } = await supabase
            .from('investment_projects')
            .update(updates)
            .eq('id', projectId)
            .eq('user_id', user.id);

        if (error) {
            console.error('🔴 [Investments] Update error:', error);
            return { success: false, error: 'Không thể cập nhật dự án' };
        }

        console.log('✅ [Investments] Project updated:', projectId);
        return { success: true };
    } catch (err) {
        console.error('🔴 [Investments] Unexpected error:', err);
        return { success: false, error: 'Đã xảy ra lỗi không mong muốn' };
    }
}

/**
 * Delete project
 */
export async function deleteProject(projectId: string): Promise<{
    success: boolean;
    error?: string;
}> {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            return { success: false, error: 'Chưa đăng nhập' };
        }

        const { error } = await supabase
            .from('investment_projects')
            .delete()
            .eq('id', projectId)
            .eq('user_id', user.id);

        if (error) {
            console.error('🔴 [Investments] Delete error:', error);
            return { success: false, error: 'Không thể xóa dự án' };
        }

        console.log('✅ [Investments] Project deleted:', projectId);
        return { success: true };
    } catch (err) {
        console.error('🔴 [Investments] Unexpected error:', err);
        return { success: false, error: 'Đã xảy ra lỗi không mong muốn' };
    }
}

/**
 * Invest in a project
 */
export async function investInProject(data: CreateInvestmentData): Promise<{
    success: boolean;
    investment?: ProjectInvestment;
    error?: string;
}> {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            return { success: false, error: 'Chưa đăng nhập' };
        }

        console.log('🔵 [Investments] Creating investment...');

        const { data: investment, error: insertError } = await supabase
            .from('project_investments')
            .insert({
                project_id: data.project_id,
                investor_id: user.id,
                amount: data.amount,
                investor_name: data.investor_name,
                investor_email: data.investor_email,
                investor_phone: data.investor_phone,
                message: data.message,
                status: 'confirmed', // Auto-confirm for now
            })
            .select()
            .single();

        if (insertError || !investment) {
            console.error('🔴 [Investments] Investment error:', insertError);
            return { success: false, error: 'Không thể thực hiện đầu tư' };
        }

        console.log('✅ [Investments] Investment created:', investment.id);
        return { success: true, investment: investment as ProjectInvestment };
    } catch (err) {
        console.error('🔴 [Investments] Unexpected error:', err);
        return { success: false, error: 'Đã xảy ra lỗi không mong muốn' };
    }
}

/**
 * Get investments for a project
 */
export async function getProjectInvestments(projectId: string): Promise<{
    investments: ProjectInvestment[];
    error?: string;
}> {
    try {
        const { data, error } = await supabase
            .from('project_investments')
            .select('*')
            .eq('project_id', projectId)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('🔴 [Investments] Fetch investments error:', error);
            return { investments: [], error: 'Không thể tải danh sách đầu tư' };
        }

        return { investments: (data as ProjectInvestment[]) || [] };
    } catch (err) {
        console.error('🔴 [Investments] Unexpected error:', err);
        return { investments: [], error: 'Đã xảy ra lỗi không mong muốn' };
    }
}
