// src/lib/supabaseClient.js
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// Validação básica para garantir que as variáveis de ambiente estão carregadas
if (!supabaseUrl || !supabaseAnonKey) {
  console.error("Variáveis de ambiente do Supabase não encontradas!");
  // Você pode lançar um erro ou lidar com isso de outra forma
  // throw new Error("Supabase URL or Anon Key is missing in .env.local");
}

// Cria e exporta o cliente Supabase
// Verifica se as variáveis existem antes de criar o cliente para evitar erros
export const supabase = (supabaseUrl && supabaseAnonKey)
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null; // Ou alguma forma de lidar com a ausência das chaves

// Opcional: Log para confirmar a criação (remova em produção)
if (supabase) {
  console.log("Cliente Supabase criado com sucesso.");
} else if (typeof window !== 'undefined'){ // Só mostra o erro no navegador
   console.error("Falha ao criar cliente Supabase. Verifique as variáveis de ambiente.");
   alert("Erro crítico: Falha ao conectar com o serviço de autenticação. Verifique as configurações (.env.local) e reinicie.")
}