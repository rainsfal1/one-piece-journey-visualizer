// Hardcoded crew join events with normalized progress (episode -> progress)
// Normalization uses (episode - 1) / (1130 - 1)
const TOTAL_EPISODES = 1130
const norm = (ep) => (ep - 1) / (TOTAL_EPISODES - 1)

const crewJoins = [
  { id: 'luffy', name: 'Monkey D. Luffy', role: 'Captain', episode: 1, progress: norm(1) },
  { id: 'zoro', name: 'Roronoa Zoro', role: 'Swordsman', episode: 3, progress: norm(3) },
  { id: 'nami', name: 'Nami', role: 'Navigator', episode: 6, progress: norm(6) },
  { id: 'usopp', name: 'Usopp', role: 'Sniper', episode: 17, progress: norm(17) },
  { id: 'sanji', name: 'Sanji', role: 'Cook', episode: 30, progress: norm(30) },
  { id: 'chopper', name: 'Tony Tony Chopper', role: 'Doctor', episode: 91, progress: norm(91) },
  { id: 'robin', name: 'Nico Robin', role: 'Archaeologist', episode: 130, progress: norm(130) },
  { id: 'franky', name: 'Franky', role: 'Shipwright', episode: 322, progress: norm(322) },
  { id: 'brook', name: 'Brook', role: 'Musician', episode: 381, progress: norm(381) },
  { id: 'jinbe', name: 'Jinbe', role: 'Helmsman', episode: 877, progress: norm(877) },
]

export default crewJoins
