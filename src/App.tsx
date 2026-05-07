import { useState } from 'react'
import { ActivityId } from './data/activities'
import Home from './activities/Home'
import MemoryGame from './activities/MemoryGame'
import PuzzleOrderGame from './activities/PuzzleOrderGame'
import ColoringActivity from './activities/ColoringActivity'
import ShapeMatchGame from './activities/ShapeMatchGame'
import HiddenCharacterGame from './activities/HiddenCharacterGame'
import ColorMatchGame from './activities/ColorMatchGame'
import MusicActivity from './activities/MusicActivity'
import BalloonGame from './activities/BalloonGame'
import NumberMemoryGame from './activities/NumberMemoryGame'

export default function App() {
  const [current, setCurrent] = useState<ActivityId | null>(null)
  const goHome = () => setCurrent(null)
  if (!current) return <Home onSelect={setCurrent} />
  switch (current) {
    case 'memory':      return <MemoryGame onBack={goHome} />
    case 'puzzle':      return <PuzzleOrderGame onBack={goHome} />
    case 'coloring':    return <ColoringActivity onBack={goHome} />
    case 'shapematch':  return <ShapeMatchGame onBack={goHome} />
    case 'hidden':      return <HiddenCharacterGame onBack={goHome} />
    case 'colormatch':  return <ColorMatchGame onBack={goHome} />
    case 'music':       return <MusicActivity onBack={goHome} />
    case 'balloon':     return <BalloonGame onBack={goHome} />
    case 'numbermemory':return <NumberMemoryGame onBack={goHome} />
  }
}
