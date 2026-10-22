import { Construction } from '../construction/construction';

export function createDemoConstruction(): Construction {
  const demo = new Construction('demo-ship');

  for (let y = 4; y < 11; y += 1) {
    for (let x = 9; x < 19; x += 1) {
      demo.placeTile({ x, y }, 'hull');
    }
  }

  demo.placeTile({ x: 12, y: 6 }, 'reactor');
  demo.placeTile({ x: 13, y: 6 }, 'battery');
  demo.placeTile({ x: 10, y: 7 }, 'thruster');
  demo.placeTile({ x: 16, y: 8 }, 'storage');

  return demo;
}
