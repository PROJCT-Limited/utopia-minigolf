// FILE: app/content/journey.ts
// -----------------------------------------------------------------------------
// The Journey — UTOPIA's five stations. Copy is verbatim, as provided.
// Shared between the Home page's Journey section and the map section so the
// two never drift.
// -----------------------------------------------------------------------------

export interface JourneyStation {
  number: number;
  name: string;
  description: string;
}

export const JOURNEY_STATIONS: JourneyStation[] = [
  {
    number: 1,
    name: "Trailhead",
    description: "A simple putting lane with a full loop in the middle. The start of the trail.",
  },
  {
    number: 2,
    name: "Stream",
    description:
      "The climb begins. The ground breaks into stepping pads across the water, and you cross side to side to keep your runner moving.",
  },
  {
    number: 3,
    name: "Rockfall",
    description:
      "Play onto a spinning segmented wheel. Where it lands decides what the trail gives you — extra score or a shortcut ahead.",
  },
  {
    number: 4,
    name: "The Summit",
    description: "Climb the spiral ramp to the top platform, play off the edge, and the ball rides the slide down to the hole.",
  },
  {
    number: 5,
    name: "The Descent",
    description: "Release from the top of a pegged wall. The ball bounces down through the pins into a scoring bin.",
  },
];
