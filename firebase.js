/**
 * Firebase Integration Module for Telegram Mini Notes App
 * Provides cloud sync using Firebase Firestore under Telegram User ID.
 */

// Fallback / Demo Firebase Configuration
// If the user wants to connect their own Firebase, they can input their configuration in the settings modal.
const DEFAULT_FIREBASE_CONFIG = {
    apiKey: "YOUR_API_KEY_HERE",
    authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_PROJECT_ID.appspot.com",
    messagingSenderId: "YOUR_SENDER_ID",
    appId: "YOUR_APP_ID"
};

class FirebaseSyncManager {
    constructor() {
        this.app = null;
        this.db = null;
        this.isInitialized = false;
        this.currentUserId = null;
        this.unsubscribeNotes = null;
        this.onSyncCallback = null;
        this.onConnectionStatusCallback = null;
        
        this.init();
    }

    /**
     * Initializes Firebase App and Firestore
     */
    init() {
        // Try to load user-defined Firebase config from LocalStorage first, otherwise use default
        let config = DEFAULT_FIREBASE_CONFIG;
        try {
            const customConfig = localStorage.getItem('telegram_notes_firebase_config');
            if (customConfig) {
                config = JSON.parse(customConfig);
            }
        } catch (e) {
            console.error("Failed to parse custom Firebase config", e);
        }

        // Verify that the configuration is actual and not the template placeholder
        if (!config || config.apiKey === "YOUR_API_KEY_HERE" || !config.projectId || config.projectId === "YOUR_PROJECT_ID") {
            console.warn("Firebase is running in Offline/Demo mode. Connect your Firebase project in the Settings panel for cloud syncing!");
            this.isInitialized = false;
            if (this.onConnectionStatusCallback) {
                this.onConnectionStatusCallback('demo');
            }
            return;
        }

        try {
            // Check if firebase object is loaded from CDN
            if (typeof firebase !== 'undefined') {
                // Initialize compat App
                this.app = firebase.initializeApp(config);
                // Initialize Firestore with offline persistence enabled
                this.db = firebase.firestore();
                
                // Enable multi-tab offline persistence
                this.db.enablePersistence({ synchronizeTabs: true })
                    .catch((err) => {
                        if (err.code == 'failed-precondition') {
                            console.warn("Firestore persistence failed: Multiple tabs open.");
                        } else if (err.code == 'unimplemented') {
                            console.warn("Firestore persistence not supported by this browser.");
                        }
                    });

                this.isInitialized = true;
                console.log("Firebase successfully initialized with Project ID:", config.projectId);
                
                if (this.onConnectionStatusCallback) {
                    this.onConnectionStatusCallback('connected');
                }

                // If we already have a user ID, start syncing immediately
                if (this.currentUserId) {
                    this.startSync(this.currentUserId);
                }
            } else {
                console.error("Firebase library not loaded from CDN.");
                this.isInitialized = false;
                if (this.onConnectionStatusCallback) {
                    this.onConnectionStatusCallback('error');
                }
            }
        } catch (error) {
            console.error("Firebase initialization failed:", error);
            this.isInitialized = false;
            if (this.onConnectionStatusCallback) {
                this.onConnectionStatusCallback('error');
            }
        }
    }

    /**
     * Updates Firebase Configuration dynamically
     */
    updateConfig(newConfig) {
        try {
            localStorage.setItem('telegram_notes_firebase_config', JSON.stringify(newConfig));
            
            // Delete existing app and reinitialize
            if (this.app) {
                // Compat mode delete is sync/async
                this.app.delete().then(() => {
                    this.init();
                }).catch(err => {
                    console.error("Error deleting old Firebase App", err);
                    location.reload(); // Hard reload as fallback to clean memory
                });
            } else {
                this.init();
            }
            return true;
        } catch (error) {
            console.error("Error saving new configuration", error);
            return false;
        }
    }

    /**
     * Resets Firebase configuration to demo mode
     */
    resetConfig() {
        localStorage.removeItem('telegram_notes_firebase_config');
        location.reload();
    }

    /**
     * Starts syncing notes for a specific Telegram User ID
     */
    startSync(telegramUserId) {
        this.currentUserId = telegramUserId;
        if (!this.isInitialized || !this.db) {
            return;
        }

        // Unsubscribe from previous listener if active
        if (this.unsubscribeNotes) {
            this.unsubscribeNotes();
        }

        console.log("Starting Firebase Sync for Telegram User ID:", telegramUserId);

        const notesRef = this.db.collection('users').doc(telegramUserId.toString()).collection('notes');

        // Setup real-time listener
        this.unsubscribeNotes = notesRef.onSnapshot((snapshot) => {
            const firebaseNotes = [];
            snapshot.forEach((doc) => {
                firebaseNotes.push({
                    id: doc.id,
                    ...doc.data()
                });
            });

            console.log(`Synced ${firebaseNotes.length} notes from Firebase.`);
            if (this.onSyncCallback) {
                this.onSyncCallback(firebaseNotes);
            }
        }, (error) => {
            console.error("Firestore sync error:", error);
            if (this.onConnectionStatusCallback) {
                this.onConnectionStatusCallback('disconnected');
            }
        });

        // Listen to connection state changes
        const connectedRef = this.db.doc('.info/connected');
        // Note: Compat Firestore does not support .info/connected directly without Realtime Database,
        // so we monitor window.onLine event and Firestore metadata
        window.addEventListener('online', () => this.handleNetworkChange(true));
        window.addEventListener('offline', () => this.handleNetworkChange(false));
    }

    handleNetworkChange(isOnline) {
        if (this.onConnectionStatusCallback) {
            this.onConnectionStatusCallback(isOnline ? 'connected' : 'offline');
        }
    }

    /**
     * Saves or Updates a single note to Firestore
     */
    async saveNote(note) {
        if (!this.isInitialized || !this.db || !this.currentUserId) {
            return false;
        }

        const noteId = note.id;
        // Make a clean clone of the note to save (remove local-only temp states if any)
        const noteToSave = { ...note };
        
        // Remove id from properties inside document since it is stored as document ID
        delete noteToSave.id;

        try {
            await this.db.collection('users')
                .doc(this.currentUserId.toString())
                .collection('notes')
                .doc(noteId)
                .set(noteToSave, { merge: true });
            return true;
        } catch (e) {
            console.error("Error saving note to Firebase:", e);
            return false;
        }
    }

    /**
     * Deletes a note from Firestore
     */
    async deleteNote(noteId) {
        if (!this.isInitialized || !this.db || !this.currentUserId) {
            return false;
        }

        try {
            await this.db.collection('users')
                .doc(this.currentUserId.toString())
                .collection('notes')
                .doc(noteId)
                .delete();
            return true;
        } catch (e) {
            console.error("Error deleting note from Firebase:", e);
            return false;
        }
    }

    /**
     * Syncs a batch of local notes to Firebase (useful when reconnecting or after initial setup)
     */
    async uploadLocalNotes(localNotes) {
        if (!this.isInitialized || !this.db || !this.currentUserId) {
            return false;
        }

        console.log("Uploading local notes to Firebase Firestore...");
        const batch = this.db.batch();
        const notesRef = this.db.collection('users').doc(this.currentUserId.toString()).collection('notes');

        localNotes.forEach(note => {
            const noteCopy = { ...note };
            const noteId = noteCopy.id;
            delete noteCopy.id;
            
            const docRef = notesRef.doc(noteId);
            batch.set(docRef, noteCopy, { merge: true });
        });

        try {
            await batch.commit();
            console.log("Successfully batch-synced notes with Firebase.");
            return true;
        } catch (e) {
            console.error("Batch sync to Firebase failed:", e);
            return false;
        }
    }
}

// Instantiate the global sync manager
const firebaseSyncManager = new FirebaseSyncManager();
