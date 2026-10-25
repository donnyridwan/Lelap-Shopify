#!/usr/bin/env python3
"""Build a JSON template from section presets (so templates ship with the exact Figma copy).
Usage: python3 scripts/build_template.py templates/index.json hero social-proof ...
"""
import json, re, sys, os
root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

def schema(name):
    src = open(os.path.join(root, 'sections', name + '.liquid')).read()
    m = re.search(r'{%-?\s*schema\s*-?%}(.*?){%-?\s*endschema\s*-?%}', src, re.S)
    return json.loads(m.group(1))

def section_from_preset(name):
    sc = schema(name)
    preset = (sc.get('presets') or [{}])[0]
    sec = {'type': name}
    settings = {s['id']: s['default'] for s in sc.get('settings', []) if 'id' in s and 'default' in s}
    settings.update(preset.get('settings', {}))
    if settings: sec['settings'] = settings
    blocks = preset.get('blocks', [])
    if blocks:
        sec['blocks'] = {}; order = []
        btypes = {b['type']: b for b in sc.get('blocks', [])}
        for i, b in enumerate(blocks, 1):
            bid = f"{b['type'].replace('_','-')}-{i}"
            bs = {s['id']: s['default'] for s in btypes.get(b['type'], {}).get('settings', []) if 'id' in s and 'default' in s}
            bs.update(b.get('settings', {}))
            sec['blocks'][bid] = {'type': b['type'], 'settings': bs}
            order.append(bid)
        sec['block_order'] = order
    return sec

out, names = sys.argv[1], sys.argv[2:]
tpl = {'sections': {}, 'order': []}
for n in names:
    key = n.replace('-', '_')
    tpl['sections'][key] = section_from_preset(n)
    tpl['order'].append(key)
with open(os.path.join(root, out), 'w') as f:
    json.dump(tpl, f, indent=2, ensure_ascii=False)
print('wrote', out, len(names), 'sections')
