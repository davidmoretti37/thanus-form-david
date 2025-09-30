-- Create function to get or create WhatsApp API token for a phone number
create or replace function public.get_or_create_whatsapp_token(phone_number text)
returns json as $$
declare
    clean_phone text;
    user_account_id uuid;
    existing_token_record record;
    new_token text;
    new_token_hash text;
    new_token_prefix text;
    new_token_id uuid;
begin
    -- Clean the phone number by removing '+'
    clean_phone := replace(phone_number, '+', '');
    
    -- Find the account_id from usuario_celular, checking both with and without '+'
    SELECT account_id INTO user_account_id 
    FROM public.usuario_celular 
    WHERE celular = clean_phone
       OR celular = phone_number
    LIMIT 1;
    
    -- If no user found with that phone number
    IF user_account_id IS NULL THEN
        RETURN json_build_object(
            'success', false,
            'error', 'No account found with this phone number'
        );
    END IF;
    
    -- Delete any existing tokens for this account
    DELETE FROM public.api_tokens
    WHERE account_id = user_account_id 
    AND name = 'Thanus Whatsapp';
    
    -- Generate a new token
    -- Generate token in the same format as Python's secrets.token_urlsafe(32)
    new_token := 'thanus_' || translate(
      encode(gen_random_bytes(32), 'base64'),
      '+/', '-_'
    );
    new_token_prefix := substr(new_token, 1, 12);
    -- Hash is generated as SHA-256 in hex format (same as hashlib.sha256(token.encode()).hexdigest() in Python)
    new_token_hash := encode(digest(new_token, 'sha256'), 'hex');
    
    INSERT INTO public.api_tokens (
        account_id,
        name,
        token_hash,
        token_prefix,
        is_active
    ) VALUES (
        user_account_id,
        'Thanus Whatsapp',
        new_token_hash,
        new_token_prefix,
        true
    )
    RETURNING token_id INTO new_token_id;
    
    -- Return the full token (only returned once when created)
    RETURN json_build_object(
        'success', true,
        'token_id', new_token_id,
        'api_key', new_token,
        'message', 'New API token created. Please save this token as it will not be shown again.'
    );
end;
$$ language plpgsql security definer;

-- Add comment for documentation
comment on function public.get_or_create_whatsapp_token is 'Gets or creates a WhatsApp API token for the given phone number. Returns a JSON object with the token information.';
