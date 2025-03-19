import React, { useState, useCallback } from "react";
import { FileUploader } from "./components/FileUploader";
import { ValidationResults } from "./components/ValidationResults";
import { CodePreview } from "./components/CodePreview";
import { Code2, Loader2, Wand2, Play, Terminal, Sun, Moon } from "lucide-react";
import axios from "axios";
import type { FileWithContent, ValidationResult, StreamingState } from "./types";
import { ThemeProvider, useTheme } from "./contexts/ThemeContext";

const API_URL = "http://localhost:1234/v1/chat/completions";
const MODEL = "deepseek-coder-7b-instruct";
const JUDGE0_API_URL = "https://judge0-ce.p.rapidapi.com/submissions";
const JUDGE0_HEADERS = {
  "x-rapidapi-host": "judge0-ce.p.rapidapi.com",
  "x-rapidapi-key": "f93374fe4fmsh608d5d902c40414p1d8441jsn39d1a5ee6e8e",
  "Content-Type": "application/json",
};

function AppContent() {
  const { theme, toggleTheme } = useTheme();
  const [files, setFiles] = useState<FileWithContent[]>([]);
  const [validationResults, setValidationResults] = useState<ValidationResult[]>([]);
  const [streamingState, setStreamingState] = useState<StreamingState>({
    isAnalyzing: false,
    currentFile: "",
    currentStep: "",
  });

  const [isCodeEditorOpen, setIsCodeEditorOpen] = useState(false);
  const [codeToRun, setCodeToRun] = useState("");
  const [executionOutput, setExecutionOutput] = useState("");

  // Handle file selection
  const handleFilesSelected = useCallback(async (selectedFiles: File[]) => {
    const fileContents = await Promise.all(
      selectedFiles.map(async (file) => ({
        name: file.name,
        path: (file as any).path || file.webkitRelativePath || file.name,
        content: await file.text(),
        extension: file.name.split(".").pop() || "",
      }))
    );

    setFiles(fileContents);
    setValidationResults([]);
  }, []);

  // Validate code using AI model
  const validateCode = useCallback(async () => {
    if (files.length === 0) return;

    setStreamingState({ isAnalyzing: true, currentFile: "", currentStep: "Initializing..." });
    setValidationResults([]);

    const processFile = async (file: FileWithContent) => {
      setStreamingState((prev) => ({ ...prev, currentFile: file.path, currentStep: "Analyzing code..." }));

      try {
        const response = await fetch(API_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer not-needed",
          },
          body: JSON.stringify({
            model: MODEL,
            messages: [
              {
                role: "system",
                content:
                  "You are a code review assistant. Analyze the code for errors, improvements, and security vulnerabilities. Provide a score (0-100) in <SCORE:XX> format and suggest corrections in a code block.",
              },
              { role: "user", content: `Analyze this ${file.extension} file:\n${file.content}` },
            ],
            temperature: 0.7,
            max_tokens: 2048,
          }),
        });

        if (!response.ok) throw new Error(`Server error: ${response.status}`);

        const data = await response.json();
        const aiResponse = data?.choices?.[0]?.message?.content || "No response received.";

        const scoreMatch = aiResponse.match(/<SCORE:(\d+)>/);
        const score = Math.min(Math.max(parseInt(scoreMatch?.[1] || "0"), 0), 100);

        const correctedCodeMatch = aiResponse.match(/```(?:\w+\n)?([\s\S]*?)```/);
        const correctedCode = correctedCodeMatch ? correctedCodeMatch[1].trim() : undefined;

        const result: ValidationResult = {
          fileName: file.name,
          path: file.path,
          code: file.content,
          result: aiResponse.replace(/```[\s\S]*?```/, "").trim(),
          score,
          correctedCode,
          hasCorrections: !!correctedCode,
        };

        setValidationResults((prev) => [...prev, result]);
      } catch (error) {
        console.error(`Error validating ${file.path}:`, error);
        setValidationResults((prev) => [
          ...prev,
          {
            fileName: file.name,
            path: file.path,
            code: file.content,
            result: `Error: ${error instanceof Error ? error.message : "Failed to analyze code"}`,
            score: 0,
            hasCorrections: false,
          },
        ]);
      }
    };

    await Promise.all(files.map(processFile));
    setStreamingState({ isAnalyzing: false, currentFile: "", currentStep: "" });
  }, [files]);

  // Run code using Judge0
  const runCode = async () => {
    setExecutionOutput("Running...");

    try {
      const response = await axios.post(
        JUDGE0_API_URL,
        { source_code: codeToRun, language_id: 71, stdin: "" }, // Example: Python 3
        { headers: JUDGE0_HEADERS }
      );

      const token = response.data.token;

      const checkResult = async () => {
        const resultResponse = await axios.get(`${JUDGE0_API_URL}/${token}`, { headers: JUDGE0_HEADERS });

        if (resultResponse.data.status.id <= 2) {
          setTimeout(checkResult, 1000);
        } else {
          setExecutionOutput(resultResponse.data.stdout || "Error: " + resultResponse.data.stderr);
        }
      };

      setTimeout(checkResult, 1000);
    } catch (error) {
      console.error("Error running code:", error);
      setExecutionOutput("Execution failed.");
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] light:bg-gray-50 flex flex-col">
      {/* Header Section */}
      <header className="bg-[#121212] light:bg-white border-b border-gray-800 light:border-gray-200 sticky top-0 z-50 shadow-lg">
        <div className="max-w-[1920px] mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 px-5 py-3 bg-[#1a1a1a] light:bg-gray-100 rounded-lg border border-blue-900 light:border-blue-200 glow-border-blue">
              <Code2 className="w-8 h-8 text-blue-400" />
              <h1 className="text-3xl font-bold text-gray-200 light:text-gray-800 glow-text-blue">Code Amplifier</h1>
            </div>
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg bg-[#1a1a1a] light:bg-gray-100 border border-gray-800 light:border-gray-300 hover:border-gray-700 light:hover:border-gray-400 transition-all duration-300"
            >
              {theme === 'dark' ? (
                <Sun className="w-5 h-5 text-yellow-400" />
              ) : (
                <Moon className="w-5 h-5 text-blue-400" />
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex overflow-hidden">
        {/* Left Panel */}
        <div className="w-1/2 p-6 overflow-y-auto border-r border-gray-800 light:border-gray-200">
          <div className="space-y-6 max-w-3xl mx-auto">
            <FileUploader onFilesSelected={handleFilesSelected} selectedFiles={files.map((f) => ({ name: f.name, path: f.path }))} />

            {files.length > 0 && <CodePreview files={files} />}

            {streamingState.isAnalyzing && (
              <div className="mt-4 p-3 bg-[#1a1a1a] border border-blue-900 rounded-lg shadow-lg glow-border-blue">
                <p className="text-blue-400 font-semibold glow-text-blue">Processing: {streamingState.currentFile}</p>
                <p className="text-gray-400">{streamingState.currentStep}</p>
              </div>
            )}

            <div className="flex items-center justify-between gap-4">
              <button 
                onClick={validateCode} 
                disabled={streamingState.isAnalyzing} 
                className="flex-1 px-4 py-3 bg-blue-700 hover:bg-blue-600 rounded-lg transition-colors duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Wand2 className="w-5 h-5" />
                {streamingState.isAnalyzing ? "Analyzing..." : "Validate Code"}
              </button>

              <button 
                onClick={() => setIsCodeEditorOpen(!isCodeEditorOpen)} 
                className="flex-1 px-4 py-3 bg-green-700 hover:bg-green-600 rounded-lg transition-colors duration-200 flex items-center justify-center gap-2"
              >
                <Play className="w-5 h-5" /> Run Code
              </button>
            </div>

            {isCodeEditorOpen && (
              <div className="space-y-4 bg-[#121212] rounded-xl p-6 border border-gray-800">
                <textarea 
                  className="w-full p-4 bg-gray-900 text-white rounded-md border border-gray-700 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all duration-200" 
                  value={codeToRun} 
                  onChange={(e) => setCodeToRun(e.target.value)} 
                  placeholder="Type or paste code here..."
                  rows={8}
                />
                <button 
                  onClick={runCode} 
                  className="w-full px-4 py-3 bg-purple-700 hover:bg-purple-600 rounded-lg transition-colors duration-200 flex items-center justify-center gap-2"
                >
                  <Terminal className="w-5 h-5" /> Execute Code
                </button>
                <pre className="mt-2 bg-black text-white p-4 rounded-md max-h-[200px] overflow-y-auto">{executionOutput}</pre>
              </div>
            )}
          </div>
        </div>

        {/* Right Panel */}
        <div className="w-1/2 p-6 overflow-y-auto bg-[#0c0c0c] dark:bg-[#0c0c0c] light:bg-gray-50">
          <div className="max-w-3xl mx-auto">
            <ValidationResults results={validationResults} onSaveCorrection={(result) => console.log("Save correction:", result)} />
          </div>
        </div>
      </main>
    </div>
  );
}

function App() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
}

export default App;