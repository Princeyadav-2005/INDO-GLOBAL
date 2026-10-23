import React, { useState, useRef, useEffect } from 'react'
import { aiAPI } from '../../services/api'
import LoadingSpinner from '../../components/UI/LoadingSpinner'
import Alert from '../../components/UI/Alert'

const QUICK_PROMPTS = [
  '🌾 Gehu me peela ratwa (rust) ke lakshan aur ilaj kya hai?',
  '🧪 Soyabean ki fasal me kitna NPK daalna chahiye?',
  '🌤️ Barish ke mausam me keetnashak spray kaise karein?',
  '📜 PM Kisan samman nidhi ka status kaise check karein?'
]

export function KrishiMitra() {
  const [activeTab, setActiveTab] = useState('chat') // 'chat' | 'recommend' | 'disease'
  const [language, setLanguage] = useState('hi') // 'hi' | 'hinglish' | 'en'

  // Chat State
  const [messages, setMessages] = useState([
    {
      sender: 'bot',
      text: 'Namaskar Kisan Bhai! Main hoon aapka Krishi Mitra AI 🤖. Kheti-kisani, bimari, beej ya sarkari yojana se juda koi bhi sawal puchiye.',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ])
  const [inputMessage, setInputMessage] = useState('')
  const [chatLoading, setChatLoading] = useState(false)
  const chatBottomRef = useRef(null)

  // Crop Recommend State
  const [soilType, setSoilType] = useState('Kali Mitti (Black Soil)')
  const [soilPh, setSoilPh] = useState(6.8)
  const [nitrogen, setNitrogen] = useState(40)
  const [phosphorus, setPhosphorus] = useState(50)
  const [potassium, setPotassium] = useState(40)
  const [recommendSeason, setRecommendSeason] = useState('Rabi')
  const [recommendState, setRecommendState] = useState('Madhya Pradesh')
  const [recommendLoading, setRecommendLoading] = useState(false)
  const [recommendResults, setRecommendResults] = useState(null)

  // Disease ID State
  const [diseaseDescription, setDiseaseDescription] = useState('')
  const [diseaseLoading, setDiseaseLoading] = useState(false)
  const [diseaseResult, setDiseaseResult] = useState(null)

  useEffect(() => {
    if (activeTab === 'chat') {
      chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, activeTab])

  // Handle Send Chat
  const handleSendMessage = async (textToSend) => {
    const text = textToSend || inputMessage
    if (!text.trim() || chatLoading) return

    const userMsg = {
      sender: 'user',
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }

    setMessages((prev) => [...prev, userMsg])
    setInputMessage('')
    setChatLoading(true)

    try {
      const history = messages.slice(-6).map(m => ({
        role: m.sender === 'user' ? 'user' : 'assistant',
        content: m.text
      }))

      const res = await aiAPI.chat(text, language, history)
      const botReply = res.reply || res.message || res.data?.reply || 'Kripya thoda spasht sawal puchiye.'

      setMessages((prev) => [
        ...prev,
        {
          sender: 'bot',
          text: botReply,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ])
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          sender: 'bot',
          text: 'Maaf karein, network ya server me takleef hai. Thodi der baad dobara puchiye.',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ])
    } finally {
      setChatLoading(false)
    }
  }

  // Handle Crop Recommend Submit
  const handleRecommendSubmit = async (e) => {
    e.preventDefault()
    try {
      setRecommendLoading(true)
      const res = await aiAPI.cropRecommend({
        soilType,
        pH: soilPh,
        N: nitrogen,
        P: phosphorus,
        K: potassium,
        season: recommendSeason,
        state: recommendState
      })
      const recs = res.recommendations || res.data || res
      setRecommendResults(Array.isArray(recs) ? recs : [recs])
    } catch (err) {
      alert('Crop recommendation prapt karne me samasya aayi.')
    } finally {
      setRecommendLoading(false)
    }
  }

  // Handle Disease Submit
  const handleDiseaseSubmit = async (e) => {
    e.preventDefault()
    if (!diseaseDescription.trim()) return
    try {
      setDiseaseLoading(true)
      const res = await aiAPI.disease(diseaseDescription)
      setDiseaseResult(res.result || res.data || res)
    } catch (err) {
      alert('Bimari pehchanne me truti hui.')
    } finally {
      setDiseaseLoading(false)
    }
  }

  return (
    <div className="container animate-fadeIn" style={{ maxWidth: '840px' }}>
      {/* Header */}
      <div className="page-header mb-4">
        <div>
          <h2 className="page-title">🤖 Krishi Mitra AI Salahkar</h2>
          <p className="page-subtitle">24x7 Kisan Sahayak: Bimari pehchan, fasal sifarish aur kheti jankari</p>
        </div>

        {/* Language selector */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-secondary font-medium">Bhasha:</span>
          <select
            className="select"
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            style={{ width: 'auto', padding: '0.35rem 0.75rem', fontSize: '0.85rem' }}
          >
            <option value="hi">हिंदी (Hindi)</option>
            <option value="hinglish">Hinglish</option>
            <option value="en">English</option>
          </select>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-4">
        <button
          type="button"
          onClick={() => setActiveTab('chat')}
          className={`btn ${activeTab === 'chat' ? 'btn-primary' : 'btn-outline'}`}
          style={{ flex: 1 }}
        >
          💬 Krishi Chatbot
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('recommend')}
          className={`btn ${activeTab === 'recommend' ? 'btn-primary' : 'btn-outline'}`}
          style={{ flex: 1 }}
        >
          🌱 Fasal Sifarish (Recommend)
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('disease')}
          className={`btn ${activeTab === 'disease' ? 'btn-primary' : 'btn-outline'}`}
          style={{ flex: 1 }}
        >
          🩺 Bimari Pehchan (Doctor)
        </button>
      </div>

      {/* TAB 1: Chat Interface */}
      {activeTab === 'chat' && (
        <div className="card p-0 flex flex-col" style={{ height: '580px', overflow: 'hidden' }}>
          {/* Quick Prompts Bar */}
          <div className="p-3 bg-surface-2 border-b flex gap-2" style={{ overflowX: 'auto', whiteSpace: 'nowrap' }}>
            {QUICK_PROMPTS.map((prompt, i) => (
              <button
                key={i}
                type="button"
                onClick={() => handleSendMessage(prompt)}
                className="chip text-xs"
                style={{ fontSize: '0.75rem' }}
              >
                {prompt}
              </button>
            ))}
          </div>

          {/* Messages Flow Area */}
          <div
            className="flex-1 p-4"
            style={{
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.85rem',
              backgroundColor: '#fbf9f5'
            }}
          >
            {messages.map((m, idx) => {
              const isUser = m.sender === 'user'
              return (
                <div
                  key={idx}
                  style={{
                    display: 'flex',
                    justifyContent: isUser ? 'flex-end' : 'flex-start'
                  }}
                >
                  <div
                    style={{
                      maxWidth: '80%',
                      padding: '0.75rem 1rem',
                      borderRadius: isUser ? '16px 16px 2px 16px' : '16px 16px 16px 2px',
                      backgroundColor: isUser ? 'var(--color-primary)' : '#ffffff',
                      color: isUser ? '#ffffff' : 'var(--color-text)',
                      boxShadow: 'var(--shadow-sm)',
                      border: isUser ? 'none' : '1px solid var(--color-border)',
                      fontSize: '0.925rem',
                      lineHeight: 1.5,
                      whiteSpace: 'pre-wrap'
                    }}
                  >
                    {!isUser && <div className="text-xs font-bold text-primary mb-1">🤖 Krishi Mitra:</div>}
                    <div>{m.text}</div>
                    <div
                      style={{
                        textAlign: 'right',
                        fontSize: '0.65rem',
                        marginTop: '4px',
                        opacity: 0.7
                      }}
                    >
                      {m.timestamp}
                    </div>
                  </div>
                </div>
              )
            })}

            {chatLoading && (
              <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                <div
                  className="p-3 bg-white rounded"
                  style={{ borderRadius: '16px 16px 16px 2px', border: '1px solid var(--color-border)' }}
                >
                  <div className="flex items-center gap-2 text-xs text-primary font-semibold">
                    <span className="spinner spinner-sm" style={{ width: '14px', height: '14px' }}></span>
                    Krishi Mitra soch raha hai...
                  </div>
                </div>
              </div>
            )}
            <div ref={chatBottomRef} />
          </div>

          {/* Chat Input Bar */}
          <form
            onSubmit={(e) => {
              e.preventDefault()
              handleSendMessage()
            }}
            className="p-3 bg-surface border-t flex gap-2 items-center"
          >
            <input
              type="text"
              className="input"
              placeholder="Yahan apna sawal likhein ya puchiye..."
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              disabled={chatLoading}
              style={{ flex: 1 }}
            />
            <button
              type="submit"
              disabled={chatLoading || !inputMessage.trim()}
              className="btn btn-primary"
              style={{ padding: '0.625rem 1.25rem' }}
            >
              Bhejein ➔
            </button>
          </form>
        </div>
      )}

      {/* TAB 2: Crop Recommend */}
      {activeTab === 'recommend' && (
        <div className="card p-6">
          <h3 className="section-title text-base mb-3">🌱 Khet Ki Mitti Ke Aadhar Par Fasal Sifarish</h3>
          <p className="text-xs text-secondary mb-4">
            Apni mitti aur poshak tatvon ka man darj karein, AI batayega sabse jyada labhkari fasal.
          </p>

          <form onSubmit={handleRecommendSubmit}>
            <div className="grid grid-2 gap-3">
              <div className="form-group">
                <label className="form-label">Mitti Ka Prakaar (Soil Type)</label>
                <select className="select" value={soilType} onChange={(e) => setSoilType(e.target.value)}>
                  <option value="Kali Mitti (Black Soil)">Kali Mitti (Black Cotton Soil)</option>
                  <option value="Lal Mitti (Red Soil)">Lal Mitti (Red Soil)</option>
                  <option value="Domat Mitti (Alluvial)">Domat Mitti (Alluvial)</option>
                  <option value="Balui Mitti (Sandy)">Balui Mitti (Sandy Soil)</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Mausam (Season)</label>
                <select className="select" value={recommendSeason} onChange={(e) => setRecommendSeason(e.target.value)}>
                  <option value="Rabi">Rabi (Gehu, Chana, Sarson)</option>
                  <option value="Kharif">Kharif (Soyabean, Dhan, Makka)</option>
                  <option value="Zaid">Zaid (Garma / Sabziyan)</option>
                </select>
              </div>
            </div>

            <div className="mb-4">
              <label className="form-label">
                <span>Soil pH Star: <strong>{soilPh}</strong></span>
                <span className="text-xs text-muted">(Normal 6.5 - 7.5)</span>
              </label>
              <input
                type="range"
                min="4"
                max="9"
                step="0.1"
                value={soilPh}
                onChange={(e) => setSoilPh(parseFloat(e.target.value))}
                style={{ width: '100%', accentColor: 'var(--color-primary)' }}
              />
            </div>

            <div className="grid grid-3 gap-3 mb-4">
              <div>
                <label className="form-label text-xs">Nitrogen (N): {nitrogen} kg/ha</label>
                <input
                  type="range"
                  min="10"
                  max="140"
                  value={nitrogen}
                  onChange={(e) => setNitrogen(Number(e.target.value))}
                  style={{ width: '100%', accentColor: 'var(--color-primary)' }}
                />
              </div>

              <div>
                <label className="form-label text-xs">Phosphorus (P): {phosphorus} kg/ha</label>
                <input
                  type="range"
                  min="5"
                  max="100"
                  value={phosphorus}
                  onChange={(e) => setPhosphorus(Number(e.target.value))}
                  style={{ width: '100%', accentColor: 'var(--color-primary)' }}
                />
              </div>

              <div>
                <label className="form-label text-xs">Potassium (K): {potassium} kg/ha</label>
                <input
                  type="range"
                  min="10"
                  max="100"
                  value={potassium}
                  onChange={(e) => setPotassium(Number(e.target.value))}
                  style={{ width: '100%', accentColor: 'var(--color-primary)' }}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={recommendLoading}
              className="btn btn-primary btn-lg"
              style={{ width: '100%' }}
            >
              {recommendLoading ? '⏳ Sifarish calculate ho rahi hai...' : '✨ Best Fasal Sifarish Dekhein'}
            </button>
          </form>

          {/* Results Display */}
          {recommendResults && (
            <div className="mt-5 pt-4 border-t animate-slideUp">
              <h4 className="font-bold text-base text-primary mb-3">🎯 Sifarish Ki Gayi Fasalein:</h4>
              <div className="grid grid-2 gap-3">
                {recommendResults.map((item, idx) => (
                  <div key={idx} className="card p-4 bg-surface-2 border">
                    <span className="badge badge-success mb-2">Match: {item.matchScore || '95%'}</span>
                    <h5 className="font-bold text-lg text-primary">{item.crop || item.name || 'Gehu / Wheat'}</h5>
                    <p className="text-xs text-secondary mt-1">
                      {item.reason || item.description || 'Aapki mitti ke pH aur poshak tatvon ke anukool.'}
                    </p>
                    <div className="mt-2 text-xs font-semibold text-text">
                      Anumanit Paidaawar: {item.yield || '18-22 Qtl / Acre'}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: Disease ID */}
      {activeTab === 'disease' && (
        <div className="card p-6">
          <h3 className="section-title text-base mb-3">🩺 Fasal Bimari Pehchan & Upchar (AI Doctor)</h3>
          <p className="text-xs text-secondary mb-4">
            Patti ka rang, dhabbe ya sukhepan ke baare me likhein. AI turant rog aur spray batayega.
          </p>

          <form onSubmit={handleDiseaseSubmit}>
            <div className="form-group">
              <label className="form-label">Lakshan Ka Vivaran (Symptoms) *</label>
              <textarea
                className="textarea"
                rows="4"
                placeholder="Jaise: Gehu ki patti par peele rang ke chote-chote dhabbe dikh rahe hain aur chhoone par peela powder lagta hai..."
                value={diseaseDescription}
                onChange={(e) => setDiseaseDescription(e.target.value)}
                required
              />
            </div>

            <button
              type="submit"
              disabled={diseaseLoading || !diseaseDescription.trim()}
              className="btn btn-primary btn-lg"
              style={{ width: '100%' }}
            >
              {diseaseLoading ? '⏳ Bimari pehchani ja rahi hai...' : '🔍 Bimari & Upchar Jaaniye'}
            </button>
          </form>

          {diseaseResult && (
            <div className="mt-5 p-5 bg-surface-2 rounded border animate-slideUp">
              <div className="flex-between items-center mb-2">
                <span className="badge badge-error">
                  Jarurat: {diseaseResult.urgency || 'Uchch (High Priority)'}
                </span>
                <span className="text-xs text-muted">AI Diagnostic Report</span>
              </div>

              <h4 className="font-bold text-xl text-error mb-2">
                {diseaseResult.disease || diseaseResult.name || 'Peela Ratwa (Yellow Rust)'}
              </h4>

              <div className="mb-3 text-sm text-secondary">
                <strong>Rog Ka Karan:</strong> {diseaseResult.cause || 'Fungus (Puccinia striiformis)'}
              </div>

              <div className="p-3 bg-white rounded border mb-3">
                <strong className="text-primary text-sm">💊 Upchar / Dawa (Spray Advisory):</strong>
                <p className="text-sm mt-1">
                  {diseaseResult.treatment || 'Propiconazole 25% EC (Tilt) 200 ml ko 200 litre pani me gholkar prati ekad spray karein.'}
                </p>
              </div>

              <div className="text-xs text-secondary">
                <strong>Savdhani:</strong> {diseaseResult.precaution || 'Dhoop nikalne par hi spray karein aur barish ki sambhavna hone par ruk jayein.'}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default KrishiMitra
