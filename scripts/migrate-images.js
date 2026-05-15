const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function moveFiles() {
    console.log('Starting migration...');

    // 1. List files in images/bar-ids/
    const { data: files, error: listError } = await supabase.storage
        .from('images')
        .list('bar-ids', { limit: 100 });

    if (listError) {
        console.error('Error listing files:', listError);
        return;
    }

    console.log(`Found ${files.length} files to migrate.`);

    for (const file of files) {
        if (file.name === '.emptyFolderPlaceholder') continue; // Skip placeholder

        const oldPath = `bar-ids/${file.name}`;
        const newPath = file.name; // Root of bar-ids bucket

        console.log(`Migrating: ${file.name}`);

        // Download
        const { data: blob, error: downloadError } = await supabase.storage
            .from('images')
            .download(oldPath);

        if (downloadError) {
            console.error(`  Failed to download ${file.name}:`, downloadError.message);
            continue;
        }

        // Upload to new bucket
        const { error: uploadError } = await supabase.storage
            .from('bar-ids')
            .upload(newPath, blob, {
                contentType: file.metadata?.mimetype || 'image/jpeg',
                upsert: true
            });

        if (uploadError) {
            console.error(`  Failed to upload ${file.name}:`, uploadError.message);
            continue;
        }

        console.log(`  Moved successfully.`);
        // Optional: Delete from old location? I'll leave it for safety or user to clean up.
    }
    console.log('Migration complete.');
}

moveFiles();
