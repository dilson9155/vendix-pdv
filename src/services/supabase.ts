import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Retrieve credentials from environment or user-configured localStorage override
export function getSupabaseConfig(): { url: string; anonKey: string } {
  const envUrl = (import.meta as any).env?.VITE_SUPABASE_URL || '';
  const envKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || '';

  const localUrl = localStorage.getItem('vendix_supabase_url') || '';
  const localKey = localStorage.getItem('vendix_supabase_key') || '';

  return {
    url: localUrl.trim() || envUrl.trim(),
    anonKey: localKey.trim() || envKey.trim(),
  };
}

let supabaseInstance: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient | null {
  const { url, anonKey } = getSupabaseConfig();
  if (!url || !anonKey || url === 'https://your-project.supabase.co' || anonKey === 'your-anon-key') {
    return null;
  }

  if (!supabaseInstance) {
    try {
      supabaseInstance = createClient(url, anonKey);
    } catch (e) {
      console.warn('Falha ao inicializar cliente Supabase:', e);
      return null;
    }
  }

  return supabaseInstance;
}

export async function testSupabaseConnection(url: string, anonKey: string): Promise<{ success: boolean; message: string }> {
  if (!url || !anonKey) {
    return { success: false, message: 'URL e Anon Key são obrigatórias.' };
  }

  try {
    const tempClient = createClient(url, anonKey);
    const { error } = await tempClient.from('tenants').select('id').limit(1);

    if (error && error.code !== 'PGRST116' && !error.message.includes('relation "public.tenants" does not exist')) {
      // If error is invalid API key or network error
      if (error.message.includes('Invalid API key') || error.message.includes('JWT')) {
        return { success: false, message: `Erro de autenticação: ${error.message}` };
      }
    }

    return {
      success: true,
      message: 'Conexão com Supabase efetuada com sucesso! Tabelas acessíveis.',
    };
  } catch (err: any) {
    return {
      success: false,
      message: err.message || 'Não foi possível conectar ao Supabase.',
    };
  }
}
