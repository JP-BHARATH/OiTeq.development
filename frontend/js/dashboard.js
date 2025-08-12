// dashboard.js
document.addEventListener('DOMContentLoaded', () => {
    const userDisplay = document.getElementById('user-display');
    const logoutButton = document.getElementById('logout-button');
    const uploadForm = document.getElementById('upload-form');
    const fileInput = document.getElementById('file-input');
    const fileNameDisplay = document.getElementById('file-name-display');
    const uploadMessage = document.getElementById('upload-message');
    const filesList = document.getElementById('files-list');
    const listMessage = document.getElementById('list-message');
    const searchInput = document.getElementById('search-input');
    const fileTypeFilter = document.getElementById('file-type-filter');
    const fileSizeFilter = document.getElementById('file-size-filter');
    const startDateFilter = document.getElementById('start-date-filter');
    const endDateFilter = document.getElementById('end-date-filter');
    const refreshFilesButton = document.getElementById('refresh-files-button');
    const deleteSelectedBtn = document.getElementById('deleteSelectedBtn');
    const restoreSelectedBtn = document.getElementById('restoreSelectedBtn');
    const selectedFilesCount = document.getElementById('selectedFilesCount');

    // Preview Modal Elements
    const previewModal = document.getElementById('file-preview-modal');
    const previewFilename = document.getElementById('preview-filename');
    const previewArea = document.getElementById('preview-area');
    const closePreviewModal = document.getElementById('close-preview-modal');

    let allFiles = []; // Store all fetched files

    // --- Utility Functions ---

    // Function to get the user token from local storage
    const getToken = () => {
        return localStorage.getItem('token');
    };

    // Function to show a temporary message
    const showMessage = (element, message, isError = false) => {
        element.textContent = message;
        element.style.color = isError ? 'var(--danger-red)' : 'var(--white)';
        setTimeout(() => {
            element.textContent = '';
        }, 5000);
    };

    // Function to format file size
    const formatSize = (bytes) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    // --- User Authentication and Profile ---

    const fetchUserProfile = async () => {
        const token = getToken();
        if (!token) {
            window.location.href = '/login.html';
            return;
        }
        try {
            const res = await fetch('/api/profile', {
                method: 'GET',
                headers: {
                    'x-auth-token': token,
                },
            });
            if (res.status === 401) {
                window.location.href = '/login.html';
                return;
            }
            const data = await res.json();
            userDisplay.textContent = `Welcome, ${data.username}!`;
        } catch (error) {
            console.error('Error fetching user profile:', error);
            window.location.href = '/login.html';
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('token');
        window.location.href = '/login.html';
    };

    // --- File Operations ---

    const fetchFiles = async () => {
        const token = getToken();
        if (!token) return;

        try {
            listMessage.textContent = 'Fetching files...';
            const res = await fetch('/api/files', {
                method: 'GET',
                headers: {
                    'x-auth-token': token,
                },
            });
            const data = await res.json();
            if (res.ok) {
                allFiles = data;
                displayFiles(allFiles);
            } else {
                showMessage(listMessage, data.message || 'Failed to fetch files.', true);
            }
        } catch (error) {
            console.error('Error fetching files:', error);
            showMessage(listMessage, 'Server error fetching files.', true);
        }
    };

    const displayFiles = (files) => {
        filesList.innerHTML = '';
        if (files.length === 0) {
            listMessage.textContent = 'No files found.';
            return;
        }
        listMessage.textContent = '';

        files.forEach(file => {
            const row = document.createElement('tr');
            row.dataset.fileId = file._id;
            
            const fileDate = new Date(file.uploadDate).toLocaleString();

            row.innerHTML = `
                <td><input type="checkbox" class="file-checkbox"></td>
                <td><i class="${getFileIcon(file.mimetype)}"></i> ${file.originalName}</td>
                <td>${formatSize(file.size)}</td>
                <td>${fileDate}</td>
                <td class="file-actions">
                    <button class="btn-action preview-btn" data-file-id="${file._id}" data-file-name="${file.originalName}">
                        <i class="fas fa-eye"></i>
                        <span>Preview</span>
                    </button>
                    <a href="/api/files/download/${file._id}" class="btn-action restore-btn" download>
                        <i class="fas fa-download"></i>
                        <span>Restore</span>
                    </a>
                    <button class="btn-action delete-btn" data-file-id="${file._id}">
                        <i class="fas fa-trash"></i>
                        <span>Delete</span>
                    </button>
                </td>
            `;
            filesList.appendChild(row);
        });
    };

    const handleFileDelete = async (fileId) => {
        const token = getToken();
        if (!token) return;

        if (confirm('Are you sure you want to delete this file?')) {
            try {
                const res = await fetch(`/api/files/${fileId}`, {
                    method: 'DELETE',
                    headers: {
                        'x-auth-token': token,
                    },
                });
                const data = await res.json();
                if (res.ok) {
                    showMessage(listMessage, data.message);
                    fetchFiles(); // Refresh the file list
                } else {
                    showMessage(listMessage, data.message || 'Failed to delete file.', true);
                }
            } catch (error) {
                console.error('Error deleting file:', error);
                showMessage(listMessage, 'Server error deleting file.', true);
            }
        }
    };

    // --- Upload Handlers ---

    fileInput.addEventListener('change', () => {
        const file = fileInput.files[0];
        if (file) {
            fileNameDisplay.textContent = file.name;
        } else {
            fileNameDisplay.textContent = 'No file chosen';
        }
    });

    uploadForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const token = getToken();
        if (!token) {
            showMessage(uploadMessage, 'You must be logged in to upload files.', true);
            return;
        }

        const formData = new FormData();
        for (const file of fileInput.files) {
            formData.append('files', file);
        }

        try {
            showMessage(uploadMessage, 'Uploading files...', false);
            const res = await fetch('/api/files/upload', {
                method: 'POST',
                headers: {
                    'x-auth-token': token,
                },
                body: formData,
            });
            const data = await res.json();
            if (res.ok) {
                showMessage(uploadMessage, data.message);
                fileInput.value = '';
                fileNameDisplay.textContent = 'No file chosen';
                fetchFiles();
            } else {
                showMessage(uploadMessage, data.message || 'File upload failed.', true);
            }
        } catch (error) {
            console.error('Error during upload:', error);
            showMessage(uploadMessage, 'Server error during upload.', true);
        }
    });

    // --- Filtering and Searching ---

    const applyFilters = () => {
        const searchTerm = searchInput.value.toLowerCase();
        const fileType = fileTypeFilter.value;
        const fileSizeRange = fileSizeFilter.value;
        const startDate = startDateFilter.value ? new Date(startDateFilter.value) : null;
        const endDate = endDateFilter.value ? new Date(endDateFilter.value) : null;

        const filteredFiles = allFiles.filter(file => {
            const matchesSearch = file.originalName.toLowerCase().includes(searchTerm);

            const fileTypeMatch = !fileType || getFileTypeCategory(file.mimetype) === fileType;

            let fileSizeMatch = true;
            const sizeInMB = file.size / (1024 * 1024);
            if (fileSizeRange === 'small') fileSizeMatch = sizeInMB < 1;
            else if (fileSizeRange === 'medium') fileSizeMatch = sizeInMB >= 1 && sizeInMB <= 10;
            else if (fileSizeRange === 'large') fileSizeMatch = sizeInMB > 10;

            const uploadDate = new Date(file.uploadDate);
            let dateMatch = true;
            if (startDate && uploadDate < startDate) dateMatch = false;
            if (endDate && uploadDate > endDate) dateMatch = false;
            
            return matchesSearch && fileTypeMatch && fileSizeMatch && dateMatch;
        });

        displayFiles(filteredFiles);
    };

    const getFileTypeCategory = (mimetype) => {
        if (mimetype.startsWith('image/')) return 'image';
        if (mimetype.startsWith('video/')) return 'video';
        if (mimetype.startsWith('audio/')) return 'audio';
        if (mimetype.startsWith('application/pdf') || mimetype.startsWith('text/')) return 'document';
        if (['application/zip', 'application/x-rar-compressed'].includes(mimetype)) return 'archive';
        return 'other';
    };
    
    // Attach filter event listeners
    searchInput.addEventListener('input', applyFilters);
    fileTypeFilter.addEventListener('change', applyFilters);
    fileSizeFilter.addEventListener('change', applyFilters);
    startDateFilter.addEventListener('change', applyFilters);
    endDateFilter.addEventListener('change', applyFilters);
    refreshFilesButton.addEventListener('click', () => {
        fetchFiles();
    });

    // --- Bulk Actions ---

    const updateBulkActionButtons = () => {
        const checkboxes = document.querySelectorAll('.file-checkbox:checked');
        const count = checkboxes.length;
        selectedFilesCount.textContent = `${count} file(s) selected.`;
        if (count > 0) {
            deleteSelectedBtn.style.display = 'inline-flex';
            restoreSelectedBtn.style.display = 'inline-flex';
        } else {
            deleteSelectedBtn.style.display = 'none';
            restoreSelectedBtn.style.display = 'none';
        }
    };

    filesList.addEventListener('change', (e) => {
        if (e.target.classList.contains('file-checkbox')) {
            updateBulkActionButtons();
        }
    });

    // --- File Icon Mapping ---

    const getFileIcon = (mimeType) => {
        if (mimeType.startsWith('image/')) return 'fas fa-file-image';
        if (mimeType.startsWith('video/')) return 'fas fa-file-video';
        if (mimeType.startsWith('audio/')) return 'fas fa-file-audio';
        if (mimeType === 'application/pdf') return 'fas fa-file-pdf';
        if (mimeType === 'application/zip' || mimeType === 'application/x-rar-compressed') return 'fas fa-file-archive';
        if (mimeType.startsWith('text/')) return 'fas fa-file-alt';
        return 'fas fa-file';
    };

    // --- Preview Modal Functionality ---

    const showFilePreview = async (fileId, fileName) => {
        const fileExtension = fileName.split('.').pop().toLowerCase();
        previewFilename.textContent = fileName;
        previewArea.innerHTML = ''; // Clear previous content
        previewModal.style.display = 'flex'; // Show the modal

        try {
            const token = getToken();
            const res = await fetch(`/api/files/download/${fileId}`, {
                headers: { 'x-auth-token': token }
            });

            if (!res.ok) {
                previewArea.innerHTML = '<p>Error: Could not load file preview.</p>';
                throw new Error('Failed to fetch file for preview');
            }

            if (['jpg', 'jpeg', 'png', 'gif'].includes(fileExtension)) {
                const img = document.createElement('img');
                img.src = `/api/files/download/${fileId}`;
                img.alt = fileName;
                previewArea.appendChild(img);
            } else if (['mp4', 'webm', 'ogg'].includes(fileExtension)) {
                const video = document.createElement('video');
                video.src = `/api/files/download/${fileId}`;
                video.controls = true;
                previewArea.appendChild(video);
            } else if (['txt', 'log', 'md', 'json', 'js', 'html', 'css'].includes(fileExtension)) {
                const text = await res.text();
                const pre = document.createElement('pre');
                pre.textContent = text;
                previewArea.appendChild(pre);
            } else {
                previewArea.innerHTML = `<p>Preview not available for this file type. <a href="/api/files/download/${fileId}" download>Click here to download.</a></p>`;
            }

        } catch (error) {
            console.error('Preview error:', error);
            previewArea.innerHTML = `<p>Error loading preview. <a href="/api/files/download/${fileId}" download>Click here to download.</a></p>`;
        }
    };
    
    // Event listener for all dynamically created buttons
    filesList.addEventListener('click', (e) => {
        const target = e.target;
        const button = target.closest('.btn-action');
        if (!button) return;

        const fileId = button.dataset.fileId;

        if (button.classList.contains('delete-btn')) {
            e.preventDefault(); // Prevent default link behavior
            handleFileDelete(fileId);
        } else if (button.classList.contains('preview-btn')) {
            e.preventDefault();
            const fileName = button.dataset.fileName;
            showFilePreview(fileId, fileName);
        }
    });

    closePreviewModal.addEventListener('click', () => {
        previewModal.style.display = 'none';
    });

    // Close modal if user clicks outside of it
    window.addEventListener('click', (event) => {
        if (event.target === previewModal) {
            previewModal.style.display = 'none';
        }
    });

    // --- Initialization ---
    fetchUserProfile();
    fetchFiles();
    logoutButton.addEventListener('click', handleLogout);
});