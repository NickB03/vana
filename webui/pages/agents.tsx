import Header from '../components/Header'
import { useEffect, useState } from 'react'

interface Agent { name: string; description: string }

export default function Agents() {
  const [agents, setAgents] = useState<Agent[]>([])
  useEffect(() => {
    fetch('/api/agents').then(res => res.json()).then(setAgents)
  }, [])

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <Header />
      <div className="pt-20 p-4 grid grid-cols-1 md:grid-cols-3 gap-4">
        {agents.map(a => (
          <div key={a.name} className="p-4 bg-gray-800 rounded">
            <h2 className="font-bold text-neon mb-2">{a.name}</h2>
            <p>{a.description}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
