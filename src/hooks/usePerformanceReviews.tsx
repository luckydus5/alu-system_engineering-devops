import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface PerformanceReview {
  id: string;
  employee_id: string;
  reviewer_id: string | null;
  review_period: string;
  score: number | null;
  status: string;
  comments: string | null;
  created_at: string;
  updated_at: string;
  // joined
  employee_name?: string;
  employee_department?: string;
}

export interface PerformanceGoal {
  id: string;
  employee_id: string;
  title: string;
  description: string | null;
  progress: number;
  priority: string;
  due_date: string | null;
  status: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  // joined
  employee_name?: string;
}

export function usePerformanceReviews() {
  const [reviews, setReviews] = useState<PerformanceReview[]>([]);
  const [goals, setGoals] = useState<PerformanceGoal[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchReviews = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('performance_reviews')
        .select(`*, employees (full_name, department_id, departments (name))`)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setReviews((data || []).map((r: any) => ({
        ...r,
        employee_name: r.employees?.full_name || 'Unknown',
        employee_department: r.employees?.departments?.name || null,
      })));
    } catch (err) {
      console.error('Error fetching reviews:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchGoals = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('performance_goals')
        .select(`*, employees (full_name)`)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setGoals((data || []).map((g: any) => ({
        ...g,
        employee_name: g.employees?.full_name || 'Unknown',
      })));
    } catch (err) {
      console.error('Error fetching goals:', err);
    }
  }, []);

  useEffect(() => {
    fetchReviews();
    fetchGoals();
  }, [fetchReviews, fetchGoals]);

  const addReview = async (review: Partial<PerformanceReview>) => {
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from('performance_reviews').insert({
      employee_id: review.employee_id!,
      reviewer_id: user?.id || null,
      review_period: review.review_period!,
      score: review.score ?? null,
      status: review.status || 'pending',
      comments: review.comments || null,
    });
    if (error) throw error;
    await fetchReviews();
  };

  const updateReview = async (id: string, updates: Partial<PerformanceReview>) => {
    const { error } = await supabase.from('performance_reviews').update(updates).eq('id', id);
    if (error) throw error;
    await fetchReviews();
  };

  const addGoal = async (goal: Partial<PerformanceGoal>) => {
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from('performance_goals').insert({
      employee_id: goal.employee_id!,
      title: goal.title!,
      description: goal.description || null,
      progress: goal.progress || 0,
      priority: goal.priority || 'medium',
      due_date: goal.due_date || null,
      status: goal.status || 'active',
      created_by: user?.id || null,
    });
    if (error) throw error;
    await fetchGoals();
  };

  const updateGoal = async (id: string, updates: Partial<PerformanceGoal>) => {
    const { error } = await supabase.from('performance_goals').update(updates).eq('id', id);
    if (error) throw error;
    await fetchGoals();
  };

  return { reviews, goals, loading, refetch: () => { fetchReviews(); fetchGoals(); }, addReview, updateReview, addGoal, updateGoal };
}
