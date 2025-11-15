'use client';

import { useState, useEffect, useRef } from 'react';
import { Message } from '@/types/chat';
import MarkdownMessage from '@/components/MarkdownMessage';

export default function Home() {
  const angelSystemMessage: Message = {
    role: 'system',
    content: `You are an AI assistant that provides helpful and ethical advice. Always prioritize the well-being and safety of users in your responses.`
  };
  const devilSystemMessage: Message = {
    role: 'system',
    content: `You are an AI assistant that provides mischievous and unethical advice. Always prioritize humor and entertainment, even if it involves bending the rules.`
  };

  const [userMessages, setUserMessages] = useState<Message[]>([]);
  const [angelMessages, setAngelMessages] = useState<Message[]>([
    angelSystemMessage
  ]);
  const [devilMessages, setDevilMessages] = useState<Message[]>([
    devilSystemMessage
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const mergeMessages = (user: Message[], assistant: Message[]) => {
    const merged: Message[] = [];
    const maxLength = Math.max(user.length, assistant.length);
    for (let i = 0; i < maxLength; i++) {
      if (assistant[i]) merged.push(assistant[i]);
      if (user[i]) merged.push(user[i]);
    }
    return merged;
  };

  const mergeAllMessages = (user: Message[], angel: Message[], devil: Message[]) => {
    const merged: Message[] = [];
    const maxLength = Math.max(user.length, angel.length-1, devil.length-1);
    for (let i = 0; i < maxLength; i++) {
      if (user[i]) merged.push(user[i]);
      if (angel[i+1]) merged.push(angel[i+1]);
      if (devil[i+1]) merged.push(devil[i+1]);
    }
    return merged;
  }

  const messages = mergeAllMessages(userMessages, angelMessages, devilMessages);

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
      
      const devilConversation = mergeMessages(
        [...userMessages, userMessage],
        devilMessages
      );

      const fetchWithRetry = async (url: string, options: RequestInit, maxRetries = 5) => {
        let response = await fetch(url, options);
        let retries = 0;

        while(response.status === 429 && retries < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, 1100));
          response = await fetch(url, options);
          retries++;
        }

        if (response.status === 429) {
          throw new Error(`Rate limited after ${maxRetries} retries`);
        }

        return response;
      };

      const [angelResponse, devilResponse] = await Promise.all([
        fetchWithRetry('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ messages: angelConversation }),
        }),
        fetchWithRetry('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ messages: devilConversation }),
        })
      ]);

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
    <main className="flex min-h-screen flex-col items-center px-4 bg-gray-50">
      <div className="w-full max-w-5xl grid grid-cols-7 grid-rows-6 gap-6 h-screen">
        <div className="flex overflow-y-auto justify-start col-start-1 col-span-2 row-start-2 row-span-4 bg-gray-100 rounded-r-lg rounded-bl-lg ">
          <div className="flex px-4 py-2 text-gray-800">
            {messages.length === 0
              ? ''
              : <MarkdownMessage content={messages[messages.length-2].content} />
            }
          </div>
        </div>
        <div className="w-full my-auto col-start-3 col-span-3 row-span-full">
          <div className="px-4 py-2 rounded-lg bg-blue-800 text-white text-center">
            {messages.length === 0
              ? ''
              : <p className="text-xl">{messages[messages.length-3].content}</p>
            }
          </div>
        </div>
          <div ref={messagesEndRef} />
        <div className="flex overflow-y-auto justify-end col-start-6 col-span-2 row-start-2 row-span-4 bg-orange-100 rounded-l-lg rounded-br-lg">
          <div className="flex px-4 py-2 text-gray-800">
            {messages.length === 0
              ? ''
              : <MarkdownMessage content={messages[messages.length-1].content} />
            }
          </div>
        </div>
        <form onSubmit={handleSubmit} className="flex col-start-3 col-span-3 row-start-6 py-2 gap-2">
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
