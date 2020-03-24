import fs from 'fs';
import path from 'path';
import ts from 'typescript';
import { PluginContext } from 'dtsgenerator';
import plugin from '..';

import assert = require('assert');

const fixturesDir = path.join(__dirname, 'snapshots');
const inputFileName = 'input.d.ts';
const configFileName = 'config.json';
const expectedFileName = 'expected.d.ts';

describe('Snapshot testing', () => {
    fs.readdirSync(fixturesDir).map((caseName) => {
        const normalizedTestName = caseName.replace(/-/g, ' ');
        it(`Test ${normalizedTestName}`, async function () {
            const fixtureDir = path.join(fixturesDir, caseName);
            const inputFilePath = path.join(fixtureDir, inputFileName);
            const configFilePath = path.join(fixtureDir, configFileName);
            const expectedFilePath = path.join(fixtureDir, expectedFileName);

            const inputContent = fs.readFileSync(inputFilePath, {
                encoding: 'utf-8',
            });
            const input = ts.createSourceFile(
                '',
                inputContent,
                ts.ScriptTarget.Latest
            );
            const option = fs.existsSync(configFilePath)
                ? require(configFilePath)
                : {};

            const context = { option } as PluginContext;
            const p = plugin.postProcess;
            if (p == null) {
                assert.fail('post process plugin is not configured.');
                return;
            }
            const factory = await p(context);
            if (factory == null) {
                assert.fail('factory is not returned.');
                return;
            }

            const result = ts.transform(input, [factory]);
            result.dispose();
            const printer = ts.createPrinter();
            const actual = printer.printFile(input);

            // When we do `UPDATE_SNAPSHOT=1 npm test`, update snapshot data.
            if (process.env.UPDATE_SNAPSHOT) {
                fs.writeFileSync(expectedFilePath, actual);
                this.skip();
                return;
            }
            const expected = fs.readFileSync(expectedFilePath, {
                encoding: 'utf-8',
            });
            assert.equal(
                actual,
                expected,
                `
${fixtureDir}
${actual}
`
            );
        });
    });
});
