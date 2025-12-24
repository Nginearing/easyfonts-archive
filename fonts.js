const GOOGLE_FONTS_API="https://www.googleapis.com/webfonts/v1/webfonts?sort=popularity&key=AIzaSyD8wNQ45GwEr0bZljjRtP8131v42rrFhac"
const SYSTEM_FONTS=new Set(["serif","sans-serif","monospace","system-ui","cursive","fantasy","inherit","initial","unset"])
let googleFontsCache=null

async function getGoogleFonts(){
  if(googleFontsCache)return googleFontsCache
  const r=await fetch(GOOGLE_FONTS_API)
  const j=await r.json()
  googleFontsCache=Object.fromEntries(j.items.map(f=>[f.family,f.variants]))
  return googleFontsCache
}

function parseFontsFromCSS(css){
  const map=new Map()
  const familyRe=/font-family:\s*([^;]+);/gi
  const weightRe=/font-weight:\s*(\d{3});/gi
  const italicRe=/font-style:\s*italic;/gi
  const weights=[...css.matchAll(weightRe)].map(m=>m[1])
  const hasItalic=italicRe.test(css)
  let m
  while((m=familyRe.exec(css))){
    const family=m[1].split(",")[0].replace(/['"]/g,"").trim()
    if(SYSTEM_FONTS.has(family))continue
    if(!map.has(family))map.set(family,{weights:new Set(),italic:false})
    weights.forEach(w=>map.get(family).weights.add(w))
    if(hasItalic)map.get(family).italic=true
  }
  return map
}

function filterGoogleFonts(map,googleFonts){
  const out=new Map()
  for(const [family,data] of map.entries()){
    if(!googleFonts[family])continue
    const available=googleFonts[family]
    const weights=[...data.weights].filter(w=>available.includes(w))
    if(weights.length===0)weights.push("400")
    out.set(family,{weights,italic:data.italic&&available.includes("italic")})
  }
  return out
}

function buildGoogleFontsURL(fonts){
  const families=[...fonts.entries()].map(([family,data])=>{
    const w=data.weights.sort().join(";")
    if(data.italic){
      return `family=${family.replace(/ /g,"+")}:ital,wght@0,${w};1,${w}`
    }
    return `family=${family.replace(/ /g,"+")}:wght@${w}`
  })
  return `https://fonts.googleapis.com/css2?${families.join("&")}&display=swap`
}

function injectFonts(url){
  if(document.querySelector(`link[href="${url}"]`))return
  const l=document.createElement("link")
  l.rel="stylesheet"
  l.href=url
  document.head.appendChild(l)
}

async function loadFontsFromCSS(css){
  const googleFonts=await getGoogleFonts()
  const parsed=parseFontsFromCSS(css)
  const valid=filterGoogleFonts(parsed,googleFonts)
  if(valid.size===0)return
  injectFonts(buildGoogleFontsURL(valid))
}
