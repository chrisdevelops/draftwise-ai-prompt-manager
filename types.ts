
export interface PromptV {
  id: string;
  baseId: string;
  folderId: string | null;
  title: string;
  description: string;
  systemPrompt: string;
  userPrompt: string;
  tags: string[];
  version: number;
  createdAt: string;
  updatedAt: string;
  forkedFrom?: string;
  savedTestResult?: TestResult;
}

export interface Folder {
  id: string;
  name: string;
  createdAt: string;
}

export type Provider = 'gemini' | 'openai' | 'anthropic';

export const PROVIDERS: { id: Provider; name: string }[] = [
    { id: 'gemini', name: 'Google Gemini' },
    { id: 'openai', name: 'OpenAI' },
    { id: 'anthropic', name: 'Anthropic' },
];

export interface ApiKeyConfig {
  key: string;
  status: 'untested' | 'valid' | 'invalid' | 'testing';
}

export interface ModelDefinition {
  id: string;
  name: string;
  provider: Provider;
}

export interface TestResultMetrics {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  responseTime: number; // in milliseconds
}

export interface TestResult {
  id: string; // unique ID for the test run
  response: string;
  modelId: string;
  variables: Record<string, string>;
  metrics: TestResultMetrics;
  timestamp: string; // ISO string
}

export interface Settings {
  autoSaveTestResult: boolean;
}
