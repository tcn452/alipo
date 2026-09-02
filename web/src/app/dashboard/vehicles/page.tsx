'use client';

import React, { useState } from 'react';
import { Vehicle } from '@/types/alipo';
import { Truck, Plus, Search, Fuel, User, Phone, CheckCircle, Edit2, Trash2 } from 'lucide-react';

const INITIAL_VEHICLES: Vehicle[] = [
  { id: '1', company: 'comp_1', plate: 'BT 4421', assigned_driver_name: 'Chifundo Banda', assigned_driver_phone: '+265888123401', fuel_type: 'diesel', tank_capacity_litres: 80, fuel_card_id: 'FC-8901' },
  { id: '2', company: 'comp_1', plate: 'LL 9012', assigned_driver_name: 'Blessings Phiri', assigned_driver_phone: '+265888123402', fuel_type: 'petrol', tank_capacity_litres: 65, fuel_card_id: 'FC-8902' },
  { id: '3', company: 'comp_1', plate: 'ZA 1140', assigned_driver_name: 'Taonga Gondwe', assigned_driver_phone: '+265888123403', fuel_type: 'diesel', tank_capacity_litres: 120, fuel_card_id: 'FC-8903' },
  { id: '4', company: 'comp_1', plate: 'BT 8830', assigned_driver_name: 'Kelvin Chirwa', assigned_driver_phone: '+265888123404', fuel_type: 'petrol', tank_capacity_litres: 50, fuel_card_id: 'FC-8904' },
  { id: '5', company: 'comp_1', plate: 'LL 3399', assigned_driver_name: 'Mercy Mwale', assigned_driver_phone: '+265888123405', fuel_type: 'diesel', tank_capacity_litres: 90, fuel_card_id: 'FC-8905' }
];

export default function VehiclesPage() {
  const [vehicles, setVehicles] = useState<Vehicle[]>(INITIAL_VEHICLES);
  const [search, setSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newPlate, setNewPlate] = useState('');
  const [newDriver, setNewDriver] = useState('');
  const [newPhone, setNewPhone] = useState('+265');
  const [newFuelType, setNewFuelType] = useState<'petrol' | 'diesel'>('diesel');
  const [newCapacity, setNewCapacity] = useState('70');

  const filteredVehicles = vehicles.filter((v) =>
    v.plate.toLowerCase().includes(search.toLowerCase()) ||
    (v.assigned_driver_name && v.assigned_driver_name.toLowerCase().includes(search.toLowerCase()))
  );

  const handleAddVehicle = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlate) return;

    const v: Vehicle = {
      id: `v_${Date.now()}`,
      company: 'comp_1',
      plate: newPlate.toUpperCase(),
      assigned_driver_name: newDriver,
      assigned_driver_phone: newPhone,
      fuel_type: newFuelType,
      tank_capacity_litres: parseFloat(newCapacity) || 70,
      fuel_card_id: `FC-${Math.floor(1000 + Math.random() * 9000)}`
    };

    setVehicles([v, ...vehicles]);
    setShowAddModal(false);
    setNewPlate('');
    setNewDriver('');
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 w-full">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">Vehicles & Drivers</h1>
          <p className="text-xs text-gray-500">Manage fleet registered vehicles, assigned drivers, and fuel cards</p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="inline-flex items-center space-x-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-sm transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Vehicle</span>
        </button>
      </div>

      {/* Filter / Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm flex items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search license plate or driver name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
          />
        </div>
        <div className="text-xs text-gray-500 font-medium">
          Total: <strong className="text-gray-900">{filteredVehicles.length}</strong> vehicles
        </div>
      </div>

      {/* Vehicles Table */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <table className="w-full text-left text-xs">
          <thead className="bg-gray-50 text-gray-600 border-b border-gray-200">
            <tr>
              <th className="py-3 px-4">License Plate</th>
              <th className="py-3 px-4">Assigned Driver</th>
              <th className="py-3 px-4">Fuel Type</th>
              <th className="py-3 px-4">Tank Capacity</th>
              <th className="py-3 px-4">Fuel Card Reference</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 font-medium text-gray-700">
            {filteredVehicles.map((v) => (
              <tr key={v.id} className="hover:bg-gray-50">
                <td className="py-3.5 px-4 font-bold text-gray-900 flex items-center space-x-2">
                  <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
                    <Truck className="w-4 h-4" />
                  </div>
                  <span>{v.plate}</span>
                </td>
                <td className="py-3.5 px-4">
                  <div className="text-gray-900">{v.assigned_driver_name || 'Unassigned'}</div>
                  <div className="text-[11px] text-gray-400">{v.assigned_driver_phone}</div>
                </td>
                <td className="py-3.5 px-4">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold capitalize ${
                    v.fuel_type === 'diesel' ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800'
                  }`}>
                    {v.fuel_type}
                  </span>
                </td>
                <td className="py-3.5 px-4 font-mono">{v.tank_capacity_litres} Litres</td>
                <td className="py-3.5 px-4 font-mono text-gray-500">{v.fuel_card_id || 'None'}</td>
                <td className="py-3.5 px-4 text-right space-x-2">
                  <button className="p-1 text-gray-400 hover:text-gray-600 rounded">
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setVehicles(vehicles.filter((x) => x.id !== v.id))}
                    className="p-1 text-gray-400 hover:text-rose-600 rounded"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal: Add Vehicle */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <h2 className="text-lg font-bold text-gray-900">Add Fleet Vehicle</h2>
            <form onSubmit={handleAddVehicle} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Registration Plate</label>
                <input
                  type="text"
                  placeholder="e.g. BT 5590"
                  value={newPlate}
                  onChange={(e) => setNewPlate(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Driver Name</label>
                <input
                  type="text"
                  placeholder="e.g. John Banda"
                  value={newDriver}
                  onChange={(e) => setNewDriver(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Driver Phone</label>
                <input
                  type="tel"
                  placeholder="+265..."
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Fuel Type</label>
                  <select
                    value={newFuelType}
                    onChange={(e) => setNewFuelType(e.target.value as any)}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  >
                    <option value="diesel">Diesel</option>
                    <option value="petrol">Petrol</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Tank Capacity (L)</label>
                  <input
                    type="number"
                    value={newCapacity}
                    onChange={(e) => setNewCapacity(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow"
                >
                  Save Vehicle
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
