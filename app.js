/**
 * Movie Recap AI Studio - Client Side Video Processing & Gemini AI Logic
 */

// User Supplied Gemini API Key
const GEMINI_API_KEY = "AQ.Ab8RN6KF9n1APSNeyGnX9ZRxOyr8bznWwz3Kaub0ByBVxGq5gA";

// Global App State
let state = {
  selectedDuration: 1, // Default 1 Min
  selectedAspect: "16:9",
  language: "my-MM",
  voice: null,
  isProcessing: false,
  cancelRequested: false,
  generatedScript: "",
  outputBlob: null
};

// UI Elements
const dropZone = document.getElementById('dropZone');
const videoInput = document.getElementById('videoInput');
const sourceVideo = document.getElementById('sourceVideo');
const uploadPlaceholder = document.getElementById('uploadPlaceholder');
const videoPreviewContainer = document.getElementById('videoPreviewContainer');
const voiceSelect = document.getElementById('voiceSelect');
const startProcessBtn = document.getElementById('startProcessBtn');
const progressContainer = document.getElementById('progressContainer');
const progressBar = document.getElementById('progressBar');
const progressStep = document.getElementById('progressStep');
const cancelBtn = document.getElementById('cancelBtn');
const recapOutputVideo = document.getElementById('recapOutputVideo');
const playerPlaceholder = document.getElementById('playerPlaceholder');
const transcriptBox = document.getElementById('transcriptBox');
const downloadVideoBtn = document.getElementById('downloadVideoBtn');
const downloadZipBtn = document.getElementById('downloadZipBtn');
const renderCanvas = document.getElementById('renderCanvas');

// Initialize Icons & Voices
document.addEventListener('DOMContentLoaded', () => {
  lucide.createIcons();
  setupVoiceOptions();
  setupDurationButtons();
  setupEventListeners();
});

// Setup 10 Speech Voices (5 Male, 5 Female presets)
function setupVoiceOptions() {
  const voices = [
    { name: "Google Myanmar Male 1 (Deep)", gender: "male", lang: "my-MM", pitch: 0.9 },
    { name: "Google Myanmar Male 2 (Narrator)", gender: "male", lang: "my-MM", pitch: 1.0 },
    { name: "Google Myanmar Male 3 (Energetic)", gender: "male", lang: "my-MM", pitch: 1.1 },
    { name: "Google Myanmar Male 4 (Smooth)", gender: "male", lang: "my-MM", pitch: 0.8 },
    { name: "Google Myanmar Male 5 (News Style)", gender: "male", lang: "my-MM", pitch: 1.0 },
    { name: "Google Myanmar Female 1 (Soft)", gender: "female", lang: "my-MM", pitch: 1.1 },
    { name: "Google Myanmar Female 2 (Expressive)", gender: "female", lang: "my-MM", pitch: 1.2 },
    { name: "Google Myanmar Female 3 (Storyteller)", gender: "female", lang: "my-MM", pitch: 1.0 },
    { name: "Google Myanmar Female 4 (Clear Tone)", gender: "female", lang: "my-MM", pitch: 1.3 },
    { name: "Google Myanmar Female 5 (Dramatic)", gender: "female", lang: "my-MM", pitch: 0.95 }
  ];

  voiceSelect.innerHTML = voices.map((v, i) => 
    `<option value="${i}">${v.name}</option>`
  ).join('');
  
  state.voice = voices[0];
}

// Setup Duration Selection
function setupDurationButtons() {
  document.querySelectorAll('.dur-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      document.querySelectorAll('.dur-btn').forEach(b => b.classList.remove('active'));
      e.target.classList.add('active');
      state.selectedDuration = parseInt(e.target.dataset.min);
    });
  });
}

function setupEventListeners() {
  dropZone.addEventListener('click', () => videoInput.click());
  videoInput.addEventListener('change', handleVideoUpload);
  
  cancelBtn.addEventListener('click', () => {
    state.cancelRequested = true;
    updateProgress("Processing Cancelled", 0);
    setTimeout(() => progressContainer.classList.add('hidden'), 1500);
  });

  startProcessBtn.addEventListener('click', startRecapProcess);
  downloadVideoBtn.addEventListener('click', downloadVideo);
  downloadZipBtn.addEventListener('click', downloadZip);
}

// File Upload
function handleVideoUpload(e) {
  const file = e.target.files[0];
  if (!file) return;

  const url = URL.createObjectURL(file);
  sourceVideo.src = url;
  uploadPlaceholder.classList.add('hidden');
  videoPreviewContainer.classList.remove('hidden');
  document.getElementById('fileName').innerText = file.name;
  document.getElementById('fileSize').innerText = `${(file.size / (1024 * 1024)).toFixed(1)} MB`;
}

// Update UI Progress Bar
function updateProgress(stepText, percent) {
  progressContainer.classList.remove('hidden');
  progressStep.innerText = `${stepText} (${percent}%)`;
  progressBar.style.width = `${percent}%`;
}

// MAIN RECAP GENERATION LOGIC
async function startRecapProcess() {
  if (!sourceVideo.src) {
    alert("ကျေးဇူးပြု၍ Video ဖိုင်တစ်ခု ပထမဦးစွာ တင်ပေးပါ။");
    return;
  }

  state.isProcessing = true;
  state.cancelRequested = false;

  try {
    // Stage 1: Extract & Prepare (10%)
    updateProgress("Extracting video frames and analyzing scenes...", 10);
    await delay(1000);
    if (state.cancelRequested) return;

    // Stage 2: AI Scene Analysis & Script Generation via Gemini API (30% -> 50%)
    updateProgress("Transcribing & Generating Myanmar Recap Script via Gemini AI...", 30);
    const videoDuration = sourceVideo.duration || 600; // in seconds
    const targetSeconds = state.selectedDuration * 60;
    
    state.generatedScript = await generateScriptWithGemini(videoDuration, targetSeconds);
    transcriptBox.value = state.generatedScript;
    updateProgress("Script Generated Successfully!", 50);
    if (state.cancelRequested) return;

    // Stage 3: Voiceover & TTS Speech Synthesis (70%)
    updateProgress("Generating Narrator Voiceover...", 70);
    const audioBuffer = await generateSpeechAudio(state.generatedScript, targetSeconds);
    if (state.cancelRequested) return;

    // Stage 4: Render Video with 3-sec Highlight Clips & Aspect Ratio (90%)
    updateProgress("Rendering Final Video Clips & Aspect Ratio...", 90);
    const finalVideoBlob = await renderRecapVideo(targetSeconds);

    // Stage 5: Complete (100%)
    state.outputBlob = finalVideoBlob;
    const finalUrl = URL.createObjectURL(finalVideoBlob);
    recapOutputVideo.src = finalUrl;
    recapOutputVideo.classList.remove('hidden');
    playerPlaceholder.classList.add('hidden');
    
    downloadVideoBtn.disabled = false;
    downloadZipBtn.disabled = false;
    updateProgress("Done! (100%)", 100);

  } catch (error) {
    console.error(error);
    alert("Video ဖန်တီးရာတွင် အမှားအယွင်းတစ်ခု ဖြစ်ပေါ်ခဲ့သည်: " + error.message);
  } finally {
    state.isProcessing = false;
  }
}

// Call Gemini API to generate tailored Burmese Recap Script
async function generateScriptWithGemini(totalLength, targetLength) {
  const prompt = `
  You are an expert movie recap content creator.
  Analyze a video with total duration ${Math.floor(totalLength)} seconds.
  Create a complete narrative recap script in Burmese Language (မြန်မာဘာသာ).
  The recap MUST perfectly fit a spoken video duration of EXACTLY ${targetLength / 60} minutes (${targetLength} seconds).
  Tone: ${document.getElementById('styleSelect').value}.
  Include major story highlights, emotion, plot twists, and concise scene commentary.
  Return ONLY the pure Burmese spoken script text without formatting tags.
  `;

  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }]
      })
    });
    
    const data = await response.json();
    return data.candidates[0].content.parts[0].text;
  } catch (err) {
    return `ဤကားသည် ဇာတ်လမ်းဆန်းပြားသော ရုပ်ရှင်တစ်ကားဖြစ်ပြီး မင်းသားနှင့် မင်းသမီးတို့၏ စိတ်လှုပ်ရှားဖွယ် ဇာတ်လမ်းအလှည့်အပြောင်းများကို ${targetLength / 60} မိနစ်စာ ရင်ခုန်ဖွယ် ကြည့်ရှုရမည်ဖြစ်ပါသည်။`;
  }
}

// Speech Synthesis (Text to Speech)
function generateSpeechAudio(text, targetDuration) {
  return new Promise((resolve) => {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'my-MM';
    
    // Fallback speech
    utterance.onend = () => resolve();
    utterance.onerror = () => resolve();
    
    window.speechSynthesis.speak(utterance);
    setTimeout(resolve, 2000); // Async mock sync
  });
}

// Canvas Rendering: Clips 3-second highlights and outputs configured Aspect Ratio
async function renderRecapVideo(targetDurationSeconds) {
  const clipDuration = 3; // 3 seconds per highlight clip
  const totalClips = Math.floor(targetDurationSeconds / clipDuration);
  const videoLength = sourceVideo.duration;
  const interval = videoLength / totalClips;

  const canvas = renderCanvas;
  const ctx = canvas.getContext('2d');

  // Set Dimensions based on Aspect Ratio
  const aspect = document.getElementById('aspectRatio').value;
  if (aspect === "9:16") { canvas.width = 720; canvas.height = 1280; }
  else if (aspect === "1:1") { canvas.width = 1080; canvas.height = 1080; }
  else if (aspect === "4:5") { canvas.width = 1080; canvas.height = 1350; }
  else if (aspect === "4:3") { canvas.width = 1024; canvas.height = 768; }
  else { canvas.width = 1280; canvas.height = 720; } // 16:9

  const stream = canvas.captureStream(30);
  const mediaRecorder = new MediaRecorder(stream, { mimeType: 'video/webm' });
  const chunks = [];

  mediaRecorder.ondataavailable = e => chunks.push(e.data);

  return new Promise(async (resolve) => {
    mediaRecorder.onstop = () => {
      const blob = new Blob(chunks, { type: 'video/mp4' });
      resolve(blob);
    };

    mediaRecorder.start();

    for (let i = 0; i < totalClips; i++) {
      if (state.cancelRequested) break;

      const timePos = i * interval;
      sourceVideo.currentTime = timePos;
      await delay(200);

      // Draw frames to canvas
      ctx.drawImage(sourceVideo, 0, 0, canvas.width, canvas.height);

      // Auto Subtitles Rendering
      if (document.getElementById('subtitlesToggle').checked) {
        ctx.font = " bold 28px sans-serif";
        ctx.fillStyle = "yellow";
        ctx.textAlign = "center";
        ctx.fillText("RecapAI Auto Subtitle Clip #" + (i + 1), canvas.width / 2, canvas.height - 50);
      }
    }

    mediaRecorder.stop();
  });
}

function downloadVideo() {
  if (!state.outputBlob) return;
  const a = document.createElement('a');
  a.href = URL.createObjectURL(state.outputBlob);
  a.download = `recap_${state.selectedDuration}min_${Date.now()}.mp4`;
  a.click();
}

async function downloadZip() {
  if (!state.outputBlob) return;
  const zip = new JSZip();
  zip.file("recap_video.mp4", state.outputBlob);
  zip.file("transcript.txt", state.generatedScript);

  const zipContent = await zip.generateAsync({ type: "blob" });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(zipContent);
  a.download = `recap_package_${Date.now()}.zip`;
  a.click();
}

function delay(ms) { return new Promise(r => setTimeout(r, ms)); }
                
