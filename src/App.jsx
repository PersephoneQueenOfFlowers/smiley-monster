import { useCallback, useEffect, useRef, useState } from 'react'
import {
  getAudioOutputDevices,
  playEatBursts,
  resumeEatAudio,
  setEatAudioOutputDevice,
} from './eatSignals'
import './App.css'

let nextId = 1

const EAT_DISTANCE = 52
const TICK_MS = 80
const SPAWN_MS = 450

const randomVel = () => ({
  vx: (Math.random() - 0.5) * 2.2,
  vy: -1.8 - Math.random() * 1.4,
})

const moveEntities = (list, w, h, pad, gravity) =>
  list.map((e) => {
    let { x, y, vx, vy } = e
    x += vx
    y += vy
    vy += gravity
    if (x < pad) {
      x = pad
      vx *= -1
    }
    if (x > w - pad) {
      x = w - pad
      vx *= -1
    }
    if (y < pad) {
      y = pad
      vy *= -0.85
    }
    if (y > h - pad) {
      y = h - pad
      vy *= -0.7
    }
    return { ...e, x, y, vx, vy }
  })

const applyEating = (smileys, monsters, whoEats) => {
  const removeSmileyIds = new Set()
  const removeMonsterIds = new Set()
  for (const m of monsters) {
    for (const s of smileys) {
      const dx = m.x - s.x
      const dy = m.y - s.y
      if (dx * dx + dy * dy < EAT_DISTANCE * EAT_DISTANCE) {
        if (whoEats === 'filthy') removeSmileyIds.add(s.id)
        if (whoEats === 'clean') removeMonsterIds.add(m.id)
      }
    }
  }
  return {
    smileys: smileys.filter((s) => !removeSmileyIds.has(s.id)),
    monsters: monsters.filter((m) => !removeMonsterIds.has(m.id)),
    smileysEaten: removeSmileyIds.size,
    monstersEaten: removeMonsterIds.size,
  }
}

const App = () => {
  const [smileys, setSmileys] = useState([])
  const [monsters, setMonsters] = useState([])
  /** Last pressed side wins when a smiley and monster overlap. */
  const [predator, setPredator] = useState('clean')
  const [cleanSpouting, setCleanSpouting] = useState(false)
  const [filthySpouting, setFilthySpouting] = useState(false)
  const [soundOn, setSoundOn] = useState(true)
  const [outputDevices, setOutputDevices] = useState([])
  const [selectedSinkId, setSelectedSinkId] = useState('')

  const soundOnRef = useRef(soundOn)
  soundOnRef.current = soundOn

  const predatorRef = useRef(predator)
  predatorRef.current = predator

  const smileysRef = useRef(smileys)
  const monstersRef = useRef(monsters)
  smileysRef.current = smileys
  monstersRef.current = monsters

  const playRef = useRef(null)

  const spawnSmiley = useCallback(() => {
    const el = playRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const x = rect.width / 2 + (Math.random() - 0.5) * 40
    const y = rect.height - 28
    const { vx, vy } = randomVel()
    setSmileys((prev) => [...prev, { id: nextId++, x, y, vx, vy }])
  }, [])

  const spawnMonster = useCallback(() => {
    const el = playRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const x = rect.width / 2 + (Math.random() - 0.5) * 40
    const y = rect.height - 28
    const { vx, vy } = randomVel()
    setMonsters((prev) => [...prev, { id: nextId++, x, y, vx, vy }])
  }, [])

  const onClean = () => {
    resumeEatAudio()
    setPredator('clean')
    setCleanSpouting(true)
    spawnSmiley()
  }

  const onFilthy = () => {
    resumeEatAudio()
    setPredator('filthy')
    setFilthySpouting(true)
    spawnMonster()
  }

  const onOutputChange = async (deviceId) => {
    setSelectedSinkId(deviceId)
    await setEatAudioOutputDevice(deviceId)
  }

  const refreshAudioOutputs = useCallback(async () => {
    try {
      const list = await getAudioOutputDevices()
      setOutputDevices(list)
    } catch {
      setOutputDevices([])
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const list = await getAudioOutputDevices()
        if (!cancelled) setOutputDevices(list)
      } catch {
        if (!cancelled) setOutputDevices([])
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!cleanSpouting) return undefined
    const id = window.setInterval(spawnSmiley, SPAWN_MS)
    return () => clearInterval(id)
  }, [cleanSpouting, spawnSmiley])

  useEffect(() => {
    if (!filthySpouting) return undefined
    const id = window.setInterval(spawnMonster, SPAWN_MS)
    return () => clearInterval(id)
  }, [filthySpouting, spawnMonster])

  useEffect(() => {
    const id = window.setInterval(() => {
      const el = playRef.current
      if (!el) return
      const w = el.clientWidth
      const h = el.clientHeight
      const pad = 22
      const who = predatorRef.current

      const prevS = smileysRef.current
      const prevM = monstersRef.current
      let sMoved = moveEntities(prevS, w, h, pad, 0.055)
      let mMoved = moveEntities(prevM, w, h, pad, 0.065)
      const eaten = applyEating(sMoved, mMoved, who)
      sMoved = eaten.smileys
      mMoved = eaten.monsters
      setSmileys(sMoved)
      setMonsters(mMoved)

      if (soundOnRef.current) {
        if (eaten.monstersEaten > 0) {
          playEatBursts('good', eaten.monstersEaten)
        }
        if (eaten.smileysEaten > 0) {
          playEatBursts('bad', eaten.smileysEaten)
        }
      }
    }, TICK_MS)

    return () => clearInterval(id)
  }, [])

  return (
    <div className="app">
      <header className="header">
        <h1>Clean vs filthy</h1>
        <p className="blurb">
          <strong>Clean</strong> spouts smileys. <strong>Filthy</strong> spouts hungry monsters.
          Whichever button you pressed <em>last</em> decides who eats whom when they meet.
        </p>
        <div className="controls">
          <button type="button" className="btn btn-clean" onClick={onClean}>
            Clean
          </button>
          <button type="button" className="btn btn-stop" onClick={() => setCleanSpouting(false)}>
            Stop smileys
          </button>
          <button type="button" className="btn btn-filthy" onClick={onFilthy}>
            Filthy
          </button>
          <button type="button" className="btn btn-stop" onClick={() => setFilthySpouting(false)}>
            Stop monsters
          </button>
        </div>
        <p className="status">
          Last pick:{' '}
          <span className={predator === 'clean' ? 'tag-clean' : 'tag-filthy'}>
            {predator === 'clean' ? '😊 smileys eat monsters' : '👹 monsters eat smileys'}
          </span>
        </p>

        <div className="audio-panel">
          <label className="audio-toggle">
            <input
              type="checkbox"
              checked={soundOn}
              onChange={(e) => setSoundOn(e.target.checked)}
            />
            Eat sounds (good = bright chime when smileys win, bad = harsh drop when monsters win)
          </label>
          <div className="audio-output-row">
            <label className="audio-output-label" htmlFor="eat-sink">
              Audio output
            </label>
            <select
              id="eat-sink"
              className="audio-select"
              value={selectedSinkId}
              onChange={(e) => onOutputChange(e.target.value)}
            >
              <option value="">System default</option>
              {outputDevices.map((d) => (
                <option key={d.deviceId} value={d.deviceId}>
                  {d.label || `Output ${d.deviceId.slice(0, 8)}…`}
                </option>
              ))}
            </select>
            <button type="button" className="btn btn-stop btn-small" onClick={refreshAudioOutputs}>
              Refresh list
            </button>
          </div>
          <p className="audio-hint">
            Uses the Web Audio API (browser default device unless you pick another). Chrome/Edge can
            list outputs; labels may stay blank until after you use the mic once, or try Refresh after
            clicking Clean. Route your OS or browser to your interface for recording.
          </p>
        </div>
      </header>

      <div ref={playRef} className="playfield" aria-live="polite">
        <div className={`spout spout-clean ${cleanSpouting ? 'spout--on' : ''}`} aria-hidden />
        <div className={`spout spout-filthy ${filthySpouting ? 'spout--on' : ''}`} aria-hidden />
        {smileys.map((s) => (
          <span key={s.id} className="emoji smiley" style={{ left: s.x, top: s.y }} title="smiley">
            😊
          </span>
        ))}
        {monsters.map((m) => (
          <span key={m.id} className="emoji monster" style={{ left: m.x, top: m.y }} title="monster">
            👹
          </span>
        ))}
      </div>
    </div>
  )
}

export default App
