import { LayoutModule } from 'layout-module'
import { parseShapes } from './data/parseShapes'
import rawShapesJson from './data/shapesData.json'
import { useState } from 'react'

const apartmentTemplates = parseShapes(rawShapesJson)

const scaleFactor = 1 / 100

const sectionOutline = [
  { x: 0, y: 0 },
  { x: 0, y: 18000 },
  { x: 36000, y: 18000 },
  { x: 36000, y: 0 },
]

function App() {
  const [showModule, setShowModule] = useState(true)

  return (
    <div>
      <button onClick={() => setShowModule(!showModule)}>Toggle module</button>
      <div style={{ height: '90vh', width: '90vw', border: '2px solid black' }}>
        {showModule && <LayoutModule
          apartmentTemplates={apartmentTemplates}
          section={{
            outline: sectionOutline.map((x) => ({
              x: x.x * scaleFactor,
              y: x.y * scaleFactor,
            })),
          }}
        />
        }
      </div>
    </div>
  )
}

export default App
