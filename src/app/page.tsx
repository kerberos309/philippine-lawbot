"use client"

import ChatArea from './components/ChatArea';

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-24">
      <h1>Chat with Atty. Phil Lawbot</h1>
      <ChatArea />
    </main>
  );
}
