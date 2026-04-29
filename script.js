window.onerror = function(msg, url, line, col, error) {
  console.error('JS Error:', msg, '@', url + ':' + line, error);
  return false;
};
console.log('script.js loaded');
/* Firebase 即時同步版（PTtv 專案） */
const firebaseConfig = {
  apiKey: "AIzaSyC_aT7nwS5PNGo67EB2tJrRjKW4gIElWps",
  authDomain: "pttv-1ef51.firebaseapp.com",
  projectId: "pttv-1ef51",
  storageBucket: "pttv-1ef51.firebasestorage.app",
  messagingSenderId: "590206250055",
  appId: "1:590206250055:web:96ec186f39689ca973d562"
};
firebase.initializeApp(firebaseConfig);
const db = firebase.database();

const FALLBACK_YT_ID = 'm_dhMSvUCIc';
let ytId = FALLBACK_YT_ID;
let playerReady = false;
let mqTexts = [
    '近期流感疫情升溫，請落實勤洗手及戴口罩，注意個人防護！',
    '本院復健科新增運動訓練，幫助您增強肌力，加速復原。若有需要請洽物理治療師諮詢。',
    '起身或移動時請放慢動作，若有頭暈請立即告知治療師。'

];
let mqText = mqTexts[0];
let mqIdx = 0;
let photos = ["photo1.jpg", "photo2.jpg", "photo3.jpg"];

// 監聽 ytId
db.ref('ytId').on('value', snap => {
    const val = snap.val();
    const newId = val && typeof val === 'string' ? val : FALLBACK_YT_ID;
    if (newId === ytId) return;
    ytId = newId;
    if (window.player && playerReady && typeof window.player.loadVideoById === 'function') {
        try { window.player.loadVideoById(ytId); } catch (e) { console.warn('loadVideoById failed', e); }
    }
});

// 監聽 mqText
db.ref('mqText').on('value', snap => {
    const val = snap.val();
    mqTexts[0] = val && typeof val === 'string' ? val : mqTexts[0];
    mqText = mqTexts[mqIdx];
    const mqEl = document.querySelector('.marquee-text');
    if (mqEl) mqEl.textContent = mqText + '　　　' + mqText + '　　　' + mqText;
});

// 監聽 photoFiles 與 photos
function updatePhotos() {
    db.ref('photoFiles').once('value', snap => {
        let files = snap.val();
        if (files && Array.isArray(files) && files.length > 0) {
            photos = files;
        } else {
            db.ref('photos').once('value', snap2 => {
                let base64s = snap2.val();
                if (base64s && Array.isArray(base64s) && base64s.length > 0) {
                    photos = base64s;
                } else {
                    photos = ["photo1.jpg", "photo2.jpg", "photo3.jpg"];
                }
            });
        }
    });
}
db.ref('photoFiles').on('value', updatePhotos);
db.ref('photos').on('value', updatePhotos);

// === 看板穩定性與遠端控制 ===

// 每日 04:00 自動重新整理（避免長時間運行的記憶體/快取累積）
(function scheduleNightlyReload() {
    const now = new Date();
    const next = new Date(now);
    next.setHours(4, 0, 0, 0);
    if (next <= now) next.setDate(next.getDate() + 1);
    setTimeout(() => location.reload(), next - now);
})();

// 遠端重啟：admin 寫入 reloadAt 時間戳，前台偵測到變化就 reload
let _initialReloadAt = null;
db.ref('reloadAt').on('value', snap => {
    const val = snap.val();
    if (_initialReloadAt === null) {
        _initialReloadAt = val;  // 第一次只記錄基準值，不重整
        return;
    }
    if (typeof val === 'number' && val !== _initialReloadAt) {
        console.log('收到遠端重啟訊號');
        location.reload();
    }
});

// 連線狀態：離線顯示提示；恢復連線後重建 YouTube player（離線過久 iframe 常會卡死）
function showOfflineBadge() {
    let el = document.getElementById('offline-badge');
    if (!el) {
        el = document.createElement('div');
        el.id = 'offline-badge';
        el.textContent = '⚠ 離線';
        el.style.cssText = 'position:fixed;top:8px;right:8px;background:#c00;color:#fff;padding:4px 12px;border-radius:4px;font-size:14px;font-weight:bold;z-index:9999;box-shadow:0 2px 6px rgba(0,0,0,0.3);';
    }
    if (!el.parentNode && document.body) document.body.appendChild(el);
}
function hideOfflineBadge() {
    const el = document.getElementById('offline-badge');
    if (el && el.parentNode) el.parentNode.removeChild(el);
}
window.addEventListener('offline', () => {
    console.warn('離線');
    showOfflineBadge();
});
window.addEventListener('online', () => {
    console.log('已連線，3 秒後重建 YouTube 播放器');
    hideOfflineBadge();
    setTimeout(() => {
        if (typeof createPlayer === 'function') createPlayer(ytId);
    }, 3000);
});
document.addEventListener('DOMContentLoaded', () => {
    if (!navigator.onLine) showOfflineBadge();
});

// === 顯示優化 ===

const BUILD_VERSION = '2026.04.30';

// Loading 覆蓋層：YouTube 還沒 ready 時顯示，避免使用者看到黑畫面
function showLoadingOverlay() {
    const container = document.getElementById('video-container');
    if (!container || document.getElementById('loading-overlay')) return;
    const overlay = document.createElement('div');
    overlay.id = 'loading-overlay';
    overlay.style.cssText = 'position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;color:#b0c4de;font-size:1.3em;background:#000;z-index:10;text-align:center;';
    overlay.innerHTML = '<div style="font-size:3em;margin-bottom:14px;">🏥</div><div>看板載入中…</div>';
    container.appendChild(overlay);
}
function hideLoadingOverlay() {
    const overlay = document.getElementById('loading-overlay');
    if (!overlay) return;
    overlay.style.transition = 'opacity 0.5s';
    overlay.style.opacity = '0';
    setTimeout(() => { if (overlay.parentNode) overlay.parentNode.removeChild(overlay); }, 500);
}

// 燒屏防護：每 5 分鐘微幅位移 app-container（醫院螢幕長時間開啟易留殘影）
const BURN_IN_OFFSETS = [[0,0],[1,1],[2,2],[1,2],[0,1],[2,0],[1,0],[2,1]];
let burnInIdx = 0;
setInterval(() => {
    burnInIdx = (burnInIdx + 1) % BURN_IN_OFFSETS.length;
    const [x, y] = BURN_IN_OFFSETS[burnInIdx];
    const app = document.getElementById('app-container');
    if (app) app.style.transform = `translate(${x}px, ${y}px)`;
}, 5 * 60 * 1000);

// 版本標記與初始 loading 覆蓋層
document.addEventListener('DOMContentLoaded', () => {
    showLoadingOverlay();
    const tag = document.createElement('div');
    tag.id = 'version-tag';
    tag.textContent = 'v' + BUILD_VERSION;
    tag.style.cssText = 'position:fixed;bottom:2px;left:6px;color:rgba(176,196,222,0.35);font-size:10px;font-family:monospace;z-index:9999;pointer-events:none;';
    document.body.appendChild(tag);
});

// YouTube API 整合
function destroyPlayer() {
    if (window.player && typeof window.player.destroy === 'function') {
        try { window.player.destroy(); } catch (e) {}
    }
    window.player = null;
    playerReady = false;
    // YT.Player 會把 #player 替換成 iframe，destroy 後需重新放回 div
    const container = document.getElementById('video-container');
    if (container) container.innerHTML = '<div id="player"></div>';
}

function createPlayer(videoId) {
    destroyPlayer();
    showLoadingOverlay();
    if (typeof YT === 'undefined' || !YT.Player) return;
    if (!document.getElementById('player')) return;
    window.player = new YT.Player('player', {
        videoId: videoId,
        width: '100%',
        height: '100%',
        playerVars: {
            'autoplay': 1,
            'mute': 1,
            'controls': 0,
            'rel': 0,
            'playsinline': 1
        },
        events: {
            'onReady': (event) => {
                playerReady = true;
                event.target.mute();
                event.target.playVideo();
                console.log('YouTube Player 就緒，開始播放：', videoId);
                hideLoadingOverlay();
            },
            'onStateChange': (event) => {
                // 影片結束 → 手動重新播放（取代不穩定的 loop 參數）
                if (event.data === YT.PlayerState.ENDED) {
                    console.log('影片結束，重新播放');
                    event.target.playVideo();
                }
                // 意外暫停 → 1.5 秒後自動恢復
                if (event.data === YT.PlayerState.PAUSED) {
                    setTimeout(() => {
                        if (window.player && window.player.getPlayerState() === YT.PlayerState.PAUSED) {
                            console.log('偵測到暫停，自動恢復播放');
                            window.player.playVideo();
                        }
                    }, 1500);
                }
            },
            'onError': (event) => {
                console.error('YouTube Player Error code:', event.data);
                // 2/100/101/150 = 影片無效或禁止嵌入 → 退回預設影片；其他 → 重試目前影片
                const badVideo = [2, 100, 101, 150].indexOf(event.data) !== -1;
                const recoverId = badVideo ? FALLBACK_YT_ID : ytId;
                setTimeout(() => createPlayer(recoverId), 5000);
            }
        }
    });
}

window.onYouTubeIframeAPIReady = function() {
    console.log('YouTube API Ready, ytId:', ytId);
    createPlayer(ytId);
};

// Watchdog：每 30 秒檢查播放狀態，卡住超過 90 秒就重建播放器
let lastHealthyTs = Date.now();
setInterval(() => {
    if (!window.player || !playerReady) return;
    try {
        const state = window.player.getPlayerState();
        if (state === 1) { lastHealthyTs = Date.now(); return; }
        // -1 未開始 / 2 暫停 / 5 cued → 嘗試恢復播放
        if (state === -1 || state === 2 || state === 5) {
            try { window.player.playVideo(); } catch (e) {}
        }
        if (Date.now() - lastHealthyTs > 90000) {
            console.warn('Player stuck, recreating...');
            lastHealthyTs = Date.now();
            createPlayer(ytId);
        }
    } catch (e) {
        console.warn('Watchdog error:', e);
    }
}, 30000);

document.addEventListener('DOMContentLoaded', () => {
    // 跑馬燈初始化（重複文字實現無縫循環）
    const mqEl = document.querySelector('.marquee-text');
    if (mqEl) {
        const text = mqTexts[mqIdx];
        mqEl.textContent = text + '　　　' + text + '　　　' + text;
    }

    // 幻燈片與時間初始化
    const progressContainer = document.getElementById('progress-container');
    const timestampContainer = document.getElementById('timestamp-container');

    // 幻燈片輪播
    let currentIdx = 0;
    function showPhoto(index, attempts = 0) {
        if (attempts >= photos.length) {
            console.warn('所有照片皆無法載入');
            return;
        }
        currentIdx = index;
        progressContainer.innerHTML = "";
        progressContainer.style.background = "linear-gradient(to bottom, #003366, #001f3f)";
        const img = document.createElement("img");
        img.src = photos[index];
        img.className = "slideshow-photo";
        img.onerror = () => {
            console.warn('照片載入失敗，跳下一張：', photos[index]);
            showPhoto((index + 1) % photos.length, attempts + 1);
        };
        progressContainer.appendChild(img);
        setTimeout(() => { img.style.opacity = "1"; }, 30);
    }

    setInterval(() => {
        currentIdx = (currentIdx + 1) % photos.length;
        showPhoto(currentIdx);
    }, 30000);

    // 日期時間
    function updateTime() {
        const now = new Date();
        const week = ['日', '一', '二', '三', '四', '五', '六'][now.getDay()];
        timestampContainer.textContent = `${now.getFullYear()}/${now.getMonth()+1}/${now.getDate()} (${week}) ${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
    }

    showPhoto(0);
    updateTime();
    setInterval(updateTime, 1000);
});
