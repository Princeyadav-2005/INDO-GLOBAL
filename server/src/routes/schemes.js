const express = require('express');

const router = express.Router();

const SCHEMES = [
  {
    id: 'pm-kisan',
    name: 'PM-KISAN (Pradhan Mantri Kisan Samman Nidhi)',
    nameHi: 'प्रधानमंत्री किसान सम्मान निधि (पीएम-किसान)',
    category: 'income_support',
    description: 'Central sector scheme providing income support to all landholding farmer families across the country to supplement their financial needs for agricultural and allied activities as well as domestic needs.',
    benefit: '₹6,000 per year paid in three equal four-monthly installments of ₹2,000 each directly transferred to bank accounts via DBT.',
    eligibility: 'All landholding farmer families having cultivable landholding in their names. Excludes institutional landholders, tax-paying professionals, and constitutional post holders.',
    howToApply: 'Register online at pmkisan.gov.in portal via Farmer Corner or through local Common Service Centres (CSC) / Revenue Officers / Nodal Officers.',
    website: 'https://pmkisan.gov.in',
    states: ['All']
  },
  {
    id: 'pmfby',
    name: 'Pradhan Mantri Fasal Bima Yojana (PMFBY)',
    nameHi: 'प्रधानमंत्री फसल बीमा योजना (पीएमएफबीवाई)',
    category: 'insurance',
    description: 'Comprehensive risk insurance coverage to farmers for yield loss due to non-preventable natural risks from pre-sowing to post-harvest stages.',
    benefit: 'Subsidized crop insurance. Maximum premium paid by farmer is 2% for Kharif foodgrains/oilseeds, 1.5% for Rabi crops, and 5% for annual commercial/horticultural crops with rest paid by government.',
    eligibility: 'All farmers including sharecroppers and tenant farmers growing notified crops in notified areas are eligible.',
    howToApply: 'Apply through bank branches, Primary Agricultural Credit Societies (PACS), CSC centers, or the PMFBY online portal before cut-off dates.',
    website: 'https://pmfby.gov.in',
    states: ['All']
  },
  {
    id: 'kcc',
    name: 'Kisan Credit Card (KCC) Scheme',
    nameHi: 'किसान क्रेडिट कार्ड योजना (केसीसी)',
    category: 'credit',
    description: 'Provides timely and adequate credit to farmers for agricultural cultivation, post-harvest expenses, maintenance of farm assets, and allied activities like animal husbandry and fisheries.',
    benefit: 'Short-term crop loans up to ₹3 lakh at a concessional interest rate of 4% per annum (after 2% interest subvention and 3% prompt repayment incentive). Simple documentation and revolving credit.',
    eligibility: 'Individual/joint farmers, tenant farmers, oral lessees, sharecroppers, and Self Help Groups (SHGs) or Joint Liability Groups (JLGs) of farmers.',
    howToApply: 'Submit application along with land documents and KYC to any commercial bank, regional rural bank (RRB), or cooperative bank.',
    website: 'https://www.myscheme.gov.in/schemes/kcc',
    states: ['All']
  },
  {
    id: 'soil-health-card',
    name: 'Soil Health Card Scheme',
    nameHi: 'मृदा स्वास्थ्य कार्ड योजना',
    category: 'soil_health',
    description: 'Provides farmers with soil test-based recommendations on balanced use of fertilizers and organic manure to enhance soil fertility and crop productivity.',
    benefit: 'Printed health card with nutrient status of soil across 12 parameters (N, P, K, S, Zn, Fe, Cu, Mn, Bo, pH, EC, OC) and customized fertilizer recommendations to lower cultivation costs.',
    eligibility: 'All farmers holding agricultural land in India.',
    howToApply: 'Soil samples are collected by agriculture extension staff; farmers can also visit local Krishi Vigyan Kendras (KVK) or soil testing laboratories.',
    website: 'https://soilhealth.dac.gov.in',
    states: ['All']
  },
  {
    id: 'pmksy',
    name: 'Pradhan Mantri Krishi Sinchayee Yojana (PMKSY) - Per Drop More Crop',
    nameHi: 'प्रधानमंत्री कृषि सिंचाई योजना (पीएमकेएसवाई) - प्रति बूँद अधिक फसल',
    category: 'irrigation',
    description: 'Promotes micro-irrigation systems (drip and sprinkler) to maximize water efficiency, reduce water wastage, and improve crop productivity.',
    benefit: 'Financial subsidy up to 55% for small and marginal farmers, and up to 45% for other farmers for installation of micro-irrigation systems (drip/sprinkler).',
    eligibility: 'All farmers possessing cultivable land and an assured water source (borewell, canal, pond, or river).',
    howToApply: 'Apply through State Department of Agriculture / Horticulture website or district agriculture offices.',
    website: 'https://pmksy.gov.in',
    states: ['All']
  },
  {
    id: 'rkvy',
    name: 'Rashtriya Krishi Vikas Yojana (RKVY - RAFTAAR)',
    nameHi: 'राष्ट्रीय कृषि विकास योजना (आरकेवीवाई - रफ्तार)',
    category: 'development',
    description: 'Initiative aimed at infrastructure creation, post-harvest asset management, agri-entrepreneurship, and agribusiness incubation across states.',
    benefit: 'Grants and seed-stage funding up to ₹25 lakh for agri-startups, farmer producer organizations (FPOs), and infrastructure projects like custom hiring centers.',
    eligibility: 'Farmers, agri-entrepreneurs, FPOs, cooperatives, and agricultural universities/institutions.',
    howToApply: 'Apply through state agricultural departments or affiliated Knowledge Partners and Agribusiness Incubators (R-ABIs).',
    website: 'https://rkvy.nic.in',
    states: ['All']
  },
  {
    id: 'enam',
    name: 'National Agriculture Market (e-NAM)',
    nameHi: 'राष्ट्रीय कृषि बाजार (ई-नाम)',
    category: 'market',
    description: 'Pan-India electronic trading portal networking existing APMC mandis to create a unified national market for agricultural commodities.',
    benefit: 'Transparent online bidding, better price discovery, direct online payments into bank accounts, reduced middlemen commissions, and access to nationwide buyers.',
    eligibility: 'Any farmer, trader, or commission agent registered with an e-NAM affiliated APMC mandi.',
    howToApply: 'Register with Aadhaar and bank details at nearest e-NAM mandi helpdesk or online at enam.gov.in.',
    website: 'https://www.enam.gov.in',
    states: ['All']
  },
  {
    id: 'nhm',
    name: 'National Horticulture Mission (MIDH)',
    nameHi: 'राष्ट्रीय बागवानी मिशन (एमआईडीएच)',
    category: 'horticulture',
    description: 'Holistic growth of the horticulture sector covering fruits, vegetables, root and tuber crops, mushrooms, spices, flowers, and aromatic plants.',
    benefit: 'Subsidies up to 40-50% for establishment of new orchards, polyhouses, shade nets, cold storage facilities, packhouses, and solar drying units.',
    eligibility: 'Individual growers, farmers, groups, SHGs, FPOs, and cooperatives engaged in horticultural production.',
    howToApply: 'Submit detailed project proposal to the District Horticulture Officer or through the State Horticulture Mission portal.',
    website: 'https://midh.gov.in',
    states: ['All']
  }
];

// GET /: list schemes filtered by state and category
router.get('/', (req, res) => {
  const { state, category } = req.query;
  let filtered = [...SCHEMES];

  if (category) {
    filtered = filtered.filter((s) => s.category.toLowerCase() === category.toLowerCase());
  }

  if (state && state.toLowerCase() !== 'all') {
    filtered = filtered.filter(
      (s) => s.states.includes('All') || s.states.map((st) => st.toLowerCase()).includes(state.toLowerCase())
    );
  }

  return res.json({
    success: true,
    count: filtered.length,
    data: filtered
  });
});

module.exports = router;
