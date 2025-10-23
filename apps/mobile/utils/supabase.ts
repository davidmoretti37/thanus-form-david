import { supabase } from '@/constants/SupabaseConfig';

export const getSupabaseSession = async () => {
  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error) {
      console.error('Error getting Supabase session:', error);
      return null;
    }
    
    return session;
  } catch (error) {
    console.error('Error getting Supabase session:', error);
    return null;
  }
};

export const getSupabaseUser = async () => {
  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error) {
      console.error('Error getting Supabase user:', error);
      return null;
    }
    
    return user;
  } catch (error) {
    console.error('Error getting Supabase user:', error);
    return null;
  }
};

export { supabase };
