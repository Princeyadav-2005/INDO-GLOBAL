const fs = require('fs');
const path = require('path');
const { initFirebase, getDb } = require('../src/config/firebase');

initFirebase();
const db = getDb();

async function run() {
  const dir = path.join(__dirname, '..', 'uploads', 'expense');
  fs.mkdirSync(dir, { recursive: true });

  const svgContent = `
<svg xmlns="http://www.w3.org/2000/svg" width="600" height="780" viewBox="0 0 600 780" style="background:#fff;font-family:Arial,sans-serif;">
  <rect width="600" height="780" fill="#fcfbf9" stroke="#1a5c2a" stroke-width="3" rx="10"/>
  
  <!-- Header -->
  <rect x="25" y="25" width="550" height="110" fill="#1a5c2a" rx="8"/>
  <text x="300" y="65" font-size="24" font-weight="bold" fill="#ffffff" text-anchor="middle">KISAN SEVA KENDRA</text>
  <text x="300" y="90" font-size="14" fill="#a7f3d0" text-anchor="middle">IFFCO Authorized Fertilizer &amp; Seed Store</text>
  <text x="300" y="112" font-size="12" fill="#ffffff" text-anchor="middle">Main Mandi Road, Sehore (M.P.) | GSTIN: 23AABCK9981F1Z2</text>
  
  <!-- Invoice Meta -->
  <text x="40" y="170" font-size="16" font-weight="bold" fill="#1c1c1e">TAX INVOICE / CASH MEMO</text>
  <text x="40" y="195" font-size="12" fill="#6b7280">Raseed No: KSK-2026-8492</text>
  <text x="380" y="195" font-size="12" fill="#6b7280">Tareekh: 23-Oct-2026</text>
  
  <line x1="40" y1="210" x2="560" y2="210" stroke="#e5e0d8" stroke-width="2"/>
  
  <!-- Customer info -->
  <text x="40" y="240" font-size="13" fill="#1c1c1e">Kisan Bhai: Rameshwar Patel (Khet Malik / Operator)</text>
  <text x="40" y="262" font-size="13" fill="#1c1c1e">Fasal: Gehu (Wheat Season 2026-27)</text>
  <text x="380" y="262" font-size="13" fill="#1c1c1e">Payment: CASH (Nagad)</text>
  
  <!-- Items Table Header -->
  <rect x="40" y="285" width="520" height="35" fill="#f0ede7" rx="4"/>
  <text x="55" y="308" font-size="13" font-weight="bold" fill="#1c1c1e">Fasal Samagri (Item)</text>
  <text x="310" y="308" font-size="13" font-weight="bold" fill="#1c1c1e">Matra (Qty)</text>
  <text x="400" y="308" font-size="13" font-weight="bold" fill="#1c1c1e">Dar (Rate)</text>
  <text x="495" y="308" font-size="13" font-weight="bold" fill="#1c1c1e">Rashi (₹)</text>
  
  <!-- Item 1 -->
  <text x="55" y="350" font-size="13" font-weight="bold" fill="#1c1c1e">IFFCO DAP Fertilizer (50 Kg Bag)</text>
  <text x="55" y="370" font-size="11" fill="#6b7280">18:46:0 Grade White Bag | Subsidy Included</text>
  <text x="315" y="350" font-size="13" fill="#1c1c1e">2 Bori</text>
  <text x="405" y="350" font-size="13" fill="#1c1c1e">₹1,350</text>
  <text x="495" y="350" font-size="14" font-weight="bold" fill="#1c1c1e">₹2,700</text>
  
  <line x1="40" y1="420" x2="560" y2="420" stroke="#e5e0d8" stroke-width="1"/>
  
  <!-- Subtotal -->
  <text x="350" y="450" font-size="14" font-weight="bold" fill="#1c1c1e">Kul Rashi (Subtotal):</text>
  <text x="495" y="450" font-size="14" font-weight="bold" fill="#1c1c1e">₹2,700.00</text>
  
  <text x="350" y="475" font-size="12" fill="#6b7280">GST Tax (0% Exempted):</text>
  <text x="510" y="475" font-size="12" fill="#6b7280">₹0.00</text>
  
  <!-- Grand Total Box -->
  <rect x="330" y="500" width="230" height="45" fill="#e8f5e9" stroke="#1a5c2a" rx="6"/>
  <text x="345" y="528" font-size="16" font-weight="bold" fill="#1a5c2a">Kul Yog: ₹2,700</text>
  
  <text x="40" y="575" font-size="12" font-weight="bold" fill="#1c1c1e">Shabdon Me: Two Thousand Seven Hundred Rupees Only</text>
  
  <!-- Stamps & Verification -->
  <rect x="70" y="630" width="160" height="60" fill="none" stroke="#2563eb" stroke-width="2" rx="4"/>
  <text x="150" y="655" font-size="12" font-weight="bold" fill="#2563eb" text-anchor="middle">KISAN SEVA KENDRA</text>
  <text x="150" y="675" font-size="11" font-weight="bold" fill="#16a34a" text-anchor="middle">✓ PAID &amp; VERIFIED</text>
  
  <text x="450" y="685" font-size="12" fill="#1c1c1e" text-anchor="middle">Khad Vikreta Hastakshar</text>
  <line x1="370" y1="670" x2="530" y2="670" stroke="#9ca3af" stroke-width="1"/>
  
  <text x="300" y="745" font-size="11" fill="#9ca3af" text-anchor="middle">Farmer Connect 2.0 Digital Verification System</text>
</svg>
`.trim();

  const filePath = path.join(dir, 'raseed_2_bori_khad.svg');
  fs.writeFileSync(filePath, svgContent);
  console.log('Saved receipt SVG to:', filePath);

  // Link to expense 0bJvd0LuLgQtW2XKC08o if exists
  const expDoc = await db.collection('expenses').doc('0bJvd0LuLgQtW2XKC08o').get();
  if (expDoc.exists) {
    const attRef = await db.collection('attachments').add({
      filename: 'raseed_2_bori_khad.svg',
      originalName: 'Raseed_2_Bori_Khad_DAP.svg',
      mimeType: 'image/svg+xml',
      sizeBytes: Buffer.byteLength(svgContent),
      filePath: 'uploads/expense/raseed_2_bori_khad.svg',
      fileUrl: 'http://localhost:5000/uploads/expense/raseed_2_bori_khad.svg',
      entityType: 'expense',
      entityId: '0bJvd0LuLgQtW2XKC08o',
      reviewStatus: 'verified',
      createdAt: new Date().toISOString()
    });

    await db.collection('expenses').doc('0bJvd0LuLgQtW2XKC08o').update({
      attachmentIds: [attRef.id],
      hasReceipt: true,
      receiptUrl: 'http://localhost:5000/uploads/expense/raseed_2_bori_khad.svg',
      reviewStatus: 'acknowledged',
      description: '2 bori white (IFFCO DAP Khad)'
    });
    console.log('Successfully linked receipt to expense 0bJvd0LuLgQtW2XKC08o!');
  } else {
    console.log('Expense 0bJvd0LuLgQtW2XKC08o not found');
  }

  // Also make sure all expenses have amount in sync
  const allExps = await db.collection('expenses').get();
  for (const d of allExps.docs) {
    const data = d.data();
    if (!data.amount && data.amountPaise) {
      await d.ref.update({
        amount: data.amountPaise,
        isPaise: true
      });
      console.log('Synchronized amount for expense:', d.id);
    }
  }

  console.log('Done!');
}

run().catch(console.error);
