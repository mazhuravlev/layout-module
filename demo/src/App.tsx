import { LayoutModule } from 'layout-module'
import { parseShapes } from './data/parseShapes'
import rawShapesJson from './data/shapesData.json'

const apartmentTemplates = parseShapes(rawShapesJson)

const scaleFactor = 1 / 100

const sectionOutline = [
  { x: 0, y: 0 },
  { x: 0, y: 18000 },
  { x: 36000, y: 18000 },
  { x: 36000, y: 0 },
]

function App() {
  return (
    <div style={{ height: '90vh', width: '90vw', border: '2px solid black' }}>
      <LayoutModule
        apartmentTemplates={apartmentTemplates}
        section={{
          outline: sectionOutline.map((x) => ({
            x: x.x * scaleFactor,
            y: x.y * scaleFactor,
          })),
        }}
      />
    </div>
  )
}

export default App
