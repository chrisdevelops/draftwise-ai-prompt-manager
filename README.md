Draftwise is a professional AI Prompt Management application built with **React** and **TypeScript**. We use **Tailwind CSS** for styling, and all user data (prompts, folders, API keys) is persisted in the browser's **localStorage**.

Here’s a breakdown of the project structure and the role of each file:

---

## Onboarding Guide: Draftwise Project Breakdown
### 1. The Entry Point & Core Application Shell

These files are responsible for getting the application started and mounted in the browser.

- index.html: This is the main HTML file. It's very simple. The key thing to notice here is the `<script type="importmap">`. We use this to manage our external dependencies like react and @google/genai directly from a CDN, which simplifies our build process. The main application logic is loaded from index.tsx.
    
- index.tsx: This is the React entry point. It finds the root div in index.html and renders our main <App /> component into it. You'll rarely need to touch this file.
    
- metadata.json: Standard configuration for the development environment. It defines the application's name and description.

### 2. Main Application Logic & State Management
This is where the "brain" of the application lives. Understanding these files is key to understanding how the app works.

- App.tsx: **This is the most important file in the project.** It's the root component and acts as the central hub for state and logic.
    
    - **State Management:** It uses our custom useLocalStorage hook to manage all top-level application state: prompts, folders, apiKeys, settings, etc. This is the single source of truth for all user data.
        
    - **Business Logic:** It contains all the core handler functions for creating, reading, updating, and deleting (CRUD) prompts and folders (handleNewPrompt, handleSavePrompt, handleDeletePrompt, etc.).
        
    - **View Orchestration:** It controls which main view is visible (editor or settings) and passes all the necessary data and handler functions down as props to the child components (Sidebar, PromptView, SettingsView).
        
- hooks/useLocalStorage.ts: This is a crucial utility. It's a custom React hook that abstracts the logic for reading from and writing to the browser's localStorage. It makes persisting state between sessions trivial and works just like useState.

### 3. Data Structures

- types.ts: As a TypeScript project, this file is fundamental. It defines the "shape" of all our core data structures. You'll find the interfaces for PromptV (a specific version of a prompt), Folder, TestResult, ApiKeyConfig, and more. If you're ever unsure what data a component expects, this is the first place you should look.

### 4. Components (components/)

This directory contains all of our reusable UI components.

#### **Main Layout & Views:**

- Sidebar.tsx: The collapsible navigation panel on the left. It's responsible for displaying the folder structure, the list of prompts, and search functionality. It receives the list of prompts and folders from App.tsx and uses callbacks (e.g., onSelectPrompt) to inform the parent when the user interacts with it.
    
- PromptView.tsx: The central panel where users spend most of their time. This is a complex component responsible for:
    
    - Displaying and editing the details of the currently selected prompt (title, description, system/user prompt content).
        
    - Managing prompt versioning (creating new versions, switching between them).
        
    - The entire **"Test Prompt"** side panel, including managing test variables, selecting a model, running the test, and displaying the result.
        
- SettingsView.tsx: The settings page. It's responsible for managing API keys for different LLM providers, handling data import/export, and managing user preferences like the "auto-save" feature.

#### **Feature-Specific Components:**

- ComparisonView.tsx: This is the full-screen modal for the side-by-side model comparison feature. It manages its own state for which models are selected and the results of the comparison test runs.
    
- TestResultView.tsx: A dedicated component for displaying the results of a test run. It renders the AI response and the metadata "cards" (tokens used, response time, etc.). It's used by both PromptView (for single tests) and ComparisonView (for multiple results).
    
- ConfirmationDialog.tsx: A reusable modal for confirming destructive actions, like deleting prompts. It's designed to be flexible and is used to handle the more complex "delete version vs. delete all" logic.

#### **UI Primitives:**

- Resizer.tsx: The small draggable bar that allows the user to resize the sidebar and test panels.
    
- Icons.tsx: A simple component library for all the SVG icons used throughout the application. This keeps the other component files cleaner and makes it easy to manage our icon set.

### 5. External Service Integrations

- services/llmService.ts: This file is the bridge between our app and the outside world of AI models. It contains all the logic for:
    
    - **Validating API keys** for Gemini, OpenAI, and Anthropic.
        
    - **Fetching the list of available models** from the OpenAI API.
        
    - The core runPrompt function, which takes a prompt and model details, formats the request correctly for the specific provider (Gemini, OpenAI, or Anthropic), sends it, and then parses the response into a standardized LlmResponse object.
        
    - It also includes a token estimation function for models (like Gemini) that don't return token usage in their API response.
        
- services/geminiService.ts: This file is currently empty. It's likely a leftover from an earlier refactor. All Gemini-related logic has been consolidated into llmService.ts, so this file can probably be removed.

## Getting Started: Your First Steps

1. **Start with App.tsx and types.ts:** Read through these two files first. They will give you the best understanding of the application's overall structure, state, and data flow.
    
2. **Explore PromptView.tsx:** This is the most feature-rich component. Understanding how it manages its local state and interacts with the props passed down from App.tsx is key.
    
3. **Trace a Test Run:** Follow the logic from clicking the "Run Prompt" button in PromptView.tsx to the handleRunPrompt function, which calls runPrompt in llmService.ts, and see how the result flows back to be displayed in TestResultView.tsx.

That's the grand tour! It's a well-structured application, and I'm confident you'll be able to get up to speed quickly. Don't hesitate to ask if you have any questions. Welcome aboard