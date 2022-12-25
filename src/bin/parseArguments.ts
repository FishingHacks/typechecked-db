export default function parse(args: string[]) {
    const objs: Record<string, string> = {};
    const add: string[] = [];
    const flags: string[] = [];

    let name: string = '';

    for (const a of args) {
        if (name && a.startsWith('--')) {
            flags.push(name.substring(2));
            name = a;
        } else if (!name && a.startsWith('--')) name = a;
        else if (name) {
            if (objs[name.substring(2)] !== undefined)
                throw new Error('Value for ' + name.substring(2) + ' already defined!');
            objs[name.substring(2)] = a;
            name = '';
        } else add.push(a);
    }
    if (name) flags.push(name);
    
    return {objs, add, flags};
}
