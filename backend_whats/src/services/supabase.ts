import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseKey);

// Function to get or create WhatsApp token
export async function getOrCreateWhatsAppToken(phoneNumber: string): Promise<{
  success: boolean;
  token_id?: string;
  api_key?: string;
  full_token?: boolean;
  message: string;
  error?: string;
}> {
  try {
    const { data, error } = await supabase
      .rpc('get_or_create_whatsapp_token', { phone_number: phoneNumber });

    if (error) {
      console.error('Error calling get_or_create_whatsapp_token:', error);
      return {
        success: false,
        message: 'Failed to get or create token',
        error: error.message
      };
    }

    return {
      success: data.success,
      token_id: data.token_id,
      api_key: data.api_key,
      full_token: data.full_token,
      message: data.message
    };
  } catch (error) {
    console.error('Unexpected error in getOrCreateWhatsAppToken:', error);
    return {
      success: false,
      message: 'An unexpected error occurred',
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}
