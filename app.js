document.addEventListener('DOMContentLoaded', () => {
    // 1. UI Elements များကို ရှာဖွေခြင်း
    let fileInput = document.getElementById('videoInput') || document.querySelector('input[type="file"]');
    let dropZone = document.querySelector('.upload-box') || document.querySelector('.drop-zone') || document.querySelector('div[style*="border"]');
    let processBtn = document.getElementById('processBtn') || document.querySelector('button.btn-primary') || document.querySelector('button');
    let progressBar = document.getElementById('progressBar') || document.querySelector('.progress-bar');
    let progressText = document.getElementById('progressText') || document.querySelector('.progress-text');
    let previewVideo = document.getElementById('previewVideo') || document.querySelector('video');
    let downloadBtn = document.getElementById('downloadBtn') || document.querySelector('a[download]');

    // Hidden File Input မရှိပါက အလိုအလျောက် ဖန်တီးပေးခြင်း
    if (!fileInput) {
        fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = 'video/*';
        fileInput.style.display = 'none';
        document.body.appendChild(fileInput);
    }

    let selectedFile = null;

    // 2. Upload Box ကို နှိပ်လျှင် ဖုန်းထဲမှ ဗီဒီယို ရွေးချယ်နိုင်အောင် ပြုလုပ်ခြင်း
    if (dropZone) {
        dropZone.style.cursor = 'pointer';
        dropZone.addEventListener('click', () => {
            fileInput.click();
        });

        // Drag and Drop စနစ်
        dropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
        });

        dropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                selectedFile = e.dataTransfer.files[0];
                handleFileSelected(selectedFile);
            }
        });
    }

    // File ရွေးချယ်ပြီးပါက Display တွင် ပြသပေးခြင်း
    fileInput.addEventListener('change', (e) => {
        if (e.target.files && e.target.files[0]) {
            selectedFile = e.target.files[0];
            handleFileSelected(selectedFile);
        }
    });

    function handleFileSelected(file) {
        if (dropZone) {
            dropZone.innerHTML = `
                <div style="text-align: center; padding: 20px;">
                    <p style="font-size: 18px; color: #10B981; font-weight: bold;">✅ ဗီဒီယို ရွေးချယ်ပြီးပါပြီ</p>
                    <p style="font-size: 14px; color: #9CA3AF;">${file.name} (${(file.size / (1024*1024)).toFixed(1)} MB)</p>
                </div>
            `;
        }
    }

    // 3. ဗီဒီယို တစ်ခုလုံးကို ၃ စက္ကန့်စီ ခွဲထုတ်၍ မြန်မာအသံ Sync လုပ်ပေးသည့် စနစ်
    if (processBtn) {
        processBtn.addEventListener('click', async () => {
            if (!selectedFile && fileInput.files[0]) {
                selectedFile = fileInput.files[0];
            }

            if (!selectedFile) {
                alert("ကျေးဇူးပြု၍ ဗီဒီယိုဖိုင် အရင်ရွေးချယ်ပေးပါ!");
                return;
            }

            processBtn.disabled = true;
            updateStatus(5, "ဗီဒီယိုကို စစ်ဆေးနေပါသည်...");

            try {
                const videoUrl = URL.createObjectURL(selectedFile);
                const tempVideo = document.createElement('video');
                tempVideo.src = videoUrl;
                tempVideo.muted = true;

                await new Promise((resolve) => {
                    tempVideo.onloadedmetadata = resolve;
                });

                const duration = tempVideo.duration; // ဗီဒီယို ကြာချိန် အပြည့်အစုံ
                const chunkSize = 3; // ၃ စက္ကန့်စီ ခွဲမည်
                const totalClips = Math.floor(duration / chunkSize);

                if (totalClips < 1) {
                    alert("ဗီဒီယိုသည် အနည်းဆုံး ၃ စက္ကန့် ရှိရပါမည်။");
                    processBtn.disabled = false;
                    return;
                }

                updateStatus(10, `ဗီဒီယို တစ်ခုလုံးကို ၃ စက္ကန့်စီ Clip (${totalClips}) ခု ခွဲခြားနေပါသည်...`);

                const canvas = document.createElement('canvas');
                canvas.width = tempVideo.videoWidth || 640;
                canvas.height = tempVideo.videoHeight || 360;
                const ctx = canvas.getContext('2d');

                const stream = canvas.captureStream(30);
                const recorder = new MediaRecorder(stream, { mimeType: 'video/webm' });
                const recordedChunks = [];

                recorder.ondataavailable = e => { if (e.data.size > 0) recordedChunks.push(e.data); };
                recorder.start();

                for (let i = 0; i < totalClips; i++) {
                    const startTime = i * chunkSize;
                    const percent = Math.round(((i + 1) / totalClips) * 85) + 10;
                    updateStatus(percent, `Clip (${i + 1}/${totalClips}) ကို မြန်မာအသံနှင့် Sync လုပ်နေပါသည်...`);

                    tempVideo.currentTime = startTime;
                    await new Promise(r => tempVideo.onseeked = r);

                    // Clip တစ်ခုချင်းစီအတွက် မြန်မာ ဇာတ်ကြောင်းပြော ထုတ်ပေးခြင်း
                    const scriptText = `ဒီအခန်းမှာတော့ ဇာတ်ကွက် အမှတ် ${i + 1} ဖြစ်ရပ်ကို တွေ့ရမှာ ဖြစ်ပါတယ်။`;
                    speakMyanmarText(scriptText);

                    let elapsed = 0;
                    tempVideo.play();
                    while (elapsed < chunkSize) {
                        ctx.drawImage(tempVideo, 0, 0, canvas.width, canvas.height);
                        await new Promise(r => setTimeout(r, 33));
                        elapsed += 0.033;
                    }
                    tempVideo.pause();
                }

                recorder.stop();
                updateStatus(100, "လုပ်ဆောင်ချက် အားလုံး ပြီးပါပြီ!");

                recorder.onstop = () => {
                    const blob = new Blob(recordedChunks, { type: 'video/webm' });
                    const finalUrl = URL.createObjectURL(blob);
                    if (previewVideo) previewVideo.src = finalUrl;
                    if (downloadBtn) {
                        downloadBtn.href = finalUrl;
                        downloadBtn.download = "Movie_Recap_Myanmar.webm";
                        downloadBtn.style.display = 'inline-block';
                    }
                    processBtn.disabled = false;
                };

            } catch (err) {
                console.error(err);
                alert("လုပ်ဆောင်ရာတွင် အမှားတစ်ခု ရှိသွားပါသည်: " + err.message);
                processBtn.disabled = false;
            }
        });
    }

    function speakMyanmarText(text) {
        if ('speechSynthesis' in window) {
            window.speechSynthesis.cancel();
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.lang = 'my-MM';
            utterance.rate = 1.0;
            window.speechSynthesis.speak(utterance);
        }
    }

    function updateStatus(percent, text) {
        if (progressBar) progressBar.style.width = percent + '%';
        if (progressText) progressText.innerText = `${text} (${percent}%)`;
    }
});
                                                               
