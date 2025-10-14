
import React, { useState } from 'react';
import type { TestResult, ModelDefinition } from '../types';
import { ClockIcon, ChipIcon, ChevronRightIcon, CopyIcon, CheckIcon } from './Icons';

interface TestResultViewProps {
  result: TestResult;
  isSaved: boolean;
  availableModels: ModelDefinition[];
}

const MetadataBadge: React.FC<{ icon: React.ReactNode; label: string; value: string | number; title?: string }> = ({ icon, label, value, title }) => (
  <div title={title} className="flex items-center space-x-2 bg-slate-700/50 px-3 py-1.5 rounded-md text-sm">
    <div className="text-slate-400">{icon}</div>
    <span className="text-slate-300 font-medium">{label}:</span>
    <span className="text-white font-mono">{value}</span>
  </div>
);

const TestResultView: React.FC<TestResultViewProps> = ({ result, isSaved, availableModels }) => {
  const modelName = availableModels.find(m => m.id === result.modelId)?.name || result.modelId;
  const [copied, setCopied] = useState(false);
  const [isVariablesExpanded, setIsVariablesExpanded] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(result.response);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex-shrink-0 p-4 border-b border-slate-700 bg-slate-800/50">
        <div className="flex justify-between items-center mb-3">
          <h4 className="font-semibold text-white">
            {isSaved ? 'Saved Test Result' : 'Live Test Result'}
          </h4>
          <div className="flex items-center space-x-4">
             <button onClick={handleCopy} className="flex items-center text-sm text-slate-400 hover:text-white transition-colors">
              {copied ? (
                <>
                  <CheckIcon className="w-4 h-4 mr-1 text-green-400" />
                  <span>Copied!</span>
                </>
              ) : (
                <>
                  <CopyIcon className="w-4 h-4 mr-1" />
                  <span>Copy</span>
                </>
              )}
            </button>
            <span className="text-xs text-slate-400" title={new Date(result.timestamp).toLocaleString()}>
              {new Date(result.timestamp).toLocaleDateString()}
            </span>
          </div>
        </div>
        
        {Object.keys(result.variables).length > 0 && (
          <div className="mb-3">
              <button
                onClick={() => setIsVariablesExpanded(prev => !prev)}
                className="flex items-center w-full text-left text-xs font-semibold text-slate-400 uppercase"
                aria-expanded={isVariablesExpanded}
              >
                  <ChevronRightIcon className={`w-4 h-4 mr-1 transition-transform ${isVariablesExpanded ? 'rotate-90' : ''}`} />
                  Variables Used
              </button>
              {isVariablesExpanded && (
                <div className="flex flex-wrap gap-2 mt-2 pl-5">
                    {Object.entries(result.variables).map(([key, value]) => (
                        <div key={key} className="text-xs bg-slate-700 px-2 py-1 rounded-md">
                            <span className="font-semibold text-slate-300">{key}:</span> <span className="text-white">{value}</span>
                        </div>
                    ))}
                </div>
              )}
          </div>
        )}

        <div className="flex flex-wrap gap-2 items-center">
            <div className="text-sm font-semibold bg-indigo-600/30 text-indigo-300 px-3 py-1.5 rounded-md">{modelName}</div>
            <MetadataBadge icon={<ChipIcon className="w-4 h-4" />} label="Tokens" value={result.metrics.totalTokens} title={`Prompt: ${result.metrics.promptTokens}, Completion: ${result.metrics.completionTokens}`} />
            <MetadataBadge icon={<ClockIcon className="w-4 h-4" />} label="Time" value={`${(result.metrics.responseTime / 1000).toFixed(2)}s`} />
        </div>
      </div>

      {/* Body */}
      <div className="flex-grow p-4 overflow-y-auto whitespace-pre-wrap font-mono text-sm text-slate-200">
        {result.response}
      </div>
    </div>
  );
};

export default TestResultView;
