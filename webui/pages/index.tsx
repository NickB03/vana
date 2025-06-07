import Head from 'next/head'
import Header from '../components/Header'
import Constellation from '../components/Constellation'
import { motion } from 'framer-motion'

export default function Home() {
  return (
    <div className="h-screen overflow-hidden relative">
      <Head>
        <title>Vana</title>
      </Head>
      <Constellation />
      <Header />
      <main className="flex flex-col items-center justify-center h-full text-center relative z-10">
        <motion.h1
          className="text-6xl font-extrabold mb-4"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          Virtual Autonomous Networked Agent
        </motion.h1>
        <p className="text-xl mb-6">Experience multi-agent orchestration</p>
        <a href="/demo" className="px-6 py-3 bg-neon text-black font-bold rounded shadow hover:opacity-80">Try a Demo</a>
      </main>
    </div>
  )
}
