import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import { subDays } from 'date-fns';
import connectDB from '../lib/mongodb.js';
import Product from '../lib/models/Product.js';
import Category from '../lib/models/Category.js';
import Store from '../lib/models/Store.js';
import Supplier from '../lib/models/Supplier.js';
import InventorySnapshot from '../lib/models/InventorySnapshot.js';
import PriceList from '../lib/models/PriceList.js';
import ReplenishmentRule from '../lib/models/ReplenishmentRule.js';

const ORG_ID = 'ELINEAS';

async function seed() {
  console.log('🌱 Starting seed...');
  await connectDB();

  // ──────────────────────────────────────────────────────────────────────────────
  // CLEAR
  // ──────────────────────────────────────────────────────────────────────────────
  console.log('🗑️  Clearing existing data...');
  await Product.deleteMany({ org_id: ORG_ID });
  await Category.deleteMany({ org_id: ORG_ID });
  await Store.deleteMany({ org_id: ORG_ID });
  await Supplier.deleteMany({ org_id: ORG_ID });
  await InventorySnapshot.deleteMany({ org_id: ORG_ID });
  await PriceList.deleteMany({ org_id: ORG_ID });
  await ReplenishmentRule.deleteMany({ org_id: ORG_ID });

  // ──────────────────────────────────────────────────────────────────────────────
  // CATEGORIES
  // ──────────────────────────────────────────────────────────────────────────────
  console.log('📁 Creating categories...');
  const categories = [
    // Bebidas e infusiones
    { name: 'Bebidas e infusiones', slug: 'bebidas-e-infusiones', parent_id: null, path: ['bebidas-e-infusiones'], depth: 0 },
      { name: 'Bebidas alcohólicas', slug: 'bebidas-alcoholicas', parent_id: 'bebidas-e-infusiones', path: ['bebidas-e-infusiones','bebidas-alcoholicas'], depth: 1 },
        { name: 'Cervezas', slug: 'cervezas', parent_id: 'bebidas-alcoholicas', path: ['bebidas-e-infusiones','bebidas-alcoholicas','cervezas'], depth: 2 },
        { name: 'Vinos, licores y otras', slug: 'vinos-licores-otras', parent_id: 'bebidas-alcoholicas', path: ['bebidas-e-infusiones','bebidas-alcoholicas','vinos-licores-otras'], depth: 2 },
        { name: 'Rones y whiskys', slug: 'rones-whiskys', parent_id: 'bebidas-alcoholicas', path: ['bebidas-e-infusiones','bebidas-alcoholicas','rones-whiskys'], depth: 2 },
      { name: 'Bebidas sin alcohol', slug: 'bebidas-sin-alcohol', parent_id: 'bebidas-e-infusiones', path: ['bebidas-e-infusiones','bebidas-sin-alcohol'], depth: 1 },
        { name: 'Bebidas gaseadas', slug: 'bebidas-gaseadas', parent_id: 'bebidas-sin-alcohol', path: ['bebidas-e-infusiones','bebidas-sin-alcohol','bebidas-gaseadas'], depth: 2 },
        { name: 'Jugos', slug: 'jugos', parent_id: 'bebidas-sin-alcohol', path: ['bebidas-e-infusiones','bebidas-sin-alcohol','jugos'], depth: 2 },
        { name: 'Bebidas instantáneas', slug: 'bebidas-instantaneas', parent_id: 'bebidas-sin-alcohol', path: ['bebidas-e-infusiones','bebidas-sin-alcohol','bebidas-instantaneas'], depth: 2 },
        { name: 'Café', slug: 'cafe', parent_id: 'bebidas-sin-alcohol', path: ['bebidas-e-infusiones','bebidas-sin-alcohol','cafe'], depth: 2 },
        { name: 'Aguas', slug: 'aguas', parent_id: 'bebidas-sin-alcohol', path: ['bebidas-e-infusiones','bebidas-sin-alcohol','aguas'], depth: 2 },
        { name: 'Otras infusiones', slug: 'otras-infusiones', parent_id: 'bebidas-sin-alcohol', path: ['bebidas-e-infusiones','bebidas-sin-alcohol','otras-infusiones'], depth: 2 },

    // Alimentos
    { name: 'Alimentos', slug: 'alimentos', parent_id: null, path: ['alimentos'], depth: 0 },
      { name: 'Conservas', slug: 'conservas', parent_id: 'alimentos', path: ['alimentos','conservas'], depth: 1 },
        { name: 'Pescado y mariscos', slug: 'pescado-mariscos', parent_id: 'conservas', path: ['alimentos','conservas','pescado-mariscos'], depth: 2 },
        { name: 'Carnes y embutidos', slug: 'carnes-embutidos', parent_id: 'conservas', path: ['alimentos','conservas','carnes-embutidos'], depth: 2 },
        { name: 'Vegetales y legumbres', slug: 'vegetales-legumbres', parent_id: 'conservas', path: ['alimentos','conservas','vegetales-legumbres'], depth: 2 },
        { name: 'Aceitunas', slug: 'aceitunas', parent_id: 'conservas', path: ['alimentos','conservas','aceitunas'], depth: 2 },
        { name: 'Otras conservas', slug: 'otras-conservas', parent_id: 'conservas', path: ['alimentos','conservas','otras-conservas'], depth: 2 },
        { name: 'Dulces', slug: 'dulces-conservas', parent_id: 'conservas', path: ['alimentos','conservas','dulces-conservas'], depth: 2 },
      { name: 'Aceites y grasas', slug: 'aceites-grasas', parent_id: 'alimentos', path: ['alimentos','aceites-grasas'], depth: 1 },
        { name: 'Aceite vegetal', slug: 'aceite-vegetal', parent_id: 'aceites-grasas', path: ['alimentos','aceites-grasas','aceite-vegetal'], depth: 2 },
      { name: 'Dulces y panes', slug: 'dulces-panes', parent_id: 'alimentos', path: ['alimentos','dulces-panes'], depth: 1 },
        { name: 'Caramelos y chiclets', slug: 'caramelos-chiclets', parent_id: 'dulces-panes', path: ['alimentos','dulces-panes','caramelos-chiclets'], depth: 2 },
        { name: 'Galletas saladas y aperitivos', slug: 'galletas-saladas-aperitivos', parent_id: 'dulces-panes', path: ['alimentos','dulces-panes','galletas-saladas-aperitivos'], depth: 2 },
        { name: 'Galletas dulces y sorbetos', slug: 'galletas-dulces-sorbetos', parent_id: 'dulces-panes', path: ['alimentos','dulces-panes','galletas-dulces-sorbetos'], depth: 2 },
        { name: 'Mezclas para hornear', slug: 'mezclas-hornear', parent_id: 'dulces-panes', path: ['alimentos','dulces-panes','mezclas-hornear'], depth: 2 },
        { name: 'Panes', slug: 'panes', parent_id: 'dulces-panes', path: ['alimentos','dulces-panes','panes'], depth: 2 },
        { name: 'Dulces y tortas', slug: 'dulces-tortas', parent_id: 'dulces-panes', path: ['alimentos','dulces-panes','dulces-tortas'], depth: 2 },
        { name: 'Turrones y chocolates', slug: 'turrones-chocolates', parent_id: 'dulces-panes', path: ['alimentos','dulces-panes','turrones-chocolates'], depth: 2 },
      { name: 'Pastas, granos y cereales', slug: 'pastas-granos-cereales', parent_id: 'alimentos', path: ['alimentos','pastas-granos-cereales'], depth: 1 },
        { name: 'Pastas', slug: 'pastas', parent_id: 'pastas-granos-cereales', path: ['alimentos','pastas-granos-cereales','pastas'], depth: 2 },
        { name: 'Cereales', slug: 'cereales', parent_id: 'pastas-granos-cereales', path: ['alimentos','pastas-granos-cereales','cereales'], depth: 2 },
        { name: 'Granos', slug: 'granos', parent_id: 'pastas-granos-cereales', path: ['alimentos','pastas-granos-cereales','granos'], depth: 2 },
        { name: 'Arroz', slug: 'arroz', parent_id: 'pastas-granos-cereales', path: ['alimentos','pastas-granos-cereales','arroz'], depth: 2 },
      { name: 'Lácteos, huevos y helados', slug: 'lacteos-huevos-helados', parent_id: 'alimentos', path: ['alimentos','lacteos-huevos-helados'], depth: 1 },
        { name: 'Leche y sustitutos', slug: 'leche-sustitutos', parent_id: 'lacteos-huevos-helados', path: ['alimentos','lacteos-huevos-helados','leche-sustitutos'], depth: 2 },
        { name: 'Mantequillas y margarinas', slug: 'mantequillas-margarinas', parent_id: 'lacteos-huevos-helados', path: ['alimentos','lacteos-huevos-helados','mantequillas-margarinas'], depth: 2 },
        { name: 'Quesos', slug: 'quesos', parent_id: 'lacteos-huevos-helados', path: ['alimentos','lacteos-huevos-helados','quesos'], depth: 2 },
        { name: 'Yogur y sustitutos', slug: 'yogur-sustitutos', parent_id: 'lacteos-huevos-helados', path: ['alimentos','lacteos-huevos-helados','yogur-sustitutos'], depth: 2 },

    // Ferretería
    { name: 'Ferretería', slug: 'ferreteria', parent_id: null, path: ['ferreteria'], depth: 0 },
      { name: 'Plomería', slug: 'plomeria', parent_id: 'ferreteria', path: ['ferreteria','plomeria'], depth: 1 },
      { name: 'Misceláneas', slug: 'miscelaneas', parent_id: 'ferreteria', path: ['ferreteria','miscelaneas'], depth: 1 },

    // Hogar
    { name: 'Hogar', slug: 'hogar', parent_id: null, path: ['hogar'], depth: 0 },
      { name: 'Mobiliario y accesorios útiles', slug: 'mobiliario-y-accesorios-utiles', parent_id: 'hogar', path: ['hogar','mobiliario-y-accesorios-utiles'], depth: 1 },
      { name: 'Productos de limpieza - accesorios e implementos', slug: 'productos-de-limpieza-accesorios-e-implementos', parent_id: 'hogar', path: ['hogar','productos-de-limpieza-accesorios-e-implementos'], depth: 1 },
  ];

  const createdCategories = [];
  for (const cat of categories) {
    const created = await Category.create({ ...cat, org_id: ORG_ID });
    createdCategories.push(created);
  }

  // Índices de categorías para resolución/alias
  const catBySlug = new Map(createdCategories.map(c => [c.slug, c]));
  const catByPath = new Map(createdCategories.map(c => [Array.isArray(c.path) ? c.path.join('-') : c.slug, c]));
  const CATEGORY_ALIAS = {
    'bebidas-e-infusiones-bebidas-alcoholicas-cervezas': 'cervezas',
    'bebidas-e-infusiones-bebidas-sin-alcohol-bebidas-gaseadas': 'bebidas-gaseadas',
    'bebidas-e-infusiones-bebidas-sin-alcohol-jugos': 'jugos',
    'alimentos-conservas-pescado-y-mariscos': 'pescado-mariscos',
    'alimentos-conservas-carnes-y-embutidos': 'carnes-embutidos',
    'alimentos-aceites-y-grasas-aceite-vegetal': 'aceite-vegetal',
    'ferreteria-plomeria': 'plomeria',
    'ferreteria-miscelaneas': 'miscelaneas',
    'hogar-mobiliario-y-accesorios-utiles': 'mobiliario-y-accesorios-utiles',
    'hogar-productos-de-limpieza-accesorios-e-implementos': 'productos-de-limpieza-accesorios-e-implementos',
    'otros-productos-electrodomesticos-accesorios-y-otros': 'miscelaneas',
  };
  function resolveCategory(catStr) {
    if (!catStr) return null;
    const mapped = CATEGORY_ALIAS[catStr] || catStr;
    if (catBySlug.has(mapped)) return catBySlug.get(mapped);
    if (catByPath.has(mapped)) return catByPath.get(mapped);
    for (const [slug, c] of catBySlug.entries()) if (mapped.endsWith(slug)) return c;
    return null;
  }
  const safePath = (c) => (Array.isArray(c?.path) && c.path.length ? c.path : [c?.slug].filter(Boolean));

  // ──────────────────────────────────────────────────────────────────────────────
  // STORES
  // ──────────────────────────────────────────────────────────────────────────────
  console.log('🏪 Creating stores...');
  const stores = [
    { tkc_code: 593,  name: 'Elizabeth Varios Cerro',                 is_shop: false, location: 'Cerro' },
    { tkc_code: 615,  name: 'Elizabeth Electrocuba',                  is_shop: false, location: 'Cerro' },
    { tkc_code: 676,  name: 'ELI MARYKAY',                            is_shop: true,  location: 'Cerro' },
    { tkc_code: 480,  name: 'Elineas Cerro',                          is_shop: false, location: 'Cerro' },
    { tkc_code: 581,  name: 'Línea Espejuelos',                       is_shop: true,  location: 'Cerro' },
    { tkc_code: 607,  name: 'Línea Regalos',                          is_shop: true,  location: 'Cerro' },
    { tkc_code: 610,  name: 'Línea de Gafas',                         is_shop: true,  location: 'Cerro' },
    { tkc_code: 600,  name: 'Línea Navidad',                          is_shop: true,  location: 'Cerro' },
    { tkc_code: 734,  name: 'Electrocuba Congelados Cerro',           is_shop: false, location: 'Cerro' },
    { tkc_code: 789,  name: 'ELíneas Electrocuba',                    is_shop: false, location: 'Cerro' },
    { tkc_code: 926,  name: 'ElectrocubaPan',                         is_shop: true,  location: 'Cerro' },
    { tkc_code: 1000, name: 'Línea Electrodomésticos Ligeros',        is_shop: true,  location: 'Cerro' },
    { tkc_code: 1003, name: 'Línea Electrodomésticos Pesados',        is_shop: false, location: 'Cerro' },
    { tkc_code: 1005, name: 'RX MX',                                  is_shop: true,  location: 'Cerro' },
    { tkc_code: 1053, name: 'B23 Electrocuba',                        is_shop: false, location: 'Cerro' },
    { tkc_code: 1201, name: 'B23 Electrocuba SV',                     is_shop: false, location: 'SV' },
    { tkc_code: 1330, name: 'Electrocuba Mayorista',                  is_shop: false, location: '' },
    { tkc_code: 963,  name: 'Electrocuba Lácteos FF-Yeya',            is_shop: false, location: '' },
    { tkc_code: 995,  name: 'Electrocuba Lácteos FF-YeyaP',           is_shop: false, location: '' },
    { tkc_code: 1138, name: 'Línea Refrigerado FF-Yeya',              is_shop: false, location: '' },
    { tkc_code: 'Latino', name: 'Electrocuba Latino',                 is_shop: true,  location: 'Latino' },
  ];

  const createdStores = [];
  for (const store of stores) {
    const created = await Store.create({ ...store, tkc_code: String(store.tkc_code), org_id: ORG_ID });
    createdStores.push(created);
  }

  // ──────────────────────────────────────────────────────────────────────────────
  // SUPPLIERS
  // ──────────────────────────────────────────────────────────────────────────────
  console.log('📦 Creating suppliers...');
  const suppliers = [
    { name: 'SEL CERVEZAS',  aliases: ['CERVEZAS'],  active: true },
    { name: 'SEL BEBIDAS',   aliases: ['BEBIDAS'],   active: true },
    { name: 'SEL REFRESCOS', aliases: ['REFRESCOS'], active: true },
    { name: 'SEL JUGOS',     aliases: ['JUGOS'],     active: true },
    { name: 'SEL DON SIMON', aliases: ['DON SIMON'], active: true },
    { name: 'SEL ALIMENTO',  aliases: ['ALIMENTO'],  active: true },
    { name: 'SEL SANTA',     aliases: ['SANTA'],     active: true },
    { name: 'SEL FERRETERIA',aliases: ['FERRETERIA'],active: true },
    { name: 'SEL HOGAR',     aliases: ['HOGAR'],     active: true },
    { name: 'S ELECTROCUBA6',aliases: ['ELECTROCUBA'], active: true },
  ];
  const createdSuppliers = [];
  for (const supplier of suppliers) {
    const created = await Supplier.create({ ...supplier, org_id: ORG_ID });
    createdSuppliers.push(created);
  }
  const supplierByName = new Map(createdSuppliers.map(s => [s.name.trim().toLowerCase(), s]));
  const resolveSupplier = (name) => supplierByName.get(String(name || '').trim().toLowerCase());

  // ──────────────────────────────────────────────────────────────────────────────
  // PRODUCTS (de tus datos)
  // ──────────────────────────────────────────────────────────────────────────────
  console.log('🌹 Creating products...');

  // Utilidades
  const onlyDigits = (v) => String(v ?? '').replace(/[^\d]/g, '');
  const guessUPB = (slug) =>
    ['cervezas','bebidas-gaseadas'].includes(slug) ? 24
    : ['jugos'].includes(slug) ? 12
    : ['pescado-mariscos'].includes(slug) ? 24
    : ['carnes-embutidos'].includes(slug) ? 12
    : 1;
  const brandFromName = (n, fallback) => {
    const s = String(n || '');
    const hits = ['Mahou','Santa Isabel','Don Simon','Olé','Carretilla','Santa'];
    const hit = hits.find(h => s.toLowerCase().includes(h.toLowerCase()));
    return hit || fallback || '';
  };

  // Tu muestra de datos (abreviado a lo esencial para seed de productos)
  const productData = [
    { category: 'bebidas-e-infusiones-bebidas-alcoholicas-cervezas', product_code: '8,41133E+12', name: 'Cerveza clásica Mahou (330 ml)', supplier: 'SEL CERVEZAS', unit: 'u' },
    { category: 'alimentos-conservas-pescado-y-mariscos',            product_code: '8,4311E+12',   name: 'Sardinas enlatadas Olé (125 g / 4.4 oz)', supplier: 'SEL ALIMENTO', unit: 'u' },
    { category: 'bebidas-e-infusiones-bebidas-sin-alcohol-jugos',    product_code: '8,4311E+12',   name: 'Jugo de mango Santa Isabel (1 L)', supplier: 'SEL JUGOS', unit: 'u' },
    { category: 'bebidas-e-infusiones-bebidas-sin-alcohol-jugos',    product_code: 'NOFACT98248-2',name: 'Néctar multifrutas Santa Isabel (1 L)', supplier: 'SEL JUGOS', unit: 'u' },
    { category: 'bebidas-e-infusiones-bebidas-sin-alcohol-jugos',    product_code: 'NOFACT1650142',name: 'Jugo tropical Don Simon (1 L)', supplier: 'SEL JUGOS', unit: 'u' },
    { category: 'bebidas-e-infusiones-bebidas-sin-alcohol-bebidas-gaseadas', product_code: '8,4311E+12', name: 'Refresco gaseado de cola Santa (330 ml)', supplier: 'SEL BEBIDAS', unit: 'u' },
    { category: 'bebidas-e-infusiones-bebidas-sin-alcohol-bebidas-gaseadas', product_code: '8,4311E+12', name: 'Refresco gaseado de naranja Santa (330 ml)', supplier: 'SEL BEBIDAS', unit: 'u' },
    { category: 'bebidas-e-infusiones-bebidas-sin-alcohol-bebidas-gaseadas', product_code: '8,4311E+12', name: 'Refresco gaseado de lima y limón Santa (330 ml)', supplier: 'SEL REFRESCOS', unit: 'u' },
    { category: 'alimentos-conservas-carnes-y-embutidos',            product_code: '8,41042E+12',  name: 'Fabada asturiana Carretilla (435 g / 15.34 oz)', supplier: 'SEL ALIMENTO', unit: 'u' },
    { category: 'alimentos-aceites-y-grasas-aceite-vegetal',         product_code: '8,42203E+12',  name: 'Aceite refinado de girasol La Abuela (1 L)', supplier: 'SEL ALIMENTO', unit: 'u' },
    { category: 'ferreteria-plomeria',                                product_code: '7,45304E+12',  name: 'Latiguillo flexible de 1/2" x 1/2" Griven DMA367-HSB2012', supplier: 'SEL FERRETERIA', unit: 'u' },
    { category: 'ferreteria-miscelaneas',                             product_code: '7,45304E+12',  name: 'Cinta adhesiva para enmascarar de 2" Covo', supplier: 'SEL FERRETERIA', unit: 'u' },
    { category: 'hogar-mobiliario-y-accesorios-utiles',               product_code: '7,45301E+12',  name: 'Baterías AAA Speed Energy (4 U)', supplier: 'S ELECTROCUBA6', unit: 'u' },
    { category: 'hogar-productos-de-limpieza-accesorios-e-implementos', product_code: '7,45301E+12', name: 'Esponja de colores para fregar Matrix (4U)', supplier: 'SEL HOGAR', unit: 'u' },
    { category: 'otros-productos-electrodomesticos-accesorios-y-otros', product_code: '7,45301E+12', name: 'Protector de voltaje 125 V Troen', supplier: 'SEL FERRETERIA', unit: 'u' },
  ];

  const createdProducts = [];
  let productCode = 1000;

  for (const prod of productData) {
    const cat = resolveCategory(String(prod.category).trim());
    if (!cat) throw new Error(`Categoría no encontrada para "${prod.name}" -> "${prod.category}"`);

    const sup = resolveSupplier(prod.supplier);
    if (!sup) throw new Error(`Proveedor no encontrado para "${prod.name}" -> "${prod.supplier}"`);

    const uom = (String(prod.unit || 'unit').toLowerCase() === 'u') ? 'unit' : String(prod.unit || 'unit').toLowerCase();
    const upb = prod.units_per_box ?? guessUPB(cat.slug);
    const barcode = onlyDigits(prod.product_code) || `${Math.floor(Math.random() * 1e12)}`;
    const brand = prod.brand || brandFromName(prod.name, sup.name);

    const doc = await Product.create({
      org_id: ORG_ID,
      product_code: `PROD-${productCode++}`,
      barcode,
      name: prod.name,
      brand,
      uom,
      units_per_box: upb,
      category_path: safePath(cat),
      category_id: cat.slug,
      supplier_id: sup._id.toString(),
      status: 'active',
      mgmt_mode: 'managed',
    });
    createdProducts.push(doc);
  }

  const allProducts = await Product.find({ org_id: ORG_ID });

  // ──────────────────────────────────────────────────────────────────────────────
  // INVENTORY SNAPSHOTS (últimos 30 días)
  // ──────────────────────────────────────────────────────────────────────────────
  console.log('📊 Creating inventory snapshots...');
  const today = new Date();
  for (let dayOffset = 30; dayOffset >= 0; dayOffset--) {
    const snapshotDate = subDays(today, dayOffset);
    for (const store of createdStores) {
      for (const product of allProducts) {
        const baseStock = Math.floor(Math.random() * 200) + 50;
        const dailyVariation = Math.floor(Math.random() * 30) - 15;
        const stock = Math.max(0, baseStock + (dailyVariation * dayOffset) / 30);
        await InventorySnapshot.create({
          org_id: ORG_ID,
          date: snapshotDate,
          store_id: store._id.toString(),
          product_id: product._id.toString(),
          physical_stock: Math.floor(stock),
          stock_units: Math.floor(stock),
          stock_boxes: Math.floor(stock / (product.units_per_box || 1)),
          price_cost: Math.random() * 50 + 10,
          price_shop: Math.random() * 100 + 20,
          status: 'current',
        });
      }
    }
  }

  // ──────────────────────────────────────────────────────────────────────────────
  // PRICE LISTS
  // ──────────────────────────────────────────────────────────────────────────────
  console.log('💰 Creating price lists...');
  for (const product of allProducts) {
    const baseCost = Math.random() * 50 + 10;
    await PriceList.create({
      org_id: ORG_ID,
      product_id: product._id.toString(),
      valid_from: subDays(today, 60),
      price_cost: baseCost,
      price_direct: baseCost * 1.3,
      price_shop: baseCost * 1.8,
      currency: 'USD',
    });
  }

  // ──────────────────────────────────────────────────────────────────────────────
  // RULES
  // ──────────────────────────────────────────────────────────────────────────────
  console.log('📐 Creating replenishment rules...');
  await ReplenishmentRule.create({
    org_id: ORG_ID,
    scope: { store_id: null, category_id: null, product_id: null },
    params: {
      days_of_cover: 7,
      lead_time_days: 3,
      service_level: 0.9,
      safety_stock: 10,
      avg_demand_window_days: 28,
      seasonality: { feb14: 1.5, mothers_day: 1.8, nov_dec: 1.4 },
      pack_size: 1,
      moq: 0,
      max_stock: 500,
      min_stock: 20,
    },
    active: true,
    priority: 100,
  });

  // Regla de tienda opcional (evita crash si no existe)
  const tda002 = createdStores.find(s => String(s.tkc_code) === 'TDA002');
  if (tda002) {
    await ReplenishmentRule.create({
      org_id: ORG_ID,
      scope: { store_id: tda002._id.toString(), category_id: null, product_id: null },
      params: {
        days_of_cover: 10,
        lead_time_days: 3,
        service_level: 0.92,
        safety_stock: 30,
        avg_demand_window_days: 28,
        seasonality: { feb14: 1.6, mothers_day: 2.0, nov_dec: 1.5 },
        pack_size: 1,
        moq: 0,
        max_stock: 800,
        min_stock: 50,
      },
      active: true,
      priority: 150,
    });
  } else {
    console.log('ℹ️  Skip rule for TDA002 (store not found)');
  }

  // ──────────────────────────────────────────────────────────────────────────────
  // DONE
  // ──────────────────────────────────────────────────────────────────────────────
  console.log('✅ Seed completed!');
  console.log(`   Categories: ${createdCategories.length}`);
  console.log(`   Stores: ${createdStores.length}`);
  console.log(`   Suppliers: ${createdSuppliers.length}`);
  console.log(`   Products: ${allProducts.length}`);
  console.log(`   Inventory Snapshots: ${await InventorySnapshot.countDocuments({ org_id: ORG_ID })}`);
  console.log(`   Price Lists: ${await PriceList.countDocuments({ org_id: ORG_ID })}`);
  console.log(`   Rules: ${await ReplenishmentRule.countDocuments({ org_id: ORG_ID })}`);

  await mongoose.connection.close();
  process.exit(0);
}

seed().catch(err => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
