import { Plugin, PluginContext } from 'dtsgenerator';
import ts from 'typescript';

interface Replacer {
    from: (string | boolean)[];
    to: string[];
}

type Config = {
    map: Replacer[];
};

// eslint-disable-next-line @typescript-eslint/no-var-requires
const packageJson = require('./package.json');

const replaceNamespace: Plugin = {
    meta: {
        name: packageJson.name,
        version: packageJson.version,
        description: packageJson.description,
    },
    postProcess,
};

type MappingResult = string | string[] | undefined;

interface Mapping<K> {
    key: K;
    value: MappingResult;
    children: Mapping<K>[];
}

async function postProcess(
    pluginContext: PluginContext
): Promise<ts.TransformerFactory<ts.SourceFile> | undefined> {
    const config = pluginContext.option as Config;
    if (!checkConfig(config)) {
        return undefined;
    }
    const mapping = loadConfig(config);
    return (context: ts.TransformationContext) => (
        root: ts.SourceFile
    ): ts.SourceFile => {
        const [inter, converted] = replaceNamespaceDeclaration(
            context,
            mapping,
            root
        );
        const result = replaceTypeReference(context, converted, inter);
        return checkRootLevelModifiers(result);
    };
}

function checkConfig(config: Config): boolean {
    if (config == null || !('map' in config) || !Array.isArray(config.map)) {
        console.error('Error: configuration is invalid.', config);
        return false;
    }
    return true;
}

function loadConfig(config: Config): Mapping<string | boolean>[] {
    const result: Mapping<string | boolean>[] = [];
    function getValue(c: Replacer, level: number): MappingResult {
        if (c.to.length <= c.from.length) {
            return c.to[level];
        } else {
            const diff = c.to.length - c.from.length;
            if (level === 0) {
                return c.to.slice(0, diff + 1);
            } else {
                return c.to[level - diff];
            }
        }
    }
    for (const c of config.map) {
        let local = result;
        c.from.forEach((key, level) => {
            const value = getValue(c, level);
            let map = local.find((m) => m.key === key);
            if (map == null) {
                map = {
                    key,
                    value,
                    children: [],
                };
                local.push(map);
            } else if (map.value !== value) {
                throw new Error(
                    'Invalid configuration: must have the same value for the same key.'
                );
            }
            local = map.children;
        });
    }
    return result;
}

function getMapping<T extends string | boolean>(
    mapping: Mapping<T>[],
    path: string[]
): Mapping<T>[] {
    let result = mapping;
    for (const p of path) {
        let work: Mapping<T>[] = [];
        result
            .filter((map) => map.key === true || map.key === p)
            .forEach((map) => {
                work = work.concat(map.children);
            });
        result = work;
    }
    return result;
}

function getConvertedChild(
    converted: Mapping<string> | undefined,
    key: string
): Mapping<string> | undefined {
    if (converted == null) {
        return undefined;
    }
    return converted.children.find((c) => c.key === key);
}
function setConverted(
    converted: Mapping<string>,
    path: string[],
    key: string,
    value: MappingResult
): void {
    let local = converted;
    path.forEach((key) => {
        let work = getConvertedChild(local, key);
        if (work == null) {
            work = {
                key,
                value: key,
                children: [],
            };
            local.children.push(work);
        }
        local = work;
    });
    const work = getConvertedChild(local, key);
    if (work == null) {
        local.children.push({
            key,
            value,
            children: [],
        });
    } else {
        work.value = value;
    }
}
function convertNames(names: string[], converted: Mapping<string>): string[] {
    let result: string[] = [];
    let local: Mapping<string> | undefined = converted;
    for (const name of names) {
        const work = getConvertedChild(local, name);
        if (work == null) {
            result.push(name);
        } else {
            const value = work.value;
            if (Array.isArray(value)) {
                result = result.concat(value);
            } else if (value != null) {
                result.push(value);
            }
        }
        local = work;
    }
    return result;
}

function replaceNamespaceDeclaration(
    context: ts.TransformationContext,
    mapping: Mapping<string | boolean>[],
    root: ts.SourceFile
): [ts.SourceFile, Mapping<string>] {
    let path: string[] = [];
    const converted: Mapping<string> = {
        key: '',
        value: '',
        children: [],
    };

    function replaceModuleName(
        statements: ReadonlyArray<ts.Statement>
    ): ts.NodeArray<ts.Statement> {
        const maps = getMapping(mapping, path);
        const result: ts.Statement[] = [];
        for (const state of statements) {
            if (ts.isModuleDeclaration(state)) {
                let dec = state;
                const name = dec.name;
                const map = maps.filter(
                    (m) => m.key === true || m.key === name.text
                );
                if (map.length === 0) {
                    result.push(dec);
                }
                for (const m of map) {
                    const value = m.value;
                    setConverted(converted, path, name.text, value);
                    if (value == null) {
                        if (dec.body != null && ts.isModuleBlock(dec.body)) {
                            dec.body.statements.forEach((s) => result.push(s));
                        }
                    } else if (Array.isArray(value)) {
                        setName(dec, value[0]);
                        result.push(state);
                        for (let i = 1; i < value.length; i++) {
                            dec = addChildModuleDeclaration(dec, value[i]);
                        }
                    } else {
                        setName(dec, value);
                        result.push(dec);
                    }
                }
            } else {
                result.push(state);
            }
        }
        return ts.createNodeArray(result);
    }
    function visit(node: ts.Node): ts.VisitResult<ts.Node> {
        if (ts.isModuleDeclaration(node)) {
            const prev = path.concat();
            path.push(node.name.text);
            node = ts.visitEachChild(node, visit, context);
            path = prev;
        } else {
            node = ts.visitEachChild(node, visit, context);
        }
        if (!ts.isSourceFile(node) && !ts.isModuleBlock(node)) {
            return node;
        }

        node.statements = replaceModuleName(node.statements);
        return node;
    }
    const inter = ts.visitNode(root, visit);
    return [inter, converted];
}

function setName(node: ts.ModuleDeclaration, name: string): void {
    node.name = ts.createIdentifier(name);
}
function addChildModuleDeclaration(
    parent: ts.ModuleDeclaration,
    name: string
): ts.ModuleDeclaration {
    const newModule = ts.createModuleDeclaration(
        undefined,
        undefined,
        ts.createIdentifier(name),
        parent.body,
        parent.flags
    );
    parent.body = ts.createModuleBlock([newModule]);
    return newModule;
}

function replaceTypeReference(
    context: ts.TransformationContext,
    mapping: Mapping<string>,
    root: ts.SourceFile
): ts.SourceFile {
    function visit(node: ts.Node): ts.VisitResult<ts.Node> {
        node = ts.visitEachChild(node, visit, context);
        if (!ts.isTypeReferenceNode(node)) {
            return node;
        }

        const name = node.typeName;
        const names = flattenEntityName(name);
        const converted = convertNames(names, mapping);
        node.typeName = packEntityName(converted);

        return node;
    }
    return ts.visitNode(root, visit);
}

function flattenEntityName(name: ts.EntityName): string[] {
    const result: string[] = [];
    function visit(node: ts.Node): void {
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
function packEntityName(names: string[]): ts.EntityName {
    let result: ts.EntityName = ts.createIdentifier(names[0]);
    for (let i = 1; i < names.length; i++) {
        result = ts.createQualifiedName(result, ts.createIdentifier(names[i]));
    }
    return result;
}

function checkRootLevelModifiers(root: ts.SourceFile): ts.SourceFile {
    function replaceModifiers(
        modifiers?: ts.ModifiersArray
    ): ts.ModifiersArray {
        const result: ts.Modifier[] = [];
        let found = false;
        if (modifiers != null) {
            for (const m of modifiers) {
                if (m.kind === ts.SyntaxKind.ExportKeyword) {
                    continue;
                }
                if (m.kind === ts.SyntaxKind.DeclareKeyword) {
                    found = true;
                }
                result.push(m);
            }
        }
        if (!found) {
            result.push(ts.createModifier(ts.SyntaxKind.DeclareKeyword));
        }
        return ts.createNodeArray(result);
    }
    for (const state of root.statements) {
        state.modifiers = replaceModifiers(state.modifiers);
    }
    return root;
}

export default replaceNamespace;
