import { useEffect, useRef } from 'react';
import AgentMessage from './AgentMessage';

function UserMessage({ message }) {
  return (
    <div className="flex justify-end">
      <div className="max-w-lg px-4 py-3 rounded-2xl rounded-tr-sm bg-accent-blue text-white text-sm leading-relaxed">
        {message.content}
      </div>
    </div>
  );
}

export default function MessageList({ messages, isStreaming }) {
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="flex-1 overflow-y-auto px-4 py-6 space-y-6">
      {messages.map((msg) =>
        msg.role === 'user' ? (
          <UserMessage key={msg.id} message={msg} />
        ) : (
          <AgentMessage key={msg.id} message={msg} />
        )
      )}
      <div ref={bottomRef} />
    </div>
  );
}
