import React, { useState, useMemo } from 'react';
import type { Folder, PromptV } from '../types';
import { FolderIcon, FileIcon, PlusIcon, SettingsIcon, ChevronRightIcon, LayoutSidebarLeftCollapseIcon } from './Icons';

interface SidebarProps {
  folders: Folder[];
  prompts: PromptV[];
  selectedPromptId: string | null;
  isCollapsed: boolean;
  onSelectPrompt: (id: string) => void;
  onNewPrompt: () => void;
  onNewFolder: (name: string) => void;
  onShowSettings: () => void;
  onToggle: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ folders, prompts, selectedPromptId, isCollapsed, onSelectPrompt, onNewPrompt, onNewFolder, onShowSettings, onToggle }) => {
  const [openFolders, setOpenFolders] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');

  const toggleFolder = (folderId: string) => {
    setOpenFolders(prev => {
      const newSet = new Set(prev);
      if (newSet.has(folderId)) {
        newSet.delete(folderId);
      } else {
        newSet.add(folderId);
      }
      return newSet;
    });
  };
  
  const searchResults = useMemo(() => {
    if (!searchTerm.trim()) {
      return [];
    }
    const lowercasedTerm = searchTerm.toLowerCase();
    return prompts.filter(p => 
      p.title.toLowerCase().includes(lowercasedTerm) ||
      p.tags.some(tag => tag.toLowerCase().includes(lowercasedTerm))
    );
  }, [prompts, searchTerm]);


  const promptsByFolder = useMemo(() => {
    const map = new Map<string | null, PromptV[]>();
    prompts.forEach(prompt => {
      const folderId = prompt.folderId || null;
      if (!map.has(folderId)) {
        map.set(folderId, []);
      }
      map.get(folderId)?.push(prompt);
    });
    return map;
  }, [prompts]);
  
  const handleSearchResultClick = (promptId: string) => {
    onSelectPrompt(promptId);
    setSearchTerm('');
  };

  const handleNewFolderClick = () => {
    setIsCreatingFolder(true);
  };

  const handleConfirmCreateFolder = () => {
    if (newFolderName.trim()) {
      onNewFolder(newFolderName.trim());
      setNewFolderName('');
      setIsCreatingFolder(false);
    }
  };

  const handleCancelCreateFolder = () => {
    setNewFolderName('');
    setIsCreatingFolder(false);
  };

  const handleNewFolderKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleConfirmCreateFolder();
    } else if (e.key === 'Escape') {
      handleCancelCreateFolder();
    }
  };

  const renderPrompt = (prompt: PromptV) => (
    <button
      key={prompt.id}
      onClick={() => onSelectPrompt(prompt.id)}
      title={isCollapsed ? prompt.title : undefined}
      className={`w-full text-left px-2 py-1.5 my-0.5 flex items-center rounded-md text-sm truncate ${isCollapsed ? 'justify-center' : ''} ${
        selectedPromptId === prompt.id
          ? 'bg-indigo-600 text-white'
          : 'text-slate-300 hover:bg-slate-700'
      }`}
    >
      <FileIcon className={`w-4 h-4 flex-shrink-0 ${!isCollapsed ? 'mr-2' : ''}`} />
      <span className={`truncate ${isCollapsed ? 'hidden' : ''}`}>{prompt.title}</span>
    </button>
  );

  return (
    <div className={`bg-slate-800 h-full flex flex-col ${isCollapsed ? 'p-2' : 'p-3'}`}>
      <div className="flex-shrink-0 mb-4">
        <div className="flex items-center justify-between mb-2">
            <h1 className={`text-xl font-bold text-white ${isCollapsed ? 'hidden' : ''}`}>Draftwise</h1>
            <button onClick={onToggle} title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'} className="p-1 text-slate-400 hover:bg-slate-700 rounded-md">
                <LayoutSidebarLeftCollapseIcon className={`w-5 h-5 transition-transform duration-300 ${isCollapsed ? 'rotate-180' : ''}`} />
            </button>
        </div>
        <div className={`flex ${isCollapsed ? 'flex-col space-y-2' : 'space-x-2'}`}>
            <button onClick={onNewPrompt} title="New Prompt" className={`flex-1 bg-indigo-500 hover:bg-indigo-600 text-white font-semibold py-2 rounded-md text-sm flex items-center justify-center transition-colors ${isCollapsed ? 'px-2' : 'px-3'}`}>
                <PlusIcon className="w-4 h-4" /> <span className={isCollapsed ? 'hidden' : 'ml-1'}>Prompt</span>
            </button>
            <button onClick={handleNewFolderClick} title="New Folder" className={`flex-1 bg-slate-600 hover:bg-slate-700 text-white font-semibold py-2 rounded-md text-sm flex items-center justify-center transition-colors ${isCollapsed ? 'px-2' : 'px-3'}`}>
                <PlusIcon className="w-4 h-4" /> <span className={isCollapsed ? 'hidden' : 'ml-1'}>Folder</span>
            </button>
        </div>
        {isCreatingFolder && !isCollapsed && (
          <div className="my-2 p-2 bg-slate-700 rounded-md">
            <input
              type="text"
              placeholder="New folder name"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              onKeyDown={handleNewFolderKeyDown}
              className="w-full bg-slate-800 border border-slate-600 rounded-md px-2 py-1 text-sm text-white placeholder-slate-400 focus:ring-1 focus:ring-indigo-500 outline-none"
              autoFocus
            />
            <div className="flex justify-end space-x-2 mt-2">
              <button onClick={handleCancelCreateFolder} className="text-xs px-2 py-1 rounded bg-slate-600 hover:bg-slate-500">Cancel</button>
              <button onClick={handleConfirmCreateFolder} className="text-xs px-2 py-1 rounded bg-indigo-600 hover:bg-indigo-500 text-white">Create</button>
            </div>
          </div>
        )}
        <div className={`mt-4 ${isCollapsed ? 'hidden' : ''}`}>
          <input 
            type="text"
            placeholder="Search prompts..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-700 border border-slate-600 rounded-md px-3 py-1.5 text-sm text-white placeholder-slate-400 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
          />
        </div>
      </div>

      <nav className="flex-grow overflow-y-auto overflow-x-hidden">
        {searchTerm.trim().length > 0 ? (
          <div>
            <h3 className={`px-2 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1 ${isCollapsed ? 'hidden' : ''}`}>Search Results</h3>
            {searchResults.length > 0 ? (
              searchResults.map(prompt => (
                <button
                  key={prompt.id}
                  onClick={() => handleSearchResultClick(prompt.id)}
                  title={isCollapsed ? prompt.title : undefined}
                  className={`w-full text-left px-2 py-1.5 my-0.5 flex items-center rounded-md text-sm truncate ${isCollapsed ? 'justify-center' : ''} text-slate-300 hover:bg-slate-700`}
                >
                  <FileIcon className={`w-4 h-4 flex-shrink-0 ${!isCollapsed ? 'mr-2' : ''}`} />
                  <span className={`truncate ${isCollapsed ? 'hidden' : ''}`}>{prompt.title}</span>
                </button>
              ))
            ) : (
              <p className={`px-2 text-sm text-slate-500 ${isCollapsed ? 'hidden' : ''}`}>No prompts found.</p>
            )}
          </div>
        ) : (
          <>
            {folders.map(folder => (
              <div key={folder.id}>
                <button onClick={() => toggleFolder(folder.id)} title={isCollapsed ? folder.name : undefined} className={`w-full flex items-center justify-between px-2 py-2 text-left text-slate-200 hover:bg-slate-700 rounded-md ${isCollapsed ? 'justify-center' : ''}`}>
                    <div className="flex items-center truncate">
                        <FolderIcon className={`w-5 h-5 flex-shrink-0 text-indigo-400 ${!isCollapsed ? 'mr-2' : ''}`} />
                        <span className={`font-semibold text-sm truncate ${isCollapsed ? 'hidden' : ''}`}>{folder.name}</span>
                    </div>
                    <ChevronRightIcon className={`w-5 h-5 text-slate-400 transition-transform ${openFolders.has(folder.id) ? 'rotate-90' : ''} ${isCollapsed ? 'hidden' : ''}`} />
                </button>
                {openFolders.has(folder.id) && (
                  <div className={!isCollapsed ? 'pl-4 border-l border-slate-600 ml-2' : ''}>
                    {(promptsByFolder.get(folder.id) || []).map(renderPrompt)}
                  </div>
                )}
              </div>
            ))}
            <div className="mt-2 pt-2 border-t border-slate-700">
                <h3 className={`px-2 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1 ${isCollapsed ? 'hidden' : ''}`}>Uncategorized</h3>
                {(promptsByFolder.get(null) || []).map(renderPrompt)}
            </div>
          </>
        )}
      </nav>

      <div className="flex-shrink-0 mt-2">
        <button onClick={onShowSettings} title="Settings" className={`w-full flex items-center px-2 py-2 text-left text-slate-300 hover:bg-slate-700 rounded-md ${isCollapsed ? 'justify-center' : ''}`}>
            <SettingsIcon className={`w-5 h-5 ${!isCollapsed ? 'mr-2' : ''}`} />
            <span className={`font-semibold text-sm ${isCollapsed ? 'hidden' : ''}`}>Settings</span>
        </button>
      </div>
    </div>
  );
};

export default Sidebar;