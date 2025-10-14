import React, { useState, useCallback, useMemo, useEffect } from 'react';
import type { Folder, PromptV, Provider, ApiKeyConfig } from './types';
import useLocalStorage from './hooks/useLocalStorage';
import Sidebar from './components/Sidebar';
import PromptView from './components/PromptView';
import SettingsView from './components/SettingsView';
import Resizer from './components/Resizer';
import { ALL_MODELS, validateApiKey } from './services/llmService';

const initialFolders: Folder[] = [
  { id: 'folder-1', name: 'Copywriting', createdAt: new Date().toISOString() },
  { id: 'folder-2', name: 'Code Generation', createdAt: new Date().toISOString() },
];

const initialPrompts: PromptV[] = [
  {
    id: 'prompt-1',
    baseId: 'prompt-1',
    folderId: 'folder-1',
    title: 'Blog Post Idea Generator',
    description: 'Generates 5 catchy blog post titles based on a topic.',
    systemPrompt: 'You are an expert copywriter and SEO specialist. Your goal is to generate witty, clickable, and search-engine-optimized blog post titles.',
    userPrompt: 'Generate 5 catchy and SEO-friendly blog post titles for the topic: {{topic}}.',
    tags: ['blogging', 'seo', 'marketing'],
    version: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    savedResponse: "1. **The Ultimate Guide to {{topic}}: Everything You've Ever Wanted to Know**\n2. **{{topic}} is Dead: Here's What's Replacing It**\n3. **5 Common Mistakes Everyone Makes in {{topic}} (and How to Fix Them)**\n4. **The {{topic}} Cheatsheet: A 5-Minute Guide for Beginners**\n5. **Why We're Obsessed With {{topic}} (And You Should Be, Too)**",
  },
   {
    id: 'prompt-2',
    baseId: 'prompt-2',
    folderId: 'folder-2',
    title: 'React Component Creator',
    description: 'Creates a basic React functional component with TypeScript.',
    systemPrompt: 'You are a senior frontend developer who writes clean, efficient, and well-documented React components using TypeScript and Tailwind CSS.',
    userPrompt: 'Create a React functional component named `{{componentName}}` using TypeScript. It should accept the following props: {{propsList}}. The component should be styled with Tailwind CSS.',
    tags: ['react', 'typescript', 'frontend'],
    version: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    savedResponse: '',
  },
  {
    id: 'prompt-3',
    baseId: 'prompt-3',
    folderId: null,
    title: 'Email Subject Line Writer',
    description: 'Writes a compelling email subject line.',
    systemPrompt: '',
    userPrompt: 'Write a compelling email subject line for an email about {{product}} that highlights its key benefit: {{benefit}}.',
    tags: ['email', 'marketing'],
    version: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    savedResponse: '',
  },
];

const initialApiKeys: Record<Provider, ApiKeyConfig> = {
  gemini: { key: process.env.API_KEY || '', status: 'untested' },
  openai: { key: '', status: 'untested' },
  anthropic: { key: '', status: 'untested' },
};


const App: React.FC = () => {
  const [folders, setFolders] = useLocalStorage<Folder[]>('prompt-manager-folders', initialFolders);
  const [prompts, setPrompts] = useLocalStorage<PromptV[]>('prompt-manager-prompts', initialPrompts);
  const [apiKeys, setApiKeys] = useLocalStorage<Record<Provider, ApiKeyConfig>>('llm-api-keys', initialApiKeys);

  const [selectedPromptId, setSelectedPromptId] = useState<string | null>(initialPrompts[0]?.id || null);
  const [activeView, setActiveView] = useState<'editor' | 'settings'>('editor');
  const [notification, setNotification] = useState<{ message: string; isError?: boolean } | null>(null);
  
  const [lastActivePromptId, setLastActivePromptId] = useState<string | null>(initialPrompts[0]?.id || null);
  useEffect(() => {
    if (activeView === 'editor' && selectedPromptId) {
      setLastActivePromptId(selectedPromptId);
    }
  }, [selectedPromptId, activeView]);

  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useLocalStorage<number>('sidebar-width', 320);
  const [isResizing, setIsResizing] = useState(false);
  
  const handleValidateKey = useCallback(async (provider: Provider, key: string) => {
    setApiKeys(prev => ({ ...prev, [provider]: { ...prev[provider], status: 'testing', key } }));
    const isValid = await validateApiKey(provider, key);
    setApiKeys(prev => ({ ...prev, [provider]: { ...prev[provider], status: isValid ? 'valid' : 'invalid', key } }));
  }, [setApiKeys]);

  useEffect(() => {
      // Auto-validate Gemini key from env var on first load if it hasn't been tested.
      const geminiConfig = apiKeys.gemini;
      if (geminiConfig.key && geminiConfig.status === 'untested' && process.env.API_KEY) {
          handleValidateKey('gemini', geminiConfig.key);
      }
  }, []); // Run only once on mount

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
      e.preventDefault();
      setIsResizing(true);
  }, []);

  const handleMouseUp = useCallback(() => {
      setIsResizing(false);
  }, []);

  const handleMouseMove = useCallback((e: MouseEvent) => {
      const newWidth = e.clientX;
      const minWidth = 220;
      const maxWidth = 500;
      if (newWidth >= minWidth && newWidth <= maxWidth) {
          setSidebarWidth(newWidth);
      }
  }, [setSidebarWidth]);

  useEffect(() => {
      if (!isResizing) return;
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
          window.removeEventListener('mousemove', handleMouseMove);
          window.removeEventListener('mouseup', handleMouseUp);
      };
  }, [isResizing, handleMouseMove, handleMouseUp]);


  const showNotification = useCallback((message: string, isError = false) => {
    setNotification({ message, isError });
    setTimeout(() => setNotification(null), 3000);
  }, []);

  const handleNewFolder = useCallback((name: string) => {
    if (name) {
      const newFolder: Folder = {
        id: `folder-${Date.now()}`,
        name,
        createdAt: new Date().toISOString(),
      };
      setFolders(prev => [...prev, newFolder].sort((a,b) => a.name.localeCompare(b.name)));
      showNotification(`Folder "${name}" created.`);
    }
  }, [setFolders, showNotification]);

  const handleNewPrompt = useCallback(() => {
    const newId = `prompt-${Date.now()}`;
    const newPrompt: PromptV = {
      id: newId,
      baseId: newId,
      folderId: null,
      title: 'New Prompt',
      description: '',
      systemPrompt: '',
      userPrompt: '',
      tags: [],
      version: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      savedResponse: '',
    };
    setPrompts(prev => [...prev, newPrompt]);
    setSelectedPromptId(newPrompt.id);
    setActiveView('editor');
    showNotification(`New prompt created.`);
  }, [setPrompts, showNotification]);
  
  const handleSavePrompt = useCallback((updatedPrompt: PromptV) => {
    setPrompts(prev => prev.map(p => p.id === updatedPrompt.id ? updatedPrompt : p));
    showNotification(`Prompt "${updatedPrompt.title}" saved.`);
  }, [setPrompts, showNotification]);

  const handleDeletePrompt = useCallback((id: string) => {
    const promptToDelete = prompts.find(p => p.id === id);
    if(!promptToDelete) return;

    setPrompts(prev => prev.filter(p => p.id !== id));

    if(selectedPromptId === id) {
        const otherVersions = prompts.filter(p => p.baseId === promptToDelete.baseId && p.id !== id);
        if (otherVersions.length > 0) {
            setSelectedPromptId(otherVersions.sort((a,b) => b.version - a.version)[0].id);
        } else {
            setSelectedPromptId(prompts[0]?.id || null);
        }
    }
    showNotification(`Prompt version deleted.`);
  }, [prompts, setPrompts, selectedPromptId, showNotification]);

  const handleForkPrompt = useCallback((id: string) => {
    const originalPrompt = prompts.find(p => p.id === id);
    if (originalPrompt) {
      const newId = `prompt-${Date.now()}`;
      const newPrompt: PromptV = {
        ...originalPrompt,
        id: newId,
        baseId: newId, 
        title: `${originalPrompt.title} (Fork)`,
        version: 1,
        forkedFrom: originalPrompt.id,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      setPrompts(prev => [...prev, newPrompt]);
      setSelectedPromptId(newPrompt.id);
      setActiveView('editor');
      showNotification(`Forked from "${originalPrompt.title}".`);
    }
  }, [prompts, setPrompts, showNotification]);

  const handleNewVersion = useCallback((promptId: string) => {
    const sourcePrompt = prompts.find(p => p.id === promptId);
    if (!sourcePrompt) return;

    const versions = prompts.filter(p => p.baseId === sourcePrompt.baseId);
    const maxVersion = Math.max(...versions.map(p => p.version));

    const newVersionPrompt: PromptV = {
        ...sourcePrompt,
        id: `prompt-${Date.now()}`,
        version: maxVersion + 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    };

    setPrompts(prev => [...prev, newVersionPrompt]);
    setSelectedPromptId(newVersionPrompt.id);
    showNotification(`Created version ${newVersionPrompt.version} for "${newVersionPrompt.title}".`);
  }, [prompts, setPrompts, showNotification]);
  
  const handleExportData = useCallback(() => {
    const data = {
      folders,
      prompts,
    };
    const jsonString = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonString], { type: "application/json" });
    const href = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = href;
    link.download = "prompt-manager-data.json";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(href);
    showNotification("Data exported successfully.");
  }, [folders, prompts, showNotification]);

  const handleImportData = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result;
        if (typeof text !== "string") {
          throw new Error("File could not be read.");
        }
        const data = JSON.parse(text);

        if (Array.isArray(data.folders) && Array.isArray(data.prompts)) {
          setFolders(data.folders);
          setPrompts(data.prompts);
          showNotification("Data imported successfully.");
          setActiveView("editor");
          setSelectedPromptId(data.prompts?.[0]?.id || null);
        } else {
          throw new Error("Invalid data format. The file must contain 'folders' and 'prompts' arrays.");
        }
      } catch (error) {
        console.error("Failed to import data:", error);
        const message = error instanceof Error ? error.message : "An unknown error occurred.";
        showNotification(`Import failed: ${message}`, true);
      }
    };
    reader.onerror = () => {
      showNotification("Error reading the selected file.", true);
    };
    reader.readAsText(file);
  }, [setFolders, setPrompts, showNotification]);


  const handleSelectPrompt = (id: string) => {
    setSelectedPromptId(id);
    setActiveView('editor');
  };

  const handleShowSettings = () => {
    setActiveView('settings');
    setSelectedPromptId(null);
  };
  
  const handleBackFromSettings = () => {
    setActiveView('editor');
    setSelectedPromptId(lastActivePromptId);
  };

  const toggleSidebar = () => {
    setIsSidebarCollapsed(prev => !prev);
  }

  const selectedPrompt = useMemo(() => {
    return prompts.find(p => p.id === selectedPromptId) || null;
  }, [prompts, selectedPromptId]);

  const latestPrompts = useMemo(() => {
    const promptsByBaseId = new Map<string, PromptV>();
    prompts.forEach(p => {
        const existing = promptsByBaseId.get(p.baseId);
        if (!existing || p.version > existing.version) {
            promptsByBaseId.set(p.baseId, p);
        }
    });
    return Array.from(promptsByBaseId.values());
  }, [prompts]);

  const promptVersions = useMemo(() => {
    if (!selectedPrompt) return [];
    return prompts
        .filter(p => p.baseId === selectedPrompt.baseId)
        .sort((a, b) => b.version - a.version);
  }, [prompts, selectedPrompt]);

  const availableModels = useMemo(() => {
    return ALL_MODELS.filter(model => apiKeys[model.provider]?.status === 'valid');
  }, [apiKeys]);

  return (
    <div className="h-screen w-screen flex bg-slate-900 font-sans overflow-hidden">
      {notification && (
        <div className={`absolute top-4 right-4 text-white py-2 px-4 rounded-lg shadow-lg z-50 animate-fade-in-out ${notification.isError ? 'bg-red-600' : 'bg-green-500'}`}>
          {notification.message}
        </div>
      )}
      <div style={{ width: isSidebarCollapsed ? '80px' : `${sidebarWidth}px` }} className="flex-shrink-0 h-full transition-width duration-200">
        <Sidebar
          folders={folders}
          prompts={latestPrompts}
          selectedPromptId={selectedPromptId}
          isCollapsed={isSidebarCollapsed}
          onSelectPrompt={handleSelectPrompt}
          onNewPrompt={handleNewPrompt}
          onNewFolder={handleNewFolder}
          onShowSettings={handleShowSettings}
          onToggle={toggleSidebar}
        />
      </div>
      {!isSidebarCollapsed && <Resizer onMouseDown={handleMouseDown} />}
      <main className="flex-grow h-full min-w-0">
        {activeView === 'editor' && selectedPrompt ? (
          <PromptView 
            key={selectedPrompt.id}
            prompt={selectedPrompt}
            folders={folders}
            promptVersions={promptVersions}
            onSave={handleSavePrompt}
            onDelete={handleDeletePrompt}
            onFork={handleForkPrompt}
            onNewVersion={handleNewVersion}
            onSelectVersion={handleSelectPrompt}
            availableModels={availableModels}
            apiKeys={apiKeys}
          />
        ) : activeView === 'settings' ? (
          <SettingsView 
            onBack={handleBackFromSettings} 
            onImport={handleImportData}
            onExport={handleExportData}
            apiKeys={apiKeys}
            onValidateKey={handleValidateKey}
          />
        ) : (
          <div className="h-full flex items-center justify-center text-slate-500">
            <div className="text-center">
              <h2 className="text-2xl font-semibold">Welcome to the Draftwise</h2>
              <p>Select a prompt from the sidebar to start editing, or create a new one.</p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default App;