'use strict';

import * as vscode from 'vscode';
import { JavaPmd } from './lib/javaPmd';
import { Config } from './lib/config';
import { AppStatus } from './lib/appStatus';
import { debounce } from 'debounce';
import { getRootWorkspacePath } from './lib/utils';
export { JavaPmd };

const supportedLanguageCodes = ['java'];
const isSupportedLanguage = (langCode: string) => 0 <= supportedLanguageCodes.indexOf(langCode);

const appName = 'Java PMD';
const settingsNamespace = 'javaPMD';
const collection = vscode.languages.createDiagnosticCollection('java-pmd');
const outputChannel = vscode.window.createOutputChannel(appName);

export function activate(context: vscode.ExtensionContext) {
  //setup config
  const config = new Config(context);

  //setup instance vars
  const pmd = new JavaPmd(outputChannel, config);
  AppStatus.setAppName(appName);
  AppStatus.getInstance().ok();

  context.subscriptions.push(
    vscode.commands.registerCommand('java-pmd.clearProblems', () => {
      collection.clear();
    })
  );

  //setup commands
  context.subscriptions.push(
    vscode.commands.registerCommand('java-pmd.runWorkspace', () => {
      vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: 'Running Static Analysis on workspace',
          cancellable: true,
        },
        (progress, token) => {
          progress.report({ increment: 0 });
          return pmd.run(getRootWorkspacePath(), collection, progress, token);
        }
      );
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('java-pmd.runFile', (fileName: string | vscode.Uri) => {
      if (!fileName) {
        fileName = vscode.window.activeTextEditor.document.uri;
      }

      if(fileName instanceof vscode.Uri) {
        if(fileName.scheme == 'file') {
          pmd.run(fileName.fsPath, collection);
        } else {
          outputChannel.append("Not analysing " + fileName.path + ": scheme not managed.")
        }
      } else {
        pmd.run(fileName, collection);
      }
    })
  );

  //setup listeners
  if (config.runOnFileSave) {
    vscode.workspace.onDidSaveTextDocument((textDocument) => {
      if (isSupportedLanguage(textDocument.languageId)) {
        return vscode.commands.executeCommand('java-pmd.runFile', textDocument.fileName);
      }
    });
  }

  if (config.runOnFileChange) {
    vscode.workspace.onDidChangeTextDocument(
      debounce((textDocumentChangeEvent: vscode.TextDocumentChangeEvent) => {
        const textDocument = textDocumentChangeEvent.document;
        if (isSupportedLanguage(textDocument.languageId)) {
          return vscode.commands.executeCommand('java-pmd.runFile', textDocument.fileName);
        }
      }, config.onFileChangeDebounce)
    );
  }

  if (config.runOnFileOpen) {
    vscode.window.onDidChangeActiveTextEditor((editor) => {
      if (isSupportedLanguage(editor.document.languageId)) {
        return vscode.commands.executeCommand('java-pmd.runFile', editor.document.fileName, true);
      }
    });
  }

  vscode.workspace.onDidChangeConfiguration((configChange: vscode.ConfigurationChangeEvent) => {
    if (configChange.affectsConfiguration(settingsNamespace)) {
      config.init();
      return pmd.updateConfiguration(config);
    }
  });

  context.subscriptions.push(
    vscode.window.onDidChangeVisibleTextEditors((editors) => {
      const isStatusNeeded = editors.some((e) => e.document && isSupportedLanguage(e.document.languageId));
      if (isStatusNeeded) {
        AppStatus.getInstance().show();
      } else {
        AppStatus.getInstance().hide();
      }
    })
  );
}

// eslint-disable-next-line @typescript-eslint/no-empty-function
export function deactivate() {}
