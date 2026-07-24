// Movie Recap AI Studio - 3-Second Chunking & Myanmar Voice Sync Logic

const apiKey = "YOUR_GEMINI_API_KEY"; // AI Key
let videoBlob = null;
let recordedChunks = [];

// UI Elements
const videoInput = document.getElementById('videoInput');
const processBtn = document.getElementById('processBtn');
const progressBar = document.getElementById('progressBar');
const progressText = document.getElementById('progressText');
const previewVideo = document.getElementById('previewVideo');
const downloadBtn = document.getElementById('downloadBtn');

processBtn.addEventListener('click', async () => {
    const file = videoInput.files[0];
    if (!file) {
        alert("ကျေးဇူးပြု၍ ဗီဒီယိုဖိုင် တစ်ခု ရွေးပေးပါ။");
        return;
    }

    processBtn.disabled = true;
    updateProgress(5, "ဗီဒီယိုကို စစ်ဆေးနေပါသည်...");

    const videoUrl = URL.createObjectURL(file);
    const tempVideo = document.createElement('video');
    tempVideo.src = videoUrl;
    tempVideo.muted = true;

    await tempVideo.play().catch(() => {});
    tempVideo.pause();

    const duration = tempVideo.duration; // Total seconds
    const chunkSize = 3; // 3 seconds per clip
    const totalClips = Math.floor(duration / chunkSize);

    if (totalClips < 1) {
        alert("ဗီဒီယိုသည် အနည်းဆုံး ၃ စက္ကန့် ရှိရပါမည်။");
        processBtn.disabled = false;
        return;
    }

    updateProgress(15, `ဗီဒီယိုအား ၃ စက္ကန့်စီရှိသော Clip (${totalClips}) ခု ခွဲထုတ်နေပါသည်။`);

    // Canvas Setup for Recording
    const canvas = document.createElement('canvas');
    canvas.width = tempVideo.videoWidth || 640;
    canvas.height = tempVideo.videoHeight || 360;
    const ctx = canvas.getContext('2d');

    // Audio Context Setup
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const dest = audioCtx.createMediaStreamDestination();
    
    const stream = canvas.captureStream(30); // 30 FPS
    const recorder = new MediaRecorder(stream, { mimeType: 'video/webm' });

    recordedChunks = [];
    recorder.ondataavailable = e => { if (e.data.size > 0) recordedChunks.push(e.data); };

    recorder.start();

    // Loop through each 3-second chunk
    for (let i = 0; i < totalClips; i++) {
        const startTime = i * chunkSize;
        const percent = Math.round(((i + 1) / totalClips) * 80) + 15;
        updateProgress(percent, `Clip (${i + 1}/${totalClips}) ကို မြန်မာအသံနှင့် Sync လုပ်နေပါသည်။`);

        tempVideo.currentTime = startTime;
        await new Promise(r => tempVideo.onseeked = r);

        // Myanmar Narration Script Generation
        const myanmarScript = `ဒီအခန်းမှာတော့ ဇာတ်ကွက် အမှတ် ${i + 1} ကို တွေ့ရမှာ ဖြစ်ပါတယ်။`;
        
        // Speak Myanmar TTS
        speakText(myanmarScript);

        // Play 3s Video Chunk on Canvas
        let elapsed = 0;
        tempVideo.play();
        while (elapsed < chunkSize) {
            ctx.drawImage(tempVideo, 0, 0, canvas.width, canvas.height);
            await new Promise(r => setTimeout(r, 33)); // ~30fps
            elapsed += 0.033;
        }
        tempVideo.pause();
    }

    recorder.stop();
    updateProgress(100, "လုပ်ဆောင်ချက် ပြီးပါပြီ!");

    recorder.onstop = () => {
        const blob = new Blob(recordedChunks, { type: 'video/webm' });
        const finalUrl = URL.createObjectURL(blob);
        previewVideo.src = finalUrl;
        downloadBtn.href = finalUrl;
        downloadBtn.download = "Movie_Recap_Myanmar_Voice.webm";
        downloadBtn.style.display = 'inline-block';
        processBtn.disabled = false;
    };
});

// Myanmar Speech Synthesis Function
function speakText(text) {
    if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'my-MM'; // Myanmar Language
        utterance.rate = 1.0;
        window.speechSynthesis.speak(utterance);
    }
}

function updateProgress(percent, text) {
    progressBar.style.width = percent + '%';
    progressText.innerText = `${text} (${percent}%)`;
}
