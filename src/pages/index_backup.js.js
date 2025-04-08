// Arquivo: src/pages/index.js (Versão com Playlists Distintas e react-youtube - COM TIMELINE CORRIGIDA)

import Head from 'next/head';
import { useEffect, useRef, useState, useCallback } from 'react';
import YouTube from 'react-youtube';

// --- IDs das Playlists e Chave API (Lidos do Environment) ---
const PLAYLIST_ID_1 = process.env.NEXT_PUBLIC_YOUTUBE_PLAYLIST_ID_1;
const PLAYLIST_ID_2 = process.env.NEXT_PUBLIC_YOUTUBE_PLAYLIST_ID_2;
const API_KEY = process.env.NEXT_PUBLIC_YOUTUBE_API_KEY;

// --- Função para buscar vídeos de uma playlist (FORA do Componente) ---
async function fetchPlaylistVideos(playlistId, apiKey) {
  console.log(`Buscando playlist ID: ${playlistId}...`);
  if (!playlistId || !apiKey) {
    console.error("fetchPlaylistVideos: ID da Playlist ou Chave API não fornecida!");
    return []; // Retorna array vazio se IDs/Chave faltarem
  }
  // Busca os vídeos ordenados por data (padrão da API para playlistItems)
  const URL = `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&playlistId=${playlistId}&maxResults=50&key=${apiKey}`;
  try {
    const response = await fetch(URL);
    const data = await response.json();
    if (!response.ok || data.error) {
      console.error("Erro da API YouTube ao buscar playlist:", playlistId, data.error || response.status);
      throw new Error(data.error?.message || `Erro ${response.status}`);
    }
    // Mapeia para pegar apenas o videoId, filtrando itens inválidos
    const videoIds = data.items
      ?.map(item => item.snippet?.resourceId?.videoId)
      .filter(Boolean) || []; // filter(Boolean) remove null/undefined/empty strings
    console.log(`Vídeos encontrados para ${playlistId}: ${videoIds.length}`);
    return videoIds; // Retorna array de IDs [videoId1, videoId2, ...]
  } catch (error) {
    console.error(`Falha no fetch da playlist ${playlistId}:`, error);
    alert(`Erro ao carregar vídeos da playlist ${playlistId}. Verifique o ID no .env.local e a Chave API. Veja o console (F12).`);
    return []; // Retorna array vazio em caso de erro
  }
}

export default function Home() {
  // --- Estados ---
  const player1Ref = useRef(null);
  const player2Ref = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume1, setVolume1] = useState(100);
  const [volume2, setVolume2] = useState(75); // Mantém P2 mais baixo
  const [speed, setSpeed] = useState(1);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playlist1VideoIds, setPlaylist1VideoIds] = useState([]); // Guarda IDs P1
  const [playlist2VideoIds, setPlaylist2VideoIds] = useState([]); // Guarda IDs P2
  const [currentIndexP1, setCurrentIndexP1] = useState(0); // Índice P1
  const [currentIndexP2, setCurrentIndexP2] = useState(0); // Índice P2
  // Video IDs agora são controlados pelo useEffect abaixo
  const [video1Id, setVideo1Id] = useState('');
  const [video2Id, setVideo2Id] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const intervalRef = useRef(null);
  const [isLoadingPlaylists, setIsLoadingPlaylists] = useState(true);
  const [isP1Ready, setIsP1Ready] = useState(false);
  const [isP2Ready, setIsP2Ready] = useState(false);


  // --- useEffect para buscar Playlists na Montagem ---
  useEffect(() => {
    if (!API_KEY || !PLAYLIST_ID_1 || !PLAYLIST_ID_2) {
      console.error("ERRO GRAVE: Chave API ou IDs das Playlists não definidos!");
      alert("ERRO: Chave API ou IDs das Playlists não configurados! Verifique o .env.local e reinicie o servidor.");
      setIsLoadingPlaylists(false);
      return;
    }
    console.log("Montado. Buscando playlists...");
    setIsLoadingPlaylists(true);
    Promise.all([
      fetchPlaylistVideos(PLAYLIST_ID_1, API_KEY),
      fetchPlaylistVideos(PLAYLIST_ID_2, API_KEY)
    ]).then(([videosP1, videosP2]) => {
      const list1 = videosP1 || [];
      const list2 = videosP2 || [];
      setPlaylist1VideoIds(list1);
      setPlaylist2VideoIds(list2);
      // Define o vídeo inicial (índice 0 = mais recente)
      setVideo1Id(list1[0] || '');
      setVideo2Id(list2[0] || '');
      setCurrentIndexP1(0);
      setCurrentIndexP2(0);
      setIsLoadingPlaylists(false);
      console.log("Playlists carregadas e vídeos iniciais definidos.");
    }).catch(error => {
      console.error("Erro final ao buscar playlists:", error);
      setIsLoadingPlaylists(false);
    });
  }, []); // Roda SÓ uma vez na montagem inicial

  // --- useEffect para limpar timeline ---
  useEffect(() => { return () => { stopTimelineUpdate(); }; }, []);

  // --- Funções de Callback ---
  const playerInstanceMatchesRef = (instance, ref) => ref.current && instance === ref.current;
  const onPlayerReady = useCallback((event, playerRefSetter, initialVolume, playerNum, readySetter) => { console.log(`Player ${playerNum} PRONTO.`); const player = event.target; playerRefSetter(player); readySetter(true); try { if (!player?.setVolume || !player?.setPlaybackRate) return; console.log(`Player ${playerNum}: Setando Vol(${initialVolume}), Speed(${speed})`); player.setVolume(initialVolume); player.setPlaybackRate(speed); if (playerNum === 1 && typeof player.getDuration === 'function') { setTimeout(() => { try{ const d = player.getDuration(); if (d > 0) setDuration(d); } catch(e){} }, 500); } } catch (error) { console.error(`Erro onPlayerReady P${playerNum}:`, error); } }, [speed]);
  const onPlayerStateChange = useCallback((event) => { const state = event.data; const player = event.target; if (!player) return; const isP1 = playerInstanceMatchesRef(player, player1Ref); const pId = isP1 ? 'P1' : 'P2'; console.log(`${pId} state: ${state}`); if (state === 0) { try { player.seekTo(0, true); setTimeout(() => player.playVideo(), 50); } catch(e){} if (!isPlaying) setIsPlaying(true); if (!intervalRef.current) startTimelineUpdate(); } else if (state === 1) { if (!isPlaying) setIsPlaying(true); startTimelineUpdate(); } else if (state === 2) { const oRef = isP1 ? player2Ref : player1Ref; let oState = 0; try { if(oRef.current?.getPlayerState) oState = oRef.current.getPlayerState();} catch(e){} if(oState === 2 || oState === 0 || oState === 5 || oState === -1) { if(isPlaying) setIsPlaying(false); stopTimelineUpdate();} } if (state === 0 && isP1 && !isPlaying) setCurrentTime(0); }, [isPlaying, duration]);

  // --- Handlers ---
  const handlePlayPause = () => { if (!isP1Ready || !isP2Ready || !player1Ref.current || !player2Ref.current) return; try { if (isPlaying) { player1Ref.current.pauseVideo(); player2Ref.current.pauseVideo(); } else { player1Ref.current.playVideo(); setTimeout(() => { if(player2Ref.current) player2Ref.current.playVideo();}, 500); } } catch (e) { console.error("Erro Play/Pause:", e); } };
  const handleSeek = (e) => { if (!isP1Ready || !isP2Ready || !player1Ref.current || !player2Ref.current) return; const t = parseFloat(e.target.value); setCurrentTime(t); try { player1Ref.current.seekTo(t, true); player2Ref.current.seekTo(t, true); } catch (e) { console.error("Erro seek:", e); } };
  const handleSpeedChange = (e) => { if (!isP1Ready || !isP2Ready) return; const s = parseFloat(e.target.value); setSpeed(s); try { if (player1Ref.current?.setPlaybackRate) player1Ref.current.setPlaybackRate(s); if (player2Ref.current?.setPlaybackRate) player2Ref.current.setPlaybackRate(s); } catch (e) { console.error("Erro velocidade:", e); } };
  const handleVolumeChange = (event, playerRef, volumeSetter, playerNum) => { const v = parseInt(event.target.value, 10); console.log(`Handler Vol${playerNum} para: ${v}`); volumeSetter(v); if (playerRef.current?.setVolume) { try { playerRef.current.setVolume(v); } catch (e) { console.error(`Erro volume P${playerNum}:`, e); } } };
  const handleVolume1Change = (event) => handleVolumeChange(event, player1Ref, setVolume1, 1);
  const handleVolume2Change = (event) => handleVolumeChange(event, player2Ref, setVolume2, 2);
  // OBS: URL do Remix ainda parece estranha ('1{videoId}'), talvez precise revisar depois.
  const handleRemix = (videoId) => { if (!videoId) return; const url = `https://www.youtube.com/shorts/remix/${videoId}`; window.open(url, '_blank'); }; 
  const handleFullscreen = (playerRef) => { if (playerRef.current?.getIframe) { const i = playerRef.current.getIframe(); if (i?.requestFullscreen) { i.requestFullscreen().catch(e => console.error("Erro Fullscreen:", e)); } else { console.error("Fullscreen não suportado."); } } };
  const handleSearchChange = (e) => { setSearchTerm(e.target.value); };
  const handleSearchSubmit = (e) => { e.preventDefault(); alert("Busca não implementada!"); };

  // Próximo/Anterior AGORA usam as listas separadas
  const handleNextVideo = () => {
      console.log("Handler: Próximo Clicado");
      let nextIndexP1 = currentIndexP1;
      let nextIndexP2 = currentIndexP2;
      if (playlist1VideoIds.length > 0) {
          nextIndexP1 = (currentIndexP1 + 1) % playlist1VideoIds.length;
          setVideo1Id(playlist1VideoIds[nextIndexP1]); // Define ID novo
          console.log("  P1 -> Índice", nextIndexP1);
      }
      if (playlist2VideoIds.length > 0) {
          nextIndexP2 = (currentIndexP2 + 1) % playlist2VideoIds.length;
          setVideo2Id(playlist2VideoIds[nextIndexP2]); // Define ID novo
          console.log("  P2 -> Índice", nextIndexP2);
      }
      setCurrentIndexP1(nextIndexP1); // Atualiza os índices no estado
      setCurrentIndexP2(nextIndexP2);
      stopTimelineUpdate(); setIsPlaying(false); setCurrentTime(0); setDuration(0); setIsP1Ready(false); setIsP2Ready(false); // Reseta tudo
  };

  const handlePreviousVideo = () => {
      console.log("Handler: Anterior Clicado");
      let prevIndexP1 = currentIndexP1;
      let prevIndexP2 = currentIndexP2;
      if (playlist1VideoIds.length > 0) {
          prevIndexP1 = (currentIndexP1 - 1 + playlist1VideoIds.length) % playlist1VideoIds.length;
          setVideo1Id(playlist1VideoIds[prevIndexP1]);
          console.log("  P1 -> Índice", prevIndexP1);
      }
       if (playlist2VideoIds.length > 0) {
          prevIndexP2 = (currentIndexP2 - 1 + playlist2VideoIds.length) % playlist2VideoIds.length;
          setVideo2Id(playlist2VideoIds[prevIndexP2]);
          console.log("  P2 -> Índice", prevIndexP2);
       }
      setCurrentIndexP1(prevIndexP1);
      setCurrentIndexP2(prevIndexP2);
      stopTimelineUpdate(); setIsPlaying(false); setCurrentTime(0); setDuration(0); setIsP1Ready(false); setIsP2Ready(false);
  };

  // --- Estados de Autenticação ---
  const [authMode, setAuthMode] = useState('login'); // 'login' ou 'register'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // --- Handlers de Autenticação ---
  const handleEmailChange = (e) => setEmail(e.target.value);
  const handlePasswordChange = (e) => setPassword(e.target.value);
  const handleConfirmPasswordChange = (e) => setConfirmPassword(e.target.value);

  const clearAuthFields = () => {
    setEmail('');
    setPassword('');
    setConfirmPassword('');
  };

  const handleLoginSubmit = (e) => {
    e.preventDefault();
    console.log("Tentando login com:", email);
    alert(`(Simulado) Login com: ${email}. Verifique o console.`);
    // Lógica real de backend viria aqui
  };

  const handleRegisterSubmit = (e) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      alert("As senhas não coincidem!"); return;
    }
    if (!email || !password) {
        alert("Por favor, preencha o email e a senha."); return;
    }
    console.log("Tentando registrar com:", email);
    alert(`(Simulado) Cadastro com: ${email}. Verifique o console.`);
    alert("Cadastro simulado! Você pode tentar fazer o login.");
    clearAuthFields();
    setAuthMode('login'); // Volta para login
    // Lógica real de backend viria aqui
  };

  const handleGoogleAuth = () => {
    alert(`(Simulado) Autenticação com Google clicada no modo: ${authMode}.`);
    console.log("Tentando autenticação com Google (simulado)... Modo:", authMode);
    // Lógica real de OAuth viria aqui
  };

  const switchToRegister = () => {
    clearAuthFields();
    setAuthMode('register');
  };

  const switchToLogin = () => {
    clearAuthFields();
    setAuthMode('login');
  };

  // loadVideo para busca - precisa decidir qual player/playlist atualizar
  const loadVideo = (playerNum, newVideoId) => { console.warn("loadVideo da busca não atualiza playlists nesta versão."); if (playerNum === 1) setVideo1Id(newVideoId); else setVideo2Id(newVideoId); /* Como tratar currentIndex? */ };

  // Funções da Timeline
  const startTimelineUpdate = () => { stopTimelineUpdate(); intervalRef.current = setInterval(() => { try { if (isP1Ready && player1Ref.current?.getCurrentTime && player1Ref.current?.getPlayerState() === 1) { const time = player1Ref.current.getCurrentTime(); if (typeof time === 'number') setCurrentTime(time); if (duration <= 0 && typeof player1Ref.current.getDuration === 'function') { const d = player1Ref.current.getDuration(); if (d > 0) setDuration(d); } } } catch(e){ stopTimelineUpdate(); } }, 500); };
  const stopTimelineUpdate = () => { if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; } };

  // --- Player Options ---
  const playerOptions = { playerVars: { playsinline: 1, controls: 0, rel: 0, modestbranding: 1, fs: 0, iv_load_policy: 3 }, };

  // --- formatTime ---
  // Esta função é necessária para a timeline no código original
  function formatTime(seconds) { const safeSeconds = Number(seconds) || 0; if (safeSeconds < 0) return '0:00'; const minutes = Math.floor(safeSeconds / 60); const secs = Math.floor(safeSeconds % 60); return `${minutes}:${secs < 10 ? '0' : ''}${secs}`; }


  // --- JSX (Com Loading State e ajuste nos botões Prev/Next) ---
  return (
    <div className="flex flex-col min-h-screen bg-gray-900 text-white font-sans">
      <Head> <title>Setenta Vezes Sete</title> <link rel="icon" href="/favicon.ico" /> </Head>

      {/* ----- Barra Superior ----- */}
      <div className="w-full p-3 bg-gray-800 bg-opacity-80 backdrop-blur-sm flex items-center justify-between sticky top-0 z-20 shadow-md">
          {/* Nome do Site Discreto */}
          <span className="text-sm font-semibold text-red-500 opacity-80 hidden sm:block">
            Setenta Vezes Sete
          </span>
          {/* Controle Velocidade Centralizado */}
          <div className="flex items-center justify-center flex-grow mx-4 sm:mx-8">
              <label htmlFor="speed" className="text-xs mr-2 text-gray-400">Vel:</label>
              <input
                  type="range" id="speed" min="0.07" max="6" step="0.01" value={speed} onChange={handleSpeedChange}
                  className="w-full max-w-md h-4 bg-gray-600 rounded-full appearance-none cursor-pointer accent-red-600"
              />
              <span className="text-xs ml-2 w-10 text-center text-gray-300">{speed.toFixed(2)}x</span>
          </div>
          <div className="w-auto hidden sm:block"></div> {/* Espaço para balancear */}
      </div>

      {isLoadingPlaylists ? ( // Mostra Loading enquanto busca playlists
          <div className="flex-grow flex items-center justify-center text-xl">Carregando vídeos das playlists...</div>
      ) : ( // Mostra players depois de carregar
          <main className="flex-grow flex flex-col items-center justify-center p-4 pt-4 md:pt-6"> {/* <-- Padding Top ajustado */}
            <div className="flex w-full max-w-6xl items-stretch justify-center space-x-2 md:space-x-4">
              {/* Coluna Esquerda */}
              <div className="flex items-center space-x-1 md:space-x-2">
                  {/* Controles Verticais Esquerda */}
                 <div className="flex flex-col items-center h-64 md:h-80 lg:h-96 justify-start py-2 px-1 space-y-4 w-12"> <div className="flex flex-col items-center h-full w-full"> <label htmlFor="vol1" className="text-xs mb-1 flex-shrink-0">Vol 1</label> <input type="range" id="vol1" orient="vertical" min="0" max="100" value={volume1} onChange={handleVolume1Change} className="w-4 h-full appearance-none bg-gray-700 rounded-full slider-vertical accent-blue-600 cursor-pointer"/> </div> </div>
                  {/* Container Player Esquerdo */}
                 <div className="relative bg-black aspect-[9/16] h-64 md:h-80 lg:h-96 max-w-[180px] md:max-w-[240px] border border-gray-700 rounded overflow-hidden">
                  {video1Id ? (<YouTube key={`p1-${video1Id}`} videoId={video1Id} opts={playerOptions} onReady={(e) => onPlayerReady(e, (instance) => player1Ref.current = instance, volume1, 1, setIsP1Ready)} onStateChange={onPlayerStateChange} className="absolute top-0 left-0 w-full h-full" iframeClassName="absolute top-0 left-0 w-full h-full"/>) : (<div className="w-full h-full flex items-center justify-center text-xs text-gray-400 p-2">Playlist 1 vazia ou vídeo indisponível</div>)}
                  <div className="absolute top-1 right-1 flex flex-col space-y-1 z-10"> <button onClick={() => handleRemix(video1Id)} title="Remix" className="text-xs p-1 bg-black bg-opacity-60 rounded hover:bg-opacity-80" disabled={!video1Id}>[R]</button> <button onClick={() => handleFullscreen(player1Ref)} title="Maximizar" className="text-xs p-1 bg-black bg-opacity-60 rounded hover:bg-opacity-80" disabled={!video1Id}>[M]</button> </div>
                 </div>
              </div>
              {/* Controles Centrais */}
              <div className="flex flex-col items-center justify-center px-1 space-y-2">
                    <button onClick={handlePreviousVideo} title="Anterior" className="p-2 bg-gray-600 rounded-full text-white hover:bg-gray-700 text-lg focus:outline-none disabled:opacity-50" disabled={playlist1VideoIds.length < 1 && playlist2VideoIds.length < 1}>▲</button>
                    <button onClick={handlePlayPause} className="p-3 md:p-4 bg-red-600 rounded-full text-white hover:bg-red-700 text-xl md:text-2xl focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-offset-2 focus:ring-offset-gray-900" title={isPlaying ? "Pausar" : "Play"} disabled={!video1Id && !video2Id}> {isPlaying ? '❚❚' : '►'} </button>
                    <button onClick={handleNextVideo} title="Próximo" className="p-2 bg-gray-600 rounded-full text-white hover:bg-gray-700 text-lg focus:outline-none disabled:opacity-50" disabled={playlist1VideoIds.length < 1 && playlist2VideoIds.length < 1}>▼</button>
              </div>
              {/* Coluna Direita */}
              <div className="flex items-center space-x-1 md:space-x-2">
                 {/* Container Player Direito */}
                 <div className="relative bg-black aspect-[9/16] h-64 md:h-80 lg:h-96 max-w-[180px] md:max-w-[240px] border border-gray-700 rounded overflow-hidden">
                    {video2Id ? (<YouTube key={`p2-${video2Id}`} videoId={video2Id} opts={playerOptions} onReady={(e) => onPlayerReady(e, (instance) => player2Ref.current = instance, volume2, 2, setIsP2Ready)} onStateChange={onPlayerStateChange} className="absolute top-0 left-0 w-full h-full" iframeClassName="absolute top-0 left-0 w-full h-full"/>) : (<div className="w-full h-full flex items-center justify-center text-xs text-gray-400 p-2">Playlist 2 vazia ou vídeo indisponível</div>)}
                    <div className="absolute top-1 right-1 flex flex-col space-y-1 z-10"> <button onClick={() => handleRemix(video2Id)} title="Remix" className="text-xs p-1 bg-black bg-opacity-60 rounded hover:bg-opacity-80" disabled={!video2Id}>[R]</button> <button onClick={() => handleFullscreen(player2Ref)} title="Maximizar" className="text-xs p-1 bg-black bg-opacity-60 rounded hover:bg-opacity-80" disabled={!video2Id}>[M]</button> </div>
                 </div>
                  {/* Controles Verticais Direita */}
                 <div className="flex flex-col items-center h-64 md:h-80 lg:h-96 justify-start py-2 px-1 space-y-4 w-12"> <div className="flex flex-col items-center h-full w-full"> <label htmlFor="vol2" className="text-xs mb-1 flex-shrink-0">Vol 2</label> <input type="range" id="vol2" orient="vertical" min="0" max="100" value={volume2} onChange={handleVolume2Change} className="w-4 h-full appearance-none bg-gray-700 rounded-full slider-vertical accent-blue-600 cursor-pointer"/> </div> </div>
              </div>
            </div>

            {/* Timeline (CORRIGIDO) */}
            <div className="w-full max-w-3xl lg:max-w-4xl mt-4 flex items-center space-x-2 px-4"> 
                <span className="text-xs w-12 text-right">{formatTime(currentTime)}</span> {/* Fechado aqui */}
                <input 
                    type="range" 
                    min="0" 
                    max={duration || 1} 
                    value={currentTime} 
                    step="0.1" 
                    onChange={handleSeek} 
                    className="w-full h-1 accent-red-600 cursor-pointer" 
                    disabled={!video1Id && !video2Id}
                /> 
                <span className="text-xs w-12 text-left">{formatTime(duration)}</span> {/* Fechado aqui */}
            </div> 
            
            {/* ----- SEÇÃO DE AUTENTICAÇÃO ----- */}
        <div className="w-full max-w-md p-6 md:p-8 mt-8 bg-gray-800 bg-opacity-70 rounded-xl shadow-2xl border border-gray-700"> {/* Ajustado max-w */}

{/* --- Formulário de Login --- */}
{authMode === 'login' && (
  <form onSubmit={handleLoginSubmit} className="space-y-5 animate-fade-in">
    <h2 className="text-2xl font-semibold text-center text-white mb-6">Entrar</h2>
    <div>
      <label htmlFor="login-email" className="block text-sm font-medium text-gray-300 mb-1">Email</label>
      <input
        type="email" id="login-email" value={email} onChange={handleEmailChange} required autoComplete='email' placeholder="seuemail@exemplo.com"
        className="w-full p-2.5 rounded-md bg-gray-700 text-white border border-gray-600 placeholder-gray-500 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition"
      />
    </div>
    <div>
      <label htmlFor="login-password"  className="block text-sm font-medium text-gray-300 mb-1">Senha</label>
      <input
        type="password" id="login-password" value={password} onChange={handlePasswordChange} required autoComplete='current-password' placeholder="********"
        className="w-full p-2.5 rounded-md bg-gray-700 text-white border border-gray-600 placeholder-gray-500 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition"
      />
    </div>
    <button type="submit" className="w-full py-2.5 px-4 bg-red-600 rounded-md text-white font-semibold hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-offset-2 focus:ring-offset-gray-800 transition duration-150 ease-in-out shadow-md">
      Entrar
    </button>
    <button type="button" onClick={handleGoogleAuth} className="w-full py-2.5 px-4 bg-gray-700 border border-gray-600 rounded-md text-white font-medium hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 focus:ring-offset-gray-800 transition duration-150 ease-in-out flex items-center justify-center space-x-2 shadow-sm">
      <svg className="w-5 h-5" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path><path fill="none" d="M0 0h48v48H0z"></path></svg>
      <span>Entrar com Google</span>
    </button>
    <div className="text-center mt-4">
      <span className="text-sm text-gray-400">Não tem conta? </span>
      <button type="button" onClick={switchToRegister} className="text-sm font-medium text-blue-400 hover:text-blue-300 transition">
        Cadastre-se
      </button>
    </div>
  </form>
)}

{/* --- Formulário de Cadastro --- */}
{authMode === 'register' && (
  <form onSubmit={handleRegisterSubmit} className="space-y-5 animate-fade-in">
     <h2 className="text-2xl font-semibold text-center text-white mb-6">Criar Conta</h2>
     <div>
       <label htmlFor="register-email" className="block text-sm font-medium text-gray-300 mb-1">Email</label>
       <input type="email" id="register-email" value={email} onChange={handleEmailChange} required autoComplete='email' placeholder="seuemail@exemplo.com" className="w-full p-2.5 rounded-md bg-gray-700 text-white border border-gray-600 placeholder-gray-500 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition"/>
     </div>
     <div>
       <label htmlFor="register-password"  className="block text-sm font-medium text-gray-300 mb-1">Senha</label>
       <input type="password" id="register-password" value={password} onChange={handlePasswordChange} required autoComplete='new-password' placeholder="Crie uma senha" className="w-full p-2.5 rounded-md bg-gray-700 text-white border border-gray-600 placeholder-gray-500 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition"/>
     </div>
     <div>
       <label htmlFor="confirm-password"  className="block text-sm font-medium text-gray-300 mb-1">Confirmar Senha</label>
       <input type="password" id="confirm-password" value={confirmPassword} onChange={handleConfirmPasswordChange} required autoComplete='new-password' placeholder="Repita a senha" className="w-full p-2.5 rounded-md bg-gray-700 text-white border border-gray-600 placeholder-gray-500 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition"/>
     </div>
     <button type="submit" className="w-full py-2.5 px-4 bg-red-600 rounded-md text-white font-semibold hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-offset-2 focus:ring-offset-gray-800 transition duration-150 ease-in-out shadow-md">
       Cadastrar com Email
     </button>
     <button type="button" onClick={handleGoogleAuth} className="w-full py-2.5 px-4 bg-gray-700 border border-gray-600 rounded-md text-white font-medium hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 focus:ring-offset-gray-800 transition duration-150 ease-in-out flex items-center justify-center space-x-2 shadow-sm">
       <svg className="w-5 h-5" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path><path fill="none" d="M0 0h48v48H0z"></path></svg>
       <span>Cadastrar com Google</span>
     </button>
     <div className="text-center mt-4">
       <span className="text-sm text-gray-400">Já tem conta? </span>
       <button type="button" onClick={switchToLogin} className="text-sm font-medium text-blue-400 hover:text-blue-300 transition">
         Faça Login
       </button>
     </div>
   </form>
)}
</div> {/* Fim da seção de autenticação */}

          </main>
      )} {/* Fim do else isLoadingPlaylists */}
    </div>
  );
} // Fim Home


/* CSS para slider-vertical em globals.css */
/* .slider-vertical { writing-mode: bt-lr; -webkit-appearance: slider-vertical; appearance: slider-vertical; cursor: pointer; } */

// --- formatTime (movido para o final para melhor organização) ---
function formatTime(seconds) { 
    const safeSeconds = Number(seconds) || 0; 
    if (safeSeconds < 0) return '0:00'; 
    const minutes = Math.floor(safeSeconds / 60); 
    const secs = Math.floor(safeSeconds % 60); 
    return `${minutes}:${secs < 10 ? '0' : ''}${secs}`; 
}