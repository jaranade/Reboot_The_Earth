import { useState } from 'react'
import TopBar from './components/TopBar'
import MapPane from './components/MapPane'
import DetailPane from './components/DetailPane'
import { mockResponses } from './mockData'

export default function App() {
  const [persona, setPersona] = useState('almond')
  const data = mockResponses[persona]

  return (
    <div className="flex flex-col h-screen">
      <TopBar persona={persona} onPersonaChange={setPersona} />
      <div className="flex flex-1 overflow-hidden">
        <div className="w-3/5">
          <MapPane />
        </div>
        <div className="w-2/5 overflow-y-auto bg-slate-50">
          <DetailPane data={data} />
        </div>
      </div>
    </div>
  )
}
