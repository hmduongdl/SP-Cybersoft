import os
import re

def process_file(filepath):
    with open(filepath, 'r') as f:
        content = f.read()

    orig_content = content

    content = re.sub(r'rounded-lg-xl', 'rounded-xl', content)
    content = re.sub(r'rounded-lg-2xl', 'rounded-2xl', content)
    content = re.sub(r'rounded-lg-3xl', 'rounded-3xl', content)
    content = re.sub(r'rounded-lg-lg', 'rounded-lg', content)
    content = re.sub(r'rounded-lg-md', 'rounded-md', content)
    content = re.sub(r'rounded-lg-sm', 'rounded-sm', content)
    content = re.sub(r'rounded-lg-full', 'rounded-full', content)
    content = re.sub(r'rounded-lg-\[', 'rounded-[', content)
    content = re.sub(r'rounded-lg-none', 'rounded-none', content)
    content = re.sub(r'rounded-lg-(t|r|b|l|tl|tr|bl|br)-', r'rounded-\1-', content)

    # Any lingering `rounded-lg-` ?
    # Let's just fix anything that is `rounded-lg-(something)` back to `rounded-(something)` EXCEPT when it's just `rounded-lg`
    # Wait, `rounded-lg` is valid, but `rounded-lg-something` means it was `rounded-something` before.
    # regex: `rounded-lg-([a-zA-Z0-9\[\]]+)` -> `rounded-\1`
    content = re.sub(r'rounded-lg-([a-zA-Z0-9\[\]]+)', r'rounded-\1', content)

    # Re-apply \brounded\b fix but safely: 
    # To replace exact "rounded" class without hyphens after it: `(?<!\S)rounded(?!\S|-)`
    # This means "rounded" preceded by whitespace/start and followed by whitespace/end/quote, but not `-`.
    # Let's fix remaining naked "rounded" that might have been skipped or we can leave them. 
    # Actually wait, `rounded-lg` replaced `rounded`, so the naked `rounded` are ALREADY `rounded-lg`. 

    if content != orig_content:
        with open(filepath, 'w') as f:
            f.write(content)
        print(f"Fixed {filepath}")

for root, dirs, files in os.walk('/mnt/Work/Teamwork-Check/src'):
    for file in files:
        if file.endswith('.tsx') or file.endswith('.ts'):
            process_file(os.path.join(root, file))

