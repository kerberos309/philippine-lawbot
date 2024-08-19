import React, { useState, useRef, useEffect } from 'react';
import { Input, Button } from "@nextui-org/react";
import { FaPaperPlane } from 'react-icons/fa';
import {CgSearchLoading} from 'react-icons/cg';

type Message = {
  text: string;
  sender: 'user' | 'bot';
};

const ChatInterface: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(scrollToBottom, [messages]);

  const sendMessage = async () => {
    if (inputText.trim()) {
      setInputText('');
      setMessages([...messages, { text: inputText, sender: 'user' }]);
      setMessages(botMessages => [...botMessages, {text: 'Atty. Phil Lawbot: Loading...', sender: 'bot'}]);
      setLoading(true);
      const botResponse = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ question: inputText }),
      });
      const data = await botResponse.json();
      if(data.status===200){
        setMessages(prevMessage=>prevMessage.slice(0,-1));
        setLoading(false);
        setMessages(botMessages => [...botMessages, { text: `Atty. Phil Lawbot: ${data.data}`, sender: 'bot' }]);
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
                        {message.sender==='bot' && index===messages.length - 1 ? 
                          loading ? (
                            <div className="flex items-center justify-center">
                              <svg className="animate-spin h-8 w-8 text-blue-500"
                                    xmlns='http://www.w3.org/2000/svg'
                                    fill='none'
                                    viewBox='0 0 24 24'>
                                      <circle className="opacity-25"
                                        cx="12"
                                        cy="12"
                                        r="10"
                                        stroke="currentColor"
                                        stroke-width="4"></circle>
                                        <path
                                          className="opacity-75"
                                          fill="currentColor"
                                          d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                                        ></path>
                                    </svg>
                            </div>) :
                            <p>{message.text}</p> :
                          <p>{message.text}</p>}
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
            <Button style={{
              width: '50px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }} onClick={sendMessage}>
              <FaPaperPlane />
            </Button>
        </div>
        
    </div>
        
  );
};

export default ChatInterface;