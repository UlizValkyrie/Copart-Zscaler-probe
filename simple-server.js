const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Serve static files
app.use(express.static(path.join(__dirname)));

// Serve the main page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Zscaler RDP/SSH Connectivity Tester (Client-Side) running on port ${PORT}`);
    console.log(`Open http://localhost:${PORT} in your browser`);
    console.log(`No backend processing - all tests run in the browser!`);
});
