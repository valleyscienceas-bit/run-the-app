import { describe, expect, it } from 'vitest';
import { FULL_CURRICULUM, UNITS } from './curriculum';

describe('curriculum integrity', () => {
  it('has unique module ids', () => {
    const ids = FULL_CURRICULUM.map(m => m.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('has unique unit ids', () => {
    const ids = UNITS.map(u => u.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('links every module to an existing unit', () => {
    const unitIds = new Set(UNITS.map(u => u.id));
    for (const module of FULL_CURRICULUM) {
      expect(unitIds.has(module.unitId), `module ${module.id} has unknown unitId ${module.unitId}`).toBe(true);
    }
  });

  it('keeps unit.modules in sync with FULL_CURRICULUM', () => {
    for (const unit of UNITS) {
      const fromCatalog = FULL_CURRICULUM.filter(m => m.unitId === unit.id).map(m => m.id).sort();
      const fromUnit = unit.modules.map(m => m.id).sort();
      expect(fromUnit, `unit ${unit.id} modules mismatch catalog`).toEqual(fromCatalog);
    }
  });

  it('gives every module a grade, title, code, and gap', () => {
    for (const module of FULL_CURRICULUM) {
      expect(module.gradeLevel).toBeTruthy();
      expect(module.title.length).toBeGreaterThan(0);
      expect(module.code.length).toBeGreaterThan(0);
      expect(module.gap.length).toBeGreaterThan(0);
    }
  });

  it('only references modules that exist when listing unit modules', () => {
    const catalogIds = new Set(FULL_CURRICULUM.map(m => m.id));
    for (const unit of UNITS) {
      for (const module of unit.modules) {
        expect(catalogIds.has(module.id)).toBe(true);
      }
    }
  });
});
