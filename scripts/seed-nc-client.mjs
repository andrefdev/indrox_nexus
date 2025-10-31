// NeuroCore seeder: crea inventario base y paquetes 25/50/100
// Requiere: env NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY
// Uso: npm run seed:nc

import readline from "node:readline"
import { stdin as input, stdout as output } from "node:process"
import { createClient } from "@supabase/supabase-js"

function parsePrice(cell) {
  if (!cell) return null
  const s = String(cell).trim()
  // Extrae el primer número encontrado (soporta "S/ 20", "20", "32 soles (28 unidades)")
  const m = s.match(/(\d+(?:[.,]\d+)?)/)
  if (!m) return null
  const val = Number(m[1].replace(",", "."))
  return Number.isFinite(val) ? val : null
}

function slugify(input) {
  return String(input)
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
}

const CURRENCY = "S/"
const DEFAULT_WAREHOUSE = "principal"
const DEFAULT_STATUS = "activo"

// Tabla de productos: categoría, nombre, precios para 25/50/100, imagen (opcional)
const PRODUCTS = [
  { cat: "BOCADITOS DULCES", name: "ALFAJORES ( sabor tradicional)", p25: "S/ 20", p50: "S/ 40", p100: "S/ 80", img: "https://drive.google.com/file/d/1fKSapfCzrrUBPQqwUY7s7RUABc9a2pbQ/view?usp=drive_link" },
  { cat: "BOCADITOS DULCES", name: "MUFFIN DE PLATANO", p25: "S/ 20", p50: "S/ 40", p100: "S/ 80", img: "https://drive.google.com/file/d/1Z9XbwvJcJbAPfUDZjloC-zIelAO0ipGG/view?usp=drive_link" },
  { cat: "BOCADITOS DULCES", name: "OREJITAS", p25: "S/ 20", p50: "S/ 40", p100: "S/ 80", img: "https://drive.google.com/file/d/1zrbCYjSfi4cbUSDvlq5a_T_kxJlLyOBL/view?usp=drive_link" },
  { cat: "BOCADITOS DULCES", name: "GALLETA CHOCOCHIP", p25: "S/ 20", p50: "S/ 40", p100: "S/ 80", img: "https://drive.google.com/file/d/1QHSssJLMmwOptmYbo5zlcGfpMLTA6PBd/view?usp=drive_link" },
  { cat: "BOCADITOS DULCES", name: "MILHOJITAS", p25: "S/ 20", p50: "S/ 40", p100: "S/ 80", img: "https://drive.google.com/file/d/1xYVOwwSBWiqyXRdSt0Umh39CrCNTSDF7/view?usp=drive_link" },
  { cat: "BOCADITOS DULCES", name: "ALFACHIPS", p25: "S/ 20", p50: "S/ 40", p100: "S/ 80", img: "https://drive.google.com/file/d/1G3JbDxlsAibs4-MJNgoUMBZr0-bd8N9T/view?usp=drive_link" },
  { cat: "BOCADITOS DULCES", name: "EMPANADA DE BODA", p25: "S/ 20", p50: "S/ 40", p100: "S/ 80", img: "https://drive.google.com/file/d/1aOMiYLbjt7c5-b3-JXX9-XdABnmI83ym/view?usp=drive_link" },
  { cat: "BOCADITOS DULCES", name: "CONITOS DE MANJAR BLANCO", p25: "S/ 23", p50: "S/ 45", p100: "S/ 90", img: "https://drive.google.com/file/d/1rQr4Aq9UmcJylPDX3TeRX05PUqjSvSks/view?usp=drive_link" },
  { cat: "BOCADITOS DULCES", name: "PIONONO", p25: "S/ 23", p50: "S/ 45", p100: "S/ 90", img: "https://drive.google.com/file/d/1D1uS7I-i4wz__MLSL5q7EKR03-gAGafE/view?usp=drive_link" },
  { cat: "BOCADITOS DULCES", name: "ALFAJOR DE CHOCOLATE", p25: "S/ 23", p50: "S/ 45", p100: "S/ 90", img: "https://drive.google.com/file/d/1_NaK6RglUh6D1-0-YVw_zeTAyPWIgm-W/view?usp=drive_link" },
  { cat: "BOCADITOS DULCES", name: "TRUFAS", p25: "S/ 33", p50: "S/ 65", p100: "S/ 130", img: "https://drive.google.com/file/d/1WUABL1wyt-9akB0wkfrO2ABqe7r_NwPs/view?usp=drive_link" },
  { cat: "BOCADITOS DULCES", name: "BROWNIE", p25: "S/ 33", p50: "S/ 65", p100: "S/ 130", img: "https://drive.google.com/file/d/1fmFBBlhFd3DwCQ9AOQ_rGXllzxU975hi/view?usp=drive_link" },
  { cat: "BOCADITOS DULCES", name: "PYE DE MANZANA", p25: "S/ 33", p50: "S/ 65", p100: "S/ 130", img: "https://drive.google.com/file/d/1l-JyUHqIr-rEwY0JfmLSD6LA8MyIv7sv/view?usp=drive_link" },
  { cat: "BOCADITOS DULCES", name: "PYE DE LIMON", p25: "S/ 35", p50: "S/ 70", p100: "S/ 140", img: "https://drive.google.com/file/d/1tPp0BLVhqluQz-vusTOe1VcraQbCxLaG/view?usp=drive_link" },
  { cat: "BOCADITOS DULCES", name: "TARTALETA DE FRESA", p25: "S/ 38", p50: "S/ 75", p100: "S/ 150", img: "https://drive.google.com/file/d/1OaoLkEUxZf5kswk-qNj1IOVxxWmp63nr/view?usp=drive_link" },
  { cat: "BOCADITOS DULCES", name: "CHEESECAKE DE FRESA", p25: "S/ 38", p50: "S/ 75", p100: "S/ 150", img: "https://drive.google.com/file/d/1_ET0mTTtCvpOQRhKAovzEp4akCrT-bgQ/view?usp=drive_link" },
  { cat: "BOCADITOS DULCES", name: "CHEESECAKE DE MARACUYA", p25: "S/ 38", p50: "S/ 75", p100: "S/ 150", img: "https://drive.google.com/file/d/1O6I3m0T7T5uW6GW5q498iAYcLd2C2g1c/view?usp=drive_link" },
  { cat: "BOCADITOS DULCES", name: "PROFITEROL", p25: "S/ 38", p50: "S/ 75", p100: "S/ 150", img: "https://drive.google.com/file/d/1s-GwjXyvxVnP-sjiTfkKnh0gA5axiHVo/view?usp=drive_link" },
  { cat: "BOCADITOS DULCES", name: "SUSPIRO A LA LIMEÑA", p25: "S/ 33", p50: "S/ 65", p100: "S/ 130", img: "https://drive.google.com/file/d/1KziVaCd8k5QJcscqzDaNKFGkDFqctLgC/view?usp=drive_link" },
  { cat: "BOCADITOS SALADOS", name: "ENROLLADO DE HOTDOG", p25: "S/ 20", p50: "S/ 40", p100: "S/ 80" },
  { cat: "BOCADITOS SALADOS", name: "EMPANADA DE CARNE", p25: "S/ 23", p50: "S/ 45", p100: "S/ 90" },
  { cat: "BOCADITOS SALADOS", name: "EMPANADA DE POLLO", p25: "S/ 23", p50: "S/ 45", p100: "S/ 90" },
  { cat: "BOCADITOS SALADOS", name: "MINIPIZZA", p25: "S/ 30", p50: "S/ 60", p100: "S/ 120" },
  { cat: "BOCADITOS SALADOS", name: "TEQUEÑOS DE QUESO ( DESDE 50 UND)", p50: "S/ 20", p100: "S/ 40" },
  { cat: "BOCADITOS SALADOS", name: "SALSA DE GUACAMOLE ( 1 PALTA)" },
  { cat: "SANGUCHITOS", name: "CAPRESE DE TOMATE ,ALBAHACA Y QUESO", img: "https://drive.google.com/file/d/1VdM8fBGQcBKTa3UCZD-WaPIm0b_rY6xJ/view?usp=drive_link" },
  { cat: "SANGUCHITOS", name: "TRIPLE CLASICO", p25: "S/ 45", p50: "S/ 90", p100: "S/ 180", img: "https://drive.google.com/file/d/1N_eFjRXY8Enp5LAUFbTv4eKR4oQXjWm4/view?usp=drive_link" },
  { cat: "SANGUCHITOS", name: "TRIPLE DE POLLO Y PALTA", p25: "S/ 45", p50: "S/ 90", p100: "S/ 180", img: "https://drive.google.com/file/d/1OrqdyiBE4fDWLo0A5bG9Iwypgn6vZeod/view?usp=drive_link" },
  { cat: "SANGUCHITOS", name: "TRIPLE DE POLLO Y DURAZNO", p25: "S/ 45", p50: "S/ 90", p100: "S/ 180", img: "https://drive.google.com/file/d/1ChIrx-oiyjDMsRbMt0v99jkANJ8QYczt/view?usp=drive_link" },
  { cat: "SANGUCHITOS", name: "SANDWICH DE POLLO", p25: "S/ 45", p50: "S/ 90", p100: "S/ 180", img: "https://drive.google.com/file/d/1rGdK677Zx5hS-SDrtSE47dXHpt_S0Qlh/view?usp=drive_link" },
  { cat: "SANGUCHITOS", name: "BUTIFARRA( DESDE 50 UND)", img: "https://drive.google.com/file/d/1HM7CqFyEJQpXWoYwkhDuC36qczVYi-bg/view?usp=drive_link" },
  { cat: "SANGUCHITOS", name: "CROISSANT DE POLLO", p25: "S/ 48", p50: "S/ 96", p100: "S/ 192", img: "https://drive.google.com/file/d/1azbymsNI_e9UbE50Xt7KoNFW0yXJNNMS/view?usp=drive_link" },
  // --- Continuación ---
  { cat: "SANGUCHITOS", name: "CROISSANT MIXTO", p25: "S/ 48", p50: "S/ 96", p100: "S/ 192", img: "https://drive.google.com/file/d/1uR2gm3_X3CEM4l608b0NrLYo4B15bTvc/view?usp=drive_link" },
  { cat: "SANGUCHITOS", name: "SANDWICH DE LOMO SALTADO ( DESDE 50 UND)", img: "https://drive.google.com/file/d/1y8ZqFoX1ZZ_AAizBCtdHmNCm5JjK3MZo/view?usp=drive_link" },
  { cat: "SANGUCHITOS", name: "MINI CHEESEBURGUER", p25: "S/ 60", p50: "S/ 120", p100: "S/ 240" },
  { cat: "PANES PARA BUFFET", name: "PETTIPANES", p50: "S/ 15", p100: "S/ 30" },
  { cat: "PANES PARA BUFFET", name: "FRANCESITOS", p50: "S/ 20", p100: "S/ 40" },
  // Paquetes con cantidades personalizadas
  { cat: "PANES PARA BUFFET", name: "MIX De alfajores de 28 unidades", customPackages: [{ qty: 28, price: 32 }] },
  { cat: "PANES PARA BUFFET", name: "MIX De alfajores de 50 unidades", customPackages: [{ qty: 50, price: 60 }] },
]

import fs from 'node:fs'
import path from 'node:path'
import dotenv from 'dotenv'
// Carga variables de entorno desde .env y .env.local si existen
dotenv.config()
const localEnvPath = path.resolve(process.cwd(), '.env.local')
if (fs.existsSync(localEnvPath)) {
  dotenv.config({ path: localEnvPath })
}
// Alias de nombres para coincidir combos con inventario existente
const NAME_ALIASES = {
  "ALFAJOR CON MANJAR": "ALFAJORES ( sabor tradicional)",
  "ALFAJORES": "ALFAJORES ( sabor tradicional)",
  "PIZZITAS ESPECIALES": "MINIPIZZA",
  "PIZZA": "MINIPIZZA",
  "TRUFAS DE CHOCOLATE": "TRUFAS",
  "CONITOS DE MANJAR": "CONITOS DE MANJAR BLANCO",
}

function normalizeName(s) {
  return String(s || "")
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase().trim()
}

function guessCategory(name) {
  const n = normalizeName(name)
  if (/(sandwich|croissant|triple)/.test(n)) return "SANGUCHITOS"
  if (/(empanada|pizza)/.test(n)) return "BOCADITOS SALADOS"
  if (/(alfajor|brownie|cheesecake|tartaleta|pye|trufas|pionono|suspiro|kekitos|conitos|milhojit)/.test(n)) return "BOCADITOS DULCES"
  return "BOCADITOS SALADOS"
}

// Definiciones de combos (precio total en la primera fila)
const COMBOS = [
  {
    name: "Combo Clásico",
    items: [
      { label: "ALFAJOR CON MANJAR", qty: 5, price: "S/ 30" },
      { label: "ENROLLADO DE HOTDOG", qty: 5 },
      { label: "KEKITOS DE CHOCOLATE", qty: 5 },
      { label: "PIONONO", qty: 5 },
      { label: "PIZZITAS ESPECIALES", qty: 5 },
    ],
  },
  {
    name: "Combo 200 bocaditos",
    items: [
      { label: "BROWNIE", qty: 25, price: "S/ 220" },
      { label: "CHEESECAKE DE FRESA", qty: 25 },
      { label: "ALFAJORES", qty: 30 },
      { label: "EMPANADA DE CARNE", qty: 25 },
      { label: "CROISSANT DE POLLO", qty: 50 },
      { label: "PIZZA", qty: 25 },
      { label: "PYE DE LIMON", qty: 20 },
    ],
  },
  {
    name: "Combo 300 bocaditos",
    items: [
      { label: "TARTALETA DE FRESA", qty: 20, price: "S/ 350" },
      { label: "SANDWICH DE POLLO", qty: 50 },
      { label: "EMPANADA DE CARNE", qty: 50 },
      { label: "MILHOJITAS", qty: 50 },
      { label: "ENROLLADO DE HOTDOG", qty: 50 },
      { label: "PIZZA", qty: 20 },
      { label: "TRUFAS DE CHOCOLATE", qty: 35 },
      { label: "CHEESECAKE DE MARACUYA", qty: 25 },
    ],
  },
  {
    name: "100 BOCADITOS COMBO 1",
    items: [
      { label: "ALFACHIPS", qty: 25, price: "S/ 120" },
      { label: "PYE DE MANZANA", qty: 25 },
      { label: "EMPANADA DE CARNE", qty: 25 },
      { label: "CROISSANT MIXTO", qty: 25 },
    ],
  },
  {
    name: "100 BOCADITOS - COMBO 2",
    items: [
      { label: "PIONONO", qty: 25, price: "S/ 118" },
      { label: "BROWNIE", qty: 25 },
      { label: "ENROLLADO DE HOTDOG", qty: 25 },
      { label: "SANDWICH DE POLLO", qty: 25 },
    ],
  },
  {
    name: "200 BOCADITOS - COMBO 2",
    items: [
      { label: "PROFITEROL", qty: 25, price: "S/ 267" },
      { label: "CHEESECAKE DE FRESA", qty: 25 },
      { label: "ALFAJORES", qty: 30 },
      { label: "EMPANADA DE CARNE", qty: 25 },
      { label: "CROISSANT DE POLLO", qty: 50 },
      { label: "PIZZA", qty: 25 },
      { label: "PYE DE LIMON", qty: 20 },
    ],
  },
  {
    name: "300 BOCADITOS - COMBO 2",
    items: [
      { label: "PYE DE LIMON", qty: 20, price: "S/ 377" },
      { label: "CROISSANT DE POLLO", qty: 50 },
      { label: "EMPANADA DE CARNE", qty: 50 },
      { label: "PYE DE MANZANA", qty: 50 },
      { label: "EMPANADA MIXTA", qty: 50 },
      { label: "TRIPLE DE JAMON Y QUESO", qty: 25 },
      { label: "CONITOS DE MANJAR", qty: 30 },
      { label: "CHEESECAKE DE FRESA", qty: 25 },
    ],
  },
]

async function promptClientId() {
  const rl = readline.createInterface({ input, output })
  const question = (q) => new Promise((resolve) => rl.question(q, resolve))
  const clientId = (await question("Ingrese UUID del cliente: ")).trim()
  rl.close()
  if (!clientId || !/^([0-9a-fA-F\-]{36})$/.test(clientId)) {
    throw new Error("UUID de cliente inválido")
  }
  return clientId
}

async function main() {
  // Parseo simple de flags: --url, --key, --client y posicionals
  function parseFlags(argv) {
    const out = { _: [] }
    for (let i = 2; i < argv.length; i++) {
      let tok = argv[i]
      if (tok?.startsWith('--')) {
        const [rawKey, rawVal] = tok.split('=')
        const k = rawKey.replace(/^--/, '')
        let v = rawVal
        if (v == null) {
          const next = argv[i + 1]
          if (next && !String(next).startsWith('--')) {
            v = next
            i++
          } else {
            v = 'true'
          }
        }
        out[k] = v
      } else {
        out._.push(tok)
      }
    }
    return out
  }

  const flags = parseFlags(process.argv)
  function stripWrap(v) {
    return String(v || "").trim().replace(/^[`'\"]+|[`'\"]+$/g, "")
  }

  const supabaseUrl = stripWrap(flags.url || process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL)
  // Acepta tanto SUPABASE_SERVICE_ROLE_KEY correcto como el typo SUPABASE_SERVICE_ROL_KEY
  const serviceKey = stripWrap(flags.key || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROL_KEY)
  const clientId = stripWrap(flags.client || (flags._[0] ? String(flags._[0]) : await promptClientId()))

  if (!supabaseUrl || !serviceKey) {
    const haveUrl = Boolean(supabaseUrl)
    const haveKey = Boolean(serviceKey)
    throw new Error(`Faltan credenciales Supabase. url=${haveUrl ? 'OK' : 'MISSING'}, key=${haveKey ? 'OK' : 'MISSING'}. Proporcione --url y --key o configure NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY`)
  }
  // Valida que clientId sea un UUID; evita confundir URL como clientId
  if (!/^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})$/.test(clientId)) {
    throw new Error(`client_id inválido: '${clientId}'. Use --client <UUID>. Si ve 'http(s)://', pasó el URL como argumento posicional por error; use --url para el URL.`)
  }
  const supabase = createClient(supabaseUrl, serviceKey)

  console.log(`[NC Seeder] Cliente: ${clientId}`)

  // Índice temporal de items por nombre normalizado
  const itemsIndex = new Map()

  for (const row of PRODUCTS) {
    const p25 = parsePrice(row.p25)
    const p50 = parsePrice(row.p50)
    const p100 = parsePrice(row.p100)
    const sku = `NC-${slugify(row.name).toUpperCase()}`

    // 1) Crear ítem de inventario
    const invPayload = {
      sku,
      name: row.name,
      category: row.cat,
      warehouse: DEFAULT_WAREHOUSE,
      status: DEFAULT_STATUS,
      stock: 1000,
      min_stock_threshold: 0,
      item_type: "PRODUCTO_SIMPLE",
      unit_price: null,
      client_id: clientId,
      image_url: row.img || null,
    }
    const { data: item, error: invErr } = await supabase
      .from("nc_inventory_items")
      .insert(invPayload)
      .select()
      .single()
    if (invErr) {
      console.error(`[NC Seeder] Error inventario '${row.name}':`, invErr.message)
      continue
    }
    console.log(`[NC Seeder] Inventario creado: ${row.name} → id=${item.id}`)
    itemsIndex.set(normalizeName(row.name), item)

    // 2) Crear paquetes 25/50/100 según disponibilidad de precio
    const packages = []
    if (p25 != null) packages.push({ qty: 25, price: p25 })
    if (p50 != null) packages.push({ qty: 50, price: p50 })
    if (p100 != null) packages.push({ qty: 100, price: p100 })
    if (Array.isArray(row.customPackages)) {
      for (const cp of row.customPackages) {
        if (cp?.qty && cp?.price) packages.push({ qty: cp.qty, price: cp.price })
      }
    }

    for (const pkg of packages) {
      const pkgPayload = {
        client_id: clientId,
        base_item_id: item.id,
        quantity_included: pkg.qty,
        package_price: pkg.price,
        consume_stock: true,
        currency: CURRENCY,
        image_url: row.img || null,
      }
      const { data: createdPkg, error: pkgErr } = await supabase
        .from("nc_package_definitions")
        .insert(pkgPayload)
        .select()
      if (pkgErr) {
        console.error(`[NC Seeder] Error paquete ${row.name} ${pkg.qty}:`, pkgErr.message)
        continue
      }
      console.log(`[NC Seeder] Paquete ${pkg.qty} creado para '${row.name}' (${CURRENCY} ${pkg.price})`)
    }
  }

  // Helper: buscar o crear item por nombre (usa alias y categoría sugerida)
  async function findOrCreateItem(label) {
    const alias = NAME_ALIASES[label] || label
    const key = normalizeName(alias)
    if (itemsIndex.has(key)) return itemsIndex.get(key)
    // intento lookup en BD por client/name
    const { data: found, error: findErr } = await supabase
      .from("nc_inventory_items")
      .select("id,name,category")
      .eq("client_id", clientId)
      .ilike("name", alias)
      .limit(1)
    if (!findErr && found && found[0]) {
      itemsIndex.set(key, found[0])
      return found[0]
    }
    // crear nuevo
    const newPayload = {
      sku: `NC-${slugify(alias).toUpperCase()}`,
      name: alias,
      category: guessCategory(alias),
      warehouse: DEFAULT_WAREHOUSE,
      status: DEFAULT_STATUS,
      stock: 1000,
      min_stock_threshold: 0,
      item_type: "PRODUCTO_SIMPLE",
      unit_price: null,
      client_id: clientId,
      image_url: null,
    }
    const { data: created, error: createErr } = await supabase
      .from("nc_inventory_items")
      .insert(newPayload)
      .select()
      .single()
    if (createErr) throw new Error(`No se pudo crear item '${alias}': ${createErr.message}`)
    console.log(`[NC Seeder] Inventario auto-creado: ${alias} → id=${created.id}`)
    itemsIndex.set(key, created)
    return created
  }

  // Crear combos
  for (const combo of COMBOS) {
    if (!combo.items?.length) continue
    const totalPrice = parsePrice(combo.items[0]?.price)
    const headerPayload = {
      client_id: clientId,
      combo_name: combo.name,
      combo_price: totalPrice ?? 0,
      currency: CURRENCY,
      image_url: null,
    }
    // evitar duplicados: buscar cabecera
    const { data: existing, error: exErr } = await supabase
      .from("nc_combo_headers")
      .select("id")
      .eq("client_id", clientId)
      .ilike("combo_name", combo.name)
      .limit(1)
    let headerId = null
    if (!exErr && existing && existing[0]) {
      headerId = existing[0].id
      console.log(`[NC Seeder] Combo ya existe: ${combo.name} → id=${headerId}`)
    } else {
      const { data: createdHeader, error: headerErr } = await supabase
        .from("nc_combo_headers")
        .insert(headerPayload)
        .select()
        .single()
      if (headerErr) {
        console.error(`[NC Seeder] Error creando combo '${combo.name}':`, headerErr.message)
        continue
      }
      headerId = createdHeader.id
      console.log(`[NC Seeder] Combo creado: ${combo.name} → id=${headerId}`)
    }
    // componentes
    for (const comp of combo.items) {
      const item = await findOrCreateItem(comp.label)
      const compPayload = {
        combo_id: headerId,
        component_item_id: item.id,
        component_qty: comp.qty,
        consume_stock: true,
      }
      // evitar duplicados de componente
      const { data: existComp } = await supabase
        .from("nc_combo_items")
        .select("id")
        .eq("combo_id", headerId)
        .eq("component_item_id", item.id)
        .limit(1)
      if (existComp && existComp[0]) {
        console.log(`[NC Seeder] Componente ya existe: ${combo.name} – ${item.name}`)
        continue
      }
      const { error: compErr } = await supabase
        .from("nc_combo_items")
        .insert(compPayload)
      if (compErr) {
        console.error(`[NC Seeder] Error componente '${item.name}' en combo '${combo.name}':`, compErr.message)
        continue
      }
      console.log(`[NC Seeder] Componente añadido: ${combo.name} – ${item.name} x${comp.qty}`)
    }
  }

  console.log("[NC Seeder] Completado")
}

main().catch((e) => {
  console.error("[NC Seeder] Falló:", e?.message || e)
  process.exit(1)
})