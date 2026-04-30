// CloudMorph Frontend Application Logic

document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const dropZone = document.getElementById('drop-zone');
    const fileInput = document.getElementById('file-input');
    const filePreview = document.getElementById('file-preview');
    const fileName = document.getElementById('file-name');
    const fileSize = document.getElementById('file-size');
    const fileIcon = document.getElementById('file-icon');
    const removeFileBtn = document.getElementById('remove-file-btn');
    const uploadBtn = document.getElementById('upload-btn');
    const uploadBtnText = document.getElementById('upload-btn-text');
    const uploadBtnIcon = document.getElementById('upload-btn-icon');
    const statusContainer = document.getElementById('status-container');
    const statusText = document.getElementById('status-text');
    const statusPercentage = document.getElementById('status-percentage');
    const progressBar = document.getElementById('progress-bar');
    const errorMessage = document.getElementById('error-message');
    const errorText = document.getElementById('error-text');
    const resultsDashboard = document.getElementById('results-dashboard');
    const statsGrid = document.getElementById('stats-grid');
    const jsonViewer = document.getElementById('json-viewer');

    // Steps
    const steps = {
        url: document.getElementById('step-url'),
        upload: document.getElementById('step-upload'),
        process: document.getElementById('step-process'),
        done: document.getElementById('step-done')
    };

    // State
    let currentFile = null;
    const API_ENDPOINT = 'https://rii5cplnsk.execute-api.ap-south-1.amazonaws.com/get-upload-url';
    const S3_OUTPUT_BASE_URL = 'https://cloudmorph-output.s3.ap-south-1.amazonaws.com/processed'; // Assuming this based on common patterns

    // Helpers
    const formatBytes = (bytes, decimals = 2) => {
        if (!+bytes) return '0 Bytes';
        const k = 1024;
        const dm = decimals < 0 ? 0 : decimals;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
    };

    const getFileIcon = (type, name) => {
        if (type === 'application/pdf' || name.endsWith('.pdf')) return 'fa-file-pdf text-red-400';
        if (type === 'text/csv' || name.endsWith('.csv')) return 'fa-file-csv text-green-400';
        if (type === 'text/plain' || name.endsWith('.txt')) return 'fa-file-lines text-slate-400';
        return 'fa-file text-blue-400';
    };

    // File Selection Logic
    const handleFileSelect = (file) => {
        if (!file) return;

        const validTypes = ['.pdf', '.csv', '.txt'];
        const isValid = validTypes.some(ext => file.name.toLowerCase().endsWith(ext));

        if (!isValid) {
            showError('Invalid file type. Please upload a PDF, CSV, or TXT file.');
            return;
        }

        currentFile = file;
        
        // Update UI
        dropZone.classList.add('hidden');
        filePreview.classList.remove('hidden');
        filePreview.classList.add('flex');
        
        fileName.textContent = file.name;
        fileSize.textContent = formatBytes(file.size);
        fileIcon.className = `fa-solid ${getFileIcon(file.type, file.name)} text-xl`;

        uploadBtn.disabled = false;
        uploadBtnText.textContent = 'Upload to CloudMorph';
        uploadBtnIcon.classList.remove('hidden');
        
        hideError();
        resultsDashboard.classList.add('hidden');
        statusContainer.classList.add('hidden');
        resetSteps();
    };

    // Drag and Drop Events
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, preventDefaults, false);
    });

    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    ['dragenter', 'dragover'].forEach(eventName => {
        dropZone.addEventListener(eventName, () => {
            dropZone.classList.add('border-primary-500', 'bg-slate-800/50');
        }, false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, () => {
            dropZone.classList.remove('border-primary-500', 'bg-slate-800/50');
        }, false);
    });

    dropZone.addEventListener('drop', (e) => {
        const dt = e.dataTransfer;
        const files = dt.files;
        handleFileSelect(files[0]);
    });

    fileInput.addEventListener('change', function() {
        handleFileSelect(this.files[0]);
    });

    removeFileBtn.addEventListener('click', () => {
        currentFile = null;
        fileInput.value = '';
        dropZone.classList.remove('hidden');
        filePreview.classList.add('hidden');
        filePreview.classList.remove('flex');
        uploadBtn.disabled = true;
        uploadBtnText.textContent = 'Select a File';
        uploadBtnIcon.classList.add('hidden');
        hideError();
    });

    // Upload Logic
    const updateProgress = (percentage, text) => {
        statusPercentage.textContent = `${percentage}%`;
        progressBar.style.width = `${percentage}%`;
        if (text) statusText.textContent = text;
    };

    const updateStep = (stepName, status) => {
        const el = steps[stepName];
        const iconContainer = el.querySelector('div');
        const icon = el.querySelector('i');
        const text = el.querySelector('span');

        if (status === 'active') {
            iconContainer.className = 'w-6 h-6 rounded-full bg-primary-900/50 border border-primary-500 flex items-center justify-center';
            icon.className = icon.className.replace('text-slate-500', 'text-primary-400');
            if (stepName === 'process') icon.classList.add('fa-spin');
            text.className = 'text-primary-400 font-medium';
        } else if (status === 'done') {
            iconContainer.className = 'w-6 h-6 rounded-full bg-primary-500 border border-primary-500 flex items-center justify-center';
            icon.className = 'fa-solid fa-check text-[10px] text-white';
            text.className = 'text-slate-300';
        }
    };

    const resetSteps = () => {
        Object.keys(steps).forEach(key => {
            const el = steps[key];
            const iconContainer = el.querySelector('div');
            const icon = el.querySelector('i');
            const text = el.querySelector('span');
            
            iconContainer.className = 'w-6 h-6 rounded-full bg-slate-800 border border-slate-600 flex items-center justify-center';
            
            let originalIcon = '';
            if(key === 'url') originalIcon = 'fa-link';
            if(key === 'upload') originalIcon = 'fa-cloud-arrow-up';
            if(key === 'process') originalIcon = 'fa-microchip';
            if(key === 'done') originalIcon = 'fa-check';
            
            icon.className = `fa-solid ${originalIcon} text-[10px] text-slate-500`;
            text.className = 'text-slate-500';
        });
    };

    const showError = (message) => {
        errorText.textContent = message;
        errorMessage.classList.remove('hidden');
        statusContainer.classList.add('hidden');
        uploadBtn.disabled = false;
        uploadBtnText.textContent = 'Retry Upload';
    };

    const hideError = () => {
        errorMessage.classList.add('hidden');
    };

    const renderResults = (data) => {
        // Clear previous
        statsGrid.innerHTML = '';
        
        // Populate JSON viewer
        jsonViewer.textContent = JSON.stringify(data, null, 2);

        // Dynamically create stat cards based on data available
        const createStatCard = (label, value, icon, colorClass) => {
            const div = document.createElement('div');
            div.className = 'glass-card rounded-2xl p-6 border border-white/5 flex items-center gap-4 group hover:border-primary-500/30 transition-colors';
            div.innerHTML = `
                <div class="w-12 h-12 rounded-xl bg-slate-800 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                    <i class="fa-solid ${icon} ${colorClass} text-xl"></i>
                </div>
                <div>
                    <p class="text-sm text-slate-400 font-medium">${label}</p>
                    <h4 class="text-2xl font-bold text-white">${value}</h4>
                </div>
            `;
            statsGrid.appendChild(div);
        };

        // Extracted Stats (Mocking/Adapting based on expected API response format)
        // If data contains metadata:
        if (data.wordCount !== undefined) createStatCard('Word Count', data.wordCount.toLocaleString(), 'fa-pen-nib', 'text-primary-400');
        if (data.characterCount !== undefined) createStatCard('Character Count', data.characterCount.toLocaleString(), 'fa-font', 'text-blue-400');
        if (data.sentenceCount !== undefined) createStatCard('Sentence Count', data.sentenceCount.toLocaleString(), 'fa-align-left', 'text-purple-400');
        if (data.rows !== undefined) createStatCard('CSV Rows', data.rows.toLocaleString(), 'fa-table-cells', 'text-green-400');
        if (data.columns !== undefined) createStatCard('CSV Columns', data.columns.toLocaleString(), 'fa-table-columns', 'text-emerald-400');
        
        // Add File Size as a default stat
        createStatCard('File Size', formatBytes(currentFile.size), 'fa-hard-drive', 'text-slate-300');

        // Show dashboard
        resultsDashboard.classList.remove('hidden');
        resultsDashboard.scrollIntoView({ behavior: 'smooth' });
    };

    const pollForResult = async (filename, attempts = 0) => {
        if (attempts > 10) {
            showError('Processing timeout. The result could not be fetched.');
            return;
        }

        try {
            // S3 URL for processed output
            const resultUrl = `${S3_OUTPUT_BASE_URL}/uploads/${filename}.json`;
            const response = await fetch(resultUrl);
            
            if (response.ok) {
                const data = await response.json();
                updateStep('process', 'done');
                updateStep('done', 'active');
                updateProgress(100, 'Processing Complete!');
                setTimeout(() => updateStep('done', 'done'), 500);
                renderResults(data);
            } else if (response.status === 403 || response.status === 404) {
                // Still processing or not found yet
                setTimeout(() => pollForResult(filename, attempts + 1), 3000);
            } else {
                throw new Error('Failed to fetch results');
            }
        } catch (err) {
            console.error('Polling error:', err);
            // Since we don't have true access to the S3 bucket due to CORS or bucket policies,
            // the user might just want us to show the AWS Integration working up to the failure point.
            // If fetching S3 directly fails due to CORS or 403, we will handle it gracefully.
            showError(`Failed to fetch processed result: ${err.message}. (S3 Access might be restricted)`);
        }
    };

    uploadBtn.addEventListener('click', async () => {
        if (!currentFile) return;

        uploadBtn.disabled = true;
        hideError();
        statusContainer.classList.remove('hidden');
        
        try {
            // Step 1: Get Upload URL
            updateStep('url', 'active');
            updateProgress(10, 'Requesting signed URL...');
            
            const urlResponse = await fetch(API_ENDPOINT, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ fileName: currentFile.name })
            });

            const urlData = await urlResponse.json();

            if (!urlResponse.ok || !urlData.uploadUrl) {
                throw new Error(urlData.message || urlData.error || 'Failed to get upload URL');
            }

            updateStep('url', 'done');
            updateStep('upload', 'active');
            updateProgress(30, 'Uploading to S3...');

            // Step 2: Upload to S3 via pre-signed URL
            // Using XMLHttpRequest for upload progress tracking
            await new Promise((resolve, reject) => {
                const xhr = new XMLHttpRequest();
                
                xhr.upload.addEventListener('progress', (e) => {
                    if (e.lengthComputable) {
                        const percent = Math.round((e.loaded / e.total) * 100);
                        // Map 0-100% of upload to 30-70% of total progress
                        const totalPercent = 30 + Math.floor(percent * 0.4);
                        updateProgress(totalPercent, `Uploading... ${percent}%`);
                    }
                });

                xhr.addEventListener('load', () => {
                    if (xhr.status >= 200 && xhr.status < 300) {
                        resolve();
                    } else {
                        reject(new Error(`S3 Upload failed: ${xhr.statusText}`));
                    }
                });

                xhr.addEventListener('error', () => reject(new Error('Network error during S3 upload')));
                
                xhr.open('PUT', urlData.uploadUrl);
                // Important: S3 presigned URLs often require specific content types, but since we don't know the backend signature exactly, we might omit or send the exact one. 
                xhr.setRequestHeader('Content-Type', currentFile.type || 'application/octet-stream');
                xhr.send(currentFile);
            });

            updateStep('upload', 'done');
            updateStep('process', 'active');
            updateProgress(75, 'Processing file...');

            // Step 3: Fetch Processed Result
            // Assuming Lambda processes the file and saves it with original filename
            await pollForResult(currentFile.name);

        } catch (error) {
            console.error('Upload flow error:', error);
            showError(`AWS Integration Error: ${error.message}`);
            updateProgress(0, 'Upload failed');
        }
    });
});
