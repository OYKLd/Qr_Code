class QRCodeScanner {
    constructor() {
        this.video = document.getElementById('video');
        this.canvas = document.getElementById('canvas');
        this.fileCanvas = document.getElementById('file-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.fileCtx = this.fileCanvas.getContext('2d');
        this.stream = null;
        this.scanning = false;
        
        this.initializeElements();
        this.attachEventListeners();
    }

    initializeElements() {
        this.startBtn = document.getElementById('start-camera');
        this.stopBtn = document.getElementById('stop-camera');
        this.fileInput = document.getElementById('file-input');
        this.uploadArea = document.getElementById('upload-area');
        this.previewContainer = document.getElementById('preview-container');
        this.previewImage = document.getElementById('preview-image');
        this.resultSection = document.getElementById('result-section');
        this.errorSection = document.getElementById('error-section');
        this.resultText = document.getElementById('result-text');
        this.errorText = document.getElementById('error-text');
        this.copyBtn = document.getElementById('copy-btn');
        this.clearBtn = document.getElementById('clear-btn');
        this.retryBtn = document.getElementById('retry-btn');
        this.tabBtns = document.querySelectorAll('.tab-btn');
        this.tabPanels = document.querySelectorAll('.tab-panel');
    }

    attachEventListeners() {
        this.startBtn.addEventListener('click', () => this.startCamera());
        this.stopBtn.addEventListener('click', () => this.stopCamera());
        this.copyBtn.addEventListener('click', () => this.copyResult());
        this.clearBtn.addEventListener('click', () => this.clearResult());
        this.retryBtn.addEventListener('click', () => this.hideError());

        this.tabBtns.forEach(btn => {
            btn.addEventListener('click', () => this.switchTab(btn.dataset.tab));
        });

        this.uploadArea.addEventListener('click', () => this.fileInput.click());
        this.fileInput.addEventListener('change', (e) => this.handleFileSelect(e));

        this.uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            this.uploadArea.classList.add('dragover');
        });

        this.uploadArea.addEventListener('dragleave', () => {
            this.uploadArea.classList.remove('dragover');
        });

        this.uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            this.uploadArea.classList.remove('dragover');
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                this.processFile(files[0]);
            }
        });
    }

    switchTab(tabName) {
        this.tabBtns.forEach(btn => btn.classList.remove('active'));
        this.tabPanels.forEach(panel => panel.classList.remove('active'));
        
        document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
        document.getElementById(`${tabName}-tab`).classList.add('active');

        if (tabName === 'camera') {
            this.stopCamera();
        } else {
            this.stopCamera();
        }
    }

    async startCamera() {
        try {
            this.stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'environment' }
            });
            
            this.video.srcObject = this.stream;
            this.startBtn.style.display = 'none';
            this.stopBtn.style.display = 'inline-block';
            
            this.video.addEventListener('loadedmetadata', () => {
                this.canvas.width = this.video.videoWidth;
                this.canvas.height = this.video.videoHeight;
                this.scanning = true;
                this.scanQRCode();
            });
        } catch (error) {
            this.showError('Impossible d\'accéder à la caméra. Veuillez vérifier les permissions.');
            console.error('Camera error:', error);
        }
    }

    stopCamera() {
        this.scanning = false;
        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
            this.stream = null;
        }
        this.video.srcObject = null;
        this.startBtn.style.display = 'inline-block';
        this.stopBtn.style.display = 'none';
    }

    scanQRCode() {
        if (!this.scanning) return;

        this.ctx.drawImage(this.video, 0, 0, this.canvas.width, this.canvas.height);
        const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
        
        const code = jsQR(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: 'dontInvert',
        });

        if (code) {
            this.showResult(code.data);
            this.stopCamera();
        } else {
            requestAnimationFrame(() => this.scanQRCode());
        }
    }

    handleFileSelect(event) {
        const file = event.target.files[0];
        if (file) {
            this.processFile(file);
        }
    }

    processFile(file) {
        if (!file.type.startsWith('image/')) {
            this.showError('Veuillez sélectionner un fichier image valide.');
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            this.previewImage.src = e.target.result;
            this.previewContainer.style.display = 'block';
            
            this.previewImage.onload = () => {
                this.scanImageFile();
            };
        };
        reader.readAsDataURL(file);
    }

    scanImageFile() {
        this.fileCanvas.width = this.previewImage.naturalWidth;
        this.fileCanvas.height = this.previewImage.naturalHeight;
        this.fileCtx.drawImage(this.previewImage, 0, 0);
        
        const imageData = this.fileCtx.getImageData(0, 0, this.fileCanvas.width, this.fileCanvas.height);
        
        const code = jsQR(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: 'dontInvert',
        });

        if (code) {
            this.showResult(code.data);
        } else {
            this.showError('Aucun QR code trouvé dans cette image. Veuillez essayer avec une autre image.');
        }
    }

    showResult(data) {
        this.resultText.textContent = data;
        this.resultSection.style.display = 'block';
        this.errorSection.style.display = 'none';
    }

    showError(message) {
        this.errorText.textContent = message;
        this.errorSection.style.display = 'block';
        this.resultSection.style.display = 'none';
    }

    hideError() {
        this.errorSection.style.display = 'none';
    }

    clearResult() {
        this.resultSection.style.display = 'none';
        this.errorSection.style.display = 'none';
        this.previewContainer.style.display = 'none';
        this.fileInput.value = '';
        this.stopCamera();
    }

    async copyResult() {
        try {
            await navigator.clipboard.writeText(this.resultText.textContent);
            
            const originalText = this.copyBtn.textContent;
            this.copyBtn.textContent = 'Copié!';
            this.copyBtn.disabled = true;
            
            setTimeout(() => {
                this.copyBtn.textContent = originalText;
                this.copyBtn.disabled = false;
            }, 2000);
        } catch (error) {
            this.showError('Impossible de copier le résultat. Veuillez copier manuellement.');
            console.error('Copy error:', error);
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new QRCodeScanner();
});
