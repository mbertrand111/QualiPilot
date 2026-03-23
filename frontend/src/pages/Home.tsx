import { useState, useEffect } from 'react';

export function Home() {
  const [backendStatus, setBackendStatus] = useState<'checking' | 'ok' | 'error'>('checking');

  useEffect(() => {
    fetch('/api/health')
      .then((res) => res.json())
      .then((data: { status: string }) => {
        setBackendStatus(data.status === 'ok' ? 'ok' : 'error');
      })
      .catch(() => setBackendStatus('error'));
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-8">
      <div className="max-w-lg w-full text-center">
        <h1 className="text-4xl font-bold text-blue-800 mb-2">QualiPilot</h1>
        <p className="text-gray-500 text-lg mb-10">
          Pilotage qualité — Azure DevOps
        </p>

        <div
          className={`rounded-lg px-5 py-4 mb-8 text-sm font-medium border ${
            backendStatus === 'ok'
              ? 'bg-green-50 border-green-200 text-green-800'
              : backendStatus === 'error'
              ? 'bg-red-50 border-red-200 text-red-800'
              : 'bg-gray-100 border-gray-200 text-gray-600'
          }`}
        >
          {backendStatus === 'checking' && 'Connexion au serveur…'}
          {backendStatus === 'ok' && 'Serveur connecté'}
          {backendStatus === 'error' && 'Serveur non disponible — lancez npm run dev'}
        </div>

        <p className="text-gray-400 text-sm">
          Application en cours de construction.
        </p>
      </div>
    </div>
  );
}
