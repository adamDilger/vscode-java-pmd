//
// Note: This example test is leveraging the Mocha test framework.
// Please refer to their documentation on https://mochajs.org/ for help.
//

// The module 'assert' provides assertion methods from node
import * as assert from 'assert';

// You can import and use all API from the 'vscode' module
// as well as import your extension to test it
import * as vscode from 'vscode';
import * as path from 'path';
import { JavaPmd } from '../../src/extension';
import { Config } from '../../src/lib/config';

const PMD_PATH = path.join(__dirname, '..', '..', '..', 'bin', 'pmd');
const RULESET_PATH = path.join(__dirname, '..', '..', '..', 'rulesets', 'quickstart.xml');
const INVALID_RULESET_PATH = path.join(__dirname, '..', '..', '..', 'rulesets', 'java_ruleset_invalid.xml');
const TEST_JAVA_PATH = path.join(__dirname, '..', '..', '..', 'test', 'assets', 'test.java');

suite('Extension Tests', () => {
  test('check default paths', () => {
    const outputChannel = vscode.window.createOutputChannel('Java PMD');

    const config = new Config();
    config.pmdBinPath = PMD_PATH;
    config.rulesets = [RULESET_PATH, INVALID_RULESET_PATH];
    config.priorityErrorThreshold = 3;
    config.priorityWarnThreshold = 1;
    config.showErrors = false;
    config.showStdOut = false;
    config.showStdErr = false;
    config.additionalClassPaths = [];

    const pmd = new JavaPmd(outputChannel, config);

    assert.strictEqual(pmd.checkPmdPath(), true);
    assert.strictEqual(pmd.getRulesets()[0], RULESET_PATH);
    assert.strictEqual(pmd.getRulesets().length, 1);
    assert.strictEqual(pmd.hasAtLeastOneValidRuleset(), true);
  });

  // Defines a Mocha unit test
  test('test diagnostic warning', function (done) {
    this.timeout(100000);

    const collection = vscode.languages.createDiagnosticCollection('java-pmd-test');
    const outputChannel = vscode.window.createOutputChannel('Java PMD');

    const config = new Config();
    config.pmdBinPath = PMD_PATH;
    config.rulesets = [RULESET_PATH];
    config.priorityErrorThreshold = 3;
    config.priorityWarnThreshold = 1;
    config.showErrors = false;
    config.showStdOut = false;
    config.showStdErr = false;
    config.workspaceRootPath = '';
    config.additionalClassPaths = [];
    config.commandBufferSize = 64000000;

    const pmd = new JavaPmd(outputChannel, config);

    const testJavaUri = vscode.Uri.file(TEST_JAVA_PATH);
    pmd
      .run(TEST_JAVA_PATH, collection)
      .then(() => {
        const errs = collection.get(testJavaUri);
        assert.equal(errs.length, 1);
        done();
      })
      .catch((e) => {
        assert.fail(e);
        done();
      });
  });
});
