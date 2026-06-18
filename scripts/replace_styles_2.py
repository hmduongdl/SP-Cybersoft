import os
import re

def process_file(filepath):
    with open(filepath, 'r') as f:
        content = f.read()

    orig_content = content

    # Remove default font-sans entirely
    content = re.sub(r'\bfont-sans\b', '', content)
    
    # Body text, labels, inputs -> font-inter
    # Instead of injecting everywhere, since globals.css sets body to font-inter, we just ensure no other conflicting fonts exist except manrope.
    
    # Remove text-black / text-[#000]
    content = re.sub(r'\btext-black\b', 'text-on-surface', content)
    content = re.sub(r'text-\[\#000000\]', 'text-on-surface', content)
    content = re.sub(r'text-\[\#000\]', 'text-on-surface', content)
    
    # Modals / floating elements shadow
    # Heavier shadow for specific files that are modals or floating
    if "modal" in filepath.lower() or "ai" in filepath.lower() or "sidebar" in filepath.lower():
        content = content.replace('shadow-ambient', 'shadow-[0_32px_64px_rgba(19,27,46,0.12)]')
        content = content.replace('shadow-2xl', 'shadow-[0_32px_64px_rgba(19,27,46,0.12)]')
    else:
        content = content.replace('shadow-2xl', 'shadow-[0_32px_64px_rgba(19,27,46,0.12)]')
        
    # Structural borders -> tonal shifts. 
    # Usually `border border-outline-variant/10 bg-surface-container-*`
    # We replace `border border-outline-variant/10` with `border-none` if it's on a card/container
    content = re.sub(r'\bborder border-outline-variant/10\b', 'border-none', content)
    content = re.sub(r'\bborder border-slate-\d+\b', 'border-none', content)
    content = re.sub(r'\bborder-t border-outline-variant/10\b', 'border-none', content)
    content = re.sub(r'\bborder-b border-outline-variant/10\b', 'border-none', content)

    # Some remaining grays
    content = re.sub(r'\bbg-slate-800\b', 'bg-inverse-surface', content)
    content = re.sub(r'\bbg-slate-900\b', 'bg-inverse-surface', content)
    content = re.sub(r'\btext-slate-200\b', 'text-inverse-on-surface', content)
    content = re.sub(r'\btext-slate-300\b', 'text-outline-variant', content)

    # Rounded fixes
    # Large cards: change rounded-lg or xl to 2xl if it's a card. But regex is tricky. 
    # Just fix "rounded-lg" on big containers if it was replaced. Actually rounded-2xl is already present in many places.

    # Button hovers: no color flips, just tonal shifts. We did bg-surface-container-highest earlier.

    if content != orig_content:
        with open(filepath, 'w') as f:
            f.write(content)
        print(f"Updated {filepath}")

for root, dirs, files in os.walk('/mnt/Work/Teamwork-Check/src'):
    for file in files:
        if file.endswith('.tsx') or file.endswith('.ts'):
            process_file(os.path.join(root, file))

