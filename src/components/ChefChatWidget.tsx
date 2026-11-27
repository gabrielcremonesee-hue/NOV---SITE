import { FormEvent, useEffect, useRef, useState } from 'react';
import { ChefHat, Send, Trash2, X, Zap } from 'lucide-react';
import { MEDIA } from '../data/mediaAssets';
import { getOrCreateClientSessionId } from '../utils/supabase/courseSync';

interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  modelUsed?: string;
}

const STORAGE_KEY = 'fervec-chef-chat-v1';

const WELCOME_MESSAGE: ChatMessage = {
  id: 'welcome',
  role: 'model',
  text: 'Olá! Eu sou o Chef CREMONESE. Posso tirar dúvidas sobre as etapas da Carbonara, outros módulos de Massas Italianas, técnicas como emulsão e ponto al dente, ou harmonizações da Vinícola. Como posso ajudar agora?',
};

const QUICK_PROMPTS = [
  'Como evitar que os ovos talhem na Carbonara?',
  'Posso substituir o guanciale na receita?',
  'Qual vinho combina melhor com Pomodoro?',
];

function loadSavedHistory(): ChatMessage[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [WELCOME_MESSAGE];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
  } catch {
    // ignore storage errors
  }
  return [WELCOME_MESSAGE];
}

export default function ChefChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>(() => loadSavedHistory());
  const [input, setInput] = useState('');
  const [mode, setMode] = useState<'standard' | 'fast'>('standard');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [contextHint, setContextHint] = useState('');

  const threadRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(messages.slice(-30)));
    } catch {
      // ignore storage errors
    }
  }, [messages]);

  useEffect(() => {
    if (open && threadRef.current) {
      threadRef.current.scrollTop = threadRef.current.scrollHeight;
    }
  }, [messages, open, loading]);

  useEffect(() => {
    const onOpenChat = (event: Event) => {
      const custom = event as CustomEvent<{ context?: string; prompt?: string }>;
      if (custom.detail?.context) {
        setContextHint(custom.detail.context);
      }
      setOpen(true);
      if (custom.detail?.prompt) {
        setInput(custom.detail.prompt);
      }
      window.setTimeout(() => inputRef.current?.focus(), 60);
    };

    const onContextChange = (event: Event) => {
      const custom = event as CustomEvent<{ context?: string }>;
      if (typeof custom.detail?.context === 'string') {
        setContextHint(custom.detail.context);
      }
    };

    window.addEventListener('fervec:open-chat', onOpenChat);
    window.addEventListener('fervec:context', onContextChange);
    return () => {
      window.removeEventListener('fervec:open-chat', onOpenChat);
      window.removeEventListener('fervec:context', onContextChange);
    };
  }, []);

  async function sendMessage(textToSend: string) {
    const trimmed = textToSend.trim();
    if (!trimmed || loading) return;

    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      role: 'user',
      text: trimmed,
    };

    const nextHistory = [...messages, userMsg];
    setMessages(nextHistory);
    setInput('');
    setError(null);
    setLoading(true);

    // Exclude static welcome greeting if it's the first placeholder message, or include only actual turns
    const apiMessages = nextHistory
      .filter((m) => m.id !== 'welcome')
      .map((m) => ({ role: m.role, text: m.text }));

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-fervec-session-id': getOrCreateClientSessionId(),
        },
        body: JSON.stringify({
          messages: apiMessages,
          mode,
          context: contextHint,
        }),
      });

      const data = (await res.json()) as { reply?: string; model?: string; error?: string };

      if (!res.ok || !data.reply) {
        setError(data.error || 'Não foi possível obter resposta do Chef agora.');
        return;
      }

      const replyMsg: ChatMessage = {
        id: `m-${Date.now()}`,
        role: 'model',
        text: data.reply,
        modelUsed: data.model,
      };
      setMessages((prev) => [...prev, replyMsg]);
    } catch {
      setError('Falha de conexão ao conversar com o Chef. Tente novamente.');
    } finally {
      setLoading(false);
    }
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    void sendMessage(input);
  }

  function handleClear() {
    setMessages([WELCOME_MESSAGE]);
    setError(null);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
  }

  return (
    <div className="chef-chat-root">
      {!open && (
        <button
          type="button"
          className="chef-chat-fab"
          onClick={() => {
            setOpen(true);
            window.setTimeout(() => inputRef.current?.focus(), 60);
          }}
          aria-label="Abrir conversa com o Chef CREMONESE"
        >
          <span className="chef-chat-fab-icon" aria-hidden="true">
            <img src={MEDIA.chefOfficialPortrait} alt="" referrerPolicy="no-referrer" />
          </span>
          <span className="chef-chat-fab-label">
            <strong>Perguntar ao Chef</strong>
            <small>Tire dúvidas em tempo real</small>
          </span>
        </button>
      )}

      {open && (
        <section
          className="chef-chat-drawer"
          role="dialog"
          aria-label="Conversa com o Chef CREMONESE"
        >
          <header className="chef-chat-header">
            <div className="chef-chat-identity">
              <span className="chef-chat-avatar" aria-hidden="true">
                <img src={MEDIA.chefOfficialPortrait} alt="" referrerPolicy="no-referrer" />
              </span>
              <div>
                <h2>Chef CREMONESE</h2>
                <p>{contextHint ? `Contexto: ${contextHint}` : 'Assistente da Cozinha FerveC'}</p>
              </div>
            </div>
            <div className="chef-chat-header-actions">
              <button
                type="button"
                className="chef-chat-icon-btn"
                onClick={handleClear}
                title="Limpar conversa"
                aria-label="Limpar conversa"
              >
                <Trash2 size={16} />
              </button>
              <button
                type="button"
                className="chef-chat-icon-btn"
                onClick={() => setOpen(false)}
                title="Fechar conversa"
                aria-label="Fechar conversa"
              >
                <X size={18} />
              </button>
            </div>
          </header>

          <div className="chef-chat-mode-bar" role="group" aria-label="Modo de resposta">
            <button
              type="button"
              className={`chef-chat-mode-btn ${mode === 'standard' ? 'active' : ''}`}
              onClick={() => setMode('standard')}
            >
              <ChefHat size={14} />
              <span>Chef Completo</span>
            </button>
            <button
              type="button"
              className={`chef-chat-mode-btn ${mode === 'fast' ? 'active' : ''}`}
              onClick={() => setMode('fast')}
            >
              <Zap size={14} />
              <span>Resposta Rápida</span>
            </button>
          </div>

          <div ref={threadRef} className="chef-chat-thread" aria-live="polite">
            {messages.map((msg) => (
              <article
                key={msg.id}
                className={`chef-chat-bubble ${msg.role === 'user' ? 'is-user' : 'is-model'}`}
              >
                <span className="chef-chat-author">
                  {msg.role === 'user' ? 'Você' : 'Chef CREMONESE'}
                </span>
                <p>{msg.text}</p>
              </article>
            ))}

            {messages.length <= 1 && !loading && (
              <div className="chef-chat-suggestions">
                <span>Sugestões para começar:</span>
                {QUICK_PROMPTS.map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    onClick={() => void sendMessage(prompt)}
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            )}

            {loading && (
              <div className="chef-chat-bubble is-model is-loading">
                <span className="chef-chat-author">Chef CREMONESE</span>
                <p>Preparando orientação…</p>
              </div>
            )}

            {error && (
              <div className="chef-chat-error" role="alert">
                {error}
              </div>
            )}
          </div>

          <form className="chef-chat-form" onSubmit={handleSubmit}>
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Pergunte sobre receitas, técnicas ou vinhos…"
              aria-label="Digite sua dúvida para o Chef"
              disabled={loading}
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              aria-label="Enviar pergunta"
            >
              <Send size={17} />
            </button>
          </form>
        </section>
      )}
    </div>
  );
}
