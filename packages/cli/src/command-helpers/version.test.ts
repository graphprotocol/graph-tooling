import { beforeEach, describe, expect, test, vi } from 'vitest';
import * as loadManifestUtils from '../migrations/util/load-manifest.js';
import * as graphTsUtil from '../migrations/util/versions.js';
import { assertGraphTsVersion, assertManifestApiVersion } from './version.js';

describe('Version Command Helpers', { concurrent: true }, () => {
  beforeEach(() => {
    vi.resetModules();
  });

  describe('assertManifestApiVersion', () => {
    const fakeManifestPath = 'fake/manifest/path';
    const minimumApiVersion = '0.0.5';

    describe('With just dataSources', () => {
      test('When all of them are less than minimum apiVersion', async () => {
        vi.spyOn(loadManifestUtils, 'loadManifest').mockImplementation(() =>
          Promise.resolve({
            dataSources: [
              { mapping: { apiVersion: '0.0.1' } },
              { mapping: { apiVersion: '0.0.2' } },
              { mapping: { apiVersion: '0.0.3' } },
            ],
          }),
        );

        await expect(assertManifestApiVersion(fakeManifestPath, minimumApiVersion)).rejects.toThrow(
          new Error(
            `The current version of graph-cli can't be used with mappings on apiVersion less than '${minimumApiVersion}'`,
          ),
        );
      });
      test('When one of them is less than minimum apiVersion', async () => {
        vi.spyOn(loadManifestUtils, 'loadManifest').mockImplementation(() =>
          Promise.resolve({
            dataSources: [
              { mapping: { apiVersion: '0.0.5' } },
              { mapping: { apiVersion: '0.0.2' } },
              { mapping: { apiVersion: '0.0.5' } },
            ],
          }),
        );

        await expect(assertManifestApiVersion(fakeManifestPath, minimumApiVersion)).rejects.toThrow(
          new Error(
            `The current version of graph-cli can't be used with mappings on apiVersion less than '${minimumApiVersion}'`,
          ),
        );
      });
      test('When none of them are less than minimum apiVersion', async () => {
        vi.spyOn(loadManifestUtils, 'loadManifest').mockImplementation(() =>
          Promise.resolve({
            dataSources: [
              { mapping: { apiVersion: '0.0.5' } },
              { mapping: { apiVersion: '0.0.6' } },
              { mapping: { apiVersion: '0.0.5' } },
            ],
          }),
        );

        await expect(assertManifestApiVersion(fakeManifestPath, minimumApiVersion)).resolves.toBe(
          undefined,
        );
      });
    });
    describe('With dataSources and templates', () => {
      describe('And the dataSources have a lower apiVersion', () => {
        test('When all of the templates are less than minimum apiVersion', async () => {
          vi.spyOn(loadManifestUtils, 'loadManifest').mockImplementation(() =>
            Promise.resolve({
              dataSources: [
                { mapping: { apiVersion: '0.0.5' } },
                { mapping: { apiVersion: '0.0.5' } },
                { mapping: { apiVersion: '0.0.3' } },
              ],
              templates: [
                { mapping: { apiVersion: '0.0.1' } },
                { mapping: { apiVersion: '0.0.2' } },
                { mapping: { apiVersion: '0.0.3' } },
              ],
            }),
          );

          await expect(
            assertManifestApiVersion(fakeManifestPath, minimumApiVersion),
          ).rejects.toThrow(
            new Error(
              `The current version of graph-cli can't be used with mappings on apiVersion less than '${minimumApiVersion}'`,
            ),
          );
        });
        test('When one of the templates is less than minimum apiVersion', async () => {
          vi.spyOn(loadManifestUtils, 'loadManifest').mockImplementation(() =>
            Promise.resolve({
              dataSources: [
                { mapping: { apiVersion: '0.0.5' } },
                { mapping: { apiVersion: '0.0.5' } },
                { mapping: { apiVersion: '0.0.3' } },
              ],
              templates: [
                { mapping: { apiVersion: '0.0.5' } },
                { mapping: { apiVersion: '0.0.2' } },
                { mapping: { apiVersion: '0.0.5' } },
              ],
            }),
          );

          await expect(
            assertManifestApiVersion(fakeManifestPath, minimumApiVersion),
          ).rejects.toThrow(
            new Error(
              `The current version of graph-cli can't be used with mappings on apiVersion less than '${minimumApiVersion}'`,
            ),
          );
        });
        test('When none of the templates are less than minimum apiVersion', async () => {
          vi.spyOn(loadManifestUtils, 'loadManifest').mockImplementation(() =>
            Promise.resolve({
              dataSources: [
                { mapping: { apiVersion: '0.0.5' } },
                { mapping: { apiVersion: '0.0.5' } },
                { mapping: { apiVersion: '0.0.3' } },
              ],
              templates: [
                { mapping: { apiVersion: '0.0.5' } },
                { mapping: { apiVersion: '0.0.6' } },
                { mapping: { apiVersion: '0.0.5' } },
              ],
            }),
          );

          await expect(
            assertManifestApiVersion(fakeManifestPath, minimumApiVersion),
          ).rejects.toThrow(
            new Error(
              `The current version of graph-cli can't be used with mappings on apiVersion less than '${minimumApiVersion}'`,
            ),
          );
        });
      });
      describe('And the dataSources do NOT have a lower apiVersion', () => {
        test('When all of the templates are less than minimum apiVersion', async () => {
          vi.spyOn(loadManifestUtils, 'loadManifest').mockImplementation(() =>
            Promise.resolve({
              dataSources: [
                { mapping: { apiVersion: '0.0.5' } },
                { mapping: { apiVersion: '0.0.5' } },
                { mapping: { apiVersion: '0.0.6' } },
              ],
              templates: [
                { mapping: { apiVersion: '0.0.1' } },
                { mapping: { apiVersion: '0.0.2' } },
                { mapping: { apiVersion: '0.0.3' } },
              ],
            }),
          );

          await expect(
            assertManifestApiVersion(fakeManifestPath, minimumApiVersion),
          ).rejects.toThrow(
            new Error(
              `The current version of graph-cli can't be used with mappings on apiVersion less than '${minimumApiVersion}'`,
            ),
          );
        });
        test('When one of the templates is less than minimum apiVersion', async () => {
          vi.spyOn(loadManifestUtils, 'loadManifest').mockImplementation(() =>
            Promise.resolve({
              dataSources: [
                { mapping: { apiVersion: '0.0.5' } },
                { mapping: { apiVersion: '0.0.5' } },
                { mapping: { apiVersion: '0.0.6' } },
              ],
              templates: [
                { mapping: { apiVersion: '0.0.5' } },
                { mapping: { apiVersion: '0.0.2' } },
                { mapping: { apiVersion: '0.0.5' } },
              ],
            }),
          );

          await expect(
            assertManifestApiVersion(fakeManifestPath, minimumApiVersion),
          ).rejects.toThrow(
            new Error(
              `The current version of graph-cli can't be used with mappings on apiVersion less than '${minimumApiVersion}'`,
            ),
          );
        });
        test('When none of the templates are less than minimum apiVersion', async () => {
          vi.spyOn(loadManifestUtils, 'loadManifest').mockImplementation(() =>
            Promise.resolve({
              dataSources: [
                { mapping: { apiVersion: '0.0.5' } },
                { mapping: { apiVersion: '0.0.5' } },
                { mapping: { apiVersion: '0.0.6' } },
              ],
              templates: [
                { mapping: { apiVersion: '0.0.5' } },
                { mapping: { apiVersion: '0.0.6' } },
                { mapping: { apiVersion: '0.0.5' } },
              ],
            }),
          );

          await expect(assertManifestApiVersion(fakeManifestPath, minimumApiVersion)).resolves.toBe(
            undefined,
          );
        });
      });
    });
  });
  describe('assertGraphTsVersion', () => {
    const fakeNodeModulesDir = 'fake/path/to/node/modules';
    const minimumGraphTsVersion = '0.22.0';

    test("When the installed graph-ts version is less than what's supported", async () => {
      vi.spyOn(graphTsUtil, 'getGraphTsVersion').mockImplementation(() =>
        Promise.resolve('0.19.0'),
      );

      await expect(assertGraphTsVersion(fakeNodeModulesDir, minimumGraphTsVersion)).rejects.toThrow(
        new Error(
          `To use this version of the graph-cli you must upgrade the graph-ts dependency to a version greater than or equal to ${minimumGraphTsVersion}
Also, you'll probably need to take a look at our AssemblyScript migration guide because of language breaking changes: https://thegraph.com/docs/en/resources/migration-guides/assemblyscript-migration-guide/`,
        ),
      );
    });
    test('When the installed graph-ts version is a supported one', async () => {
      vi.spyOn(graphTsUtil, 'getGraphTsVersion').mockImplementation(() =>
        Promise.resolve('0.22.0'),
      );

      await expect(assertGraphTsVersion(fakeNodeModulesDir, minimumGraphTsVersion)).resolves.toBe(
        undefined,
      );
    });
  });
});
