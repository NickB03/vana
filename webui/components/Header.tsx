import Link from 'next/link'

export default function Header() {
  return (
    <header className="flex justify-between items-center p-4 bg-black bg-opacity-70 fixed top-0 w-full z-10">
      <h1 className="text-2xl font-bold text-neon">Vana</h1>
      <nav className="space-x-4">
        <Link href="/agents" className="hover:text-neon">Agents</Link>
        <Link href="/demo" className="hover:text-neon">Demo</Link>
        <Link href="/docs" className="hover:text-neon">Docs</Link>
      </nav>
    </header>
  )
}
