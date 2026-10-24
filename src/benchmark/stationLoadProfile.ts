import { Construction } from '../construction/construction';
import { Station, STATION_TYPES } from '../world/station';

export const SF_192_PROFILE = Object.freeze({
  stationCount: 10,
  tilesPerStation: 10_000,
  columns: 100,
  rows: 100,
  reactorsPerStation: 4,
  targetFps: 60,
  warmupFrames: 30,
  measuredFrames: 180,
  timeoutMs: 60_000
});

export function createSF192Stations(): readonly Station[] {
  const stations: Station[] = [];

  for (
    let stationIndex = 0;
    stationIndex < SF_192_PROFILE.stationCount;
    stationIndex += 1
  ) {
    const id = `sf-192-station-${stationIndex + 1}`;
    const construction = new Construction(id);

    for (let y = 0; y < SF_192_PROFILE.rows; y += 1) {
      for (let x = 0; x < SF_192_PROFILE.columns; x += 1) {
        construction.placeTile({ x, y }, 'hull');
      }
    }

    for (const position of [
      { x: 0, y: 0 },
      { x: 32, y: 0 },
      { x: 0, y: 32 },
      { x: 32, y: 32 }
    ]) {
      construction.placeTile(position, 'reactor');
    }

    if (construction.tileCount !== SF_192_PROFILE.tilesPerStation) {
      throw new Error(
        `SF-192 station ${id} does not contain 10,000 tiles.`
      );
    }

    const type = STATION_TYPES[stationIndex % STATION_TYPES.length];

    if (type === undefined) {
      throw new Error('SF-192 station type profile is empty.');
    }

    stations.push(
      new Station({
        id,
        type,
        construction,
        position: {
          x: (stationIndex % 5) * 120,
          y: Math.floor(stationIndex / 5) * 120
        },
        rotation: 0,
        ownerId: null
      })
    );
  }

  if (stations.length !== SF_192_PROFILE.stationCount) {
    throw new Error('SF-192 station count does not match its profile.');
  }

  return Object.freeze(stations);
}
