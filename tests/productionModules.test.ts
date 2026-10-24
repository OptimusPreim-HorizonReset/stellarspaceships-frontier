import { describe, expect, it } from 'vitest';
import { Construction } from '../src/construction/construction';
import { PROVISIONAL_PRODUCTION_RECIPES, RecipeRegistry } from '../src/industry/recipes';
import {
  ProductionModuleRegistry
} from '../src/industry/productionModules';
import { Station } from '../src/world/station';

function createStation(id: string, type: Station['type']): Station {
  const construction = new Construction(id);
  construction.placeTile({ x: 0, y: 0 }, 'hull');

  return new Station({
    id,
    type,
    construction,
    position: { x: 0, y: 0 },
    rotation: 0,
    ownerId: null
  });
}

describe('production modules', () => {
  it('maps factory modules to supported recipes and executes them on station inventory', () => {
    const factory = createStation('factory-1', 'factory');
    factory.inventory.collect({
      id: 'ore-drop',
      asteroidId: 'asteroid-1',
      sourceTileId: 1,
      resourceType: 'ore',
      amount: 1
    });
    const registry = new ProductionModuleRegistry(
      PROVISIONAL_PRODUCTION_RECIPES
    );
    const refinery = registry.register({
      id: 'refinery-1',
      type: 'refinery',
      station: factory
    });

    expect(registry.get('refinery-1')).toBe(refinery);
    expect(registry.getAll()).toEqual([refinery]);
    expect(registry.getForStation(factory.id)).toEqual([refinery]);
    expect(refinery.execute('smelt-steel')).toMatchObject({
      status: 'crafted',
      outputs: { steel: 1 },
      durationSeconds: 5
    });
    expect(factory.inventory.getContents()).toEqual({ steel: 1 });
  });

  it('reports unsupported recipes without changing station inventory', () => {
    const factory = createStation('factory-2', 'factory');
    const registry = new ProductionModuleRegistry(
      PROVISIONAL_PRODUCTION_RECIPES
    );
    const refinery = registry.register({
      id: 'refinery-2',
      type: 'refinery',
      station: factory
    });

    expect(refinery.execute('assemble-components')).toEqual({
      status: 'unsupported-recipe',
      moduleId: 'refinery-2',
      moduleType: 'refinery',
      recipeId: 'assemble-components'
    });
    expect(factory.inventory.getContents()).toEqual({});
  });

  it('preserves the station inventory when a module lacks recipe inputs', () => {
    const factory = createStation('factory-insufficient', 'factory');
    const registry = new ProductionModuleRegistry(
      PROVISIONAL_PRODUCTION_RECIPES
    );
    const assembler = registry.register({
      id: 'assembler-insufficient',
      type: 'assembler',
      station: factory
    });

    expect(assembler.execute('assemble-components')).toEqual({
      status: 'insufficient-resources',
      recipeId: 'assemble-components',
      resourceType: 'crystal',
      requestedAmount: 1,
      availableAmount: 0
    });
    expect(factory.inventory.getContents()).toEqual({});
  });

  it('requires a factory station and a complete recipe catalog', () => {
    const registry = new ProductionModuleRegistry(
      PROVISIONAL_PRODUCTION_RECIPES
    );

    expect(() =>
      registry.register({
        id: 'refinery-mining',
        type: 'refinery',
        station: createStation('mining-1', 'mining')
      })
    ).toThrow('Production modules require a factory station.');

    const incompleteRecipes = new RecipeRegistry([
      {
        id: 'smelt-steel',
        inputs: { ore: 1 },
        outputs: { steel: 1 },
        durationSeconds: 5
      }
    ]);

    expect(() =>
      new ProductionModuleRegistry(incompleteRecipes).register({
        id: 'assembler-1',
        type: 'assembler',
        station: createStation('factory-3', 'factory')
      })
    ).toThrow('Production module assembler requires recipe assemble-components.');
  });

  it('rejects duplicate module IDs', () => {
    const registry = new ProductionModuleRegistry(
      PROVISIONAL_PRODUCTION_RECIPES
    );
    const station = createStation('factory-4', 'factory');
    const definition = {
      id: 'assembler-duplicate',
      type: 'assembler' as const,
      station
    };

    registry.register(definition);
    expect(() => registry.register(definition)).toThrow(
      'Duplicate production module ID: assembler-duplicate.'
    );
  });
});
