import { useState } from 'react'
import { ActivityId } from './data/activities'
import Home from './activities/Home'
import MemoryGame from './activities/MemoryGame'
import PuzzleOrderGame from './activities/PuzzleOrderGame'
import ColoringActivity from './activities/ColoringActivity'
import ShapeMatchGame from './activities/ShapeMatchGame'
import HiddenCharacterGame from './activities/HiddenCharacterGame'
import DesignQuizGame from './activities/DesignQuizGame'
import MusicActivity from './activities/MusicActivity'
import BalloonGame from './activities/BalloonGame'
import NumberMemoryGame from './activities/NumberMemoryGame'
import MinesweeperGame from './activities/MinesweeperGame'
import BrickBreakerGame from './activities/BrickBreakerGame'
import DinoGame from './activities/DinoGame'
import PlaneGame from './activities/PlaneGame'

export default function App() {
  const [current, setCurrent] = useState<ActivityId | null>(null)
  const goHome = () => setCurrent(null)
  if (!current) return <Home onSelect={setCurrent} />
  switch (current) {
    case 'memory':       return <MemoryGame onBack={goHome} />
    case 'puzzle':       return <PuzzleOrderGame onBack={goHome} />
    case 'coloring':     return <ColoringActivity onBack={goHome} />
    case 'shapematch':   return <ShapeMatchGame onBack={goHome} />
    case 'hidden':       return <HiddenCharacterGame onBack={goHome} />
    case 'designquiz':   return <DesignQuizGame onBack={goHome} />
    case 'music':        return <MusicActivity onBack={goHome} />
    case 'balloon':      return <BalloonGame onBack={goHome} />
    case 'numbermemory': return <NumberMemoryGame onBack={goHome} />
    case 'minesweeper':  return <MinesweeperGame onBack={goHome} />
    case 'brickbreaker': return <BrickBreakerGame onBack={goHome} />
    case 'dinogame':     return <DinoGame onBack={goHome} />
    case 'planegame':   return <PlaneGame onBack={goHome} />
  }
}
