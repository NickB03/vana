import { useEffect, useRef, useState } from 'react'
import Header from '../components/Header'

interface Message {
  id: string
  text: string
  sender: 'user' | 'vana'
}

export default function Chat() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function sendMessage() {
    if (!input.trim()) return
    const userMsg: Message = { id: Date.now().toString(), text: input, sender: 'user' }
    setMessages(m => [...m, userMsg])
    setInput('')
    const res = await fetch('/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message: userMsg.text }) })
    const data = await res.json()
    const vanaMsg: Message = { id: data.messageId, text: data.response, sender: 'vana' }
    setMessages(m => [...m, vanaMsg])
  }

  return (
    <div className="h-screen flex flex-col bg-gray-900">
      <Header />
      <div className="flex-1 overflow-y-auto px-4 pt-16">
        {messages.map(m => (
          <div key={m.id} className={`my-2 ${m.sender === 'vana' ? 'text-neon' : ''}`}>{m.sender === 'user' ? 'You: ' : 'Vana: '}{m.text}</div>
        ))}
        <div ref={endRef} />
      </div>
      <div className="p-4 flex space-x-2">
        <input value={input} onChange={e => setInput(e.target.value)} className="flex-1 p-2 bg-gray-800 rounded" placeholder="Message Vana" />
        <button onClick={sendMessage} className="bg-neon text-black px-4 py-2 rounded">Send</button>
      </div>
    </div>
  )
}
