import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import YouTube from 'react-youtube';

// --- Constants & Configuration ---
// TODO: Add your YouTube Data API Key here. Keep it secure!
const API_KEY = process.env.NEXT_PUBLIC_YOUTUBE_API_KEY || 'YOUR_YOUTUBE_API_KEY'; // Fallback

// --- Playlist Definitions ---
// Structure: { name: string, p1: string, p2: string, type: 'vertical' | 'horizontal' }
const LOGGED_OUT_PLAYLISTS = [
    { name: "Dupla Vertical 1", p1: 'PL7inlxn_ITUc7ONd-6OvjjbpoJKgqzjgX', p2: 'PLuM5GSpnFsFjDMdpuOn7D68sWTHLJ9LFc', type: 'vertical' },
    { name: "Dupla Vertical 2", p1: 'PLuM5GSpnFsFjDMdpuOn7D68sWTHLJ9LFc', p2: 'PL7inlxn_ITUc7ONd-6OvjjbpoJKgqzjgX', type: 'vertical' },
];
const LOGGED_IN_BASE_PLAYLISTS = [
    { name: "Dupla Horizontal 1", p1: 'PL7inlxn_ITUdZ63Y19rneR_vKnIg09zHG', p2: 'PLuM5GSpnFsFj_3RCnTS_bNv5H2GHpNdu9', type: 'horizontal' },
    { name: "Dupla Vertical 1", p1: 'PL7inlxn_ITUc7ONd-6OvjjbpoJKgqzjgX', p2: 'PLuM5GSpnFsFjDMdpuOn7D68sWTHLJ9LFc', type: 'vertical' },
    { name: "Dupla Vertical 3", p1: 'YOUR_LOGGED_IN_V3_P1_ID', p2: 'YOUR_LOGGED_IN_V3_P2_ID', type: 'vertical' }, // Placeholder
];
const FAN_EXTRA_PLAYLISTS = [
    { name: "Dupla Fã 1", p1: 'YOUR_FAN_V1_P1_ID', p2: 'YOUR_FAN_V1_P2_ID', type: 'vertical' },
    { name: "Dupla Fã 2", p1: 'YOUR_FAN_V2_P1_ID', p2: 'YOUR_FAN_V2_P2_ID', type: 'horizontal' },
    { name: "Dupla Fã 3", p1: 'YOUR_FAN_V3_P1_ID', p2: 'YOUR_FAN_V3_P2_ID', type: 'vertical' },
    { name: "Dupla Fã 4", p1: 'YOUR_FAN_V4_P1_ID', p2: 'YOUR_FAN_V4_P2_ID', type: 'vertical' },
    { name: "Dupla Fã 5", p1: 'YOUR_FAN_V5_P1_ID', p2: 'YOUR_FAN_V5_P2_ID', type: 'vertical' },
];

// --- Helper Functions ---
async function fetchPlaylistVideos(playlistId, apiKey) { /* ... (no changes) ... */
    if (!playlistId || playlistId.includes('YOUR_') || playlistId.length < 10) { console.warn(`fetchPlaylistVideos: Skipping invalid/placeholder ID '${playlistId}'.`); return []; }
    if (!apiKey || apiKey === 'YOUR_YOUTUBE_API_KEY') { console.warn("fetchPlaylistVideos: YouTube API Key missing/placeholder."); return []; }
    const URL = `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&playlistId=${playlistId}&maxResults=50&key=${apiKey}`;
    try {
        const response = await fetch(URL); const data = await response.json();
        if (!response.ok || data.error) { console.error(`YouTube API Error (${playlistId}):`, data.error || `Status ${response.status}`); return []; }
        const videoIds = data.items?.map(item => item.snippet?.resourceId?.videoId).filter(Boolean) || [];
        console.log(`Videos found for ${playlistId}: ${videoIds.length}`); return videoIds;
    } catch (error) { console.error(`Failed to fetch playlist ${playlistId}:`, error); return []; }
}
function formatTime(seconds) { /* ... (no changes) ... */ const safeSeconds = Number(seconds) || 0; if (safeSeconds < 0) return '0:00'; const minutes = Math.floor(safeSeconds / 60); const secs = Math.floor(safeSeconds % 60); return `${minutes}:${secs < 10 ? '0' : ''}${secs}`; }

// --- SVG Icons ---
const PlayIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 16 16" width="24" height="24"><path d="m11.596 8.697-6.363 3.692c-.54.313-1.233-.066-1.233-.697V4.308c0-.63.692-1.01 1.233-.696l6.363 3.692a.802.802 0 0 1 0 1.393z"/></svg>;
const PauseIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 16 16" width="24" height="24"><path d="M5.5 3.5A1.5 1.5 0 0 1 7 5v6a1.5 1.5 0 0 1-3 0V5a1.5 1.5 0 0 1 1.5-1.5zm5 0A1.5 1.5 0 0 1 12 5v6a1.5 1.5 0 0 1-3 0V5a1.5 1.5 0 0 1 1.5-1.5z"/></svg>;
const NextIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 16 16" width="20" height="20"><path d="M4 4a.5.5 0 0 0-.5.5v7a.5.5 0 0 0 .5.5h7a.5.5 0 0 0 .5-.5v-7a.5.5 0 0 0-.5-.5h-7zM6 4.5a.5.5 0 0 1 .5-.5h3a.5.5 0 0 1 .5.5v7a.5.5 0 0 1-.5.5h-3a.5.5 0 0 1-.5-.5v-7z"/><path d="M11.5 4a.5.5 0 0 1 .5.5v7a.5.5 0 0 1-1 0v-7a.5.5 0 0 1 .5-.5z"/></svg>;
const PrevIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 16 16" width="20" height="20"><path d="M12 4a.5.5 0 0 1 .5.5v7a.5.5 0 0 1-.5.5h-7a.5.5 0 0 1-.5-.5v-7a.5.5 0 0 1 .5-.5h7zM10 4.5a.5.5 0 0 0-.5-.5h-3a.5.5 0 0 0-.5.5v7a.5.5 0 0 0 .5.5h3a.5.5 0 0 0 .5-.5v-7z"/><path d="M4.5 4a.5.5 0 0 0-.5.5v7a.5.5 0 0 0 1 0v-7a.5.5 0 0 0-.5-.5z"/></svg>;
const MaximizeIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 16 16" width="16" height="16"><path fillRule="evenodd" d="M5.828 10.172a.5.5 0 0 0-.707 0l-4 4a.5.5 0 0 0 .707.708L10.172 6.5l-4-4a.5.5 0 0 0-.708 0l-4 4a.5.5 0 1 0 .708.708L5.828 3.828l4 4a.5.5 0 0 0 0 .708l-4 4z"/><path fillRule="evenodd" d="M.146 1.146A.5.5 0 0 1 .5 1h4a.5.5 0 0 1 0 1H1v3.5a.5.5 0 0 1-1 0v-4zm14 0a.5.5 0 0 1 .5.5v4a.5.5 0 0 1-1 0V1.5H11a.5.5 0 0 1 0-1h4.5zM.5 15a.5.5 0 0 1-.5-.5v-4a.5.5 0 0 1 1 0v3.5h3.5a.5.5 0 0 1 0 1h-4zm14.5 0a.5.5 0 0 1-.5.5h-4a.5.5 0 0 1 0-1H15v-3.5a.5.5 0 0 1 1 0v4z"/></svg>;
const UserIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 16 16" width="24" height="24"><path d="M11 6a3 3 0 1 1-6 0 3 3 0 0 1 6 0z"/><path fillRule="evenodd" d="M0 8a8 8 0 1 1 16 0A8 8 0 0 1 0 8zm8-7a7 7 0 0 0-5.468 11.37C3.242 11.226 4.805 10 8 10s4.757 1.225 5.468 2.37A7 7 0 0 0 8 1z"/></svg>;
const LogoutIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 16 16" width="16" height="16"><path fillRule="evenodd" d="M10 12.5a.5.5 0 0 1-.5.5h-8a.5.5 0 0 1-.5-.5v-9a.5.5 0 0 1 .5-.5h8a.5.5 0 0 1 .5.5v2a.5.5 0 0 0 1 0v-2A1.5 1.5 0 0 0 9.5 2h-8A1.5 1.5 0 0 0 0 3.5v9A1.5 1.5 0 0 0 1.5 14h8a1.5 1.5 0 0 0 1.5-1.5v-2a.5.5 0 0 0-1 0v2z"/><path fillRule="evenodd" d="M15.854 8.354a.5.5 0 0 0 0-.708l-3-3a.5.5 0 0 0-.708.708L14.293 7.5H5.5a.5.5 0 0 0 0 1h8.793l-2.147 2.146a.5.5 0 0 0 .708.708l3-3z"/></svg>;
const ThemeIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 16 16" width="16" height="16"><path d="M8 16a8 8 0 1 0 0-16 8 8 0 0 0 0 16zm.5-14a.5.5 0 0 1 0 1H4.252A6.966 6.966 0 0 1 8 2.034V3.5a.5.5 0 0 1-1 0V2.034a6.966 6.966 0 0 1 3.748 1.466H8.5zm-1 1.89A7.03 7.03 0 0 1 13.966 8H14.5a.5.5 0 0 1 0 1h-.534a7.03 7.03 0 0 1-5.466 5.11V12.5a.5.5 0 0 1 1 0v1.466A6.966 6.966 0 0 1 4.252 9H3.5a.5.5 0 0 1 0-1h.752A6.966 6.966 0 0 1 7.5 3.976v1.414z"/></svg>;
const FanIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 16 16" width="16" height="16"><path d="M3.612 15.443c-.386.198-.824-.149-.746-.592l.83-4.73L.173 6.765c-.329-.314-.158-.888.283-.95l4.898-.696L7.538.792c.197-.39.73-.39.927 0l2.184 4.327 4.898.696c.441.062.612.636.282.95l-3.522 3.356.83 4.73c.078.443-.36.79-.746.592L8 13.187l-4.389 2.256z"/></svg>;
const GoogleIcon = () => <svg className="w-5 h-5" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path><path fill="none" d="M0 0h48v48H0z"></path></svg>;
const LoopIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 16 16" width="16" height="16"><path fillRule="evenodd" d="M8 3a5 5 0 1 0 4.546 2.914.5.5 0 0 1 .908-.417A6 6 0 1 1 8 2v1z"/><path d="M8 4.466V.534a.25.25 0 0 1 .41-.192l2.36 1.966c.12.1.12.284 0 .384L8.41 4.658A.25.25 0 0 1 8 4.466z"/></svg>;
const NoLoopIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 16 16" width="16" height="16"><path fillRule="evenodd" d="M8 3a5 5 0 1 0 4.546 2.914.5.5 0 0 1 .908-.417A6 6 0 1 1 8 2v1z"/><path d="M8 4.466V.534a.25.25 0 0 1 .41-.192l2.36 1.966c.12.1.12.284 0 .384L8.41 4.658A.25.25 0 0 1 8 4.466z"/><path fillRule="evenodd" d="M1.646 1.646a.5.5 0 0 1 .708 0L8 7.293l5.646-5.647a.5.5 0 0 1 .708.708L8.707 8l5.647 5.646a.5.5 0 0 1-.708.708L8 8.707l-5.646 5.647a.5.5 0 0 1-.708-.708L7.293 8 1.646 2.354a.5.5 0 0 1 0-.708z"/></svg>;
const ArrowLeftIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 16 16" width="24" height="24"><path fillRule="evenodd" d="M11.354 1.646a.5.5 0 0 1 0 .708L5.707 8l5.647 5.646a.5.5 0 0 1-.708.708l-6-6a.5.5 0 0 1 0-.708l6-6a.5.5 0 0 1 .708 0z"/></svg>;
const ArrowRightIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 16 16" width="24" height="24"><path fillRule="evenodd" d="M4.646 1.646a.5.5 0 0 1 .708 0l6 6a.5.5 0 0 1 0 .708l-6 6a.5.5 0 0 1-.708-.708L10.293 8 4.646 2.354a.5.5 0 0 1 0-.708z"/></svg>;

// --- Player Component ---
const VideoPlayer = React.memo(({ videoId, playerRef, options, onReady, onStateChange, onError, volume, playerNum, setReadyState, layout }) => {
    const aspectRatioClass = layout === 'horizontal' ? 'aspect-video' : 'aspect-[9/16]';
    if (!videoId) return <div className={`text-xs text-gray-500 p-2 flex items-center justify-center h-full ${aspectRatioClass} bg-gray-900 rounded-lg`}>Vídeo {playerNum} Indisponível</div>;
    return (
        <div className={`relative bg-black ${aspectRatioClass} w-full h-full border border-gray-700 rounded-lg overflow-hidden shadow-lg flex items-center justify-center group`}> {/* Added group class */}
            <YouTube key={`p${playerNum}-${videoId}`} videoId={videoId} opts={options} onReady={(e) => onReady(e, playerRef, volume, playerNum, setReadyState)} onStateChange={onStateChange} onError={onError} className="absolute inset-0 w-full h-full" iframeClassName="absolute inset-0 w-full h-full"/>
            {/* Individual Controls - Initially hidden, show on hover */}
            <div className="absolute top-1 right-1 flex-col space-y-1 z-20 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                 <button onClick={() => handleRemix(videoId)} title="Remix" className="px-1.5 py-0.5 text-[10px] leading-tight bg-black bg-opacity-70 rounded hover:bg-opacity-90 transition-colors text-white font-semibold disabled:opacity-30 disabled:cursor-not-allowed" disabled={!videoId}>Remix</button>
                 <button onClick={() => handleFullscreen(playerRef)} title="Maximizar Vídeo" className="p-1 bg-black bg-opacity-60 rounded hover:bg-opacity-80 transition-colors text-white disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center" disabled={!videoId}><MaximizeIcon /></button>
            </div>
        </div>
    );
});

// --- Player Frame Component ---
const PlayerFrame = React.memo(({
    video1Id, video2Id, player1Ref, player2Ref, playerOptions,
    onPlayerReady, onPlayerStateChange,
    volume1, volume2, handleVolumeChange,
    isP1Ready, isP2Ready, setIsP1Ready, setIsP2Ready,
    handleRemix, handleFullscreen,
    handlePlayPause, handlePreviousVideoPair, handleNextVideoPair,
    isPlaying, videoPairsLength,
    currentTime, duration, handleSeek, loopEnabled, toggleLoop,
    layout
}) => {
    const onPlayerError = useCallback((event, playerNum) => { console.error(`P${playerNum} Error:`, event.data); }, []);

    // Layout classes
    const frameContainerClasses = "flex w-full items-stretch justify-center relative mb-3"; // Base container for players + volumes
    const playersWrapperClasses = layout === 'horizontal'
        ? "flex flex-col space-y-1 md:space-y-2 w-full max-w-2xl" // Max width for horizontal
        : "flex flex-row space-x-1 md:space-x-2 items-center justify-center w-auto"; // Auto width for vertical

    const playerContainerClasses = layout === 'horizontal'
        ? "w-full" // Full width for horizontal videos
        : "w-auto max-w-[150px] sm:max-w-[180px] md:max-w-[220px] lg:max-w-[250px]"; // Responsive width for vertical

    const volumeSliderHeight = layout === 'horizontal' ? "h-32 md:h-40" : "h-48 sm:h-64 md:h-80 lg:h-96";

    return (
        <div className="w-full max-w-6xl flex flex-col items-center px-2"> {/* Added padding */}

            {/* --- Player Visual Frame --- */}
            <div className={`${frameContainerClasses} ${layout === 'horizontal' ? 'flex-row space-x-1 md:space-x-2' : 'flex-row space-x-1 md:space-x-2'}`}>
                {/* Volume Slider 1 */}
                <div className={`flex flex-col items-center justify-center w-10 md:w-12 ${volumeSliderHeight}`}>
                    <label htmlFor="vol1" className="text-xs mb-1 text-gray-400">Vol 1</label>
                    <input type="range" id="vol1" min="0" max="100" value={volume1} onChange={(e) => handleVolumeChange(e, player1Ref, setVolume1, 1)} className="w-4 h-full appearance-none bg-gray-700 rounded-full slider-vertical accent-blue-500 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed" style={{ writingMode: 'vertical-lr', direction: 'rtl' }} disabled={!isP1Ready} />
                </div>

                {/* Players Area + Floating Controls */}
                <div className={`flex-grow ${playersWrapperClasses} relative group`}> {/* Added relative and group */}

                    {/* Player 1 */}
                    <div className={`relative ${playerContainerClasses}`}>
                        <VideoPlayer videoId={video1Id} playerRef={player1Ref} options={playerOptions} onReady={onPlayerReady} onStateChange={onPlayerStateChange} onError={(e) => onPlayerError(e, 1)} volume={volume1} playerNum={1} setReadyState={setIsP1Ready} layout={layout} handleRemix={handleRemix} handleFullscreen={handleFullscreen} />
                    </div>

                    {/* Player 2 */}
                    <div className={`relative ${playerContainerClasses}`}>
                        <VideoPlayer videoId={video2Id} playerRef={player2Ref} options={playerOptions} onReady={onPlayerReady} onStateChange={onPlayerStateChange} onError={(e) => onPlayerError(e, 2)} volume={volume2} playerNum={2} setReadyState={setIsP2Ready} layout={layout} handleRemix={handleRemix} handleFullscreen={handleFullscreen} />
                    </div>

                    {/* Floating Controls Container - Centered, appears on hover */}
                    <div className="absolute inset-0 flex items-center justify-center z-30 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
                         <div className="flex items-center justify-center space-x-3 md:space-x-4 bg-black/60 backdrop-blur-sm p-3 rounded-full pointer-events-auto"> {/* Background added */}
                            <button onClick={handlePreviousVideoPair} title="Vídeo Anterior" className="p-2 bg-gray-700/80 rounded-full text-white hover:bg-gray-600/80 focus:outline-none ring-gray-500 focus:ring-2 focus:ring-offset-2 focus:ring-offset-black disabled:opacity-50 transition-all" disabled={videoPairsLength <= 1}><PrevIcon /></button>
                            <button onClick={handlePlayPause} className="p-3 md:p-4 bg-red-600/90 rounded-full text-white hover:bg-red-700/90 focus:outline-none ring-red-400 focus:ring-2 focus:ring-offset-2 focus:ring-offset-black disabled:opacity-50 transition-all scale-105 hover:scale-110" title={isPlaying ? "Pausar" : "Play"} disabled={!isP1Ready && !isP2Ready}>{isPlaying ? <PauseIcon /> : <PlayIcon />}</button>
                            <button onClick={handleNextVideoPair} title="Próximo Vídeo" className="p-2 bg-gray-700/80 rounded-full text-white hover:bg-gray-600/80 focus:outline-none ring-gray-500 focus:ring-2 focus:ring-offset-2 focus:ring-offset-black disabled:opacity-50 transition-all" disabled={videoPairsLength <= 1}><NextIcon /></button>
                            <button onClick={toggleLoop} title={loopEnabled ? "Desativar Loop" : "Ativar Loop"} className="p-1.5 ml-1 bg-gray-700/80 rounded-full text-white hover:bg-gray-600/80 focus:outline-none ring-gray-500 focus:ring-1 focus:ring-offset-1 focus:ring-offset-black disabled:opacity-50 transition-all">{loopEnabled ? <LoopIcon/> : <NoLoopIcon/>}</button>
                        </div>
                    </div>

                </div> {/* End Players Area + Floating Controls */}


                {/* Volume Slider 2 */}
                 <div className={`flex flex-col items-center justify-center w-10 md:w-12 ${volumeSliderHeight}`}>
                    <label htmlFor="vol2" className="text-xs mb-1 text-gray-400">Vol 2</label>
                    <input type="range" id="vol2" min="0" max="100" value={volume2} onChange={(e) => handleVolumeChange(e, player2Ref, setVolume2, 2)} className="w-4 h-full appearance-none bg-gray-700 rounded-full slider-vertical accent-blue-500 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed" style={{ writingMode: 'vertical-lr', direction: 'rtl' }} disabled={!isP2Ready} />
                </div>
            </div>

            {/* --- Timeline Section --- */}
            <div className="w-full max-w-xl lg:max-w-3xl mt-4 flex items-center space-x-2 md:space-x-3 px-2"> {/* Increased max-width */}
                <span className="text-xs w-10 md:w-12 text-right text-gray-400">{formatTime(currentTime)}</span>
                <input type="range" min="0" max={duration > 0 ? duration : 1} value={duration > 0 ? currentTime : 0} step="0.1" onChange={handleSeek} className="w-full h-2 bg-gray-600 rounded-full appearance-none cursor-pointer accent-red-600 disabled:opacity-50 disabled:cursor-not-allowed" disabled={duration <= 0 || (!isP1Ready && !isP2Ready)} /> {/* Slightly thicker bar */}
                <span className="text-xs w-10 md:w-12 text-left text-gray-400">{formatTime(duration)}</span>
            </div>
        </div>
    );
});

// --- Authentication Section Component --- (Memoized)
const AuthSection = React.memo(({ authMode, email, password, confirmPassword, handleEmailChange, handlePasswordChange, handleConfirmPasswordChange, handleLoginSubmit, handleRegisterSubmit, handleGoogleAuth, switchToLogin, switchToRegister }) => {
    // ... (Auth form JSX remains the same) ...
     return (
        <div className="w-full max-w-md mt-12 p-6 md:p-8 bg-gray-800/90 backdrop-blur-sm rounded-xl shadow-2xl border border-gray-700"> {/* Increased margin-top */}
            {authMode === 'login' && ( /* Login Form */
                <form onSubmit={handleLoginSubmit} className="space-y-5">
                    <h2 className="text-2xl font-semibold text-center text-white mb-6">Entrar</h2>
                    <div> <label htmlFor="login-email" className="block text-sm font-medium text-gray-300 mb-1">Email</label> <input type="email" id="login-email" value={email} onChange={handleEmailChange} required autoComplete='email' placeholder="user@example.com / fan@example.com" className="w-full p-2.5 rounded-md bg-gray-700 text-white border border-gray-600 placeholder-gray-500 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition" /> </div>
                    <div> <label htmlFor="login-password"  className="block text-sm font-medium text-gray-300 mb-1">Senha</label> <input type="password" id="login-password" value={password} onChange={handlePasswordChange} required autoComplete='current-password' placeholder="password" className="w-full p-2.5 rounded-md bg-gray-700 text-white border border-gray-600 placeholder-gray-500 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition" /> </div>
                    <button type="submit" className="w-full py-2.5 px-4 bg-red-600 rounded-md text-white font-semibold hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-offset-2 focus:ring-offset-gray-800 transition duration-150 ease-in-out shadow-md">Entrar</button>
                    <button type="button" onClick={handleGoogleAuth} className="w-full py-2.5 px-4 bg-gray-700 border border-gray-600 rounded-md text-white font-medium hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 focus:ring-offset-gray-800 transition duration-150 ease-in-out flex items-center justify-center space-x-2 shadow-sm"> <GoogleIcon /> <span>Entrar com Google</span> </button>
                    <div className="text-center mt-4"> <span className="text-sm text-gray-400">Não tem conta? </span> <button type="button" onClick={switchToRegister} className="text-sm font-medium text-blue-400 hover:text-blue-300 transition">Cadastre-se</button> </div>
                </form>
            )}
            {authMode === 'register' && ( /* Register Form */
                 <form onSubmit={handleRegisterSubmit} className="space-y-5">
                    <h2 className="text-2xl font-semibold text-center text-white mb-6">Criar Conta</h2>
                    <div> <label htmlFor="register-email" className="block text-sm font-medium text-gray-300 mb-1">Email</label> <input type="email" id="register-email" value={email} onChange={handleEmailChange} required autoComplete='email' placeholder="seuemail@exemplo.com" className="w-full p-2.5 rounded-md bg-gray-700 text-white border border-gray-600 placeholder-gray-500 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition" /> </div>
                    <div> <label htmlFor="register-password"  className="block text-sm font-medium text-gray-300 mb-1">Senha</label> <input type="password" id="register-password" value={password} onChange={handlePasswordChange} required autoComplete='new-password' placeholder="Mín. 6 caracteres" className="w-full p-2.5 rounded-md bg-gray-700 text-white border border-gray-600 placeholder-gray-500 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition" /> </div>
                    <div> <label htmlFor="confirm-password"  className="block text-sm font-medium text-gray-300 mb-1">Confirmar Senha</label> <input type="password" id="confirm-password" value={confirmPassword} onChange={handleConfirmPasswordChange} required autoComplete='new-password' placeholder="Repita a senha" className="w-full p-2.5 rounded-md bg-gray-700 text-white border border-gray-600 placeholder-gray-500 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition" /> </div>
                    <button type="submit" className="w-full py-2.5 px-4 bg-blue-600 rounded-md text-white font-semibold hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 focus:ring-offset-gray-800 transition duration-150 ease-in-out shadow-md">Cadastrar com Email</button>
                    <button type="button" onClick={handleGoogleAuth} className="w-full py-2.5 px-4 bg-gray-700 border border-gray-600 rounded-md text-white font-medium hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 focus:ring-offset-gray-800 transition duration-150 ease-in-out flex items-center justify-center space-x-2 shadow-sm"> <GoogleIcon /> <span>Cadastrar com Google</span> </button>
                    <div className="text-center mt-4"> <span className="text-sm text-gray-400">Já tem conta? </span> <button type="button" onClick={switchToLogin} className="text-sm font-medium text-blue-400 hover:text-blue-300 transition">Faça Login</button> </div>
                </form>
            )}
        </div>
    );
});

// --- Main App Component ---
function App() {
    // --- States ---
    const player1Ref = useRef(null);
    const player2Ref = useRef(null);
    const [isP1Ready, setIsP1Ready] = useState(false);
    const [isP2Ready, setIsP2Ready] = useState(false);
    const [isPlaying, setIsPlaying] = useState(false);
    const [volume1, setVolume1] = useState(80);
    const [volume2, setVolume2] = useState(80);
    const [speed, setSpeed] = useState(1);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const timelineUpdateIntervalRef = useRef(null);
    const [loopEnabled, setLoopEnabled] = useState(true);
    const [currentOverallPlaylistIndex, setCurrentOverallPlaylistIndex] = useState(0);
    const [allPlaylistSources, setAllPlaylistSources] = useState(LOGGED_OUT_PLAYLISTS);
    const [activePlaylist1Id, setActivePlaylist1Id] = useState(allPlaylistSources[0]?.p1 || null);
    const [activePlaylist2Id, setActivePlaylist2Id] = useState(allPlaylistSources[0]?.p2 || null);
    const [currentVideoPairIndex, setCurrentVideoPairIndex] = useState(0);
    const [videoPairs, setVideoPairs] = useState([]);
    const [isLoadingPlaylists, setIsLoadingPlaylists] = useState(true);
    const [currentLayout, setCurrentLayout] = useState(allPlaylistSources[0]?.type || 'vertical');
    const [authMode, setAuthMode] = useState('login');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [user, setUser] = useState(null);
    const [showUserMenu, setShowUserMenu] = useState(false);

    // --- Callbacks & Effects (Optimized with useCallback/useMemo where appropriate) ---

    const createVideoPairs = useCallback((list1, list2) => { /* ... (no changes) ... */
        const pairs = [];
        if (list1.length === 0 && list2.length > 0) list2.forEach(vId => pairs.push({ video1Id: null, video2Id: vId }));
        else if (list2.length === 0 && list1.length > 0) list1.forEach(vId => pairs.push({ video1Id: vId, video2Id: null }));
        else if (list1.length > 0 && list2.length > 0) {
            const len = Math.max(list1.length, list2.length);
            for (let i = 0; i < len; i++) pairs.push({ video1Id: list1[i % list1.length] ?? null, video2Id: list2[i % list2.length] ?? null });
        } else console.log("Both fetched lists empty.");
        console.log(`Created ${pairs.length} video pairs.`);
        setVideoPairs(pairs); setCurrentVideoPairIndex(0);
    }, []);

    useEffect(() => { // Update Active Playlists & Layout
        const currentSourcePair = allPlaylistSources[currentOverallPlaylistIndex];
        if (currentSourcePair) {
            console.log(`Playlist source changed: ${currentOverallPlaylistIndex} - ${currentSourcePair.name}`);
            setActivePlaylist1Id(currentSourcePair.p1); setActivePlaylist2Id(currentSourcePair.p2); setCurrentLayout(currentSourcePair.type);
            setCurrentVideoPairIndex(0); setIsPlaying(false); setCurrentTime(0); setDuration(0); setIsP1Ready(false); setIsP2Ready(false); stopTimelineUpdate();
        }
    }, [currentOverallPlaylistIndex, allPlaylistSources]);

    useEffect(() => { // Fetch Videos
        if (!activePlaylist1Id && !activePlaylist2Id) { setIsLoadingPlaylists(false); return; }
        console.log("Fetching videos for:", activePlaylist1Id, activePlaylist2Id);
        setIsLoadingPlaylists(true); setVideoPairs([]); setCurrentTime(0); setDuration(0); setIsP1Ready(false); setIsP2Ready(false); setIsPlaying(false); stopTimelineUpdate();
        if (!API_KEY || API_KEY === 'YOUR_YOUTUBE_API_KEY') { setIsLoadingPlaylists(false); return; }
        Promise.all([ fetchPlaylistVideos(activePlaylist1Id, API_KEY), fetchPlaylistVideos(activePlaylist2Id, API_KEY) ])
            .then(([videosP1, videosP2]) => { createVideoPairs(videosP1 || [], videosP2 || []); setIsLoadingPlaylists(false); })
            .catch(error => { console.error("Error fetching videos:", error); setIsLoadingPlaylists(false); });
    }, [activePlaylist1Id, activePlaylist2Id, createVideoPairs]);

    useEffect(() => () => stopTimelineUpdate(), []); // Cleanup interval

    const onPlayerReady = useCallback((event, playerRef, initialVolume, playerNum, setReadyState) => { /* ... (no changes) ... */
        const player = event.target; playerRef.current = player; console.log(`P${playerNum} ready.`);
        try { if (player?.setVolume) player.setVolume(initialVolume); if (player?.setPlaybackRate) player.setPlaybackRate(speed); setReadyState(true); if (playerNum === 1 && player?.getDuration) { setTimeout(() => { try { const dur = player.getDuration(); if (dur > 0) setDuration(dur); } catch(e){} }, 500); } } catch (error) { console.error(`Error onPlayerReady P${playerNum}:`, error); }
    }, [speed]);

    const handleLoop = useCallback(() => { /* ... (no changes) ... */
        console.log("Loop triggered."); const p1 = player1Ref.current; const p2 = player2Ref.current;
        try { if (p1?.seekTo) p1.seekTo(0, true); if (p2?.seekTo) p2.seekTo(0, true); setTimeout(() => { if (p1?.playVideo) p1.playVideo(); setTimeout(() => { if (p2?.playVideo) p2.playVideo(); }, 50); setIsPlaying(true); startTimelineUpdate(); }, 100); } catch (e) { console.error("Error during loop:", e); }
    }, []); // Removed startTimelineUpdate dep

    const onPlayerStateChange = useCallback((event) => { /* ... (no changes, includes loop logic) ... */
        const state = event.data; const isP1 = event.target === player1Ref.current; const pNum = isP1 ? 1 : 2;
        switch (state) {
            case YouTube.PlayerState.PLAYING: setIsPlaying(true); startTimelineUpdate(); if (isP1 && duration <= 0 && event.target?.getDuration) { try { const d = event.target.getDuration(); if (d > 0) setDuration(d); } catch (e) {} } const otherPlayerRef = isP1 ? player2Ref : player1Ref; if (otherPlayerRef.current?.getPlayerState) { try { const os = otherPlayerRef.current.getPlayerState(); if (os !== 1 && os !== 3) setTimeout(() => { try { otherPlayerRef.current.playVideo(); } catch(e){} }, 150); } catch (e) {} } break;
            case YouTube.PlayerState.PAUSED: const otherPlayer = isP1 ? player2Ref.current : player1Ref.current; let otherState = -1; try { if (otherPlayer?.getPlayerState) otherState = otherPlayer.getPlayerState(); } catch (e) {} if (otherState === 2 || otherState <= 0 || otherState === 5) { setIsPlaying(false); stopTimelineUpdate(); } break;
            case YouTube.PlayerState.ENDED: console.log(`P${pNum} ended.`); if (loopEnabled) { const otherP = isP1 ? player2Ref.current : player1Ref.current; let otherPState = -1; try { if (otherP?.getPlayerState) otherPState = otherP.getPlayerState(); } catch(e) {} const p1State = isP1 ? 0 : player1Ref.current?.getPlayerState() ?? -1; const p2State = !isP1 ? 0 : otherPState; const isP1Finished = p1State <= 0 || p1State === 2 || p1State === 5; const isP2Finished = p2State <= 0 || p2State === 2 || p2State === 5; if (isP1Finished && isP2Finished) { handleLoop(); } } else if (isP1) { setCurrentTime(0); stopTimelineUpdate(); setIsPlaying(false); } break;
            case YouTube.PlayerState.CUED: if (isP1 && event.target?.getDuration) { try { const d = event.target.getDuration(); if (d > 0) setDuration(d); } catch (e) {} } break;
            default: break;
        }
    }, [duration, loopEnabled, handleLoop]);

    const handlePlayPause = useCallback(() => { /* ... (no changes) ... */
        const p1 = player1Ref.current; const p2 = player2Ref.current; if (!p1 && !p2) return;
        try { if (isPlaying) { p1?.pauseVideo(); p2?.pauseVideo(); } else { const p1State = p1?.getPlayerState?.() ?? -1; const p2State = p2?.getPlayerState?.() ?? -1; if (p1State === 0) p1.seekTo(0); if (p2State === 0) p2.seekTo(0); p1?.playVideo(); setTimeout(() => p2?.playVideo(), 50); } } catch (e) { console.error(e); }
    }, [isPlaying]);
    const handleSeek = useCallback((event) => { /* ... (no changes) ... */
        if (!isP1Ready && !isP2Ready) return; const time = parseFloat(event.target.value); setCurrentTime(time); const p1 = player1Ref.current; const p2 = player2Ref.current; try { if (isP1Ready && p1?.seekTo) p1.seekTo(time, true); if (isP2Ready && p2?.seekTo) p2.seekTo(time, true); if (!isPlaying) setTimeout(() => handlePlayPause(), 100); else startTimelineUpdate(); } catch (e) { console.error(e); }
    }, [isP1Ready, isP2Ready, isPlaying, handlePlayPause]); // Added handlePlayPause
    const handleSpeedChange = useCallback((event) => { /* ... (no changes) ... */
        const newSpeed = parseFloat(event.target.value); setSpeed(newSpeed); const p1 = player1Ref.current; const p2 = player2Ref.current; try { if (isP1Ready && p1?.setPlaybackRate) p1.setPlaybackRate(newSpeed); if (isP2Ready && p2?.setPlaybackRate) p2.setPlaybackRate(newSpeed); } catch (e) { console.error(e); }
    }, [isP1Ready, isP2Ready]);
    const handleVolumeChange = useCallback((event, playerRef, volumeSetter) => { /* Simplified */
        const newVolume = parseInt(event.target.value, 10); volumeSetter(newVolume); try { playerRef.current?.setVolume?.(newVolume); } catch (e) { console.error(e); }
    }, []);
    const handleNextVideoPair = useCallback(() => { /* ... (no changes) ... */
        if (videoPairs.length <= 1) return; stopTimelineUpdate(); const nextIndex = (currentVideoPairIndex + 1) % videoPairs.length; setCurrentVideoPairIndex(nextIndex); setIsPlaying(false); setCurrentTime(0); setDuration(0); setIsP1Ready(false); setIsP2Ready(false);
    }, [videoPairs, currentVideoPairIndex]);
    const handlePreviousVideoPair = useCallback(() => { /* ... (no changes) ... */
        if (videoPairs.length <= 1) return; stopTimelineUpdate(); const prevIndex = (currentVideoPairIndex - 1 + videoPairs.length) % videoPairs.length; setCurrentVideoPairIndex(prevIndex); setIsPlaying(false); setCurrentTime(0); setDuration(0); setIsP1Ready(false); setIsP2Ready(false);
    }, [videoPairs, currentVideoPairIndex]);
    const handleFullscreen = useCallback((playerRef) => { /* ... (no changes) ... */
        const i = playerRef.current?.getIframe?.(); if (!i) return; try { if (i.requestFullscreen) i.requestFullscreen(); else if (i.webkitRequestFullscreen) i.webkitRequestFullscreen(); else if (i.msRequestFullscreen) i.msRequestFullscreen(); } catch (e) { console.error(e); }
    }, []);
    const handleRemix = useCallback((videoId) => { /* ... (no changes) ... */
        if (!videoId) return; const url = `https://www.youtube.com/watch?v=${videoId}`; window.open(url, '_blank', 'noopener,noreferrer');
    }, []);
    const toggleLoop = useCallback(() => setLoopEnabled(prev => !prev), []);
    const handleNextPlaylistSource = useCallback(() => { if (allPlaylistSources.length <= 1) return; setCurrentOverallPlaylistIndex(prev => (prev + 1) % allPlaylistSources.length); }, [allPlaylistSources]);
    const handlePreviousPlaylistSource = useCallback(() => { if (allPlaylistSources.length <= 1) return; setCurrentOverallPlaylistIndex(prev => (prev - 1 + allPlaylistSources.length) % allPlaylistSources.length); }, [allPlaylistSources]);
    const startTimelineUpdate = useCallback(() => { /* ... (no changes) ... */
        stopTimelineUpdate(); if (!player1Ref.current?.getCurrentTime || !player1Ref.current?.getPlayerState) return;
        timelineUpdateIntervalRef.current = setInterval(() => { const p1 = player1Ref.current; try { if (isP1Ready && p1 && p1.getPlayerState() === YouTube.PlayerState.PLAYING) { const ct = p1.getCurrentTime(); if (typeof ct === 'number') setCurrentTime(ct); const cd = p1.getDuration(); if (cd > 0 && cd !== duration) setDuration(cd); } else stopTimelineUpdate(); } catch (e) { stopTimelineUpdate(); } }, 500);
    }, [isP1Ready, duration]);
    const stopTimelineUpdate = () => { if (timelineUpdateIntervalRef.current) { clearInterval(timelineUpdateIntervalRef.current); timelineUpdateIntervalRef.current = null; } };
    const handleEmailChange = useCallback((e) => setEmail(e.target.value), []);
    const handlePasswordChange = useCallback((e) => setPassword(e.target.value), []);
    const handleConfirmPasswordChange = useCallback((e) => setConfirmPassword(e.target.value), []);
    const clearAuthFields = useCallback(() => { setEmail(''); setPassword(''); setConfirmPassword(''); }, []);
    const performLogin = useCallback((loggedInUser) => { /* ... (no changes) ... */
        setUser(loggedInUser); setIsLoggedIn(true); setAuthMode(''); clearAuthFields(); let sources = []; let initialIndex = 0;
        if (loggedInUser.isFan) { const fanPairs = FAN_EXTRA_PLAYLISTS.filter(p=>p.p1 && !p.p1.includes('YOUR_')); sources = [...LOGGED_IN_BASE_PLAYLISTS, ...fanPairs]; initialIndex = 0; console.log("Fan logged in. Sources:", sources.length); }
        else { sources = [...LOGGED_IN_BASE_PLAYLISTS]; initialIndex = 0; console.log("Non-fan logged in. Sources:", sources.length); }
        setAllPlaylistSources(sources); setCurrentOverallPlaylistIndex(initialIndex);
    }, [clearAuthFields]);
    const handleLoginSubmit = useCallback((e) => { /* ... */ e.preventDefault(); if (email === "fan@example.com" && password === "password") performLogin({ email, isFan: true }); else if (email === "user@example.com" && password === "password") performLogin({ email, isFan: false }); else alert("(Simulado) Falha login."); }, [email, password, performLogin]);
    const handleRegisterSubmit = useCallback((e) => { /* ... */ e.preventDefault(); if (password !== confirmPassword) { alert("Senhas não coincidem!"); return; } if (!email || !password || password.length < 6) { alert("Email/Senha inválidos (senha mín. 6)."); return; } alert(`(Simulado) Cadastro para: ${email}. Email de confirmação seria enviado.`); alert("Cadastro simulado OK! Tente login."); clearAuthFields(); setAuthMode('login'); }, [email, password, confirmPassword, clearAuthFields]);
    const handleGoogleAuth = useCallback(() => { /* ... */ alert(`(Simulado) Google Auth (${authMode})...`); performLogin({ email: 'user.google@example.com', isFan: false }); }, [authMode, performLogin]);
    const switchToRegister = useCallback(() => { clearAuthFields(); setAuthMode('register'); }, [clearAuthFields]);
    const switchToLogin = useCallback(() => { clearAuthFields(); setAuthMode('login'); }, [clearAuthFields]);
    const handleLogout = useCallback(() => { /* ... */ console.log("Logout."); alert("Você saiu (simulado)."); setIsLoggedIn(false); setUser(null); setShowUserMenu(false); setAuthMode('login'); setAllPlaylistSources([...LOGGED_OUT_PLAYLISTS]); setCurrentOverallPlaylistIndex(0); }, []);
    const handleThemeChange = useCallback(() => alert("(Simulado) Mudar tema."), []);
    const handleBecomeFan = useCallback(() => { /* ... */ alert("(Simulado) Pagamento Fã..."); setTimeout(() => { alert("(Simulado) Pagamento OK! Playlists Fã."); setUser(prev => ({ ...prev, isFan: true })); setShowUserMenu(false); const fanPairs = FAN_EXTRA_PLAYLISTS.filter(p=>p.p1 && !p.p1.includes('YOUR_')); const sources = [...LOGGED_IN_BASE_PLAYLISTS, ...fanPairs]; setAllPlaylistSources(sources); console.log("Fan status updated. Sources:", sources.length); }, 1500); }, []);
    const playerOptions = useMemo(() => ({ playerVars: { autoplay: 0, controls: 0, rel: 0, modestbranding: 1, fs: 0, iv_load_policy: 3, playsinline: 1 } }), []);
    const currentVideo1Id = videoPairs[currentVideoPairIndex]?.video1Id || null;
    const currentVideo2Id = videoPairs[currentVideoPairIndex]?.video2Id || null;
    const currentPlaylistSourceName = allPlaylistSources[currentOverallPlaylistIndex]?.name || `Dupla ${currentOverallPlaylistIndex + 1}`;

    // --- Render Logic ---
    return (
        // Changed main div for better height control and padding
        <div className="flex flex-col h-screen bg-gradient-to-b from-gray-900 to-black text-gray-200 font-sans items-center justify-between p-2 md:p-4 relative overflow-hidden">

            {/* === Edge Navigation Buttons === */}
            {(allPlaylistSources.length > 1) && ( // Show if more than one pair available, regardless of login
                 <>
                    <button onClick={handlePreviousPlaylistSource} title="Dupla Anterior" className="fixed left-1 md:left-3 top-1/2 -translate-y-1/2 z-40 p-2 bg-black bg-opacity-40 text-white rounded-full hover:bg-opacity-70 transition-opacity disabled:opacity-20" disabled={allPlaylistSources.length <= 1}><ArrowLeftIcon /></button>
                    <button onClick={handleNextPlaylistSource} title="Próxima Dupla" className="fixed right-1 md:right-3 top-1/2 -translate-y-1/2 z-40 p-2 bg-black bg-opacity-40 text-white rounded-full hover:bg-opacity-70 transition-opacity disabled:opacity-20" disabled={allPlaylistSources.length <= 1}><ArrowRightIcon /></button>
                </>
             )}

            {/* === Top Bar === */}
            <div className="w-full p-2 bg-gray-800/80 backdrop-blur-sm flex items-center justify-between sticky top-0 z-30 shadow-lg border-b border-gray-700/50 rounded-b-lg">
                 <span className="text-sm font-semibold text-red-500 opacity-90 hidden sm:block ml-4 flex-shrink-0">Setenta Vezes Sete</span>
                <div className="block sm:hidden w-10 flex-shrink-0"></div> {/* Spacer */}
                <div className="flex items-center justify-center flex-grow mx-2 sm:mx-4 min-w-0"> {/* Added min-w-0 */}
                    <label htmlFor="speed" className="text-xs mr-2 text-gray-400 whitespace-nowrap">Vel:</label>
                    <input type="range" id="speed" min="0.7" max="4" step="0.05" value={speed} onChange={handleSpeedChange} className="w-full max-w-xs md:max-w-sm h-1.5 bg-gray-600 rounded-full appearance-none cursor-pointer accent-red-600 disabled:opacity-50" disabled={!isP1Ready && !isP2Ready} />
                    <span className="text-xs ml-2 w-10 text-center text-gray-300 flex-shrink-0">{speed.toFixed(2)}x</span>
                </div>
                <div className="relative mr-2 md:mr-4 flex-shrink-0"> {/* User Area */}
                     {isLoggedIn && user ? ( /* User Menu */
                         <>
                            <button onClick={() => setShowUserMenu(prev => !prev)} className="w-8 h-8 md:w-9 md:h-9 rounded-full bg-gray-600 hover:bg-gray-500 text-white flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-red-500" aria-label="Menu do Usuário"><UserIcon /></button>
                            {showUserMenu && ( /* User Dropdown */
                                <div className="absolute right-0 mt-2 w-60 bg-gray-700 rounded-md shadow-xl z-40 border border-gray-600 text-sm"> <div className="p-3 border-b border-gray-600"><p className="font-medium text-white">Logado:</p><p className="text-gray-300 truncate">{user.email}</p>{user.isFan && <p className="text-xs text-yellow-400 mt-1 font-semibold">⭐ Membro Fã</p>}</div> <div className="py-1"> <button onClick={handleThemeChange} className="w-full text-left px-4 py-2 text-gray-200 hover:bg-gray-600 flex items-center space-x-2"> <ThemeIcon /> <span>Mudar Tema</span> </button> {!user.isFan && ( <button onClick={handleBecomeFan} className="w-full text-left px-4 py-2 text-yellow-400 hover:bg-gray-600 flex items-center space-x-2"> <FanIcon /> <span>Seja Fã (R$ 7,00)</span> </button> )} <button onClick={handleLogout} className="w-full text-left px-4 py-2 text-red-400 hover:bg-gray-600 flex items-center space-x-2"> <LogoutIcon /> <span>Sair</span> </button> </div> </div>
                            )}
                        </>
                    ) : ( /* Login/Register Buttons */
                        <div className="flex space-x-1 md:space-x-2"> <button onClick={switchToLogin} className={`text-xs px-2 py-1 md:px-3 rounded ${authMode === 'login' ? 'bg-red-600 text-white' : 'bg-gray-600 hover:bg-gray-500 text-gray-200'}`}>Entrar</button> <button onClick={switchToRegister} className={`text-xs px-2 py-1 md:px-3 rounded ${authMode === 'register' ? 'bg-blue-600 text-white' : 'bg-gray-600 hover:bg-gray-500 text-gray-200'}`}>Cadastrar</button> </div>
                    )}
                </div>
            </div>

            {/* === Main Content Area (Player or Auth) === */}
            {/* Using flex-grow to push footer down, justify-center to center content vertically */}
            <main className="flex-grow flex flex-col items-center justify-center w-full px-2 py-4 overflow-y-auto"> {/* Allow vertical scroll if needed */}

                {/* Loading/Error State */}
                {isLoadingPlaylists && <div className="flex-grow flex items-center justify-center text-xl text-gray-400">Carregando...</div>}
                {!isLoadingPlaylists && videoPairs.length === 0 && (
                    <div className="flex flex-col items-center justify-center text-center text-lg text-yellow-400 bg-gray-800/50 p-6 rounded-lg border border-yellow-700/50 max-w-lg">
                        <p>Nenhum vídeo encontrado para:</p>
                        <p className="text-base font-semibold my-1">{currentPlaylistSourceName}</p>
                        <p className="text-sm text-yellow-300 mt-1 truncate w-full px-2">P1: {activePlaylist1Id || 'N/A'}</p>
                        <p className="text-sm text-yellow-300 mt-1 truncate w-full px-2">P2: {activePlaylist2Id || 'N/A'}</p>
                        <p className="mt-3 text-base">Verifique IDs/API Key.</p>
                        <p className="text-xs mt-2">(Placeholders como 'YOUR_...' não serão carregados)</p>
                    </div>
                )}

                {/* Player Area (Render only if ready) */}
                {!isLoadingPlaylists && videoPairs.length > 0 && (
                    <PlayerFrame
                        video1Id={currentVideo1Id} video2Id={currentVideo2Id}
                        player1Ref={player1Ref} player2Ref={player2Ref}
                        playerOptions={playerOptions} onPlayerReady={onPlayerReady} onPlayerStateChange={onPlayerStateChange}
                        volume1={volume1} volume2={volume2} handleVolumeChange={handleVolumeChange}
                        isP1Ready={isP1Ready} isP2Ready={isP2Ready} setIsP1Ready={setIsP1Ready} setIsP2Ready={setIsP2Ready}
                        handleRemix={handleRemix} handleFullscreen={handleFullscreen}
                        handlePlayPause={handlePlayPause} handlePreviousVideoPair={handlePreviousVideoPair} handleNextVideoPair={handleNextVideoPair}
                        isPlaying={isPlaying} videoPairsLength={videoPairs.length}
                        currentTime={currentTime} duration={duration} handleSeek={handleSeek}
                        loopEnabled={loopEnabled} toggleLoop={toggleLoop}
                        layout={currentLayout}
                    />
                )}

                {/* Authentication Section */}
                {!isLoggedIn && (authMode === 'login' || authMode === 'register') && (
                    <AuthSection
                        authMode={authMode} email={email} password={password} confirmPassword={confirmPassword}
                        handleEmailChange={handleEmailChange} handlePasswordChange={handlePasswordChange} handleConfirmPasswordChange={handleConfirmPasswordChange}
                        handleLoginSubmit={handleLoginSubmit} handleRegisterSubmit={handleRegisterSubmit} handleGoogleAuth={handleGoogleAuth}
                        switchToLogin={switchToLogin} switchToRegister={switchToRegister}
                    />
                )}
            </main>

            {/* === Footer === */}
            <footer className="text-center p-2 text-xs text-gray-600 flex-shrink-0"> {/* Prevent footer from growing */}
                © {new Date().getFullYear()} Setenta Vezes Sete. (Simulado)
            </footer>

            {/* Global Styles */}
            <style jsx global>{`
                .slider-vertical { -webkit-appearance: slider-vertical; appearance: slider-vertical; width: 8px; height: 100%; padding: 0 5px; }
                @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
                form { animation: fadeIn 0.3s ease-out forwards; }
                body { overflow: hidden; } /* Prevent body scroll */
            `}</style>
        </div>