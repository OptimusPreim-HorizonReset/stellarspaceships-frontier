import { describe, expect, it } from 'vitest';
import { createDemoConstruction } from '../src/game/createDemoConstruction';
import { GateCSession } from '../src/game/gateCSession';

describe('Gate C session', () => {
  it('integrates flight, combat, mining, pickup, and versioned save/load', () => {
    const session = new GateCSession(createDemoConstruction());
    const initialY = session.playerState.position.y;

    const flight = session.stepFlight('north');

    expect(flight.thrusterForces.activeThrusterCount).toBe(1);
    expect(session.playerState.position.y).toBeLessThan(initialY);

    const enemyHitPoints = session.enemyHitPoints;
    const combat = session.fireCannon();

    expect(combat.status).toBe('hit');
    expect(session.enemyHitPoints).toBeLessThan(enemyHitPoints);

    const mining = session.fireMiningLaser();

    expect(mining.status).toBe('hit');
    expect(session.pendingResourceDropCount).toBe(1);

    const savedWithPendingLoot = session.serialize();
    const restored = GateCSession.deserialize(savedWithPendingLoot);

    expect(restored.playerConstruction.getTiles()).toEqual(
      session.playerConstruction.getTiles()
    );
    expect(restored.playerState).toEqual(session.playerState);
    expect(restored.enemyHitPoints).toBe(session.enemyHitPoints);
    expect(restored.asteroid.construction.tileCount).toBe(1);
    expect(restored.pendingResourceDropCount).toBe(1);

    expect(restored.collectResources()).toMatchObject([
      { status: 'collected', resourceType: 'ore', totalAmount: 3 }
    ]);

    const restoredAgain = GateCSession.deserialize(restored.serialize());

    expect(restoredAgain.pendingResourceDropCount).toBe(0);
    expect(restoredAgain.inventory.getAmount('ore')).toBe(3);
    expect(restoredAgain.playerState).toEqual(session.playerState);
  });

  it('resets the scenario without replacing the editable ship', () => {
    const construction = createDemoConstruction();
    const session = new GateCSession(construction);

    session.stepFlight('north');
    session.resetMission();

    expect(session.playerConstruction).toBe(construction);
    expect(session.playerState.position).toEqual({ x: 0, y: 0 });
    expect(session.enemyHitPoints).toBeGreaterThan(0);
    expect(session.asteroid.construction.tileCount).toBe(2);
    expect(session.inventory.getAmount('ore')).toBe(0);
  });
});
