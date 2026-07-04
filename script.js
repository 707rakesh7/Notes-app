/**
 * Telegram Mini Notes App
 * Main Application Script (HTML5, Vanilla JS, Telegram WebApp SDK)
 */

document.addEventListener('DOMContentLoaded', () => {
    // --- Application State ---
    let notes = [];
    let currentUserId = 'demo_user_12345';
    let currentUserName = 'Demo User';
    let currentUserAvatar = 'https://api.dicebear.com/7.x/initials/svg?seed=Demo%20User&backgroundColor=0088cc,00a2e8,33b5e5&fontSize=40&bold=true';
    
    let currentView = 'list'; // 'list' or 'editor'
    let activeCategory = 'all'; // 'all', 'pinned', 'favorites', 'work', 'personal', 'ideas', 'archived'
    let activeSort = 'newest'; // 'newest', 'oldest', 'alphabetical'
    let searchQuery = '';
    
    let currentEditingNoteId = null;
    let isPremiumThemesUnlocked = false;
    let autoSaveTimeout = null;

    // --- DOM Elements ---
    const userAvatarEl = document.getElementById('user-avatar');
    const userNameEl = document.getElementById('user-name');
    const syncTextEl = document.getElementById('sync-text');
    const statusDotEl = document.querySelector('.status-dot');
    
    const themeToggleBtn = document.getElementById('theme-toggle');
    const settingsBtn = document.getElementById('settings-btn');
    const closeSettingsBtn = document.getElementById('close-settings');
    const settingsModal = document.getElementById('settings-modal');
    
    const searchInput = document.getElementById('search-input');
    const clearSearchBtn = document.getElementById('clear-search');
    
    const categoryChips = document.querySelectorAll('.category-chip');
    const sortChips = document.querySelectorAll('.sort-chip');
    
    const notesGrid = document.getElementById('notes-grid');
    const emptyState = document.getElementById('empty-state');
    const emptyAddBtn = document.getElementById('empty-add-btn');
    const fabAddNote = document.getElementById('fab-add-note');
    
    // Editor elements
    const noteEditorModal = document.getElementById('note-editor-modal');
    const editorBackBtn = document.getElementById('editor-back');
    const editorPinBtn = document.getElementById('editor-pin');
    const editorFavoriteBtn = document.getElementById('editor-favorite');
    const editorArchiveBtn = document.getElementById('editor-archive');
    const editorMoreBtn = document.getElementById('editor-more');
    const moreActionsMenu = document.getElementById('more-actions-menu');
    
    const colorPalette = document.getElementById('color-palette');
    const noteTitleInput = document.getElementById('note-title-input');
    const noteCategorySelect = document.getElementById('note-category-select');
    const noteTagsInput = document.getElementById('note-tags-input');
    const noteBodyContent = document.getElementById('note-body-content');
    
    const charCounter = document.getElementById('char-counter');
    const wordCounter = document.getElementById('word-counter');
    const saveIndicator = document.getElementById('save-indicator');
    
    // Settings elements
    const simUserIdInput = document.getElementById('sim-user-id');
    const simUserNameInput = document.getElementById('sim-user-name');
    const saveSimProfileBtn = document.getElementById('save-sim-profile');
    
    const fbApiKeyInput = document.getElementById('fb-api-key');
    const fbProjectIdInput = document.getElementById('fb-project-id');
    const fbAppIdInput = document.getElementById('fb-app-id');
    const saveFbConfigBtn = document.getElementById('save-fb-config');
    const resetFbConfigBtn = document.getElementById('reset-fb-config');
    
    const btnExportAll = document.getElementById('btn-export-all');
    const btnImportTrigger = document.getElementById('btn-import-trigger');
    const fileImportInput = document.getElementById('file-import-input');
    
    const premiumStatusBanner = document.getElementById('premium-status-banner');
    const unlockPremiumBtn = document.getElementById('unlock-premium-btn');
    const rewardAdBtn = document.getElementById('reward-ad-btn');
    const rewardSuccessModal = document.getElementById('reward-success-modal');
    const rewardCloseBtn = document.getElementById('reward-close');
    
    // Action menu items
    const actionDuplicate = document.getElementById('action-duplicate');
    const actionCopyText = document.getElementById('action-copy-text');
    const actionShare = document.getElementById('action-share');
    const actionExportTxt = document.getElementById('action-export-txt');
    const actionExportPdf = document.getElementById('action-export-pdf');
    const actionDelete = document.getElementById('action-delete');
    
    // Confirmation Dialog elements
    const confirmModal = document.getElementById('confirm-modal');
    const confirmTitle = document.getElementById('confirm-title');
    const confirmMessage = document.getElementById('confirm-message');
    const confirmCancelBtn = document.getElementById('confirm-cancel');
    const confirmOkBtn = document.getElementById('confirm-ok');
    let confirmCallback = null;

    // Toast Container
    const toastContainer = document.getElementById('toast-container');

    // --- Color Theme Constants ---
    const NOTE_COLORS = [
        { name: 'none', class: '' },
        { name: 'red', class: 'color-red' },
        { name: 'orange', class: 'color-orange' },
        { name: 'yellow', class: 'color-yellow' },
        { name: 'green', class: 'color-green' },
        { name: 'blue', class: 'color-blue' },
        { name: 'purple', class: 'color-purple' },
        { name: 'pink', class: 'color-pink' }
    ];

    // --- Core Logic & Initialization ---

    function initializeApp() {
        loadLocalStorageData();
        detectTelegramUser();
        setupTheme();
        renderNotes();
        setupFirebaseSync();
        setupEventListeners();
        checkPremiumStatus();
    }

    /**
     * Loads local cache of notes, settings and premium status
     */
    function loadLocalStorageData() {
        try {
            const cachedNotes = localStorage.getItem('telegram_notes_cache');
            if (cachedNotes) {
                notes = JSON.parse(cachedNotes);
            }
            
            const premiumState = localStorage.getItem('telegram_notes_premium');
            isPremiumThemesUnlocked = (premiumState === 'true');
        } catch (e) {
            console.error("Failed to load LocalStorage cache", e);
        }
    }

    /**
     * Integrates Telegram WebApp SDK & retrieves user profile
     */
    function detectTelegramUser() {
        if (window.Telegram && window.Telegram.WebApp) {
            const tg = window.Telegram.WebApp;
            tg.ready();
            tg.expand();
            
            // Map Telegram's user profile details if running inside actual Telegram
            if (tg.initDataUnsafe && tg.initDataUnsafe.user) {
                const user = tg.initDataUnsafe.user;
                currentUserId = user.id.toString();
                currentUserName = `${user.first_name} ${user.last_name || ''}`.trim();
                currentUserAvatar = user.photo_url || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(currentUserName)}&backgroundColor=0088cc,00a2e8,33b5e5&fontSize=40&bold=true`;
                console.log("Loaded actual Telegram user credentials:", currentUserId);
            } else {
                // Otherwise load previously simulated developer credentials from local storage
                loadSimulatedCredentials();
            }
        } else {
            // Running in regular browser/Android emulator fallback
            loadSimulatedCredentials();
        }

        // Update profile in UI
        userNameEl.textContent = currentUserName;
        userAvatarEl.src = currentUserAvatar;
        
        // Pre-fill simulator inputs
        simUserIdInput.value = currentUserId;
        simUserNameInput.value = currentUserName;
    }

    function loadSimulatedCredentials() {
        const simId = localStorage.getItem('sim_telegram_id');
        const simName = localStorage.getItem('sim_telegram_name');
        if (simId) currentUserId = simId;
        if (simName) currentUserName = simName;
        currentUserAvatar = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(currentUserName)}&backgroundColor=0088cc,00a2e8,33b5e5&fontSize=40&bold=true`;
    }

    /**
     * Maps Telegram theme colors dynamically or falls back to system preferences
     */
    function setupTheme() {
        // Read theme settings from localstorage
        const savedTheme = localStorage.getItem('app_theme_mode') || 'light';
        document.body.className = savedTheme + '-mode';
        updateThemeIcon(savedTheme);

        if (window.Telegram && window.Telegram.WebApp) {
            const tg = window.Telegram.WebApp;
            // Check Telegram background theme color (dark/light)
            if (tg.colorScheme) {
                document.body.className = tg.colorScheme + '-mode';
                updateThemeIcon(tg.colorScheme);
                
                // Set native header/background colors in Telegram Mini App
                tg.setHeaderColor(tg.colorScheme === 'dark' ? '#111318' : '#f7f9fc');
                tg.setBackgroundColor(tg.colorScheme === 'dark' ? '#111318' : '#f7f9fc');
            }
        }
    }

    function updateThemeIcon(mode) {
        const iconSpan = themeToggleBtn.querySelector('span');
        if (mode === 'dark') {
            iconSpan.textContent = 'light_mode';
        } else {
            iconSpan.textContent = 'dark_mode';
        }
    }

    /**
     * Binds real-time synchronization callbacks with FirebaseSyncManager
     */
    function setupFirebaseSync() {
        firebaseSyncManager.onSyncCallback = (firebaseNotes) => {
            // Resolve conflict between local and firebase notes (prefer newest edit)
            notes = resolveSyncConflicts(notes, firebaseNotes);
            saveLocalCache();
            renderNotes();
            showToast("Cloud synced successfully", "cloud_done");
            saveIndicator.classList.add('show');
            setTimeout(() => saveIndicator.classList.remove('show'), 1500);
        };

        firebaseSyncManager.onConnectionStatusCallback = (status) => {
            statusDotEl.className = 'status-dot ' + status;
            if (status === 'connected') {
                syncTextEl.textContent = "Synced to Cloud";
                // Perform automatic sync of existing local notes on first connection
                firebaseSyncManager.uploadLocalNotes(notes);
            } else if (status === 'offline') {
                syncTextEl.textContent = "Offline Mode";
            } else if (status === 'demo') {
                syncTextEl.textContent = "Local Only (Demo)";
            } else if (status === 'error') {
                syncTextEl.textContent = "Sync Config Error";
            }
        };

        // Initialize Firebase Sync under current user
        firebaseSyncManager.startSync(currentUserId);

        // Pre-fill Custom Firebase Config panel inputs
        try {
            const config = localStorage.getItem('telegram_notes_firebase_config');
            if (config) {
                const parsed = JSON.parse(config);
                fbApiKeyInput.value = parsed.apiKey || '';
                fbProjectIdInput.value = parsed.projectId || '';
                fbAppIdInput.value = parsed.appId || '';
            }
        } catch (e) {
            console.error("Failed to load custom Firebase keys", e);
        }
    }

    /**
     * Resolves updates between cloud and offline local states based on 'updatedAt'
     */
    function resolveSyncConflicts(local, firebase) {
        const mergedMap = new Map();
        
        // Add all local notes first
        local.forEach(note => mergedMap.set(note.id, note));
        
        // Add firebase notes, resolving conflicts
        firebase.forEach(fNote => {
            const lNote = mergedMap.get(fNote.id);
            if (!lNote || fNote.updatedAt > lNote.updatedAt) {
                mergedMap.set(fNote.id, fNote);
            }
        });
        
        return Array.from(mergedMap.values());
    }

    function saveLocalCache() {
        localStorage.setItem('telegram_notes_cache', JSON.stringify(notes));
    }

    /**
     * Back button bridge for Telegram native BackButton
     */
    function updateTelegramBackButton() {
        if (window.Telegram && window.Telegram.WebApp) {
            const tg = window.Telegram.WebApp;
            if (currentView === 'editor') {
                tg.BackButton.show();
                tg.BackButton.onClick(() => {
                    closeEditor();
                });
            } else {
                tg.BackButton.hide();
            }
        }
    }

    // --- Event Listeners Mapping ---

    function setupEventListeners() {
        // Theme Toggle
        themeToggleBtn.addEventListener('click', () => {
            triggerHaptic('light');
            const isDark = document.body.classList.contains('dark-mode');
            const targetTheme = isDark ? 'light' : 'dark';
            document.body.className = targetTheme + '-mode';
            localStorage.setItem('app_theme_mode', targetTheme);
            updateThemeIcon(targetTheme);
        });

        // Settings Dialog trigger
        settingsBtn.addEventListener('click', () => {
            triggerHaptic('light');
            settingsModal.style.display = 'flex';
        });

        closeSettingsBtn.addEventListener('click', () => {
            settingsModal.style.display = 'none';
        });

        // Search features
        searchInput.addEventListener('input', (e) => {
            searchQuery = e.target.value.toLowerCase().trim();
            clearSearchBtn.style.display = searchQuery ? 'block' : 'none';
            renderNotes();
        });

        clearSearchBtn.addEventListener('click', () => {
            searchInput.value = '';
            searchQuery = '';
            clearSearchBtn.style.display = 'none';
            renderNotes();
        });

        // Category switching
        categoryChips.forEach(chip => {
            chip.addEventListener('click', (e) => {
                triggerHaptic('light');
                categoryChips.forEach(c => c.classList.remove('active'));
                
                // Handle clicked chip, supporting icons if inside
                const btn = e.target.closest('.category-chip');
                btn.classList.add('active');
                
                activeCategory = btn.getAttribute('data-category');
                renderNotes();
            });
        });

        // Sort switching
        sortChips.forEach(chip => {
            chip.addEventListener('click', (e) => {
                triggerHaptic('light');
                sortChips.forEach(c => c.classList.remove('active'));
                e.target.classList.add('active');
                activeSort = e.target.getAttribute('data-sort');
                renderNotes();
            });
        });

        // Create new note triggers
        fabAddNote.addEventListener('click', () => {
            triggerHaptic('medium');
            createNewNote();
        });

        emptyAddBtn.addEventListener('click', () => {
            triggerHaptic('medium');
            createNewNote();
        });

        // Editor Toolbar Action formatting buttons
        const formatButtons = document.querySelectorAll('.format-btn[data-command]');
        formatButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                triggerHaptic('light');
                const btnClicked = e.target.closest('.format-btn');
                const command = btnClicked.getAttribute('data-command');
                
                // Format rich text area using document.execCommand
                document.execCommand(command, false, null);
                btnClicked.classList.toggle('active');
                noteBodyContent.focus();
                saveCurrentNoteState(true);
            });
        });

        // Checklist insert button
        document.getElementById('toolbar-checklist').addEventListener('click', () => {
            triggerHaptic('light');
            insertChecklistItem();
        });

        // Custom quick emoji picker toggler
        const emojiPicker = document.getElementById('emoji-picker');
        document.getElementById('toolbar-emoji').addEventListener('click', () => {
            emojiPicker.style.display = emojiPicker.style.display === 'none' ? 'flex' : 'none';
        });

        // Inserting Quick emojis
        const emojiOptions = document.querySelectorAll('.emoji-option');
        emojiOptions.forEach(opt => {
            opt.addEventListener('click', (e) => {
                triggerHaptic('light');
                insertTextAtCaret(e.target.textContent);
                emojiPicker.style.display = 'none';
                saveCurrentNoteState(true);
            });
        });

        // Editor Auto-Saving listeners
        noteTitleInput.addEventListener('input', () => saveCurrentNoteState(true));
        noteCategorySelect.addEventListener('change', () => saveCurrentNoteState(true));
        noteTagsInput.addEventListener('input', () => saveCurrentNoteState(true));
        noteBodyContent.addEventListener('input', () => {
            updateCounters();
            saveCurrentNoteState(true);
        });

        // Back action from Note Editor
        editorBackBtn.addEventListener('click', () => {
            triggerHaptic('light');
            closeEditor();
        });

        // Pin/Favorite/Archive toggle actions from inside editor header
        editorPinBtn.addEventListener('click', () => {
            triggerHaptic('light');
            toggleEditorProperty('isPinned');
        });

        editorFavoriteBtn.addEventListener('click', () => {
            triggerHaptic('light');
            toggleEditorProperty('isFavorite');
        });

        editorArchiveBtn.addEventListener('click', () => {
            triggerHaptic('light');
            toggleEditorProperty('isArchived');
        });

        // More options dropdown toggler in editor
        editorMoreBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            moreActionsMenu.style.display = moreActionsMenu.style.display === 'flex' ? 'none' : 'flex';
        });

        document.addEventListener('click', () => {
            moreActionsMenu.style.display = 'none';
        });

        // More Actions menu click events
        actionDuplicate.addEventListener('click', () => {
            triggerHaptic('medium');
            duplicateNote(currentEditingNoteId);
        });

        actionCopyText.addEventListener('click', () => {
            triggerHaptic('light');
            copyNoteText();
        });

        actionShare.addEventListener('click', () => {
            triggerHaptic('light');
            shareNote();
        });

        actionExportTxt.addEventListener('click', () => {
            triggerHaptic('light');
            exportNoteAsTXT(currentEditingNoteId);
        });

        actionExportPdf.addEventListener('click', () => {
            triggerHaptic('light');
            exportNoteAsPDF(currentEditingNoteId);
        });

        actionDelete.addEventListener('click', () => {
            triggerHaptic('heavy');
            confirmDeleteNote(currentEditingNoteId);
        });

        // Color label selectors population
        renderColorPalette();

        // Settings actions: Simulated Profile Save
        saveSimProfileBtn.addEventListener('click', () => {
            triggerHaptic('medium');
            const simId = simUserIdInput.value.trim();
            const simName = simUserNameInput.value.trim();
            if (simId && simName) {
                localStorage.setItem('sim_telegram_id', simId);
                localStorage.setItem('sim_telegram_name', simName);
                currentUserId = simId;
                currentUserName = simName;
                currentUserAvatar = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(currentUserName)}&backgroundColor=0088cc,00a2e8,33b5e5&fontSize=40&bold=true`;
                
                userNameEl.textContent = currentUserName;
                userAvatarEl.src = currentUserAvatar;
                
                showToast("Identity switched to: " + currentUserName, "switch_account");
                settingsModal.style.display = 'none';
                
                // Re-initialize firebase subscription for new simulated user
                firebaseSyncManager.startSync(currentUserId);
            }
        });

        // Settings actions: Firebase Config Save
        saveFbConfigBtn.addEventListener('click', () => {
            triggerHaptic('medium');
            const config = {
                apiKey: fbApiKeyInput.value.trim(),
                projectId: fbProjectIdInput.value.trim(),
                appId: fbAppIdInput.value.trim(),
                authDomain: `${fbProjectIdInput.value.trim()}.firebaseapp.com`,
                storageBucket: `${fbProjectIdInput.value.trim()}.appspot.com`
            };
            
            if (config.apiKey && config.projectId && config.appId) {
                if (firebaseSyncManager.updateConfig(config)) {
                    showToast("Config Saved! Connecting...", "sync");
                    settingsModal.style.display = 'none';
                }
            } else {
                showToast("Please fill all Firebase fields", "error");
            }
        });

        resetFbConfigBtn.addEventListener('click', () => {
            triggerHaptic('heavy');
            showConfirmDialog(
                "Reset Sync Keys?",
                "This will revert the cloud sync to Demo Mode.",
                () => {
                    firebaseSyncManager.resetConfig();
                }
            );
        });

        // Export All / Import Note Triggers
        btnExportAll.addEventListener('click', () => {
            triggerHaptic('light');
            exportAllNotes();
        });

        btnImportTrigger.addEventListener('click', () => {
            fileImportInput.click();
        });

        fileImportInput.addEventListener('change', handleNoteImport);

        // Simulated & Real Ads Reward Triggers
        function showRealOrSimulatedAd() {
            if (typeof show_11220835 === 'function') {
                triggerHaptic('medium');
                showToast("Opening sponsored partner ad...", "ads_click");
                try {
                    show_11220835().then(() => {
                        // Ad completed successfully!
                        isPremiumThemesUnlocked = true;
                        localStorage.setItem('telegram_notes_premium', 'true');
                        triggerHaptic('success');
                        checkPremiumStatus();
                        rewardSuccessModal.style.display = 'flex';
                        showToast("Premium Themes Unlocked!", "stars");
                    }).catch(err => {
                        console.error("Ad failed, falling back to simulation", err);
                        simulateRewardedAd();
                    });
                } catch (err) {
                    console.error("Error running ad function, falling back to simulation", err);
                    simulateRewardedAd();
                }
            } else {
                console.log("Real Ads SDK not loaded yet or blocked, showing simulation");
                simulateRewardedAd();
            }
        }

        rewardAdBtn.addEventListener('click', () => showRealOrSimulatedAd());
        unlockPremiumBtn.addEventListener('click', () => showRealOrSimulatedAd());
        
        rewardCloseBtn.addEventListener('click', () => {
            rewardSuccessModal.style.display = 'none';
            settingsModal.style.display = 'none';
        });

        // Confirmation modals button events
        confirmCancelBtn.addEventListener('click', () => {
            confirmModal.style.display = 'none';
            confirmCallback = null;
        });

        confirmOkBtn.addEventListener('click', () => {
            if (confirmCallback) {
                confirmCallback();
            }
            confirmModal.style.display = 'none';
            confirmCallback = null;
        });
    }

    // --- Note Loading, Filtering, and Rendering ---

    /**
     * Renders filtered, sorted, and searched list of notes onto the grid dashboard
     */
    function renderNotes() {
        notesGrid.innerHTML = '';
        
        // Filter notes by Active Tab & Search
        let filteredNotes = notes.filter(note => {
            // Category checks
            if (activeCategory === 'pinned' && !note.isPinned) return false;
            if (activeCategory === 'favorites' && !note.isFavorite) return false;
            if (activeCategory === 'archived' && !note.isArchived) return false;
            
            // Standard Categories checks
            if (activeCategory !== 'pinned' && activeCategory !== 'favorites' && activeCategory !== 'archived') {
                if (note.isArchived) return false; // Hide archived in regular categories
                if (activeCategory !== 'all' && note.category !== activeCategory) return false;
            }

            // Search query matches
            if (searchQuery) {
                const titleMatch = note.title && note.title.toLowerCase().includes(searchQuery);
                const contentMatch = note.content && note.content.toLowerCase().includes(searchQuery);
                const tagMatch = note.tags && note.tags.some(tag => tag.toLowerCase().includes(searchQuery));
                
                // Search in checklists
                let checklistMatch = false;
                if (note.checklist) {
                    checklistMatch = note.checklist.some(item => item.text.toLowerCase().includes(searchQuery));
                }
                
                return titleMatch || contentMatch || tagMatch || checklistMatch;
            }

            return true;
        });

        // Sort notes based on criteria
        filteredNotes.sort((a, b) => {
            // First level: Always pull pinned notes to the very top in 'all' view
            if (activeCategory === 'all' && a.isPinned !== b.isPinned) {
                return a.isPinned ? -1 : 1;
            }

            if (activeSort === 'newest') {
                return b.updatedAt - a.updatedAt;
            } else if (activeSort === 'oldest') {
                return a.updatedAt - b.updatedAt;
            } else if (activeSort === 'alphabetical') {
                const titleA = (a.title || '').toLowerCase();
                const titleB = (b.title || '').toLowerCase();
                return titleA.localeCompare(titleB);
            }
            return 0;
        });

        // Display empty state if list is empty
        if (filteredNotes.length === 0) {
            notesGrid.appendChild(emptyState);
            emptyState.style.display = 'flex';
            return;
        }

        emptyState.style.display = 'none';

        // Append note cards
        filteredNotes.forEach(note => {
            const card = document.createElement('div');
            card.className = `note-card ${note.color ? 'color-' + note.color : ''}`;
            card.setAttribute('data-id', note.id);
            card.setAttribute('data-testtag', `note_card_${note.id}`);
            
            // Format dynamic date
            const dateStr = formatDateTime(note.updatedAt);

            // Calculate icons
            let iconsHTML = '';
            if (note.isPinned) iconsHTML += '<span class="emoji-icon pin-icon">📌</span>';
            if (note.isFavorite) iconsHTML += '<span class="emoji-icon favorite-icon">⭐</span>';

            // Generate category labels
            const categoryTagHTML = note.category && note.category !== 'all' 
                ? `<span class="note-card-tag">${note.category}</span>` 
                : '';

            // Generate card content preview (plain text excerpt or checklist)
            let previewHTML = '';
            if (note.checklist && note.checklist.length > 0) {
                previewHTML = '<div class="card-checklist-preview">';
                // Show up to 3 checklist items in card summary
                const visibleChecklist = note.checklist.slice(0, 3);
                visibleChecklist.forEach(item => {
                    previewHTML += `
                        <div class="card-checklist-item ${item.checked ? 'checked' : ''}">
                            <span class="emoji-icon" style="font-size: 14px; margin-right: 4px;">
                                ${item.checked ? '☑️' : '⬜'}
                            </span>
                            <span>${escapeHTML(item.text)}</span>
                        </div>
                    `;
                });
                if (note.checklist.length > 3) {
                    previewHTML += `<div style="font-size: 11px; opacity: 0.5; margin-left: 20px;">+ ${note.checklist.length - 3} more...</div>`;
                }
                previewHTML += '</div>';
            } else {
                // Stripped plain content
                const tempDiv = document.createElement('div');
                tempDiv.innerHTML = note.content || '';
                const plainText = tempDiv.textContent || tempDiv.innerText || '';
                previewHTML = `<div class="note-card-content">${escapeHTML(plainText)}</div>`;
            }

            card.innerHTML = `
                <div class="note-card-header">
                    <h4 class="note-card-title">${escapeHTML(note.title || "Untitled")}</h4>
                    <div class="note-card-icons">${iconsHTML}</div>
                </div>
                ${previewHTML}
                <div class="note-card-footer">
                    <span class="note-card-date">${dateStr}</span>
                    ${categoryTagHTML}
                </div>
            `;

            // Card click interaction
            card.addEventListener('click', () => {
                triggerHaptic('light');
                openNoteInEditor(note.id);
            });

            notesGrid.appendChild(card);
        });
    }

    // --- Note Editor CRUD & Actions ---

    function createNewNote() {
        const newNoteId = 'note_' + Date.now();
        const newNote = {
            id: newNoteId,
            title: '',
            content: '',
            color: 'none',
            isPinned: false,
            isArchived: false,
            isFavorite: false,
            category: 'all',
            tags: [],
            checklist: [],
            createdAt: Date.now(),
            updatedAt: Date.now(),
            wordCount: 0,
            characterCount: 0
        };

        notes.unshift(newNote);
        saveLocalCache();
        firebaseSyncManager.saveNote(newNote);
        
        openNoteInEditor(newNoteId);
    }

    function openNoteInEditor(noteId) {
        currentEditingNoteId = noteId;
        const note = notes.find(n => n.id === noteId);
        if (!note) return;

        currentView = 'editor';
        noteEditorModal.style.display = 'flex';
        updateTelegramBackButton();

        // Populate fields
        noteTitleInput.value = note.title || '';
        noteCategorySelect.value = note.category || 'all';
        noteTagsInput.value = (note.tags || []).join(', ');
        
        // Render dynamic content body
        if (note.checklist && note.checklist.length > 0) {
            renderChecklistEditor(note.checklist);
        } else {
            noteBodyContent.innerHTML = note.content || '';
        }

        // Toggle state icons in editor header
        updateEditorHeaderIcons(note);
        
        // Update color label palette
        selectColorDot(note.color || 'none');
        
        // Update counters
        updateCounters();
    }

    function updateEditorHeaderIcons(note) {
        editorPinBtn.classList.toggle('active', !!note.isPinned);
        editorFavoriteBtn.classList.toggle('active', !!note.isFavorite);
        editorArchiveBtn.classList.toggle('active', !!note.isArchived);
    }

    function renderColorPalette() {
        colorPalette.innerHTML = '';
        NOTE_COLORS.forEach(color => {
            const dot = document.createElement('div');
            dot.className = `color-dot ${color.name}`;
            dot.setAttribute('data-color', color.name);
            dot.addEventListener('click', () => {
                triggerHaptic('light');
                selectColorTheme(color.name);
            });
            colorPalette.appendChild(dot);
        });
    }

    function selectColorDot(colorName) {
        const dots = colorPalette.querySelectorAll('.color-dot');
        dots.forEach(d => {
            d.classList.toggle('active', d.getAttribute('data-color') === colorName);
        });
    }

    function selectColorTheme(colorName) {
        if (!isPremiumThemesUnlocked && colorName !== 'none') {
            showToast("Watch an ad to unlock premium themes!", "lock");
            settingsModal.style.display = 'flex';
            return;
        }

        selectColorDot(colorName);
        saveCurrentNoteState(false); // Quick update label metadata
    }

    function toggleEditorProperty(property) {
        const noteIndex = notes.findIndex(n => n.id === currentEditingNoteId);
        if (noteIndex === -1) return;

        notes[noteIndex][property] = !notes[noteIndex][property];
        notes[noteIndex].updatedAt = Date.now();
        
        updateEditorHeaderIcons(notes[noteIndex]);
        saveLocalCache();
        firebaseSyncManager.saveNote(notes[noteIndex]);
        showToast(property.replace('is', '') + " toggled", "bookmark");
    }

    /**
     * Extracts state of editor contents, formats into note fields and auto-saves
     */
    function saveCurrentNoteState(debounced = true) {
        if (!currentEditingNoteId) return;

        if (debounced) {
            if (autoSaveTimeout) clearTimeout(autoSaveTimeout);
            autoSaveTimeout = setTimeout(() => performSave(), 800);
        } else {
            performSave();
        }
    }

    function performSave() {
        const noteIndex = notes.findIndex(n => n.id === currentEditingNoteId);
        if (noteIndex === -1) return;

        const originalNote = notes[noteIndex];
        
        // Check color dot selection
        const activeColorDot = colorPalette.querySelector('.color-dot.active');
        const color = activeColorDot ? activeColorDot.getAttribute('data-color') : 'none';

        // Retrieve tags array
        const tags = noteTagsInput.value.split(',')
            .map(t => t.trim().toLowerCase())
            .filter(t => t.length > 0);

        // Retrieve editor body and detect if checklists are active
        const editorText = noteBodyContent.innerHTML;
        const checklists = extractChecklistsFromEditor();

        // Calculate lengths
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = editorText;
        const plainText = tempDiv.textContent || tempDiv.innerText || '';
        const wordCount = plainText.trim() ? plainText.trim().split(/\s+/).length : 0;
        const characterCount = plainText.length;

        // Construct saving structure
        const updatedNote = {
            ...originalNote,
            title: noteTitleInput.value.trim(),
            content: editorText,
            color: color,
            category: noteCategorySelect.value,
            tags: tags,
            checklist: checklists,
            wordCount: wordCount,
            characterCount: characterCount,
            updatedAt: Date.now()
        };

        // Commit save
        notes[noteIndex] = updatedNote;
        saveLocalCache();
        
        // Sync to Firestore
        firebaseSyncManager.saveNote(updatedNote);

        // Trigger visual "Cloud Done" save state indicator
        saveIndicator.classList.add('show');
        setTimeout(() => saveIndicator.classList.remove('show'), 1200);
    }

    function closeEditor() {
        if (autoSaveTimeout) {
            clearTimeout(autoSaveTimeout);
        }
        performSave(); // Final synchronous save on close
        
        currentView = 'list';
        currentEditingNoteId = null;
        noteEditorModal.style.display = 'none';
        updateTelegramBackButton();
        renderNotes();
    }

    /**
     * Rich text Caret Insertion Helper
     */
    function insertTextAtCaret(text) {
        noteBodyContent.focus();
        let sel, range;
        if (window.getSelection) {
            sel = window.getSelection();
            if (sel.getRangeAt && sel.rangeCount) {
                range = sel.getRangeAt(0);
                range.deleteContents();
                
                const textNode = document.createTextNode(text);
                range.insertNode(textNode);
                
                // Move selection caret past inserted text
                range.setStartAfter(textNode);
                range.setEndAfter(textNode);
                sel.removeAllRanges();
                sel.addRange(range);
            }
        }
    }

    /**
     * Inline checklist insertion inside the contenteditable element
     */
    function insertChecklistItem() {
        noteBodyContent.focus();
        
        const checklistDiv = document.createElement('div');
        checklistDiv.className = 'editable-checkbox';
        checklistDiv.setAttribute('contenteditable', 'false');
        
        const checkbox = document.createElement('span');
        checkbox.className = 'todo-checkbox';
        checkbox.addEventListener('click', (e) => {
            triggerHaptic('light');
            checkbox.classList.toggle('checked');
            todoText.classList.toggle('checked');
            saveCurrentNoteState(false);
        });
        
        const todoText = document.createElement('span');
        todoText.className = 'todo-text';
        todoText.setAttribute('contenteditable', 'true');
        todoText.setAttribute('placeholder', 'To-do item');
        todoText.innerHTML = 'New Item';
        
        checklistDiv.appendChild(checkbox);
        checklistDiv.appendChild(todoText);
        
        // Insert checklist element at cursor
        let sel, range;
        if (window.getSelection) {
            sel = window.getSelection();
            if (sel.getRangeAt && sel.rangeCount) {
                range = sel.getRangeAt(0);
                range.deleteContents();
                range.insertNode(checklistDiv);
                
                // Set cursor focus inside the new todo checklist text input
                range.selectNodeContents(todoText);
                range.collapse(true);
                sel.removeAllRanges();
                sel.addRange(range);
            }
        }
        
        saveCurrentNoteState(true);
    }

    /**
     * Extracts list elements from contenteditable
     */
    function extractChecklistsFromEditor() {
        const items = [];
        const checkboxDivs = noteBodyContent.querySelectorAll('.editable-checkbox');
        
        checkboxDivs.forEach(div => {
            const checkbox = div.querySelector('.todo-checkbox');
            const todoText = div.querySelector('.todo-text');
            if (checkbox && todoText) {
                items.push({
                    text: todoText.innerText || todoText.textContent || '',
                    checked: checkbox.classList.contains('checked')
                });
            }
        });
        
        return items;
    }

    /**
     * Populates checklist items inside the Editor editable body
     */
    function renderChecklistEditor(items) {
        noteBodyContent.innerHTML = '';
        items.forEach(item => {
            const checklistDiv = document.createElement('div');
            checklistDiv.className = 'editable-checkbox';
            checklistDiv.setAttribute('contenteditable', 'false');
            
            const checkbox = document.createElement('span');
            checkbox.className = `todo-checkbox ${item.checked ? 'checked' : ''}`;
            
            const todoText = document.createElement('span');
            todoText.className = `todo-text ${item.checked ? 'checked' : ''}`;
            todoText.setAttribute('contenteditable', 'true');
            todoText.innerHTML = escapeHTML(item.text);
            
            checkbox.addEventListener('click', () => {
                triggerHaptic('light');
                checkbox.classList.toggle('checked');
                todoText.classList.toggle('checked');
                saveCurrentNoteState(false);
            });

            todoText.addEventListener('input', () => saveCurrentNoteState(true));
            
            checklistDiv.appendChild(checkbox);
            checklistDiv.appendChild(todoText);
            noteBodyContent.appendChild(checklistDiv);
        });
    }

    function updateCounters() {
        const text = noteBodyContent.innerText || noteBodyContent.textContent || '';
        const charCount = text.length;
        const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;
        
        charCounter.textContent = `${charCount} characters`;
        wordCounter.textContent = `${wordCount} words`;
    }

    // --- Action Menu Methods ---

    function duplicateNote(noteId) {
        const original = notes.find(n => n.id === noteId);
        if (!original) return;

        const copyId = 'note_' + Date.now();
        const copyNote = {
            ...original,
            id: copyId,
            title: `${original.title || "Untitled"} (Copy)`,
            createdAt: Date.now(),
            updatedAt: Date.now()
        };

        notes.unshift(copyNote);
        saveLocalCache();
        firebaseSyncManager.saveNote(copyNote);
        
        showToast("Note duplicated!", "content_copy");
        closeEditor();
    }

    function copyNoteText() {
        const title = noteTitleInput.value;
        const text = noteBodyContent.innerText || noteBodyContent.textContent || '';
        const noteString = `${title}\n===================\n${text}`;
        
        navigator.clipboard.writeText(noteString).then(() => {
            showToast("Copied note text to clipboard", "content_copy");
        }).catch(() => {
            showToast("Failed to copy note", "error");
        });
    }

    function shareNote() {
        const title = noteTitleInput.value || 'Untitled Note';
        const text = noteBodyContent.innerText || noteBodyContent.textContent || '';
        
        if (navigator.share) {
            navigator.share({
                title: title,
                text: text,
            }).then(() => {
                showToast("Shared successfully", "share");
            }).catch(err => {
                console.error("Sharing failed", err);
            });
        } else {
            // Fallback: copy a mock link
            const shareUrl = `${window.location.href}?id=${currentEditingNoteId}`;
            navigator.clipboard.writeText(shareUrl).then(() => {
                showToast("Share URL copied to clipboard", "share");
            });
        }
    }

    function confirmDeleteNote(noteId) {
        showConfirmDialog(
            "Delete Note?",
            "Are you sure you want to delete this note? This action cannot be undone.",
            () => {
                deleteNote(noteId);
            }
        );
    }

    function deleteNote(noteId) {
        notes = notes.filter(n => n.id !== noteId);
        saveLocalCache();
        firebaseSyncManager.deleteNote(noteId);
        
        showToast("Note deleted successfully", "delete");
        
        if (currentView === 'editor') {
            closeEditor();
        } else {
            renderNotes();
        }
    }

    // --- Note Exporting and Importing ---

    function exportNoteAsTXT(noteId) {
        const note = notes.find(n => n.id === noteId);
        if (!note) return;

        const bodyText = noteBodyContent.innerText || noteBodyContent.textContent || '';
        const title = note.title || "Untitled Note";
        const contentStr = `Title: ${title}\nCategory: ${note.category}\nDate: ${formatDateTime(note.updatedAt)}\n\n${bodyText}`;
        
        downloadFile(`${title.replace(/\s+/g, '_')}.txt`, contentStr, "text/plain");
        showToast("Exported note as TXT", "download");
    }

    function exportNoteAsPDF(noteId) {
        const note = notes.find(n => n.id === noteId);
        if (!note) return;

        const bodyHTML = noteBodyContent.innerHTML || '';
        const title = note.title || "Untitled Note";

        // Create a temporary beautiful window containing styled note markup for clean native PDF printing
        const printWindow = window.open('', '_blank');
        printWindow.document.write(`
            <html>
            <head>
                <title>${title}</title>
                <style>
                    body {
                        font-family: 'Plus Jakarta Sans', sans-serif;
                        padding: 40px;
                        color: #1a1c1e;
                        max-width: 800px;
                        margin: 0 auto;
                    }
                    h1 { font-size: 28px; font-weight: 800; border-bottom: 2px solid #eeeeee; padding-bottom: 12px; }
                    .meta { font-size: 12px; color: #777777; margin-bottom: 30px; }
                    .content { font-size: 16px; line-height: 1.8; }
                    .editable-checkbox { display: flex; align-items: center; gap: 8px; margin: 10px 0; }
                    .todo-checkbox { width: 16px; height: 16px; border: 2px solid #74777f; border-radius: 4px; display: inline-block; }
                    .todo-checkbox.checked { background-color: #3f51b5; border-color: #3f51b5; }
                    .todo-checkbox.checked::after { content: "✓"; color: #ffffff; font-size: 11px; font-weight: bold; padding-left: 2px; }
                    .todo-text.checked { text-decoration: line-through; opacity: 0.6; }
                </style>
            </head>
            <body>
                <h1>${title}</h1>
                <div class="meta">Category: ${note.category} | Created: ${formatDateTime(note.createdAt)}</div>
                <div class="content">${bodyHTML}</div>
                <script>
                    window.onload = function() {
                        window.print();
                        setTimeout(() => window.close(), 1000);
                    }
                </script>
            </body>
            </html>
        `);
        printWindow.document.close();
        showToast("PDF Print Panel Opened", "picture_as_pdf");
    }

    function exportAllNotes() {
        if (notes.length === 0) {
            showToast("No notes to export", "error");
            return;
        }

        let archiveStr = "TELEGRAM NOTES BACKUP\n=======================\n\n";
        notes.forEach((note, index) => {
            const temp = document.createElement('div');
            temp.innerHTML = note.content || '';
            const plain = temp.textContent || temp.innerText || '';
            
            archiveStr += `[Note #${index + 1}]\n`;
            archiveStr += `Title: ${note.title || "Untitled"}\n`;
            archiveStr += `Category: ${note.category}\n`;
            archiveStr += `Date: ${formatDateTime(note.updatedAt)}\n`;
            archiveStr += `Content:\n${plain}\n`;
            archiveStr += `\n-----------------------\n\n`;
        });

        downloadFile(`telegram_notes_backup_${Date.now()}.txt`, archiveStr, "text/plain");
        showToast("Backup exported successfully", "download");
    }

    function handleNoteImport(e) {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = function(evt) {
            const fileContent = evt.target.result;
            const noteTitle = file.name.replace(/\.[^/.]+$/, "").replace(/_/g, ' '); // Strip .txt extension
            
            const newImportedNote = {
                id: 'note_' + Date.now(),
                title: noteTitle,
                content: fileContent.replace(/\n/g, '<br>'),
                color: 'none',
                isPinned: false,
                isArchived: false,
                isFavorite: false,
                category: 'all',
                tags: ['imported'],
                checklist: [],
                createdAt: Date.now(),
                updatedAt: Date.now(),
                wordCount: fileContent.trim() ? fileContent.trim().split(/\s+/).length : 0,
                characterCount: fileContent.length
            };

            notes.unshift(newImportedNote);
            saveLocalCache();
            firebaseSyncManager.saveNote(newImportedNote);
            
            showToast("TXT Note imported successfully!", "upload");
            renderNotes();
            
            // Clear inputs
            fileImportInput.value = '';
        };
        reader.readAsText(file);
    }

    function downloadFile(filename, content, mimeType) {
        const blob = new Blob([content], { type: mimeType });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    // --- Simulated Ad Rewarding ---

    function checkPremiumStatus() {
        if (isPremiumThemesUnlocked) {
            premiumStatusBanner.className = 'premium-status unlocked';
            premiumStatusBanner.innerHTML = '<span class="emoji-icon">⭐</span> <span>Premium Themes Unlocked! Enjoy pastel backgrounds.</span>';
            unlockPremiumBtn.style.display = 'none';
        } else {
            premiumStatusBanner.className = 'premium-status locked';
            premiumStatusBanner.innerHTML = '<span class="emoji-icon">🔒</span> <span>Premium Themes Locked. Watch a rewarded ad to unlock them!</span>';
            unlockPremiumBtn.style.display = 'block';
        }
    }

    function simulateRewardedAd() {
        triggerHaptic('medium');
        showToast("Loading rewarded ad sponsored partner...", "ads_click");
        
        // Spawn a temporary beautiful full-screen overlay simulating a video ad countdown
        const adOverlay = document.createElement('div');
        adOverlay.className = 'modal';
        adOverlay.style.display = 'flex';
        adOverlay.style.backgroundColor = 'rgba(0, 0, 0, 0.95)';
        
        adOverlay.innerHTML = `
            <div class="modal-card alert-card text-center" style="background: #111; color: white; padding: 30px;">
                <span class="emoji-icon" style="font-size: 48px; display: inline-block; animation: spin 2s linear infinite;">▶️</span>
                <h3 style="margin: 16px 0 8px 0;">Sponsor Video Playing</h3>
                <p style="font-size: 13px; opacity: 0.8;">Premium note skins are unlocking in <b id="ad-countdown" style="font-family: monospace; font-size: 16px; color: #b4c5ff;">3</b> seconds...</p>
                <div style="width: 100%; background: #333; height: 4px; border-radius: 2px; margin-top: 20px; overflow: hidden;">
                    <div id="ad-progress" style="width: 0%; height: 100%; background: var(--md-sys-color-primary); transition: width 3s linear;"></div>
                </div>
            </div>
        `;

        document.body.appendChild(adOverlay);
        
        // Start transitions
        setTimeout(() => {
            const progressBar = document.getElementById('ad-progress');
            if (progressBar) progressBar.style.width = '100%';
        }, 50);

        let count = 3;
        const interval = setInterval(() => {
            count--;
            const countEl = document.getElementById('ad-countdown');
            if (countEl) countEl.textContent = count;
            
            if (count <= 0) {
                clearInterval(interval);
                document.body.removeChild(adOverlay);
                
                // Unlock Success
                isPremiumThemesUnlocked = true;
                localStorage.setItem('telegram_notes_premium', 'true');
                triggerHaptic('success');
                checkPremiumStatus();
                
                // Show celebration splash modal
                rewardSuccessModal.style.display = 'flex';
            }
        }, 1000);
    }

    // --- Helper Utility Methods ---

    /**
     * Cross-platform haptic controller triggering either native Telegram or native Android system haptics
     */
    function triggerHaptic(type) {
        if (window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.HapticFeedback) {
            try {
                if (type === 'light' || type === 'medium' || type === 'heavy') {
                    window.Telegram.WebApp.HapticFeedback.impactOccurred(type);
                } else if (type === 'success' || type === 'warning' || type === 'error') {
                    window.Telegram.WebApp.HapticFeedback.notificationOccurred(type);
                }
            } catch (err) {
                console.error("Telegram Haptics error", err);
            }
        } else if (window.AndroidBridge && window.AndroidBridge.triggerHaptic) {
            try {
                window.AndroidBridge.triggerHaptic(type);
            } catch (err) {
                console.error("Android Native Haptics error", err);
            }
        }
    }

    function showToast(message, iconName = 'info') {
        const iconMap = {
            'lock': '🔒',
            'stars': '⭐',
            'download': '📥',
            'upload': '📤',
            'ads_click': '📢',
            'info': 'ℹ️',
            'cloud_done': '☁️',
            'cloud_off': '⚠️',
            'cloud_sync': '🔄',
            'delete': '🗑️',
            'check': '✅',
            'error': '❌'
        };
        const emoji = iconMap[iconName] || iconName;
        const toast = document.createElement('div');
        toast.className = 'toast';
        toast.innerHTML = `<span class="emoji-icon" style="font-size: 18px; margin-right: 8px;">${emoji}</span><span>${message}</span>`;
        toastContainer.appendChild(toast);
        
        // Remove toast after animation finishes
        setTimeout(() => {
            toast.style.animation = 'fadeOut 0.25s forwards';
            setTimeout(() => {
                toastContainer.removeChild(toast);
            }, 250);
        }, 2200);
    }

    function showConfirmDialog(title, message, callback) {
        confirmTitle.textContent = title;
        confirmMessage.textContent = message;
        confirmCallback = callback;
        confirmModal.style.display = 'flex';
    }

    function formatDateTime(timestamp) {
        const date = new Date(timestamp);
        const now = new Date();
        
        // Format options
        const isToday = date.toDateString() === now.toDateString();
        
        const hours = date.getHours().toString().padStart(2, '0');
        const minutes = date.getMinutes().toString().padStart(2, '0');
        
        if (isToday) {
            return `Today, ${hours}:${minutes}`;
        }
        
        const day = date.getDate().toString().padStart(2, '0');
        const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        const month = months[date.getMonth()];
        
        return `${day} ${month}, ${hours}:${minutes}`;
    }

    function escapeHTML(str) {
        if (!str) return '';
        return str.replace(/[&<>'"]/g, 
            tag => ({
                '&': '&amp;',
                '<': '&lt;',
                '>': '&gt;',
                "'": '&#39;',
                '"': '&quot;'
            }[tag] || tag)
        );
    }

    // BackPress Hook referenced inside MainActivity.kt shell backbutton listener
    window.handleAndroidBack = function() {
        if (currentView === 'editor') {
            closeEditor();
            return "true"; // back press handled
        }
        if (settingsModal.style.display === 'flex') {
            settingsModal.style.display = 'none';
            return "true";
        }
        if (confirmModal.style.display === 'flex') {
            confirmModal.style.display = 'none';
            return "true";
        }
        return "false"; // back press not handled, close applet
    };

    // Initialize application execution
    initializeApp();
});
