'use client';

import { useState, useEffect, useRef } from 'react';
import { Message } from '@/types/chat';
import MarkdownMessage from '@/components/MarkdownMessage';

export default function Home() {
  const [userMessages, setUserMessages] = useState<Message[]>([]);
  const [angelMessages, setAngelMessages] = useState<Message[]>([]);
  const [devilMessages, setDevilMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const mergeMessages = (user: Message[], assistant: Message[]) => {
    const merged: Message[] = [];
    const maxLength = Math.max(user.length, assistant.length);
    for (let i = 0; i < maxLength; i++) {
      if (user[i]) merged.push(user[i]);
      if (assistant[i]) merged.push(assistant[i]);
    }
    return merged;
  };

  const messages = mergeMessages(userMessages, angelMessages);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const readResponse = async (reader: ReadableStreamDefaultReader<Uint8Array>, setMessages: React.Dispatch<React.SetStateAction<Message[]>>) => {
    const decoder = new TextDecoder();
    let message = '';

    while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        message += chunk;

        // Updates the assistant's message
        setMessages((prev) => {
            const newMessages = [...prev];
            const lastIndex = newMessages.length - 1;
            newMessages[lastIndex] = {
                role: 'assistant',
                content: message,
            };
            return newMessages;
        });
    }
};

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    
    const userMessage: Message = { role: 'user', content: input.trim() };
    setUserMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    // Create a placeholder for the assistant's message
    setAngelMessages(prev => [...prev, { role: 'assistant', content: '' }]);
    setDevilMessages(prev => [...prev, { role: 'assistant', content: '' }]);

    try {
      const angelConversation = mergeMessages(
        [...userMessages, userMessage],
        angelMessages
      );

      const angelResponse = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: angelConversation }),
      });

      const devilConversation = mergeMessages(
        [...userMessages, userMessage],
        devilMessages
      );

      const devilResponse = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: devilConversation }),
      });

      if (!(angelResponse.ok && devilResponse.ok)) {
        throw new Error('Failed to get response from server');
      }

      const angelReader = angelResponse.body?.getReader();
      const devilReader = devilResponse.body?.getReader();

      if (!(angelReader && devilReader)) {
        throw new Error('No response body');
      }

      await Promise.all([
        readResponse(angelReader, setAngelMessages),
        readResponse(devilReader, setDevilMessages),
      ]);
    } catch (error) {
      console.error('Error during chat:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center p-4 bg-gray-50">
      <div className="w-full max-w-3xl flex flex-col h-screen py-8">
        <h1 className="text-3xl font-bold mb-6 text-center text-gray-800">
          AI Chatbot
        </h1>
        
        <div className="flex-1 overflow-y-auto mb-4 bg-white rounded-lg shadow-lg p-4 space-y-4">
          {messages.length === 0 && (
            <div className="text-center text-gray-500 mt-8">
              Start a conversation by typing a message below
            </div>
          )}
          
          {messages.map((message, index) => (
            <div
              key={index}
              className={`flex ${
                message.role === 'user' ? 'justify-end' : 'justify-start'
              }`}
            >
              <div
                className={`max-w-xs md:max-w-md lg:max-w-2xl px-4 py-2 rounded-lg ${
                  message.role === 'user'
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 text-gray-800'
                }`}
              >
                {message.role === 'user' ? (
                  <p className="whitespace-pre-wrap">{message.content}</p>
                ) : (
                  <div>
                    <MarkdownMessage content={message.content} />
                    {isLoading && index === messages.length - 1 && (
                      <span className="inline-block w-2 h-4 ml-1 bg-gray-600 animate-pulse"></span>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
          
          <div ref={messagesEndRef} />
        </div>

        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your message..."
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={!input.trim()}
            className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            Send
          </button>
        </form>
      </div>
    </main>
  );
}
