
import React, { useState, useCallback } from 'react';
import type { PromptV, ModelDefinition, ApiKeyConfig, TestResult, Provider } from '../types';
import { runPrompt } from '../services/llmService';
import { XCircleIcon, SpinnerIcon } from './Icons';
import TestResultView from './TestResultView';


interface ComparisonViewProps {
  isOpen: boolean;
  onClose: () => void;
  prompt: PromptV;
  variables: Record<string, string>;
  availableModels: ModelDefinition[];
  apiKeys: Record<Provider, ApiKeyConfig>;
}

type ComparisonResult = {
    status: 'success';
    data: TestResult;
} | {
    status: 'error';
    error: Error;
} | {
    status: 'loading';
};

const ComparisonView: React.FC<ComparisonViewProps> = ({ isOpen, onClose, prompt, variables, availableModels, apiKeys }) => {
  const [selectedModels, setSelectedModels] = useState<Set<string>>(new Set());
  const [isComparing, setIsComparing] = useState(false);
  const [comparisonResults, setComparisonResults] = useState<Record<string, ComparisonResult>>({});

  const handleModelToggle = (modelId: string) => {
    setSelectedModels(prev => {
      const newSet = new Set(prev);
      if (newSet.has(modelId)) {
        newSet.delete(modelId);
      } else {
        newSet.add(modelId);
      }
      return newSet;
    });
  };
  
  const handleRunComparison = useCallback(async () => {
    setIsComparing(true);

    const initialResults: Record<string, ComparisonResult> = {};
    selectedModels.forEach(id => {
      initialResults[id] = { status: 'loading' };
    });
    setComparisonResults(initialResults);

    let processedSystemPrompt = prompt.systemPrompt;
    let processedUserPrompt = prompt.userPrompt;
    Object.entries(variables).forEach(([key, value]) => {
      const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
      processedSystemPrompt = processedSystemPrompt.replace(regex, value);
      processedUserPrompt = processedUserPrompt.replace(regex, value);
    });

    const runSingleComparison = async (modelId: string) => {
      const model = availableModels.find(m => m.id === modelId);
      if (!model) return;
      const apiKey = apiKeys[model.provider].key;

      try {
        const startTime = Date.now();
        const result = await runPrompt(modelId, apiKey, processedUserPrompt, processedSystemPrompt, availableModels);
        const endTime = Date.now();
        
        const testResult: TestResult = {
            id: `cmp-${modelId}-${Date.now()}`,
            response: result.text,
            modelId: modelId,
            variables: { ...variables },
            metrics: { ...result.usage, responseTime: endTime - startTime },
            timestamp: new Date().toISOString()
        };
        setComparisonResults(prev => ({ ...prev, [modelId]: { status: 'success', data: testResult } }));
      } catch (error) {
        setComparisonResults(prev => ({ ...prev, [modelId]: { status: 'error', error: error as Error } }));
      }
    };
    
    await Promise.all(Array.from(selectedModels).map(runSingleComparison));
    setIsComparing(false);

  }, [selectedModels, prompt, variables, availableModels, apiKeys]);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-slate-900/80 z-40 flex flex-col backdrop-blur-sm"
      aria-modal="true"
      role="dialog"
    >
        <header className="flex-shrink-0 bg-slate-800/80 p-4 flex justify-between items-center border-b border-slate-700">
            <div>
                <h2 className="text-xl font-bold text-white">Compare Model Outputs</h2>
                <p className="text-sm text-slate-400">Run the same prompt against multiple models to compare their responses.</p>
            </div>
            <button 
                onClick={onClose} 
                className="p-2 rounded-full hover:bg-slate-700 transition-colors"
                title="Close comparison view"
            >
                <XCircleIcon className="w-8 h-8 text-slate-400" />
            </button>
        </header>

        <div className="flex-grow flex min-h-0">
            <aside className="w-64 flex-shrink-0 bg-slate-800 p-4 overflow-y-auto flex flex-col">
                <h3 className="text-lg font-semibold text-white mb-3">Select Models</h3>
                <div className="flex-grow space-y-2">
                    {availableModels.map(model => (
                        <label key={model.id} className="flex items-center space-x-3 p-2 rounded-md hover:bg-slate-700 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={selectedModels.has(model.id)}
                                onChange={() => handleModelToggle(model.id)}
                                className="h-4 w-4 rounded bg-slate-600 border-slate-500 text-indigo-500 focus:ring-indigo-500"
                            />
                            <span className="text-slate-200">{model.name}</span>
                        </label>
                    ))}
                    {availableModels.length === 0 && <p className="text-sm text-slate-500">No models available. Configure API keys in Settings.</p>}
                </div>
                <button
                    onClick={handleRunComparison}
                    disabled={isComparing || selectedModels.size === 0}
                    className="w-full mt-4 bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-md transition-colors disabled:bg-slate-600 disabled:cursor-not-allowed"
                >
                    {isComparing ? 'Running...' : `Run Comparison (${selectedModels.size})`}
                </button>
            </aside>
            <main className="flex-grow p-4 overflow-x-auto">
                <div className="flex space-x-4 h-full">
                    {Object.keys(comparisonResults).length === 0 && !isComparing && (
                        <div className="w-full h-full flex items-center justify-center text-slate-500">
                            <p>Select models and click "Run Comparison" to see results here.</p>
                        </div>
                    )}
                    {/* FIX: Replaced Object.entries with Object.keys to ensure proper type inference for 'result'. */}
                    {Object.keys(comparisonResults).map((modelId) => {
                      const result = comparisonResults[modelId];
                      return (
                        <div key={modelId} className="w-96 flex-shrink-0 h-full flex flex-col">
                           <div className="flex-grow bg-slate-800 border border-slate-700 rounded-lg overflow-hidden flex flex-col">
                             {result.status === 'loading' && <div className="flex items-center justify-center h-full"><SpinnerIcon className="w-8 h-8" /></div>}
                             {result.status === 'error' && <div className="p-4 text-red-400 whitespace-pre-wrap"><strong>Error:</strong> {result.error.message}</div>}
                             {result.status === 'success' && <TestResultView result={result.data} isSaved={false} availableModels={availableModels} />}
                           </div>
                        </div>
                      );
                    })}
                </div>
            </main>
        </div>
    </div>
  );
};

export default ComparisonView;
