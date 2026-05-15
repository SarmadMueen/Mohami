// pages/api/saveContent.js

import fs from 'fs';
import path from 'path';

export default async function handler(req, res) {
  if (req.method === 'POST') {
    const { content } = req.body;

    try {
      // Replace with the actual path where you want to save the file
      const filePath = path.join(process.cwd(), 'saved-content.txt');
      fs.writeFileSync(filePath, content);

      // Send a success response
      res.status(200).json({ message: 'Content saved successfully' });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Error saving content' });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}
