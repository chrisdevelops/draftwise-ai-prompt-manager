import React, { useState, useEffect, useMemo, useCallback } from 'react';
import type { PromptV, Folder, ModelDefinition, Provider, ApiKeyConfig } from '../types';
import { runPrompt } from '../services/llmService';
import { ForkIcon, TrashIcon, CopyIcon, CheckIcon, TestTubeIcon } from './Icons';
import useLocalStorage from '../hooks/useLocalStorage';
import Resizer from './Resizer';

interface PromptViewProps {
  prompt: PromptV;
  folders: Folder[];
  promptVersions: PromptV[];
  onSave: (prompt: PromptV) => void;
  onDelete: (id: string) => void;
  onFork: (id: string) => void;
  onNewVersion: (id: string) => void;
  onSelectVersion: (id: string) => void;
  availableModels: ModelDefinition[];
  apiKeys: Record<Provider, ApiKeyConfig>;
}

const TagInput: React.FC<{ tags: string[]; setTags: (tags: string[]) => void }> = ({ tags, setTags }) => {
  const [inputValue, setInputValue] = useState('');

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      const newTag = inputValue.trim();
      if (newTag && !tags.includes(newTag)) {
        setTags([...tags, newTag]);
      }
      setInputValue('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-2">
        {tags.map(tag => (
          <div key={tag} className="flex items-center bg-slate-600 text-slate-200 text-sm font-medium px-2 py-1 rounded-full">
            <span>{tag}</span>
            <button onClick={() => removeTag(tag)} className="ml-2 text-slate-400 hover:text-white">
              &times;
            </button>
          </div>
        ))}
      </div>
      <input
        type="text"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Add tags (press Enter)"
        className="block w-full bg-slate-700 border-slate-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
      />
    </div>
  );
};


const PromptView: React.FC<PromptViewProps> = ({ prompt, folders, promptVersions, onSave, onDelete, onFork, onNewVersion, onSelectVersion, availableModels, apiKeys }) => {
  const [formData, setFormData] = useState<PromptV>(prompt);
  const [variables, setVariables] = useState<Record<string, string>>({});
  const [aiResponse, setAiResponse] = useState(prompt.savedResponse || '');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedTarget, setCopiedTarget] = useState<'system' | 'user' | null>(null);
  
  const [isTestPanelVisible, setIsTestPanelVisible] = useLocalStorage('is-test-panel-visible', true);
  const [testPanelWidth, setTestPanelWidth] = useLocalStorage<number>('test-panel-width', 600);
  const [isResizingTestPanel, setIsResizingTestPanel] = useState(false);
  
  const [selectedTestModel, setSelectedTestModel] = useState<string>('');
  
  useEffect(() => {
    setFormData(prompt);
    setAiResponse(prompt.savedResponse || '');
    setIsLoading(false);

    // Pre-select model if it was saved with a response
    if (prompt.savedTestModelId && availableModels.some(m => m.id === prompt.savedTestModelId)) {
        setSelectedTestModel(prompt.savedTestModelId);
    } else if (availableModels.length > 0) {
        // Fallback to the first available model
        setSelectedTestModel(availableModels[0].id);
    } else {
        setSelectedTestModel('');
    }
    
    // Pre-populate variables if they were saved with a response
    const currentPromptVariables = [...new Set(
        [...(prompt.systemPrompt.match(/{{\s*(\w+)\s*}}/g) || []), ...(prompt.userPrompt.match(/{{\s*(\w+)\s*}}/g) || [])]
        .map(v => v.replace(/{{\s*|\s*}}/g, ''))
    )];
    
    const initialVars: Record<string, string> = {};
    currentPromptVariables.forEach(v => {
        initialVars[v] = prompt.savedTestVariables?.[v] || '';
    });
    setVariables(initialVars);

  }, [prompt, availableModels]);

  const promptVariables = useMemo(() => {
    const systemMatches = formData.systemPrompt.match(/{{\s*(\w+)\s*}}/g) || [];
    const userMatches = formData.userPrompt.match(/{{\s*(\w+)\s*}}/g) || [];
    const allMatches = [...systemMatches, ...userMatches];
    return [...new Set(allMatches.map(v => v.replace(/{{\s*|\s*}}/g, '')))];
  }, [formData.systemPrompt, formData.userPrompt]);

  useEffect(() => {
    setVariables(vars => {
      const newVars: Record<string, string> = {};
      promptVariables.forEach(v => {
        newVars[v] = vars[v] || '';
      });
      return newVars;
    });
  }, [promptVariables]);

  const handleTestPanelResizeMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizingTestPanel(true);
  }, []);

  const handleTestPanelResizeMouseUp = useCallback(() => {
    setIsResizingTestPanel(false);
  }, []);

  const handleTestPanelResizeMouseMove = useCallback((e: MouseEvent) => {
    const newWidth = window.innerWidth - e.clientX;
    const minWidth = 400;
    const maxWidth = window.innerWidth * 0.75; 
    if (newWidth >= minWidth && newWidth <= maxWidth) {
        setTestPanelWidth(newWidth);
    }
  }, [setTestPanelWidth]);

  useEffect(() => {
    if (!isResizingTestPanel) return;
    
    window.addEventListener('mousemove', handleTestPanelResizeMouseMove);
    window.addEventListener('mouseup', handleTestPanelResizeMouseUp);

    return () => {
        window.removeEventListener('mousemove', handleTestPanelResizeMouseMove);
        window.removeEventListener('mouseup', handleTestPanelResizeMouseUp);
    };
  }, [isResizingTestPanel, handleTestPanelResizeMouseMove, handleTestPanelResizeMouseUp]);


  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value, updatedAt: new Date().toISOString() }));
  };
  
  const handleTagsChange = (newTags: string[]) => {
    setFormData(prev => ({ ...prev, tags: newTags, updatedAt: new Date().toISOString() }));
  };

  const handleVariableChange = (name: string, value: string) => {
    setVariables(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = () => {
    onSave(formData);
  };

  const handleNewVersion = () => {
    onNewVersion(prompt.id);
  };
  
  const handleFork = () => {
    onFork(prompt.id);
  }

  const handleDelete = () => {
    if (window.confirm(`Are you sure you want to delete "${prompt.title}"?`)) {
      onDelete(prompt.id);
    }
  };

  const handleSaveResponse = () => {
    const updatedPrompt = {
        ...formData,
        savedResponse: aiResponse,
        savedTestModelId: selectedTestModel,
        savedTestVariables: variables,
        updatedAt: new Date().toISOString()
    };
    onSave(updatedPrompt);
  };

  const canSaveResponse = !isLoading && aiResponse && aiResponse !== formData.savedResponse;
  
  const handleRunPrompt = useCallback(async () => {
    const model = availableModels.find(m => m.id === selectedTestModel);
    if (!model) {
        setAiResponse("Error: No valid model selected. Please configure API keys in Settings.");
        return;
    }
    const apiKey = apiKeys[model.provider].key;
    if (!apiKey) {
        setAiResponse(`Error: API Key for ${model.provider} is not configured.`);
        return;
    }

    setIsLoading(true);
    setAiResponse('');
    let processedSystemPrompt = formData.systemPrompt;
    let processedUserPrompt = formData.userPrompt;
    Object.entries(variables).forEach(([key, value]) => {
      const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
      processedSystemPrompt = processedSystemPrompt.replace(regex, value);
      processedUserPrompt = processedUserPrompt.replace(regex, value);
    });

    const response = await runPrompt(model.id, apiKey, processedUserPrompt, processedSystemPrompt);
    setAiResponse(response);
    setIsLoading(false);
  }, [formData.systemPrompt, formData.userPrompt, variables, selectedTestModel, availableModels, apiKeys]);
  
  const copyPromptToClipboard = (type: 'system' | 'user') => {
    const textToCopy = type === 'system' ? formData.systemPrompt : formData.userPrompt;
    navigator.clipboard.writeText(textToCopy);
    setCopiedTarget(type);
    setTimeout(() => setCopiedTarget(null), 2000);
  };

  const groupedModels = useMemo(() => {
    return availableModels.reduce((acc, model) => {
        (acc[model.provider] = acc[model.provider] || []).push(model);
        return acc;
    }, {} as Record<Provider, ModelDefinition[]>);
  }, [availableModels]);

  return (
    <div className="flex h-full overflow-hidden">
      {/* Editor Panel */}
      <div className="flex-1 min-w-0 flex flex-col p-6 overflow-y-auto bg-slate-800/50">
        <div className="flex justify-between items-start mb-6">
          <div>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleInputChange}
              className="bg-transparent text-3xl font-bold text-white w-full border-none focus:ring-0 p-0 m-0"
              placeholder="Prompt Title"
            />
             <div className="flex items-center text-sm text-slate-400 mt-1">
                <label htmlFor="version-select" className="mr-2">Version:</label>
                <select 
                    id="version-select"
                    value={prompt.id} 
                    onChange={(e) => onSelectVersion(e.target.value)}
                    className="bg-slate-700 rounded px-2 py-1 text-xs text-slate-200 focus:ring-1 focus:ring-indigo-500 border-slate-600"
                >
                    {promptVersions.map(p => (
                        <option key={p.id} value={p.id}>
                            v{p.version} - {new Date(p.updatedAt).toLocaleDateString()}
                        </option>
                    ))}
                </select>
            </div>
          </div>
          <div className="flex space-x-2 flex-shrink-0">
             <button 
              onClick={() => setIsTestPanelVisible(prev => !prev)} 
              className={`p-2 rounded-md hover:bg-slate-700 transition-colors ${isTestPanelVisible ? 'text-indigo-400 bg-slate-700' : 'text-slate-400'}`} 
              title={isTestPanelVisible ? "Hide Test Panel" : "Show Test Panel"}
            >
              <TestTubeIcon />
            </button>
            <button onClick={handleFork} className="p-2 rounded-md hover:bg-slate-700 text-slate-400 hover:text-white transition-colors" title="Fork Prompt">
              <ForkIcon />
            </button>
            <button onClick={handleDelete} className="p-2 rounded-md hover:bg-slate-700 text-red-500 hover:text-red-400 transition-colors" title="Delete Prompt">
              <TrashIcon />
            </button>
          </div>
        </div>
        
        <div className="space-y-6 flex-grow">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Folder</label>
            <select name="folderId" value={formData.folderId || ''} onChange={handleInputChange} className="block w-full bg-slate-700 border-slate-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm">
                <option value="">Uncategorized</option>
                {folders.map(folder => <option key={folder.id} value={folder.id}>{folder.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Description</label>
            <textarea
              name="description"
              rows={2}
              value={formData.description}
              onChange={handleInputChange}
              className="block w-full bg-slate-700 border-slate-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              placeholder="A brief description of what this prompt does."
            />
          </div>
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="block text-sm font-medium text-slate-300">System Prompt <span className="text-slate-400">(Optional)</span></label>
              <button onClick={() => copyPromptToClipboard('system')} className="text-slate-400 hover:text-white text-sm flex items-center transition-colors">
                {copiedTarget === 'system' ? <CheckIcon className="w-4 h-4 mr-1 text-green-400" /> : <CopyIcon className="w-4 h-4 mr-1" />}
                {copiedTarget === 'system' ? 'Copied!' : 'Copy'}
              </button>
            </div>
            <textarea
              name="systemPrompt"
              rows={5}
              value={formData.systemPrompt}
              onChange={handleInputChange}
              className="block w-full bg-slate-900 border-slate-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm font-mono"
              placeholder="e.g., You are a helpful assistant that translates English to French."
            />
          </div>
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="block text-sm font-medium text-slate-300">User Prompt</label>
               <button onClick={() => copyPromptToClipboard('user')} className="text-slate-400 hover:text-white text-sm flex items-center transition-colors">
                {copiedTarget === 'user' ? <CheckIcon className="w-4 h-4 mr-1 text-green-400" /> : <CopyIcon className="w-4 h-4 mr-1" />}
                {copiedTarget === 'user' ? 'Copied!' : 'Copy'}
              </button>
            </div>
            <textarea
              name="userPrompt"
              rows={10}
              value={formData.userPrompt}
              onChange={handleInputChange}
              className="block w-full bg-slate-900 border-slate-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm font-mono"
              placeholder="Enter your AI prompt here. Use {{variable}} for placeholders."
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Tags</label>
            <TagInput tags={formData.tags} setTags={handleTagsChange} />
          </div>
        </div>

        <div className="mt-6 flex-shrink-0 flex items-center space-x-3">
          <button onClick={handleSave} className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-md transition-colors">
            Save Current Version
          </button>
           <button onClick={handleNewVersion} className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-md transition-colors">
            Create New Version
          </button>
        </div>
      </div>

      {/* Test Panel */}
      {isTestPanelVisible && (
        <>
          <Resizer onMouseDown={handleTestPanelResizeMouseDown} />
          <div style={{ width: `${testPanelWidth}px` }} className="flex-shrink-0 flex flex-col p-6 overflow-y-auto">
            <h3 className="text-2xl font-bold text-white mb-4">Test Prompt</h3>
            
             <div className="mb-4">
                <label htmlFor="model-select" className="block text-sm font-medium text-slate-300 mb-1">Model</label>
                <select 
                    id="model-select"
                    value={selectedTestModel} 
                    onChange={(e) => setSelectedTestModel(e.target.value)}
                    disabled={availableModels.length === 0}
                    className="block w-full bg-slate-700 border-slate-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm disabled:opacity-50"
                >
                    {availableModels.length === 0 ? (
                        <option>No models configured</option>
                    ) : (
                       Object.entries(groupedModels).map(([provider, models]) => (
                           <optgroup key={provider} label={provider.charAt(0).toUpperCase() + provider.slice(1)}>
                               {/* FIX: Add type assertion to fix 'map' does not exist on type 'unknown' error */}
                               {(models as ModelDefinition[]).map(model => (
                                   <option key={model.id} value={model.id}>{model.name}</option>
                               ))}
                           </optgroup>
                       ))
                    )}
                </select>
            </div>

            {promptVariables.length > 0 && (
              <div className="mb-4 bg-slate-800 p-4 rounded-lg">
                <h4 className="text-lg font-semibold text-slate-200 mb-3">Variables</h4>
                <div className="space-y-3">
                  {promptVariables.map(variable => (
                    <div key={variable}>
                      <label className="block text-sm font-medium text-slate-300 mb-1">{variable}</label>
                      <input
                        type="text"
                        value={variables[variable] || ''}
                        onChange={(e) => handleVariableChange(variable, e.target.value)}
                        className="block w-full bg-slate-700 border-slate-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
            <button onClick={handleRunPrompt} disabled={isLoading || availableModels.length === 0} className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-md transition-colors disabled:bg-slate-600 disabled:cursor-not-allowed">
              {isLoading ? 'Running...' : 'Run Prompt'}
            </button>

            <div className="mt-6 flex-grow flex flex-col">
                <div className="flex justify-between items-center mb-2">
                    <label className="block text-sm font-medium text-slate-300">AI Response</label>
                    {aiResponse && (
                        <button 
                            onClick={handleSaveResponse}
                            disabled={!canSaveResponse}
                            title={canSaveResponse ? "Save this response as an example for this version" : "Response is already saved or not available"}
                            className="text-sm font-semibold text-indigo-400 hover:text-indigo-300 disabled:text-slate-500 disabled:cursor-not-allowed transition-colors"
                        >
                            Save Response
                        </button>
                    )}
                </div>
                <div className="relative flex-grow">
                    <div className="absolute inset-0 bg-slate-800 border border-slate-700 rounded-lg p-4 overflow-y-auto whitespace-pre-wrap font-mono text-sm">
                        {isLoading && <div className="text-slate-400">Waiting for response...</div>}
                        {!isLoading && !aiResponse && <div className="text-slate-500">The AI's response will appear here.</div>}
                        {aiResponse}
                    </div>
                </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default PromptView;