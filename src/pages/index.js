import Head from 'next/head';
import { useEffect, useRef, useState, useCallback } from 'react';
import YouTube from 'react-youtube';
import { createClient } from '@supabase/supabase-js';

// --- Configuração e Variáveis de Ambiente ---
const PLAYLIST_ID_V1 = process.env.NEXT_PUBLIC_YOUTUBE_PLAYLIST_ID_1;
const PLAYLIST_ID_V2 = process.env.NEXT_PUBLIC_YOUTUBE_PLAYLIST_ID_2;
const PLAYLIST_ID_H1 = process.env.NEXT_PUBLIC_H_PLAYLIST_ID_1;
const PLAYLIST_ID_H2 = process.env.NEXT_PUBLIC_H_PLAYLIST_ID_2;
const API_KEY = process.env.NEXT_PUBLIC_YOUTUBE_API_KEY;
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = (supabaseUrl && supabaseAnonKey) ? createClient(supabaseUrl, supabaseAnonKey) : null;

// --- Função Fetch Vídeos ---
async function fetchPlaylistVideos(playlistId, apiKey) {
    if (!playlistId || !apiKey) { return []; }
    const URL = `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&playlistId=${playlistId}&maxResults=50&key=${apiKey}`;
    try {
        const response = await fetch(URL);
        const data = await response.json();
        if (!response.ok || data.error) { throw new Error(data.error?.message || `YT API Error ${response.status}`); }
        return data.items?.map(item => item.snippet?.resourceId?.videoId).filter(Boolean) || [];
    } catch (error) { console.error(`Falha fetch playlist ${playlistId}:`, error); return []; }
}

// --- Função Utilitária para Verificar Instância do Player ---
// (Vem da versão refatorada)
function playerInstanceMatchesRef(playerInstance, playerRef) {
    try {
        return playerRef.current && playerInstance &&
            typeof playerRef.current.getIframe === 'function' &&
            typeof playerInstance.getIframe === 'function' &&
            playerRef.current.getIframe() === playerInstance.getIframe();
    } catch (e) { console.error("Erro comparando instância do player com ref:", e); return false; }
}

// --- Função Utilitária para Formatar Tempo (MM:SS) ---
// (Vem da versão refatorada)
function formatTime(seconds) {
    if (isNaN(seconds) || seconds < 0) { return "00:00"; }
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
}

// --- Componente Principal ---
export default function Home() {
    // Estados (do seu código original)
    const [session, setSession] = useState(null);
    const [loadingSession, setLoadingSession] = useState(true);
    const [authMode, setAuthMode] = useState('login');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    // Gerencia Sessão Supabase (do seu código original)
    useEffect(() => {
        if (!supabase) { console.error("Supabase client não inicializado."); setLoadingSession(false); return; }
        supabase.auth.getSession().then(({ data: { session } }) => { setSession(session); setLoadingSession(false); });
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session); setLoadingSession(false);
            if (_event === 'SIGNED_OUT') { setAuthMode('login'); clearAuthFields(); }
        });
        return () => { subscription?.unsubscribe(); };
    }, []);

    // --- Handlers Auth (DO SEU CÓDIGO ORIGINAL - validados por você) ---
    const clearAuthFields = () => { setEmail(''); setPassword(''); setConfirmPassword(''); };
    const handleRegisterSubmit = async (e) => { e.preventDefault(); if (!supabase) return; if (password !== confirmPassword) { alert("Senhas não coincidem!"); return; } if (!email || !password) { alert("Preencha email/senha."); return; } setAuthMode('loading'); try { const { data, error } = await supabase.auth.signUp({ email: email, password: password }); if (error) throw error; if (data.user && !data.session) { alert("Cadastro quase completo! Verifique seu email."); clearAuthFields(); setAuthMode('login'); } else if (data.user && data.session) { alert("Cadastro e login realizados!"); clearAuthFields(); } else { throw new Error("Resposta inesperada."); } } catch (error) { alert(`Erro: ${error.message}`); setAuthMode('register'); } };
    const handleLoginSubmit = async (e) => { e.preventDefault(); if (!supabase) return; if (!email || !password) { alert("Preencha email/senha."); return; } setAuthMode('loading'); try { const { data, error } = await supabase.auth.signInWithPassword({ email: email, password: password }); if (error) throw error; alert("Login OK!"); clearAuthFields(); } catch (error) { if (error.message.includes("Invalid")) { alert("Email ou senha inválidos."); } else if (error.message.includes("confirmed")) { alert("Email não confirmado."); } else { alert(`Erro: ${error.message}`); } setAuthMode('login'); } };
    const handleGoogleAuth = async () => { if (!supabase) return; setAuthMode('loading'); try { const { error } = await supabase.auth.signInWithOAuth({ provider: 'google' }); if (error) throw error; } catch (error) { alert(`Erro Google: ${error.message}`); setAuthMode('login'); } };
    const handleLogout = async () => { if (!supabase) return; setAuthMode('loading'); await supabase.auth.signOut(); /* Listener cuida do resto */ };
    const switchToRegister = () => { clearAuthFields(); setAuthMode('register'); };
    const switchToLogin = () => { clearAuthFields(); setAuthMode('login'); };
    // --- Fim dos Handlers Auth do seu código ---

    return (
        <div className="flex flex-col min-h-screen bg-gradient-to-b from-gray-900 to-black text-gray-200 font-sans">
            <Head> <title>Setenta Vezes Sete</title> <link rel="icon" href="/favicon.ico" /> </Head>

            <header className="w-full p-3 bg-gray-800 bg-opacity-80 backdrop-blur-sm flex items-center justify-between sticky top-0 z-30 shadow-md">
                <div className="w-1/3"></div>
                <span className="w-1/3 text-center text-lg font-semibold text-red-500 opacity-90"> Setenta Vezes Sete </span>
                <div className="w-1/3 flex justify-end">
                    {/* Usando o handleLogout do seu código */}
                    {session && supabase && <UserMenu userEmail={session.user.email} onLogout={handleLogout} />}
                </div>
            </header>

            <main className="flex-grow flex flex-col items-center justify-start p-4 pt-4 md:pt-6 w-full">
                {loadingSession ? (
                    <div className="flex-grow flex items-center justify-center text-xl text-gray-400">Verificando sessão...</div>
                ) : (
                    <>
                        {/* Player Vertical (versão refatorada) */}
                        {supabase && API_KEY && <VerticalPlayerPair apiKey={API_KEY} playlistId1={PLAYLIST_ID_V1} playlistId2={PLAYLIST_ID_V2} />}

                        {!session ? (
                            // Auth Form (versão refatorada com SVG corrigido, usando SEUS handlers)
                            supabase && <AuthComponent
                                authMode={authMode} email={email} password={password} confirmPassword={confirmPassword}
                                onEmailChange={setEmail} onPasswordChange={setPassword} onConfirmPasswordChange={setConfirmPassword}
                                onLoginSubmit={handleLoginSubmit} onRegisterSubmit={handleRegisterSubmit} onGoogleAuth={handleGoogleAuth}
                                onSwitchToLogin={switchToLogin} onSwitchToRegister={switchToRegister} />
                        ) : (
                            <>
                                {/* Player Horizontal (versão refatorada com novo layout e loop corrigido) */}
                                {supabase && API_KEY && <HorizontalPlayerStack apiKey={API_KEY} playlistId1={PLAYLIST_ID_H1} playlistId2={PLAYLIST_ID_H2} />}
                                <FanPortalSection />
                            </>
                        )}
                    </>
                )}
            </main>

            <footer className="text-center p-4 mt-8 text-xs text-gray-600">
                © {new Date().getFullYear()} Setenta Vezes Sete.
            </footer>
        </div>
    );
}

// --- Sub-Componentes ---

// --- Menu do Usuário (Logado) ---
// (DO SEU CÓDIGO ORIGINAL - validado por você)
function UserMenu({ userEmail, onLogout }) {
    const [isOpen, setIsOpen] = useState(false);
    const menuRef = useRef(null);
    useEffect(() => {
        function handleClickOutside(event) { if (menuRef.current && !menuRef.current.contains(event.target)) { setIsOpen(false); } }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [menuRef]);

    // !! VERIFIQUE SE O PATH DO ÍCONE UserCircle ESTÁ CORRETO !!
    const IconUserCircle = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-gray-300"><path strokeLinecap="round" strokeLinejoin="round" d="M17.982 18.725A7.488 7.488 0 0012 15.75a7.488 7.488 0 00-5.982 2.975m11.963 0a9 9 0 10-11.963 0m11.963 0A8.966 8.966 0 0112 21a8.966 8.966 0 01-5.982-2.275M15 9.75a3 3 0 11-6 0 3 3 0 016 0z" /></svg>;

    return (
        <div className="relative" ref={menuRef}>
            <button onClick={() => setIsOpen(!isOpen)} className="p-2 rounded-full hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-white" aria-label="Menu do usuário">
                <IconUserCircle />
            </button>
            {isOpen && (
                <div className="absolute right-0 mt-2 w-60 origin-top-right rounded-md bg-gray-700 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none z-40 animate-fade-in py-1">
                    <div className="px-4 py-2 text-sm text-gray-300 border-b border-gray-600"><p className="font-medium text-white">Logado como:</p><p className="truncate">{userEmail}</p></div>
                    <div className="py-1">
                        {/* Seus botões de Preferência e Configurações */}
                        <button onClick={() => alert('Configuração de Tema (Não implementado)')} className="text-gray-200 hover:bg-gray-600 block w-full px-4 py-2 text-left text-sm">Preferência de Tema</button>
                        <button onClick={() => alert('Configurações (Não implementado)')} className="text-gray-200 hover:bg-gray-600 block w-full px-4 py-2 text-left text-sm">Configurações</button>
                    </div>
                    <div className="py-1 border-t border-gray-600">
                        {/* Seu botão de Logout */}
                        <button onClick={onLogout} className="text-red-400 hover:bg-red-600 hover:text-white block w-full px-4 py-2 text-left text-sm">Sair (Logout)</button>
                    </div>
                </div>
            )}
        </div>
    );
}


// --- Player Vertical Par ---
// (Vem da versão refatorada - com loop "ambos terminam" e SVGs placeholders)
function VerticalPlayerPair({ apiKey, playlistId1, playlistId2 }) {
    const player1Ref = useRef(null); const player2Ref = useRef(null);
    const [isPlaying, setIsPlaying] = useState(false); const [volume1, setVolume1] = useState(100); const [volume2, setVolume2] = useState(75); const [speed, setSpeed] = useState(1); const [currentTime, setCurrentTime] = useState(0); const [duration, setDuration] = useState(0); const [playlist1VideoIds, setPlaylist1VideoIds] = useState([]); const [playlist2VideoIds, setPlaylist2VideoIds] = useState([]); const [currentIndexP1, setCurrentIndexP1] = useState(0); const [currentIndexP2, setCurrentIndexP2] = useState(0); const [video1Id, setVideo1Id] = useState(''); const [video2Id, setVideo2Id] = useState(''); const intervalRef = useRef(null); const [isP1Ready, setIsP1Ready] = useState(false); const [isP2Ready, setIsP2Ready] = useState(false);
    const [p1Ended, setP1Ended] = useState(false); const [p2Ended, setP2Ended] = useState(false);

    useEffect(() => {
        if (apiKey && playlistId1 && playlistId2) {
            Promise.all([fetchPlaylistVideos(playlistId1, apiKey), fetchPlaylistVideos(playlistId2, apiKey)])
                .then(([v1, v2]) => { setPlaylist1VideoIds(v1 || []); setPlaylist2VideoIds(v2 || []); setVideo1Id((v1 || [])[0] || ''); setVideo2Id((v2 || [])[0] || ''); setP1Ended(false); setP2Ended(false); }).catch(e => console.error("Erro fetch V:", e));
        }
    }, [apiKey, playlistId1, playlistId2]);

    const playerOptions = { playerVars: { playsinline: 1, controls: 0, rel: 0, modestbranding: 1, fs: 0, iv_load_policy: 3 } };
    const stopTimelineUpdate = useCallback(() => { if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; } }, []);
    const startTimelineUpdate = useCallback(() => { stopTimelineUpdate(); intervalRef.current = setInterval(() => { try { if (isP1Ready && player1Ref.current?.getPlayerState && player1Ref.current.getPlayerState() === 1 && typeof player1Ref.current.getCurrentTime === 'function') { const time = player1Ref.current.getCurrentTime(); if (typeof time === 'number') setCurrentTime(time); if (duration <= 0 && typeof player1Ref.current.getDuration === 'function') { const d = player1Ref.current.getDuration(); if (d > 0) setDuration(d); } } } catch (e) { stopTimelineUpdate(); } }, 500); }, [isP1Ready, duration, stopTimelineUpdate]);
    const onPlayerReady = useCallback((event, playerRefSetter, initialVolume, playerNum, readySetter) => { const player = event.target; playerRefSetter(player); readySetter(true); try { player.setVolume(initialVolume); player.setPlaybackRate(speed); if (playerNum === 1 && typeof player.getDuration === 'function') { setTimeout(() => { try{ const d = player.getDuration(); if (d > 0) setDuration(d); } catch(e){} }, 500); } } catch (e) {} }, [speed]);
    const onPlayerStateChange = useCallback((event) => {
        const state = event.data; const currentPlayer = event.target; const isP1 = playerInstanceMatchesRef(currentPlayer, player1Ref);
        if (state === 0) { if (isP1) setP1Ended(true); else setP2Ended(true); } else if (state === 1 || state === 3) { if (isP1) setP1Ended(false); else setP2Ended(false); }
        switch (state) {
            case 0: if ((isP1 && p2Ended) || (!isP1 && p1Ended)) { console.log("Ambos V terminaram. Loop."); try { if (player1Ref.current?.seekTo) player1Ref.current.seekTo(0, true); if (player2Ref.current?.seekTo) player2Ref.current.seekTo(0, true); if (player1Ref.current?.playVideo) player1Ref.current.playVideo(); setTimeout(() => { if (player2Ref.current?.playVideo) player2Ref.current.playVideo(); }, 50); setIsPlaying(true); setP1Ended(false); setP2Ended(false); setCurrentTime(0); if (!intervalRef.current) startTimelineUpdate(); } catch (e) { console.error("Erro loop V:", e); } } break;
            case 1: if (!isPlaying) setIsPlaying(true); startTimelineUpdate(); if (isP1) setP1Ended(false); else setP2Ended(false); break;
            case 2: case 5: case -1: const otherRef = isP1 ? player2Ref : player1Ref; try { let otherState = -1; if (otherRef.current?.getPlayerState) otherState = otherRef.current.getPlayerState(); if (otherState !== 1 && otherState !== 3) { if(isPlaying) setIsPlaying(false); stopTimelineUpdate(); } } catch (e) { if(isPlaying) setIsPlaying(false); stopTimelineUpdate(); } if (isP1 && state === -1 && duration <= 0 && player1Ref.current?.getDuration) { setTimeout(() => { try { const d = player1Ref.current.getDuration(); if (d > 0) setDuration(d); } catch(e) {} }, 1000); } break;
            case 3: break; default: break;
        }
        if (isP1 && state !== 0 && state !== -1 && duration <= 0 && player1Ref.current?.getDuration) { try { const d = player1Ref.current.getDuration(); if (d > 0) setDuration(d); } catch(e) {} }
    }, [isPlaying, duration, p1Ended, p2Ended, player1Ref, player2Ref, startTimelineUpdate, stopTimelineUpdate]);
    const handlePlayPause = useCallback(() => { if (!isP1Ready || !isP2Ready || !player1Ref.current || !player2Ref.current) return; try { if (isPlaying) { if (player1Ref.current?.pauseVideo) player1Ref.current.pauseVideo(); if (player2Ref.current?.pauseVideo) player2Ref.current.pauseVideo(); } else { if (player1Ref.current?.playVideo) player1Ref.current.playVideo(); setTimeout(() => { if (player2Ref.current?.playVideo) player2Ref.current.playVideo(); }, 50); } } catch (e) {} }, [isP1Ready, isP2Ready, isPlaying, player1Ref, player2Ref]);
    const handleSeek = useCallback((e) => { if (!isP1Ready || !isP2Ready || !player1Ref.current || !player2Ref.current) return; const t = parseFloat(e.target.value); setCurrentTime(t); try { if (player1Ref.current?.seekTo) player1Ref.current.seekTo(t, true); if (player2Ref.current?.seekTo) player2Ref.current.seekTo(t, true); } catch (e) {} }, [isP1Ready, isP2Ready, player1Ref, player2Ref]);
    const handleSpeedChange = useCallback((e) => { if (!isP1Ready || !isP2Ready) return; const s = parseFloat(e.target.value); setSpeed(s); try { if (player1Ref.current?.setPlaybackRate) player1Ref.current.setPlaybackRate(s); if (player2Ref.current?.setPlaybackRate) player2Ref.current.setPlaybackRate(s); } catch (e) {} }, [isP1Ready, isP2Ready, player1Ref, player2Ref]);
    const handleVolumeChange = (event, playerRef, volumeSetter) => { const v = parseInt(event.target.value, 10); volumeSetter(v); if (playerRef.current?.setVolume) { try { playerRef.current.setVolume(v); } catch (e) {} } };
    const handleVolume1Change = (event) => handleVolumeChange(event, player1Ref, setVolume1);
    const handleVolume2Change = (event) => handleVolumeChange(event, player2Ref, setVolume2);
    const handleRemix = (videoId) => { if (!videoId) return; const url = `https://www.youtube.com/watch?v=6zucb1YHAR4{videoId}`; window.open(url, '_blank', 'noopener,noreferrer'); }; // !! VERIFIQUE ESTA URL !!
    const handleFullscreen = (playerRef) => { if (playerRef.current?.getIframe) { const i = playerRef.current.getIframe(); if (i?.requestFullscreen) { i.requestFullscreen().catch(e => {}); } } };
    const loadVideos = useCallback((indexP1, indexP2) => { const nextVideo1Id = playlist1VideoIds[indexP1] || ''; const nextVideo2Id = playlist2VideoIds[indexP2] || ''; stopTimelineUpdate(); setIsPlaying(false); setCurrentTime(0); setDuration(0); setIsP1Ready(false); setIsP2Ready(false); setP1Ended(false); setP2Ended(false); setVideo1Id(nextVideo1Id); setVideo2Id(nextVideo2Id); setCurrentIndexP1(indexP1); setCurrentIndexP2(indexP2); }, [playlist1VideoIds, playlist2VideoIds, stopTimelineUpdate]);
    const handleNextVideo = useCallback(() => { let n1 = currentIndexP1, n2 = currentIndexP2; if (playlist1VideoIds.length > 0) n1 = (currentIndexP1 + 1) % playlist1VideoIds.length; if (playlist2VideoIds.length > 0) n2 = (currentIndexP2 + 1) % playlist2VideoIds.length; if (n1 !== currentIndexP1 || n2 !== currentIndexP2) loadVideos(n1, n2); }, [currentIndexP1, currentIndexP2, playlist1VideoIds, playlist2VideoIds, loadVideos]);
    const handlePreviousVideo = useCallback(() => { let p1 = currentIndexP1, p2 = currentIndexP2; if (playlist1VideoIds.length > 0) p1 = (currentIndexP1 - 1 + playlist1VideoIds.length) % playlist1VideoIds.length; if (playlist2VideoIds.length > 0) p2 = (currentIndexP2 - 1 + playlist2VideoIds.length) % playlist2VideoIds.length; if (p1 !== currentIndexP1 || p2 !== currentIndexP2) loadVideos(p1, p2); }, [currentIndexP1, currentIndexP2, playlist1VideoIds, playlist2VideoIds, loadVideos]);
    useEffect(() => { return () => stopTimelineUpdate(); }, [stopTimelineUpdate]);

    // --- PLACEHOLDERS PARA ÍCONES --- !! SUBSTITUA OS PATHS !!
    const IconRemix = () => <svg className="w-4 h-4 inline-block mr-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M9.53 16.122a3 3 0 00-5.78 1.128 2.25 2.25 0 01-2.4 2.4 1.125 1.125 0 00-1.128 1.125 3 3 0 001.128 5.78m1.707-8.178a3 3 0 005.78-1.128 2.25 2.25 0 012.4-2.4 1.125 1.125 0 001.128-1.125 3 3 0 00-1.128-5.78m-1.707 8.178c.09.09.182.173.277.258m-4.418 4.418a1.123 1.123 0 01-1.588 0M14.25 6.75l-5.25 5.25m0 0l-5.25 5.25M14.25 6.75l5.25-5.25m-5.25 5.25l5.25 5.25" /></svg>;
    const IconFullscreen = () => <svg className="w-4 h-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15" /></svg>;
    const LoadingPlaceholder = () => <div className="absolute inset-0 flex items-center justify-center text-xs text-gray-500 p-2 bg-gray-800">Carregando...</div>;

    return ( <div className="w-full max-w-6xl mx-auto flex flex-col items-center mb-8"> <div className="w-full flex items-center px-1 md:px-2 mb-2"><input type="range" id="speed-v" min="0.25" max="2" step="0.25" value={speed} onChange={handleSpeedChange} className="w-full h-2 bg-gray-700 rounded-full appearance-none cursor-pointer accent-red-600"/><span className="text-xs text-gray-400 ml-2 w-8 text-right">{speed.toFixed(2)}x</span></div> <div className="relative flex w-full items-stretch justify-center space-x-1 md:space-x-2"> <div className="flex flex-col items-center h-72 md:h-96 lg:h-[500px] justify-center py-2 px-1 w-10"><input type="range" id="vol1-v" orient="vertical" min="0" max="100" value={volume1} onChange={handleVolume1Change} className="w-2 h-full appearance-none bg-gray-700 rounded-full slider-vertical accent-blue-600 cursor-pointer"/></div> <div className="relative bg-black aspect-[9/16] h-72 md:h-96 lg:h-[500px] max-w-[280px] md:max-w-[360px] border border-gray-700 rounded-lg overflow-hidden shadow-lg">{video1Id ? (<YouTube key={`v-p1-${video1Id}`} videoId={video1Id} opts={playerOptions} onReady={(e) => onPlayerReady(e, (r) => player1Ref.current=r, volume1, 1, setIsP1Ready)} onStateChange={onPlayerStateChange} className="absolute inset-0 w-full h-full" iframeClassName="absolute inset-0 w-full h-full"/>) : (<LoadingPlaceholder />)}<div className="absolute bottom-2 right-1 flex flex-col space-y-2 z-10"><button onClick={() => handleRemix(video1Id)} title="Remix" className="text-xs px-2 py-1 bg-gradient-to-tr from-purple-600 to-pink-500 text-white rounded hover:from-purple-700 hover:to-pink-600 transition-all flex items-center shadow-lg disabled:opacity-50 disabled:cursor-not-allowed" disabled={!video1Id}><IconRemix />Remix</button><button onClick={() => handleFullscreen(player1Ref)} title="Maximizar" className="text-xs p-1.5 bg-black bg-opacity-70 rounded hover:bg-opacity-90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed" disabled={!video1Id}><IconFullscreen /></button></div></div> <div className="relative bg-black aspect-[9/16] h-72 md:h-96 lg:h-[500px] max-w-[280px] md:max-w-[360px] border border-gray-700 rounded-lg overflow-hidden shadow-lg">{video2Id ? (<YouTube key={`v-p2-${video2Id}`} videoId={video2Id} opts={playerOptions} onReady={(e) => onPlayerReady(e, (r) => player2Ref.current=r, volume2, 2, setIsP2Ready)} onStateChange={onPlayerStateChange} className="absolute inset-0 w-full h-full" iframeClassName="absolute inset-0 w-full h-full"/>) : (<LoadingPlaceholder />)}<div className="absolute bottom-2 right-1 flex flex-col space-y-2 z-10"><button onClick={() => handleRemix(video2Id)} title="Remix" className="text-xs px-2 py-1 bg-gradient-to-tr from-purple-600 to-pink-500 text-white rounded hover:from-purple-700 hover:to-pink-600 transition-all flex items-center shadow-lg disabled:opacity-50 disabled:cursor-not-allowed" disabled={!video2Id}><IconRemix />Remix</button><button onClick={() => handleFullscreen(player2Ref)} title="Maximizar" className="text-xs p-1.5 bg-black bg-opacity-70 rounded hover:bg-opacity-90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed" disabled={!video2Id}><IconFullscreen /></button></div></div> <div className="flex flex-col items-center h-72 md:h-96 lg:h-[500px] justify-center py-2 px-1 w-10"><input type="range" id="vol2-v" orient="vertical" min="0" max="100" value={volume2} onChange={handleVolume2Change} className="w-2 h-full appearance-none bg-gray-700 rounded-full slider-vertical accent-blue-600 cursor-pointer"/></div> <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 flex flex-col items-center space-y-3 p-2 bg-black bg-opacity-30 rounded-full"><button onClick={handlePreviousVideo} title="Anterior" className="p-1.5 bg-gray-600 rounded-full text-white hover:bg-gray-500 text-base disabled:opacity-50 transition-all" disabled={(playlist1VideoIds.length < 2 && playlist2VideoIds.length < 2) || (!video1Id && !video2Id)}>▲</button><button onClick={handlePlayPause} className="p-2.5 md:p-3 bg-red-600 rounded-full text-white hover:bg-red-700 text-lg md:text-xl focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-offset-2 focus:ring-offset-black disabled:opacity-50 transition-all scale-105 hover:scale-110" title={isPlaying ? "Pausar" : "Play"} disabled={!video1Id && !video2Id}> {isPlaying ? '❚❚' : '►'} </button><button onClick={handleNextVideo} title="Próximo" className="p-1.5 bg-gray-600 rounded-full text-white hover:bg-gray-500 text-base disabled:opacity-50 transition-all" disabled={(playlist1VideoIds.length < 2 && playlist2VideoIds.length < 2) || (!video1Id && !video2Id)}>▼</button></div> </div> <div className="w-full flex items-center px-1 md:px-2 mt-2"><span className="text-xs text-gray-400 mr-2 w-10 text-center">{formatTime(currentTime)}</span><input type="range" min="0" max={duration || 1} value={currentTime} step="0.1" onChange={handleSeek} className="w-full h-2 bg-gray-700 rounded-full appearance-none cursor-pointer accent-red-600 disabled:opacity-50 disabled:cursor-not-allowed" disabled={!video1Id && !video2Id}/><span className="text-xs text-gray-400 ml-2 w-10 text-center">{formatTime(duration)}</span></div> </div> );
}


// --- Player Horizontal Stack (Logado) ---
// (Vem da versão refatorada - com novo layout e loop "ambos terminam")
function HorizontalPlayerStack({ apiKey, playlistId1, playlistId2 }) {
    const playerH1Ref = useRef(null); const playerH2Ref = useRef(null);
    const [videoH1Id, setVideoH1Id] = useState(''); const [videoH2Id, setVideoH2Id] = useState('');
    const [playlistH1Ids, setPlaylistH1Ids] = useState([]); const [playlistH2Ids, setPlaylistH2Ids] = useState([]);
    const [currentIndexH1, setCurrentIndexH1] = useState(0); const [currentIndexH2, setCurrentIndexH2] = useState(0);
    const [isPlayingH, setIsPlayingH] = useState(false); const [speedH, setSpeedH] = useState(1);
    const [currentTimeH, setCurrentTimeH] = useState(0); const [durationH, setDurationH] = useState(0);
    const [volumeH1, setVolumeH1] = useState(100); const [volumeH2, setVolumeH2] = useState(100);
    const [isH1Ready, setIsH1Ready] = useState(false); const [isH2Ready, setIsH2Ready] = useState(false);
    const intervalHRef = useRef(null);
    const [pH1Ended, setPH1Ended] = useState(false); const [pH2Ended, setPH2Ended] = useState(false);

    useEffect(() => {
        if (apiKey && playlistId1 && playlistId2) {
            Promise.all([fetchPlaylistVideos(playlistId1, apiKey), fetchPlaylistVideos(playlistId2, apiKey)])
                .then(([v1, v2]) => { setPlaylistH1Ids(v1 || []); setPlaylistH2Ids(v2 || []); setVideoH1Id((v1 || [])[0] || ''); setVideoH2Id((v2 || [])[0] || ''); setPH1Ended(false); setPH2Ended(false); }).catch(e => console.error("Erro fetch H:", e));
        }
    }, [apiKey, playlistId1, playlistId2]);

    const playerOptionsH = { playerVars: { playsinline: 1, controls: 0, rel: 0, modestbranding: 1, fs: 0, iv_load_policy: 3 } };
    const stopTimelineUpdateH = useCallback(() => { if (intervalHRef.current) { clearInterval(intervalHRef.current); intervalHRef.current = null; } }, []);
    const startTimelineUpdateH = useCallback(() => { stopTimelineUpdateH(); intervalHRef.current = setInterval(() => { try { if (isH1Ready && playerH1Ref.current?.getPlayerState && playerH1Ref.current.getPlayerState() === 1 && typeof playerH1Ref.current.getCurrentTime === 'function') { const time = playerH1Ref.current.getCurrentTime(); if (typeof time === 'number') setCurrentTimeH(time); if (durationH <= 0 && typeof playerH1Ref.current.getDuration === 'function') { const d = playerH1Ref.current.getDuration(); if (d > 0) setDurationH(d); } } } catch (e) { stopTimelineUpdateH(); } }, 500); }, [isH1Ready, durationH, stopTimelineUpdateH]);
    const onPlayerReadyH = useCallback((event, playerRefSetter, initialVolume, playerNum, readySetter) => { const player = event.target; playerRefSetter(player); readySetter(true); try { player.setVolume(initialVolume); player.setPlaybackRate(speedH); if (playerNum === 1 && typeof player.getDuration === 'function') { setTimeout(() => { try{ const d = player.getDuration(); if (d > 0) setDurationH(d); } catch(e){} }, 500); } } catch (e) {} }, [speedH]);
    const onPlayerStateChangeH = useCallback((event) => {
        const state = event.data; const currentPlayer = event.target; const isH1 = playerInstanceMatchesRef(currentPlayer, playerH1Ref);
        if (state === 0) { if (isH1) setPH1Ended(true); else setPH2Ended(true); } else if (state === 1 || state === 3) { if (isH1) setPH1Ended(false); else setPH2Ended(false); }
        switch (state) {
            case 0: if ((isH1 && pH2Ended) || (!isH1 && pH1Ended)) { console.log("Ambos H terminaram. Loop."); try { if (playerH1Ref.current?.seekTo) playerH1Ref.current.seekTo(0, true); if (playerH2Ref.current?.seekTo) playerH2Ref.current.seekTo(0, true); if (playerH1Ref.current?.playVideo) playerH1Ref.current.playVideo(); setTimeout(() => { if (playerH2Ref.current?.playVideo) playerH2Ref.current.playVideo(); }, 50); setIsPlayingH(true); setPH1Ended(false); setPH2Ended(false); setCurrentTimeH(0); if (!intervalHRef.current) startTimelineUpdateH(); } catch (e) { console.error("Erro loop H:", e); } } break;
            case 1: if (!isPlayingH) setIsPlayingH(true); startTimelineUpdateH(); if (isH1) setPH1Ended(false); else setPH2Ended(false); break;
            case 2: case 5: case -1: const otherRefH = isH1 ? playerH2Ref : playerH1Ref; try { let otherStateH = -1; if (otherRefH.current?.getPlayerState) otherStateH = otherRefH.current.getPlayerState(); if (otherStateH !== 1 && otherStateH !== 3) { if(isPlayingH) setIsPlayingH(false); stopTimelineUpdateH(); } } catch (e) { if(isPlayingH) setIsPlayingH(false); stopTimelineUpdateH(); } if (isH1 && state === -1 && durationH <= 0 && playerH1Ref.current?.getDuration) { setTimeout(() => { try { const d = playerH1Ref.current.getDuration(); if (d > 0) setDurationH(d); } catch(e) {} }, 1000); } break;
            case 3: break; default: break;
        }
        if (isH1 && state !== 0 && state !== -1 && durationH <= 0 && playerH1Ref.current?.getDuration) { try { const d = playerH1Ref.current.getDuration(); if (d > 0) setDurationH(d); } catch(e) {} }
    }, [isPlayingH, durationH, pH1Ended, pH2Ended, playerH1Ref, playerH2Ref, startTimelineUpdateH, stopTimelineUpdateH]);
    const handlePlayPauseH = useCallback(() => { if (!isH1Ready || !isH2Ready || !playerH1Ref.current || !playerH2Ref.current) return; try { if (isPlayingH) { if (playerH1Ref.current?.pauseVideo) playerH1Ref.current.pauseVideo(); if (playerH2Ref.current?.pauseVideo) playerH2Ref.current.pauseVideo(); } else { if (playerH1Ref.current?.playVideo) playerH1Ref.current.playVideo(); setTimeout(() => { if (playerH2Ref.current?.playVideo) playerH2Ref.current.playVideo(); }, 50); } } catch (e) {} }, [isH1Ready, isH2Ready, isPlayingH, playerH1Ref, playerH2Ref]);
    const handleSeekH = useCallback((e) => { if (!isH1Ready || !isH2Ready || !playerH1Ref.current || !playerH2Ref.current) return; const t = parseFloat(e.target.value); setCurrentTimeH(t); try { if (playerH1Ref.current?.seekTo) playerH1Ref.current.seekTo(t, true); if (playerH2Ref.current?.seekTo) playerH2Ref.current.seekTo(t, true); } catch (e) {} }, [isH1Ready, isH2Ready, playerH1Ref, playerH2Ref]);
    const handleSpeedChangeH = useCallback((e) => { if (!isH1Ready || !isH2Ready) return; const s = parseFloat(e.target.value); setSpeedH(s); try { if (playerH1Ref.current?.setPlaybackRate) playerH1Ref.current.setPlaybackRate(s); if (playerH2Ref.current?.setPlaybackRate) playerH2Ref.current.setPlaybackRate(s); } catch (e) {} }, [isH1Ready, isH2Ready, playerH1Ref, playerH2Ref]);
    const handleVolumeChangeH = (event, playerRef, volumeSetter) => { const v = parseInt(event.target.value, 10); volumeSetter(v); if (playerRef.current?.setVolume) { try { playerRef.current.setVolume(v); } catch (e) {} } };
    const handleVolumeH1Change = (event) => handleVolumeChangeH(event, playerH1Ref, setVolumeH1);
    const handleVolumeH2Change = (event) => handleVolumeChangeH(event, playerH2Ref, setVolumeH2);
    const handleFullscreenH = (playerRef) => { if (playerRef.current?.getIframe) { const i = playerRef.current.getIframe(); if (i?.requestFullscreen) { i.requestFullscreen().catch(e => {}); } } };
    const loadVideosH = useCallback((indexH1, indexH2) => { const nextVideoH1Id = playlistH1Ids[indexH1] || ''; const nextVideoH2Id = playlistH2Ids[indexH2] || ''; stopTimelineUpdateH(); setIsPlayingH(false); setCurrentTimeH(0); setDurationH(0); setIsH1Ready(false); setIsH2Ready(false); setPH1Ended(false); setPH2Ended(false); setVideoH1Id(nextVideoH1Id); setVideoH2Id(nextVideoH2Id); setCurrentIndexH1(indexH1); setCurrentIndexH2(indexH2); }, [playlistH1Ids, playlistH2Ids, stopTimelineUpdateH]);
    const handleNextVideoH = useCallback(() => { let n1 = currentIndexH1, n2 = currentIndexH2; if (playlistH1Ids.length > 0) n1 = (currentIndexH1 + 1) % playlistH1Ids.length; if (playlistH2Ids.length > 0) n2 = (currentIndexH2 + 1) % playlistH2Ids.length; if (n1 !== currentIndexH1 || n2 !== currentIndexH2) loadVideosH(n1, n2); }, [currentIndexH1, currentIndexH2, playlistH1Ids, playlistH2Ids, loadVideosH]);
    const handlePreviousVideoH = useCallback(() => { let p1 = currentIndexH1, p2 = currentIndexH2; if (playlistH1Ids.length > 0) p1 = (currentIndexH1 - 1 + playlistH1Ids.length) % playlistH1Ids.length; if (playlistH2Ids.length > 0) p2 = (currentIndexH2 - 1 + playlistH2Ids.length) % playlistH2Ids.length; if (p1 !== currentIndexH1 || p2 !== currentIndexH2) loadVideosH(p1, p2); }, [currentIndexH1, currentIndexH2, playlistH1Ids, playlistH2Ids, loadVideosH]);
    useEffect(() => { return () => stopTimelineUpdateH(); }, [stopTimelineUpdateH]);

    // --- PLACEHOLDERS PARA ÍCONES --- !! SUBSTITUA OS PATHS !!
    const IconFullscreenH = () => <svg className="w-4 h-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15" /></svg>;
    const IconPrevH = () => <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z" clipRule="evenodd" /></svg>;
    const IconNextH = () => <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" /></svg>;
    const LoadingPlaceholder = () => <div className="absolute inset-0 flex items-center justify-center text-xs text-gray-500 p-2 bg-gray-800">Carregando...</div>;

    return ( <div className="w-full max-w-5xl mx-auto flex flex-col items-center my-8"> <div className="w-full flex items-center px-1 md:px-2 mb-4 max-w-xl"> <input type="range" id="speed-h" min="0.25" max="2" step="0.25" value={speedH} onChange={handleSpeedChangeH} className="w-full h-2 bg-gray-700 rounded-full appearance-none cursor-pointer accent-red-600"/> <span className="text-xs text-gray-400 ml-2 w-8 text-right">{speedH.toFixed(2)}x</span> </div> <div className="relative flex w-full items-stretch justify-center space-x-2"> <div className="flex flex-col items-center justify-center py-2 px-1 w-10"><input type="range" id="volH1" orient="vertical" min="0" max="100" value={volumeH1} onChange={handleVolumeH1Change} className="w-2 h-40 md:h-56 appearance-none bg-gray-700 rounded-full slider-vertical accent-blue-600 cursor-pointer"/></div> <div className="flex-grow flex flex-col items-center space-y-2 relative max-w-xl"> <div className="w-full relative aspect-video bg-black rounded-lg shadow-lg overflow-hidden border border-gray-700">{videoH1Id ? (<YouTube key={`h-p1-${videoH1Id}`} videoId={videoH1Id} opts={playerOptionsH} onReady={(e)=>onPlayerReadyH(e, r=>playerH1Ref.current=r, volumeH1, 1, setIsH1Ready)} onStateChange={onPlayerStateChangeH} className="absolute inset-0 w-full h-full" iframeClassName="absolute inset-0 w-full h-full"/>) : (<LoadingPlaceholder />)}<div className="absolute top-1 right-1 z-10"><button onClick={() => handleFullscreenH(playerH1Ref)} title="Maximizar" className="text-xs p-1.5 bg-black bg-opacity-70 rounded hover:bg-opacity-90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed" disabled={!videoH1Id}><IconFullscreenH /></button></div></div> <div className="w-full relative aspect-video bg-black rounded-lg shadow-lg overflow-hidden border border-gray-700">{videoH2Id ? (<YouTube key={`h-p2-${videoH2Id}`} videoId={videoH2Id} opts={playerOptionsH} onReady={(e)=>onPlayerReadyH(e, r=>playerH2Ref.current=r, volumeH2, 2, setIsH2Ready)} onStateChange={onPlayerStateChangeH} className="absolute inset-0 w-full h-full" iframeClassName="absolute inset-0 w-full h-full"/>) : (<LoadingPlaceholder />)}<div className="absolute top-1 right-1 z-10"><button onClick={() => handleFullscreenH(playerH2Ref)} title="Maximizar" className="text-xs p-1.5 bg-black bg-opacity-70 rounded hover:bg-opacity-90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed" disabled={!videoH2Id}><IconFullscreenH /></button></div></div> <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 flex items-center space-x-4 p-2 bg-black bg-opacity-30 rounded-full"><button onClick={handlePreviousVideoH} title="Anterior" className="p-2 bg-gray-700 rounded-full text-white hover:bg-gray-600 disabled:opacity-50" disabled={(playlistH1Ids.length < 2 && playlistH2Ids.length < 2) || (!videoH1Id && !videoH2Id)}><IconPrevH /></button><button onClick={handlePlayPauseH} title={isPlayingH ? "Pausar" : "Play"} className="p-3 bg-red-600 rounded-full text-white hover:bg-red-700 disabled:opacity-50 text-xl" disabled={!videoH1Id && !videoH2Id}> {isPlayingH ? '❚❚' : '►'} </button><button onClick={handleNextVideoH} title="Próximo" className="p-2 bg-gray-700 rounded-full text-white hover:bg-gray-600 disabled:opacity-50" disabled={(playlistH1Ids.length < 2 && playlistH2Ids.length < 2) || (!videoH1Id && !videoH2Id)}><IconNextH /></button></div> </div> <div className="flex flex-col items-center justify-center py-2 px-1 w-10"><input type="range" id="volH2" orient="vertical" min="0" max="100" value={volumeH2} onChange={handleVolumeH2Change} className="w-2 h-40 md:h-56 appearance-none bg-gray-700 rounded-full slider-vertical accent-blue-600 cursor-pointer"/></div> </div> <div className="w-full flex items-center px-1 md:px-2 mt-4 max-w-xl"> <span className="text-xs text-gray-400 mr-2 w-10 text-center">{formatTime(currentTimeH)}</span> <input type="range" min="0" max={durationH || 1} value={currentTimeH} step="0.1" onChange={handleSeekH} className="w-full h-2 bg-gray-700 rounded-full appearance-none cursor-pointer accent-red-600 disabled:opacity-50 disabled:cursor-not-allowed" disabled={!videoH1Id && !videoH2Id}/> <span className="text-xs text-gray-400 ml-2 w-10 text-center">{formatTime(durationH)}</span> </div> </div> );
}


// --- Seção Portal Fãs ---
function FanPortalSection() { /* ... (sem alterações) ... */ return ( <div className="w-full max-w-4xl mx-auto mt-10 p-6 bg-gray-800 rounded-lg shadow-xl border border-gray-700"> <h2 className="text-2xl font-bold text-center text-yellow-400 mb-6">Portal de Fãs Setenta Vezes Sete</h2> <p className="text-center text-gray-300 mb-8">Desbloqueie níveis de acesso, conteúdo exclusivo e aprofunde seus estudos!</p> <div className="grid grid-cols-1 md:grid-cols-3 gap-6"> <div className="border border-gray-600 rounded-lg p-4 bg-gray-700 bg-opacity-50"><h3 className="font-semibold text-lg text-white mb-2">Nível Discípulo</h3><p className="text-sm text-gray-300 mb-3">(Acesso atual)</p><ul className="list-disc list-inside text-sm text-gray-300 space-y-1"><li>Players Verticais (Shorts)</li><li>Players Horizontais (Destaques)</li></ul></div> <div className="border border-purple-500 rounded-lg p-4 bg-gray-700 relative"><span className="absolute top-0 right-0 bg-purple-600 text-white text-xs font-bold px-2 py-0.5 rounded-bl-lg">Popular</span><h3 className="font-semibold text-lg text-purple-400 mb-2">Nível Apóstolo</h3><p className="text-lg font-bold text-white mb-3">R$ 7,00<span className="text-sm font-normal text-gray-400"> / mês</span></p><p className="text-sm text-gray-300 mb-3">Tudo do Discípulo + Conteúdo Exclusivo:</p><ul className="list-disc list-inside text-sm text-gray-300 space-y-1 mb-4"><li>**+5 Pares de Players Verticais Adicionais**</li><li>Playlists Temáticas Exclusivas</li><li>Ideal para Imersão Total</li></ul><button className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded transition-colors" onClick={() => alert('Pagamento não implementado')}> Assinar Nível Apóstolo </button></div> <div className="border border-yellow-500 rounded-lg p-4 bg-gray-700"><h3 className="font-semibold text-lg text-yellow-400 mb-2">Nível Patriarca</h3><p className="text-lg font-bold text-white mb-3">R$ 77,00<span className="text-sm font-normal text-gray-400"> / ano</span></p> <p className="text-sm text-gray-300 mb-3">Tudo do Apóstolo + Benefícios VIP:</p><ul className="list-disc list-inside text-sm text-gray-300 space-y-1 mb-4"><li>**+1 Player Horizontal Adicional** (Estudos/Notícias)</li><li>**Acesso Gratuito ao App Mobile** (Em breve!)</li><li>Melhor Valor Anual</li></ul> <button className="w-full bg-yellow-600 hover:bg-yellow-700 text-white font-bold py-2 px-4 rounded transition-colors" onClick={() => alert('Pagamento não implementado')}> Assinar Nível Patriarca </button></div> </div> </div> ); }

// --- Componente Auth Form ---
// (Vem da versão refatorada - com SVG Google corrigido)
function AuthComponent({ authMode, email, password, confirmPassword, onEmailChange, onPasswordChange, onConfirmPasswordChange, onLoginSubmit, onRegisterSubmit, onGoogleAuth, onSwitchToLogin, onSwitchToRegister }) {
     const googleLogoSvg = ( <svg className="w-5 h-5" version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" xmlnsXlink="http://www.w3.org/1999/xlink" style={{ display: 'block' }}> <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l-2.83 2.83c-1.18-1.12-2.8-1.8-4.67-1.8-3.55 0-6.58 2.3-7.68 5.44H6.08c1.14-4.5 5.04-7.94 9.92-7.94zm0 29c-3.54 0-6.71-1.22-9.21-3.6l2.83-2.83c1.18 1.12 2.8 1.8 4.67 1.8 3.55 0 6.58-2.3 7.68-5.44h6.7c-1.14 4.5-5.04 7.94-9.92 7.94z"></path> <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.42-4.55H24v8.51h12.8c-.58 2.78-2.34 4.96-4.77 6.54l3.32 3.32C41.05 34.57 45.12 30.09 46.98 24.55z"></path> <path fill="#FBBC05" d="M10.53 28.59l-3.32-3.32A14.91 14.91 0 016.08 20H16.32c-1.1 3.14-4.13 5.44-7.68 5.44z"></path> <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-3.32-3.32c-2.15 1.44-4.92 2.3-8.07 2.3-3.55 0-6.58-2.3-7.68-5.44H6.08c1.14 4.5 5.04 7.94 9.92 7.94A14.9 14.9 0 0024 48z"></path> <path fill="none" d="M0 0h48v48H0z"></path> </svg> );
     return ( <div className="w-full max-w-md p-6 md:p-8 mt-8 bg-gray-800 bg-opacity-70 rounded-xl shadow-2xl border border-gray-700"> {authMode === 'loading' && (<div className="text-center p-4"><p className="text-white">Processando...</p></div>)} {authMode === 'login' && ( <form onSubmit={onLoginSubmit} className="space-y-5 animate-fade-in"> <h2 className="text-2xl font-semibold text-center text-white mb-6">Entrar</h2> <div><label htmlFor="login-email" className="block text-sm font-medium text-gray-300 mb-1">Email</label><input type="email" id="login-email" value={email} onChange={(e) => onEmailChange(e.target.value)} required autoComplete='email' placeholder="seuemail@exemplo.com" className="w-full p-3 rounded-md bg-gray-700 text-white border border-gray-600 placeholder-gray-500 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition"/></div> <div><label htmlFor="login-password" className="block text-sm font-medium text-gray-300 mb-1">Senha</label><input type="password" id="login-password" value={password} onChange={(e) => onPasswordChange(e.target.value)} required autoComplete='current-password' placeholder="********" className="w-full p-3 rounded-md bg-gray-700 text-white border border-gray-600 placeholder-gray-500 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition"/> </div> <button type="submit" className="w-full py-2.5 px-4 bg-red-600 rounded-md text-white font-semibold hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-offset-2 focus:ring-offset-gray-800 transition duration-150 ease-in-out shadow-md"> Entrar </button> <button type="button" onClick={onGoogleAuth} className="w-full py-2.5 px-4 bg-white border border-gray-300 rounded-md text-gray-700 font-medium hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 focus:ring-offset-gray-800 transition duration-150 ease-in-out flex items-center justify-center space-x-2 shadow-sm"> {googleLogoSvg} <span>Entrar com Google</span> </button> <div className="text-center mt-4"><span className="text-sm text-gray-400">Não tem conta? </span><button type="button" onClick={onSwitchToRegister} className="text-sm font-medium text-blue-400 hover:text-blue-300 transition"> Cadastre-se </button></div> </form> )} {authMode === 'register' && ( <form onSubmit={onRegisterSubmit} className="space-y-5 animate-fade-in"> <h2 className="text-2xl font-semibold text-center text-white mb-6">Criar Conta</h2> <div><label htmlFor="register-email" className="block text-sm font-medium text-gray-300 mb-1">Email</label><input type="email" id="register-email" value={email} onChange={(e) => onEmailChange(e.target.value)} required autoComplete='email' placeholder="seuemail@exemplo.com" className="w-full p-3 rounded-md bg-gray-700 text-white border border-gray-600 placeholder-gray-500 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition"/></div> <div><label htmlFor="register-password" className="block text-sm font-medium text-gray-300 mb-1">Senha</label><input type="password" id="register-password" value={password} onChange={(e) => onPasswordChange(e.target.value)} required autoComplete='new-password' placeholder="Crie uma senha" className="w-full p-3 rounded-md bg-gray-700 text-white border border-gray-600 placeholder-gray-500 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition"/></div> <div><label htmlFor="confirm-password" className="block text-sm font-medium text-gray-300 mb-1">Confirmar Senha</label><input type="password" id="confirm-password" value={confirmPassword} onChange={(e) => onConfirmPasswordChange(e.target.value)} required autoComplete='new-password' placeholder="Repita a senha" className="w-full p-3 rounded-md bg-gray-700 text-white border border-gray-600 placeholder-gray-500 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition"/></div> <button type="submit" className="w-full py-2.5 px-4 bg-red-600 rounded-md text-white font-semibold hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-offset-2 focus:ring-offset-gray-800 transition duration-150 ease-in-out shadow-md"> Cadastrar com Email </button> <button type="button" onClick={onGoogleAuth} className="w-full py-2.5 px-4 bg-white border border-gray-300 rounded-md text-gray-700 font-medium hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 focus:ring-offset-gray-800 transition duration-150 ease-in-out flex items-center justify-center space-x-2 shadow-sm"> {googleLogoSvg} <span>Cadastrar com Google</span> </button> <div className="text-center mt-4"><span className="text-sm text-gray-400">Já tem conta? </span><button type="button" onClick={onSwitchToLogin} className="text-sm font-medium text-blue-400 hover:text-blue-300 transition"> Faça Login </button></div> </form> )} </div> );
}
