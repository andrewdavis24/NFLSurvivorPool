import { useState } from 'react'
import roomateLogo from './assets/IMG_4016.jpeg'
import './App.css'

function App() {
  const [count, setCount] = useState(0)

  return (
    <>
      <section id="center">
        <div className="hero">
          <img src={roomateLogo} className="base" width="170" height="179" alt="" />
        </div>
        <div>
          <h1>Combine Plant NFL Survivor Pool</h1>
        </div>
        <button
          type="button"
          className="counter"
          onClick={() => setCount((count) => count + 1)}
        >
          Count is {count}
        </button>
      </section>
    </>
  )
}

export default App
