import React, { useState, useRef, useEffect } from 'react';
import { useAudioRecorder } from './hooks/useAudioRecorder';

// SVG Icons
const MicIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
    <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
    <line x1="12" y1="19" x2="12" y2="22" />
  </svg>
);

const PaperclipIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48" />
  </svg>
);

const HistoryIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
    <path d="M3 3v5h5" />
  </svg>
);

const MenuIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="4" y1="12" x2="20" y2="12" />
    <line x1="4" y1="6" x2="20" y2="6" />
    <line x1="4" y1="18" x2="20" y2="18" />
  </svg>
);

const XIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 6 6 18" />
    <path d="m6 6 12 12" />
  </svg>
);

const Loader2Icon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="animate-spin">
    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
  </svg>
);

const AlertCircleIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="8" x2="12" y2="12" />
    <line x1="12" y1="16" x2="12.01" y2="16" />
  </svg>
);

interface ChatHistory {
  id: string;
  title: string;
  date: string;
  messages: ChatMessage[];
}

interface ChatMessage {
  id: string;
  transcription: string;
  emotion: string;
  gemini_response: string;
  timestamp: Date;
}

interface ApiResponse {
  transcription: string;
  emotion: string;
  gemini_response: string;
}

function App() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [backendError, setBackendError] = useState<string | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatHistories, setChatHistories] = useState<ChatHistory[]>([]);
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);

  const BACKEND_URL = '/api';
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { isRecording, startRecording, stopRecording } = useAudioRecorder();

  // Scroll to bottom when new messages are added
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [chatMessages]);

  // Load chat messages when switching chats
  useEffect(() => {
    if (currentChatId) {
      const chat = chatHistories.find(c => c.id === currentChatId);
      if (chat) {
        setChatMessages(chat.messages);
      }
    } else {
      setChatMessages([]);
    }
  }, [currentChatId, chatHistories]);

  const startNewChat = () => {
    // Only save to history if this is a new chat that hasn't been saved yet
    if (chatMessages.length > 0 && !currentChatId) {
      const newChat: ChatHistory = {
        id: Date.now().toString(),
        title: chatMessages[0].transcription.slice(0, 30) + '...',
        date: new Date().toLocaleDateString(),
        messages: [...chatMessages]
      };
      setChatHistories(prev => [newChat, ...prev]);
    }
    setCurrentChatId(null);
    setChatMessages([]);
  };

  const switchToChat = (chatId: string) => {
    setCurrentChatId(chatId);
  };

  const handleMicClick = async () => {
    try {
      if (isRecording) {
        console.log('Stopping recording...');
        const audioBlob = await stopRecording();
        if (audioBlob) {
          console.log('Audio blob created, size:', audioBlob.size);
          await processAudioResponse(audioBlob);
        } else {
          console.error('No audio blob received from stopRecording');
          setBackendError('Failed to capture audio. Please try again.');
        }
      } else {
        console.log('Starting recording...');
        try {
          await startRecording();
          console.log('Recording started successfully');
        } catch (error) {
          console.error('Error starting recording:', error);
          setBackendError('Failed to start recording. Please check your microphone permissions.');
        }
      }
    } catch (error) {
      console.error('Error in handleMicClick:', error);
      setBackendError('An error occurred with the microphone. Please try again.');
    }
  };

  const processAudioResponse = async (audioBlob: Blob) => {
    try {
      setIsProcessing(true);
      setBackendError(null);

      // Validate audio blob
      if (!audioBlob || audioBlob.size === 0) {
        throw new Error('No audio data received');
      }

      const formData = new FormData();
      formData.append('file', audioBlob, 'recording.wav');

      console.log('Sending audio to backend, size:', audioBlob.size);
      const response = await fetch(`${BACKEND_URL}/analyze_audio`, {
        method: 'POST',
        body: formData,
        credentials: 'include',
        headers: {
          'Authorization': 'Bearer dummy-token'
        }
      });

      console.log('Response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Server error:', errorText);
        throw new Error(`Failed to process audio: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      console.log('Server response:', result);

      if (!result.transcription || !result.emotion || !result.gemini_response) {
        throw new Error('Invalid response format from server');
      }

      const newMessage: ChatMessage = {
        id: Date.now().toString(),
        ...result,
        timestamp: new Date()
      };

      setChatMessages(prev => [...prev, newMessage]);

      // Only create a new chat history entry if this is the first message
      if (chatMessages.length === 0) {
        const newChat: ChatHistory = {
          id: Date.now().toString(),
          title: result.transcription.slice(0, 30) + '...',
          date: new Date().toLocaleDateString(),
          messages: [newMessage]
        };
        setChatHistories(prev => [newChat, ...prev]);
        setCurrentChatId(newChat.id);
      } else if (currentChatId) {
        // Update existing chat history
        setChatHistories(prev => prev.map(chat =>
          chat.id === currentChatId
            ? { ...chat, messages: [...chat.messages, newMessage] }
            : chat
        ));
      }

    } catch (error) {
      console.error('Error in processAudioResponse:', error);
      setBackendError(error instanceof Error ? error.message : 'Failed to process the audio. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.type !== 'audio/wav') {
        setBackendError('Please upload a WAV file only.');
        return;
      }
      try {
        console.log('Processing file:', file.name, 'Type:', file.type);
        await processAudioResponse(file);
        // Reset the file input after successful upload
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      } catch (error) {
        console.error('Error processing file:', error);
        setBackendError('Failed to process the audio file. Please try again.');
      }
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="flex h-screen bg-[#111111]">
      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 transform ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} w-64 bg-[#1A1A1A] text-white transition-transform duration-200 ease-in-out z-30`}>
        <div className="flex items-center justify-between p-4 border-b border-[#2A2A2A]">
          <h1 className="text-xl font-bold">PJT2</h1>
          <button
            onClick={() => setIsSidebarOpen(false)}
            className="p-1 hover:bg-[#2A2A2A] rounded"
          >
            <XIcon />
          </button>
        </div>
        <div className="p-4 border-b border-[#2A2A2A]">
          <button
            onClick={startNewChat}
            className="w-full bg-[#2A2A2A] hover:bg-[#3A3A3A] text-white py-2 px-4 rounded-lg flex items-center justify-center gap-2"
          >
            <span className="text-[#FF3B30]">+</span> New Chat
          </button>
        </div>
        <div className="p-4 text-sm text-gray-400 uppercase">
          Previous Chats
        </div>
        <div className="overflow-y-auto h-full pb-20">
          {chatHistories.map((chat) => (
            <div
              key={chat.id}
              onClick={() => switchToChat(chat.id)}
              className={`p-4 hover:bg-[#2A2A2A] cursor-pointer ${currentChatId === chat.id ? 'bg-[#2A2A2A]' : ''
                }`}
            >
              <div className="flex items-center gap-2">
                <HistoryIcon />
                <span className="truncate">{chat.title}</span>
              </div>
              <span className="text-sm text-gray-500 ml-6">{chat.date}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div className={`flex-1 ${isSidebarOpen ? 'ml-64' : 'ml-0'} transition-margin duration-200 ease-in-out flex flex-col h-screen`}>
        {/* Mobile menu button */}
        <button
          className={`fixed top-4 left-4 z-20 p-2 rounded-md bg-[#2A2A2A] text-white md:hidden ${isSidebarOpen ? 'hidden' : 'block'}`}
          onClick={() => setIsSidebarOpen(true)}
        >
          <MenuIcon />
        </button>

        {/* Chat Container */}
        <div className="flex-1 overflow-hidden flex flex-col">
          {/* Messages Area */}
          <div
            ref={chatContainerRef}
            className="flex-1 overflow-y-auto p-6 space-y-4"
          >
            {backendError && (
              <div className="bg-[#2A2A2A] rounded-lg p-6 space-y-4 mb-8">
                <div className="flex items-center gap-2 text-[#FF3B30]">
                  <AlertCircleIcon />
                  <h3 className="text-lg font-semibold">Connection Error</h3>
                </div>
                <p className="text-gray-200">{backendError}</p>
              </div>
            )}

            {chatMessages.map((message) => (
              <div key={message.id} className="space-y-4">
                {/* User Message (Transcription) */}
                <div className="flex justify-end">
                  <div className="max-w-[70%] bg-[#FF3B30] text-white rounded-2xl rounded-tr-none px-6 py-4">
                    <p className="text-sm text-gray-200 mb-1">{formatTime(message.timestamp)}</p>
                    <p className="text-white">{message.transcription}</p>
                  </div>
                </div>

                {/* Bot Response */}
                <div className="flex justify-start">
                  <div className="max-w-[70%] bg-[#2A2A2A] text-white rounded-2xl rounded-tl-none px-6 py-4">
                    <div className="space-y-3">
                      <div>
                        <h3 className="text-sm text-gray-400 uppercase mb-1">Emotion Detected</h3>
                        <p className="text-white capitalize">{message.emotion}</p>
                      </div>
                      <div>
                        <h3 className="text-sm text-gray-400 uppercase mb-1">Response</h3>
                        <p className="text-white leading-relaxed whitespace-pre-wrap">{message.gemini_response}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {isProcessing && (
              <div className="flex justify-end">
                <div className="max-w-[70%] bg-[#2A2A2A] text-white rounded-2xl rounded-tr-none px-6 py-4">
                  <div className="flex items-center space-x-2">
                    <Loader2Icon />
                    <span>Processing audio...</span>
                  </div>
                </div>
              </div>
            )}

            {chatMessages.length === 0 && !isProcessing && (
              <div className="flex flex-col items-center justify-center h-full text-gray-500">
                <p className="text-lg italic mb-2">"If it works, don't touch it"</p>
                <p className="text-sm">- Unknown Engineer</p>
              </div>
            )}
          </div>

          {/* Input Controls - Fixed at bottom */}
          <div className="flex-shrink-0 border-t border-[#2A2A2A] bg-[#111111] p-6">
            <div className="max-w-2xl mx-auto">
              <div className="flex justify-center gap-4">
                <button
                  onClick={handleMicClick}
                  disabled={isProcessing}
                  className={`relative p-6 rounded-full transition-all duration-300 ${isRecording
                    ? 'bg-[#FF3B30] scale-110 shadow-lg shadow-[#FF3B30]/50'
                    : isProcessing
                      ? 'bg-gray-600 cursor-not-allowed'
                      : 'bg-[#FF3B30] hover:bg-[#FF2D20] hover:scale-105'
                    } text-white`}
                >
                  {isRecording && (
                    <div className="absolute inset-0 rounded-full animate-ping bg-[#FF3B30] opacity-75"></div>
                  )}
                  <MicIcon />
                </button>

                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isProcessing}
                  className={`p-6 rounded-full transition-all duration-300 ${isProcessing
                    ? 'bg-gray-600 cursor-not-allowed'
                    : 'bg-[#2A2A2A] hover:bg-[#3A3A3A] hover:scale-105'
                    } text-white`}
                >
                  <PaperclipIcon />
                </button>
              </div>
              <p className="text-gray-400 text-center mt-4">
                {isProcessing
                  ? 'Processing your audio...'
                  : isRecording
                    ? 'Recording... Click again to stop'
                    : 'Click the microphone to start recording or attach an audio file'
                }
              </p>
            </div>
          </div>
        </div>
      </div>

      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileUpload}
        accept="audio/*"
        className="hidden"
        disabled={isProcessing}
      />
    </div>
  );
}

export default App;