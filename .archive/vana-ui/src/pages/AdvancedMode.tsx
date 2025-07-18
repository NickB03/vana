import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Icons } from "@/components/Icons";
import { Link } from "react-router-dom";
import { HoverBorderGradient } from "@/components/ui/hover-border-gradient";

const AdvancedMode = () => {
  const [inputValue, setInputValue] = useState("");

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
  };

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    console.log("Task submitted to Vana agents");
  };

  return (
    <div className="min-h-screen bg-[var(--bg-main)] flex flex-col">
      {/* Header */}
      <header className="flex justify-between items-center p-4 border-b border-[var(--border-primary)]">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-gradient-to-r from-[var(--accent-blue)] to-[var(--accent-purple)] rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">V</span>
          </div>
          <span className="text-xl font-normal text-[var(--text-primary)]">Vana</span>
        </div>
        <div className="flex items-center space-x-3">
          <HoverBorderGradient
            as={Link}
            to="/chat"
            className="bg-[var(--bg-element)] text-[var(--text-primary)] border-[var(--border-primary)] hover:bg-[var(--bg-input)]"
            containerClassName="rounded-lg"
          >
            Simple Mode
          </HoverBorderGradient>
        </div>
      </header>

      {/* Main Content Grid */}
      <div className="flex-1 grid grid-cols-12 gap-4 p-4">
        {/* Left Panel - User Chat */}
        <div className="col-span-4 bg-[var(--bg-element)] border border-[var(--border-primary)] rounded-lg flex flex-col">
          <div className="p-4 border-b border-[var(--border-primary)]">
            <h2 className="text-lg font-semibold text-[var(--text-primary)]">User Chat</h2>
          </div>
          <div className="flex-1 p-4">
            <div className="flex items-start space-x-2 mb-4">
              <button className="p-1 text-[var(--text-secondary)] hover:text-[var(--accent-blue)]">
                <Icons.plus className="w-4 h-4" />
              </button>
              <button className="p-1 text-[var(--text-secondary)] hover:text-[var(--accent-blue)]">
                <Icons.menu className="w-4 h-4" />
              </button>
            </div>
            <div className="text-[var(--text-primary)] mb-4">
              Ask for a high-level goal to see the agents work.
            </div>
          </div>
          {/* Input at bottom */}
          <div className="p-4 border-t border-[var(--border-primary)]">
            <form onSubmit={onSubmit}>
              <div className="relative bg-[var(--bg-main)] border border-[var(--border-primary)] rounded-lg p-3">
                <input
                  type="text"
                  value={inputValue}
                  onChange={handleChange}
                  placeholder="Message VANA..."
                  className="w-full bg-transparent text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] focus:outline-none"
                />
                <button
                  type="submit"
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 p-1 text-[var(--text-secondary)] hover:text-[var(--accent-blue)]"
                >
                  <Icons.send className="w-4 h-4" />
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Middle Panels */}
        <div className="col-span-8 grid grid-rows-2 gap-4">
          {/* Top Row - Team Log and Task Plan */}
          <div className="grid grid-cols-2 gap-4">
            {/* Team Log */}
            <div className="bg-[var(--bg-element)] border border-[var(--border-primary)] rounded-lg">
              <div className="p-4 border-b border-[var(--border-primary)]">
                <h2 className="text-lg font-semibold text-[var(--text-primary)]">Team Log</h2>
              </div>
              <div className="p-4">
                <p className="text-[var(--text-secondary)]">Waiting for task...</p>
              </div>
            </div>

            {/* Task Plan */}
            <div className="bg-[var(--bg-element)] border border-[var(--border-primary)] rounded-lg">
              <div className="p-4 border-b border-[var(--border-primary)]">
                <h2 className="text-lg font-semibold text-[var(--text-primary)]">Task Plan</h2>
              </div>
              <div className="p-4">
                <p className="text-[var(--text-secondary)]">Waiting for task...</p>
              </div>
            </div>
          </div>

          {/* Bottom Row - Canvas */}
          <div className="bg-[var(--bg-element)] border border-[var(--border-primary)] rounded-lg">
            <div className="p-4 border-b border-[var(--border-primary)] flex justify-between items-center">
              <h2 className="text-lg font-semibold text-[var(--text-primary)]">Canvas</h2>
              <button className="p-1 text-[var(--text-secondary)] hover:text-[var(--accent-blue)]">
                <Icons.copy className="w-4 h-4" />
              </button>
            </div>
            <div className="p-4 flex items-center justify-center h-full min-h-[200px]">
              <p className="text-[var(--text-secondary)]">Canvas content will appear here.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdvancedMode;