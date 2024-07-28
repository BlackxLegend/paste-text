const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;

app.use(bodyParser.json());

const pastesDir = path.join(__dirname, 'pastes');

// Ensure the pastes directory exists
if (!fs.existsSync(pastesDir)){
    fs.mkdirSync(pastesDir);
}

// ANSI escape codes for red color
const red = '\x1b[31m';
const reset = '\x1b[0m';

// Monitor the directory for new files
fs.watch(pastesDir, (eventType, filename) => {
    if (eventType === 'rename' && filename) {
        const filePath = path.join(pastesDir, filename);
        if (fs.existsSync(filePath)) {
            fs.readFile(filePath, 'utf8', (err, data) => {
                if (err) {
                    console.error(`Failed to read new file ${filename}`, err);
                    return;
                }
                try {
                    const parsedData = JSON.parse(data);
                    console.log(`${red}New file added: ${filename}${reset}`);
                    console.log(`Contents:`, parsedData);
                } catch (err) {
                    console.error(`Failed to parse JSON from file ${filename}`, err);
                }
            });
        }
    }
});

// Helper function to generate a unique filename
function generateFilename() {
    return `paste_${Date.now()}.json`;
}

// Endpoint to add a new paste
app.get('/pastes/text', (req, res) => {
    const text = req.query.add;

    if (!text) {
        res.status(400).json({ error: 'No text provided in query parameter' });
        return;
    }

    const filename = generateFilename();
    const filePath = path.join(pastesDir, filename);

    fs.writeFile(filePath, JSON.stringify({ text }), 'utf8', (err) => {
        if (err) {
            console.error(err);
            res.status(500).json({ error: 'Failed to save paste' });
            return;
        }

        res.json({ message: 'Paste added', filename });
    });
});

// Endpoint to retrieve a paste by filename
app.get('/pastes/:filename', (req, res) => {
    const { filename } = req.params;
    const filePath = path.join(pastesDir, filename);

    if (!fs.existsSync(filePath)) {
        res.status(404).json({ error: 'Paste not found' });
        return;
    }

    fs.readFile(filePath, 'utf8', (err, data) => {
        if (err) {
            console.error(err);
            res.status(500).json({ error: 'Failed to retrieve paste' });
            return;
        }

        res.json(JSON.parse(data));
    });
});

// Endpoint to delete a paste by filename
app.delete('/pastes/:filename', (req, res) => {
    const { filename } = req.params;
    const filePath = path.join(pastesDir, filename);

    if (!fs.existsSync(filePath)) {
        res.status(404).json({ error: 'Paste not found' });
        return;
    }

    fs.unlink(filePath, (err) => {
        if (err) {
            console.error(err);
            res.status(500).json({ error: 'Failed to delete paste' });
            return;
        }

        res.json({ message: 'Paste deleted' });
    });
});

// Endpoint to search for, delete, or delete all pastes by filename in a query parameter
app.get('/paste/id/text', (req, res) => {
    const search = req.query.search;
    const deleteFile = req.query.delete;

    if (!search && !deleteFile) {
        res.status(400).json({ error: 'No filename provided in query parameter' });
        return;
    }

    if (deleteFile === 'all') {
        fs.readdir(pastesDir, (err, files) => {
            if (err) {
                console.error(err);
                res.status(500).json({ error: 'Failed to list pastes' });
                return;
            }

            files.forEach(file => {
                fs.unlink(path.join(pastesDir, file), (err) => {
                    if (err) {
                        console.error(err);
                    }
                });
            });

            res.json({ message: 'All pastes deleted' });
        });
        return;
    }

    if (deleteFile) {
        const filePath = path.join(pastesDir, deleteFile);

        if (!fs.existsSync(filePath)) {
            res.status(404).json({ error: 'Paste not found' });
            return;
        }

        fs.unlink(filePath, (err) => {
            if (err) {
                console.error(err);
                res.status(500).json({ error: 'Failed to delete paste' });
                return;
            }

            res.json({ message: 'Paste deleted' });
        });
        return;
    }

    if (search) {
        const filePath = path.join(pastesDir, search);

        if (!fs.existsSync(filePath)) {
            res.status(404).json({ error: 'Paste not found' });
            return;
        }

        fs.readFile(filePath, 'utf8', (err, data) => {
            if (err) {
                console.error(err);
                res.status(500).json({ error: 'Failed to retrieve paste' });
                return;
            }

            res.json(JSON.parse(data));
        });
        return;
    }
});

// Endpoint to show all pastes
app.get('/paste/id/all', (req, res) => {
    fs.readdir(pastesDir, (err, files) => {
        if (err) {
            console.error(err);
            res.status(500).json({ error: 'Failed to list pastes' });
            return;
        }

        const pastes = {};

        files.forEach(file => {
            const filePath = path.join(pastesDir, file);

            if (path.extname(file) === '.json') {
                const fileContent = fs.readFileSync(filePath, 'utf8');
                try {
                    pastes[file] = JSON.parse(fileContent);
                } catch (err) {
                    console.error(`Failed to parse JSON from file ${file}`, err);
                }
            }
        });

        res.json(pastes);
    });
});

app.listen(port, () => {
    console.log(`Pastebin API server is running on port ${port}`);
});
