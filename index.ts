import { Plugin, PluginContext } from 'dtsgenerator';
import ts, { SourceFile, TransformerFactory, TransformationContext, visitNode, Node } from 'typescript';

type Replacer = {
    from: string[];
    to: string[];
} | /* `to` only pattern */ string[];

type Config = Replacer[];

const replaceNamespace: Plugin = {
    meta: {
        description: 'Replace the namespace names.',
    },
    create,
};

// tslint:disable: no-console
function create(pluginContext: PluginContext): TransformerFactory<SourceFile> | undefined {
    const config = pluginContext.option as Config;
    if (config == null || !Array.isArray(config)) {
        return undefined;
    }
    console.log('created plugin!');
    return (context: TransformationContext) => (root: SourceFile): SourceFile => {
        console.log('called plugin function!');
        let level = 0;
        function visit(node: Node) {
            if (ts.isModuleDeclaration(node)) {
                const name = node.name;
                if (ts.isIdentifier(name)) {
                    // tslint:disable-next-line: no-console
                    console.log('namespace', level, name.escapedText);
                }
                level++;
                node = ts.visitEachChild(node, visit, context);
                level--;
            } else {
                node = ts.visitEachChild(node, visit, context);
            }
            if (ts.isTypeReferenceNode(node)) {
                const name = node.typeName;
                // tslint:disable-next-line: no-console
                console.log('type reference', flattenEntityName(name));
            }

            return node;
        }
        return visitNode(root, visit);
    };
}

function flattenEntityName(name: ts.EntityName): string[] {
    const result: string[] = [];
    function visit(node: ts.Node) {
        if (ts.isIdentifier(node)) {
            result.push(node.escapedText.toString());
        } else if (ts.isQualifiedName(node)) {
            visit(node.left);
            visit(node.right);
        }
    }
    visit(name);
    return result;
}

export default replaceNamespace;
