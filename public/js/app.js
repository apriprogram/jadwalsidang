// --- Global Modal Functions (Available Immediately) ---
window.openModal = (modal) => {
    if (!modal) return;

    // Close any other open modals first
    document.querySelectorAll('.fixed.inset-0.z-\\[200\\]').forEach(m => {
        if (m !== modal && !m.classList.contains('hidden')) {
            m.classList.add('hidden');
        }
    });

    modal.classList.remove('hidden');
    const content = modal.querySelector('.modal-content');
    if (content) {
        content.classList.remove('animate-modal-out');
        content.classList.add('animate-modal-in');
    }
};

window.closeModalFunc = (modal) => {
    if (!modal) return;
    const content = modal.querySelector('.modal-content');
    if (content) {
        content.classList.remove('animate-modal-in');
        content.classList.add('animate-modal-out');
        setTimeout(() => {
            modal.classList.add('hidden');
        }, 300);
    } else {
        modal.classList.add('hidden');
    }
};


window.viewUserDetails = (id) => {
    if (!window.allUsers) return;
    const user = window.allUsers.find(u => u.id == id);
    if (user) {
        document.getElementById('detail-name').textContent = user.name;
        document.getElementById('detail-username').textContent = `@${user.username}`;
        document.getElementById('detail-status').textContent = user.status || 'Active';
        document.getElementById('detail-role').textContent = user.role || 'User';
        document.getElementById('detail-phone').textContent = user.phone || '-';
        document.getElementById('detail-instansi').textContent = user.instansi || '-';

        // Show password only for Super Admin
        const passContainer = document.getElementById('detail-password-container');
        if (window.currentUser && window.currentUser.role === 'Super Admin') {
            document.getElementById('detail-password').textContent = user.password;
            passContainer.classList.remove('hidden');
        } else {
            passContainer.classList.add('hidden');
        }

        document.getElementById('detail-photo').src = user.photo || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=0D8ABC&color=fff`;
        const date = new Date(user.id);
        document.getElementById('detail-date').textContent = !isNaN(date) ? date.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : '-';
        window.openModal(document.getElementById('detail-modal'));
    }
};

window.deleteUser = (id) => {
    if (window.currentUser && window.currentUser.id == id) {
        showToast('Anda tidak dapat menghapus akun Anda sendiri.', 'error');
        return;
    }
    window.userIdToDelete = id;
    const user = window.allUsers.find(u => u.id == id);
    if (user) {
        document.getElementById('delete-user-name').textContent = user.name;
        window.openModal(document.getElementById('modal-hapus-user'));
    }
};

window.handleConfirmUserDelete = async () => {
    if (!window.userIdToDelete) return;
    try {
        const updatedUsers = window.allUsers.filter(u => u.id != window.userIdToDelete);
        const res = await fetch('/api/users', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updatedUsers)
        });
        if (!res.ok) throw new Error("Gagal menghapus user");

        window.closeModalFunc(document.getElementById('modal-hapus-user'));
        showToast('User berhasil dihapus', 'success');

        // Refresh list without reloading
        if (window.loadUsersList) window.loadUsersList();
    } catch (err) {
        showToast(err.message, 'error');
    }
};

let tempViewProfilePhoto = null;

function loadProfileData() {
    if (!window.currentUser) return;
    const user = window.currentUser;
    const fullNameInput = document.getElementById('view-full-name');
    const usernameInput = document.getElementById('view-username');
    const phoneInput = document.getElementById('view-phone');
    const instansiInput = document.getElementById('view-instansi');
    const previewImg = document.getElementById('view-profile-preview');
    const roleBadge = document.getElementById('view-profile-role-badge');
    const passwordInput = document.getElementById('view-profile-password');

    if (fullNameInput) fullNameInput.value = user.name || '';
    if (usernameInput) usernameInput.value = user.username || '';
    if (phoneInput) phoneInput.value = user.phone || '';
    if (instansiInput) instansiInput.value = user.instansi || '';
    if (previewImg) previewImg.src = user.photo || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=random&color=fff`;
    if (roleBadge) roleBadge.textContent = user.role || 'User';
    if (passwordInput) passwordInput.value = ''; 
    tempViewProfilePhoto = user.photo;
}


document.addEventListener('DOMContentLoaded', () => {
    // --- State (Global & Local) ---
    window.tableData = window.tableData || [];
    window.tableHeaders = window.tableHeaders || [];
    window.allUsers = window.allUsers || [];
    window.currentUser = window.currentUser || null;
    window.userIdToDelete = null;

    // Alias for easier access within this scope
    let tableData = [];
    let tableHeaders = [];
    let allUsers = [];
    let currentUser = null;

    let tempUserPhoto = null;
    let tempEditPhoto = null;

    // --- Selectors ---

    // View Containers
    const views = {
        jadwalsidang: document.getElementById('view-dashboard'),
        users: document.getElementById('view-users'),
        'edit-profile': document.getElementById('view-edit-profile'),
        help: document.getElementById('view-help')
    };

    // Dashboard Elements
    const excelUpload = document.getElementById('excel-upload');
    const tableHeader = document.getElementById('table-header');
    const tableBody = document.getElementById('table-body');
    const clearDataBtn = document.getElementById('clear-data-btn');
    const downloadPdfBtn = document.getElementById('download-pdf');
    const searchInput = document.getElementById('search-table');
    const totalPerkaraEl = document.getElementById('total-perkara');
    const ruanganAktifEl = document.getElementById('ruangan-aktif');
    const lastUpdateEl = document.getElementById('last-update');

    // Profile & Top Bar
    const welcomeName = document.getElementById('welcome-name');
    const adminNameEl = document.getElementById('admin-name');
    const userAvatar = document.getElementById('user-avatar');

    // Notifications
    const notifBtn = document.getElementById('notification-btn');
    const notifDropdown = document.getElementById('notification-dropdown');

    const tableFullscreenBtn = document.getElementById('table-fullscreen-btn');
    const tablePanel = document.getElementById('table-panel');
    const themeToggle = document.getElementById('theme-toggle');
    const themeIconDark = document.getElementById('theme-icon-dark');
    const themeIconLight = document.getElementById('theme-icon-light');

    // Theme Logic
    const setTheme = (isDark) => {
        if (isDark) {
            document.body.classList.add('dark-mode');
            themeIconDark.classList.remove('hidden');
            themeIconLight.classList.add('hidden');
            localStorage.setItem('theme', 'dark');
        } else {
            document.body.classList.remove('dark-mode');
            themeIconDark.classList.add('hidden');
            themeIconLight.classList.remove('hidden');
            localStorage.setItem('theme', 'light');
        }
    };

    // Initialize Theme
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    setTheme(savedTheme === 'dark' || (!savedTheme && prefersDark));

    if (themeToggle) {
        themeToggle.addEventListener('click', () => {
            setTheme(!document.body.classList.contains('dark-mode'));
        });
    }

    // Sidebar Logic
    const sidebarToggle = document.getElementById('sidebar-toggle');
    const sidebar = document.querySelector('.sidebar');

    if (sidebarToggle && sidebar) {
        sidebarToggle.addEventListener('click', (e) => {
            e.stopPropagation();
            if (window.innerWidth <= 768) {
                sidebar.classList.toggle('mobile-open');
                // Close notifications if sidebar is opened on mobile
                if (sidebar.classList.contains('mobile-open')) {
                    if (notifDropdown && !notifDropdown.classList.contains('hidden')) {
                        toggleDropdown(notifDropdown, false);
                    }
                    if (profileMenu && !profileMenu.classList.contains('hidden')) {
                        toggleDropdown(profileMenu, false);
                    }
                }
            } else {
                sidebar.classList.toggle('collapsed');
            }
        });
    }

    // Close sidebar on mobile when clicking outside
    document.addEventListener('click', (e) => {
        if (window.innerWidth <= 768 && sidebar && sidebar.classList.contains('mobile-open')) {
            if (!sidebar.contains(e.target) && e.target !== sidebarToggle) {
                sidebar.classList.remove('mobile-open');
            }
        }
    });

    // Close sidebar on mobile after clicking a link
    document.querySelectorAll('.view-link').forEach(link => {
        link.addEventListener('click', () => {
            if (window.innerWidth <= 768 && sidebar) {
                sidebar.classList.remove('mobile-open');
            }
        });
    });

    // Fullscreen Logic
    if (tableFullscreenBtn && tablePanel) {
        tableFullscreenBtn.addEventListener('click', () => {
            if (!document.fullscreenElement) {
                tablePanel.requestFullscreen().catch(err => {
                    console.error(`Error attempting to enable fullscreen: ${err.message}`);
                });
            } else {
                if (document.exitFullscreen) {
                    document.exitFullscreen();
                }
            }
        });
    }
    const profileTrigger = document.getElementById('profile-trigger');
    const profileMenu = document.getElementById('profile-menu');
    const logoutBtnDropdown = document.getElementById('logout-btn-dropdown');

    // Users View Elements
    const userTableBody = document.getElementById('user-table-body');
    const addUserBtn = document.getElementById('add-user-btn-view');
    const userModal = document.getElementById('user-modal');
    const sidangModal = document.getElementById('sidang-modal'); // We will add this to index.html
    const sidangForm = document.getElementById('sidang-form');
    const userForm = document.getElementById('user-form');
    const closeModal = document.getElementById('close-modal');

    // Edit Profile Form
    const editProfileForm = document.getElementById('edit-profile-form');
    const editFullName = document.getElementById('edit-full-name');
    const editUsername = document.getElementById('edit-username');
    const editPassword = document.getElementById('edit-password');

    // Photo & Preview Elements
    const editProfilePhoto = document.getElementById('edit-profile-photo');
    const editProfilePreview = document.getElementById('edit-profile-preview');
    const newUserPhoto = document.getElementById('new-user-photo');
    const newUserPreview = document.getElementById('new-user-preview');

    let currentDayTab = 'Semua';
    let currentNotifFilter = 'all';

    // --- Initialization ---
    async function init() {
        console.log("Initializing App...");
        try { await loadCurrentUser(); } catch (e) { console.error(e); }
        try { await loadSidangData(); } catch (e) { console.error(e); }
        try { await loadLogsData(); } catch (e) { console.error(e); }
        setupEventListeners();
        handleInitialRouting();
    }

    async function loadCurrentUser() {
        const username = localStorage.getItem('currentUsername') || 'admin';
        try {
            const res = await fetch('/api/users');
            if (!res.ok) throw new Error("Failed to fetch users");
            allUsers = await res.json();
            window.allUsers = allUsers;
            currentUser = allUsers.find(u => u.username === username) || allUsers[0];
            window.currentUser = currentUser;

            if (currentUser) {
                if (welcomeName) welcomeName.textContent = currentUser.name;
                if (adminNameEl) adminNameEl.textContent = currentUser.name;

                const adminRoleEl = document.getElementById('admin-role');
                if (adminRoleEl) adminRoleEl.textContent = currentUser.role || 'User';

                // Log Login if it's a new session
                if (!sessionStorage.getItem('loginLogged')) {
                    addActivityLog('Masuk ke Dashboard', 'login');
                    sessionStorage.setItem('loginLogged', 'true');
                    console.log("Login log added.");
                }

                // Hide Management menu for non-admins
                const managementLink = document.querySelector('.view-link[data-view="users"]');
                if (managementLink) {
                    managementLink.style.display = (currentUser.role === 'Super Admin') ? 'flex' : 'none';
                }

                // Hide notification for non-Super Admin
                const notifWrapper = document.getElementById('notification-btn').parentElement;
                if (notifWrapper) {
                    notifWrapper.style.display = (currentUser.role === 'Super Admin') ? 'block' : 'none';
                }

                if (userAvatar) {
                    userAvatar.src = currentUser.photo || `https://ui-avatars.com/api/?name=${encodeURIComponent(currentUser.name)}&background=0D8ABC&color=fff`;
                }
                
                // Sync profile view data immediately
                loadProfileData();

                // Compatibility with old modal if it still exists
                if (editFullName) editFullName.value = currentUser.name;
                if (editUsername) editUsername.value = currentUser.username;
                const editPhone = document.getElementById('edit-phone');
                const editInstansi = document.getElementById('edit-instansi');
                if (editPhone) editPhone.value = currentUser.phone || '';
                if (editInstansi) editInstansi.value = currentUser.instansi || '';
                if (editProfilePreview) {
                    editProfilePreview.src = currentUser.photo || `https://ui-avatars.com/api/?name=${encodeURIComponent(currentUser.name)}&background=0D8ABC&color=fff`;
                }
            }
        } catch (err) {
            console.error(err);
            showToast('Gagal memuat profil.', 'error');
        }
    }

    async function loadSidangData() {
        console.log("Fetching sidang data...");
        try {
            const res = await fetch('/api/sidang');
            if (!res.ok) throw new Error("Failed to fetch sidang data");
            const data = await res.json();

            // Update local scope variables
            tableData = data.data || [];
            tableHeaders = data.headers || [];

            // Sync with window scope for other global components if needed
            window.tableData = tableData;
            window.tableHeaders = tableHeaders;

            console.log("Data loaded successfully:", tableData.length, "rows");
            renderTable();
            updateStats();
        } catch (err) {
            console.error("Error loading sidang data:", err);
            showToast('Gagal memuat jadwal sidang.', 'error');
        }
    }

    // --- SPA Routing Logic ---
    function switchView(viewId) {
        console.log("Switching to view:", viewId);
        if (viewId === 'edit-profile') {
            loadProfileData();
        }

        if (viewId === 'users' && currentUser && currentUser.role !== 'Super Admin') {
            showToast('Akses ditolak. Hanya Super Admin yang dapat mengakses menu ini.', 'error');
            return;
        }

        Object.keys(views).forEach(id => {
            if (views[id]) views[id].classList.add('hidden');
        });
        if (views[viewId]) {
            views[viewId].classList.remove('hidden');
        }

        document.querySelectorAll('.view-link').forEach(link => {
            if (link.getAttribute('data-view') === viewId) {
                link.classList.add('active');
            } else {
                link.classList.remove('active');
            }
        });

        if (viewId === 'users') loadUsersList();
    }

    // Expose switchView globally for inline onclick
    window.switchView = (viewId) => {
        switchView(viewId);
        // Ensure profile menu is closed after selection
        if (profileMenu) profileMenu.classList.add('hidden');
    };

    function handleInitialRouting() {
        const urlParams = new URLSearchParams(window.location.search);
        const view = urlParams.get('view') || 'jadwalsidang';
        switchView(view);
    }

    // --- Event Listeners Setup ---
    function setupEventListeners() {
        document.querySelectorAll('.view-link').forEach(link => {
            link.onclick = (e) => {
                const viewId = link.getAttribute('data-view');
                switchView(viewId);
                profileMenu.classList.add('hidden');
            };
        });

        // Toggle profile menu on click
        profileTrigger.onclick = (e) => {
            e.stopPropagation();
            const isHidden = profileMenu.classList.contains('hidden');
            // Close notification menu if open
            if (typeof notifDropdown !== 'undefined' && notifDropdown) toggleDropdown(notifDropdown, false);
            toggleDropdown(profileMenu, isHidden);
        };

        // Unified Global Click for Dropdowns
        document.addEventListener('click', (e) => {
            // Close profile menu if clicking outside
            if (profileTrigger && !profileTrigger.contains(e.target)) {
                toggleDropdown(profileMenu, false);
            }
            // Close notification menu if clicking outside
            if (notifDropdown && !notifDropdown.contains(e.target) && e.target !== notifBtn) {
                toggleDropdown(notifDropdown, false);
            }
        });

        searchInput.oninput = () => renderTable();
        excelUpload.onchange = handleExcelUpload;

        if (downloadPdfBtn) downloadPdfBtn.onclick = handleDownloadPdf;
        
        // View Profile Event Listeners
        const viewProfilePhotoInput = document.getElementById('view-profile-photo');
        if (viewProfilePhotoInput) {
            viewProfilePhotoInput.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (file) {
                    const reader = new FileReader();
                    reader.onload = (event) => {
                        tempViewProfilePhoto = event.target.result;
                        document.getElementById('view-profile-preview').src = tempViewProfilePhoto;
                    };
                    reader.readAsDataURL(file);
                }
            });
        }

        const editProfileViewForm = document.getElementById('edit-profile-view-form');
        if (editProfileViewForm) {
            editProfileViewForm.onsubmit = async (e) => {
                e.preventDefault();
                if (!window.currentUser) return;

                const updatedUser = {
                    ...window.currentUser,
                    name: document.getElementById('view-full-name').value,
                    username: document.getElementById('view-username').value,
                    phone: document.getElementById('view-phone').value,
                    instansi: document.getElementById('view-instansi').value,
                    photo: tempViewProfilePhoto
                };

                const newPass = document.getElementById('view-profile-password').value;
                if (newPass) updatedUser.password = newPass;

                try {
                    const res = await fetch('/api/users');
                    const users = await res.json();
                    const updatedUsers = users.map(u => u.id === updatedUser.id ? updatedUser : u);

                    const saveRes = await fetch('/api/users', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(updatedUsers)
                    });

                    if (!saveRes.ok) throw new Error("Gagal menyimpan profil");

                    window.currentUser = updatedUser;
                    localStorage.setItem('currentUser', JSON.stringify(updatedUser));
                    localStorage.setItem('currentUsername', updatedUser.username);
                    
                    if (welcomeName) welcomeName.textContent = updatedUser.name;
                    if (adminNameEl) adminNameEl.textContent = updatedUser.name;
                    if (userAvatar) userAvatar.src = updatedUser.photo || `https://ui-avatars.com/api/?name=${encodeURIComponent(updatedUser.name)}&background=random&color=fff`;

                    showToast('Profil berhasil diperbarui!', 'success');
                    addActivityLog(`Memperbarui profil: ${updatedUser.name}`, 'system');
                } catch (err) {
                    console.error(err);
                    showToast('Gagal memperbarui profil.', 'error');
                }
            };
        }

        const clearAllDataBtn = document.getElementById('clear-all-data-btn');
        const modalClearAll = document.getElementById('modal-clear-all');
        const confirmClearAll = document.getElementById('confirm-clear-all');
        const cancelClearAll = document.getElementById('cancel-clear-all');

        if (clearAllDataBtn) clearAllDataBtn.onclick = () => openModal(modalClearAll);
        if (cancelClearAll) cancelClearAll.onclick = () => closeModalFunc(modalClearAll);
        if (confirmClearAll) confirmClearAll.onclick = async () => {
            try {
                if (currentDayTab === 'Semua') {
                    const emptyData = { headers: [], data: [] };
                    const res = await fetch('/api/sidang', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(emptyData)
                    });
                    if (!res.ok) throw new Error("Gagal menghapus data di server");

                    tableData = [];
                    tableHeaders = [];
                    window.tableData = [];
                    window.tableHeaders = [];
                    showToast('Semua data berhasil dihapus', 'success');
                    addActivityLog('Menghapus semua data jadwal sidang', 'system');
                } else {
                    const dateColIdx = tableHeaders.findIndex(h => h && h.toString().toLowerCase().includes('tanggal'));
                    if (dateColIdx !== -1) {
                        const targetDay = currentDayTab.toLowerCase();
                        const getDayName = (dateStr) => {
                            dateStr = (dateStr || '').toString().toLowerCase();
                            const daysOfWeek = ['minggu', 'senin', 'selasa', 'rabu', 'kamis', 'jumat', 'sabtu'];
                            if (dateStr.includes('jumat') || dateStr.includes('jum\'at')) return 'jumat';
                            for (const d of daysOfWeek) {
                                if (dateStr.includes(d)) return d;
                            }
                            const parsedDate = new Date(dateStr.replace(/jan|feb|mar|apr|mei|jun|jul|agu|sep|okt|nov|des/i, m => ({ mei: 'may', agu: 'aug', okt: 'oct', des: 'dec' }[m] || m)));
                            if (!isNaN(parsedDate)) return daysOfWeek[parsedDate.getDay()];
                            return null;
                        };

                        const newData = tableData.filter(row => {
                            const day = getDayName(row[dateColIdx]);
                            return day !== targetDay; 
                        });

                        const res = await fetch('/api/sidang', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ headers: tableHeaders, data: newData })
                        });
                        if (!res.ok) throw new Error("Gagal menghapus data di server");

                        tableData = newData;
                        window.tableData = newData;
                        showToast(`Data hari ${currentDayTab} berhasil dihapus`, 'success');
                        addActivityLog(`Menghapus data jadwal sidang hari ${currentDayTab}`, 'system');
                    }
                }

                renderTable();
                updateStats();
                closeModalFunc(modalClearAll);
            } catch (err) {
                console.error(err);
                showToast('Gagal menghapus data.', 'error');
            }
        };

        if (addUserBtn) addUserBtn.onclick = () => {
            const m = document.getElementById('user-modal');
            m.querySelector('h3').textContent = 'User Baru';
            userForm.reset();
            newUserPreview.src = `https://ui-avatars.com/api/?name=User&background=random&color=fff`;
            tempUserPhoto = null;
            syncCustomDropdown('new-status', 'Active');
            syncCustomDropdown('new-role', 'User');
            userForm.onsubmit = handleAddUser;
            openModal(m);
        };

        const addSidangBtn = document.getElementById('add-sidang-btn');
        if (addSidangBtn) addSidangBtn.onclick = () => {
            document.getElementById('sidang-modal-title').textContent = 'Tambah Data Sidang';
            generateSidangFields();
            sidangForm.onsubmit = (e) => handleSidangSubmit(e);
            openModal(sidangModal);
        };
        if (closeModal) closeModal.onclick = () => closeModalFunc(userModal);
        if (userForm) userForm.onsubmit = handleAddUser;

        const detailModal = document.getElementById('detail-modal');
        const closeDetailBtn = document.getElementById('close-detail-modal');
        if (closeDetailBtn) closeDetailBtn.onclick = () => closeModalFunc(detailModal);

        const cancelUserDeleteBtn = document.getElementById('cancel-user-delete');
        const confirmUserDeleteBtn = document.getElementById('confirm-user-delete');
        if (cancelUserDeleteBtn) cancelUserDeleteBtn.onclick = () => closeModalFunc(document.getElementById('modal-hapus-user'));
        if (confirmUserDeleteBtn) confirmUserDeleteBtn.onclick = handleConfirmUserDelete;

        // Close buttons for user modal
        document.querySelectorAll('.close-user-modal').forEach(btn => {
            btn.onclick = () => closeModalFunc(userModal);
        });

        // Close button for edit profile modal
        const closeEditProfileBtn = document.getElementById('close-edit-profile-modal');
        if (closeEditProfileBtn) closeEditProfileBtn.onclick = () => closeModalFunc(document.getElementById('edit-profile-modal'));

        newUserPhoto.onchange = async (e) => {
            const file = e.target.files[0];
            if (file) {
                tempUserPhoto = await fileToDataURL(file);
                newUserPreview.src = tempUserPhoto;
            }
        };

        editProfilePhoto.onchange = async (e) => {
            const file = e.target.files[0];
            if (file) {
                tempEditPhoto = await fileToDataURL(file);
                editProfilePreview.src = tempEditPhoto;
            }
        };

        // --- Drag & Drop for Import Zone ---
        const importZone = document.getElementById('import-zone');
        const imagePreviewModal = document.getElementById('image-preview-modal');
        const largeImagePreview = document.getElementById('large-image-preview');
        const closeImagePreview = document.getElementById('close-image-preview');
        const detailPhoto = document.getElementById('detail-photo');

        if (detailPhoto && imagePreviewModal && largeImagePreview) {
            detailPhoto.onclick = () => {
                largeImagePreview.src = detailPhoto.src;
                openModal(imagePreviewModal);
            };
        }

        if (imagePreviewModal) {
            imagePreviewModal.onclick = () => closeModalFunc(imagePreviewModal);
            if (closeImagePreview) closeImagePreview.onclick = () => closeModalFunc(imagePreviewModal);
        }
        if (importZone) {
            ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
                importZone.addEventListener(eventName, (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                }, false);
            });

            ['dragenter', 'dragover'].forEach(eventName => {
                importZone.addEventListener(eventName, () => {
                    importZone.classList.add('drag-over');
                }, false);
            });

            ['dragleave', 'drop'].forEach(eventName => {
                importZone.addEventListener(eventName, () => {
                    importZone.classList.remove('drag-over');
                }, false);
            });

            importZone.addEventListener('drop', (e) => {
                const dt = e.dataTransfer;
                const file = dt.files[0];
                if (file) {
                    // Check file extension
                    const ext = file.name.split('.').pop().toLowerCase();
                    if (['xlsx', 'xls'].includes(ext)) {
                        handleExcelUpload({ target: { files: [file] } });
                    } else {
                        showToast('Hanya file Excel yang diperbolehkan.', 'error');
                    }
                }
            }, false);
        }

        // --- Notification Event Listeners ---
        if (notifBtn) {
            notifBtn.onclick = (e) => {
                e.stopPropagation();
                const isHidden = notifDropdown.classList.contains('hidden');

                // Close sidebar on mobile if opening notifications
                if (isHidden && window.innerWidth <= 768 && sidebar && sidebar.classList.contains('mobile-open')) {
                    sidebar.classList.remove('mobile-open');
                }

                // Close profile menu if open
                if (profileMenu) toggleDropdown(profileMenu, false);

                toggleDropdown(notifDropdown, isHidden);
                if (isHidden) { // If it was hidden, it's now showing
                    markNotificationsRead();
                    renderNotificationList(false);
                }
            };
        }
        const clearNotifBtn = document.getElementById('clear-notif');
        if (clearNotifBtn) {
            clearNotifBtn.onclick = async (e) => {
                e.stopPropagation();
                console.log("Clearing all notifications...");
                try {
                    const res = await fetch('/api/logs', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify([])
                    });
                    if (!res.ok) throw new Error("Gagal menghapus log di server");
                    
                    localStorage.setItem('activity_logs', '[]');
                    renderNotificationList();
                    updateNotificationBadge();
                    showToast('Riwayat notifikasi telah dihapus.');
                } catch (err) {
                    console.error(err);
                    showToast('Gagal menghapus riwayat notifikasi.', 'error');
                }
            };
        }
        // Handled by unified listener at the top
        /*
        document.addEventListener('click', (e) => {
            if (notifDropdown && !notifDropdown.contains(e.target) && e.target !== notifBtn) {
                notifDropdown.classList.remove('show');
            }
        });
        */

        updateNotificationBadge();
        renderNotificationList();

        // Day Tab listeners
        document.querySelectorAll('.day-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                document.querySelectorAll('.day-tab').forEach(t => {
                    t.classList.remove('active');
                    t.classList.add('text-slate-500', 'dark:text-slate-400');
                });
                tab.classList.add('active');
                tab.classList.remove('text-slate-500', 'dark:text-slate-400');
                
                currentDayTab = tab.dataset.day;
                renderTable();
                updateStats();
            });
        });

        // Notification Tab listeners
        document.querySelectorAll('.notif-tab').forEach(tab => {
            tab.onclick = (e) => {
                e.stopPropagation();
                document.querySelectorAll('.notif-tab').forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                currentNotifFilter = tab.dataset.filter;
                renderNotificationList();
            };
        });
    }

    function getFilteredData() {
        const query = searchInput ? searchInput.value.toLowerCase() : '';
        const dateColIdx = tableHeaders.findIndex(h => h && h.toString().toLowerCase().includes('tanggal'));

        return tableData.filter(row => {
            // 1. Filter by search query
            const matchesQuery = row.some(cell => (cell || '').toString().toLowerCase().includes(query));
            if (!matchesQuery) return false;

            // 2. Filter by Day Tab
            if (currentDayTab === 'Semua') return true;
            if (dateColIdx === -1) return true;
            
            const dateStr = (row[dateColIdx] || '').toString().toLowerCase();
            const targetDay = currentDayTab.toLowerCase();
            
            // 1. String inclusion check
            if (targetDay === 'jumat' && (dateStr.includes('jumat') || dateStr.includes('jum\'at'))) {
                return true;
            }
            if (dateStr.includes(targetDay)) {
                return true;
            }

            // 2. Fallback date parsing (e.g., for "29 Apr 2026" lacking a weekday prefix)
            // Replace common indonesian month abbreviations if needed, though 'Apr' works in JS
            const parsedDate = new Date(dateStr.replace(/jan|feb|mar|apr|mei|jun|jul|agu|sep|okt|nov|des/i, match => {
                const map = { mei: 'may', agu: 'aug', okt: 'oct', des: 'dec' };
                return map[match.toLowerCase()] || match;
            }));
            
            if (!isNaN(parsedDate)) {
                const daysOfWeek = ['minggu', 'senin', 'selasa', 'rabu', 'kamis', 'jumat', 'sabtu'];
                const parsedDay = daysOfWeek[parsedDate.getDay()];
                if (targetDay === 'jumat' && parsedDay === 'jumat') return true;
                if (parsedDay === targetDay) return true;
            }
            
            return false;
        });
    }

    // --- Animation Helpers ---
    function toggleDropdown(el, show) {
        if (!el) return;
        if (show) {
            el.classList.remove('hidden', 'dropdown-animate-out');
            el.classList.add('dropdown-animate-in');
        } else {
            if (el.classList.contains('dropdown-animate-in')) {
                el.classList.remove('dropdown-animate-in');
                el.classList.add('dropdown-animate-out');
                setTimeout(() => {
                    el.classList.add('hidden');
                    el.classList.remove('dropdown-animate-out');
                }, 200);
            } else {
                el.classList.add('hidden');
            }
        }
    }

    // --- Notification Logic ---
    async function addActivityLog(action, type = 'info') {
        const user = window.currentUser || currentUser;
        if (!user) {
            console.warn("Cannot add log: No current user identified.");
            return;
        }

        console.log(`Logging activity: ${action} [${type}] for ${user.name}`);

        let logs = [];
        try {
            const res = await fetch('/api/logs');
            if (res.ok) logs = await res.json();
        } catch (e) { logs = JSON.parse(localStorage.getItem('activity_logs') || '[]'); }

        const newLog = {
            id: Date.now(),
            user: user.name,
            role: user.role,
            action: action,
            type: type, // login, upload, download, system
            time: new Date().toISOString(),
            read: false
        };
        logs.unshift(newLog);
        const finalLogs = logs.slice(0, 50);
        localStorage.setItem('activity_logs', JSON.stringify(finalLogs));

        // Sync with server
        try {
            await fetch('/api/logs', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(finalLogs)
            });
        } catch (e) { console.error("Failed to sync log to server:", e); }

        updateNotificationBadge();
        renderNotificationList();
    }
    window.addActivityLog = addActivityLog;

    window.handleLogout = async () => {
        await addActivityLog('Keluar dari aplikasi', 'login');
        localStorage.clear();
        sessionStorage.clear();
        window.location.href = 'login.html';
    };

    function updateNotificationBadge() {
        const logs = JSON.parse(localStorage.getItem('activity_logs') || '[]');
        const unreadCount = logs.filter(l => !l.read).length;
        const badge = document.getElementById('notif-badge');
        if (badge) {
            if (unreadCount > 0) badge.classList.remove('hidden');
            else badge.classList.add('hidden');
        }
    }

    async function markNotificationsRead() {
        const logs = JSON.parse(localStorage.getItem('activity_logs') || '[]');
        const updated = logs.map(l => ({ ...l, read: true }));
        localStorage.setItem('activity_logs', JSON.stringify(updated));
        updateNotificationBadge();
        
        try {
            await fetch('/api/logs', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updated)
            });
        } catch (e) { console.error("Failed to sync read status to server:", e); }
    }

    async function loadLogsData() {
        try {
            const res = await fetch('/api/logs');
            if (res.ok) {
                const logs = await res.json();
                localStorage.setItem('activity_logs', JSON.stringify(logs));
                renderNotificationList();
                updateNotificationBadge();
            }
        } catch (e) {
            console.error("Failed to load logs from server:", e);
        }
    }

    function renderNotificationList(shouldAnimate = true) {
        const list = document.getElementById('notification-list');
        if (!list) {
            console.error("Notification list element not found!");
            return;
        }

        let logs = [];
        try {
            logs = JSON.parse(localStorage.getItem('activity_logs') || '[]');
        } catch (e) {
            console.error("Failed to parse activity logs:", e);
            logs = [];
        }

        console.log(`Rendering ${logs.length} notification items with filter: ${currentNotifFilter}`);

        // Animation trigger - only if requested (to avoid double animation on dropdown open)
        if (shouldAnimate) {
            list.classList.remove('notif-animate');
            void list.offsetWidth; // force reflow
            list.classList.add('notif-animate');
        }

        // Filtering logic
        const now = new Date();
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const thisWeekStart = new Date(todayStart);
        thisWeekStart.setDate(todayStart.getDate() - 7);

        let filteredLogs = logs;
        if (currentNotifFilter === 'today') {
            filteredLogs = logs.filter(log => new Date(log.time) >= todayStart);
        } else if (currentNotifFilter === 'this-week') {
            filteredLogs = logs.filter(log => {
                const logDate = new Date(log.time);
                return logDate >= thisWeekStart && logDate < todayStart;
            });
        } else if (currentNotifFilter === 'earlier') {
            filteredLogs = logs.filter(log => new Date(log.time) < thisWeekStart);
        }

        if (!Array.isArray(filteredLogs) || filteredLogs.length === 0) {
            list.innerHTML = `<div class="py-10 px-4 text-center text-slate-400">
                <svg class="w-8 h-8 mx-auto mb-2 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
                <p class="text-[10px]">Tidak ada notifikasi untuk kategori ini.</p>
            </div>`;
            return;
        }

        list.innerHTML = filteredLogs.map((log, index) => {
            let icon = '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>';
            let iconBg = 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400';

            if (log.type === 'upload') {
                icon = '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>';
                iconBg = 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400';
            } else if (log.type === 'download') {
                icon = '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" /></svg>';
                iconBg = 'bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400';
            } else if (log.type === 'login') {
                icon = '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" /></svg>';
                iconBg = 'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/20 dark:text-indigo-400';
            } else if (log.type === 'system') {
                icon = '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>';
                iconBg = 'bg-rose-50 text-rose-600 dark:bg-rose-900/20 dark:text-rose-400';
            }

            let timeLabel = 'Baru saja';
            try {
                if (log.time) {
                    timeLabel = new Date(log.time).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
                }
            } catch (e) { console.error("Date formatting error:", e); }

            return `
                <div class="notification-item ${!log.read ? 'unread' : ''}">
                    <div class="flex gap-3">
                        <div class="log-icon ${iconBg}">${icon}</div>
                        <div class="flex-1">
                            <p class="text-[11px] font-semibold action-text leading-tight">${log.action}</p>
                            <p class="text-[9px] text-slate-500 mt-1">
                                <span class="font-bold text-slate-400">${timeLabel}</span>
                                <span class="mx-1 opacity-30">•</span>
                                <span>${log.user} (${log.role})</span>
                            </p>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }

    // --- Core Handlers ---

    async function handleExcelUpload(e) {
        const file = e.target.files[0];
        if (!file) return;

        const overlay = document.getElementById('progress-overlay');
        if (overlay) overlay.classList.remove('hidden');

        const reader = new FileReader();
        reader.onload = async (event) => {
            try {
                const data = new Uint8Array(event.target.result);
                const workbook = XLSX.read(data, { type: 'array', cellDates: true });
                const worksheet = workbook.Sheets[workbook.SheetNames[0]];
                const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

                if (!jsonData || jsonData.length === 0) throw new Error("File Excel kosong atau tidak terbaca.");

                let hIdx = 0;
                while (hIdx < jsonData.length && (!jsonData[hIdx] || !jsonData[hIdx].some(c => c))) hIdx++;

                if (hIdx >= jsonData.length) throw new Error("Tidak dapat menemukan baris judul di Excel.");

                const rawHeaders = jsonData[hIdx].map(h => h ? h.toString().trim() : "");
                const rawRows = jsonData.slice(hIdx + 1).filter(r => r && r.some(c => c));

                const processedRows = rawRows.map(row => {
                    return rawHeaders.map((_, i) => {
                        let val = row[i];
                        if (val instanceof Date) {
                            // Automatically include the day of the week (e.g. "Senin, 29 Apr 2026")
                            return val.toLocaleDateString('id-ID', { weekday: 'long', day: '2-digit', month: 'short', year: 'numeric' });
                        }
                        return (val !== undefined && val !== null) ? val.toString().trim() : '';
                    });
                });

                // --- MERGING LOGIC: Only overwrite data for the days present in the uploaded file ---
                const dateColIdx = rawHeaders.findIndex(h => h && h.toString().toLowerCase().includes('tanggal'));
                let finalDataToSave = processedRows;

                if (dateColIdx !== -1) {
                    const getDayName = (dateStr) => {
                        dateStr = (dateStr || '').toString().toLowerCase();
                        const daysOfWeek = ['minggu', 'senin', 'selasa', 'rabu', 'kamis', 'jumat', 'sabtu'];
                        if (dateStr.includes('jumat') || dateStr.includes('jum\'at')) return 'jumat';
                        for (const d of daysOfWeek) {
                            if (dateStr.includes(d)) return d;
                        }
                        const parsedDate = new Date(dateStr.replace(/jan|feb|mar|apr|mei|jun|jul|agu|sep|okt|nov|des/i, m => ({ mei: 'may', agu: 'aug', okt: 'oct', des: 'dec' }[m] || m)));
                        if (!isNaN(parsedDate)) return daysOfWeek[parsedDate.getDay()];
                        return null;
                    };

                    // Identify which days are present in the new upload
                    const uploadedDays = new Set();
                    processedRows.forEach(row => {
                        const d = getDayName(row[dateColIdx]);
                        if (d) uploadedDays.add(d);
                    });

                    // Retain existing rows that belong to days NOT in the uploaded file
                    const oldDateColIdx = tableHeaders.findIndex(h => h && h.toString().toLowerCase().includes('tanggal'));
                    const retainedRows = [];
                    if (oldDateColIdx !== -1 && tableData && tableData.length > 0) {
                        tableData.forEach(row => {
                            const oldDay = getDayName(row[oldDateColIdx]);
                            // If we can't identify the old day, or it's not one of the uploaded days, keep it
                            if (!oldDay || !uploadedDays.has(oldDay)) {
                                retainedRows.push(row);
                            }
                        });
                    }

                    // Combine retained rows + new processed rows
                    finalDataToSave = [...retainedRows, ...processedRows];
                    
                    // Optional: Sort data by date (Senin to Jumat)
                    const dayOrder = { 'senin': 1, 'selasa': 2, 'rabu': 3, 'kamis': 4, 'jumat': 5, 'sabtu': 6, 'minggu': 7 };
                    finalDataToSave.sort((a, b) => {
                        const dayA = getDayName(a[dateColIdx]) || 'minggu';
                        const dayB = getDayName(b[dateColIdx]) || 'minggu';
                        return (dayOrder[dayA] || 99) - (dayOrder[dayB] || 99);
                    });
                }

                const res = await fetch('/api/sidang', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ headers: rawHeaders, data: finalDataToSave })
                });

                if (res.ok) {
                    tableHeaders = rawHeaders;
                    tableData = finalDataToSave;
                    renderTable();
                    updateStats();
                    addActivityLog('Berhasil mengimpor jadwal sidang', 'upload');
                    showToast('Data berhasil diimpor.', 'success');
                } else {
                    throw new Error("Gagal menyimpan data ke server.");
                }
            } catch (err) {
                console.error(err);
                alert("Kesalahan: " + err.message);
                showToast('Gagal memproses excel.', 'error');
            } finally {
                if (overlay) overlay.classList.add('hidden');
                excelUpload.value = '';
            }
        };
        reader.readAsArrayBuffer(file);
    }


    async function handleEditProfile(e) {
        e.preventDefault();
        const updatedUser = {
            ...currentUser,
            name: editFullName.value,
            username: editUsername.value,
            phone: document.getElementById('edit-phone').value,
            instansi: document.getElementById('edit-instansi').value,
            photo: tempEditPhoto || currentUser.photo
        };
        if (editPassword.value) updatedUser.password = editPassword.value;

        const updatedUsers = allUsers.map(u => u.id === currentUser.id ? updatedUser : u);

        try {
            const res = await fetch('/api/users', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updatedUsers)
            });
            if (res.ok) {
                allUsers = updatedUsers;
                window.allUsers = updatedUsers;
                currentUser = updatedUser;
                window.currentUser = updatedUser;

                addActivityLog('Memperbarui profil admin', 'system');
                localStorage.setItem('currentUsername', currentUser.username);
                adminNameEl.textContent = currentUser.name;
                welcomeName.textContent = currentUser.name;
                userAvatar.src = currentUser.photo || `https://ui-avatars.com/api/?name=${encodeURIComponent(currentUser.name)}&background=0D8ABC&color=fff`;
                showToast('Profil berhasil diperbarui.');
                editPassword.value = '';
                tempEditPhoto = null;
                closeModalFunc(document.getElementById('edit-profile-modal'));
            }
        } catch (err) { showToast('Gagal memperbarui profil.', 'error'); }
    }

    async function handleAddUser(e) {
        e.preventDefault();
        const newUser = {
            id: Date.now(),
            name: document.getElementById('new-full-name').value,
            username: document.getElementById('new-username').value,
            password: document.getElementById('new-password').value,
            status: document.getElementById('new-status').value,
            role: document.getElementById('new-role').value,
            phone: document.getElementById('new-phone').value,
            instansi: document.getElementById('new-instansi').value,
            photo: tempUserPhoto
        };

        const updatedUsers = [...allUsers, newUser];
        try {
            const res = await fetch('/api/users', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updatedUsers)
            });
            if (res.ok) {
                allUsers = updatedUsers;
                window.allUsers = updatedUsers;
                addActivityLog(`Menambah user baru: ${newUser.name}`, 'system');
                loadUsersList();
                closeModalFunc(userModal);
                userForm.reset();
                tempUserPhoto = null;
                showToast('User berhasil ditambahkan.');
            }
        } catch (err) { showToast('Gagal menambahkan user.', 'error'); }
    }

    async function loadUsersList() {
        try {
            const res = await fetch('/api/users');
            allUsers = await res.json();
            window.allUsers = allUsers; // Sync with global scope
            userTableBody.innerHTML = allUsers.map((u, i) => `
                <tr class="animate-fade-in align-middle">
                    <td class="w-16 text-slate-400 font-medium">${i + 1}</td>
                    <td class="w-24 text-center">
                        <div class="flex justify-center">
                             <img src="${u.photo || `https://ui-avatars.com/api/?name=${encodeURIComponent(u.name)}&background=random&color=fff`}" 
                                  class="w-10 h-10 border-2 border-white shadow-sm rounded-[10px] object-cover user-table-photo" alt="Avatar">
                        </div>
                    </td>
                    <td class="font-semibold text-slate-700">${u.name}</td>
                    <td class="text-slate-500 text-sm">${u.username}</td>
                    <td class="w-32">
                        <span class="px-3 py-1 ${u.role === 'Super Admin' ? 'bg-indigo-50 text-indigo-600' : 'bg-slate-100 text-slate-600'} rounded-full text-[10px] font-semibold uppercase tracking-wider whitespace-nowrap">
                            ${u.role || 'User'}
                        </span>
                    </td>
                    <td class="text-sm text-slate-500">${u.phone || '-'}</td>
                    <td class="text-sm text-slate-500">${u.instansi || '-'}</td>
                    <td class="w-32">
                        <span class="px-3 py-1 ${u.status === 'Inactive' ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'} rounded-full text-[10px] font-semibold uppercase tracking-wider">
                            ${u.status || 'Active'}
                        </span>
                    </td>
                    <td class="w-32 text-center">
                        <div class="flex justify-center items-center gap-1">
                            <button onclick="window.viewUserDetails('${u.id}')" 
                                class="p-2 text-slate-400 hover:text-blue-600 transition-all" title="Lihat Detail">
                                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                </svg>
                            </button>
                            <button onclick="window.editUserDetails('${u.id}')" 
                                class="p-2 text-slate-400 hover:text-amber-500 transition-all" title="Edit">
                                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                            </button>
                            <button onclick="window.deleteUser('${u.id}')" 
                                class="p-2 text-slate-400 hover:text-rose-600 transition-all" title="Hapus">
                                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                            </button>
                        </div>
                    </td>
                </tr>
            `).join('');
        } catch (err) { console.error(err); }
    }
    window.loadUsersList = loadUsersList;

    // viewUserDetails is defined globally at the top of this file

    window.editUserDetails = (id) => {
        const user = allUsers.find(u => u.id == id);
        if (user) {
            document.getElementById('new-full-name').value = user.name;
            document.getElementById('new-username').value = user.username;
            document.getElementById('new-password').value = '';
            newUserPreview.src = user.photo || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=random&color=fff`;
            tempUserPhoto = user.photo;
            syncCustomDropdown('new-status', user.status || 'Active');
            syncCustomDropdown('new-role', user.role || 'User');
            document.getElementById('new-phone').value = user.phone || '';
            document.getElementById('new-instansi').value = user.instansi || '';
            document.getElementById('user-modal-title').textContent = 'Edit User';
            const m = document.getElementById('user-modal');
            openModal(m);

            // Temporary override submit
            userForm.onsubmit = async (e) => {
                e.preventDefault();
                const updatedUsers = allUsers.map(u => u.id == id ? {
                    ...u,
                    name: document.getElementById('new-full-name').value,
                    username: document.getElementById('new-username').value,
                    password: document.getElementById('new-password').value || u.password,
                    status: document.getElementById('new-status').value,
                    role: document.getElementById('new-role').value,
                    phone: document.getElementById('new-phone').value,
                    instansi: document.getElementById('new-instansi').value,
                    photo: tempUserPhoto
                } : u);

                try {
                    await fetch('/api/users', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(updatedUsers)
                    });
                    allUsers = updatedUsers;
                    window.allUsers = updatedUsers;

                    addActivityLog(`Memperbarui data user: ${document.getElementById('new-full-name').value}`, 'system');
                    closeModalFunc(m);
                    userForm.reset();
                    tempUserPhoto = null;
                    userForm.onsubmit = handleAddUser; // Restore
                    document.getElementById('user-modal-title').textContent = 'User Baru';
                    loadUsersList();
                    showToast('User berhasil diperbarui.');
                } catch (err) { showToast('Gagal update.', 'error'); }
            };
        }
    };

    // --- Sidang Data Functions ---
    function generateSidangFields(existingData = null) {
        const container = document.getElementById('sidang-form-fields');
        if (!container) return;
        
        if (!tableHeaders || tableHeaders.length === 0) {
            tableHeaders = ['No', 'Nomor Perkara', 'Tanggal Sidang', 'Ruangan', 'Agenda'];
        }

        const findIdx = (keywords) => {
            return tableHeaders.findIndex(h => {
                const head = (h || '').toString().toLowerCase();
                return keywords.some(k => head.includes(k.toLowerCase()));
            });
        };

        const groups = [
            { type: 'grid', cols: 4, fields: [
                { label: 'No', idx: findIdx(['no', 'urut']) },
                { label: 'Tanggal', idx: findIdx(['tanggal', 'tgl']) },
                { label: 'Sidang Keliling', idx: findIdx(['keliling']) },
                { label: 'Ruangan', idx: findIdx(['ruang', 'ruangan']) }
            ]},
            { type: 'grid', cols: 2, fields: [
                { label: 'Nomor Perkara', idx: findIdx(['perkara']) },
                { label: 'Agenda', idx: findIdx(['agenda']) }
            ]},
            { type: 'grid', cols: 2, fields: [
                { label: 'Penggugat', idx: findIdx(['penggugat', 'pemohon']) },
                { label: 'Tergugat', idx: findIdx(['tergugat', 'termohon']) }
            ]},
            { type: 'full', fields: [
                { label: 'Majelis Hakim', idx: findIdx(['majelis', 'hakim']) }
            ]},
            { type: 'full', fields: [
                { label: 'Panitera Pengganti', idx: findIdx(['panitera']) }
            ]},
            { type: 'full', fields: [
                { label: 'Keterangan', idx: findIdx(['keterangan', 'ket']) }
            ]},
            { type: 'grid', cols: 2, fields: [
                { label: 'Tanggal Tundaan', idx: findIdx(['tundaan', 'tunda']) },
                { label: 'Tanggal Putus', idx: findIdx(['putus']) }
            ]}
        ];

        container.innerHTML = groups.map(group => {
            const fieldsHtml = group.fields.map(f => {
                const val = (f.idx !== -1 && existingData) ? existingData[f.idx] : '';
                const isTextArea = ['Majelis Hakim', 'Keterangan'].includes(f.label);
                
                const inputHtml = isTextArea 
                    ? `<textarea data-index="${f.idx}" 
                        class="w-full px-4 py-2.5 text-xs border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-slate-50 dark:bg-slate-800/40 dark:text-slate-200 transition-all min-h-[80px]"
                        placeholder="Masukkan ${f.label}...">${val}</textarea>`
                    : `<input type="text" data-index="${f.idx}" value="${val}" 
                        class="w-full px-4 py-2.5 text-xs border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-slate-50 dark:bg-slate-800/40 dark:text-slate-200 transition-all"
                        ${f.label.toLowerCase().includes('perkara') ? 'required' : ''}>`;

                return `
                    <div class="flex-1">
                        <label class="block text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1.5 ml-1">${f.label}</label>
                        ${inputHtml}
                    </div>
                `;
            }).join('');

            if (group.type === 'grid') {
                return `<div class="grid grid-cols-2 md:grid-cols-${group.cols} gap-4">${fieldsHtml}</div>`;
            } else {
                return `<div class="w-full">${fieldsHtml}</div>`;
            }
        }).join('');
    }

    async function handleSidangSubmit(e, editIdx = -1) {
        e.preventDefault();
        const inputs = document.getElementById('sidang-form-fields').querySelectorAll('input, textarea');
        const newRow = [...tableHeaders].fill('');
        
        inputs.forEach(input => {
            const idx = parseInt(input.getAttribute('data-index'));
            if (!isNaN(idx) && idx !== -1) {
                newRow[idx] = input.value;
            }
        });

        let updatedData = [...tableData];
        if (editIdx >= 0) {
            updatedData[editIdx] = newRow;
        } else {
            updatedData.unshift(newRow);
        }

        try {
            const res = await fetch('/api/sidang', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ headers: tableHeaders, data: updatedData })
            });

            if (res.ok) {
                tableData = updatedData;
                window.tableData = tableData;
                renderTable();
                updateStats();
                closeModalFunc(sidangModal);
                showToast(editIdx >= 0 ? 'Data sidang berhasil diperbarui.' : 'Data sidang berhasil ditambah.');
                addActivityLog(editIdx >= 0 ? 'Memperbarui data sidang' : 'Menambah data sidang baru', 'system');
            } else {
                throw new Error("Gagal menyimpan ke server");
            }
        } catch (err) {
            showToast(err.message, 'error');
        }
    }

    window.editSidangData = (idx) => {
        const row = tableData[idx];
        if (row) {
            document.getElementById('sidang-modal-title').textContent = 'Edit Data Sidang';
            generateSidangFields(row);
            sidangForm.onsubmit = (e) => handleSidangSubmit(e, idx);
            openModal(sidangModal);
        }
    };

    window.deleteSidangData = (idx) => {
        window.sidangIdxToDelete = idx;
        const modal = document.getElementById('modal-hapus-sidang');
        openModal(modal);
    };

    document.getElementById('confirm-delete-sidang-btn').onclick = async () => {
        const idx = window.sidangIdxToDelete;
        if (idx === undefined || idx === null) return;

        try {
            const currentData = [...tableData];
            const updatedData = currentData.filter((_, i) => i !== idx);
            
            const res = await fetch('/api/sidang', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ headers: tableHeaders, data: updatedData })
            });

            if (res.ok) {
                tableData = updatedData;
                window.tableData = tableData;
                renderTable();
                updateStats();
                showToast('Data berhasil dihapus');
                addActivityLog('Menghapus satu baris data sidang', 'system');
                closeModalFunc(document.getElementById('modal-hapus-sidang'));
            } else {
                showToast('Gagal menghapus data dari server.', 'error');
            }
        } catch (err) { 
            console.error("Delete error:", err);
            showToast('Gagal menghapus.', 'error'); 
        } finally {
            window.sidangIdxToDelete = null;
        }
    };

    window.viewSidangDetail = (idx) => {
        const row = tableData[idx];
        if (!row) return;

        const findIdx = (keywords) => {
            return tableHeaders.findIndex(h => {
                const head = (h || '').toString().toLowerCase();
                return keywords.some(k => head.includes(k.toLowerCase()));
            });
        };

        // Define groups based on user request
        const groups = [
            // Baris 1: no, tanggal, sidang keliling, ruangan
            { type: 'grid', cols: 4, fields: [
                { label: 'No', idx: findIdx(['no', 'urut']) },
                { label: 'Tanggal', idx: findIdx(['tanggal', 'tgl']) },
                { label: 'Sidang Keliling', idx: findIdx(['keliling']) },
                { label: 'Ruangan', idx: findIdx(['ruang', 'ruangan']) }
            ]},
            // Baris 2: nomor perkara, agenda
            { type: 'grid', cols: 2, fields: [
                { label: 'Nomor Perkara', idx: findIdx(['perkara']) },
                { label: 'Agenda', idx: findIdx(['agenda']) }
            ]},
            // Baris 3: penggugat, tergugat
            { type: 'grid', cols: 2, fields: [
                { label: 'Penggugat', idx: findIdx(['penggugat', 'pemohon']) },
                { label: 'Tergugat', idx: findIdx(['tergugat', 'termohon']) }
            ]},
            // Baris 4: majelis hakim
            { type: 'full', fields: [
                { label: 'Majelis Hakim', idx: findIdx(['majelis', 'hakim']) }
            ]},
            // Baris 5: panitera pengganti
            { type: 'full', fields: [
                { label: 'Panitera Pengganti', idx: findIdx(['panitera']) }
            ]},
            // Baris 6: Keterangan
            { type: 'full', fields: [
                { label: 'Keterangan', idx: findIdx(['keterangan', 'ket']) }
            ]},
            // Baris 7: tanggal Tundaan, Tanggal Putus
            { type: 'grid', cols: 2, fields: [
                { label: 'Tanggal Tundaan', idx: findIdx(['tundaan', 'tunda']) },
                { label: 'Tanggal Putus', idx: findIdx(['putus']) }
            ]}
        ];

        const content = document.getElementById('sidang-detail-content');
        content.innerHTML = groups.map(group => {
            const fieldsHtml = group.fields.map(f => {
                const val = (f.idx !== -1 ? row[f.idx] : null) || '-';
                // Priority fields get a slightly more distinct border
                const isPriority = ['Nomor Perkara', 'Agenda', 'Penggugat', 'Tergugat'].includes(f.label);
                const borderClass = isPriority 
                    ? 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/60 shadow-sm' 
                    : 'border-slate-100 dark:border-slate-800/60 bg-slate-50 dark:bg-slate-800/30';

                return `
                    <div class="${borderClass} p-3 rounded-xl border flex flex-col gap-1 transition-all hover:border-blue-200 dark:hover:border-blue-900/50">
                        <span class="text-[9px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-widest">${f.label}</span>
                        <span class="text-xs font-semibold text-slate-700 dark:text-slate-200 leading-relaxed">${val}</span>
                    </div>
                `;
            }).join('');

            if (group.type === 'grid') {
                return `<div class="grid grid-cols-2 md:grid-cols-${group.cols} gap-3">${fieldsHtml}</div>`;
            } else {
                return `<div class="w-full">${fieldsHtml}</div>`;
            }
        }).join('');

        const modal = document.getElementById('sidang-detail-modal');
        openModal(modal);
    };

    // --- Helpers ---

    // Use global openModal/closeModalFunc which handle modal stacking
    function openModal(modal) { window.openModal(modal); }
    function closeModalFunc(modal) { window.closeModalFunc(modal); }


    function fileToDataURL(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = (e) => reject(e);
            reader.readAsDataURL(file);
        });
    }

    function renderTable() {
        const query = (searchInput.value || '').toLowerCase();
        console.log(`Rendering table. Total rows: ${tableData.length}, Search: "${query}"`);

        if (!tableHeaders || tableHeaders.length === 0) {
            console.warn("No table headers found.");
            tableHeader.innerHTML = '';
            tableBody.innerHTML = `
                <tr>
                    <td colspan="100%" class="py-48 text-center ">
                        <div class="flex flex-col items-center gap-4 animate-fade-in mt-10 mb-10">
                            <div class="w-16 h-16 bg-blue-10 dark:bg-blue-900/10 rounded-full flex items-center justify-center text-blue-500 mb-1">
                                <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                                </svg>
                            </div>
                            <div class="space-y-1">
                                <h4 class="text-sm font-bold dark:text-white" style="color: #000000 !important;">Belum Ada Data</h4>
                                <p class="text-slate-500 dark:text-slate-400 text-[11px] max-w-xs mx-auto">Silakan impor data Excel untuk menampilkan jadwal.</p>
                            </div>
                        </div>
                    </td>
                </tr>`;
            return;
        }

        const hideKeywords = ['sidang keliling', 'keterangan', 'tundaan', 'putus'];
        const showIndices = tableHeaders
            .map((h, i) => ({ header: (h || '').toString().toLowerCase().trim(), index: i }))
            .filter(item => !hideKeywords.some(key => item.header.includes(key)))
            .map(item => item.index);

        const filteredData = getFilteredData();
        console.log(`Rendering ${filteredData.length} filtered rows`);

        const dateColIdx = tableHeaders.findIndex(h => h && h.toString().toLowerCase().includes('tanggal'));

        // Render Headers
        let headerHtml = showIndices.map(i => {
            const h = (tableHeaders[i] || '').toString().toLowerCase();
            let style = '';
            if (h.includes('tergugat') || h.includes('penggugat')) style = 'min-width: 160px;';
            else if (h.includes('majelis')) style = 'min-width: 220px;';
            else if (h.includes('panitera')) style = 'min-width: 180px;';
            else if (h.includes('agenda')) style = 'min-width: 150px;';
            
            return `<th class="text-left" style="${style}">${tableHeaders[i] || ''}</th>`;
        }).join('');
        headerHtml += `<th class="text-center w-24">Aksi</th>`;
        tableHeader.innerHTML = headerHtml;

        if (filteredData.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="100%" class="py-32 text-center text-slate-400">
                        <div class="flex flex-col items-center gap-3 animate-fade-in">
                             <div class="w-16 h-16 bg-slate-50 dark:bg-slate-800/50 rounded-full flex items-center justify-center text-slate-300 dark:text-slate-600 mb-2">
                                <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </svg>
                             </div>
                             <p class="text-sm font-medium text-slate-600 dark:text-slate-400">Tidak ada hasil untuk "<span class="text-slate-900 dark:text-slate-100">${query}</span>"</p>
                             <p class="text-xs">Coba gunakan kata kunci yang berbeda</p>
                        </div>
                    </td>
                </tr>`;
            return;
        }

        const noPerkaraIdx = tableHeaders.findIndex(h => h && h.toString().toLowerCase().includes('perkara'));

        tableBody.innerHTML = filteredData.map((row, rowIdx) => {
            const realIdx = tableData.indexOf(row);
            const caseNo = (noPerkaraIdx !== -1 && row[noPerkaraIdx]) ? row[noPerkaraIdx].toString() : '';
            let rowClass = "animate-fade-in";
            if (caseNo.includes('Pid')) rowClass += " row-pid";
            else if (caseNo.includes('Pdt')) rowClass += " row-pdt";

            let rowHtml = showIndices.map(i => {
                const cell = row[i] || '';
                const h = (tableHeaders[i] || '').toString().toLowerCase();
                let style = '';
                if (h.includes('tergugat') || h.includes('penggugat')) style = 'min-width: 160px;';
                else if (h.includes('majelis')) style = 'min-width: 220px;';
                else if (h.includes('panitera')) style = 'min-width: 180px;';
                else if (h.includes('agenda')) style = 'min-width: 150px;';

                if (i === noPerkaraIdx) {
                    let badgeClass = cell.toString().includes('Pid') ? "badge-pid" : (cell.toString().includes('Pdt') ? "badge-pdt" : "badge-default");
                    return `<td class="text-left" style="white-space: nowrap; ${style}"><span class="badge-case ${badgeClass}">${cell}</span></td>`;
                }
                return `<td class="text-left" style="${style}">${cell}</td>`;
            }).join('');

            let actionButtons = `
                <button onclick="window.viewSidangDetail(${realIdx})" class="p-2 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-all" title="Lihat Detail">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                        <circle cx="12" cy="12" r="3" stroke-linecap="round" stroke-linejoin="round" />
                    </svg>
                </button>`;

            if (currentUser && currentUser.role === 'Super Admin') {
                actionButtons += `
                    <button onclick="window.editSidangData(${realIdx})" class="p-2 text-slate-400 hover:text-amber-600 dark:hover:text-amber-400 transition-all" title="Edit">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                    </button>
                    <button onclick="window.deleteSidangData(${realIdx})" class="p-2 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 transition-all" title="Hapus">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                    </button>`;
            }

            rowHtml += `
                <td class="text-center">
                    <div class="flex justify-center items-center gap-1">
                        ${actionButtons}
                    </div>
                </td>`;

            return `<tr class="${rowClass}">${rowHtml}</tr>`;
        }).join('');

        // If no rows matched (should already be handled by filteredData.length, but for extra safety)
        if (!tableBody.innerHTML.trim() && tableData.length > 0) {
            tableBody.innerHTML = `<tr><td colspan="100%" class="py-32 text-center text-slate-400"><div class="flex flex-col items-center gap-2"><p>Data tidak ditemukan untuk pencarian "${query}"</p></div></td></tr>`;
        }
    }

    function updateStats() {
        const currentFiltered = getFilteredData();
        totalPerkaraEl.textContent = `${currentFiltered.length} Perkara`;

        // --- Sync Stat Date with Data ---
        const dateColIdx = tableHeaders.findIndex(h => h && h.toString().toLowerCase().includes('tanggal'));
        
        if (currentDayTab === 'Semua' && currentFiltered.length > 0) {
            lastUpdateEl.textContent = 'Semua Hari';
        } else if (dateColIdx !== -1 && currentFiltered.length > 0 && currentFiltered[0][dateColIdx]) {
            let dateStr = currentFiltered[0][dateColIdx].toString();
            
            // Append day name if missing
            const daysOfWeek = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jum\'at', 'Sabtu'];
            const hasDayName = daysOfWeek.some(day => 
                dateStr.toLowerCase().includes(day.toLowerCase()) || 
                (day === 'Jum\'at' && dateStr.toLowerCase().includes('jumat'))
            );
            
            if (!hasDayName) {
                const parsedDate = new Date(dateStr.replace(/jan|feb|mar|apr|mei|jun|jul|agu|sep|okt|nov|des/i, match => {
                    const map = { mei: 'may', agu: 'aug', okt: 'oct', des: 'dec' };
                    return map[match.toLowerCase()] || match;
                }));
                if (!isNaN(parsedDate)) {
                    dateStr = `${daysOfWeek[parsedDate.getDay()]}, ${dateStr}`;
                }
            }
            
            lastUpdateEl.textContent = dateStr;
        } else {
            lastUpdateEl.textContent = '-';
        }

        const roomIdx = tableHeaders.findIndex(h => h && h.toString().toLowerCase().includes('ruangan'));
        if (roomIdx !== -1 && currentFiltered.length) {
            const counts = {};
            currentFiltered.forEach(r => {
                if (r[roomIdx]) counts[r[roomIdx]] = (counts[r[roomIdx]] || 0) + 1;
            });
            const rooms = Object.keys(counts);
            if (rooms.length > 0) {
                const topRoom = rooms.reduce((a, b) => counts[a] > counts[b] ? a : b);
                ruanganAktifEl.textContent = topRoom;
            } else {
                ruanganAktifEl.textContent = '-';
            }
        } else {
            ruanganAktifEl.textContent = '-';
        }

        // --- Comparison Stats (Pidana vs Perdata) ---
        const noPerkaraIdx = tableHeaders.findIndex(h => h && h.toString().toLowerCase().includes('perkara'));
        let pidanaCount = 0;
        let perdataCount = 0;

        if (noPerkaraIdx !== -1) {
            currentFiltered.forEach(row => {
                const cell = (row[noPerkaraIdx] || '').toString();
                if (cell.includes('Pid')) pidanaCount++;
                else if (cell.includes('Pdt')) perdataCount++;
            });
        }

        // --- Update Day Tab Badges ---
        const days = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat'];
        const dateIdx = tableHeaders.findIndex(h => h && h.toString().toLowerCase().includes('tanggal'));
        
        // Update "Semua" badge
        const allBadge = document.querySelector('.day-tab[data-day="Semua"] .tab-badge');
        if (allBadge) allBadge.textContent = tableData.length;

        // Update individual day badges
        days.forEach(day => {
            const badge = document.querySelector(`.day-tab[data-day="${day}"] .tab-badge`);
            if (badge && dateIdx !== -1) {
                const count = tableData.filter(row => {
                    const dateStr = (row[dateIdx] || '').toString().toLowerCase();
                    const targetDay = day.toLowerCase();

                    // 1. String check
                    if (targetDay === 'jumat' && (dateStr.includes('jumat') || dateStr.includes('jum\'at'))) return true;
                    if (dateStr.includes(targetDay)) return true;

                    // 2. Date parse check
                    const parsedDate = new Date(dateStr.replace(/jan|feb|mar|apr|mei|jun|jul|agu|sep|okt|nov|des/i, match => {
                        const map = { mei: 'may', agu: 'aug', okt: 'oct', des: 'dec' };
                        return map[match.toLowerCase()] || match;
                    }));
                    
                    if (!isNaN(parsedDate)) {
                        const daysOfWeek = ['minggu', 'senin', 'selasa', 'rabu', 'kamis', 'jumat', 'sabtu'];
                        const parsedDay = daysOfWeek[parsedDate.getDay()];
                        if (targetDay === 'jumat' && parsedDay === 'jumat') return true;
                        if (parsedDay === targetDay) return true;
                    }
                    return false;
                }).length;
                badge.textContent = count;
            }
        });

        const total = pidanaCount + perdataCount;
        const pidPercent = total > 0 ? Math.round((pidanaCount / total) * 100) : 0;
        const pdtPercent = total > 0 ? 100 - pidPercent : 0;

        const donut = document.getElementById('case-donut');
        const glow = document.getElementById('donut-glow');
        const txtPid = document.getElementById('txt-pidana');
        const txtPdt = document.getElementById('txt-perdata');
        const totalPct = document.getElementById('stat-total-percent');

        if (donut) {
            donut.style.setProperty('--pid-percent', `${pidPercent}%`);
            donut.style.background = `conic-gradient(#ef4444 ${pidPercent}%, #10b981 0)`;

            if (txtPid) txtPid.textContent = pidanaCount;
            if (txtPdt) txtPdt.textContent = perdataCount;
            if (totalPct) totalPct.textContent = `${pidPercent}% : ${pdtPercent}%`;
        }
    }

    function showToast(message, type = 'success') {
        const container = document.getElementById('toast-container');
        if (!container) return;
        const toast = document.createElement('div');
        toast.className = `animate-fade-in flex items-center gap-3 px-6 py-3 rounded-xl shadow-2xl border-none ${type === 'success' ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'}`;
        toast.innerHTML = `<span class="text-sm font-semibold">${message}</span>`;
        container.appendChild(toast);
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateY(-20px)';
            setTimeout(() => toast.remove(), 500);
        }, 3000);
    }
    // Expose showToast globally so top-level window.deleteUser/openClearDataModal can use it
    window.showToast = showToast;

    async function handleDownloadPdf() {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF('l', 'mm', [330, 210]); // F4 Landscape

        const filteredData = getFilteredData();

        // --- Filter Visible Data for PDF ---
        const hideKeywords = [
            'sidang keliling',
            'keterangan',
            'tundaan',
            'putus'
        ];

        const showIndices = tableHeaders
            .map((h, i) => ({ header: h ? h.toString().toLowerCase().trim() : '', index: i }))
            .filter(item => !hideKeywords.some(key => item.header.includes(key)))
            .map(item => item.index);

        const filteredHeaders = showIndices.map(i => tableHeaders[i]);
        const filteredBody = filteredData.map(row => showIndices.map(i => row[i]));

        // --- Sync Date from Data ---
        let scheduleDate = new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
        const dateColIdx = tableHeaders.findIndex(h => h && h.toString().toLowerCase().includes('tanggal'));
        if (dateColIdx !== -1 && filteredData.length > 0 && filteredData[0][dateColIdx]) {
            let rawDate = filteredData[0][dateColIdx].toString();
            // Try to add day name if not already present
            if (!rawDate.includes('Senin') && !rawDate.includes('Selasa') && !rawDate.includes('Rabu') && !rawDate.includes('Kamis') && !rawDate.includes('Jumat') && !rawDate.includes('Sabtu') && !rawDate.includes('Minggu')) {
                // Heuristic: if it looks like "23 Apr 2026", we can try to append the day
                const parts = rawDate.split(' ');
                if (parts.length >= 3) {
                    const months = { 'Jan': 0, 'Feb': 1, 'Mar': 2, 'Apr': 3, 'Mei': 4, 'Jun': 5, 'Jul': 6, 'Agu': 7, 'Sep': 8, 'Okt': 9, 'Nov': 10, 'Des': 11 };
                    const m = months[parts[1].substring(0, 3)];
                    if (m !== undefined) {
                        const d = new Date(parts[2], m, parts[0]);
                        if (!isNaN(d)) {
                            const dayName = d.toLocaleDateString('id-ID', { weekday: 'long' });
                            scheduleDate = `${dayName}, ${rawDate}`;
                        } else { scheduleDate = rawDate; }
                    } else { scheduleDate = rawDate; }
                } else { scheduleDate = rawDate; }
            } else { scheduleDate = rawDate; }
        }

        const printedBy = currentUser ? currentUser.name : 'Admin';

        doc.setFont('helvetica', 'semibold');
        doc.setFontSize(14);
        doc.setTextColor(30, 41, 59); // Dark slate
        
        let pdfTitle = 'JADWAL SIDANG PN GUNUNG SUGIH';
        if (currentDayTab && currentDayTab !== 'Semua') {
            pdfTitle += ` - HARI ${currentDayTab.toUpperCase()}`;
        }
        doc.text(pdfTitle, 5, 12);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(100, 116, 139); // Gray
        const headerInfo = `Tanggal : ${scheduleDate}  |  Oleh : ${printedBy}`;
        doc.text(headerInfo, 325, 12, { align: 'right' });
        doc.setTextColor(0, 0, 0); // Reset to black

        // --- Optimized Dynamic Sizing ---
        let bodyFontSize = 7.8;
        let bodyPadding = 1.2;

        if (filteredData.length > 15) {
            bodyFontSize = 7.2;
            bodyPadding = 0.8;
        }
        if (filteredData.length > 25) {
            bodyFontSize = 6.8;
            bodyPadding = 0.6;
        }

        doc.autoTable({
            startY: 18,
            head: [filteredHeaders],
            body: filteredBody,
            theme: 'grid',
            headStyles: {
                fillColor: [30, 41, 59],
                fontSize: 8,
                fontStyle: 'semibold',
                halign: 'center',
                textColor: [255, 255, 255],
                lineWidth: 0.1,
                lineColor: [255, 255, 255]
            },
            styles: { fontSize: bodyFontSize, cellPadding: bodyPadding, textColor: [30, 41, 59] },
            margin: { top: 5, bottom: 5, left: 5, right: 5 },
            didDrawPage: function (data) {
                // Page Number
                const str = "Halaman " + doc.internal.getNumberOfPages();
                doc.setFontSize(7);
                doc.text(str, data.settings.margin.left, 207);
            },
            didParseCell: function (data) {
                if (data.section === 'body') {
                    const noPerkaraIdx = filteredHeaders.findIndex(h => h && h.toString().toLowerCase().includes('perkara'));
                    const caseNo = (noPerkaraIdx !== -1 && filteredBody[data.row.index][noPerkaraIdx]) ? filteredBody[data.row.index][noPerkaraIdx].toString() : '';

                    // Style row background
                    if (caseNo.includes('Pid')) data.cell.styles.fillColor = [254, 242, 242];
                    if (caseNo.includes('Pdt')) data.cell.styles.fillColor = [240, 253, 244];

                    // Style Nomor Perkara text
                    if (data.column.index === noPerkaraIdx) {
                        data.cell.styles.fontStyle = 'semibold';
                        if (caseNo.includes('Pid')) data.cell.styles.textColor = [185, 28, 28]; // Dark Red
                        if (caseNo.includes('Pdt')) data.cell.styles.textColor = [5, 150, 105]; // Dark Emerald
                    }
                }
            }
        });
        const fileNameDate = scheduleDate.replace(/\//g, '-');
        addActivityLog('Mengunduh jadwal sidang (PDF)', 'download');
        doc.save(`Jadwal Sidang - ${fileNameDate}.pdf`);
    }

    function updateClock() {
        const now = new Date();
        const hour = now.getHours();
        let suffix = 'Pagi';

        if (hour >= 5 && hour < 11) suffix = 'Pagi';
        else if (hour >= 11 && hour < 15) suffix = 'Siang';
        else if (hour >= 15 && hour < 18.5) suffix = 'Sore';
        else suffix = 'Malam';

        const optionsDate = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        const dateStr = now.toLocaleDateString('id-ID', optionsDate);
        const timeStr = now.toLocaleTimeString('id-ID', { hour12: false, hour: '2-digit', minute: '2-digit' });

        const timeEl = document.getElementById('time-val');
        const suffixEl = document.getElementById('widget-suffix');
        const dateEl = document.getElementById('widget-date');

        if (timeEl) timeEl.textContent = timeStr;
        if (suffixEl) suffixEl.textContent = suffix;
        if (dateEl) dateEl.textContent = dateStr;
    }
    setInterval(updateClock, 1000);
    updateClock();

    function initCustomDropdowns() {
        document.querySelectorAll('.custom-dropdown').forEach(dropdown => {
            const trigger = dropdown.querySelector('.custom-dropdown-trigger');
            const items = dropdown.querySelectorAll('.custom-dropdown-item');
            const targetId = dropdown.dataset.target;
            const nativeSelect = document.getElementById(targetId);

            trigger.addEventListener('click', (e) => {
                e.stopPropagation();
                // Close other open dropdowns
                document.querySelectorAll('.custom-dropdown.open').forEach(d => {
                    if (d !== dropdown) d.classList.remove('open');
                });
                dropdown.classList.toggle('open');
            });

            items.forEach(item => {
                item.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const value = item.dataset.value;
                    syncCustomDropdown(targetId, value);
                    dropdown.classList.remove('open');
                });
            });
        });
    }

    document.addEventListener('click', () => {
        document.querySelectorAll('.custom-dropdown.open').forEach(d => d.classList.remove('open'));
    });

    function syncCustomDropdown(targetId, value) {
        const select = document.getElementById(targetId);
        if (select) select.value = value;
        const dropdown = document.querySelector(`.custom-dropdown[data-target="${targetId}"]`);
        if (dropdown) {
            const label = dropdown.querySelector('.custom-dropdown-label');
            const items = dropdown.querySelectorAll('.custom-dropdown-item');
            items.forEach(item => {
                if (item.dataset.value === value) {
                    item.classList.add('active');
                    if (label) label.textContent = item.querySelector('span').textContent;
                } else {
                    item.classList.remove('active');
                }
            });
        }
    }

    initCustomDropdowns();
    init();
});
