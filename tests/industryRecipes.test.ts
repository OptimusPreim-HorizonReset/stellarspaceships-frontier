import { describe, expect, it } from 'vitest';
import { ResourceInventory } from '../src/mining/resourceLoot';
import {
  createRecipe,
  executeRecipe,
  PROVISIONAL_PRODUCTION_RECIPES,
  RecipeRegistry
} from '../src/industry/recipes';

describe('industry recipe system', () => {
  it('executes the provisional ore-to-ship-parts production chain', () => {
    const inventory = ResourceInventory.fromSnapshot({
      contents: { ore: 3, crystal: 1 },
      collectedDropIds: []
    });

    expect(executeRecipe(PROVISIONAL_PRODUCTION_RECIPES, inventory, 'smelt-steel'))
      .toMatchObject({ status: 'crafted', outputs: { steel: 1 } });
    expect(executeRecipe(PROVISIONAL_PRODUCTION_RECIPES, inventory, 'smelt-steel'))
      .toMatchObject({ status: 'crafted', outputs: { steel: 1 } });
    expect(executeRecipe(PROVISIONAL_PRODUCTION_RECIPES, inventory, 'smelt-steel'))
      .toMatchObject({ status: 'crafted', outputs: { steel: 1 } });
    expect(
      executeRecipe(
        PROVISIONAL_PRODUCTION_RECIPES,
        inventory,
        'assemble-components'
      )
    ).toMatchObject({ status: 'crafted', outputs: { components: 1 } });
    expect(
      executeRecipe(
        PROVISIONAL_PRODUCTION_RECIPES,
        inventory,
        'assemble-ship-parts'
      )
    ).toMatchObject({ status: 'crafted', outputs: { shipParts: 1 } });
    expect(inventory.getContents()).toEqual({ shipParts: 1 });
  });

  it('does not change inventory when a recipe lacks an input resource', () => {
    const inventory = ResourceInventory.fromSnapshot({
      contents: { steel: 2 },
      collectedDropIds: []
    });

    expect(
      executeRecipe(
        PROVISIONAL_PRODUCTION_RECIPES,
        inventory,
        'assemble-components'
      )
    ).toEqual({
      status: 'insufficient-resources',
      recipeId: 'assemble-components',
      resourceType: 'crystal',
      requestedAmount: 1,
      availableAmount: 0
    });
    expect(inventory.getContents()).toEqual({ steel: 2 });
  });

  it('rejects invalid recipes, duplicate IDs, and unknown recipe requests', () => {
    expect(() =>
      createRecipe({
        id: 'invalid',
        inputs: { ore: 0 },
        outputs: { steel: 1 },
        durationSeconds: 1
      })
    ).toThrow('Recipe inputs amount for ore must be finite and positive.');
    expect(
      () =>
        new RecipeRegistry([
          {
            id: 'duplicate',
            inputs: { ore: 1 },
            outputs: { steel: 1 },
            durationSeconds: 1
          },
          {
            id: 'duplicate',
            inputs: { ore: 2 },
            outputs: { steel: 1 },
            durationSeconds: 1
          }
        ])
    ).toThrow('Duplicate recipe ID: duplicate.');
    expect(() =>
      executeRecipe(PROVISIONAL_PRODUCTION_RECIPES, new ResourceInventory(), 'missing')
    ).toThrow('Unknown recipe ID: missing.');
  });

  it('keeps inventory unchanged if a production output would overflow', () => {
    const inventory = ResourceInventory.fromSnapshot({
      contents: { ore: 1, steel: Number.MAX_VALUE },
      collectedDropIds: []
    });
    const registry = new RecipeRegistry([
      {
        id: 'overflow',
        inputs: { ore: 1 },
        outputs: { steel: Number.MAX_VALUE },
        durationSeconds: 1
      }
    ]);

    expect(() => executeRecipe(registry, inventory, 'overflow')).toThrow(
      'Inventory transaction amount overflow for resource steel.'
    );
    expect(inventory.getContents()).toEqual({
      ore: 1,
      steel: Number.MAX_VALUE
    });
  });
});
