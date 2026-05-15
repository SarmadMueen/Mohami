
with open(r'd:\apps\next-supabase-master\pages\cases\CaseDetailsPage.js', 'r', encoding='utf-8') as f:
    lines = f.readlines()
    for i in range(11677, 11685):
        print(f"{i}: {repr(lines[i-1])}")
