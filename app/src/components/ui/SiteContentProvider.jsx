import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { useToast } from './ToastProvider'
import { supabase, supabaseConfigured } from '../../supabase'
import { friendlyErrorMessage } from '../../utils/friendlyError'

const SiteContentContext = createContext({ sections: {}, refresh: async () => {} })

export function SiteContentProvider({ children }) {
  const [sections, setSections] = useState({})
  const errorToastShown = useRef(false)
  const showToast = useToast()

  const refresh = useCallback(async () => {
    if (!supabaseConfigured) return

    try {
      const { data: sectionRows, error: sectionError } = await supabase
        .from('site_content_sections')
        .select('section, is_managed, media_path, media_type')
      if (sectionError) throw sectionError

      const { data: contentRows, error: contentError } = await supabase
        .from('site_content')
        .select('id, section, slug, content, sort_order')
        .eq('is_published', true)
        .order('sort_order', { ascending: true })
      if (contentError) throw contentError

      const publishedBySection = (contentRows || []).reduce((result, row) => {
        result[row.section] ||= []
        result[row.section].push({ ...row.content, id: row.id, slug: row.slug, sort_order: row.sort_order })
        return result
      }, {})

      setSections(Object.fromEntries((sectionRows || []).map(({ section, is_managed, media_path, media_type }) => [
        section,
        { isManaged: is_managed, items: publishedBySection[section] || [], mediaPath: media_path, mediaType: media_type },
      ])))
      errorToastShown.current = false
    } catch (issue) {
      if (!errorToastShown.current) {
        const message = friendlyErrorMessage(issue, 'The published website content could not be loaded. The current built-in content is still available.')
        showToast({ tone: 'error', title: 'Could not load published content', message })
        errorToastShown.current = true
      }
    }
  }, [showToast])

  useEffect(() => {
    refresh()
  }, [refresh])

  return (
    <SiteContentContext.Provider value={{ sections, refresh }}>
      {children}
    </SiteContentContext.Provider>
  )
}

export function usePublishedContent(section, fallback) {
  const { sections } = useContext(SiteContentContext)
  const current = sections[section]
  if (!current?.isManaged) return fallback
  if (section === 'hero') return current.items[0] || fallback
  return current.items
}

export function useRefreshSiteContent() {
  return useContext(SiteContentContext).refresh
}

export function usePublishedHeroMedia() {
  const { sections } = useContext(SiteContentContext)
  const hero = sections.hero
  if (!hero?.mediaPath || !supabase) return null
  const { data } = supabase.storage.from('site-media').getPublicUrl(hero.mediaPath)
  return { path: hero.mediaPath, type: hero.mediaType || 'image', url: data.publicUrl }
}