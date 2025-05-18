import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { encrypt, decrypt } from '../utils/encryption';
// import LZString from 'lz-string';
import { useMemo } from 'react';

// Constants
const STORE_NAME = 'easy-notebook-settings';
const STORE_VERSION = 2;
const STORAGE_KEYS = {
    SETTINGS: 'easy-notebook-settings',
    BACKUP: 'easy-notebook-settings-backup'
};
const TEST_STORAGE_KEY = '!!testQuota';
const MIN_STORAGE_SPACE = 1024 * 50; // 50KB minimum storage requirement
const MAX_SHORTCUT_KEYS = 3; // Maximum number of keys in a shortcut combination
const CLEANUP_THRESHOLD = 1024 * 1024; // 1MB
const MAX_RETRY_ATTEMPTS = 3;
const DEFAULT_API_URL = 'https://api.example.com';

// Platform-specific key mapping
const PLATFORM_KEY_MAPPING = {
    macos: {
        Ctrl: '⌘',
        Alt: '⌥',
        Meta: '⌘',
    },
    windows: {
        Ctrl: 'Ctrl',
        Alt: 'Alt',
        Meta: 'Win',
    },
    linux: {
        Ctrl: 'Ctrl',
        Alt: 'Alt',
        Meta: 'Super',
    },
    default: {
        Ctrl: 'Ctrl',
        Alt: 'Alt',
        Meta: 'Meta',
    },
};

// System reserved shortcuts to avoid conflicts
const RESERVED_SHORTCUTS = new Set([
    'Ctrl+C',
    'Ctrl+V',
    'Ctrl+X',
    'Ctrl+A',
    'Ctrl+Z',
    'Ctrl+Y',
    'Ctrl+F',
    'Ctrl+P',
    'Ctrl+S',
    'Ctrl+O',
    'Ctrl+W',
    'Ctrl+T',
    'Ctrl+N',
    'Alt+Tab',
    'Alt+F4',
    'F5',
]);

// Initial settings with default values
const initialSettings = {
    apiKey: '',
    baseUrl: DEFAULT_API_URL,
    apiTimeout: 30000,
    markdownPreferences: {
        autoFormat: true,
        syntaxHighlighting: true,
        lineNumbers: false,
    },
    shortcuts: {
        newCell: 'Ctrl+Enter',
        runCell: 'Shift+Enter',
        deleteCell: 'Ctrl+D',
        formatCode: 'Alt+F',
        saveFile: 'Ctrl+S',
    },
    theme: 'system',
    syncEnabled: false,
    lastSyncTime: null,
};

// Storage management utilities
const storageManager = {
    async getStorageEstimate() {
        if ('storage' in navigator && 'estimate' in navigator.storage) {
            return await navigator.storage.estimate();
        }
        return null;
    },

    async checkStorageSpace() {
        try {
            const estimate = await this.getStorageEstimate();
            if (estimate) {
                return (estimate.quota - estimate.usage) > MIN_STORAGE_SPACE;
            }

            // Fallback: Use a small test string
            const testData = 'x'.repeat(1024);
            localStorage.setItem(TEST_STORAGE_KEY, testData);
            localStorage.removeItem(TEST_STORAGE_KEY);
            return true;
        } catch (e) {
            console.error('Storage space check failed:', e);
            return false;
        }
    },

    async clearOldBackups() {
        const keys = Object.keys(localStorage);
        const backupPattern = new RegExp(`${STORAGE_KEYS.BACKUP}-\\d+$`);
        const backups = keys.filter(key => backupPattern.test(key))
            .sort((a, b) => {
                const timeA = parseInt(a.split('-').pop()) || 0;
                const timeB = parseInt(b.split('-').pop()) || 0;
                return timeB - timeA;
            });

        // Keep only the 2 most recent backups
        for (let i = 2; i < backups.length; i++) {
            localStorage.removeItem(backups[i]);
        }
    },

    async createBackup(data) {
        try {
            const timestamp = Date.now();
            const backupKey = `${STORAGE_KEYS.BACKUP}-${timestamp}`;
            const compressed = JSON.stringify(data);
            localStorage.setItem(backupKey, compressed);
            await this.clearOldBackups();
        } catch (error) {
            console.error('Backup creation failed:', error);
        }
    },

    async restoreFromBackup() {
        const keys = Object.keys(localStorage);
        const backupPattern = new RegExp(`${STORAGE_KEYS.BACKUP}-\\d+$`);
        const latestBackup = keys.filter(key => backupPattern.test(key))
            .sort((a, b) => {
                const timeA = parseInt(a.split('-').pop()) || 0;
                const timeB = parseInt(b.split('-').pop()) || 0;
                return timeB - timeA;
            })[0];

        if (latestBackup) {
            try {
                const compressed = localStorage.getItem(latestBackup);
                const data = JSON.parse(compressed);
                return data;
            } catch (error) {
                console.error('Backup restoration failed:', error);
                return null;
            }
        }
        return null;
    },

    async cleanupStorage() {
        try {
            const keys = Object.keys(localStorage);
            const oldSettingsPattern = /^easy-notebook-(?!settings)/;
    
            // Get total size and sort by importance and age
            const items = await Promise.all(
                keys
                    .filter(key => oldSettingsPattern.test(key))
                    .map(async key => {
                        const value = localStorage.getItem(key);
                        const parsed = JSON.parse(value);
                        return {
                            key,
                            size: value.length,
                            timestamp: parsed?.timestamp || 0,
                            importance: parsed?.importance || 0,
                        };
                    })
            );
    
            // Sort by importance (ascending) and age (oldest first)
            items.sort((a, b) => {
                if (a.importance !== b.importance) {
                    return a.importance - b.importance;
                }
                return a.timestamp - b.timestamp;
            });
    
            // Remove items until we free up enough space
            let freedSpace = 0;
            for (const item of items) {
                localStorage.removeItem(item.key);
                freedSpace += item.size;
                if (freedSpace >= CLEANUP_THRESHOLD) break;
            }
    
            return true;
        } catch (e) {
            console.error('Storage cleanup failed:', e);
            return false;
        }
    }
};

// Utility Functions
const isValidUrl = (url) => {
    if (!url) return true; // Allow empty URL
    try {
        new URL(url);
        return true;
    } catch {
        return false;
    }
};

const validateShortcut = (shortcut, existingShortcuts) => {
    const keyPattern = /^(Ctrl|Alt|Shift|Meta)$/;
    const finalKeyPattern = /^([A-Za-z0-9]|F[1-9]|F1[0-2]|Enter|Space|Escape|Delete|Tab|ArrowUp|ArrowDown|ArrowLeft|ArrowRight|Home|End|PageUp|PageDown)$/;
    const parts = shortcut.split('+').map(p => p.trim());

    if (parts.length > MAX_SHORTCUT_KEYS || parts.length < 2) {
        throw new Error(`Shortcut must have 2-${MAX_SHORTCUT_KEYS} keys`);
    }

    const modifiers = parts.slice(0, -1);
    const finalKey = parts[parts.length - 1];

    if (!modifiers.every(mod => keyPattern.test(mod))) {
        throw new Error('Invalid modifier key(s)');
    }

    if (!finalKeyPattern.test(finalKey)) {
        throw new Error('Invalid final key');
    }

    const normalizedShortcut = shortcut.toLowerCase().replace(/\s+/g, '');
    if (RESERVED_SHORTCUTS.has(normalizedShortcut)) {
        throw new Error('This shortcut is reserved by the system');
    }

    const conflicts = Object.entries(existingShortcuts)
        .filter(([_, value]) => value.toLowerCase().replace(/\s+/g, '') === normalizedShortcut);

    if (conflicts.length > 0) {
        throw new Error(`Shortcut conflicts with: ${conflicts.map(([key]) => key).join(', ')}`);
    }

    return true;
};

const getPlatformInfo = () => {
    const platform = navigator.platform.toLowerCase();
    if (platform.includes('mac')) return 'macos';
    if (platform.includes('win')) return 'windows';
    if (platform.includes('linux')) return 'linux';
    return 'default';
};

const withRetry = async (operation, maxAttempts = MAX_RETRY_ATTEMPTS) => {
    let lastError;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
            return await operation();
        } catch (error) {
            lastError = error;
            if (attempt === maxAttempts) break;

            // Exponential backoff
            const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
            await new Promise(resolve => setTimeout(resolve, delay));

            // Try cleanup if storage is full
            if (error.name === 'QuotaExceededError') {
                await storageManager.cleanupStorage();
            }
        }
    }

    throw lastError;
};

// Create Settings Store
const createSettingsStore = (set, get) => ({
    settings: initialSettings,
    settingsOpen: false,
    error: null,

    // Panel Controls
    openSettings: () => set({ settingsOpen: true }),
    closeSettings: () => set({ settingsOpen: false }),

    // Error Handling
    setError: (error) => set({ error }),
    clearError: () => set({ error: null }),

    // API Settings
    updateApiSettings: async ({ apiKey, baseUrl, apiTimeout }) => {
        try {
            if (baseUrl && !isValidUrl(baseUrl)) {
                throw new Error('Invalid base URL format');
            }

            const encryptedKey = apiKey ? await encrypt(apiKey) : get().settings.apiKey;

            set((state) => ({
                settings: {
                    ...state.settings,
                    apiKey: encryptedKey,
                    baseUrl: baseUrl || state.settings.baseUrl,
                    apiTimeout: apiTimeout || state.settings.apiTimeout,
                },
                error: null,
            }));
        } catch (error) {
            set({ error: error.message });
            throw error;
        }
    },

    // Markdown Preferences
    updateMarkdownPreferences: (preferences) => {
        try {
            set((state) => ({
                settings: {
                    ...state.settings,
                    markdownPreferences: {
                        ...state.settings.markdownPreferences,
                        ...preferences,
                    }
                },
                error: null,
            }));
        } catch (error) {
            set({ error: error.message });
            throw error;
        }
    },

    // Shortcuts
    updateShortcut: (key, value) => {
        try {
            set((state) => {
                const currentShortcuts = { ...state.settings.shortcuts };
                delete currentShortcuts[key];

                if (validateShortcut(value, currentShortcuts)) {
                    return {
                        settings: {
                            ...state.settings,
                            shortcuts: {
                                ...state.settings.shortcuts,
                                [key]: value,
                            }
                        },
                        error: null,
                    };
                }
                return state;
            });
        } catch (error) {
            set({ error: error.message });
            throw error;
        }
    },

    // Reset Settings
    resetSetting: (key) => {
        try {
            set((state) => ({
                settings: {
                    ...state.settings,
                    [key]: initialSettings[key],
                },
                error: null,
            }));
        } catch (error) {
            set({ error: error.message });
            throw error;
        }
    },

    // Batch Update
    batchUpdateSettings: (updates) => {
        try {
            set((state) => ({
                settings: {
                    ...state.settings,
                    ...updates,
                },
                error: null,
            }));
        } catch (error) {
            set({ error: error.message });
            throw error;
        }
    },

    // Platform-specific shortcuts
    getPlatformShortcut: (shortcut) => {
        const platform = getPlatformInfo();
        const mapping = PLATFORM_KEY_MAPPING[platform] || PLATFORM_KEY_MAPPING.default;
        return shortcut.replace(/(Ctrl|Alt|Meta)/g, match => mapping[match] || match);
    },
});

// Storage Configuration
const storageConfig = {
    name: STORE_NAME,
    version: STORE_VERSION,

    partialize: (state) => ({
        settings: {
            ...state.settings,
            timestamp: Date.now(),
        }
    }),

    storage: {
        getItem: async (name) => {
            try {
                const value = localStorage.getItem(name);
                if (!value) {
                    // Try to restore from backup if main storage is empty
                    return await storageManager.restoreFromBackup();
                }

                const decompressed = value;
                const parsed = JSON.parse(decompressed);

                if (parsed.settings?.apiKey) {
                    parsed.settings.apiKey = await decrypt(parsed.settings.apiKey);
                }

                return parsed;
            } catch (error) {
                console.error('Error reading settings:', error);
                // Attempt to restore from backup on error
                return await storageManager.restoreFromBackup();
            }
        },

        setItem: async (name, value) => {
            return await withRetry(async () => {
                try {
                    // Create backup before attempting to save
                    await storageManager.createBackup(value);

                    // Check storage space and cleanup if necessary
                    if (!await storageManager.checkStorageSpace()) {
                        await storageManager.cleanupStorage();
                    }

                    // Compress with UTF16 for better compression ratio
                    const compressed = JSON.stringify(value);
                    localStorage.setItem(name, compressed);
                } catch (error) {
                    // If setting fails, try clearing some space and retry
                    if (error.name === 'QuotaExceededError') {
                        await storageManager.clearOldBackups();
                        // Compress and retry
                        const compressed = JSON.stringify(value);
                        localStorage.setItem(name, compressed);
                    } else {
                        throw error;
                    }
                }
            });
        },

        removeItem: async (name) => {
            try {
                localStorage.removeItem(name);
            } catch (error) {
                console.error('Error removing settings:', error);
            }
        }
    },

    migrate: (persistedState, version) => {
        let migratedState = { ...persistedState };

        try {
            switch (version) {
                case 0:
                    // Migration from initial version
                    migratedState = {
                        ...migratedState,
                        settings: {
                            ...initialSettings,
                            ...migratedState.settings,
                        }
                    };
                /* falls through */
                case 1:
                    // Add new v2 fields with defaults
                    migratedState.settings = {
                        ...migratedState.settings,
                        apiTimeout: initialSettings.apiTimeout,
                        theme: initialSettings.theme,
                        markdownPreferences: {
                            ...initialSettings.markdownPreferences,
                            ...migratedState.settings.markdownPreferences,
                        }
                    };
                    break;
                default:
                    if (version > STORE_VERSION) {
                        console.warn('Future version detected, resetting to initial state');
                        return { settings: initialSettings };
                    }
            }

            return migratedState;
        } catch (error) {
            console.error('Migration failed:', error);
            return { settings: initialSettings };
        }
    },

    // Add onRehydrateStorage handler
    onRehydrateStorage: () => (state) => {
        if (!state) {
            console.warn('Storage rehydration failed, attempting backup restore');
            return storageManager.restoreFromBackup();
        }
    }
};

// Create and export store
const useSettingsStore = create(persist(createSettingsStore, storageConfig));

// Export custom hooks and selectors
export const useSettings = () => useSettingsStore((state) => state.settings);
export const useSettingsOpen = () => useSettingsStore((state) => state.settingsOpen);
export const useSettingsError = () => useSettingsStore((state) => state.error);

// Add new hooks for storage management
export const useStorageManager = () => ({
    checkStorage: storageManager.checkStorageSpace,
    cleanup: storageManager.cleanupStorage,
    createBackup: storageManager.createBackup,
    restoreBackup: storageManager.restoreFromBackup,
    getStorageEstimate: storageManager.getStorageEstimate,
});

// Memoized platform shortcuts
export const usePlatformShortcuts = () => {
    const shortcuts = useSettingsStore((state) => state.settings.shortcuts);
    const getPlatformShortcut = useSettingsStore((state) => state.getPlatformShortcut);

    return useMemo(() => {
        const result = {};
        for (const [key, value] of Object.entries(shortcuts)) {
            result[key] = getPlatformShortcut(value);
        }
        return result;
    }, [shortcuts, getPlatformShortcut]);
};

export default useSettingsStore;
