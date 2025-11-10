import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import { subDays, format } from 'date-fns';
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

  // Clear existing data
  console.log('🗑️  Clearing existing data...');
  await Product.deleteMany({ org_id: ORG_ID });
  await Category.deleteMany({ org_id: ORG_ID });
  await Store.deleteMany({ org_id: ORG_ID });
  await Supplier.deleteMany({ org_id: ORG_ID });
  await InventorySnapshot.deleteMany({ org_id: ORG_ID });
  await PriceList.deleteMany({ org_id: ORG_ID });
  await ReplenishmentRule.deleteMany({ org_id: ORG_ID });

  // Create Categories
  console.log('📁 Creating categories...');
  const categories = [
    { name: 'Flores', slug: 'flores', parent_id: null, path: ['flores'], depth: 0 },
    { name: 'Rosas', slug: 'flores-rosas', parent_id: 'flores', path: ['flores', 'flores-rosas'], depth: 1 },
    { name: 'Tulipanes', slug: 'flores-tulipanes', parent_id: 'flores', path: ['flores', 'flores-tulipanes'], depth: 1 },
    { name: 'Orquídeas', slug: 'flores-orquideas', parent_id: 'flores', path: ['flores', 'flores-orquideas'], depth: 1 },
    { name: 'Arreglos', slug: 'arreglos', parent_id: null, path: ['arreglos'], depth: 0 },
    { name: 'Bodas', slug: 'arreglos-bodas', parent_id: 'arreglos', path: ['arreglos', 'arreglos-bodas'], depth: 1 },
    { name: 'Cumpleaños', slug: 'arreglos-cumpleanos', parent_id: 'arreglos', path: ['arreglos', 'arreglos-cumpleanos'], depth: 1 },
    { name: 'Accesorios', slug: 'accesorios', parent_id: null, path: ['accesorios'], depth: 0 },
  ];

  const createdCategories = [];
  for (const cat of categories) {
    const created = await Category.create({ ...cat, org_id: ORG_ID });
    createdCategories.push(created);
  }

  // Create Stores
  console.log('🏪 Creating stores...');
  const stores = [
    { tkc_code: 'BOD001', name: 'Bodega Central', is_shop: false, location: 'Centro' },
    { tkc_code: 'TDA001', name: 'Tienda Zona Norte', is_shop: true, location: 'Zona Norte' },
    { tkc_code: 'TDA002', name: 'Tienda Centro Comercial', is_shop: true, location: 'Centro Comercial Plaza' },
  ];

  const createdStores = [];
  for (const store of stores) {
    const created = await Store.create({ ...store, org_id: ORG_ID });
    createdStores.push(created);
  }

  // Create Suppliers
  console.log('📦 Creating suppliers...');
  const suppliers = [
    { name: 'Flores del Valle S.A.', aliases: ['Valle', 'FDV'], active: true },
    { name: 'Importadora Floral Internacional', aliases: ['IFI', 'Import Floral'], active: true },
    { name: 'Vivero Las Margaritas', aliases: ['Margaritas'], active: true },
    { name: 'Distribuidora Pétalos', aliases: ['Pétalos', 'Distribuidora P'], active: true },
    { name: 'Accesorios Florales SAC', aliases: ['AFS'], active: true },
  ];

  const createdSuppliers = [];
  for (const supplier of suppliers) {
    const created = await Supplier.create({ ...supplier, org_id: ORG_ID });
    createdSuppliers.push(created);
  }

  // Create Products
  console.log('🌹 Creating products...');
  const productData = [
    // Rosas
    { name: 'Rosa Roja Premium', brand: 'Valle', category: 'flores-rosas', units_per_box: 25, supplier: 0 },
    { name: 'Rosa Blanca Novia', brand: 'Valle', category: 'flores-rosas', units_per_box: 25, supplier: 0 },
    { name: 'Rosa Rosada', brand: 'IFI', category: 'flores-rosas', units_per_box: 20, supplier: 1 },
    { name: 'Rosa Amarilla', brand: 'Valle', category: 'flores-rosas', units_per_box: 25, supplier: 0 },
    { name: 'Rosa Naranja', brand: 'Valle', category: 'flores-rosas', units_per_box: 25, supplier: 0 },
    // Tulipanes
    { name: 'Tulipán Rojo Holandés', brand: 'IFI', category: 'flores-tulipanes', units_per_box: 50, supplier: 1 },
    { name: 'Tulipán Amarillo', brand: 'IFI', category: 'flores-tulipanes', units_per_box: 50, supplier: 1 },
    { name: 'Tulipán Morado', brand: 'IFI', category: 'flores-tulipanes', units_per_box: 50, supplier: 1 },
    // Orquídeas
    { name: 'Orquídea Phalaenopsis Blanca', brand: 'Margaritas', category: 'flores-orquideas', units_per_box: 6, supplier: 2 },
    { name: 'Orquídea Dendrobium', brand: 'Margaritas', category: 'flores-orquideas', units_per_box: 6, supplier: 2 },
    // Arreglos
    { name: 'Arreglo Romántico 12 Rosas', brand: 'Pétalos', category: 'arreglos-cumpleanos', units_per_box: 1, supplier: 3 },
    { name: 'Arreglo Primavera', brand: 'Pétalos', category: 'arreglos-cumpleanos', units_per_box: 1, supplier: 3 },
    { name: 'Bouquet Nupcial Deluxe', brand: 'AFS', category: 'arreglos-bodas', units_per_box: 1, supplier: 4 },
    { name: 'Centro de Mesa Elegante', brand: 'AFS', category: 'arreglos-bodas', units_per_box: 1, supplier: 4 },
    // Accesorios
    { name: 'Florero Cristal Grande', brand: 'AFS', category: 'accesorios', units_per_box: 12, supplier: 4 },
    { name: 'Cinta Satinada Roja', brand: 'AFS', category: 'accesorios', units_per_box: 50, supplier: 4 },
  ];

  const createdProducts = [];
  let productCode = 1000;
  for (const prod of productData) {
    const category = createdCategories.find(c => c.slug === prod.category);
    const supplier = createdSuppliers[prod.supplier];
    
    const created = await Product.create({
      org_id: ORG_ID,
      product_code: `PROD-${productCode++}`,
      barcode: `${Math.floor(Math.random() * 1000000000000)}`,
      name: prod.name,
      brand: prod.brand,
      uom: 'unit',
      units_per_box: prod.units_per_box,
      category_path: category.path,
      category_id: category.slug,
      supplier_id: supplier._id.toString(),
      status: 'active',
      mgmt_mode: 'managed'
    });
    createdProducts.push(created);
  }

  // Add more products to reach 50
  for (let i = 0; i < 34; i++) {
    const randomCategory = createdCategories[Math.floor(Math.random() * createdCategories.length)];
    const randomSupplier = createdSuppliers[Math.floor(Math.random() * createdSuppliers.length)];
    
    await Product.create({
      org_id: ORG_ID,
      product_code: `PROD-${productCode++}`,
      barcode: `${Math.floor(Math.random() * 1000000000000)}`,
      name: `Producto ${i + 1}`,
      brand: randomSupplier.name,
      uom: 'unit',
      units_per_box: [1, 6, 12, 24, 50][Math.floor(Math.random() * 5)],
      category_path: randomCategory.path,
      category_id: randomCategory.slug,
      supplier_id: randomSupplier._id.toString(),
      status: 'active',
      mgmt_mode: 'managed'
    });
  }

  const allProducts = await Product.find({ org_id: ORG_ID });

  // Create Inventory Snapshots (last 30 days)
  console.log('📊 Creating inventory snapshots...');
  const today = new Date();
  for (let dayOffset = 30; dayOffset >= 0; dayOffset--) {
    const snapshotDate = subDays(today, dayOffset);
    
    for (const store of createdStores) {
      for (const product of allProducts) {
        // Simulate stock movement
        const baseStock = Math.floor(Math.random() * 200) + 50;
        const dailyVariation = Math.floor(Math.random() * 30) - 15;
        const stock = Math.max(0, baseStock + dailyVariation * dayOffset / 30);
        
        await InventorySnapshot.create({
          org_id: ORG_ID,
          date: snapshotDate,
          store_id: store._id.toString(),
          product_id: product._id.toString(),
          physical_stock: Math.floor(stock),
          stock_units: Math.floor(stock),
          stock_boxes: Math.floor(stock / product.units_per_box),
          price_cost: Math.random() * 50 + 10,
          price_shop: Math.random() * 100 + 20,
          status: 'current'
        });
      }
    }
  }

  // Create Price Lists
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
      currency: 'USD'
    });
  }

  // Create Replenishment Rules
  console.log('📐 Creating replenishment rules...');
  
  // Global rule
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
      min_stock: 20
    },
    active: true,
    priority: 100
  });

  // Category-specific: Flores (high turnover)
  await ReplenishmentRule.create({
    org_id: ORG_ID,
    scope: { store_id: null, category_id: 'flores-rosas', product_id: null },
    params: {
      days_of_cover: 5,
      lead_time_days: 2,
      service_level: 0.95,
      safety_stock: 25,
      avg_demand_window_days: 14,
      seasonality: { feb14: 2.5, mothers_day: 3.0, nov_dec: 1.2 },
      pack_size: 25,
      moq: 25,
      max_stock: 300,
      min_stock: 50
    },
    active: true,
    priority: 200
  });

  // Store-specific: Tienda Centro Comercial (higher volume)
  const tda002 = createdStores.find(s => s.tkc_code === 'TDA002');
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
      min_stock: 50
    },
    active: true,
    priority: 150
  });

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