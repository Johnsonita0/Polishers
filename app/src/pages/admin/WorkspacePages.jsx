import { useCallback, useEffect, useState } from 'react'
import { ArrowUpRight, Eye, EyeOff, Image, MessageCircle, Pencil, Plus, Save, Sparkles, Star, Trash2, Upload, Users, X } from 'lucide-react'
import { Link } from 'react-router-dom'
import Card from '../../components/ui/Card.jsx'
import SearchSelect from '../../components/ui/SearchSelect'
import { usePublishedHeroMedia, useRefreshSiteContent } from '../../components/ui/SiteContentProvider'
import { useToast } from '../../components/ui/ToastProvider'
import { faqs, gallery, services, testimonials } from '../../data'
import { supabase, supabaseConfigured } from '../../supabase'
import { friendlyErrorMessage } from '../../utils/friendlyError'

const modules = [
  { key: 'hero', title: 'Hero', description: 'Homepage headline and introduction', icon: Sparkles },
  { key: 'services', title: 'Services', description: 'Service descriptions and images', icon: Users },
  { key: 'gallery', title: 'Gallery', description: 'Published project photos', icon: Image },
  { key: 'testimonials', title: 'Testimonials', description: 'Client stories and star ratings', icon: Star },
  { key: 'faqs', title: 'FAQs', description: 'Answers to common client questions', icon: MessageCircle },
]

const defaultRows = {
  hero: [{ slug: 'main', content: { eyebrow: 'Residential · Commercial · Industrial · Post-construction', headline: 'Sparkling Space,', highlight: 'Happy Client.', body: 'Professional cleaning delivered with precision, reliability and class, for homes, offices, factories and estates of every size.' } }],
  services: services.map((content) => ({ slug: content.slug, content })),
  gallery: gallery.map((content, index) => ({ slug: `gallery-${index + 1}`, content })),
  testimonials: testimonials.map((content, index) => ({ slug: `testimonial-${index + 1}`, content })),
  faqs: faqs.map((content, index) => ({ slug: `faq-${index + 1}`, content })),
}

const fieldsBySection = {
  hero: [
    { key: 'eyebrow', label: 'Service list above the heading' },
    { key: 'headline', label: 'Main heading' },
    { key: 'highlight', label: 'Highlighted heading' },
    { key: 'body', label: 'Introduction', type: 'textarea' },
  ],
  services: [
    { key: 'title', label: 'Service name' },
    { key: 'short', label: 'Short description', type: 'textarea' },
    { key: 'description', label: 'Full description', type: 'textarea' },
    { key: 'image', label: 'Image URL', type: 'url' },
    { key: 'icon', label: 'Icon', type: 'icon' },
    { key: 'includes', label: 'Included tasks, one per line', type: 'lines' },
  ],
  gallery: [
    { key: 'title', label: 'Project title' },
    { key: 'category', label: 'Category', type: 'category' },
    { key: 'image', label: 'Image URL', type: 'url' },
  ],
  testimonials: [
    { key: 'name', label: 'Client name' },
    { key: 'role', label: 'Client role' },
    { key: 'quote', label: 'Client story', type: 'textarea' },
    { key: 'rating', label: 'Rating (1 to 5)', type: 'number' },
  ],
  faqs: [
    { key: 'question', label: 'Question' },
    { key: 'answer', label: 'Answer', type: 'textarea' },
  ],
}

const moduleByKey = Object.fromEntries(modules.map((module) => [module.key, module]))
const categoryOptions = ['Residential', 'Commercial', 'Industrial', 'Post-construction'].map((value) => ({ value, label: value }))
const iconOptions = ['Home', 'Building2', 'Factory', 'HardHat'].map((value) => ({ value, label: value }))
const heroMediaExtensions = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'video/mp4': 'mp4', 'video/webm': 'webm' }

function makeSlug(value) {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || `content-${Date.now()}`
}

function createDraft(section, row, sortOrder = 0) {
  const content = row?.content || {}
  return {
    ...Object.fromEntries((fieldsBySection[section] || []).map(({ key }) => [
      key,
      key === 'includes' ? (content[key] || []).join('\n') : content[key] ?? (key === 'rating' ? 5 : key === 'media_type' ? 'image' : ''),
    ])),
    id: row?.id || '',
    slug: row?.slug || '',
    is_published: row?.is_published ?? false,
    sort_order: row?.sort_order ?? sortOrder,
  }
}

export function ContentPage() {
  const [activeSection, setActiveSection] = useState('hero')
  const [rows, setRows] = useState([])
  const [expandedId, setExpandedId] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [mediaUploading, setMediaUploading] = useState(false)
  const [galleryUploading, setGalleryUploading] = useState(false)
  const [editing, setEditing] = useState(null)
  const [error, setError] = useState('')
  const showToast = useToast()
  const refreshSiteContent = useRefreshSiteContent()
  const heroMedia = usePublishedHeroMedia()

  const loadSection = useCallback(async (section, activeCheck = () => true) => {
    setLoading(true)
    setError('')
    if (!supabaseConfigured) {
      setError('Connect Supabase and run supabase-schema.sql to enable content editing.')
      setLoading(false)
      return
    }

    try {
      const { data: sectionState, error: stateError } = await supabase
        .from('site_content_sections')
        .select('is_managed')
        .eq('section', section)
        .maybeSingle()
      if (stateError) throw stateError

      if (!sectionState?.is_managed) {
        const { error: initializeError } = await supabase
          .from('site_content_sections')
          .upsert({ section, is_managed: false }, { onConflict: 'section' })
        if (initializeError) throw initializeError

        const defaults = (defaultRows[section] || []).map((item, index) => ({
          section,
          slug: item.slug,
          content: item.content,
          is_published: true,
          sort_order: index,
        }))
        if (defaults.length) {
          const { error: seedError } = await supabase
            .from('site_content')
            .upsert(defaults, { onConflict: 'section,slug', ignoreDuplicates: true })
          if (seedError) throw seedError
        }
        const { error: manageError } = await supabase
          .from('site_content_sections')
          .upsert({ section, is_managed: true }, { onConflict: 'section' })
        if (manageError) throw manageError
      }

      const { data, error: rowsError } = await supabase
        .from('site_content')
        .select('id, slug, content, is_published, sort_order, updated_at')
        .eq('section', section)
        .order('sort_order', { ascending: true })
      if (rowsError) throw rowsError
      if (!activeCheck()) return
      setRows(data || [])
      await refreshSiteContent()
    } catch (issue) {
      if (!activeCheck()) return
      const message = friendlyErrorMessage(issue, 'Website content could not be loaded. Check your connection and try again.')
      setError(message)
      showToast({ tone: 'error', title: 'Could not load content', message })
    } finally {
      if (activeCheck()) setLoading(false)
    }
  }, [refreshSiteContent, showToast])

  useEffect(() => {
    let active = true
    loadSection(activeSection, () => active)
    return () => { active = false }
  }, [activeSection, loadSection])

  async function uploadHeroMedia(event) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return

    const extension = heroMediaExtensions[file.type]
    const sizeLimit = file.type.startsWith('video/') ? 50 * 1024 * 1024 : 10 * 1024 * 1024
    if (!extension || file.size > sizeLimit) {
      const message = !extension
        ? 'Choose a JPG, PNG, WebP, MP4, or WebM file.'
        : file.type.startsWith('video/') ? 'Videos must be 50 MB or smaller.' : 'Images must be 10 MB or smaller.'
      showToast({ tone: 'error', title: 'Unsupported hero media', message })
      return
    }

    setMediaUploading(true)
    const path = `hero/${crypto.randomUUID()}.${extension}`
    let mediaSaved = false
    try {
      const { error: uploadError } = await supabase.storage.from('site-media').upload(path, file, { cacheControl: '3600', upsert: false })
      if (uploadError) throw uploadError

      const { data: userData, error: userError } = await supabase.auth.getUser()
      if (userError) throw userError
      const { error: updateError } = await supabase
        .from('site_content_sections')
        .update({ media_path: path, media_type: file.type.startsWith('video/') ? 'video' : 'image', media_updated_by: userData.user?.id || null })
        .eq('section', 'hero')
      if (updateError) throw updateError
      mediaSaved = true

      await refreshSiteContent()
      let cleanupFailed = false
      if (heroMedia?.path) {
        const { error: removeError } = await supabase.storage.from('site-media').remove([heroMedia.path])
        cleanupFailed = Boolean(removeError)
      }
      showToast({ tone: cleanupFailed ? 'info' : 'success', title: 'Hero media updated', message: cleanupFailed ? 'The new background is live, but the previous asset could not be removed.' : 'The new background media is now live. Hero text was not changed.' })
    } catch (issue) {
      if (!mediaSaved) await supabase.storage.from('site-media').remove([path])
      const message = friendlyErrorMessage(issue, 'Hero media could not be uploaded. Check your connection and try again.')
      showToast({ tone: 'error', title: 'Hero upload failed', message })
    } finally {
      setMediaUploading(false)
    }
  }

  async function removeHeroMedia() {
    if (!heroMedia?.path || mediaUploading) return
    setMediaUploading(true)
    try {
      const { error: updateError } = await supabase
        .from('site_content_sections')
        .update({ media_path: null, media_type: null })
        .eq('section', 'hero')
      if (updateError) throw updateError
      await refreshSiteContent()
      const { error: removeError } = await supabase.storage.from('site-media').remove([heroMedia.path])
      if (removeError) throw removeError
      showToast({ tone: 'success', title: 'Hero media removed', message: 'The built-in hero carousel is active again.' })
    } catch (issue) {
      const message = friendlyErrorMessage(issue, 'Hero media could not be removed. Try again.')
      showToast({ tone: 'error', title: 'Could not remove hero media', message })
    } finally {
      setMediaUploading(false)
    }
  }

  async function uploadGalleryImage(event) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return

    const extension = heroMediaExtensions[file.type]
    if (!extension || !file.type.startsWith('image/')) {
      showToast({ tone: 'error', title: 'Unsupported gallery image', message: 'Choose a JPG, PNG, or WebP image.' })
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      showToast({ tone: 'error', title: 'Image is too large', message: 'Gallery images must be 10 MB or smaller.' })
      return
    }

    setGalleryUploading(true)
    const path = `gallery/${crypto.randomUUID()}.${extension}`
    try {
      const { error: uploadError } = await supabase.storage.from('site-media').upload(path, file, { cacheControl: '3600', upsert: false })
      if (uploadError) throw uploadError
      const { data } = supabase.storage.from('site-media').getPublicUrl(path)
      setEditing((current) => current ? { ...current, image: data.publicUrl } : current)
      showToast({ tone: 'success', title: 'Gallery image uploaded', message: 'Save the gallery item to publish the new image.' })
    } catch (issue) {
      await supabase.storage.from('site-media').remove([path])
      const message = friendlyErrorMessage(issue, 'The gallery image could not be uploaded. Check your connection and try again.')
      showToast({ tone: 'error', title: 'Gallery upload failed', message })
    } finally {
      setGalleryUploading(false)
    }
  }

  async function saveContent(event) {
    event.preventDefault()
    setSaving(true)
    try {
      const values = Object.fromEntries((fieldsBySection[activeSection] || []).map(({ key }) => [key, editing[key]]))
      if (activeSection === 'services') values.includes = String(values.includes || '').split('\n').map((item) => item.trim()).filter(Boolean)
      if (activeSection === 'testimonials') values.rating = Math.min(5, Math.max(1, Number(values.rating) || 5))
      const identity = activeSection === 'hero' ? 'main' : editing.slug || makeSlug(values.title || values.question || values.name || '')
      const { data: userData, error: userError } = await supabase.auth.getUser()
      if (userError) throw userError
      const record = {
        section: activeSection,
        slug: identity,
        content: values,
        is_published: editing.is_published,
        sort_order: Number(editing.sort_order) || 0,
        updated_by: userData.user?.id || null,
      }
      const response = editing.id
        ? await supabase.from('site_content').update(record).eq('id', editing.id).select('id, slug, content, is_published, sort_order, updated_at').single()
        : await supabase.from('site_content').insert(record).select('id, slug, content, is_published, sort_order, updated_at').single()
      if (response.error) throw response.error
      setRows((current) => [...current.filter((row) => row.id !== response.data.id), response.data].sort((a, b) => a.sort_order - b.sort_order))
      setEditing(null)
      await refreshSiteContent()
      showToast({ tone: 'success', title: editing.is_published ? 'Content published' : 'Draft saved', message: editing.is_published ? 'Your changes are now live on the website.' : 'Your content is saved but not visible to visitors yet.' })
    } catch (issue) {
      const message = friendlyErrorMessage(issue, 'Your content could not be saved. Check your connection and try again.')
      showToast({ tone: 'error', title: 'Could not save content', message })
    } finally {
      setSaving(false)
    }
  }

  async function togglePublished(row) {
    try {
      const nextPublished = !row.is_published
      const { error: updateError } = await supabase.from('site_content').update({ is_published: nextPublished }).eq('id', row.id)
      if (updateError) throw updateError
      setRows((current) => current.map((item) => item.id === row.id ? { ...item, is_published: nextPublished } : item))
      await refreshSiteContent()
      showToast({ tone: 'success', title: nextPublished ? 'Published' : 'Unpublished', message: nextPublished ? 'This item is now visible on the website.' : 'This item is no longer visible to visitors.' })
    } catch (issue) {
      const message = friendlyErrorMessage(issue, 'The publish status could not be changed. Try again.')
      showToast({ tone: 'error', title: 'Could not update publishing', message })
    }
  }

  async function deleteContent(row) {
    const title = row.content.title || row.content.question || row.content.name || moduleByKey[activeSection].title
    if (!window.confirm(`Delete “${title}”? This cannot be undone.`)) return
    try {
      const { error: deleteError } = await supabase.from('site_content').delete().eq('id', row.id)
      if (deleteError) throw deleteError
      setRows((current) => current.filter((item) => item.id !== row.id))
      setExpandedId('')
      await refreshSiteContent()
      showToast({ tone: 'success', title: 'Content deleted', message: 'The item has been removed from the website.' })
    } catch (issue) {
      const message = friendlyErrorMessage(issue, 'This content could not be deleted. Try again.')
      showToast({ tone: 'error', title: 'Could not delete content', message })
    }
  }

  function updateDraft(key, value) {
    setEditing((current) => ({ ...current, [key]: value }))
  }

  const activeModule = moduleByKey[activeSection]
  const publishedCount = rows.filter((row) => row.is_published).length

  return <section className="workspace-page"><div className="admin-page-heading"><div><span className="eyebrow">KEEP IT FRESH</span><h1>Website content</h1><p>Edit sections, control what visitors see, and publish updates.</p></div><Link className="admin-action-button" to="/">Preview website <ArrowUpRight size={15} /></Link></div>
    {!supabaseConfigured && <div className="admin-demo-notice"><Sparkles size={16} /><span>Run <b>supabase-schema.sql</b> in your Supabase SQL Editor to enable editing and publishing.</span></div>}
    {error && <div className="admin-error-notice">{error}</div>}
    <div className="content-workspace">
      <nav className="content-section-nav" aria-label="Website sections">{modules.map(({ key, title, description, icon: Icon }) => <button type="button" className={activeSection === key ? 'content-section-tab is-active' : 'content-section-tab'} key={key} onClick={() => { setEditing(null); setActiveSection(key) }}><span className="content-module-icon"><Icon size={18} /></span><span className="content-section-tab-copy"><b>{title}</b><small>{description}</small></span><ArrowUpRight size={15} /></button>)}</nav>
      <div className="content-editor-panel"><div className="content-editor-heading"><div><span className="eyebrow">{activeModule.title}</span><h2>{publishedCount} published</h2><p>{rows.length - publishedCount} drafts</p></div><button className="admin-action-button" type="button" onClick={() => setEditing(createDraft(activeSection, null, rows.length))} disabled={loading || !supabaseConfigured}><Plus size={15} /> Add content</button></div>
        {activeSection === 'hero' && <section className="hero-media-control" aria-labelledby="hero-media-title"><div className="hero-media-copy"><span className="eyebrow">BACKGROUND MEDIA</span><h3 id="hero-media-title">Hero image or video</h3><p>Upload or replace the background without changing the hero text.</p></div>{heroMedia ? <div className="hero-media-preview">{heroMedia.type === 'video' ? <video src={heroMedia.url} controls muted playsInline /> : <img src={heroMedia.url} alt="Current hero background" />}</div> : <div className="hero-media-empty">Using the built-in hero carousel</div>}<div className="hero-media-actions"><label className="hero-media-upload"><Upload size={15} />{mediaUploading ? 'Uploading…' : heroMedia ? 'Replace media' : 'Upload media'}<input type="file" accept="image/jpeg,image/png,image/webp,video/mp4,video/webm" onChange={uploadHeroMedia} disabled={mediaUploading || !supabaseConfigured} /></label>{heroMedia && <button className="content-icon-action is-danger" type="button" onClick={removeHeroMedia} disabled={mediaUploading}><Trash2 size={15} /> Remove media</button>}<small>JPG, PNG, WebP up to 10 MB · MP4 or WebM up to 50 MB</small></div></section>}
        {loading ? <div className="admin-empty">Loading section…</div> : rows.length === 0 ? <div className="admin-empty"><span>✦</span><b>No content in this section</b><p>Add an item to start publishing.</p></div> : <div className="content-item-list">{rows.map((row) => <article className={expandedId === row.id ? 'content-item-row is-expanded' : 'content-item-row'} key={row.id}><button className="cms-item-summary" type="button" aria-expanded={expandedId === row.id} onClick={() => setExpandedId((current) => current === row.id ? '' : row.id)}><span className={row.is_published ? 'content-status is-published' : 'content-status'}>{row.is_published ? 'Published' : 'Draft'}</span><span className="cms-item-summary-copy"><b>{row.content.title || row.content.headline || row.content.question || row.content.name}</b><small>{row.content.short || row.content.body || row.content.answer || row.content.quote || row.content.description}</small></span><span className="cms-item-expand">{expandedId === row.id ? 'Hide details' : 'Details'} <ArrowUpRight size={14} /></span></button>{expandedId === row.id && <div className="cms-item-details">{row.content.image && <img src={row.content.image} alt="" loading="lazy" />}<p>{row.content.description || row.content.body || row.content.answer || row.content.quote || row.content.short || 'No description provided.'}</p>{Array.isArray(row.content.includes) && <ul>{row.content.includes.map((item) => <li key={item}>{item}</li>)}</ul>}<div className="cms-item-actions"><button className="content-icon-action" type="button" onClick={() => setEditing(createDraft(activeSection, row))}><Pencil size={15} /> Edit</button><button className="content-icon-action" type="button" onClick={() => togglePublished(row)}>{row.is_published ? <><EyeOff size={15} /> Unpublish</> : <><Eye size={15} /> Publish</>}</button><button className="content-icon-action is-danger" type="button" onClick={() => deleteContent(row)}><Trash2 size={15} /> Delete</button></div></div>}</article>)}</div>}
      </div>
    </div>
    {editing && <div className="cms-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !galleryUploading) setEditing(null) }}><section className="cms-editor-modal" role="dialog" aria-modal="true" aria-labelledby="cms-editor-title"><header><div><span className="eyebrow">{editing.id ? 'EDIT CONTENT' : 'NEW CONTENT'}</span><h2 id="cms-editor-title">{activeModule.title}</h2></div><button className="content-icon-action" type="button" aria-label="Close editor" onClick={() => setEditing(null)} disabled={galleryUploading}><X size={18} /></button></header><form onSubmit={saveContent}>{activeSection === 'gallery' && <div className="cms-gallery-upload"><div className="cms-gallery-upload-copy"><b>Gallery image</b><small>Upload an image or paste an image URL below.</small><label className="cms-gallery-upload-button"><Upload size={14} />{galleryUploading ? 'Uploading…' : 'Upload image'}<input type="file" accept="image/jpeg,image/png,image/webp" onChange={uploadGalleryImage} disabled={galleryUploading || !supabaseConfigured} /></label></div>{editing.image ? <img src={editing.image} alt="Gallery image preview" /> : <span className="cms-gallery-upload-empty">Image preview</span>}</div>}<div className="cms-editor-fields">{fieldsBySection[activeSection].map(({ key, label, type }) => <label className={type === 'textarea' || type === 'lines' ? 'cms-field cms-field-wide' : 'cms-field'} key={key}>{label}{type === 'textarea' || type === 'lines' ? <textarea required={!(activeSection === 'hero' && key === 'eyebrow')} rows={type === 'lines' ? 4 : 3} value={editing[key]} onChange={(event) => updateDraft(key, event.target.value)} placeholder={type === 'lines' ? 'One task per line' : ''} /> : type === 'category' || type === 'icon' ? <SearchSelect value={editing[key]} onChange={(value) => updateDraft(key, value)} options={type === 'category' ? categoryOptions : iconOptions} placeholder={`Choose ${label.toLowerCase()}`} /> : <input required type={type || 'text'} min={type === 'number' ? 1 : undefined} max={type === 'number' ? 5 : undefined} value={editing[key]} onChange={(event) => updateDraft(key, event.target.value)} />}</label>)}</div><div className="cms-editor-controls"><label className="cms-order-field">Display order<input type="number" min="0" value={editing.sort_order} onChange={(event) => updateDraft('sort_order', event.target.value)} /></label><label className="cms-publish-toggle"><input type="checkbox" checked={editing.is_published} onChange={(event) => updateDraft('is_published', event.target.checked)} /><span>{editing.is_published ? 'Publish this content' : 'Keep as draft'}</span></label></div><footer><button className="button button-quiet" type="button" onClick={() => setEditing(null)} disabled={galleryUploading}>Cancel</button><button className="button button-dark" type="submit" disabled={saving || galleryUploading}>{saving ? 'Saving…' : <><Save size={15} /> Save changes</>}</button></footer></form></section></div>}
  </section>
}

export function TeamPage() {
  return <section className="workspace-page"><div className="admin-page-heading"><div><span className="eyebrow">THE PEOPLE BEHIND THE POLISH</span><h1>Your team</h1><p>Keep the right people close to every request.</p></div><button className="admin-action-button" disabled><Users size={15} /> Invite team member</button></div><Card className="team-placeholder"><span className="content-module-icon"><Users size={21} /></span><h2>Team management is almost ready.</h2><p>Connect Supabase and configure the profiles table before inviting or managing users.</p></Card></section>
}
