'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, MessageCircle, CheckCircle2, AlertCircle, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useLanguage } from '@/contexts/LanguageContext';

export default function WhatsAppSettings() {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isValid, setIsValid] = useState(true);
  // Using direct translations since WhatsApp-specific keys are not in i18n
  const translations = {
    title: 'Configurações do WhatsApp',
    description: 'Configure seu número do WhatsApp para receber notificações e mensagens de suporte.',
    back: 'Voltar',
    invalidNumber: 'Por favor, insira um número de telefone válido com código do país',
    save: 'Salvar',
    connectedAs: (phone: string) => `Conectado como: ${phone}`,
    notificationsEnabled: 'Você receberá notificações neste número.'
  };
  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    const fetchPhoneNumber = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          router.push('/auth');
          return;
        }

        const { data, error } = await supabase
          .from('usuario_celular')
          .select('celular')
          .eq('account_id', user.id)
          .single();

        if (error && error.code !== 'PGRST116') {
          throw error;
        }

        if (data) {
          setPhoneNumber(data.celular);
        }
      } catch (error) {
        console.error('Error fetching phone number:', error);
        toast.error('Failed to load WhatsApp settings');
      } finally {
        setIsLoading(false);
      }
    };

    fetchPhoneNumber();
  }, [router, supabase]);

  const validatePhoneNumber = (number: string) => {
    const phoneRegex = /^\+?[1-9]\d{1,14}$/; // E.164 format
    return phoneRegex.test(number);
  };

  const handlePhoneNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setPhoneNumber(value);
    setIsValid(validatePhoneNumber(value) || value === '');
  };

  const savePhoneNumber = async () => {
    if (!isValid || !phoneNumber) return;
    
    setIsSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/auth');
        return;
      }

      // Get the JWT token from Supabase
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('Not authenticated');
      }
      
      // Call the new verify-number endpoint which handles both saving and sending confirmation
      const response = await fetch('/api/user-api/whatsapp/verify-number', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          phone_number: phoneNumber
        })
      });

      if (!response.ok) {
        let errorMessage = 'Falha ao verificar o número';
        try {
          const errorData = await response.json();
          console.error('Error verifying phone number:', {
            status: response.status,
            statusText: response.statusText,
            error: errorData
          });
          
          // Handle different error formats
          if (errorData.detail) {
            errorMessage = typeof errorData.detail === 'string' 
              ? errorData.detail 
              : JSON.stringify(errorData.detail);
          } else if (errorData.message) {
            errorMessage = errorData.message;
          } else if (response.status === 401) {
            errorMessage = 'Não autorizado. Por favor, verifique o token.';
          } else if (response.status === 400) {
            errorMessage = 'Dados inválidos. Verifique o formato do número e tente novamente.';
          } else if (response.status >= 500) {
            errorMessage = 'Erro no servidor. Tente novamente mais tarde.';
          }
        } catch (e) {
          console.error('Failed to parse error response:', e);
          errorMessage = `Erro inesperado: ${response.status} ${response.statusText}`;
        }
        throw new Error(errorMessage);
      }
      
      toast.success('Número salvo com sucesso! Uma mensagem de confirmação foi enviada.');
    } catch (error) {
      console.error('Error saving phone number:', error);
      toast.error(error.message || 'Failed to save phone number');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6 max-w-4xl mx-auto">
      {/* Header Section */}
      <div className="flex items-center justify-between mb-8">
        <div className="space-y-1">
          <h2 className="text-2xl font-semibold tracking-tight">{translations.title}</h2>
          <p className="text-sm text-muted-foreground">
            {translations.description}
          </p>
        </div>
        <Button 
          variant="ghost" 
          size="icon"
          className="h-8 w-8 -ml-2 mr-1"
          asChild
        >
          <Link href="/dashboard">
            <ArrowLeft className="h-4 w-4" />
            <span className="sr-only">{translations.back}</span>
          </Link>
        </Button>
      </div>
      {/* WhatsApp Connection Card */}
      <Card className="shadow-sm">
        <CardContent className="p-6">
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-6">
              <div className="flex-1 space-y-2">
                <Input
                  type="tel"
                  placeholder="+55 (11) 99999-9999"
                  value={phoneNumber}
                  onChange={handlePhoneNumberChange}
                  className={!isValid && phoneNumber ? 'border-red-500' : ''}
                />
                {!isValid && phoneNumber && (
                  <p className="mt-2 text-sm text-red-500 flex items-center">
                    <AlertCircle className="h-4 w-4 mr-1" />
                    {translations.invalidNumber}
                  </p>
                )}
              </div>
              <Button 
                onClick={savePhoneNumber} 
                disabled={isSaving || !isValid || !phoneNumber}
                className="w-full sm:w-auto"
              >
                {isSaving ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                )}
                {translations.save}
              </Button>
            </div>
            
            {phoneNumber && isValid && (
              <div className="p-4 bg-muted rounded-md text-sm flex items-start">
                <MessageCircle className="h-5 w-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium">{translations.connectedAs(phoneNumber)}</p>
                  <p className="text-muted-foreground">
                    {translations.notificationsEnabled}
                  </p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
