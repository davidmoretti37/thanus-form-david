import express from "express"
import multer from "multer"
import fs from "fs"
import axios from 'axios'
import { Boom } from "@hapi/boom"
import NodeCache from "@cacheable/node-cache"
import { getOrCreateWhatsAppToken } from "./src/services/supabase"
import { exec } from 'child_process'
import { promisify } from 'util'
import { writeFile, unlink } from 'fs/promises'
import { createReadStream } from 'fs'
import FormData from 'form-data'
import makeWASocket, {
  AnyMessageContent,
  delay,
  DisconnectReason,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
  proto,
  useMultiFileAuthState,
  WAMessageContent,
  WAMessageKey,
  CacheStore,
  WASocket,
  downloadMediaMessage as downloadWAMediaMessage
} from "baileys"
import P from "pino"
import QRCode from "qrcode"
import mime from "mime-types"

// Token fixo
const AUTH_TOKEN = "thanus_whats_GVpcu6z9ipOt5FtL8lZ0aL8ds05Vo6khJLsB2AlCw3o2QHvjTHCdqQjxJS9UrgbWi3ULDbhiEU2BUMFAjqbO347"
const THANUS_API_URL = process.env.THANUS_API_URL;
const THANUS_API_KEY = process.env.THANUS_API_KEY;

// Configuração do OpenRouter
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions'


async function startTask(prompt: string, token?: string) {
  try {
    const url = `${THANUS_API_URL}/api/user-api/agents/execute`;
    
    // Use the provided token or fall back to the environment variable
    const apiToken = token || THANUS_API_KEY;
    
    if (!apiToken) {
      throw new Error('Nenhum token de API disponível para a tarefa');
    }
    
    const headers = {
      'Authorization': `Bearer ${apiToken}`,
      'Content-Type': 'application/json'
    }
    const payload = {
      prompt: prompt + "\nApós a conclusão, me envie os arquivos criados na tarefa pelo Whatsapp.",
      model_name: "anthropic/claude-sonnet-4-20250514",
      enable_thinking: false,
      stream: true
    }
    const { data } = await axios.post(url, payload, { headers })
    
    return data

  } catch (e) {
    console.error(e)
    return `❌ Não consegui iniciar a tarefa.`
  }
  
}

async function listAgents(token?: string): Promise<string> {
  try {
    const url = `${THANUS_API_URL}/api/user-api/agents`;
    
    if (!token) {
      throw new Error('Nenhum token de API disponível para a tarefa');
    }
    
    const headers = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
    
    const { data } = await axios.get(url, { headers });
    
    if (!data.agents || !Array.isArray(data.agents)) {
      return 'Nenhum agente encontrado.';
    }
    
    if (data.agents.length === 0) {
      return 'ℹ️ Nenhum agente encontrado.';
    }
    
    // Format agents as a string
    const agentsList = data.agents.map((agent: any) => {
      return `*${agent.name}*\n` +
             `Descrição: ${agent.description || 'Sem descrição'}\n` +
            //  `ID: ${agent.agent_id}\n` +
             `----------------------------`;
    }).join('\n\n');
    
    return `*📋 Lista de Agentes*\n\n${agentsList}`;
    
  } catch (e) {
    console.error('Erro ao listar agentes:', e);
    return '❌ Ocorreu um erro ao listar os agentes. Por favor, tente novamente.';
  }
}

async function listAgentsId(token?: string): Promise<{ success: boolean; agents?: Array<{name: string, description: string, id: string}>; error?: string }> {
  try {
    const url = `${THANUS_API_URL}/api/user-api/agents`;
    
    if (!token) {
      return { success: false, error: 'Nenhum token de API disponível para a tarefa' };
    }
    
    const headers = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
    
    const { data } = await axios.get(url, { headers });
    
    if (!data.agents || !Array.isArray(data.agents)) {
      return { success: false, error: 'Nenhum agente encontrado ou formato de resposta inválido' };
    }
    
    // Retorna a lista de agentes em formato JSON limpo
    const agentsList = data.agents.map((agent: any) => ({
      name: agent.name,
      description: agent.description || 'Sem descrição',
      id: agent.agent_id
    }));
    
    return { success: true, agents: agentsList };
    
  } catch (e) {
    console.error('Erro ao listar agentes:', e);
    return { 
      success: false, 
      error: 'Ocorreu um erro ao listar os agentes. Por favor, tente novamente.' 
    };
  }
}

async function startAgentTask(prompt: string, agent_id: string, token?: string) {
  try {
    const url = `${THANUS_API_URL}/api/user-api/agents/execute`;
    
    // Use the provided token or fall back to the environment variable
    const apiToken = token || THANUS_API_KEY;
    
    if (!apiToken) {
      throw new Error('Nenhum token de API disponível para a tarefa');
    }
    
    const headers = {
      'Authorization': `Bearer ${apiToken}`,
      'Content-Type': 'application/json'
    }
    const payload = {
      prompt: prompt + "\nApós a conclusão, me envie os arquivos criados na tarefa pelo Whatsapp.",
      model_name: "anthropic/claude-sonnet-4-20250514",
      agent_id: agent_id,
      enable_thinking: false,
      stream: true
    }
    const { data } = await axios.post(url, payload, { headers })
    
    return data

  } catch (e) {
    console.error(e)
    return `❌ Não consegui iniciar a tarefa.`
  }
  
}

// Store chat history
interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

const chatHistory: Record<string, ChatMessage[]> = {};

// Função para adicionar mensagem ao histórico
function addToHistory(jid: string, role: 'user' | 'assistant', content: string) {
  if (!chatHistory[jid]) {
    chatHistory[jid] = [];
  }
  
  chatHistory[jid].push({
    role,
    content,
    timestamp: Date.now()
  });
  
  // Manter apenas as últimas 5 mensagens
  if (chatHistory[jid].length > 5) {
    chatHistory[jid] = chatHistory[jid].slice(-3);
  }
}

// Função para encontrar um agente pelo nome
async function findAgentByName(agentName: string, token?: string) {
  if (!token) return null;
  
  try {
    const { success, agents } = await listAgentsId(token);
    if (!success || !agents) return null;
    
    // Procurar por nome exato (case insensitive)
    const exactMatch = agents.find(agent => 
      agent.name.toLowerCase() === agentName.toLowerCase()
    );
    
    if (exactMatch) return exactMatch;
    
    // Se não encontrar, procurar por correspondência parcial
    const partialMatch = agents.find(agent => 
      agent.name.toLowerCase().includes(agentName.toLowerCase())
    );
    
    return partialMatch || null;
  } catch (error) {
    console.error('Erro ao buscar agente:', error);
    return null;
  }
}

// Função principal de resposta
async function generateResponse(prompt: string, jid: string, token?: string): Promise<string> {
  // Verificar menções a agentes no formato @Nome do Agente
  const agentMentionMatch = prompt.match(/@([^\s@][^@]*?)(?=\s|$)/);
  
  if (agentMentionMatch && token) {
    const agentName = agentMentionMatch[1].trim();
    const agent = await findAgentByName(agentName, token);
    
    if (agent) {
      // Remover a menção do prompt original
      const cleanPrompt = prompt.replace(agentMentionMatch[0], '').trim();
      
      // Se não houver texto além da menção, retornar informações do agente
      if (!cleanPrompt) {
        return `*${agent.name}*\n${agent.description || 'Sem descrição'}\nID: ${agent.id}`;
      }
      
      // Se houver texto, encaminhar para o agente
      try {
        const result = await startAgentTask(cleanPrompt, agent.id, token);
        return result.status === 'running' 
          ? `✅ Tarefa encaminhada para o agente *${agent.name}*`
          : '❌ Não foi possível iniciar a tarefa com o agente';
      } catch (error) {
        console.error('Erro ao iniciar tarefa com agente:', error);
        return `❌ Ocorreu um erro ao processar sua solicitação com o agente ${agent.name}`;
      }
    }
  }
  try {
    // Adiciona a mensagem do usuário ao histórico
    addToHistory(jid, 'user', prompt);
    
    // Prepara as mensagens para o modelo, incluindo o histórico
    const messages = [
      {
        role: "system",
        content: "Você é um assistente do WhatsApp chamado Thanus que possui ferramentas para ajudar os usuários. Pode responder diretamente ou chamar ferramentas se necessário. Informe os usuários sobre a tool de tarefas que você possui, e como utilizá-la, caso o usuário solicite uma tarefa, utilize startTask com o prompt que o usuário solicitou sem solicitar maiores detalhes"
      },
      // Adiciona o histórico de mensagens
      ...(chatHistory[jid]?.map(msg => ({
        role: msg.role,
        content: msg.content
      })) || [])
    ];
    
    const response = await axios.post(
      OPENROUTER_API_URL,
      {
        model: "openai/gpt-4o-mini", // escolha um modelo compatível com tool calling
        messages,
        tools: [
          {
            type: "function",
            function: {
              name: "startTask",
              description: "Iniciar uma tarefa para executar no thanus",
              parameters: {
                type: "object",
                properties: {
                  prompt: { type: "string", description: "Descrição da tarefa" }
                },
                required: ["prompt"]
              }
            }
          },
          {
            type: "function",
            function: {
              name: "listAgents",
              description: "Lista os agentes do thanus",
              parameters: {
                type: "object",
                properties: {},
                required: []
              }
            }
          }
        ],
        tool_choice: "auto"
      },
      {
        headers: {
          "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
          "Content-Type": "application/json",
          "HTTP-Referer": THANUS_API_URL,
          "X-Title": "Thanus WhatsApp"
        }
      }
    )

    const choice = response.data.choices[0]

    // Se o modelo pediu para chamar uma tool
    if (choice.message?.tool_calls?.[0]) {
      const call = choice.message.tool_calls[0]
      if (call.function?.name === "startTask") {
        try {
          sendMessageWTyping({ text: 'Iniciando tarefa no Thanus com o prompt "' + prompt + '"...' }, jid)
          const resultado = await startTask(prompt, token)
          
          if (resultado.status === 'running') {
            return 'Tarefa iniciada com sucesso. Aguarde a conclusão da tarefa para receber os arquivos criados.';
          }

         return resultado
        } catch (err) {
          console.error("Erro ao processar argumentos:", err);
          return "⚠️ Não consegui processar os parâmetros da ferramenta.";
        }
      }

      if (call.function?.name === "listAgents") {
        try {
          const resultado = await listAgents(token)
          return resultado
        } catch (err) {
          console.error("Erro ao processar argumentos:", err);
          return "⚠️ Não consegui processar os parâmetros da ferramenta.";
        }
      }
    }

    // Caso contrário, só texto
    const responseText = choice.message?.content?.trim() || "Não entendi sua mensagem."
    // Adiciona a resposta ao histórico
    addToHistory(jid, 'assistant', responseText);
    return responseText;
  } catch (error: any) {
    console.error("Erro ao chamar OpenRouter:", error?.response?.data || error.message)
    return "Desculpe, estou com dificuldades para processar sua mensagem no momento."
  }
}

// Middleware de autenticação
const authMiddleware = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const token = req.headers["authorization"]
  if (!token || token !== `Bearer ${AUTH_TOKEN}`) {
    return res.status(401).json({ erro: "Token inválido" })
  }
  next()
}

// Configuração do Express
const app = express()

// Configuração do multer para upload de arquivos
const upload = multer({ 
  dest: "uploads/",
  limits: {
    fileSize: 200 * 1024 * 1024, // 200MB
    files: 1
  }
})

// Configuração do body parser para JSON
app.use(express.json({ limit: '200mb' }))
app.use(express.urlencoded({ extended: true, limit: '200mb' }))

// Logger Baileys
const logger = P({ timestamp: () => `,"time":"${new Date().toJSON()}"` }, P.destination("./wa-logs.txt"))
logger.level = "trace"

// Cache para o Baileys
function makeNodeCache(): CacheStore {
  const cache = new NodeCache()
  return {
    get: <T>(key: string): T | undefined => cache.get(key) as T | undefined,
    set: (key: string, value: any) => cache.set(key, value),
    del: (key: string) => cache.del(key),
    flushAll: () => cache.flushAll(),
  }
}
const msgRetryCounterCache = makeNodeCache()

// Configuration
const WITAI_TOKEN = process.env.WITAI_TOKEN
const UPLOAD_FOLDER = 'uploads/audio';

// Ensure upload directory exists
import { existsSync, mkdirSync } from 'fs'
if (!existsSync(UPLOAD_FOLDER)) {
  mkdirSync(UPLOAD_FOLDER, { recursive: true });
}

// Promisify exec
const execAsync = promisify(exec);

async function convertAudioToWav(inputPath: string, outputPath: string): Promise<void> {
  try {
    console.log(`Starting FFmpeg conversion from ${inputPath} to ${outputPath}`);
    
    // Escape file paths to handle spaces and special characters
    const safeInputPath = `"${inputPath.replace(/"/g, '\\"')}"`;
    const safeOutputPath = `"${outputPath.replace(/"/g, '\\"')}"`;
    
    // Use -y to overwrite output file if it exists
    const command = `ffmpeg -y -i ${safeInputPath} -acodec pcm_s16le -ar 16000 -ac 1 ${safeOutputPath}`;
    console.log('FFmpeg command:', command);
    
    const { stdout, stderr } = await execAsync(command);
    
    if (stdout) console.log('FFmpeg stdout:', stdout);
    if (stderr) console.warn('FFmpeg stderr:', stderr);
    
    // Verify the output file was created
    try {
      const stats = await fs.promises.stat(outputPath);
      if (stats.size === 0) {
        throw new Error('Output file is empty');
      }
      console.log(`Successfully converted audio file. Size: ${stats.size} bytes`);
    } catch (error) {
      throw new Error(`Output file verification failed: ${error.message}`);
    }
  } catch (error) {
    console.error('FFmpeg conversion error:', error);
    throw new Error(`Falha ao converter áudio: ${error.message}`);
  }
}

async function transcribeAudio(audioPath: string): Promise<string> {
  try {
    console.log(`Starting transcription for file: ${audioPath}`);
    
    // Read the audio file as a buffer
    const audioBuffer = await fs.promises.readFile(audioPath);
    console.log(`Audio file size: ${audioBuffer.length} bytes`);
    
    // Get the file extension to determine the content type
    const ext = audioPath.split('.').pop()?.toLowerCase();
    let contentType = 'audio/wav';
    
    // Set appropriate content type based on file extension
    if (ext === 'mp3') {
      contentType = 'audio/mpeg3';
    } else if (ext === 'ogg') {
      contentType = 'audio/ogg;codecs=opus';
    }
    
    console.log(`Sending to Wit.ai with Content-Type: ${contentType}`);
    
    // For Wit.ai, we need to send the raw audio data with the correct content type
    const response = await axios({
      method: 'post',
      url: 'https://api.wit.ai/speech',
      data: audioBuffer,
      headers: {
        'Authorization': `Bearer ${WITAI_TOKEN}`,
        'Content-Type': contentType,
        'Accept': 'application/json',
      },
      timeout: 30000, // 30 seconds timeout
      responseType: 'json',
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
    });
    
    console.log('Wit.ai API Response:', JSON.stringify({
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
      data: response.data
    }, null, 2));
    
    // Check if we got a valid response
    if (!response.data) {
      console.error('Empty response from Wit.ai');
      throw new Error('Resposta vazia da API do Wit.ai');
    }
    
    // Handle the response which might contain multiple JSON objects
    const responseText = typeof response.data === 'string' ? response.data : JSON.stringify(response.data);
    const jsonObjects = responseText.split('\r\n').filter(Boolean);
    
    let finalTranscription = '';
    let finalConfidence = 0;
    
    for (const jsonStr of jsonObjects) {
      try {
        const result = JSON.parse(jsonStr);
        console.log('Processing JSON object:', JSON.stringify(result, null, 2));
        
        // Look for FINAL_TRANSCRIPTION or the highest confidence transcription
        if (result.type === 'FINAL_TRANSCRIPTION' || result.type === 'PARTIAL_TRANSCRIPTION') {
          const text = result.text || '';
          const confidence = result.speech?.confidence || 0;
          
          if (result.type === 'FINAL_TRANSCRIPTION' || confidence > finalConfidence) {
            finalTranscription = text;
            finalConfidence = confidence;
          }
        }
      } catch (e) {
        console.error('Error parsing JSON object:', e);
      }
    }
    
    if (!finalTranscription) {
      console.error('No valid transcription found in response');
      return 'Não foi possível transcrever o áudio.';
    }
    
    console.log(`Final transcription (confidence: ${finalConfidence}):`, finalTranscription);
    return finalTranscription;
    
  } catch (error: any) {
    const errorDetails = error.response 
      ? {
          status: error.response.status,
          statusText: error.response.statusText,
          data: error.response.data,
          headers: error.response.headers
        }
      : error.message;
    
    console.error('Error in transcribeAudio:', JSON.stringify(errorDetails, null, 2));
    
    if (error.response?.data?.error) {
      throw new Error(`Erro do Wit.ai: ${error.response.data.error}`);
    }
    
    throw new Error(`Falha ao transcrever áudio: ${error.message}`);
  }
}

let sock: ReturnType<typeof makeWASocket>

// Inicia conexão
const startSock = async () => {
  const { state, saveCreds } = await useMultiFileAuthState("baileys_auth_info")
  const { version } = await fetchLatestBaileysVersion()

  sock = makeWASocket({
    version,
    logger,
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys, logger),
    },
    msgRetryCounterCache,
    generateHighQualityLinkPreview: true,
    getMessage,
  })

  sock.ev.process(async (events) => {
    if (events["connection.update"]) {
      const update = events["connection.update"]
      const { connection, lastDisconnect, qr } = update
      if (connection === "close") {
        if ((lastDisconnect?.error as Boom)?.output?.statusCode !== DisconnectReason.loggedOut) {
          startSock()
        } else {
          console.log("❌ Conexão encerrada. Deslogado.")
        }
      }
      if (qr) {
        console.log(await QRCode.toString(qr, { type: "terminal" }))
      }
    }

    if (events["creds.update"]) {
      await saveCreds()
    }

    if (events['messages.upsert']) {
      const upsert = events['messages.upsert']
      console.log('recv messages ', JSON.stringify(upsert, undefined, 2))

      if (upsert.type === 'notify' && sock) {
        for (const msg of upsert.messages) {
          const senderJid = msg.key.remoteJid || ''
          const phoneNumber = senderJid.split('@')[0]
          const cleanPhoneNumber = phoneNumber.replace(/^\+/, '')
          // Verificar se é uma mensagem de áudio do número permitido
          if (msg.message?.audioMessage) {
            console.log('Mensagem de áudio recebida de', senderJid);
            
            try {
              // Marca a mensagem como lida
              await sock!.readMessages([msg.key]);
              
              // Verifica se o usuário está cadastrado
              console.log('Verificando cadastro do usuário:', cleanPhoneNumber);
              const result = await getOrCreateWhatsAppToken(cleanPhoneNumber);
              
              if (!result.success) {
                console.log('Usuário não cadastrado:', cleanPhoneNumber);
                await sendMessageWTyping({
                  // text: '❌ Você ainda não está com o número do celular cadastrado no Thanus. Por favor, faça seu cadastro primeiro para continuar no link '+THANUS_API_URL+'/settings/whatsapp\n\nCertifique-se que o número cadastrado está no formato 5511999999999'
                  text: '❌ Você ainda não está com o número do celular cadastrado no Thanus.'
                }, senderJid);
                return;
              }
              
              console.log('Usuário verificado, processando áudio...');
              // Processa o áudio sem enviar mensagem de processamento
              let inputPath = '';
              let outputPath = '';
              
              try {
                // Baixa o áudio
                const buffer = await downloadWAMediaMessage(
                  msg,
                  'buffer',
                  { },
                  { 
                    logger,
                    reuploadRequest: sock.updateMediaMessage.bind(sock)
                  }
                )
                
                if (!buffer || !(buffer instanceof Buffer)) {
                  throw new Error('Não foi possível baixar o áudio')
                }
                
                // Cria nome de arquivo único
                const timestamp = Date.now()
                inputPath = `${UPLOAD_FOLDER}/audio_${timestamp}.ogg`
                outputPath = `${UPLOAD_FOLDER}/audio_${timestamp}.wav`
                
                // Garante que o diretório existe
                await fs.promises.mkdir(UPLOAD_FOLDER, { recursive: true });
                
                // Salva o áudio
                await fs.promises.writeFile(inputPath, buffer);
                
                console.log(`Áudio salvo em: ${inputPath}`);
                
                // Converte para WAV
                console.log('Convertendo áudio para WAV...');
                await convertAudioToWav(inputPath, outputPath);
                
                // Verifica se o arquivo WAV foi criado
                try {
                  await fs.promises.access(outputPath, fs.constants.F_OK);
                  console.log(`Áudio convertido para: ${outputPath}`);
                } catch (error) {
                  throw new Error('Falha ao converter o áudio para WAV');
                }
                
                // Transcreve o áudio
                console.log('Transcrevendo áudio...');
                const transcription = await transcribeAudio(outputPath);
                console.log('Transcrição concluída:', transcription);
                
                // Gera e envia a resposta diretamente
                const apiKey = result.api_key || '';
                const response = await generateResponse(transcription, senderJid, apiKey);
                await sendMessageWTyping({ text: response }, senderJid);
                
              } catch (error) {
                console.error('Erro ao processar áudio:', error);
                await sendMessageWTyping({
                  text: '❌ Ocorreu um erro ao processar o áudio. Por favor, tente novamente mais tarde.'
                }, senderJid);
              } finally {
                // Limpa os arquivos temporários
                if (inputPath) {
                  try {
                    await fs.promises.unlink(inputPath);
                  } catch (e) {
                    console.error('Erro ao remover arquivo temporário:', e);
                  }
                }
                if (outputPath) {
                  try {
                    await fs.promises.unlink(outputPath);
                  } catch (e) {
                    console.error('Erro ao remover arquivo temporário:', e);
                  }
                }
              }
              
            } catch (error) {
              console.error('Erro ao processar áudio:', error)
              await sendMessageWTyping({
                text: '❌ Ocorreu um erro ao processar o áudio. Por favor, tente novamente mais tarde.'
              }, senderJid)
            }
            continue
          }
          
          // Processamento de mensagens de texto
          if (msg.message?.conversation || msg.message?.extendedTextMessage?.text) {
            const text = msg.message?.conversation || msg.message?.extendedTextMessage?.text
            
            // if (msg.key.remoteJid === "5517991119780@s.whatsapp.net") {
              console.log('Nova mensagem de', msg.key.remoteJid)

              await sock!.readMessages([msg.key])
              
              try {
                // Verifica se o usuário está cadastrado
                const result = await getOrCreateWhatsAppToken(cleanPhoneNumber)

                if (!result.success) {
                  // Usuário não cadastrado
                  await sendMessageWTyping({
                    // text: '❌ Você ainda não está com o número do celular cadastrado no Thanus. Por favor, faça seu cadastro primeiro para continuar no link '+THANUS_API_URL+'/settings/whatsapp\n\nCertifique-se que o número cadastrado está no formato 5511999999999'
                    text: '❌ Você ainda não está com o número do celular cadastrado no Thanus.'
                  }, senderJid)
                  return
                }
                
                // Se o usuário estiver cadastrado, processa a mensagem normalmente
                const apiKey = result.api_key || ''; // Ensure we have a string value
                const response = await generateResponse(text, senderJid, apiKey)
                await sendMessageWTyping({ text: response }, senderJid)
              } catch (error) {
                console.error('Erro ao processar mensagem:', error)
                await sendMessageWTyping({
                  text: '❌ Ocorreu um erro ao processar sua mensagem. Por favor, tente novamente mais tarde.'
                }, senderJid)
              }
            // }
          }
        }
      }
    }
  })

  return sock;
}

async function getMessage(key: WAMessageKey): Promise<WAMessageContent | undefined> {
  return proto.Message.fromObject({ conversation: "test" })
}

// Envia mensagem com "digitando..."
const sendMessageWTyping = async (msg: string | AnyMessageContent, jid: string) => {
  try {
    await sock.presenceSubscribe(jid);
    await delay(500);
    await sock.sendPresenceUpdate("composing", jid);
    await delay(2000);
    await sock.sendPresenceUpdate("paused", jid);
    
    // Ensure msg is a proper message object
    const message = typeof msg === 'string' ? { text: msg } : msg;
    await sock.sendMessage(jid, message);
  } catch (error) {
    console.error('Error in sendMessageWTyping:', error);
    // Try to send an error message if possible
    try {
      await sock.sendMessage(jid, { 
        text: '❌ Ocorreu um erro ao processar sua mensagem.'
      });
    } catch (e) {
      console.error('Failed to send error message:', e);
    }
  }
};

// Rota para enviar texto
app.post("/whatsapp/send-text", authMiddleware, async (req, res) => {
  try {
    const { numero, mensagem } = req.body
    if (!numero || !mensagem) {
      return res.status(400).json({ erro: "Informe numero e mensagem" })
    }

    const cleanNumero = numero.replace(/^\+/, '') // Remove o sinal de + se existir
    const jid = cleanNumero.includes("@s.whatsapp.net") ? cleanNumero : `${cleanNumero}@s.whatsapp.net`
    await sendMessageWTyping({ text: mensagem }, jid)

    res.json({ sucesso: true, mensagem: "Mensagem enviada" })
  } catch (err) {
    console.error("Erro ao enviar mensagem:", err)
    res.status(500).json({ erro: "Erro ao enviar mensagem" })
  }
})

// Rota para enviar qualquer arquivo
app.post("/whatsapp/send-file", (req, res, next) => {
  upload.single("midia")(req, res, (err) => {
    if (err) {
      console.error('Multer error:', err);
      return res.status(400).json({ erro: 'Erro ao processar o upload do arquivo', details: err.message });
    }
    next();
  });
}, authMiddleware, async (req, res) => {
  try {
    const { numero, legenda } = req.body
    if (!numero || !req.file) {
      return res.status(400).json({ erro: "Informe numero e envie um arquivo" })
    }

    const cleanNumero = numero.replace(/^\+/, '') // Remove o sinal de + se existir
    const jid = cleanNumero.includes("@s.whatsapp.net") ? cleanNumero : `${cleanNumero}@s.whatsapp.net`
    const mediaBuffer = fs.readFileSync(req.file.path)

    // 🚀 Força o mimetype com base no nome original (corrige o bug do .rar vindo como text/plain)
    let mimetype = mime.lookup(req.file.originalname) || "application/octet-stream"
    let fileName = req.file.originalname

    // 🔎 Log para debug
    console.log(`📂 Arquivo recebido -> Nome: ${fileName} | Mimetype detectado: ${mimetype}`)

    let msg: AnyMessageContent

    if (mimetype.startsWith("image/")) {
      msg = { image: mediaBuffer, caption: legenda || "" }
    } else if (mimetype.startsWith("video/")) {
      msg = { video: mediaBuffer, caption: legenda || "" }
    } else if (mimetype.startsWith("audio/")) {
      msg = { audio: mediaBuffer, mimetype, ptt: false }
    } else {
      msg = {
        document: mediaBuffer,
        mimetype: mimetype,
        fileName: fileName,
        caption: legenda || ""
      }
    }

    await sendMessageWTyping(msg, jid)
    fs.unlinkSync(req.file.path)

    res.json({ sucesso: true, mensagem: "Arquivo enviado" })
  } catch (err) {
    console.error("Erro ao enviar arquivo:", err)
    res.status(500).json({ erro: "Erro ao enviar arquivo" })
  }
})

// Inicia servidor e WhatsApp
const PORT = 3005
app.listen(PORT, () => {
  console.log(`✅ API rodando na porta ${PORT}`)
  startSock()
})
