// MCA E‑Filing Assistant – Express.js Backend
const express = require('express');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const PDFDocument = require('pdfkit');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

let filings = []; // In-memory store (later switch to MongoDB)

// ▶️ Submit a new form
app.post('/api/forms', (req, res) => {
  const { cin, company, formType, fields } = req.body;
  const id = uuidv4();
  const newForm = { id, cin, company, formType, fields, srn: 'SRN' + Math.floor(Math.random() * 1e6), date: new Date() };
  filings.push(newForm);
  res.status(201).json(newForm);
});

// ▶️ Fetch filings by CIN
app.get('/api/forms/:cin', (req, res) => {
  res.json(filings.filter(f => f.cin === req.params.cin));
});

// ▶️ Get JSON of a specific filing
app.get('/api/forms/json/:id', (req, res) => {
  const form = filings.find(f => f.id === req.params.id);
  if (!form) return res.status(404).json({ error: 'Not found' });
  res.json(form);
});

// ▶️ Generate and download PDF
app.get('/api/forms/pdf/:id', (req, res) => {
  const form = filings.find(f => f.id === req.params.id);
  if (!form) return res.status(404).json({ error: 'Not found' });

  const doc = new PDFDocument();
  const filename = `Form_${form.id}.pdf`;
  const filePath = path.join(__dirname, filename);
  const stream = fs.createWriteStream(filePath);

  doc.pipe(stream);
  doc.fontSize(18).text(`Form: ${form.formType}`, { underline: true });
  doc.moveDown()
     .fontSize(12)
     .text(`Company: ${form.company}`)
     .text(`CIN: ${form.cin}`)
     .text(`SRN: ${form.srn}`)
     .text(`Date: ${form.date.toDateString()}`)
     .moveDown()
     .text('Fields:');
  for (const [k,v] of Object.entries(form.fields)) doc.text(`${k}: ${v}`);
  doc.end();

  stream.on('finish', () => {
    res.download(filePath, filename, () => fs.unlinkSync(filePath));
  });
});

app.listen(PORT, () => console.log(`Backend running on port ${PORT}`));
