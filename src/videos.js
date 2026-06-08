/* REALITECH — Showcase manifest
 * slug MUST equal normalize(originalDriveTitle) so scripts/optimize.mjs can
 * map a downloaded raw file -> videos/<slug>.mp4 automatically.
 * normalize(): lowercase, every run of non [a-z0-9] -> "-", trim "-".
 * driveId is kept for reference / re-download; it is NOT used at runtime.
 */

export const BRAND = {
  name: "REALITECH",
  domain: "realitech.dev",
  contact: "partner@realitech.dev",
  // The clip used as the dark, muted hero backdrop.
  heroSlug: "mixed-reality-from-augmented-floorplan-to-virtual-walkthrough-1080p",
  // The in-house engine — our moat.
  engineSlug: "realitecheditor",
};

export const ENGINE = {
  slug: "realitecheditor",
  driveId: "1H-GcGsNVKWjFGx4dAAx9YxeSvqaZz9-l",
  title: "RealitechEditor",
  kicker: "Core Technology",
  line: "Our in-house spatial authoring engine. Every experience in this showcase is built here — by us, not outsourced.",
};

export const CATEGORIES = [
  {
    id: "digital-twin",
    index: "01",
    title: "Digital Twin & Smart City",
    blurb:
      "Living 3D replicas of buildings, infrastructure and entire provinces — sensor-linked, queryable, operational.",
    items: [
      {
        slug: "digital-twin-smart-building",
        driveId: "16fKs0IobjIT3gQFQswNgXu1ZhM_HiR8x",
        title: "Smart Building Twin",
        tag: "BMS / IoT",
        line: "A live, sensor-linked 3D twin of an entire building — floors, assets and systems on one canvas.",
      },
      {
        slug: "newupdatemetrotwin",
        driveId: "1jMwaRlN99Eq2t4iW8tlIbgcM71hRiAG-",
        title: "Metro City Twin",
        tag: "Urban scale",
        line: "City-scale metro twin for planning, simulation and live operations monitoring.",
      },
      {
        slug: "camaudigitalmap",
        driveId: "1XzlVeJl9iEvaN1HQ3ccxIXDDY0sgNw2M",
        title: "Cà Mau Digital Map",
        tag: "Geospatial",
        line: "A province-wide digital map — geospatial data made walkable and explorable.",
      },
      {
        slug: "property-management",
        driveId: "1FrZtv_0922NrDLHuzaKI9b3lc5BYwPm2",
        title: "Spatial Property Management",
        tag: "Operations",
        line: "Manage a property portfolio in context — occupancy, assets and maintenance, spatially.",
      },
      {
        slug: "vps-apply-for-shopping-mall",
        driveId: "1Ctk9PiwJoieP7vdESJidh5Z6nwU7WaQb",
        title: "Visual Positioning System",
        tag: "VPS",
        line: "Centimeter-accurate VPS anchoring digital content to real, GPS-denied indoor space.",
      },
    ],
  },
  {
    id: "vr-training",
    index: "02",
    title: "VR Training & Simulation",
    blurb:
      "Standardized, repeatable, fully-instrumented training for high-risk and high-cost procedures — zero real-world consequence.",
    items: [
      {
        slug: "vr-training-lab-room",
        driveId: "1-t426pDb68aAhjDU9jwQkmL5FZ7g5l4n",
        title: "Lab Procedure Simulation",
        tag: "Hazard-free",
        line: "High-risk laboratory procedures rehearsed safely in a photoreal VR environment.",
      },
      {
        slug: "vr-training",
        driveId: "1AsN56Vs7waMbQjQTC4pmjC3A4Dyg_3K9",
        title: "Enterprise VR Training",
        tag: "Scalable",
        line: "Standardized, repeatable workforce training — no real-world risk, full performance telemetry.",
      },
      {
        slug: "vr-training-demo",
        driveId: "1GAnzKAEqx0ZXcY-ejByubbMm8_EVd9hV",
        title: "Guided Competency Drill",
        tag: "Scored",
        line: "Hands-on competency drills with guided steps and objective scoring.",
      },
      {
        slug: "decorate-room-in-vr",
        driveId: "1bYbDPF8PaphHrBnUiTCkbCHaEi5lNNrj",
        title: "VR Interior Staging",
        tag: "Configure",
        line: "Stage and configure full interiors in VR before a single item is procured.",
      },
    ],
  },
  {
    id: "ar-commerce",
    index: "03",
    title: "AR Commerce & Configuration",
    blurb:
      "True-scale, real-time product experiences — configure, try on, and place anything, with or without an app.",
    items: [
      {
        slug: "ar-configurator",
        driveId: "1qcLMkbtrPZSZcE6pazREgdQ3hukoRxMG",
        title: "AR Product Configurator",
        tag: "Real-time",
        line: "Configure every product variant in AR — materialized at true scale in the room.",
      },
      {
        slug: "webar-home-shopping",
        driveId: "1Z3VfRhoUKqPEnnwBYcWCc7zy3los0y9g",
        title: "WebAR Home Shopping",
        tag: "No app",
        line: "No-download WebAR — place true-scale products at home straight from the browser.",
      },
      {
        slug: "ar-try-on-jewelry-store",
        driveId: "1MMFo51r1PUkZdo_3ak7Wyn1WG89srSyu",
        title: "Virtual Jewelry Try-On",
        tag: "Retail",
        line: "Real-time virtual try-on for jewelry — precise fit, finish and sparkle.",
      },
      {
        slug: "car-configuration-and-voice-control-in-ar",
        driveId: "1kw3dtvfdQTPSosxQIWWbWi8kAJH3pN40",
        title: "Voice-Controlled Car Configurator",
        tag: "Voice + AR",
        line: "Spec a vehicle hands-free — a voice-driven AR configurator.",
      },
      {
        slug: "3d-house-model-with-augmented-reality-overlay-on-real-object-1080p",
        driveId: "1SFfA8hhgPg_mn3uGuPbf6LOCzKT7zQ5q",
        title: "AR Architectural Overlay",
        tag: "Real estate",
        line: "Bind a full 3D house model to a physical reference object in AR.",
      },
      {
        slug: "ar-scan-object-3d",
        driveId: "12Liv_-4_m92Yx_o9tp5KB-zvx1wM4O_S",
        title: "Object-to-3D Scanning",
        tag: "Capture",
        line: "Scan any real object into a clean, production-ready 3D asset.",
      },
      {
        slug: "3d-tracking",
        driveId: "1Gcw445KWr1cOPYDh0GgTLO8HLZ3bHWsW",
        title: "Markerless 3D Tracking",
        tag: "Engine",
        line: "Robust markerless object tracking — content stays locked to reality.",
      },
    ],
  },
  {
    id: "navigation",
    index: "04",
    title: "Spatial Navigation & Wayfinding",
    blurb:
      "Anchor turn-by-turn guidance, discovery and storytelling to the real world — indoors, outdoors, and offline.",
    items: [
      {
        slug: "ar-find-way-in-mall",
        driveId: "1obzV2ZevU9aw6ZZFyrQr70CbxvcSiJcf",
        title: "AR Mall Wayfinding",
        tag: "Indoor",
        line: "Turn-by-turn AR wayfinding that guides shoppers to any store.",
      },
      {
        slug: "ar-shopping-mall",
        driveId: "1Z7Aji8tH23LZCMjpkYbTXYWe9Qdh9I65",
        title: "AR Retail Layer",
        tag: "Discovery",
        line: "An AR layer over the mall — promotions and discovery anchored in place.",
      },
      {
        slug: "virtual-city-tour",
        driveId: "1A7aYGbJ7o4ItNEFEMaTukDzaRLfYlniN",
        title: "Virtual City Tour",
        tag: "Tourism",
        line: "Immersive virtual tours that let anyone explore a city remotely.",
      },
      {
        slug: "municipal-theatre-location",
        driveId: "1-1A1E5FI6GRjgbZD1WW4bn1tvyiz_6pY",
        title: "Heritage Landmark Experience",
        tag: "Culture",
        line: "On-site heritage experiences that bring landmarks to life.",
      },
      {
        slug: "geolocation-for-travelling",
        driveId: "18i3d8pHtfT2Px9utTCCalS1bvSC2SGU2",
        title: "Geolocated Travel AR",
        tag: "Outdoor",
        line: "Geolocated AR storytelling along real travel routes.",
      },
      {
        slug: "mr-travel-offline",
        driveId: "1jSGqhQ5XdpndLexVZu_EEKiUDePAxQva",
        title: "Offline MR Travel Guide",
        tag: "Offline",
        line: "A mixed-reality travel guide that works with zero connectivity.",
      },
    ],
  },
  {
    id: "mixed-reality",
    index: "05",
    title: "Mixed Reality & Immersive",
    blurb:
      "The frontier — hand-tracked, holographic and continuous experiences that blur the line between physical and digital.",
    items: [
      {
        slug: "mixed-reality-from-augmented-floorplan-to-virtual-walkthrough-1080p",
        driveId: "1SJuDz6H2kQYysLIYZpW_AtZhDN8hI4NS",
        title: "Floorplan → Walkthrough",
        tag: "Continuous",
        line: "From AR floorplan to full virtual walkthrough — one continuous spatial story.",
      },
      {
        slug: "mr-hand-tracking",
        driveId: "1s1C_xUPjKMIN4UzLkTPkfI-wFLgUNaql",
        title: "Hand Tracking",
        tag: "Controllerless",
        line: "Controller-free hand tracking for natural, direct manipulation.",
      },
      {
        slug: "hologram",
        driveId: "1-c62tXvgfXDxmOp5ye7G9Ek1yp-CXUgZ",
        title: "Volumetric Hologram",
        tag: "Volumetric",
        line: "Holographic presentation of products and data in volumetric space.",
      },
      {
        slug: "ar-immersive-book",
        driveId: "1x7vyl243rkE_Ykr75cGK5s41JWb3uB4i",
        title: "AR Immersive Book",
        tag: "EdTech",
        line: "Print that comes alive — AR-augmented books for immersive learning.",
      },
    ],
  },
];

// Flat lookup for the lightbox / hero / engine.
export const BY_SLUG = (() => {
  const map = {};
  for (const c of CATEGORIES) for (const it of c.items) map[it.slug] = { ...it, category: c.title };
  map[ENGINE.slug] = { ...ENGINE, category: ENGINE.kicker };
  return map;
})();

// Access gate (Cloudflare Worker). Full videos are served only from here with
// a valid token. Empty `api` => gating off (local dev: full == preview).
export const GATE = {
  api: "https://gate.realitech.vn",
};

// Book Demo → public Leads API of the platform (stored in cpn.realitech.vn).
// CORS already allows the showcase origin, so the browser POSTs here directly.
export const LEADS = {
  api: "https://api.realitech.vn/leads",
  source: "showcase",
};

// Public, light preview loop + poster (committed to the repo / Pages).
export function previewSrc(slug) {
  return `previews/${slug}.mp4`;
}
export function posterSrc(slug) {
  return `previews/posters/${slug}.jpg`;
}
// Gated full video — requires an unlock token.
export function fullVideoUrl(slug, token) {
  return `${GATE.api}/v/${slug}.mp4?t=${encodeURIComponent(token)}`;
}
