import {
  Truck,
  Warehouse,
  ShieldCheck,
  Laptop,
  Settings,
  Headphones,
  Briefcase,
  Building2,
  Cog,
  HardHat,
  TreePine,
  Tractor,
  type LucideIcon,
} from 'lucide-react';

// Department icon mapping using real Lucide icons
export const departmentIcons: Record<string, LucideIcon> = {
  // Fleet Management
  'FLEET': Truck,
  'FLT': Truck,
  
  // Warehouse
  'WAREHOUSE': Warehouse,
  'WH': Warehouse,
  
  // Operations / PEAT
  'OPS': Tractor,
  'OPERATIONS': Tractor,
  'PEAT': TreePine,
  
  // Safety
  'SAF': ShieldCheck,
  'SAFETY': ShieldCheck,
  
  // IT / Information Technology
  'IT': Laptop,
  'ICT': Laptop,
  
  // Engineering
  'ENG': Cog,
  'ENGINEERING': Cog,
  
  // Customer Service
  'CS': Headphones,
  'CUSTOMER SERVICE': Headphones,
  
  // Projects / Procurement
  'PRO': Briefcase,
  'PROCUREMENT': Briefcase,
  'PROJECT': Briefcase,
  
  // Construction
  'CON': HardHat,
  'CONSTRUCTION': HardHat,
  
  // Admin / General
  'ADMIN': Building2,
  'ADMINISTRATION': Building2,
};

// Get icon for a department code
export function getDepartmentIcon(code: string): LucideIcon {
  const upperCode = code.toUpperCase();
  return departmentIcons[upperCode] || Building2;
}

// Department colors for gradients
export const departmentColors: Record<string, { gradient: string; accent: string }> = {
  // Fleet - Blue
  'FLEET': { gradient: 'from-blue-600 to-blue-800', accent: 'blue' },
  'FLT': { gradient: 'from-blue-600 to-blue-800', accent: 'blue' },
  
  // Warehouse - Amber/Orange
  'WAREHOUSE': { gradient: 'from-amber-600 to-orange-700', accent: 'amber' },
  'WH': { gradient: 'from-amber-600 to-orange-700', accent: 'amber' },
  
  // Operations - Emerald/Green
  'OPS': { gradient: 'from-emerald-600 to-emerald-800', accent: 'emerald' },
  'OPERATIONS': { gradient: 'from-emerald-600 to-emerald-800', accent: 'emerald' },
  'PEAT': { gradient: 'from-emerald-600 to-teal-700', accent: 'emerald' },
  
  // Safety - Orange/Red
  'SAF': { gradient: 'from-orange-600 to-red-700', accent: 'orange' },
  'SAFETY': { gradient: 'from-orange-600 to-red-700', accent: 'orange' },
  
  // IT - Cyan/Blue
  'IT': { gradient: 'from-cyan-600 to-blue-700', accent: 'cyan' },
  'ICT': { gradient: 'from-cyan-600 to-blue-700', accent: 'cyan' },
  
  // Engineering - Slate/Gray
  'ENG': { gradient: 'from-slate-600 to-slate-800', accent: 'slate' },
  'ENGINEERING': { gradient: 'from-slate-600 to-slate-800', accent: 'slate' },
  
  // Customer Service - Pink
  'CS': { gradient: 'from-pink-600 to-pink-800', accent: 'pink' },
  'CUSTOMER SERVICE': { gradient: 'from-pink-600 to-pink-800', accent: 'pink' },
  
  // Projects - Indigo
  'PRO': { gradient: 'from-indigo-600 to-indigo-800', accent: 'indigo' },
  'PROCUREMENT': { gradient: 'from-indigo-600 to-indigo-800', accent: 'indigo' },
  'PROJECT': { gradient: 'from-indigo-600 to-indigo-800', accent: 'indigo' },
  
  // Construction - Yellow/Amber
  'CON': { gradient: 'from-yellow-600 to-amber-700', accent: 'yellow' },
  'CONSTRUCTION': { gradient: 'from-yellow-600 to-amber-700', accent: 'yellow' },
  
  // Default
  'DEFAULT': { gradient: 'from-gray-600 to-gray-800', accent: 'gray' },
};

// Get colors for a department
export function getDepartmentColors(code: string): { gradient: string; accent: string } {
  const upperCode = code.toUpperCase();
  return departmentColors[upperCode] || departmentColors['DEFAULT'];
}
