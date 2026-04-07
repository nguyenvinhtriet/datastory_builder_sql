"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Database, FileText, ArrowRight, Loader2, AlertCircle, Upload, Download, Copy, Check } from 'lucide-react';
import { GoogleGenAI } from '@google/genai';
import ReactMarkdown from 'react-markdown';

export default function HomePage() {
  const [sqlInput, setSqlInput] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [markdownOutput, setMarkdownOutput] = useState('');
  const [error, setError] = useState('');
  const [includeDataMapping, setIncludeDataMapping] = useState(true);
  const [isCopied, setIsCopied] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  
  // Auth states
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Check auth state on mount
  useEffect(() => {
    const auth = sessionStorage.getItem('isAuthenticated');
    if (auth === 'true') {
      setIsAuthenticated(true);
    }
    setIsCheckingAuth(false);
  }, []);

  // Simulate progress while waiting for the API
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isGenerating) {
      setProgress(0);
      interval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 95) return prev; // Hold at 95% until actually done
          return prev + Math.floor(Math.random() * 5) + 1;
        });
      }, 500);
    } else {
      setProgress(100);
    }
    return () => clearInterval(interval);
  }, [isGenerating]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setSqlInput(event.target.result as string);
      }
    };
    reader.onerror = () => {
      setError('Failed to read the file. Please try again.');
    };
    reader.readAsText(file);
    
    // Reset input so the same file can be uploaded again if needed
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDownload = () => {
    if (!markdownOutput) return;
    const blob = new Blob([markdownOutput], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'UserStory.md';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleCopy = async () => {
    if (!markdownOutput) return;
    try {
      await navigator.clipboard.writeText(markdownOutput);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  const handleGenerate = async () => {
    if (!sqlInput.trim()) {
      setError('Please paste your T-SQL stored procedure or upload a file first.');
      return;
    }

    setError('');
    setIsGenerating(true);
    setMarkdownOutput('');
    setProgress(0);

    try {
      const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
      if (!apiKey) {
        throw new Error("Gemini API key is missing. Please configure it in the AI Studio settings.");
      }

      const ai = new GoogleGenAI({ apiKey });

      // Fetch the prompt and template configurations
      const [promptRes, templateRes] = await Promise.all([
        fetch('/prompt.md'),
        fetch('/template.md')
      ]);

      if (!promptRes.ok || !templateRes.ok) {
        throw new Error("Failed to load configuration files (prompt.md or template.md).");
      }

      const promptText = await promptRes.text();
      const templateText = await templateRes.text();

      let systemInstruction = `${promptText}\n\n${templateText}`;

      if (!includeDataMapping) {
        systemInstruction += "\n\nCRITICAL INSTRUCTION: The user has opted OUT of the Data Mapping section. Do NOT generate the 'Data Mapping' table or section in your response, even though it is shown in the template.";
      }

      const response = await ai.models.generateContent({
        model: 'gemini-3.1-pro-preview',
        contents: sqlInput,
        config: {
          systemInstruction,
          temperature: 0.2, // Low temperature for more deterministic/structured output
        }
      });

      let text = response.text || '';
      
      // Clean up in case the model wrapped it in markdown code blocks anyway
      if (text.startsWith('\`\`\`markdown')) {
        text = text.replace(/^\`\`\`markdown\n/, '').replace(/\n\`\`\`$/, '').trim();
      } else if (text.startsWith('\`\`\`')) {
        text = text.replace(/^\`\`\`\n/, '').replace(/\n\`\`\`$/, '').trim();
      }

      setMarkdownOutput(text);

    } catch (err: any) {
      console.error(err);
      let errorMessage = err.message || 'An error occurred while generating the user story.';
      if (errorMessage.includes('xhr error') || errorMessage.includes('code: 500') || errorMessage.includes('error code: 6')) {
        errorMessage = "The AI service encountered a network error or timed out. This often happens with very large SQL files or temporary connection issues. Please try again.";
      }
      setError(errorMessage);
    } finally {
      setIsGenerating(false);
      setProgress(100);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');

    if (loginUsername !== 'admin') {
      setLoginError('Invalid username or password');
      return;
    }

    try {
      // Hash the input password using Web Crypto API
      const encoder = new TextEncoder();
      const data = encoder.encode(loginPassword);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

      // Pre-computed SHA-256 hash for "Admin@123q"
      const EXPECTED_HASH = '51ca4d506b7c02bb4e779be45a4b4b85516b2294dfd11db96f15d9bd97287c2c';

      if (hashHex === EXPECTED_HASH) {
        setIsAuthenticated(true);
        sessionStorage.setItem('isAuthenticated', 'true');
      } else {
        setLoginError('Invalid username or password');
      }
    } catch (err) {
      console.error('Hashing error:', err);
      setLoginError('An error occurred during login');
    }
  };

  if (isCheckingAuth) {
    return <div className="min-h-screen bg-slate-50 flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>;
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-xl shadow-sm border border-slate-200 w-full max-w-md">
          <div className="flex items-center gap-2 text-blue-600 mb-6 justify-center">
            <Database className="w-8 h-8" />
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900">DataStory Builder</h1>
          </div>
          <form onSubmit={handleLogin} className="flex flex-col gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Username</label>
              <input 
                type="text" 
                value={loginUsername}
                onChange={(e) => setLoginUsername(e.target.value)}
                className="w-full p-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
              <input 
                type="password" 
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                className="w-full p-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            {loginError && (
              <div className="text-red-600 text-sm font-medium bg-red-50 p-2 rounded-md border border-red-100">
                {loginError}
              </div>
            )}
            <button 
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 rounded-lg transition-colors mt-2"
            >
              Sign In
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-blue-200 flex flex-col">
      <header className="bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between sticky top-0 z-10 shrink-0">
        <div className="flex items-center gap-2 text-blue-600">
          <Database className="w-6 h-6" />
          <h1 className="text-xl font-semibold tracking-tight text-slate-900">DataStory Builder</h1>
        </div>
        <div className="text-sm text-slate-500 font-medium">
          SQL to Jira / Azure DevOps / ClickUp
        </div>
      </header>

      <main className="flex-1 max-w-[1600px] w-full mx-auto px-4 py-6 flex flex-col gap-6 h-full">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full min-h-[600px]">
          {/* Input Section */}
          <div className="flex flex-col gap-3 h-full">
            <div className="flex items-center justify-between">
              <label htmlFor="sql-input" className="text-sm font-semibold uppercase tracking-wider text-slate-600">
                T-SQL Stored Procedure
              </label>
              
              <div className="flex items-center gap-2">
                <input 
                  type="file" 
                  accept=".sql,.txt" 
                  className="hidden" 
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                />
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="text-sm flex items-center gap-1.5 text-blue-600 hover:text-blue-700 font-medium bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-md transition-colors"
                >
                  <Upload className="w-4 h-4" />
                  Upload .sql file
                </button>
                <button 
                  onClick={handleGenerate}
                  disabled={isGenerating}
                  className="text-sm flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium px-4 py-1.5 rounded-md transition-colors shadow-sm"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      Generate
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </div>
            
            {/* Progress Bar moved to top */}
            {isGenerating && (
              <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                <div 
                  className="bg-blue-600 h-1.5 rounded-full transition-all duration-300 ease-out" 
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
            )}
            
            <textarea
              id="sql-input"
              value={sqlInput}
              onChange={(e) => setSqlInput(e.target.value)}
              disabled={isGenerating}
              className="w-full flex-1 min-h-[400px] p-4 rounded-xl border border-slate-200 bg-white shadow-sm font-mono text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all disabled:opacity-50 disabled:bg-slate-50"
              placeholder="CREATE PROCEDURE [gold].[Load_SalesData]&#10;AS&#10;BEGIN&#10;  -- Paste your SQL here or upload a file...&#10;END"
            />
            
            {error && (
              <div className="flex items-center gap-2 text-red-600 bg-red-50 p-3 rounded-lg text-sm font-medium border border-red-100 shrink-0">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <p>{error}</p>
              </div>
            )}

            <div className="flex items-center gap-2 px-1 shrink-0">
              <input
                type="checkbox"
                id="include-mapping"
                checked={includeDataMapping}
                onChange={(e) => setIncludeDataMapping(e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer"
              />
              <label htmlFor="include-mapping" className="text-sm font-medium text-slate-700 cursor-pointer select-none">
                Include Data Mapping Table (Field vs Definition)
              </label>
            </div>
          </div>

          {/* Output Section */}
          <div className="flex flex-col gap-3 h-full">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2 shrink-0">
              <div className="flex items-center gap-2 text-sm font-semibold text-blue-600 border-b-2 border-blue-600 pb-2 -mb-[9px]">
                <FileText className="w-4 h-4" />
                Markdown Result
              </div>
            </div>
            
            <div className="w-full flex-1 min-h-[400px] rounded-xl border border-slate-200 bg-white shadow-inner overflow-hidden flex flex-col">
              {(!markdownOutput && !isGenerating) ? (
                <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-3 bg-slate-50/50">
                  <FileText className="w-10 h-10 opacity-40" />
                  <p className="text-sm font-medium">Your formatted user story will appear here.</p>
                </div>
              ) : isGenerating ? (
                <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-3 bg-slate-50/50">
                  <Loader2 className="w-10 h-10 opacity-40 animate-spin" />
                  <p className="text-sm font-medium">Generating your user story...</p>
                </div>
              ) : (
                <div className="flex-1 p-8 bg-white flex flex-col items-center justify-center gap-4">
                  <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-2">
                    <Check className="w-8 h-8" />
                  </div>
                  <h3 className="text-xl font-semibold text-slate-800">User Story Generated!</h3>
                  <p className="text-slate-500 text-center max-w-md">
                    Your user story has been successfully generated. You can copy it to your clipboard or download it as a Markdown file.
                  </p>
                  <div className="flex items-center gap-3 mt-4">
                    <button 
                      onClick={handleCopy}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-lg font-medium flex items-center gap-2 transition-colors shadow-sm"
                    >
                      {isCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      {isCopied ? 'Copied!' : 'Copy to Clipboard'}
                    </button>
                    <button 
                      onClick={handleDownload}
                      className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 px-6 py-2.5 rounded-lg font-medium flex items-center gap-2 transition-colors shadow-sm"
                    >
                      <Download className="w-4 h-4" />
                      Download .md
                    </button>
                  </div>
                  
                  <button 
                    onClick={() => setShowPreview(!showPreview)}
                    className="mt-6 text-sm text-blue-600 hover:underline font-medium"
                  >
                    {showPreview ? 'Hide Preview' : 'Show Preview'}
                  </button>

                  {showPreview && (
                    <div className="w-full mt-4 p-6 border border-slate-200 rounded-xl bg-slate-50 overflow-auto max-h-[400px] text-left">
                      <div className="prose prose-slate max-w-none prose-sm prose-headings:font-semibold prose-a:text-blue-600 prose-li:my-1">
                        <ReactMarkdown>{markdownOutput}</ReactMarkdown>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
