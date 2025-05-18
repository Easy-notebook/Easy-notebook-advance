// components/SettingsPage.js
import { useState, useEffect, useCallback } from 'react';
import { Settings, Settings2, Key, FileText, Keyboard } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import useSettingsStore, { useSettings, useSettingsOpen} from '../../store/settingsStore';

// Base components
const Input = ({ className = '', ...props }) => (
    <input
        className={`w-full px-4 py-3 border border-gray-300 rounded-md text-lg
        focus:outline-none focus:ring-2 focus:ring-theme-500 ${className}`}
        {...props}
    />
);


const Switch = ({ checked, onCheckedChange, className = '' }) => (
    <button
        role="switch"
        aria-checked={checked}
        onClick={() => onCheckedChange(!checked)}
        className={`relative inline-flex h-8 w-14 items-center rounded-full 
        ${checked ? 'bg-theme-500' : 'bg-gray-300'} 
        transition-colors focus:outline-none focus:ring-2 focus:ring-theme-500 focus:ring-offset-2
        ${className}`}
    >
        <span
            className={`${checked ? 'translate-x-7' : 'translate-x-1'}
        inline-block h-6 w-6 transform rounded-full bg-white transition-transform`}
        />
    </button>
);

const SettingsPage = () => {
    const { t } = useTranslation();
    const settings = useSettings();
    const settingsOpen = useSettingsOpen();
    const store = useSettingsStore();

    const [activeTab, setActiveTab] = useState('general');
    const [recordingShortcut, setRecordingShortcut] = useState(null);

    // Handlers
    const handleApiSettingsChange = async (e) => {
        const { name, value } = e.target;
        try {
            await store.updateApiSettings({
                [name]: value
            });
        } catch (error) {
            console.error('Failed to update API settings:', error);
        }
    };

    const handleMarkdownPreferenceChange = (key) => {
        store.updateMarkdownPreferences({
            [key]: !settings.markdownPreferences[key]
        });
    };

    const handleShortcutChange = (key, value) => {
        try {
            store.updateShortcut(key, value);
        } catch (error) {
            console.error('Failed to update shortcut:', error);
        }
    };

    // Click outside to cancel shortcut recording
    useEffect(() => {
        if (recordingShortcut) {
            const handleGlobalClick = () => setRecordingShortcut(null);
            window.addEventListener('click', handleGlobalClick);
            return () => window.removeEventListener('click', handleGlobalClick);
        }
    }, [recordingShortcut]);

    // Tab navigation
    const TabButton = ({ id, label, icon: Icon }) => (
        <button
            onClick={() => setActiveTab(id)}
            className={`flex items-center space-x-2 px-4 py-3 font-medium rounded-3xl 
        transition-colors ${activeTab === id
                    ? 'bg-theme-50 text-theme-600'
                    : 'text-gray-600 hover:bg-gray-100'}`}
        >
            <Icon className="w-5 h-5" />
            <span>{label}</span>
        </button>
    );

    // Shortcut recording component
    const ShortcutInput = ({ label, shortcutKey, value, recordingShortcut, onRecordingChange, onShortcutChange }) => {
        const [currentKeys, setCurrentKeys] = useState([]);
        const isRecording = recordingShortcut === shortcutKey;

        const handleKeyDown = useCallback((e) => {
            e.preventDefault();
            if (!isRecording) return;

            const keys = new Set();
            if (e.ctrlKey) keys.add('Ctrl');
            if (e.shiftKey) keys.add('Shift');
            if (e.altKey) keys.add('Alt');
            if (e.metaKey) keys.add('Meta');

            if (!['Control', 'Shift', 'Alt', 'Meta'].includes(e.key)) {
                keys.add(e.key.length === 1 ? e.key.toUpperCase() : e.key);
            }
            setCurrentKeys(Array.from(keys));
        }, [isRecording]);

        const handleKeyUp = useCallback((e) => {
            if (!isRecording) return;
            if (!e.ctrlKey && !e.shiftKey && !e.altKey && !e.metaKey) {
                onRecordingChange(null);
                if (currentKeys.length > 0) {
                    onShortcutChange(shortcutKey, currentKeys.join(' + '));
                }
                setCurrentKeys([]);
            }
        }, [isRecording, currentKeys, shortcutKey, onRecordingChange, onShortcutChange]);

        useEffect(() => {
            if (isRecording) {
                window.addEventListener('keydown', handleKeyDown);
                window.addEventListener('keyup', handleKeyUp);
                return () => {
                    window.removeEventListener('keydown', handleKeyDown);
                    window.removeEventListener('keyup', handleKeyUp);
                };
            }
        }, [isRecording, handleKeyDown, handleKeyUp]);

        const handleClick = (e) => {
            e.stopPropagation();
            if (isRecording) {
                onRecordingChange(null);
                setCurrentKeys([]);
                return;
            }
            if (recordingShortcut && recordingShortcut !== shortcutKey) {
                setCurrentKeys([]);
            }
            onRecordingChange(shortcutKey);
        };

        return (
            <div className="flex items-center justify-between">
                <span className="text-lg font-medium text-gray-700">{label}</span>
                <div className="relative">
                    <Input
                        readOnly
                        type="text"
                        value={isRecording ? currentKeys.join(' + ') : value}
                        className={`w-52 text-right font-mono text-base cursor-pointer
            ${isRecording ? 'bg-gray-50 border-theme-500' : ''}`}
                        onClick={handleClick}
                        placeholder={t('settings.shortcuts.recordPrompt')}
                    />
                </div>
            </div>
        );
    };

    // Tab contents
    const tabContents = {
        general: (
            <div className="p-2">
                <h2 className="text-xl font-bold mb-4 flex items-center space-x-2">
                    <Key className="w-5 h-5" />
                    <span>{t('settings.api.title')}</span>
                </h2>
                <div className="space-y-5">
                    <div>
                        <label className="block text-lg font-medium text-gray-700 mb-2">{t('settings.api.apiKey')}</label>
                        <Input
                            type="password"
                            name="apiKey"
                            value={settings.apiKey}
                            onChange={handleApiSettingsChange}
                            placeholder={t('settings.api.placeholders.apiKey')}
                        />
                    </div>
                    <div>
                        <label className="block text-lg font-medium text-gray-700 mb-2">{t('settings.api.baseUrl')}</label>
                        <Input
                            type="text"
                            name="baseUrl"
                            value={settings.baseUrl}
                            onChange={handleApiSettingsChange}
                            placeholder={t('settings.api.placeholders.baseUrl')}
                        />
                    </div>
                    <div>
                        <label className="block text-lg font-medium text-gray-700 mb-2">{t('settings.api.apiTimeout')}</label>
                        <Input
                            type="number"
                            name="apiTimeout"
                            value={settings.apiTimeout}
                            onChange={handleApiSettingsChange}
                            placeholder={t('settings.api.placeholders.apiTimeout')}
                        />
                    </div>
                </div>
            </div>
        ),
        shortcuts: (
            <div className="p-2">
                <h2 className="text-xl font-bold mb-4 flex items-center space-x-2">
                    <Keyboard className="w-6 h-6" />
                    <span>{t('settings.shortcuts.title')}</span>
                </h2>
                <div className="space-y-5">
                    {Object.entries(settings.shortcuts).map(([key, value]) => (
                        <ShortcutInput
                            key={key}
                            label={key.replace(/([A-Z])/g, ' $1').trim()}
                            shortcutKey={key}
                            value={value}
                            recordingShortcut={recordingShortcut}
                            onRecordingChange={setRecordingShortcut}
                            onShortcutChange={handleShortcutChange}
                        />
                    ))}
                </div>
            </div>
        ),
        markdown: (
            <div className="p-2">
                <h2 className="text-xl font-bold mb-4 flex items-center space-x-2">
                    <FileText className="w-6 h-6" />
                    <span>{t('settings.markdown.title')}</span>
                </h2>
                <div className="space-y-5">
                    {Object.entries(settings.markdownPreferences).map(([key, value]) => (
                        <div key={key} className="flex items-center justify-between">
                            <div>
                                <h3 className="text-lg font-medium text-gray-700">
                                    {t(`settings.markdown.${key}`)}
                                </h3>
                                <p className="text-base text-gray-500">
                                    {t(`settings.markdown.${key}Desc`)}
                                </p>
                            </div>
                            {typeof value === 'boolean' ? (
                                <Switch
                                    checked={value}
                                    onCheckedChange={() => handleMarkdownPreferenceChange(key)}
                                />
                            ) : (
                                <Input
                                    type="number"
                                    value={value}
                                    className="w-24 text-right"
                                    onChange={(e) => handleMarkdownPreferenceChange(key, parseInt(e.target.value, 10))}
                                />
                            )}
                        </div>
                    ))}
                </div>
            </div>
        ),
    };

    return (
        <div>

            {settingsOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center">
                    <div className="absolute inset-0 bg-black/20" onClick={store.closeSettings} />
                    <div className="relative bg-white w-full max-w-4xl max-h-[90vh] 
            overflow-y-auto rounded-3xl shadow-xl">
                        <div className="sticky top-0 bg-white border-b z-10">
                            <div className="flex items-center justify-between px-6 py-4">
                                <div className="flex items-center space-x-2">
                                    <Settings2 className="w-5 h-5 text-gray-600" />
                                    <h1 className="text-xl font-bold text-gray-800">{t('settings.title')}</h1>
                                </div>
                                <button
                                    onClick={store.closeSettings}
                                    className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                                    aria-label="Close Settings"
                                >
                                    <svg
                                        width="20"
                                        height="20"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="2"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                    >
                                        <path d="M18 6L6 18M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>

                            <div className="px-6 py-2 flex space-x-2">
                                <TabButton id="general" label={t('settings.tabs.general')} icon={Settings} />
                                <TabButton id="shortcuts" label={t('settings.tabs.shortcuts')} icon={Keyboard} />
                                <TabButton id="markdown" label={t('settings.tabs.markdown')} icon={FileText} />
                            </div>
                        </div>

                        <div className="p-6">
                            {tabContents[activeTab]}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SettingsPage;