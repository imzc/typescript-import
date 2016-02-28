'use strict';
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { relative,extname,dirname } from './common/paths';



// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "typescript-runtime-type-system" is now active!');

	let importRelative = vscode.commands.registerCommand('tsimport.addImport.relative', () => {
		showImportInput(false);
	});
	let importAbsolute = vscode.commands.registerCommand('tsimport.addImport.absolute', () => {
		showImportInput(true);
	});

	context.subscriptions.push(importRelative);
	context.subscriptions.push(importAbsolute);
}

// this method is called when your extension is deactivated
export function deactivate() {
}

function showImportInput(isAMDStyle:boolean):Thenable<void> {
    var editor = vscode.window.activeTextEditor;
    var doc = editor.document;
    var selection = editor.selection;
    var line = doc.lineAt(selection.start.line);
    
    // Find "im classToImport"
    var inputRegex = /\w+/;
    var importTemplate = inputRegex.exec(line.text);
    if(!importTemplate)
        return Promise.resolve();
    
    var startIndex = importTemplate.index;
    var endIndex = startIndex + importTemplate[0].length;
    var query = importTemplate[0];
    var workingFileDir = dirname(vscode.window.activeTextEditor.document.fileName);
    var workspace = vscode.workspace.rootPath;
    
    
    return getSymbolInformations(isAMDStyle, query).then(quickItems=>{
        return vscode.window.showQuickPick(quickItems);
    })
    .then(selected=>{
        var info:vscode.SymbolInformation = selected.symbol;
        var name = selected.symbol.name;
        var targetPath = info.location.uri.fsPath;
        var hostPath = isAMDStyle ? workspace : workingFileDir;
        var path = relative(hostPath,targetPath);
        var ext = extname(path);
        if(ext) {
            path = path.substr(0,path.length - ext.length);
        }
        if(!isAMDStyle && path.indexOf(".")!=0){
            path = "./" + path;
        }
        
        if(isAMDStyle){
            var config = vscode.workspace.getConfiguration("tsimport");
            var ignoreSrc = config.get<boolean>("ignoreSrcFolder",true);
            var root = config.get<string>("root",null);
            if(!/\/$/.test(root)){
                root += "/";
            }
            
            if(root && path.indexOf(root)==0){
                path = path.replace(root,"");
            }
            else if(ignoreSrc && path.indexOf("src")==0){
                path = path.replace("src/","");
            }
        }
        
        vscode.window.activeTextEditor.edit(edit=>{
            var importCode = `import { ${name} } from "${path}"`;
            var replaceRange = new vscode.Range(line.lineNumber,startIndex,line.lineNumber,endIndex);
            edit.replace(replaceRange,importCode);
            var selectionEnd = startIndex + importCode.length;
            setTimeout(()=>{
                editor.selection = new vscode.Selection(line.lineNumber,selectionEnd,line.lineNumber,selectionEnd);
            },0);
        });
    });
    
    
    
}


function getSymbolInformations(isAMD:boolean,query:string):Thenable<ImportQuickOpenItem[]> {
    // Display a message box to the user
    var task = vscode.commands.executeCommand<vscode.SymbolInformation[]>("vscode.executeWorkspaceSymbolProvider",query);
    
    var workspace = vscode.workspace.rootPath;
    return task.then(infos=>{
        
        var items :ImportQuickOpenItem[] = [];
        
        
        
        infos.forEach(info=>{
            var fsPath = info.location.uri.fsPath;
            if(fsPath.indexOf(workspace) < 0)
                return;
            var relativePath = relative(workspace,fsPath);
            var quickOpenItem:ImportQuickOpenItem = {
                label: info.name + ":" +SymbolKindToString(info.kind),
                description:relativePath,
                symbol:info
            }
            items.push(quickOpenItem);
        });
        
        return items;
    })
    
    
}

interface ImportQuickOpenItem extends vscode.QuickPickItem {
    symbol: vscode.SymbolInformation;
}


const SymbolKindMap = {};
SymbolKindMap[vscode.SymbolKind.Array] = "Array";
SymbolKindMap[vscode.SymbolKind.Boolean] = "Boolean";
SymbolKindMap[vscode.SymbolKind.Class] = "Class";
SymbolKindMap[vscode.SymbolKind.Constant] = "Constant";
SymbolKindMap[vscode.SymbolKind.Constructor] = "Constructor";
SymbolKindMap[vscode.SymbolKind.Enum] = "Enum";
SymbolKindMap[vscode.SymbolKind.Field] = "Field";
SymbolKindMap[vscode.SymbolKind.File] = "File";
SymbolKindMap[vscode.SymbolKind.Function] = "Function";
SymbolKindMap[vscode.SymbolKind.Interface] = "Interface";
SymbolKindMap[vscode.SymbolKind.Method] = "Method";
SymbolKindMap[vscode.SymbolKind.Module] = "Module";
SymbolKindMap[vscode.SymbolKind.Namespace] = "Namespace";
SymbolKindMap[vscode.SymbolKind.Number] = "Number";
SymbolKindMap[vscode.SymbolKind.Package] = "Package";
SymbolKindMap[vscode.SymbolKind.Property] = "Property";
SymbolKindMap[vscode.SymbolKind.String] = "String";
SymbolKindMap[vscode.SymbolKind.Variable] = "Variable";
    
function SymbolKindToString(kind:vscode.SymbolKind) {
    return SymbolKindMap[kind];
}