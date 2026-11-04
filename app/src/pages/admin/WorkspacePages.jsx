import { ArrowUpRight, Image, MessageCircle, Settings, Sparkles, Star, Users } from 'lucide-react'
import { Link } from 'react-router-dom'
import Card from '../../components/ui/Card'

const modules = [
  { title: 'Hero', description: 'Headline, supporting text and main image', icon: Sparkles, state: 'Content editor' },
  { title: 'Services', description: 'Service descriptions, images and display order', icon: Settings, state: '4 published' },
  { title: 'Gallery', description: 'Project photos, before and after pairs', icon: Image, state: '6 published' },
  { title: 'Testimonials', description: 'Client stories and star ratings', icon: Star, state: '3 published' },
  { title: 'FAQs', description: 'Answers to common client questions', icon: MessageCircle, state: '4 published' },
]

export function ContentPage() {
  return <section className="workspace-page"><div className="admin-page-heading"><div><span className="eyebrow">KEEP IT FRESH</span><h1>Website content</h1><p>Small updates, a more welcoming first impression.</p></div><Link className="admin-action-button" to="/">Preview website <ArrowUpRight size={15} /></Link></div><div className="admin-demo-notice"><Sparkles size={16} /><span>Content editing will be enabled once Supabase is connected and its content tables are created.</span></div><div className="content-module-grid">{modules.map(({ title, description, icon: Icon, state }) => <Card className="content-module" key={title}><span className="content-module-icon"><Icon size={19} /></span><div><h2>{title}</h2><p>{description}</p></div><span className="content-module-state">{state}</span></Card>)}</div></section>
}

export function TeamPage() {
  return <section className="workspace-page"><div className="admin-page-heading"><div><span className="eyebrow">THE PEOPLE BEHIND THE POLISH</span><h1>Your team</h1><p>Keep the right people close to every request.</p></div><button className="admin-action-button" disabled><Users size={15} /> Invite team member</button></div><Card className="team-placeholder"><span className="content-module-icon"><Users size={21} /></span><h2>Team management is almost ready.</h2><p>Connect Supabase and configure the profiles table before inviting or managing users.</p></Card></section>
}
