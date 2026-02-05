window.onerror = function(msg, url, line, col, error) {
  alert("JS Error: " + msg + " @ " + url + ":" + line);
  return false;
};
console.log("script.js loaded");
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

let ytId = 'm_dhMSvUCIc';
let mqTexts = [
    '😷 請配戴口罩並勤洗手，保護你我健康！🏥',
    '祝您早日康復！',
    '本院關心您的健康，請遵守防疫規定。'
];
let mqText = mqTexts[0];
let mqIdx = 0;
let photos = ["photo1.jpg", "photo2.jpg", "photo3.jpg"];

// 監聽 ytId
db.ref('ytId').on('value', snap => {
    const val = snap.val();
    ytId = val && typeof val === 'string' ? val : 'm_dhMSvUCIc';
    if (window.player && window.player.loadVideoById) {
        window.player.loadVideoById(ytId);
    }
});

// 監聽 mqText
db.ref('mqText').on('value', snap => {
    const val = snap.val();
    mqTexts[0] = val && typeof val === 'string' ? val : mqTexts[0];
    mqText = mqTexts[mqIdx];
    const mqEl = document.querySelector('.marquee-text');
    if (mqEl) mqEl.textContent = mqText;
});

// 跑馬燈多段 loop
setInterval(() => {
    mqIdx = (mqIdx + 1) % mqTexts.length;
    mqText = mqTexts[mqIdx];
    const mqEl = document.querySelector('.marquee-text');
    if (mqEl) mqEl.textContent = mqText;
}, 60000);

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

// YouTube API 整合
function onYouTubeIframeAPIReady() {
    console.log("YouTube API Ready, ytId:", ytId);
    if (!document.getElementById('player')) {
        alert("找不到 #player 容器，YouTube 無法顯示");
        return;
    }
    window.player = new YT.Player('player', {
        videoId: ytId,
        playerVars: {
            'autoplay': 1,
            'mute': 1,
            'loop': 1,
            'playlist': ytId,
            'controls': 0,
            'modestbranding': 1,
            'rel': 0
        },
        events: {
            'onReady': (event) => event.target.playVideo(),
            'onError': (event) => {
                alert("YouTube 播放失敗，請檢查影片 ID 或瀏覽器設定。錯誤碼：" + event.data);
                console.error("YouTube Player Error", event);
            }
        }
    });
}

document.addEventListener('DOMContentLoaded', () => {
    const progressContainer = document.getElementById('progress-container');
    const timestampContainer = document.getElementById('timestamp-container');

    // 幻燈片輪播
    let currentIdx = 0;
    function showPhoto(index) {
        progressContainer.innerHTML = "";
        const img = document.createElement("img");
        img.src = photos[index];
        img.className = "slideshow-photo";
        progressContainer.appendChild(img);
    }

    setInterval(() => {
        currentIdx = (currentIdx + 1) % photos.length;
        showPhoto(currentIdx);
    }, 5000);

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