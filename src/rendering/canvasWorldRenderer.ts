import { CHUNK_SIZE } from '../core/config';
import type { Construction } from '../construction/construction';
import type { TileOrientation, TileType } from '../core/tiles';

export const TILE_PIXEL_SIZE = 20;

const TILE_COLORS: Record<TileType, string> = {
  hull: '#6f87ac',
  armor: '#9ba8bb',
  reactor: '#f3a64a',
  battery: '#77d3c1',
  thruster: '#9c84ef',
  storage: '#d17c9d'
};

const THRUSTER_ORIENTATION_RADIANS: Record<TileOrientation, number> = {
  north: 0,
  east: Math.PI / 2,
  south: Math.PI,
  west: -Math.PI / 2
};

export class CanvasWorldRenderer {
  private readonly context: CanvasRenderingContext2D;

  constructor(private readonly canvas: HTMLCanvasElement) {
    const context = canvas.getContext('2d');

    if (context === null) {
      throw new Error('This browser does not provide a 2D canvas context.');
    }

    this.context = context;
  }

  render(construction: Construction): void {
    const width = this.canvas.clientWidth;
    const height = this.canvas.clientHeight;

    if (width === 0 || height === 0) {
      return;
    }

    const pixelRatio = window.devicePixelRatio || 1;
    const pixelWidth = Math.round(width * pixelRatio);
    const pixelHeight = Math.round(height * pixelRatio);

    if (this.canvas.width !== pixelWidth || this.canvas.height !== pixelHeight) {
      this.canvas.width = pixelWidth;
      this.canvas.height = pixelHeight;
    }

    this.context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    this.context.fillStyle = '#0c111a';
    this.context.fillRect(0, 0, width, height);

    const columns = Math.ceil(width / TILE_PIXEL_SIZE);
    const rows = Math.ceil(height / TILE_PIXEL_SIZE);

    for (let x = 0; x <= columns; x += 1) {
      const boundary = x % CHUNK_SIZE === 0;
      this.context.beginPath();
      this.context.strokeStyle = boundary ? '#42536c' : '#1b2635';
      this.context.lineWidth = boundary ? 1.5 : 1;
      this.context.moveTo(x * TILE_PIXEL_SIZE, 0);
      this.context.lineTo(x * TILE_PIXEL_SIZE, height);
      this.context.stroke();
    }

    for (let y = 0; y <= rows; y += 1) {
      const boundary = y % CHUNK_SIZE === 0;
      this.context.beginPath();
      this.context.strokeStyle = boundary ? '#42536c' : '#1b2635';
      this.context.lineWidth = boundary ? 1.5 : 1;
      this.context.moveTo(0, y * TILE_PIXEL_SIZE);
      this.context.lineTo(width, y * TILE_PIXEL_SIZE);
      this.context.stroke();
    }

    for (const { position, tile } of construction.getTilesInBounds({
      minX: 0,
      minY: 0,
      maxXExclusive: columns,
      maxYExclusive: rows
    })) {
      const x = position.x * TILE_PIXEL_SIZE;
      const y = position.y * TILE_PIXEL_SIZE;

      if (x < 0 || y < 0 || x >= width || y >= height) {
        continue;
      }

      this.context.fillStyle = TILE_COLORS[tile.type];
      this.context.fillRect(
        x + 2,
        y + 2,
        TILE_PIXEL_SIZE - 4,
        TILE_PIXEL_SIZE - 4
      );

      if (tile.type === 'thruster') {
        this.context.save();
        this.context.translate(
          x + TILE_PIXEL_SIZE / 2,
          y + TILE_PIXEL_SIZE / 2
        );
        this.context.rotate(
          THRUSTER_ORIENTATION_RADIANS[tile.orientation]
        );
        this.context.fillStyle = '#f5f1ff';
        this.context.beginPath();
        this.context.moveTo(0, -5);
        this.context.lineTo(4, 4);
        this.context.lineTo(0, 2);
        this.context.lineTo(-4, 4);
        this.context.closePath();
        this.context.fill();
        this.context.restore();
      }
    }
  }
}
