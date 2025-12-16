// Hardcoded crew join events with normalized progress (episode -> progress)
// Normalization uses (episode - 1) / (1130 - 1)
const TOTAL_EPISODES = 1130
const norm = (ep) => (ep - 1) / (TOTAL_EPISODES - 1)

const crewJoins = [
  // Canonical order + hardcoded arc mapping (use `arcs.js` ids)
  { id: 'luffy', name: 'Monkey D. Luffy', role: 'Captain', episode: 1, progress: norm(1), arcId: 'gecko', order: 0 },
  { id: 'zoro', name: 'Roronoa Zoro', role: 'Swordsman', episode: 3, progress: norm(3), arcId: 'gecko', order: 1 },
  { id: 'nami', name: 'Nami', role: 'Navigator', episode: 6, progress: norm(6), arcId: 'arlong', order: 2 },
  { id: 'usopp', name: 'Usopp', role: 'Sniper', episode: 17, progress: norm(17), arcId: 'gecko', order: 3 },
  { id: 'sanji', name: 'Sanji', role: 'Cook', episode: 30, progress: norm(30), arcId: 'baratie', order: 4 },
  { id: 'chopper', name: 'Tony Tony Chopper', role: 'Doctor', episode: 91, progress: norm(91), arcId: 'drum', order: 5 },
  { id: 'robin', name: 'Nico Robin', role: 'Archaeologist', episode: 130, progress: norm(130), arcId: 'alabasta', order: 6 },
  { id: 'franky', name: 'Franky', role: 'Shipwright', episode: 322, progress: norm(322), arcId: 'post-enies', order: 7 },
  { id: 'brook', name: 'Brook', role: 'Musician', episode: 381, progress: norm(381), arcId: 'thriller-bark', order: 8 },
  { id: 'jinbe', name: 'Jinbe', role: 'Helmsman', episode: 877, progress: norm(877), arcId: 'wano', order: 9 },
]

export default crewJoins
