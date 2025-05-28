import { LayoutModule } from 'layout-module'
import { parseShapes } from './data/parseShapes'
import rawShapesJson from './data/shapesData.json'
import { useState } from 'react'

const apartmentTemplates = parseShapes(rawShapesJson)

function App() {
  const [showModule, setShowModule] = useState(true)

  return (
    <div>
      <button onClick={() => setShowModule(!showModule)}>Toggle module</button>
      <div style={{ height: '95vh', width: '98vw', border: '2px solid black' }}>
        {showModule && <LayoutModule
          units={'mm'}
          apartmentTemplates={apartmentTemplates}
        />
        }
      </div>
    </div>
  )
}

export default App
