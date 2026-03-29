// Centralized icon registry using Iconify
// Sets used: Phosphor (ph), Material Symbols (material-symbols), Tabler (tabler)

export const icons = {
  // Brand / Navigation
  shield: "ph:shield-bold",
  dashboard: "ph:squares-four-bold",
  menu: "ph:list-bold",
  close: "ph:x-bold",
  arrowRight: "ph:arrow-right-bold",
  chevronRight: "ph:caret-right-bold",

  // Map
  map: "ph:map-trifold-bold",
  mapPin: "ph:map-pin-bold",
  search: "ph:magnifying-glass-bold",
  navigation: "ph:navigation-arrow-bold",
  layers: "ph:stack-bold",
  compass: "ph:compass-bold",

  // Weather / Storm phases
  sunCloud: "ph:cloud-sun-bold",
  lightning: "ph:lightning-bold",
  cloudLightning: "ph:cloud-lightning-bold",
  cloudRain: "ph:cloud-rain-bold",
  wind: "ph:wind-bold",
  tornado: "material-symbols:tornado-rounded",
  hurricane: "material-symbols:cyclone-rounded",
  thermometer: "ph:thermometer-bold",

  // Alerts / Emergency
  alert: "ph:warning-bold",
  bell: "ph:bell-bold",
  bellRinging: "ph:bell-ringing-bold",
  siren: "ph:siren-bold",
  radio: "ph:radio-bold",
  broadcast: "ph:broadcast-bold",
  megaphone: "ph:megaphone-bold",

  // Reports / Documents
  fileText: "ph:file-text-bold",
  notepad: "ph:notepad-bold",
  send: "ph:paper-plane-tilt-bold",
  chatText: "ph:chat-text-bold",
  clipboard: "ph:clipboard-text-bold",

  // Resources / Shelter
  house: "ph:house-bold",
  buildings: "ph:buildings-bold",
  firstAid: "ph:first-aid-kit-bold",
  bed: "ph:bed-bold",
  food: "ph:bowl-food-bold",
  water: "ph:drop-bold",
  power: "ph:lightning-bold",
  wifi: "ph:wifi-high-bold",
  chargingStation: "ph:battery-charging-bold",
  heart: "ph:heart-bold",
  paw: "ph:paw-print-bold",
  medical: "ph:heartbeat-bold",

  // People / Reunification
  users: "ph:users-bold",
  userPlus: "ph:user-plus-bold",
  userCheck: "ph:user-check-bold",
  userSearch: "ph:magnifying-glass-bold",
  handshake: "ph:handshake-bold",
  link: "ph:link-bold",
  family: "ph:users-three-bold",

  // Recovery
  hammer: "ph:hammer-bold",
  wrench: "ph:wrench-bold",
  hardHat: "ph:hard-hat-bold",
  treeStructure: "ph:tree-structure-bold",
  checkCircle: "ph:check-circle-bold",

  // Status / UI
  live: "ph:pulse-bold",
  spinner: "ph:spinner-bold",
  info: "ph:info-bold",
  eye: "ph:eye-bold",
  filter: "ph:funnel-bold",
  loader: "ph:circle-notch-bold",
} as const;
