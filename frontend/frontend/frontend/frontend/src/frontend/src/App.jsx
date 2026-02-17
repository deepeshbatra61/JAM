import { useState, useRef, useEffect } from "react";

// ─── Config ───────────────────────────────────────────────────────────────────
const API = "https://jam-production-31a1.up.railway.app";

// ─── Auth helpers ─────────────────────────────────────────────────────────────
const auth = {
  getToken: () => localStorage.getItem("jam_token"),
  getUser: () => ({
    name:   localStorage.getItem("jam_name")   || "User",
    email:  localStorage.getItem("jam_email")  || "",
    avatar: localStorage.getItem("jam_avatar") || "",
  }),
  isLoggedIn: () => !!localStorage.getItem("jam_token"),
  save: (token, name, email, avatar) => {
    localStorage.setItem("jam_token",  token);
    localStorage.setItem("jam_name",   decodeURIComponent(name  || ""));
    localStorage.setItem("jam_email",  decodeURIComponent(email || ""));
    localStorage.setItem("jam_avatar", decodeURIComponent(avatar|| ""));
  },
  logout: () => {
    ["jam_token","jam_name","jam_email","jam_avatar"].forEach(k => localStorage.removeItem(k));
    window.location.reload();
  },
};

// ─── API helpers ──────────────────────────────────────────────────────────────
async function apiFetch(path, options = {}) {
  const res = await fetch(`${API}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${auth.getToken()}`,
      ...(options.headers || {}),
    },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Request failed");
  return data;
}

const api = {
  getApplications: () => apiFetch("/applications").then(d => d.applications),
  createApplication: (body) => apiFetch("/applications", { method: "POST", body: JSON.stringify(body) }).then(d => d.application),
  updateApplication: (id, body) => apiFetch(`/applications/${id}`, { method: "PATCH", body: JSON.stringify(body) }).then(d => d.application),
  deleteApplication: (id) => apiFetch(`/applications/${id}`, { method: "DELETE" }),
  addTimeline: (id, description) => apiFetch(`/applications/${id}/timeline`, { method: "POST", body: JSON.stringify({ description, type: "note" }) }),
  syncGmail: () => apiFetch("/sync/gmail", { method: "POST" }),
};

// ─── Design tokens ────────────────────────────────────────────────────────────
const C = {
  bg: "#F6F0D7", bgDark: "#EDE7C6", card: "#FDFAF0", accent: "#C5D89D",
  accentDark: "#A8C278", accentDeep: "#7B9E5A", text: "#2C2716",
  textMuted: "#7A7360", textLight: "#A09880", border: "#E2D9B8",
  danger: "#E07B6A", dangerLight: "#F5D5D0", warning: "#D4A853",
  warningLight: "#F5EDCC",
};

const STATUS = {
  Applied:      { color: "#A09880", bg: "#EDE7C6" },
  Acknowledged: { color: "#D4A853", bg: "#F5EDCC" },
  Screening:    { color: "#7B8EC5", bg: "#D5DDEF" },
  Interview:    { color: "#C5A07B", bg: "#F0E3D0" },
  Offer:        { color: "#7BA05A", bg: "#D5EAC0" },
  Rejected:     { color: "#E07B6A", bg: "#F5D5D0" },
};

const SOURCES   = ["LinkedIn","Seek","Company Website","Referral","Indeed","Glassdoor","Recruiter","Other"];
const PRIORITIES = ["Dream Job","High","Medium","Backup"];

// ─── Helpers ──────────────────────────────────────────────────────────────────
const daysSince = d => Math.floor((Date.now() - new Date(d)) / 86400000);
const fmtDate   = d => new Date(d).toLocaleDateString("en-AU", { day:"numeric", month:"short", year:"numeric" });
const initials  = n => n.split(" ").map(w => w[0]).join("").toUpperCase().slice(0,2);

// ─── Atoms ────────────────────────────────────────────────────────────────────
function Badge({ status, lg }) {
  const s = STATUS[status] || STATUS.Applied;
  return <span style={{ background:s.bg, color:s.color, border:`1px solid ${s.color}40`, borderRadius:20, padding:lg?"5px 14px":"2px 10px", fontSize:lg?13:11, fontWeight:600, letterSpacing:"0.03em", display:"inline-block" }}>{status}</span>;
}

function Dot({ priority }) {
  const cols = { "Dream Job":C.accentDeep, "High":C.warning, "Medium":C.textMuted, "Backup":C.danger };
  return <span style={{ display:"inline-flex", alignItems:"center", gap:5, fontSize:11, color:C.textMuted }}>
    <span style={{ width:7, height:7, borderRadius:"50%", background:cols[priority]||"#999", display:"inline-block" }}/>
    {priority}
  </span>;
}

function Avatar({ company, size=40 }) {
  return <div style={{ width:size, height:size, borderRadius:10, background:`linear-gradient(135deg,${C.accentDark}30,${C.accent}60)`, border:`1.5px solid ${C.accentDark}40`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:size*.35, fontWeight:700, color:C.accentDeep, fontFamily:"'Playfair Display',serif", flexShrink:0 }}>
    {initials(company)}
  </div>;
}

const inp = { width:"100%", boxSizing:"border-box", padding:"9px 14px", borderRadius:10, border:`1.5px solid ${C.border}`, background:C.card, color:C.text, fontFamily:"'DM Sans',sans-serif", fontSize:13, outline:"none" };
const lbl = { display:"block", fontFamily:"'DM Sans',sans-serif", fontSize:11, fontWeight:600, color:C.textMuted, marginBottom:5, textTransform:"uppercase", letterSpacing:"0.06em" };

function Select({ value, onChange, options, placeholder="Select..." }) {
  const [open, setOpen] = useState(false);
  const ref = useRef();
  useEffect(() => {
    const h = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", h); return () => document.removeEventListener("mousedown", h);
  }, []);
  return <div ref={ref} style={{ position:"relative" }}>
    <button type="button" onClick={() => setOpen(!open)} style={{ width:"100%", padding:"9px 14px", borderRadius:10, border:`1.5px solid ${open?C.accentDark:C.border}`, background:C.card, color:value?C.text:C.textLight, fontFamily:"'DM Sans',sans-serif", fontSize:13, cursor:"pointer", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
      <span>{value||placeholder}</span>
      <span style={{ transform:open?"rotate(180deg)":"none", transition:"transform 0.2s", color:C.accentDeep }}>▾</span>
    </button>
    {open && <div style={{ position:"absolute", top:"calc(100% + 4px)", left:0, right:0, zIndex:200, background:C.card, borderRadius:12, border:`1.5px solid ${C.border}`, boxShadow:"0 8px 32px rgba(44,39,22,0.12)", overflow:"hidden" }}>
      {options.map(o => <button key={o} type="button" onClick={() => { onChange(o); setOpen(false); }} style={{ display:"block", width:"100%", padding:"9px 14px", textAlign:"left", background:value===o?`${C.accent}40`:"transparent", color:value===o?C.accentDeep:C.text, fontFamily:"'DM Sans',sans-serif", fontSize:13, border:"none", cursor:"pointer" }}>
        {value===o && <span style={{ marginRight:8, color:C.accentDeep }}>✓</span>}{o}
      </button>)}
    </div>}
  </div>;
}

function Stat({ label, value, sub, accent }) {
  return <div style={{ background:accent?C.accentDeep:C.card, border:`1.5px solid ${accent?"transparent":C.border}`, borderRadius:16, padding:"20px 22px", flex:1, minWidth:130 }}>
    <div style={{ fontFamily:"'Playfair Display',serif", fontSize:30, fontWeight:700, color:accent?"#fff":C.text, lineHeight:1 }}>{value}</div>
    <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:13, color:accent?"rgba(255,255,255,0.8)":C.textMuted, marginTop:5 }}>{label}</div>
    {sub && <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:11, color:accent?"rgba(255,255,255,0.55)":C.textLight, marginTop:2 }}>{sub}</div>}
  </div>;
}

// ─── Login Screen ─────────────────────────────────────────────────────────────
function LoginScreen() {
  return <div style={{ height:"100vh", background:C.bg, display:"flex", alignItems:"center", justifyContent:"center", flexDirection:"column" }}>
    <div style={{ textAlign:"center", marginBottom:48 }}>
      <div style={{ fontFamily:"'Playfair Display',serif", fontSize:72, fontWeight:700, color:C.accentDeep, letterSpacing:"-0.02em", lineHeight:1 }}>JAM</div>
      <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:14, color:C.textMuted, marginTop:8, letterSpacing:"0.06em", textTransform:"uppercase" }}>Job Application Manager</div>
      <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:13, color:C.textLight, marginTop:4 }}>Your pipeline, organised.</div>
    </div>
    <div style={{ background:C.card, borderRadius:20, padding:"40px 48px", border:`1.5px solid ${C.border}`, boxShadow:"0 8px 40px rgba(44,39,22,0.08)", textAlign:"center", maxWidth:360, width:"90%" }}>
      <h2 style={{ fontFamily:"'Playfair Display',serif", fontSize:22, color:C.text, margin:"0 0 8px" }}>Welcome back</h2>
      <p style={{ fontFamily:"'DM Sans',sans-serif", fontSize:13, color:C.textMuted, margin:"0 0 28px" }}>Sign in to access your job tracker</p>
      <a href={`${API}/auth/google`} style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:12, background:C.accentDeep, color:"#fff", borderRadius:12, padding:"13px 24px", fontFamily:"'DM Sans',sans-serif", fontSize:14, fontWeight:600, textDecoration:"none", transition:"all 0.2s" }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="white"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
        Sign in with Google
      </a>
      <p style={{ fontFamily:"'DM Sans',sans-serif", fontSize:11, color:C.textLight, marginTop:16 }}>Your Gmail data stays private and secure</p>
    </div>
  </div>;
}

// ─── Kanban Card ──────────────────────────────────────────────────────────────
function KCard({ app, onClick }) {
  const [hov, setHov] = useState(false);
  const days = daysSince(app.applied_date);
  return <div onClick={() => onClick(app)} onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)} style={{ background:C.card, border:`1.5px solid ${hov?C.accentDark:C.border}`, borderRadius:14, padding:"14px 16px", cursor:"pointer", transition:"all 0.18s", transform:hov?"translateY(-2px)":"none", boxShadow:hov?"0 8px 24px rgba(44,39,22,0.1)":"0 2px 8px rgba(44,39,22,0.04)", marginBottom:10 }}>
    <div style={{ display:"flex", gap:10, alignItems:"flex-start", marginBottom:10 }}>
      <Avatar company={app.company} size={34}/>
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ fontFamily:"'Playfair Display',serif", fontSize:14, fontWeight:600, color:C.text, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{app.company}</div>
        <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:12, color:C.textMuted, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{app.role}</div>
      </div>
    </div>
    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
      <Dot priority={app.priority}/>
      <span style={{ fontFamily:"'DM Sans',sans-serif", fontSize:11, color:C.textLight }}>{days===0?"Today":`${days}d ago`}</span>
    </div>
    {app.salary && <div style={{ marginTop:8, paddingTop:8, borderTop:`1px solid ${C.border}`, fontFamily:"'DM Sans',sans-serif", fontSize:11, color:C.textMuted }}>{app.salary}</div>}
  </div>;
}

// ─── Add Modal ────────────────────────────────────────────────────────────────
function AddModal({ onClose, onAdd }) {
  const [f, setF] = useState({ company:"", role:"", source:"", salary:"", priority:"Medium", url:"", recruiter_name:"", recruiter_email:"", recruiter_phone:"", notes:"" });
  const [loading, setLoading] = useState(false);
  const set = (k,v) => setF(p => ({ ...p, [k]:v }));

  async function submit(e) {
    e.preventDefault();
    if (!f.company || !f.role) return;
    setLoading(true);
    try {
      const app = await api.createApplication(f);
      onAdd(app);
      onClose();
    } catch (err) {
      alert("Error: " + err.message);
    } finally {
      setLoading(false);
    }
  }

  return <div onClick={onClose} style={{ position:"fixed", inset:0, background:"rgba(44,39,22,0.35)", backdropFilter:"blur(4px)", zIndex:300, display:"flex", alignItems:"center", justifyContent:"center" }}>
    <div onClick={e => e.stopPropagation()} style={{ background:C.bg, borderRadius:20, width:"90%", maxWidth:560, maxHeight:"90vh", overflowY:"auto", boxShadow:"0 24px 80px rgba(44,39,22,0.2)", border:`1.5px solid ${C.border}` }}>
      <div style={{ padding:"26px 30px 18px", borderBottom:`1px solid ${C.border}`, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
        <div>
          <h2 style={{ fontFamily:"'Playfair Display',serif", fontSize:22, color:C.text, margin:0 }}>Log Application</h2>
          <p style={{ fontFamily:"'DM Sans',sans-serif", fontSize:13, color:C.textMuted, margin:"4px 0 0" }}>Add a new application to your JAM tracker</p>
        </div>
        <button onClick={onClose} style={{ background:C.bgDark, border:"none", borderRadius:8, width:32, height:32, cursor:"pointer", color:C.textMuted, fontSize:15 }}>✕</button>
      </div>
      <form onSubmit={submit} style={{ padding:"22px 30px 28px" }}>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14, marginBottom:14 }}>
          <div style={{ gridColumn:"1/-1" }}><label style={lbl}>Company Name *</label><input required value={f.company} onChange={e => set("company", e.target.value)} placeholder="e.g. Atlassian" style={inp}/></div>
          <div style={{ gridColumn:"1/-1" }}><label style={lbl}>Role Title *</label><input required value={f.role} onChange={e => set("role", e.target.value)} placeholder="e.g. Account Manager" style={inp}/></div>
          <div><label style={lbl}>Source</label><Select value={f.source} onChange={v => set("source",v)} options={SOURCES} placeholder="Where did you apply?"/></div>
          <div><label style={lbl}>Priority</label><Select value={f.priority} onChange={v => set("priority",v)} options={PRIORITIES}/></div>
          <div style={{ gridColumn:"1/-1" }}><label style={lbl}>Salary Range</label><input value={f.salary} onChange={e => set("salary",e.target.value)} placeholder="e.g. $100k – $120k" style={inp}/></div>
          <div style={{ gridColumn:"1/-1" }}><label style={lbl}>Job URL</label><input value={f.url} onChange={e => set("url",e.target.value)} placeholder="https://..." style={inp}/></div>
        </div>
        <div style={{ background:C.bgDark, borderRadius:12, padding:"14px", marginBottom:14 }}>
          <p style={{ fontFamily:"'DM Sans',sans-serif", fontSize:11, fontWeight:600, color:C.textMuted, margin:"0 0 10px", textTransform:"uppercase", letterSpacing:"0.08em" }}>Recruiter Details (optional)</p>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
            <div style={{ gridColumn:"1/-1" }}><label style={lbl}>Name</label><input value={f.recruiter_name} onChange={e => set("recruiter_name",e.target.value)} placeholder="Recruiter name" style={inp}/></div>
            <div><label style={lbl}>Email</label><input value={f.recruiter_email} onChange={e => set("recruiter_email",e.target.value)} placeholder="email@company.com" style={inp}/></div>
            <div><label style={lbl}>Phone</label><input value={f.recruiter_phone} onChange={e => set("recruiter_phone",e.target.value)} placeholder="+61 4xx xxx xxx" style={inp}/></div>
          </div>
        </div>
        <div style={{ marginBottom:20 }}><label style={lbl}>Notes</label><textarea value={f.notes} onChange={e => set("notes",e.target.value)} rows={3} placeholder="Anything worth remembering..." style={{ ...inp, resize:"vertical", lineHeight:1.5 }}/></div>
        <div style={{ display:"flex", gap:10 }}>
          <button type="button" onClick={onClose} style={{ flex:1, padding:"11px", borderRadius:10, border:`1.5px solid ${C.border}`, background:"transparent", color:C.textMuted, fontFamily:"'DM Sans',sans-serif", fontSize:14, cursor:"pointer" }}>Cancel</button>
          <button type="submit" disabled={loading} style={{ flex:2, padding:"11px", borderRadius:10, border:"none", background:C.accentDeep, color:"#fff", fontFamily:"'DM Sans',sans-serif", fontSize:14, fontWeight:600, cursor:"pointer", opacity:loading?0.7:1 }}>{loading?"Adding...":"Add to JAM ✦"}</button>
        </div>
      </form>
    </div>
  </div>;
}

// ─── Detail Panel ─────────────────────────────────────────────────────────────
function Detail({ app, onClose, onStatusChange }) {
  const [status, setStatus] = useState(app.status);
  const [copied, setCopied] = useState(false);

  async function changeStatus(s) {
    setStatus(s);
    onStatusChange(app.id, s);
    try { await api.updateApplication(app.id, { status: s }); } catch(e) { console.error(e); }
  }

  const timeline = app.timeline_events || [];
  const followUp = `Hi ${app.recruiter_name||"there"},\n\nI hope you're well. I wanted to follow up on my application for the ${app.role} position at ${app.company}, submitted on ${fmtDate(app.applied_date)}.\n\nI remain very interested in the opportunity and would love to discuss next steps at your convenience.\n\nBest regards`;

  function copyFU() { navigator.clipboard?.writeText(followUp); setCopied(true); setTimeout(() => setCopied(false), 2000); }

  return <div onClick={onClose} style={{ position:"fixed", inset:0, background:"rgba(44,39,22,0.3)", backdropFilter:"blur(3px)", zIndex:250, display:"flex", justifyContent:"flex-end" }}>
    <div onClick={e => e.stopPropagation()} style={{ width:"min(500px,95vw)", background:C.bg, height:"100%", overflowY:"auto", boxShadow:"-8px 0 48px rgba(44,39,22,0.15)", borderLeft:`1.5px solid ${C.border}` }}>
      <div style={{ padding:"24px 26px 18px", borderBottom:`1px solid ${C.border}`, position:"sticky", top:0, background:C.bg, zIndex:10 }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
          <div style={{ display:"flex", gap:12, alignItems:"center" }}>
            <Avatar company={app.company} size={46}/>
            <div>
              <h2 style={{ fontFamily:"'Playfair Display',serif", fontSize:20, color:C.text, margin:0 }}>{app.company}</h2>
              <p style={{ fontFamily:"'DM Sans',sans-serif", fontSize:13, color:C.textMuted, margin:"3px 0 0" }}>{app.role}</p>
            </div>
          </div>
          <button onClick={onClose} style={{ background:C.bgDark, border:"none", borderRadius:8, width:32, height:32, cursor:"pointer", color:C.textMuted, fontSize:15, flexShrink:0 }}>✕</button>
        </div>
        <div style={{ display:"flex", gap:10, marginTop:14, flexWrap:"wrap", alignItems:"center" }}>
          <Badge status={status} lg/>
          <Dot priority={app.priority}/>
          <span style={{ fontFamily:"'DM Sans',sans-serif", fontSize:12, color:C.textLight }}>Applied {fmtDate(app.applied_date)}</span>
        </div>
      </div>
      <div style={{ padding:"22px 26px" }}>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10, marginBottom:22 }}>
          {[{ l:"Days Active", v:daysSince(app.applied_date) }, { l:"Touchpoints", v:timeline.length }, { l:"Source", v:app.source||"—" }].map(s => (
            <div key={s.l} style={{ background:C.bgDark, borderRadius:12, padding:"12px", textAlign:"center" }}>
              <div style={{ fontFamily:"'Playfair Display',serif", fontSize:22, fontWeight:700, color:C.text }}>{s.v}</div>
              <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:11, color:C.textMuted, marginTop:2 }}>{s.l}</div>
            </div>
          ))}
        </div>
        <div style={{ marginBottom:22 }}>
          <p style={{ ...lbl, marginBottom:10 }}>Update Status</p>
          <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
            {Object.keys(STATUS).map(s => {
              const cfg = STATUS[s]; const active = status===s;
              return <button key={s} onClick={() => changeStatus(s)} style={{ padding:"6px 12px", borderRadius:20, border:`1.5px solid ${active?cfg.color:C.border}`, background:active?cfg.bg:"transparent", color:active?cfg.color:C.textMuted, fontFamily:"'DM Sans',sans-serif", fontSize:12, fontWeight:active?600:400, cursor:"pointer", transition:"all 0.15s" }}>{s}</button>;
            })}
          </div>
        </div>
        {(app.recruiter_name||app.recruiter_email||app.recruiter_phone) && <div style={{ background:C.bgDark, borderRadius:14, padding:"14px 16px", marginBottom:18 }}>
          <p style={{ ...lbl, marginBottom:10 }}>Recruiter</p>
          {app.recruiter_name  && <p style={{ fontFamily:"'DM Sans',sans-serif", fontSize:14, color:C.text, margin:"0 0 4px", fontWeight:600 }}>{app.recruiter_name}</p>}
          {app.recruiter_email && <p style={{ fontFamily:"'DM Sans',sans-serif", fontSize:13, color:C.accentDeep, margin:"0 0 4px" }}>✉ {app.recruiter_email}</p>}
          {app.recruiter_phone && <p style={{ fontFamily:"'DM Sans',sans-serif", fontSize:13, color:C.accentDeep, margin:0 }}>📞 {app.recruiter_phone}</p>}
        </div>}
        {app.salary && <div style={{ display:"flex", justifyContent:"space-between", padding:"10px 0", borderBottom:`1px solid ${C.border}` }}>
          <span style={{ fontFamily:"'DM Sans',sans-serif", fontSize:13, color:C.textMuted }}>Salary</span>
          <span style={{ fontFamily:"'DM Sans',sans-serif", fontSize:13, color:C.text, fontWeight:600 }}>{app.salary}</span>
        </div>}
        {app.notes && <div style={{ background:`${C.accent}25`, border:`1px solid ${C.accent}`, borderRadius:12, padding:"13px 15px", margin:"18px 0" }}>
          <p style={{ ...lbl, marginBottom:6 }}>Notes</p>
          <p style={{ fontFamily:"'DM Sans',sans-serif", fontSize:13, color:C.text, margin:0, lineHeight:1.6 }}>{app.notes}</p>
        </div>}
        <div style={{ marginTop:20 }}>
          <p style={lbl}>Timeline</p>
          {timeline.length === 0 && <p style={{ fontFamily:"'DM Sans',sans-serif", fontSize:13, color:C.textLight }}>No events yet.</p>}
          {timeline.map((ev, i) => (
            <div key={ev.id} style={{ display:"flex", gap:12, marginBottom:14 }}>
              <div style={{ display:"flex", flexDirection:"column", alignItems:"center", flexShrink:0 }}>
                <div style={{ width:10, height:10, borderRadius:"50%", background:C.accentDark, border:`2px solid ${C.bg}`, marginTop:3 }}/>
                {i < timeline.length-1 && <div style={{ width:1, flex:1, background:C.border, marginTop:4 }}/>}
              </div>
              <div style={{ paddingBottom:4 }}>
                <p style={{ fontFamily:"'DM Sans',sans-serif", fontSize:13, color:C.text, margin:"0 0 2px" }}>{ev.description}</p>
                <p style={{ fontFamily:"'DM Sans',sans-serif", fontSize:11, color:C.textLight, margin:0 }}>{fmtDate(ev.date)}</p>
              </div>
            </div>
          ))}
        </div>
        <div style={{ marginTop:22, background:C.bgDark, borderRadius:14, padding:"16px" }}>
          <p style={{ ...lbl, marginBottom:10 }}>Follow-Up Template</p>
          <pre style={{ fontFamily:"'DM Sans',sans-serif", fontSize:12, color:C.textMuted, whiteSpace:"pre-wrap", margin:0, lineHeight:1.6 }}>{followUp}</pre>
          <button onClick={copyFU} style={{ marginTop:12, padding:"8px 16px", borderRadius:8, border:`1.5px solid ${C.accentDark}`, background:copied?C.accentDeep:"transparent", color:copied?"#fff":C.accentDeep, fontFamily:"'DM Sans',sans-serif", fontSize:12, fontWeight:600, cursor:"pointer", transition:"all 0.2s" }}>
            {copied?"Copied! ✓":"Copy to Clipboard ✦"}
          </button>
        </div>
      </div>
    </div>
  </div>;
}

// ─── Dashboard ────────────────────────────────────────────────────────────────
function Dashboard({ apps, onCard, onAdd }) {
  const total     = apps.length;
  const responded = apps.filter(a => a.status !== "Applied").length;
  const rate      = total ? Math.round(responded/total*100) : 0;
  const stale     = apps.filter(a => ["Applied","Acknowledged"].includes(a.status) && daysSince(a.applied_date) >= 14).length;
  const user      = auth.getUser();

  return <div>
    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:26, flexWrap:"wrap", gap:12 }}>
      <div>
        <h2 style={{ fontFamily:"'Playfair Display',serif", fontSize:26, color:C.text, margin:"0 0 4px" }}>Good day, {user.name.split(" ")[0]} ✦</h2>
        <p style={{ fontFamily:"'DM Sans',sans-serif", fontSize:14, color:C.textMuted, margin:0 }}>Your pipeline at a glance</p>
      </div>
      <div style={{ display:"flex", gap:10, alignItems:"center", flexWrap:"wrap" }}>
        {stale > 0 && <div style={{ background:C.dangerLight, border:`1px solid ${C.danger}30`, borderRadius:10, padding:"8px 14px", fontFamily:"'DM Sans',sans-serif", fontSize:12, color:C.danger, fontWeight:600 }}>⚠ {stale} follow-up{stale>1?"s":""} overdue</div>}
        <button onClick={onAdd} style={{ background:C.accentDeep, color:"#fff", border:"none", borderRadius:12, padding:"10px 20px", fontFamily:"'DM Sans',sans-serif", fontSize:13, fontWeight:600, cursor:"pointer" }}>+ Log Application</button>
      </div>
    </div>
    <div style={{ display:"flex", gap:12, marginBottom:26, flexWrap:"wrap" }}>
      <Stat label="Total Applied"   value={total}     sub="all time"/>
      <Stat label="Response Rate"   value={`${rate}%`} sub={`${responded} responded`}/>
      <Stat label="Active Pipeline" value={apps.filter(a => a.status !== "Rejected").length} sub="in progress" accent/>
      <Stat label="Offers"          value={apps.filter(a => a.status === "Offer").length} sub="received"/>
    </div>
    <div style={{ overflowX:"auto", paddingBottom:8 }}>
      <div style={{ display:"flex", gap:14, minWidth:"max-content" }}>
        {Object.keys(STATUS).map(s => {
          const col = apps.filter(a => a.status === s);
          const cfg = STATUS[s];
          return <div key={s} style={{ width:215, flexShrink:0 }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
              <div style={{ display:"flex", alignItems:"center", gap:7 }}>
                <div style={{ width:8, height:8, borderRadius:"50%", background:cfg.color }}/>
                <span style={{ fontFamily:"'DM Sans',sans-serif", fontSize:11, fontWeight:700, color:C.text, textTransform:"uppercase", letterSpacing:"0.06em" }}>{s}</span>
              </div>
              <span style={{ fontFamily:"'DM Sans',sans-serif", fontSize:12, color:C.textMuted, background:C.bgDark, borderRadius:8, padding:"2px 8px" }}>{col.length}</span>
            </div>
            <div style={{ minHeight:60 }}>
              {col.map(app => <KCard key={app.id} app={app} onClick={onCard}/>)}
              {col.length === 0 && <div style={{ border:`1.5px dashed ${C.border}`, borderRadius:12, padding:"20px 0", textAlign:"center" }}>
                <span style={{ fontFamily:"'DM Sans',sans-serif", fontSize:12, color:C.textLight }}>None yet</span>
              </div>}
            </div>
          </div>;
        })}
      </div>
    </div>
  </div>;
}

// ─── Analytics ────────────────────────────────────────────────────────────────
function Analytics({ apps }) {
  const total     = apps.length || 1;
  const responded = apps.filter(a => a.status !== "Applied").length;
  const byStatus  = Object.fromEntries(Object.keys(STATUS).map(s => [s, apps.filter(a => a.status===s).length]));
  const bySrc     = Object.fromEntries(SOURCES.map(s => [s, apps.filter(a => a.source===s).length]));
  const maxSrc    = Math.max(...Object.values(bySrc), 1);

  return <div>
    <div style={{ marginBottom:26 }}>
      <h2 style={{ fontFamily:"'Playfair Display',serif", fontSize:26, color:C.text, margin:"0 0 4px" }}>Analytics</h2>
      <p style={{ fontFamily:"'DM Sans',sans-serif", fontSize:14, color:C.textMuted, margin:0 }}>Your application performance at a glance</p>
    </div>
    <div style={{ display:"flex", gap:12, marginBottom:24, flexWrap:"wrap" }}>
      <Stat label="Total Applications" value={apps.length}/>
      <Stat label="Response Rate" value={`${apps.length?Math.round(responded/apps.length*100):0}%`} sub={`${responded} of ${apps.length}`}/>
      <Stat label="Active Pipeline" value={apps.filter(a => !["Rejected","Offer"].includes(a.status)).length} accent/>
    </div>
    <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:18, marginBottom:18 }}>
      <div style={{ background:C.card, borderRadius:16, border:`1.5px solid ${C.border}`, padding:"20px 22px" }}>
        <h3 style={{ fontFamily:"'Playfair Display',serif", fontSize:16, color:C.text, margin:"0 0 16px" }}>Application Funnel</h3>
        {Object.entries(STATUS).map(([s, cfg]) => {
          const n = byStatus[s]||0;
          return <div key={s} style={{ marginBottom:12 }}>
            <div style={{ display:"flex", justifyContent:"space-between", marginBottom:5 }}>
              <span style={{ fontFamily:"'DM Sans',sans-serif", fontSize:12, color:C.textMuted }}>{s}</span>
              <span style={{ fontFamily:"'DM Sans',sans-serif", fontSize:12, fontWeight:600, color:C.text }}>{n}</span>
            </div>
            <div style={{ height:6, background:C.bgDark, borderRadius:6, overflow:"hidden" }}>
              <div style={{ height:"100%", width:`${Math.round(n/total*100)}%`, background:cfg.color, borderRadius:6 }}/>
            </div>
          </div>;
        })}
      </div>
      <div style={{ background:C.card, borderRadius:16, border:`1.5px solid ${C.border}`, padding:"20px 22px" }}>
        <h3 style={{ fontFamily:"'Playfair Display',serif", fontSize:16, color:C.text, margin:"0 0 16px" }}>By Source</h3>
        {Object.entries(bySrc).filter(([,v]) => v>0).sort((a,b) => b[1]-a[1]).map(([s,n]) => (
          <div key={s} style={{ marginBottom:12 }}>
            <div style={{ display:"flex", justifyContent:"space-between", marginBottom:5 }}>
              <span style={{ fontFamily:"'DM Sans',sans-serif", fontSize:12, color:C.textMuted }}>{s}</span>
              <span style={{ fontFamily:"'DM Sans',sans-serif", fontSize:12, fontWeight:600, color:C.text }}>{n}</span>
            </div>
            <div style={{ height:6, background:C.bgDark, borderRadius:6, overflow:"hidden" }}>
              <div style={{ height:"100%", width:`${n/maxSrc*100}%`, background:C.accentDark, borderRadius:6 }}/>
            </div>
          </div>
        ))}
        {Object.values(bySrc).every(v => v===0) && <p style={{ fontFamily:"'DM Sans',sans-serif", fontSize:13, color:C.textLight }}>No data yet.</p>}
      </div>
    </div>
  </div>;
}

// ─── Radar ────────────────────────────────────────────────────────────────────
function Radar({ apps }) {
  const overdue  = apps.filter(a => ["Applied","Acknowledged"].includes(a.status) && daysSince(a.applied_date) >= 14);
  const upcoming = apps.filter(a => ["Applied","Acknowledged"].includes(a.status) && daysSince(a.applied_date) >= 7 && daysSince(a.applied_date) < 14);

  function Row({ app, color, borderColor }) {
    return <div style={{ background:C.card, border:`1.5px solid ${borderColor}`, borderLeft:`4px solid ${color}`, borderRadius:12, padding:"13px 16px", marginBottom:10, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
      <div style={{ display:"flex", gap:12, alignItems:"center" }}>
        <Avatar company={app.company} size={34}/>
        <div>
          <p style={{ fontFamily:"'Playfair Display',serif", fontSize:14, fontWeight:600, color:C.text, margin:0 }}>{app.company}</p>
          <p style={{ fontFamily:"'DM Sans',sans-serif", fontSize:12, color:C.textMuted, margin:"2px 0 0" }}>{app.role}</p>
        </div>
      </div>
      <div style={{ textAlign:"right" }}>
        <p style={{ fontFamily:"'DM Sans',sans-serif", fontSize:13, fontWeight:700, color, margin:0 }}>{daysSince(app.applied_date)} days</p>
        <p style={{ fontFamily:"'DM Sans',sans-serif", fontSize:11, color:C.textMuted, margin:"2px 0 0" }}>{fmtDate(app.applied_date)}</p>
      </div>
    </div>;
  }

  return <div>
    <div style={{ marginBottom:26 }}>
      <h2 style={{ fontFamily:"'Playfair Display',serif", fontSize:26, color:C.text, margin:"0 0 4px" }}>Follow-Up Radar</h2>
      <p style={{ fontFamily:"'DM Sans',sans-serif", fontSize:14, color:C.textMuted, margin:0 }}>Companies waiting for your nudge</p>
    </div>
    {overdue.length > 0 && <div style={{ marginBottom:22 }}>
      <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:12 }}>
        <span style={{ fontFamily:"'DM Sans',sans-serif", fontSize:12, fontWeight:700, color:C.danger, textTransform:"uppercase", letterSpacing:"0.06em" }}>⚠ Overdue</span>
        <span style={{ fontFamily:"'DM Sans',sans-serif", fontSize:12, color:C.textMuted }}>14+ days, no response</span>
      </div>
      {overdue.map(a => <Row key={a.id} app={a} color={C.danger} borderColor={C.dangerLight}/>)}
    </div>}
    {upcoming.length > 0 && <div style={{ marginBottom:22 }}>
      <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:12 }}>
        <span style={{ fontFamily:"'DM Sans',sans-serif", fontSize:12, fontWeight:700, color:C.warning, textTransform:"uppercase", letterSpacing:"0.06em" }}>◑ Coming Up</span>
        <span style={{ fontFamily:"'DM Sans',sans-serif", fontSize:12, color:C.textMuted }}>7–13 days, follow up soon</span>
      </div>
      {upcoming.map(a => <Row key={a.id} app={a} color={C.warning} borderColor={C.warningLight}/>)}
    </div>}
    {overdue.length === 0 && upcoming.length === 0 && <div style={{ textAlign:"center", padding:"60px 20px" }}>
      <div style={{ fontSize:44, marginBottom:12 }}>✦</div>
      <p style={{ fontFamily:"'Playfair Display',serif", fontSize:20, color:C.text }}>You're all caught up</p>
      <p style={{ fontFamily:"'DM Sans',sans-serif", fontSize:14, color:C.textMuted }}>No follow-ups needed right now.</p>
    </div>}
  </div>;
}

// ─── App Shell ────────────────────────────────────────────────────────────────
export default function App() {
  const [loggedIn, setLoggedIn] = useState(auth.isLoggedIn());
  const [apps,     setApps]     = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [page,     setPage]     = useState("dashboard");
  const [selected, setSelected] = useState(null);
  const [showAdd,  setShowAdd]  = useState(false);
  const [syncing,  setSyncing]  = useState(false);

  // Handle OAuth callback — read token from URL params
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token  = params.get("token");
    if (token) {
      auth.save(token, params.get("name"), params.get("email"), params.get("avatar"));
      window.history.replaceState({}, "", window.location.pathname);
      setLoggedIn(true);
    }
  }, []);

  // Fetch applications once logged in
  useEffect(() => {
    if (!loggedIn) { setLoading(false); return; }
    api.getApplications()
      .then(data => { setApps(data || []); setLoading(false); })
      .catch(() => { setLoading(false); });
  }, [loggedIn]);

  async function handleSync() {
    setSyncing(true);
    try {
      await api.syncGmail();
      // Reload apps after a short delay to let backend process
      setTimeout(async () => {
        const fresh = await api.getApplications();
        setApps(fresh || []);
        setSyncing(false);
      }, 3000);
    } catch (e) {
      setSyncing(false);
    }
  }

  function handleStatusChange(id, status) {
    setApps(p => p.map(a => a.id === id ? { ...a, status } : a));
  }

  function handleAdd(app) {
    setApps(p => [app, ...p]);
  }

  const stale = apps.filter(a => ["Applied","Acknowledged"].includes(a.status) && daysSince(a.applied_date) >= 14).length;
  const NAV = [
    { id:"dashboard", label:"Dashboard",       icon:"⊞" },
    { id:"analytics", label:"Analytics",       icon:"◈" },
    { id:"radar",     label:"Follow-Up Radar", icon:"◉" },
  ];

  if (!loggedIn) return <><style>{`@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&family=DM+Sans:wght@300;400;500;600;700&display=swap');*{box-sizing:border-box;margin:0;padding:0;}body{background:#F6F0D7;}`}</style><LoginScreen/></>;

  if (loading) return <><style>{`@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&family=DM+Sans:wght@300;400;500;600;700&display=swap');*{box-sizing:border-box;margin:0;padding:0;}body{background:#F6F0D7;}`}</style>
    <div style={{ height:"100vh", display:"flex", alignItems:"center", justifyContent:"center", background:C.bg }}>
      <div style={{ fontFamily:"'Playfair Display',serif", fontSize:32, color:C.accentDeep }}>JAM</div>
    </div></>;

  return <>
    <style>{`@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&family=DM+Sans:wght@300;400;500;600;700&display=swap');*{box-sizing:border-box;margin:0;padding:0;}body{background:#F6F0D7;font-family:'DM Sans',sans-serif;}::-webkit-scrollbar{width:5px;height:5px;}::-webkit-scrollbar-thumb{background:#C5D89D;border-radius:3px;}@keyframes fadeIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    <div style={{ display:"flex", height:"100vh", background:C.bg, animation:"fadeIn 0.35s ease" }}>

      {/* Sidebar */}
      <aside style={{ width:228, flexShrink:0, background:C.card, borderRight:`1.5px solid ${C.border}`, display:"flex", flexDirection:"column", padding:"28px 0" }}>
        <div style={{ padding:"0 22px 24px", borderBottom:`1px solid ${C.border}` }}>
          <div style={{ display:"flex", alignItems:"flex-end", gap:6 }}>
            <span style={{ fontFamily:"'Playfair Display',serif", fontSize:36, fontWeight:700, color:C.accentDeep, letterSpacing:"-0.02em", lineHeight:1 }}>JAM</span>
            <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:8, color:C.textLight, textTransform:"uppercase", letterSpacing:"0.08em", lineHeight:1.35, paddingBottom:4 }}>Job Application<br/>Manager</div>
          </div>
          <p style={{ fontFamily:"'DM Sans',sans-serif", fontSize:11, color:C.textLight, marginTop:4 }}>Your pipeline, organised.</p>
        </div>

        {/* Gmail Sync */}
        <div style={{ padding:"16px 14px", borderBottom:`1px solid ${C.border}` }}>
          <button onClick={handleSync} style={{ width:"100%", padding:"9px 14px", borderRadius:12, border:`1.5px solid ${syncing?C.accentDark:C.border}`, background:syncing?`${C.accent}30`:C.bgDark, color:syncing?C.accentDeep:C.textMuted, fontFamily:"'DM Sans',sans-serif", fontSize:12, fontWeight:600, cursor:"pointer", display:"flex", alignItems:"center", gap:8, transition:"all 0.3s" }}>
            <span style={{ display:"inline-block", animation:syncing?"spin 1s linear infinite":"none", fontSize:15 }}>⟳</span>
            {syncing?"Syncing Gmail…":"Sync Gmail"}
          </button>
        </div>

        {/* Nav */}
        <nav style={{ flex:1, padding:"12px 10px" }}>
          {NAV.map(n => {
            const active = page === n.id;
            return <button key={n.id} onClick={() => setPage(n.id)} style={{ width:"100%", display:"flex", alignItems:"center", gap:10, padding:"10px 12px", borderRadius:10, border:"none", background:active?`${C.accent}40`:"transparent", color:active?C.accentDeep:C.textMuted, fontFamily:"'DM Sans',sans-serif", fontSize:13, fontWeight:active?600:400, cursor:"pointer", marginBottom:4, textAlign:"left", transition:"all 0.15s" }}>
              <span style={{ fontSize:14 }}>{n.icon}</span>
              {n.label}
              {n.id==="radar" && stale > 0 && <span style={{ marginLeft:"auto", background:C.danger, color:"#fff", borderRadius:10, padding:"1px 7px", fontSize:10, fontWeight:700 }}>{stale}</span>}
            </button>;
          })}
        </nav>

        {/* User + logout */}
        <div style={{ padding:"14px", borderTop:`1px solid ${C.border}` }}>
          <div style={{ background:C.bgDark, borderRadius:12, padding:"12px" }}>
            <p style={{ fontFamily:"'DM Sans',sans-serif", fontSize:12, fontWeight:600, color:C.text, margin:"0 0 2px", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{auth.getUser().name}</p>
            <p style={{ fontFamily:"'DM Sans',sans-serif", fontSize:11, color:C.textMuted, margin:"0 0 10px", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{auth.getUser().email}</p>
            <button onClick={auth.logout} style={{ width:"100%", padding:"7px", borderRadius:8, border:`1px solid ${C.border}`, background:"transparent", color:C.textMuted, fontFamily:"'DM Sans',sans-serif", fontSize:11, cursor:"pointer" }}>Sign out</button>
          </div>
        </div>
      </aside>

      {/* Main */}
      <main style={{ flex:1, overflowY:"auto", padding:"30px 34px" }}>
        {page==="dashboard" && <Dashboard apps={apps} onCard={setSelected} onAdd={() => setShowAdd(true)}/>}
        {page==="analytics" && <Analytics apps={apps}/>}
        {page==="radar"     && <Radar     apps={apps}/>}
      </main>
    </div>

    {showAdd  && <AddModal onClose={() => setShowAdd(false)} onAdd={handleAdd}/>}
    {selected && <Detail  app={selected} onClose={() => setSelected(null)} onStatusChange={handleStatusChange}/>}
  </>;
}
