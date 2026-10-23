import React, { useState, useEffect } from 'react'
import { marketplaceAPI } from '../../services/api'
import { useAuth } from '../../context/AuthContext'
import LoadingSpinner from '../../components/UI/LoadingSpinner'
import EmptyState from '../../components/UI/EmptyState'
import Alert from '../../components/UI/Alert'
import Modal from '../../components/UI/Modal'
import { formatRupees, formatDate } from '../../utils/formatters'

export function MarketplacePage() {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState('browse') // 'browse' | 'my'
  const [listings, setListings] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)

  // Filters
  const [cropFilter, setCropFilter] = useState('')
  const [districtFilter, setDistrictFilter] = useState('')

  // Create Listing Modal
  const [modalOpen, setModalOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [newListing, setNewListing] = useState({
    crop: 'Wheat (Gehu)',
    variety: 'Sharbati',
    quantity: '',
    unit: 'Quintal',
    askingPrice: '',
    qualityGrade: 'Grade A',
    location: user?.district || 'Sehore, MP',
    availableDate: new Date().toISOString().split('T')[0],
    description: '',
    contactPhone: user?.phone || ''
  })

  // Selected phone to reveal
  const [revealedPhoneId, setRevealedPhoneId] = useState(null)

  useEffect(() => {
    loadListings()
  }, [])

  const loadListings = async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await marketplaceAPI.list()
      const list = res.listings || res.data || (Array.isArray(res) ? res : [])
      setListings(list)
    } catch (err) {
      setError('Marketplace listings load nahi ho saki.')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateListing = async (e) => {
    e.preventDefault()
    if (!newListing.crop || !newListing.quantity || !newListing.askingPrice || !newListing.contactPhone) {
      setError('Kripya fasal, matra, bhav aur phone number darj karein.')
      return
    }

    try {
      setSubmitting(true)
      await marketplaceAPI.create({
        ...newListing,
        quantity: parseFloat(newListing.quantity),
        askingPrice: parseFloat(newListing.askingPrice)
      })
      setSuccess('Aapka vigyapan (Listing) safaltapoorvak bazaar me darj ho gaya!')
      setModalOpen(false)
      loadListings()
    } catch (err) {
      setError(err.message || 'Listing create karne me truti hui.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeleteListing = async (id) => {
    if (!window.confirm('Kya aap is vigyapan ko bazaar se hatana chahte hain?')) return
    try {
      await marketplaceAPI.delete(id)
      setSuccess('Vigyapan hata diya gaya.')
      loadListings()
    } catch (err) {
      setError('Listing delete nahi ho saki.')
    }
  }

  // Browse vs My Listings
  const browseListings = listings.filter((l) => {
    const matchCrop = !cropFilter || (l.crop && l.crop.toLowerCase().includes(cropFilter.toLowerCase()))
    const matchDistrict = !districtFilter || (l.location && l.location.toLowerCase().includes(districtFilter.toLowerCase()))
    return matchCrop && matchDistrict
  })

  const myListings = listings.filter((l) => l.userId === user?.id || l.userId === user?._id || l.contactPhone === user?.phone)

  return (
    <div className="container animate-fadeIn" style={{ maxWidth: '880px' }}>
      <div className="page-header mb-4">
        <div>
          <h2 className="page-title">🛒 Kisan Bazaar (Farmer Marketplace)</h2>
          <p className="page-subtitle">
            Bina kisi bicholiye ke kisan se sidha vyapari ya kisan ko fasal bechein
          </p>
        </div>

        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="btn btn-primary"
        >
          + Fasal Bechein (Naya Vigyapan)
        </button>
      </div>

      {error && <Alert type="error" message={error} onClose={() => setError(null)} />}
      {success && <Alert type="success" message={success} onClose={() => setSuccess(null)} />}

      {/* Tabs */}
      <div className="flex gap-2 mb-4">
        <button
          type="button"
          onClick={() => setActiveTab('browse')}
          className={`btn ${activeTab === 'browse' ? 'btn-primary' : 'btn-outline'}`}
          style={{ flex: 1 }}
        >
          🛍️ Bazaar Me Fasal Dekhein ({browseListings.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('my')}
          className={`btn ${activeTab === 'my' ? 'btn-primary' : 'btn-outline'}`}
          style={{ flex: 1 }}
        >
          🏷️ Mere Vigyapan (My Listings)
        </button>
      </div>

      {/* Filter bar for Browse tab */}
      {activeTab === 'browse' && (
        <div className="card p-3 mb-4">
          <div className="grid grid-2 gap-3">
            <input
              type="text"
              className="input"
              placeholder="🔍 Fasal ka naam (Gehu, Soyabean, Chana...)"
              value={cropFilter}
              onChange={(e) => setCropFilter(e.target.value)}
            />
            <input
              type="text"
              className="input"
              placeholder="📍 Sthaan ya Jila (Sehore, Indore, Bhopal...)"
              value={districtFilter}
              onChange={(e) => setDistrictFilter(e.target.value)}
            />
          </div>
        </div>
      )}

      {/* Listings List */}
      {loading ? (
        <LoadingSpinner message="Kisan bazaar khul raha hai..." />
      ) : activeTab === 'browse' ? (
        browseListings.length === 0 ? (
          <EmptyState
            icon="🛒"
            title="Bazaar me abhi koi fasal nahi hai"
            subtitle="Pehle kisan banein jo apni fasal bazaar me bikri ke liye darj karein."
            action={() => setModalOpen(true)}
            actionLabel="+ Fasal Ka Vigyapan Dalein"
          />
        ) : (
          <div className="grid grid-2 gap-4">
            {browseListings.map((item, idx) => {
              const id = item.id || item._id || idx
              const isPhoneShown = revealedPhoneId === id

              return (
                <div key={id} className="card card-hover p-4 flex flex-col justify-between">
                  <div>
                    <div className="flex-between items-start mb-2">
                      <span className="badge badge-success">{item.crop}</span>
                      <span className="text-xs text-muted">{formatDate(item.createdAt || item.availableDate)}</span>
                    </div>

                    <h3 className="font-bold text-lg text-primary">
                      {item.crop} {item.variety ? `(${item.variety})` : ''}
                    </h3>

                    <div className="flex-between items-center my-2 p-2 bg-surface-2 rounded text-sm">
                      <div>
                        <span className="text-xs text-secondary">Matra (Quantity):</span>
                        <div className="font-bold text-text">
                          {item.quantity} {item.unit || 'Qtl'}
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-xs text-secondary">Mang (Price):</span>
                        <div className="font-bold text-lg text-primary">
                          {formatRupees(item.askingPrice, false)} / {item.unit || 'Qtl'}
                        </div>
                      </div>
                    </div>

                    <p className="text-xs text-secondary mb-2">
                      📍 <strong>Sthaan:</strong> {item.location || 'Madhya Pradesh'} • Grade: {item.qualityGrade || 'A'}
                    </p>

                    {item.description && (
                      <p className="text-xs text-muted mb-3" style={{ fontStyle: 'italic' }}>
                        "{item.description}"
                      </p>
                    )}
                  </div>

                  <div className="pt-3 border-t">
                    {isPhoneShown ? (
                      <a
                        href={`tel:${item.contactPhone}`}
                        className="btn btn-secondary btn-sm"
                        style={{ width: '100%', textDecoration: 'none' }}
                      >
                        📞 Call Karein: {item.contactPhone}
                      </a>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setRevealedPhoneId(id)}
                        className="btn btn-primary btn-sm"
                        style={{ width: '100%' }}
                      >
                        📞 Kisan Ka Phone Number Dekhein
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )
      ) : (
        /* My Listings Tab */
        myListings.length === 0 ? (
          <EmptyState
            icon="🏷️"
            title="Aapka koi vigyapan sakriya nahi hai"
            subtitle="Kisan bazaar me apni fasal ka vigyapan dalein aur behtar daam paayein."
            action={() => setModalOpen(true)}
            actionLabel="+ Fasal Bechein"
          />
        ) : (
          <div className="flex flex-col gap-3">
            {myListings.map((item, idx) => (
              <div key={item.id || item._id || idx} className="card p-4 flex-between items-center flex-wrap gap-2">
                <div>
                  <h4 className="font-bold text-base text-primary">
                    {item.crop} ({item.quantity} {item.unit})
                  </h4>
                  <p className="text-xs text-secondary mt-1">
                    Mang: {formatRupees(item.askingPrice, false)} • Sthaan: {item.location} • Phone: {item.contactPhone}
                  </p>
                </div>
                <div>
                  <button
                    type="button"
                    onClick={() => handleDeleteListing(item.id || item._id)}
                    className="btn btn-danger btn-sm"
                  >
                    🗑️ Vigyapan Hatayein
                  </button>
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {/* Create Listing Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="🛒 Bazaar Me Fasal Bikri Vigyapan Dalein"
      >
        <form onSubmit={handleCreateListing}>
          <div className="grid grid-2 gap-3">
            <div className="form-group">
              <label className="form-label">Fasal Ka Naam *</label>
              <input
                type="text"
                className="input"
                placeholder="Jaise: Gehu, Soyabean"
                value={newListing.crop}
                onChange={(e) => setNewListing({ ...newListing, crop: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Kism / Variety</label>
              <input
                type="text"
                className="input"
                placeholder="Jaise: Sharbati, Lokwan"
                value={newListing.variety}
                onChange={(e) => setNewListing({ ...newListing, variety: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-3 gap-3">
            <div className="form-group">
              <label className="form-label">Matra (Quantity) *</label>
              <input
                type="number"
                step="0.1"
                className="input"
                placeholder="50"
                value={newListing.quantity}
                onChange={(e) => setNewListing({ ...newListing, quantity: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Ikai (Unit)</label>
              <select
                className="select"
                value={newListing.unit}
                onChange={(e) => setNewListing({ ...newListing, unit: e.target.value })}
              >
                <option value="Quintal">Quintal (क्विंटल)</option>
                <option value="Bori">Bori (Bags)</option>
                <option value="Kg">Kg</option>
                <option value="Ton">Ton</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Maangi Gayi Keemat (₹) *</label>
              <input
                type="number"
                className="input"
                placeholder="2600"
                value={newListing.askingPrice}
                onChange={(e) => setNewListing({ ...newListing, askingPrice: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="grid grid-2 gap-3">
            <div className="form-group">
              <label className="form-label">Gunvatta Grade</label>
              <select
                className="select"
                value={newListing.qualityGrade}
                onChange={(e) => setNewListing({ ...newListing, qualityGrade: e.target.value })}
              >
                <option value="Grade A">Grade A (Super Quality)</option>
                <option value="Grade B">Grade B (FAQ Standard)</option>
                <option value="Grade C">Grade C (Medium)</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Sampark Phone Number *</label>
              <input
                type="tel"
                className="input"
                placeholder="10 digit mobile"
                value={newListing.contactPhone}
                onChange={(e) => setNewListing({ ...newListing, contactPhone: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Khet / Gaon / Jila (Location)</label>
            <input
              type="text"
              className="input"
              placeholder="Jaise: Gram Rehti, Jila Sehore, MP"
              value={newListing.location}
              onChange={(e) => setNewListing({ ...newListing, location: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Fasal Se Judi Jankari (Description)</label>
            <textarea
              className="textarea"
              placeholder="Jaise: Sukha saaf gehu hai, nami 10% se kam hai..."
              value={newListing.description}
              onChange={(e) => setNewListing({ ...newListing, description: e.target.value })}
              style={{ minHeight: '60px' }}
            />
          </div>

          <div className="flex justify-end gap-2 mt-4">
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => setModalOpen(false)}
            >
              Raddh Karein
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="btn btn-primary btn-sm"
            >
              {submitting ? '⏳ Vigyapan ban raha...' : '✓ Bazaar Me Vigyapan Dalein'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

export default MarketplacePage
