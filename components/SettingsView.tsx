
import React, { useRef, useState } from 'react';
import { ChevronLeftIcon, UploadIcon, DownloadIcon, CheckCircleIcon, XCircleIcon, SpinnerIcon } from './Icons';
import { ApiKeyConfig, Provider, PROVIDERS, Settings } from '../types';

interface SettingsViewProps {
  onBack: () => void;
  onImport: (file: File) => void;
  onExport: () => void;
  apiKeys: Record<Provider, ApiKeyConfig>;
  onValidateKey: (provider: Provider, key: string) => Promise<void>;
  settings: Settings;
  onSettingsChange: (settings: Settings) => void;
}

const ApiKeyManager: React.FC<{
  provider: { id: Provider; name: string };
  config: ApiKeyConfig;
  onValidate: (provider: Provider, key: string) => Promise<void>;
}> = ({ provider, config, onValidate }) => {
  const [keyInput, setKeyInput] = useState(config.key);
  const isGeminiEnv = provider.id === 'gemini' && config.key && !localStorage.getItem('llm-api-keys')?.includes('gemini');

  const handleSave = () => {
    onValidate(provider.id, keyInput);
  };

  const getStatusIndicator = () => {
    if (config.status === 'testing') {
      return <div className="flex items-center text-sm text-yellow-400"><SpinnerIcon className="w-4 h-4 mr-2" /> Validating...</div>;
    }
    if (config.status === 'valid') {
      return <div className="flex items-center text-sm text-green-400"><CheckCircleIcon className="w-4 h-4 mr-2" /> Key is valid.</div>;
    }
    if (config.status === 'invalid') {
      return <div className="flex items-center text-sm text-red-400"><XCircleIcon className="w-4 h-4 mr-2" /> Invalid key.</div>;
    }
    if (isGeminiEnv) {
         return <div className="flex items-center text-sm text-slate-400">Using key from environment variable.</div>;
    }
    return <div className="text-sm text-slate-500">Key not configured.</div>;
  };

  return (
    <div className="bg-slate-900 p-4 rounded-md">
      <h4 className="font-semibold text-lg text-white mb-2">{provider.name}</h4>
      <div className="flex items-center space-x-3">
        <input
          type="password"
          placeholder={`Enter your ${provider.name} API Key`}
          value={keyInput}
          onChange={(e) => setKeyInput(e.target.value)}
          disabled={config.status === 'testing' || isGeminiEnv}
          className="flex-grow bg-slate-700 border border-slate-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm disabled:opacity-50"
        />
        <button
          onClick={handleSave}
          disabled={config.status === 'testing' || keyInput === config.key || isGeminiEnv}
          className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 px-4 rounded-md transition-colors disabled:bg-slate-600 disabled:cursor-not-allowed"
        >
          Save & Validate
        </button>
      </div>
      <div className="mt-2 h-5">
        {getStatusIndicator()}
      </div>
    </div>
  );
};


const SettingsView: React.FC<SettingsViewProps> = ({ onBack, onImport, onExport, apiKeys, onValidateKey, settings, onSettingsChange }) => {
  const importInputRef = useRef<HTMLInputElement>(null);

  const handleImportClick = () => {
    importInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onImport(file);
      e.target.value = '';
    }
  };

  return (
    <div className="p-8 text-slate-300 overflow-y-auto h-full">
      <div className="flex items-center mb-6">
        <button 
          onClick={onBack} 
          className="p-2 rounded-full hover:bg-slate-700 mr-4 transition-colors"
          title="Go back"
          aria-label="Go back"
        >
          <ChevronLeftIcon className="w-6 h-6" />
        </button>
        <h2 className="text-3xl font-bold text-white">Settings</h2>
      </div>
      
      <div className="space-y-8 max-w-4xl mx-auto">
        <div className="bg-slate-800 p-6 rounded-lg border border-slate-700">
          <h3 className="text-xl font-semibold text-white mb-4">LLM API Keys</h3>
          <p className="text-sm text-slate-400 mb-4">
            Provide API keys for the services you want to use for prompt testing. Keys are stored in your browser's local storage and are not sent anywhere else.
          </p>
          <div className="space-y-4">
            {PROVIDERS.map(provider => (
              <ApiKeyManager
                key={provider.id}
                provider={provider}
                config={apiKeys[provider.id]}
                onValidate={onValidateKey}
              />
            ))}
          </div>
        </div>
        
        <div className="bg-slate-800 p-6 rounded-lg border border-slate-700">
          <h3 className="text-xl font-semibold text-white mb-4">Testing Preferences</h3>
          <div className="flex items-center justify-between">
            <div>
              <label htmlFor="auto-save-toggle" className="font-medium text-slate-200 block cursor-pointer">
                Automatically save last test result
              </label>
              <p className="text-sm text-slate-400 mt-1">
                When enabled, the result of a test run will automatically be saved to the prompt version.
              </p>
            </div>
            <div className="flex-shrink-0">
              <label htmlFor="auto-save-toggle" className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  id="auto-save-toggle"
                  className="sr-only peer"
                  checked={settings.autoSaveTestResult}
                  onChange={(e) => onSettingsChange({ ...settings, autoSaveTestResult: e.target.checked })}
                />
                <div className="w-11 h-6 bg-slate-600 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-offset-2 peer-focus:ring-offset-slate-800 peer-focus:ring-indigo-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
              </label>
            </div>
          </div>
        </div>

        <div className="bg-slate-800 p-6 rounded-lg border border-slate-700">
          <h3 className="text-xl font-semibold text-white mb-4">Data Management</h3>
          <p className="text-sm text-slate-400 mb-4">
            In some preview environments (like AI Studio), browser storage might not persist between sessions. Use the export feature to save your work to a file, and import it back later.
          </p>
          <div className="flex space-x-4">
            <button
              onClick={handleImportClick}
              className="flex-1 flex items-center justify-center bg-slate-600 hover:bg-slate-700 text-white font-semibold py-2 px-4 rounded-md transition-colors"
            >
              <UploadIcon className="w-5 h-5 mr-2" />
              Import Data
            </button>
            <input 
              type="file" 
              ref={importInputRef} 
              onChange={handleFileChange} 
              className="hidden" 
              accept=".json" 
            />
            <button
              onClick={onExport}
              className="flex-1 flex items-center justify-center bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 px-4 rounded-md transition-colors"
            >
              <DownloadIcon className="w-5 h-5 mr-2" />
              Export Data
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsView;
