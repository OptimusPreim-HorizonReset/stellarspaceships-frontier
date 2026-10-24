import type { Sector, SectorPosition } from '../world/sector';

export interface SectorNeighborhoodRenderStats {
  readonly renderedSectors: number;
  readonly renderedObjects: number;
}

const SECTOR_GRID_WIDTH = 3;
const ASTEROID_COLOR = '#f3a64a';
const OTHER_OBJECT_COLOR = '#77d3c1';

export class CanvasSectorRenderer {
  private readonly context: CanvasRenderingContext2D;

  constructor(private readonly canvas: HTMLCanvasElement) {
    const context = canvas.getContext('2d');

    if (context === null) {
      throw new Error('This browser does not provide a 2D canvas context.');
    }

    this.context = context;
  }

  renderNeighborhood(
    sectors: readonly Sector[],
    center: SectorPosition
  ): SectorNeighborhoodRenderStats {
    const width = this.canvas.clientWidth;
    const height = this.canvas.clientHeight;

    if (width === 0 || height === 0) {
      return { renderedSectors: 0, renderedObjects: 0 };
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

    const cellWidth = width / SECTOR_GRID_WIDTH;
    const cellHeight = height / SECTOR_GRID_WIDTH;
    const visibleSectorKeys = new Set<string>();
    let renderedObjects = 0;

    for (const sector of sectors) {
      const column = sector.position.x - center.x + 1;
      const row = sector.position.y - center.y + 1;

      if (
        !Number.isInteger(column) ||
        !Number.isInteger(row) ||
        column < 0 ||
        column >= SECTOR_GRID_WIDTH ||
        row < 0 ||
        row >= SECTOR_GRID_WIDTH
      ) {
        throw new RangeError(
          `Sector (${sector.position.x}, ${sector.position.y}) is outside the rendered neighborhood.`
        );
      }

      const sectorKey = `${sector.position.x},${sector.position.y}`;

      if (visibleSectorKeys.has(sectorKey)) {
        throw new TypeError(`Duplicate rendered sector: ${sectorKey}.`);
      }

      visibleSectorKeys.add(sectorKey);
      const x = column * cellWidth;
      const y = row * cellHeight;
      const isCenter = sector.position.x === center.x &&
        sector.position.y === center.y;

      this.context.fillStyle = isCenter ? '#1a2d40' : '#101a27';
      this.context.fillRect(x, y, cellWidth, cellHeight);
      this.context.strokeStyle = isCenter ? '#77d3c1' : '#42536c';
      this.context.lineWidth = isCenter ? 2 : 1;
      this.context.strokeRect(x, y, cellWidth, cellHeight);
      this.context.fillStyle = '#bdc9d7';
      this.context.font = '10px sans-serif';
      this.context.textBaseline = 'top';
      this.context.fillText(sectorKey, x + 6, y + 5);

      for (const object of sector.objects) {
        const objectX = x + object.localPosition.x * cellWidth;
        const objectY = y + object.localPosition.y * cellHeight;
        this.context.beginPath();
        this.context.fillStyle =
          object.type === 'asteroid' ? ASTEROID_COLOR : OTHER_OBJECT_COLOR;
        this.context.arc(objectX, objectY, 3, 0, Math.PI * 2);
        this.context.fill();
        renderedObjects += 1;
      }
    }

    return {
      renderedSectors: visibleSectorKeys.size,
      renderedObjects
    };
  }
}
