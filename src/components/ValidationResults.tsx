import React, { useState, useCallback } from "react";
import {
  CheckCircle,
  AlertCircle,
  Code2,
  Loader2,
  ChevronDown,
  ChevronRight,
  Download,
  Copy,
} from "lucide-react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";
import { ValidationResult } from "../types";

interface ValidationResultsProps {
  results: ValidationResult[];
  onSaveCorrection: (result: ValidationResult) => void;
}

export function ValidationResults({ results, onSaveCorrection }: ValidationResultsProps) {
  const [expandedFiles, setExpandedFiles] = useState<Record<string, boolean>>({});
  const [copiedFile, setCopiedFile] = useState<string | null>(null);

  // Function to determine score styling
  const getStyles = useCallback((score: number) => {
    if (score >= 90) return { text: "text-emerald-400", bg: "bg-emerald-400/10", border: "border-emerald-400/20" };
    if (score >= 70) return { text: "text-amber-400", bg: "bg-amber-400/10", border: "border-amber-400/20" };
    return { text: "text-red-400", bg: "bg-red-400/10", border: "border-red-400/20" };
  }, []);

  // Toggle file expansion
  const toggleExpand = useCallback((fileName: string) => {
    setExpandedFiles((prev) => ({ ...prev, [fileName]: !prev[fileName] }));
  }, []);

  // Copy code to clipboard
  const handleCopyCode = useCallback(async (code: string, fileName: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedFile(fileName);
      setTimeout(() => setCopiedFile(null), 2000);
    } catch {
      setCopiedFile(null);
    }
  }, []);

  // Function to clean and structure analysis results
  const processAnalysisResult = (result: string) => {
    // Remove score and think tags
    const cleanedResult = result
      .replace(/<SCORE:\d+>/g, "")
      .replace(/<think>[\s\S]*?<\/think>/g, "")
      .trim();

    // Split into sections
    const sections = {
      analysis: [],
      suggestions: [],
      security: [],
      performance: []
    };

    const lines = cleanedResult.split('\n');
    let currentSection = 'analysis';

    lines.forEach(line => {
      const lowerLine = line.toLowerCase();
      if (lowerLine.includes('security') || lowerLine.includes('vulnerability')) {
        currentSection = 'security';
      } else if (lowerLine.includes('performance') || lowerLine.includes('optimization')) {
        currentSection = 'performance';
      } else if (lowerLine.includes('suggestion') || lowerLine.includes('recommendation')) {
        currentSection = 'suggestions';
      }
      
      if (line.trim()) {
        sections[currentSection].push(line.trim());
      }
    });

    return sections;
  };

  return (
    <div className="space-y-4">
      {results.length === 0 ? (
        <div className="text-center text-gray-400 py-8 bg-[#121212] dark:bg-[#121212] light:bg-white rounded-xl p-6 border border-gray-800 dark:border-gray-800 light:border-gray-200">
          <Code2 className="w-12 h-12 mx-auto mb-4 text-gray-500" />
          <p className="text-lg">No validation results available.</p>
          <p className="text-sm text-gray-500">Upload and validate your code to see the analysis.</p>
        </div>
      ) : (
        results.map((result) => {
          const score = result.score ?? 0;
          const { text, bg, border } = getStyles(score);
          const isExpanded = expandedFiles[result.fileName];

          return (
            <div key={result.fileName} className="bg-[#121212] dark:bg-[#121212] light:bg-white rounded-lg border border-gray-800 dark:border-gray-800 light:border-gray-200 hover:border-gray-700 dark:hover:border-gray-700 light:hover:border-gray-300 transition-all duration-300 overflow-hidden shadow-lg">
              {/* File Header */}
              <div
                className={`flex items-center justify-between p-4 cursor-pointer hover:bg-[#1a1a1a] dark:hover:bg-[#1a1a1a] light:hover:bg-gray-50 transition-all duration-300 ${isExpanded ? 'border-b border-gray-800 dark:border-gray-800 light:border-gray-200' : ''}`}
                onClick={() => toggleExpand(result.fileName)}
              >
                <div className="flex items-center gap-3">
                  {isExpanded ? <ChevronDown className="w-5 h-5 text-gray-400" /> : <ChevronRight className="w-5 h-5 text-gray-400" />}
                  <Code2 className="w-6 h-6 text-gray-300" />
                  <h3 className="text-lg font-semibold text-gray-200 dark:text-gray-200 light:text-gray-800">{result.fileName}</h3>
                </div>
                <div className={`flex items-center gap-2 px-4 py-2 rounded-lg ${bg} ${border}`}>
                  {score >= 90 ? <CheckCircle className={`w-5 h-5 ${text}`} /> : <AlertCircle className={`w-5 h-5 ${text}`} />}
                  <span className={`text-lg font-bold ${text}`}>{score}%</span>
                </div>
              </div>

              {/* Expandable Content */}
              {isExpanded && (
                <div className="p-4 space-y-4">
                  {/* Analysis Sections */}
                  {Object.entries(processAnalysisResult(result.result)).map(([section, items]) => {
                    if (items.length === 0) return null;
                    
                    const icons = {
                      analysis: <AlertCircle className="w-5 h-5 text-blue-400" />,
                      suggestions: <Code2 className="w-5 h-5 text-green-400" />,
                      security: <AlertCircle className="w-5 h-5 text-red-400" />,
                      performance: <AlertCircle className="w-5 h-5 text-amber-400" />
                    };

                    return (
                      <div key={section} className="bg-[#1a1a1a] dark:bg-[#1a1a1a] light:bg-gray-50 p-4 rounded-lg border border-gray-800 dark:border-gray-800 light:border-gray-200 hover:border-gray-700 dark:hover:border-gray-700 light:hover:border-gray-300 transition-all duration-300">
                        <h5 className="text-base font-medium text-gray-200 dark:text-gray-200 light:text-gray-800 flex items-center gap-2 mb-3">
                          {icons[section]}
                          {section.charAt(0).toUpperCase() + section.slice(1)}
                        </h5>
                        <div className="space-y-2 text-gray-300 text-sm">
                          {items.map((item, index) => (
                            <div key={index} className="flex items-start gap-2 hover:bg-[#242424] dark:hover:bg-[#242424] light:hover:bg-gray-100 p-2 rounded-md transition-colors duration-200">
                              <span className="text-gray-500 mt-1">•</span>
                              <span className="flex-1">{item}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}

                  {/* Corrected Code Section */}
                  {result.correctedCode && (
                    <div className="bg-[#1a1a1a] dark:bg-[#1a1a1a] light:bg-gray-50 p-4 rounded-lg border border-gray-800 dark:border-gray-800 light:border-gray-200 hover:border-gray-700 dark:hover:border-gray-700 light:hover:border-gray-300 transition-all duration-300">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-base font-medium text-gray-200 dark:text-gray-200 light:text-gray-800 flex items-center gap-2">
                          <Code2 className="w-5 h-5 text-green-400" /> Corrected Code
                        </h4>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleCopyCode(result.correctedCode!, result.fileName)}
                            className="flex items-center gap-1 px-2 py-1 text-xs bg-[#242424] dark:bg-[#242424] light:bg-gray-100 text-gray-300 dark:text-gray-300 light:text-gray-600 rounded-md hover:bg-[#2a2a2a] dark:hover:bg-[#2a2a2a] light:hover:bg-gray-200 transition-colors duration-200"
                          >
                            <Copy className="w-3 h-3" />
                            {copiedFile === result.fileName ? "Copied!" : "Copy"}
                          </button>
                          <button
                            onClick={() => onSaveCorrection(result)}
                            className="flex items-center gap-1 px-2 py-1 text-xs bg-[#242424] dark:bg-[#242424] light:bg-gray-100 text-gray-300 dark:text-gray-300 light:text-gray-600 rounded-md hover:bg-[#2a2a2a] dark:hover:bg-[#2a2a2a] light:hover:bg-gray-200 transition-colors duration-200"
                          >
                            <Download className="w-3 h-3" />
                            Save
                          </button>
                        </div>
                      </div>

                      <div className="rounded-lg overflow-hidden border border-gray-800">
                        <SyntaxHighlighter
                          language={result.fileName.split(".").pop() || "text"}
                          style={vscDarkPlus}
                          showLineNumbers
                          customStyle={{
                            margin: 0,
                            padding: "1rem",
                            backgroundColor: "#242424",
                            fontSize: "0.85rem",
                            lineHeight: "1.5",
                          }}
                        >
                          {result.correctedCode}
                        </SyntaxHighlighter>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}

// Additional Execution Result Component
const ExecutionResult: React.FC<{ output: string }> = ({ output }) => {
  return (
    <div className="p-4 border mt-4 bg-[#1a1a1a] border-gray-700 rounded-lg">
      <h2 className="text-lg font-bold text-gray-200">Execution Result:</h2>
      <pre className="bg-gray-100 text-black p-3 rounded">{output}</pre>
    </div>
  );
};

export default ExecutionResult;