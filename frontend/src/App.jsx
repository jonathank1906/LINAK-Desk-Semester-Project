import { useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'

function App() {
  const [response, setResponse] = useState("")
  const [count, setCount] = useState(0)
  const [loading, setLoading] = useState(false)

  const updateResponse = async () => {
    setLoading(true);
    try {
      const res = await fetch("http://localhost:8000/api/hello-world/");
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      const data = await res.json();
      setResponse(data["message"] || "No message received");
      setCount(count + 1);
    } catch (error) {
      console.error("Fetch error:", error);
      setResponse("Error: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex flex-col items-center justify-center p-8">
      {/* Logos Section */}
      <div className="flex gap-8 mb-8">
        <a href="https://vite.dev" target="_blank" className="transition-transform hover:scale-110">
          <img src={viteLogo} className="w-24 h-24" alt="Vite logo" />
        </a>
        <a href="https://react.dev" target="_blank" className="transition-transform hover:scale-110">
          <img src={reactLogo} className="w-24 h-24" alt="React logo" />
        </a>
      </div>

      {/* Main Heading */}
      <h1 className="text-4xl font-bold text-gray-800 mb-8">
        Vite + React + Tailwind
      </h1>

      {/* Card Section */}
      <div className="bg-white rounded-2xl shadow-xl p-8 mb-8 text-center max-w-md w-full">
        <button 
          onClick={() => updateResponse()}
          disabled={loading}
          className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-semibold py-3 px-6 rounded-full transition-all duration-200 transform hover:scale-105 shadow-md hover:shadow-lg mb-4 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Loading...' : `Click me! (Count: ${count})`}
        </button>
        
        {response && (
          <div className="mt-4 p-3 bg-green-100 border border-green-300 rounded-lg">
            <p className="text-green-700 font-medium">API Response: {response}</p>
          </div>
        )}
        
        <p className="text-gray-600 text-sm mt-4">
          Edit <code className="bg-gray-100 px-2 py-1 rounded text-blue-600">src/App.jsx</code> and save to test HMR
        </p>
      </div>

      {/* Footer Text */}
      <p className="text-gray-500 text-center">
        Click on the Vite and React logos to learn more
      </p>

      {/* Tailwind Hello World Message */}
      <div className="mt-8 p-6 bg-gradient-to-r from-green-400 to-blue-500 rounded-2xl shadow-lg">
        <h2 className="text-2xl font-bold text-white text-center">
          🎉 Hello World from Tailwind CSS!
        </h2>
        <p className="text-white/90 text-center mt-2">
          Styled with beautiful gradients and modern design
        </p>
      </div>
    </div>
  )
}

export default App