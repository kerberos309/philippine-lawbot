import React, { useState, useRef, useEffect } from 'react';
import { Input, Button } from "@nextui-org/react";

type Message = {
  text: string;
  sender: 'user' | 'bot';
};

const ChatInterface: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(scrollToBottom, [messages]);

  const sendMessage = async () => {
    if (inputText.trim()) {
      setMessages([...messages, { text: inputText, sender: 'user' }]);
      const botResponse = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ question: inputText }),
      });
      const data = await botResponse.json();
      if(data.status===200){
        setInputText('');
        setMessages(prevMessages => [...prevMessages, { text: `Atty. Phil Lawbot: ${data.data}`, sender: 'bot' }]);
      }
    }
  };

  return (
    <div className="w-auto h-auto mx-auto p-4 bg-white shadow-lg rounded-lg">
        <div style={{ 
            borderColor:'black', 
            borderRadius:'15px', 
            borderStyle:'solid', 
            borderWidth:'1px', 
            height: '500px', 
            width:'1000px', 
            overflowY: 'auto' }}>
            {messages.map((message, index) => (
                <div key={index} className='flex w-full'>
                    <div style={message.sender==='user'?{marginLeft:'auto'}:{marginRight:'auto'}} className={`max-w-[70%] p-2 rounded-lg`}>
                        <p>{message.text}</p>
                    </div>
                </div>
            ))}
        </div>
        <div className='flex items-strech' style={{maxWidth: '1000px', marginTop: '10px'}}>
            <Input
            style={{width: '940px' }}
            placeholder="What is this legal case about?"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => {
                if (e.key === 'Enter') sendMessage();
            }}
            >
            </Input>
            <Button style={{width:'50px'}} onClick={sendMessage}>Send</Button>
        </div>
        
    </div>
        
  );
};

export default ChatInterface;