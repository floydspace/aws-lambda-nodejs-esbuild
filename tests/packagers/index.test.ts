/**
 * Unit tests for packagers/index
 */

import { get } from '../../src/packagers';
import { NPM } from '../../src/packagers/npm';
import * as Utils from '../../src/utils';

const getCurrentPackager = jest.spyOn(Utils, 'getCurrentPackager');

describe('packagers factory', () => {
  it('should throw on unknown packagers', () => {
    getCurrentPackager.mockReset().mockReturnValue('unknown' as never);
    expect(() => get('.')).toThrowError(/Could not find packager 'unknown'/);
  });

  it('should return npm packager', () => {
    const npm = get('.', 'npm');
    expect(npm).toBeInstanceOf(NPM);
  });
});
